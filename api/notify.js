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
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials not configured in backend.' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 3. Initialize Web Push VAPID
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

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
      let wantsNotificationNow = isTargetTest;

      if (!wantsNotificationNow) {
        // Calculate current hour and rounded minute in UTC
        const currentHour = now.getUTCHours().toString().padStart(2, '0');
        const currentMin = now.getUTCMinutes();
        const roundedMin = (Math.floor(currentMin / 15) * 15).toString().padStart(2, '0');
        const timeString = `${currentHour}:${roundedMin}`;

        // Also check if user has times configured
        wantsNotificationNow = sub.notify_times && (
          sub.notify_times.includes(timeString) || sub.notify_times.length > 0
        );
      }

      // Check last_notified_at to prevent duplicate spam (50 min window)
      const lastNotified = sub.last_notified_at ? new Date(sub.last_notified_at) : null;
      const recentlyNotified = lastNotified && (now.getTime() - lastNotified.getTime() < 1000 * 60 * 50);

      if (wantsNotificationNow && (!recentlyNotified || isTargetTest)) {
        let messageBody = '';

        if (isTargetTest) {
          messageBody = '¡Prueba exitosa! Las notificaciones Push funcionan correctamente en tu dispositivo.';
        } else {
          if (sub.notify_agenda && upcomingPosts && upcomingPosts.length > 0) {
            messageBody += `Tienes ${upcomingPosts.length} posts próximos en agenda. `;
          }
          if (sub.notify_ideas && ideas && ideas.length > 0) {
            messageBody += `Tienes ${ideas.length} ideas destacadas pendientes de guion.`;
          }
        }

        if (!messageBody) {
          messageBody = 'Recuerda revisar tus tareas e ideas del día en CM Manager.';
        }

        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        };

        const payload = JSON.stringify({
          title: isTargetTest ? 'CM Manager - Prueba' : 'CM Manager - Resumen',
          body: messageBody,
          url: '/config'
        });

        const sendPromise = webpush.sendNotification(pushSubscription, payload)
          .then(() => {
            return supabase
              .from('push_subscriptions')
              .update({ last_notified_at: new Date().toISOString() })
              .eq('id', sub.id);
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

