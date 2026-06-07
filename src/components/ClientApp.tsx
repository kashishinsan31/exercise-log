import React, { useState } from 'react';
import { doLogin, fetchClientLogs, fetchClientMeasurements, appendMeasurement, ExerciseLog, BodyMeasurement, ClientProfile } from '../lib/db';
import { Loader2, Dumbbell, Lock, FileText, Activity, User, PlusCircle } from 'lucide-react';
import { ClientDashboard } from './ClientDashboard';
import { MobileNativeLayout, MobileTabItem } from './MobileNativeLayout';

export function ClientApp({ onBack, onSwitchRole }: { onBack: () => void, onSwitchRole?: (role: any) => void }) {
  const [step, setStep] = useState<'login' | 'dashboard'>(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'client' && user) return 'dashboard';
      } catch (e) {}
    }
    return 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [selectedClient, setSelectedClient] = useState<{name: string, trainerEmail: string} | null>(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'client' && user) return user;
      } catch (e) {}
    }
    return null;
  });
  const [clientLogs, setClientLogs] = useState<ExerciseLog[]>([]);
  const [clientMeasurements, setClientMeasurements] = useState<BodyMeasurement[]>([]);
  
  // App views
  const [currentView, setCurrentView] = useState<'dashboard' | 'logs' | 'measurements'>('dashboard');

  React.useEffect(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'client' && user) {
          setSelectedClient(user);
          fetchClientData(user.name);
          setStep('dashboard');
        }
      } catch (e) {}
    }
  }, []);

  const fetchClientData = async (name: string) => {
    try {
      const logs = await fetchClientLogs(name); 
      const measurements = await fetchClientMeasurements(name); 
      const dataPayload = { logs, measurements };
      setClientLogs(dataPayload.logs || []);
      setClientMeasurements(dataPayload.measurements || []);
      setStep('dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch client data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      const data = await doLogin(email.trim(), password, 'client');
      setSelectedClient(data.user);
      localStorage.setItem('protrainer_session', JSON.stringify({ role: 'client', user: data.user }));
      await fetchClientData(data.user.name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Invalid credentials.');
      setIsLoading(false);
    }
  };

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const bodyWeight = (form.elements.namedItem('weight') as HTMLInputElement).value;
    const chest = (form.elements.namedItem('chest') as HTMLInputElement).value;
    const hips = (form.elements.namedItem('hips') as HTMLInputElement).value;
    const arms = (form.elements.namedItem('arms') as HTMLInputElement).value;

    setIsLoading(true);
    setErrorMsg('');
    try {
      const newM: BodyMeasurement = {
        date: new Date().toISOString(),
        clientName: selectedClient!.name,
        weight: bodyWeight,
        chest,
        hips,
        arms
      };
      
      // Use Firestore
      await appendMeasurement(newM);

      setClientMeasurements([newM, ...clientMeasurements]);
      setCurrentView('dashboard');
      form.reset();
    } catch (err: any) {
      setErrorMsg('Failed to save measurements.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'dashboard' && selectedClient) {
    return (
      <MobileNativeLayout
        title={selectedClient.name}
        subtitle="Good Morning"
        onBack={() => { localStorage.removeItem('protrainer_session'); setStep('login'); setEmail(''); setPassword(''); onBack(); }}
        bottomNav={
          <>
            <MobileTabItem icon={<Activity />} label="Dashboard" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
            <MobileTabItem icon={<FileText />} label="Logs" isActive={currentView === 'logs'} onClick={() => setCurrentView('logs')} />
            <MobileTabItem icon={<PlusCircle />} label="Results" isActive={currentView === 'measurements'} onClick={() => setCurrentView('measurements')} />
          </>
        }
      >
        {currentView === 'dashboard' && (
          <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
        )}

        {currentView === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4">Exercise History</h3>
            {clientLogs.length > 0 ? (
              clientLogs.map((log, i) => (
                <div key={i} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex justify-between items-center">
                  <div>
                    <div className="text-white font-semibold">{log.exercise} <span className="text-[#8e8e93] text-sm ml-2">{log.muscleGroup}</span></div>
                    <div className="text-[#34C759] text-sm mt-1">{log.sets} sets × {log.reps} reps</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">{log.weight}</div>
                    <div className="text-[#8e8e93] text-xs mt-1">{new Date(log.date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[#8e8e93] mt-12">No logs found.</div>
            )}
          </div>
        )}

        {currentView === 'measurements' && (
          <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
            <h3 className="text-lg font-bold text-white mb-2">Log Measurements</h3>
            <p className="text-[#8e8e93] text-sm mb-6">Track your vitals.</p>
            
            <form onSubmit={handleAddMeasurement} className="space-y-5">
              {errorMsg && (
                <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Body Weight</label>
                <input type="number" step="0.1" name="weight" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#34C759] transition-colors" required placeholder="lbs or kg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Chest</label>
                  <input type="number" step="0.1" name="chest" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#34C759] transition-colors" placeholder="in/cm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Hips</label>
                  <input type="number" step="0.1" name="hips" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#34C759] transition-colors" placeholder="in/cm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Arms</label>
                <input type="number" step="0.1" name="arms" className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#34C759] transition-colors" placeholder="in/cm" />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full mt-4 bg-[#34C759] text-black font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-[0_4px_16px_rgba(52,199,89,0.3)]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Progress'}
              </button>
            </form>
          </div>
        )}
      </MobileNativeLayout>
    );
  }

  // Login
  return (
    <MobileNativeLayout onBack={onBack} title="Client Login">
      <div className="flex flex-col items-center justify-center mt-8 mb-12">
        <div className="w-20 h-20 bg-[#1C1C1E] rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(52,199,89,0.2)]">
          <Dumbbell className="w-10 h-10 text-[#34C759]" />
        </div>
        <p className="text-[#8e8e93] text-center max-w-[250px]">Sign in to access your workout metrics.</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
            {errorMsg}
          </div>
        )}
        
        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Email or Name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e8e93]" />
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your username"
              className="w-full bg-[#1C1C1E] border border-transparent rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#34C759] focus:bg-[#2C2C2E] transition-all"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e8e93]" />
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1C1C1E] border border-transparent rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#34C759] focus:bg-[#2C2C2E] transition-all"
              required
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 bg-gradient-to-tr from-[#34C759] to-[#30b551] text-black font-bold py-4 flex justify-center items-center rounded-2xl transition-transform active:scale-95 disabled:opacity-50 shadow-[0_8px_24px_rgba(52,199,89,0.3)]"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
        </button>

        {onSwitchRole && (
          <div className="mt-8 flex justify-center gap-6">
            <button 
              type="button" 
              onClick={() => onSwitchRole('trainer')} 
              className="text-[#8e8e93] text-sm font-medium hover:text-white transition-colors"
            >
              Trainer Login
            </button>
            <span className="text-[#3a3a3c]">•</span>
            <button 
              type="button" 
              onClick={() => onSwitchRole('admin')} 
              className="text-[#8e8e93] text-sm font-medium hover:text-white transition-colors"
            >
              Admin Login
            </button>
          </div>
        )}
      </form>
    </MobileNativeLayout>
  );
}
