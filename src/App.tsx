import React, { useState, useEffect } from 'react';
import { Dumbbell, Shield, User as UserIcon, Smartphone } from 'lucide-react';
import { ClientApp } from './components/ClientApp';
import { AdminApp } from './components/AdminApp';
import { TrainerApp } from './components/TrainerApp';
import { MobileNativeLayout } from './components/MobileNativeLayout';
import { InstallPWA } from './components/InstallPWA';
import { subscribeToNotifications } from './lib/db';
import { motion } from 'motion/react';

export default function App() {
  const [role, setRole] = useState<'splash' | 'none' | 'trainer' | 'client' | 'admin'>('splash');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  // Ask for notification permission if possible
  useEffect(() => {
    if (role === 'client' || role === 'trainer') {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(setNotifPermission);
      }
    }
  }, [role]);

  // Subscribe to notifications
  useEffect(() => {
    if ((role === 'client' || role === 'trainer') && notifPermission === 'granted') {
      const storedLastSeen = parseInt(localStorage.getItem('last_notif_time') || '0', 10);
      let latestTime = storedLastSeen;

      const unsub = subscribeToNotifications(role, (notifs) => {
        // filter out older ones
        const newNotifs = notifs.filter(n => new Date(n.createdAt).getTime() > storedLastSeen);
        if (newNotifs.length > 0) {
          // Play notification
          newNotifs.forEach(n => {
            const time = new Date(n.createdAt).getTime();
            if (time > latestTime) {
                latestTime = time;
                new Notification(n.title, {
                  body: n.body,
                  icon: 'https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png'
                });
            }
          });
          localStorage.setItem('last_notif_time', latestTime.toString());
        }
      });
      return () => unsub();
    }
  }, [role, notifPermission]);

  useEffect(() => {
    // Show splash screen for 2.5 seconds
    const t = setTimeout(() => {
      const savedSession = localStorage.getItem('protrainer_session');
      if (savedSession) {
        try {
          const { role: savedRole } = JSON.parse(savedSession);
          if (savedRole) {
             setRole(savedRole);
             return;
          }
        } catch (e) {}
      }
      setRole('client'); // Default explicitly to client login after splash
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('protrainer_session');
    setRole('client');
  };

  if (role === 'splash') {
     return (
       <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-[#0A0A0C]">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-48 h-48 bg-white rounded-full flex flex-col items-center justify-center shadow-[0_8px_32px_rgba(255,255,255,0.1)] overflow-hidden border-[8px] border-black relative mb-8"
          >
            <img 
               src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" 
               alt="Waiter Walk Logo" 
               className="object-contain p-4 w-full h-full absolute inset-0 z-20 bg-white"
            />
          </motion.div>
          <motion.span 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-white text-2xl font-black tracking-widest text-center leading-none mt-4 uppercase"
          >
            Waiter Walk
          </motion.span>
       </div>
     );
  }

  if (role === 'admin') {
    return <AdminApp onBack={handleLogout} />;
  }
  
  if (role === 'trainer') {
    return <TrainerApp onBack={handleLogout} />;
  }

  return <ClientApp onBack={handleLogout} onSwitchRole={(r) => setRole(r)} />;
}
