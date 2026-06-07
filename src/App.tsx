import React, { useState, useEffect } from 'react';
import { Dumbbell, PieChart as ChartIcon, Shield } from 'lucide-react';
import { ClientApp } from './components/ClientApp';
import { AdminApp } from './components/AdminApp';
import { TrainerApp } from './components/TrainerApp';

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
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm shadow-indigo-200">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">ProTrainer Hub</h1>
        <p className="text-[13px] text-slate-500 mb-8">Select your portal to continue.</p>
        
        <div className="space-y-3">
          <button 
            onClick={() => setRole('trainer')}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 rounded-lg px-4 py-3 text-white hover:bg-indigo-700 transition-colors font-medium text-sm shadow-sm"
          >
            <Dumbbell className="w-5 h-5 opacity-70" />
            <span>Log in as Trainer</span>
          </button>
          
          <button 
            onClick={() => setRole('client')}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
          >
            <ChartIcon className="w-5 h-5 text-slate-400" />
            <span>Log in as Client</span>
          </button>
          
          <button 
            onClick={() => setRole('admin')}
            className="w-full flex items-center justify-center gap-3 bg-slate-900 rounded-lg px-4 py-3 text-white hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm"
          >
            <Shield className="w-5 h-5 opacity-70" />
            <span>Log in as Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
