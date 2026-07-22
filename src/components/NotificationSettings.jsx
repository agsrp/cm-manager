import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Bell, Clock, Save, AlertTriangle, ShieldCheck } from 'lucide-react';

const publicVapidKey =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BPQ4NkeY1NtCRcB84TEju4F2kqec8mvmhk-TTUiZKnWAUMSUxbtfP-GnL74mhdgtL4T_-Jz4UxZ0567JIXSzpso';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [prefs, setPrefs] = useState({
    notify_ideas: true,
    notify_agenda: true,
    notify_times: ['09:00', '18:00'],
  });

  const [newTime, setNewTime] = useState('12:00');

  useEffect(() => {
    // Check if push is supported
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
    }

    // Check if running on iOS outside PWA standalone mode
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isPwa =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isIos && !isPwa) {
      setIsStandalone(false);
    } else {
      setIsStandalone(true);
    }

    checkSubscription();
  }, [user]);

  const syncScheduleToServiceWorker = (times, notifyAgenda, notifyIdeas) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        if (reg.active) {
          reg.active.postMessage({
            type: 'SCHEDULE_LOCAL_NOTIFICATIONS',
            times: times || [],
            notify_agenda: notifyAgenda,
            notify_ideas: notifyIdeas,
          });
        }
      });
    }
  };

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let isSubscribedLocally = false;
      let activeSub = null;

      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const localSub = await registration.pushManager.getSubscription();

        if (localSub && localSub.endpoint) {
          // Check database for THIS device's specific endpoint
          const { data } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('endpoint', localSub.endpoint)
            .maybeSingle();

          if (data) {
            activeSub = data;
            isSubscribedLocally = true;
          } else {
            // Local subscription exists on phone but wasn't saved in DB yet, auto-save it
            const subData = JSON.parse(JSON.stringify(localSub));
            const payload = {
              user_id: user.id,
              endpoint: subData.endpoint,
              p256dh: subData.keys.p256dh,
              auth: subData.keys.auth,
              notify_ideas: true,
              notify_agenda: true,
              notify_times: ['09:00', '18:00'],
            };
            const { data: inserted } = await supabase
              .from('push_subscriptions')
              .upsert(payload, { onConflict: 'endpoint' })
              .select()
              .single();

            if (inserted) {
              activeSub = inserted;
              isSubscribedLocally = true;
            }
          }
        }
      }

      if (isSubscribedLocally && activeSub) {
        setSubscription(activeSub);
        const userTimes = activeSub.notify_times || [];
        setPrefs({
          notify_ideas: Boolean(activeSub.notify_ideas),
          notify_agenda: Boolean(activeSub.notify_agenda),
          notify_times: userTimes,
        });
        syncScheduleToServiceWorker(userTimes, activeSub.notify_ideas, activeSub.notify_agenda);
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Error al verificar suscripción del dispositivo:', err);
      setSubscription(null);
    }

    setLoading(false);
  };

  const handleSubscribe = async () => {
    if (!isSupported) {
      alert('Las notificaciones Push no están soportadas en este navegador o sistema.');
      return;
    }

    setSaving(true);
    try {
      // Direct user action: Request notification permission first
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          alert('Permiso de notificaciones denegado. Debes habilitarlo en los permisos de tu navegador o sistema.');
          setSaving(false);
          return;
        }
      }

      // Ensure SW is registered
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
      }
      await navigator.serviceWorker.ready;

      let pushSub = await registration.pushManager.getSubscription();

      if (!pushSub) {
        pushSub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
        });
      }

      const subData = JSON.parse(JSON.stringify(pushSub));

      // Save to Supabase
      const payload = {
        user_id: user.id,
        endpoint: subData.endpoint,
        p256dh: subData.keys.p256dh,
        auth: subData.keys.auth,
        notify_ideas: prefs.notify_ideas,
        notify_agenda: prefs.notify_agenda,
        notify_times: prefs.notify_times,
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(payload, { onConflict: 'endpoint' });

      if (error) throw error;

      syncScheduleToServiceWorker(prefs.notify_times, prefs.notify_agenda, prefs.notify_ideas);

      await checkSubscription();
      alert('¡Notificaciones activadas con éxito en este dispositivo!');
    } catch (err) {
      console.error('Error suscribiendo:', err);
      alert(`Error al activar notificaciones: ${err.message || err}`);
    }
    setSaving(false);
  };

  const handleTestNotification = async () => {
    if (!user) return;

    if (!subscription) {
      alert('Este dispositivo no está suscrito aún. Haz clic en "Permitir Notificaciones" para activarlas en este dispositivo.');
      return;
    }

    setTesting(true);

    try {
      // 1. Try local notification safely if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && registration.showNotification) {
            registration.showNotification('CM Manager - Prueba', {
              body: '¡Notificaciones activas y funcionando en este dispositivo!',
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              vibrate: [200, 100, 200],
            });
          }
        } catch (e) {
          console.warn('Local showNotification skipped on mobile JS context:', e);
        }
      }

      // 2. Send real Web Push via backend server
      const res = await fetch(`/api/notify?test=true&user_id=${user.id}`);
      const data = await res.json();

      if (res.ok && data.success) {
        alert('¡Notificación de prueba enviada! Deberías recibir el aviso en breve.');
      } else {
        alert(data.message || data.error || 'Aviso: Notificación solicitada al servidor.');
      }
    } catch (err) {
      console.error('Error enviando prueba:', err);
      alert(`Error al conectar con el servicio de notificaciones: ${err.message || err}`);
    }

    setTesting(false);
  };

  const handleSavePreferences = async () => {
    if (!subscription) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          notify_ideas: prefs.notify_ideas,
          notify_agenda: prefs.notify_agenda,
          notify_times: prefs.notify_times,
        })
        .eq('id', subscription.id);

      if (error) throw error;

      syncScheduleToServiceWorker(prefs.notify_times, prefs.notify_agenda, prefs.notify_ideas);

      alert('Preferencias y horarios guardados correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar preferencias.');
    }
    setSaving(false);
  };

  const addTime = () => {
    if (!prefs.notify_times.includes(newTime)) {
      setPrefs(p => ({ ...p, notify_times: [...p.notify_times, newTime].sort() }));
    }
  };

  const removeTime = (time) => {
    setPrefs(p => ({ ...p, notify_times: p.notify_times.filter(t => t !== time) }));
  };

  if (loading) return <div className="glass p-8 text-center text-slate-300">Cargando configuración...</div>;

  return (
    <div className="space-y-6">
      
      {!isStandalone && (
        <div className="glass bg-amber-500/10 border-amber-500/20 p-4 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-400 font-bold">Instala la App (PWA)</h4>
            <p className="text-sm text-slate-300 mt-1">
              Para recibir notificaciones en tu dispositivo iOS (iPhone/iPad), debes instalar esta página como aplicación. Toca el botón <strong>Compartir</strong> y luego <strong>Añadir a la pantalla de inicio</strong>. Luego abre la app desde tu inicio.
            </p>
          </div>
        </div>
      )}

      <div className="glass p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/20 text-blue-300">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Notificaciones y Alertas</h2>
            <p className="text-sm text-slate-400">Recibe resúmenes de tu agenda e ideas directamente en tu dispositivo.</p>
          </div>
        </div>

        {!subscription ? (
          <div className="text-center py-6 border-t border-white/10 mt-4">
            <ShieldCheck size={48} className="mx-auto text-slate-500 mb-4" />
            <h3 className="text-lg font-bold text-white">Activar Notificaciones</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              Permite a la aplicación enviarte notificaciones nativas de forma segura y 100% gratuita. Podrás configurar horarios y tipos de alerta.
            </p>
            <button 
              onClick={handleSubscribe} 
              disabled={saving}
              className="btn-primary"
            >
              <Bell size={18} />
              {saving ? 'Activando...' : 'Permitir Notificaciones'}
            </button>
          </div>
        ) : (
          <div className="space-y-6 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck size={18} />
                  Suscrito en este dispositivo
                </h3>
                <p className="text-xs text-slate-400">Puedes modificar tus preferencias de alertas a continuación.</p>
              </div>
              <button 
                onClick={handleTestNotification}
                disabled={testing}
                className="btn-glass text-xs py-2 px-3.5 flex items-center gap-2 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 transition"
              >
                <Bell size={14} className={testing ? 'animate-bounce' : ''} />
                {testing ? 'Enviando...' : 'Enviar Notificación de Prueba'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Content Preferences */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">¿Qué deseas recibir?</h4>
                
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={prefs.notify_agenda}
                    onChange={(e) => setPrefs(p => ({ ...p, notify_agenda: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/20 bg-slate-800 text-violet-500" 
                  />
                  <div>
                    <p className="font-bold text-sm text-white">Eventos de Agenda</p>
                    <p className="text-xs text-slate-400">Recordatorios de posts y compromisos cercanos.</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={prefs.notify_ideas}
                    onChange={(e) => setPrefs(p => ({ ...p, notify_ideas: e.target.checked }))}
                    className="h-5 w-5 rounded border-white/20 bg-slate-800 text-violet-500" 
                  />
                  <div>
                    <p className="font-bold text-sm text-white">Recordatorio de Ideas</p>
                    <p className="text-xs text-slate-400">Un empujón para revisar tus ideas destacadas o pendientes.</p>
                  </div>
                </label>
              </div>

              {/* Timing Preferences */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">¿A qué horas del día?</h4>
                
                <div className="flex items-center gap-2">
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="input-glass"
                  />
                  <button onClick={addTime} className="btn-glass bg-white/10">Añadir</button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {prefs.notify_times.length === 0 && <span className="text-xs text-slate-400">No hay horarios configurados.</span>}
                  {prefs.notify_times.map(time => (
                    <div key={time} className="flex items-center gap-2 bg-violet-500/20 border border-violet-500/30 text-violet-300 px-3 py-1.5 rounded-xl text-sm font-bold">
                      <Clock size={14} />
                      {time}
                      <button onClick={() => removeTime(time)} className="ml-2 text-violet-300 hover:text-white transition">
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button 
                onClick={handleSavePreferences}
                disabled={saving}
                className="btn-primary"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar Preferencias'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
