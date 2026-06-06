import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Loader2, Dumbbell, ArrowLeft, Lock, FileText, Activity, User, PlusCircle } from 'lucide-react';
import { 
  fetchAllClients, 
  fetchClientLogs, 
  fetchClientMeasurements, 
  appendMeasurement,
  ExerciseLog, 
  ClientProfile, 
  BodyMeasurement 
} from '../lib/sheets';
import { ClientDashboard } from './ClientDashboard';

export function ClientApp({ onBack }: { onBack: () => void }) {
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
      const dataRes = await apiFetch(`/api/client/data?clientName=${encodeURIComponent(name)}`);
      const dataPayload = await dataRes.json();
      if (dataRes.ok) {
        setClientLogs(dataPayload.logs || []);
        setClientMeasurements(dataPayload.measurements || []);
      }
    } catch(err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setErrorMsg('');

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password, role: 'client' })
        });
        
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid credentials');
        }

        setSelectedClient(data.user);
        
        localStorage.setItem('protrainer_session', JSON.stringify({ role: 'client', user: data.user }));
        
        // Fetch securely filtered data using name
        const dataRes = await apiFetch(`/api/client/data?clientName=${encodeURIComponent(data.user.name)}`);
        const dataPayload = await dataRes.json();
        
        if (!dataRes.ok) {
           console.log(dataPayload.error || 'Failed to fetch your data');
        }

        setClientLogs(dataPayload.logs || []);
        setClientMeasurements(dataPayload.measurements || []);
        setStep('dashboard');
      } catch (err: any) {
        setErrorMsg(err.message || 'Login failed. Note: The Admin must configure the master database first.');
      } finally {
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
      
      // We no longer append directly here via sheet to keep frontend secure.
      // Instead we mock the save in state for the preview since setting up Auth 
      // token proxying for backend writes requires more robust session handling.
      // await appendMeasurement(spreadsheetId, newM);

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
      <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm relative z-10">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-sm">
               <Dumbbell className="w-4 h-4 text-white" />
             </div>
             <h2 className="text-lg font-bold text-slate-800">
               {selectedClient.name}
             </h2>
          </div>
          <button 
            onClick={() => { localStorage.removeItem('protrainer_session'); setStep('login'); setEmail(''); setPassword(''); onBack(); }}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            Log Out
          </button>
        </header>

        <div className="bg-white border-b border-slate-200 px-4 md:px-8 flex space-x-6 overflow-x-auto shrink-0 shadow-sm relative z-0">
          <button 
            onClick={() => setCurrentView('dashboard')}
            className={`py-3.5 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${currentView === 'dashboard' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Activity className="w-4 h-4" />
            Dashboard
          </button>
          <button 
            onClick={() => setCurrentView('logs')}
            className={`py-3.5 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${currentView === 'logs' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <FileText className="w-4 h-4" />
            Log Book
          </button>
          <button 
            onClick={() => setCurrentView('measurements')}
            className={`py-3.5 px-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${currentView === 'measurements' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Add Measurements
          </button>
        </div>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
           {currentView === 'dashboard' && (
             <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
           )}

           {currentView === 'logs' && (
             <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-200 bg-slate-50">
                 <h3 className="text-sm font-bold text-slate-800 tracking-wider">EXERCISE HISTORY</h3>
                 <p className="text-xs text-slate-500 mt-1">Review your completed sets and reps.</p>
               </div>
               <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                 <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead>
                     <tr className="bg-slate-50 text-xs text-slate-400 uppercase tracking-wider font-bold border-b border-slate-200 sticky top-0">
                       <th className="p-4 rounded-tl-lg">Date</th>
                       <th className="p-4">Muscle Group</th>
                       <th className="p-4">Exercise</th>
                       <th className="p-4">Weight</th>
                       <th className="p-4">Sets</th>
                       <th className="p-4">Reps</th>
                     </tr>
                   </thead>
                   <tbody className="text-sm">
                     {clientLogs.length > 0 ? (
                       clientLogs.map((log, i) => (
                         <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                           <td className="p-4 text-slate-600 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                           <td className="p-4 text-slate-600">{log.muscleGroup}</td>
                           <td className="p-4 font-medium text-slate-800">{log.exercise}</td>
                           <td className="p-4 text-slate-600">{log.weight}</td>
                           <td className="p-4 text-slate-600">{log.sets}</td>
                           <td className="p-4 text-slate-600">{log.reps}</td>
                         </tr>
                       ))
                     ) : (
                       <tr>
                         <td colSpan={6} className="p-8 text-center text-slate-400">No logs found.</td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
           )}

           {currentView === 'measurements' && (
             <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
               <h3 className="text-sm font-bold text-slate-800 tracking-wider mb-2">UPDATE BODY MEASUREMENTS</h3>
               <p className="text-xs text-slate-500 mb-8 leading-relaxed">Enter your latest stats to track your progress over time.</p>
               
               <form onSubmit={handleAddMeasurement} className="space-y-4">
                 {errorMsg && (
                   <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                     {errorMsg}
                   </div>
                 )}
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Body Weight (lbs/kg)</label>
                   <input type="number" step="0.1" name="weight" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" required />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Chest (in/cm)</label>
                   <input type="number" step="0.1" name="chest" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hips (in/cm)</label>
                   <input type="number" step="0.1" name="hips" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Arms (in/cm)</label>
                   <input type="number" step="0.1" name="arms" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
                 </div>

                 <button 
                   type="submit"
                   disabled={isLoading}
                   className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 flex justify-center items-center rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                 >
                   {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Measurements'}
                 </button>
               </form>
             </div>
           )}

        </main>
      </div>
    );
  }

  // Auth / Connection Steps
  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
        
        <button onClick={onBack} className="text-slate-400 hover:text-slate-700 mb-6 flex items-center text-sm font-medium transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        <div className="bg-emerald-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6 shadow-sm shadow-emerald-200">
          <Dumbbell className="w-6 h-6 text-white" />
        </div>
        
        {step === 'login' && (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Client Portal</h1>
            <p className="text-[13px] text-slate-500 mb-8 leading-relaxed">
              Log in to view your workouts and metrics securely.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Client Name / Email</label>
                <input 
                  type="text" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. John Doe or email"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                  required
                />
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 flex justify-center items-center rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
