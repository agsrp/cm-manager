import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Verify Secret Key
  const authHeader = req.headers.authorization || '';
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. Initialize Supabase
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseServiceRole);

  // 3. Initialize Web Push
  webpush.setVapidDetails(
    'mailto:tu-email@dominio.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    // Current time in HH:mm (e.g. 14:00, 14:15)
    // For simplicity, we just extract the hour and minute in UTC, or the user's timezone.
    // Ideally we should use UTC and the user defines it in UTC, or we check all.
    // Let's get the current hour and minute in a format we can loosely match.
    const now = new Date();
    // We will just process ALL subscriptions that need processing now. 
    // To be perfectly accurate, we should compare the user's local time, but we don't have timezone stored.
    // Let's just fetch all subscriptions and filter in javascript to be flexible.
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ message: 'No subscriptions found.' });
    }

    // Prepare notifications to send
    const notifications = [];

    // Let's simulate checking dates and ideas (simplified)
    const { data: upcomingPosts } = await supabase
      .from('posts')
      .select('title, date')
      .gte('date', now.toISOString())
      .limit(5);

    const { data: ideas } = await supabase
      .from('ideas')
      .select('title')
      .limit(3);

    for (const sub of subscriptions) {
      // Check if it's time to notify this user.
      // E.g., check if current UTC time matches one of their times.
      // Since we run every 15 min, we check if the current time matches closely.
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMin = now.getMinutes();
      // Round down to nearest 15 for matching
      const roundedMin = (Math.floor(currentMin / 15) * 15).toString().padStart(2, '0');
      const timeString = `${currentHour}:${roundedMin}`; // e.g. "14:15"

      // Check if they want to be notified at this time
      const wantsNotificationNow = sub.notify_times && sub.notify_times.includes(timeString);
      
      // Also check if we already notified them today to avoid spam if cron runs multiple times
      const lastNotified = sub.last_notified_at ? new Date(sub.last_notified_at) : null;
      const alreadyNotifiedRecently = lastNotified && (now.getTime() - lastNotified.getTime() < 1000 * 60 * 60);

      if (wantsNotificationNow && !alreadyNotifiedRecently) {
        let messageBody = '';
        if (sub.notify_agenda && upcomingPosts && upcomingPosts.length > 0) {
          messageBody += `Tienes ${upcomingPosts.length} posts próximos. `;
        }
        if (sub.notify_ideas && ideas && ideas.length > 0) {
          messageBody += `Recuerda revisar tus ${ideas.length} ideas destacadas.`;
        }

        if (messageBody) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          };

          const payload = JSON.stringify({
            title: 'Resumen de CM Manager',
            body: messageBody,
            url: '/config' // where they go when they click
          });

          // Send and if successful, mark as notified
          const sendPromise = webpush.sendNotification(pushSubscription, payload)
            .then(() => {
              // Update last_notified_at
              return supabase
                .from('push_subscriptions')
                .update({ last_notified_at: new Date().toISOString() })
                .eq('id', sub.id);
            })
            .catch(err => {
              console.error('Error sending push to sub', sub.id, err);
              // if statusCode is 410, subscription is gone, we should delete it
              if (err.statusCode === 410 || err.statusCode === 404) {
                 return supabase.from('push_subscriptions').delete().eq('id', sub.id);
              }
            });

          notifications.push(sendPromise);
        }
      }
    }

    await Promise.all(notifications);

    return res.status(200).json({ message: `Processed ${subscriptions.length} subscriptions, sent ${notifications.length} notifications.` });
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
