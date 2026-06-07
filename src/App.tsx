import React, { useState, useEffect } from 'react';
import { Dumbbell, Shield, User as UserIcon, Smartphone } from 'lucide-react';
import { ClientApp } from './components/ClientApp';
import { AdminApp } from './components/AdminApp';
import { TrainerApp } from './components/TrainerApp';
import { MobileNativeLayout } from './components/MobileNativeLayout';
import { motion } from 'motion/react';

export default function App() {
  const [role, setRole] = useState<'none' | 'trainer' | 'client' | 'admin'>('none');

  useEffect(() => {
    const savedSession = localStorage.getItem('protrainer_session');
    if (savedSession) {
      try {
        const { role: savedRole } = JSON.parse(savedSession);
        if (savedRole) setRole(savedRole);
      } catch (e) {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('protrainer_session');
    setRole('none');
  };

  if (role === 'admin') {
    return <AdminApp onBack={handleLogout} />;
  }

  if (role === 'client') {
    return <ClientApp onBack={handleLogout} />;
  }
  
  if (role === 'trainer') {
    return <TrainerApp onBack={handleLogout} />;
  }

  return (
    <MobileNativeLayout
      title="ProTrainer"
      subtitle="Welcome"
    >
      <div className="flex flex-col items-center justify-center mt-12 mb-8">
         <div className="w-20 h-20 bg-[#1C1C1E] rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(52,199,89,0.2)] mb-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#34C759]/20 to-transparent"></div>
            <Dumbbell className="w-10 h-10 text-[#34C759] relative z-10" />
         </div>
         <h2 className="text-[#8e8e93] text-sm text-center max-w-[250px]">
           Select your portal to continue.
         </h2>
      </div>

      <div className="space-y-4 w-full">
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setRole('client')}
          className="w-full flex items-center justify-between bg-[#1C1C1E] rounded-[20px] p-5 border border-white/5"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-[#007AFF]" />
             </div>
             <div className="text-left">
               <div className="text-white font-semibold text-lg">Client</div>
               <div className="text-[#8e8e93] text-sm">View workouts & stats</div>
             </div>
          </div>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setRole('trainer')}
          className="w-full flex items-center justify-between bg-[#1C1C1E] rounded-[20px] p-5 border border-white/5"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-[#FF9500]/10 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-[#FF9500]" />
             </div>
             <div className="text-left">
               <div className="text-white font-semibold text-lg">Trainer</div>
               <div className="text-[#8e8e93] text-sm">Manage your clients</div>
             </div>
          </div>
        </motion.button>

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => setRole('admin')}
          className="w-full flex items-center justify-between bg-[#1C1C1E] rounded-[20px] p-5 border border-white/5"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#FF3B30]" />
             </div>
             <div className="text-left">
               <div className="text-white font-semibold text-lg">Admin View</div>
               <div className="text-[#8e8e93] text-sm">System configuration</div>
             </div>
          </div>
        </motion.button>
      </div>
    </MobileNativeLayout>
  );
}
