import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Verify Secret Key or allow test parameter
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  const isTest = req.query.test === 'true' || req.body?.test === true;

  if (!isTest && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Initialize Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://cdewdlswqrwcleuynspu.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3jC_HDLBLWt8kGgVfSW7vg_jAx_5vIz';
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured in backend.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3. Initialize Web Push VAPID
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY || 'BPQ4NkeY1NtCRcB84TEju4F2kqec8mvmhk-TTUiZKnWAUMSUxbtfP-GnL74mhdgtL4T_-Jz4UxZ0567JIXSzpso';
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY || 'if4WXmZiUDlW0TivS9WLamE1_VUzvzZxflG_sjiejew';

  if (!vapidPublic || !vapidPrivate) {
    return res.status(500).json({ error: 'VAPID keys missing in environment variables.' });
  }

  webpush.setVapidDetails(
    'mailto:support@cmmanager.app',
    vapidPublic,
    vapidPrivate
  );

  try {
    const now = new Date();

    // Fetch all push subscriptions
    let query = supabase.from('push_subscriptions').select('*');
    if (isTest && req.query.user_id) {
      query = query.eq('user_id', req.query.user_id);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Database error', details: error.message });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found.' });
    }

    // Fetch upcoming posts (correct column: post_date)
    const { data: upcomingPosts } = await supabase
      .from('posts')
      .select('title, post_date')
      .neq('status', 'idea')
      .gte('post_date', now.toISOString())
      .order('post_date', { ascending: true })
      .limit(5);

    // Fetch ideas (correct table: posts with status = 'idea')
    const { data: ideas } = await supabase
      .from('posts')
      .select('title')
      .eq('status', 'idea')
      .limit(5);

    const notifications = [];

    for (const sub of subscriptions) {
      const isTargetTest = isTest;
      let wantsNotificationNow = false;

      // 1. Query due private activities (date <= NOW and notification_sent is false)
      let duePrivateActs = [];
      try {
        const { data } = await supabase
          .from('private_activities')
          .select('*')
          .eq('user_id', sub.user_id)
          .lte('date', now.toISOString())
          .or('notification_sent.is.null,notification_sent.eq.false')
          .neq('status', 'completed')
          .neq('status', 'cancelled')
          .order('date', { ascending: true });
        duePrivateActs = data || [];
      } catch (e) {
        console.warn('Notice checking due private_activities:', e);
      }

      // 2. Query due posts (post_date <= NOW and notification_sent is false)
      let duePosts = [];
      try {
        const { data } = await supabase
          .from('posts')
          .select('*')
          .lte('post_date', now.toISOString())
          .or('notification_sent.is.null,notification_sent.eq.false')
          .neq('status', 'published')
          .neq('status', 'idea')
          .order('post_date', { ascending: true });
        duePosts = data || [];
      } catch (e) {
        console.warn('Notice checking due posts:', e);
      }

      const hasSpecificDueItems = duePrivateActs.length > 0 || duePosts.length > 0;

      if (isTargetTest || hasSpecificDueItems) {
        wantsNotificationNow = true;
      } else {
        // Scheduled cron summary check
        const hasTimes = Array.isArray(sub.notify_times) && sub.notify_times.length > 0;
        wantsNotificationNow = Boolean(sub.notify_agenda || sub.notify_ideas || hasTimes);
      }

      // Prevent duplicate spam within 5 minutes ONLY for generic digest runs
      const lastNotified = sub.last_notified_at ? new Date(sub.last_notified_at) : null;
      const recentlyNotified = !isTargetTest && !hasSpecificDueItems && lastNotified && (now.getTime() - lastNotified.getTime() < 1000 * 60 * 5);

      if (wantsNotificationNow && !recentlyNotified) {
        let messageBody = '';
        let targetUrl = '/private';

        if (isTargetTest) {
          messageBody = '¡Prueba exitosa! Las notificaciones Push funcionan correctamente en tu dispositivo.';
          targetUrl = '/config';
        } else if (hasSpecificDueItems) {
          const parts = [];
          if (duePrivateActs.length > 0) {
            const first = duePrivateActs[0];
            parts.push(`⏰ Recordatorio: "${first.title}"`);
            targetUrl = '/private';
          }
          if (duePosts.length > 0) {
            const firstPost = duePosts[0];
            parts.push(`📌 Post programado: "${firstPost.title}"`);
            if (duePrivateActs.length === 0) targetUrl = '/calendar';
          }
          messageBody = parts.join(' • ');
        } else {
          const parts = [];
          if (sub.notify_agenda && upcomingPosts && upcomingPosts.length > 0) {
            parts.push(`Tienes ${upcomingPosts.length} post(s) en agenda.`);
          }
          if (sub.notify_ideas && ideas && ideas.length > 0) {
            parts.push(`Tienes ${ideas.length} idea(s) pendientes.`);
          }
          messageBody = parts.join(' ') || 'Recuerda revisar tus tareas e ideas del día en CM Manager.';
          targetUrl = '/calendar';
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        };

        const payload = JSON.stringify({
          title: isTargetTest ? 'CM Manager - Prueba' : 'CM Manager - Recordatorio',
          body: messageBody,
          url: targetUrl
        });

        const sendPromise = webpush.sendNotification(pushSubscription, payload)
          .then(async () => {
            // Update last_notified_at on subscription
            await supabase
              .from('push_subscriptions')
              .update({ last_notified_at: new Date().toISOString() })
              .eq('id', sub.id);

            // Mark due private activities as notification_sent = true
            if (duePrivateActs.length > 0) {
              const actIds = duePrivateActs.map((a) => a.id);
              await supabase
                .from('private_activities')
                .update({ notification_sent: true })
                .in('id', actIds);
            }

            // Mark due posts as notification_sent = true
            if (duePosts.length > 0) {
              const postIds = duePosts.map((p) => p.id);
              await supabase
                .from('posts')
                .update({ notification_sent: true })
                .in('id', postIds);
            }
          })
          .catch(err => {
            console.error('Error sending push to sub:', sub.id, err);
            if (err.statusCode === 410 || err.statusCode === 404) {
              return supabase.from('push_subscriptions').delete().eq('id', sub.id);
            }
          });

        notifications.push(sendPromise);
      }
    }

    await Promise.all(notifications);

    return res.status(200).json({
      success: true,
      message: `Procesadas ${subscriptions.length} suscripciones, enviadas ${notifications.length} notificaciones.`
    });
  } catch (err) {
    console.error('Unexpected error in notify API:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}

