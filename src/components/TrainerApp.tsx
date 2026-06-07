import React, { useState, useEffect } from 'react';
import { LogOut, Dumbbell, Calendar as CalendarIcon, Loader2, CheckCircle2, List as ListIcon, Activity, Plus, PieChart as ChartIcon, Lock, Trash2 } from 'lucide-react';
import { ExerciseLog, BodyMeasurement, fetchExercises, fetchAllClients, doLogin, fetchClientLogs, fetchClientMeasurements, deleteLogRecord, appendLogRecord, appendMeasurement } from '../lib/db';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ClientDashboard } from './ClientDashboard';
import { googleSignIn } from '../lib/firebase';

export function TrainerApp({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<'login' | 'dashboard'>(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'trainer' && user) return 'dashboard';
      } catch (e) {}
    }
    return 'login';
  });
  
  const [email, setEmail] = useState(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'trainer' && user) return user.email;
      } catch (e) {}
    }
    return '';
  });
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [trainerName, setTrainerName] = useState(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'trainer' && user) return user.name;
      } catch (e) {}
    }
    return '';
  });
  const [clients, setClients] = useState<{name: string, password?: string, trainerEmail?: string, phone?: string}>([]);
  const [exercises, setExercises] = useState<{name: string, group: string}[]>([]);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [clientLogs, setClientLogs] = useState<ExerciseLog[]>([]);
  const [clientMeasurements, setClientMeasurements] = useState<BodyMeasurement[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'logs' | 'dashboard' | 'measurements'>('logs');
  const [logFilterDate, setLogFilterDate] = useState<string>('');

  useEffect(() => {
    // Fetch global exercises
    fetchExercises().then(data => setExercises(data)).catch(console.error);
    
    // Auto login check
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'trainer' && user) {
          setTrainerName(user.name);
          setEmail(user.email);
          fetchClients(user.email);
          setStep('dashboard');
        }
      } catch(e) {}
    }
  }, []);

  const fetchClients = async (tEmail: string) => { try { const all = await fetchAllClients(); setClients(all.filter(c => c.trainerEmail === tEmail)); } catch (e) { setErrorMsg('Failed to fetch clients'); } };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
        const data = await doLogin(email.trim(), password, 'trainer');
        if (!data.success) {
          throw new Error('Invalid credentials');
        }

        setTrainerName(data.user.name);
        setEmail(data.user.email);
        localStorage.setItem('protrainer_session', JSON.stringify({ role: 'trainer', user: data.user }));
        await fetchClients(data.user.email);
        setStep('dashboard');
      } catch (err: any) {
        setErrorMsg(err.message || 'Login failed. Ensure Admin has connected the Master DB.');
      } finally {
        setIsLoading(false);
      }
  };

  const loadClientData = async (clientName: string) => {
    setSelectedClient(clientName);
    setIsLoadingLogs(true);
    setErrorMsg('');
    try {
      const logs = await fetchClientLogs(clientName);
      const measures = await fetchClientMeasurements(clientName);
      const dataPayload = { logs, measurements: measures };

      setClientLogs((dataPayload.logs || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setClientMeasurements((dataPayload.measurements || []).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch(err: any) {
       console.error(err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDeleteLog = async (log: ExerciseLog) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete this log? This action cannot be undone.`);
    if (!isConfirmed) return;
    try {
      await deleteLogRecord(log);
      
      // Update local state
      setClientLogs(prev => prev.filter(l => 
        l.date !== log.date || 
        l.exercise !== log.exercise || 
        l.sets !== log.sets || 
        l.reps !== log.reps || 
        l.weight !== log.weight
      ));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentDate = format(new Date(), 'MMMM d, yyyy');

  if (step === 'login') {
    return (
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-700 mb-6 flex items-center text-sm font-medium transition-colors">
            ← Back
          </button>

          <div className="bg-indigo-500 w-12 h-12 rounded-lg flex items-center justify-center mb-6 shadow-sm shadow-indigo-200">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          
          <h1 className="text-xl font-bold text-slate-900 mb-2">Trainer Portal</h1>
          <p className="text-[13px] text-slate-500 mb-8 leading-relaxed">
            Log in to manage your clients securely.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
                {errorMsg}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trainer@example.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 flex justify-center items-center rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden hidden md:flex">
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-start shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-lg shadow-sm shadow-indigo-500/20">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight">{trainerName}</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest pt-0.5">Trainer Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Clients</span>
          </div>
          
          {clients.length === 0 ? (
            <div className="px-3 py-4 text-xs text-slate-500 text-center border border-dashed rounded-lg">No clients assigned.</div>
          ) : (
            clients.map((client) => (
              <button 
                key={client.name}
                onClick={() => loadClientData(client.name)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-colors border",
                  selectedClient === client.name 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm" 
                    : "hover:bg-slate-50 text-slate-600 border-transparent"
                )}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    selectedClient === client.name ? "bg-indigo-200 text-indigo-700" : "bg-slate-200 text-slate-600"
                  )}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm truncate">{client.name}</span>
                </div>
                {selectedClient === client.name && <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>}
              </button>
            ))
          )}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-0 md:h-16 flex flex-col md:flex-row md:items-center justify-between shrink-0 shadow-sm relative z-10 gap-3 md:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
             <div className="md:hidden flex items-center gap-2 flex-1 mr-3">
                <select 
                  value={selectedClient} 
                  onChange={(e) => loadClientData(e.target.value)}
                  className="w-full bg-slate-100 border-none text-sm font-semibold rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Select Client</option>
                  {clients.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
             </div>

            <h2 className="text-lg font-semibold text-slate-800 truncate hidden md:block w-48 lg:w-max">
              {selectedClient || 'Select a Client from sidebar'}
            </h2>
             
             <button 
               onClick={onBack}
               className="md:hidden text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg bg-slate-100 border border-slate-200 shrink-0"
               title="Sign out"
             >
               <LogOut className="w-4 h-4" />
             </button>
          </div>
          
          {selectedClient && (
            <div className="flex items-center space-x-1 bg-slate-100 rounded-lg p-1 w-full md:w-auto overflow-x-auto shrink-0 drop-shadow-sm md:drop-shadow-none">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={cn(
                    "flex-1 md:flex-none justify-center px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === 'logs' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ListIcon className="w-3.5 h-3.5 shrink-0" /> Data Logs
                </button>
                <button
                  onClick={() => setActiveTab('measurements')}
                  className={cn(
                    "flex-1 md:flex-none justify-center px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === 'measurements' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Activity className="w-3.5 h-3.5 shrink-0" /> Metrics
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={cn(
                    "flex-1 md:flex-none justify-center px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap",
                    activeTab === 'dashboard' ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <ChartIcon className="w-3.5 h-3.5 shrink-0" /> Dashboard
                </button>
            </div>
          )}
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto">
          {!selectedClient ? (
             <div className="h-full flex flex-col items-center justify-center text-center">
               <Dumbbell className="w-16 h-16 text-slate-200 mb-4" />
               <h2 className="text-xl font-bold text-slate-700">Client Workspace</h2>
               <p className="text-sm text-slate-500 mt-2">Select a client from the sidebar to view & record logs.</p>
             </div>
          ) : activeTab === 'dashboard' ? (
             <div className="max-w-6xl mx-auto pb-20">
               <ClientDashboard clientName={selectedClient} logs={clientLogs} measurements={clientMeasurements} />
             </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl mx-auto h-full min-h-0">
               {/* Input Section */}
              <section className="xl:col-span-4 flex flex-col overflow-y-auto pr-1 pb-10">
                {activeTab === 'logs' ? (
                  <LoggerForm 
                    clientName={selectedClient}
                    exercises={exercises}
                    onLogAdded={(log) => setClientLogs(p => [log, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
                  />
                ) : (
                  <MeasurementForm 
                    clientName={selectedClient}
                    onMeasurementAdded={(m) => setClientMeasurements(p => [m, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
                  />
                )}
              </section>
              
               {/* Table/History Section */}
              <section className="xl:col-span-8 flex flex-col h-[500px] xl:h-[calc(100vh-140px)] min-h-[400px]">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold text-slate-800 tracking-wider">
                      {activeTab === 'logs' ? 'LOGGED EXERCISES' : 'BODY METRICS'}
                    </h3>
                  </div>
                  <div className="flex-1 overflow-auto">
                    {activeTab === 'logs' ? (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="bg-slate-50/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Muscle Group</th>
                            <th className="px-6 py-4">Exercise</th>
                            <th className="px-6 py-4 text-center">Sets</th>
                            <th className="px-6 py-4 text-center">Reps</th>
                            <th className="px-6 py-4 text-center">Weight</th>
                            <th className="px-6 py-4 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-sm">
                          {isLoadingLogs ? (
                            <tr><td colSpan={7} className="px-6 py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" /></td></tr>
                          ) : clientLogs.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400">No exercises logged.</td></tr>
                          ) : (
                            clientLogs.map((log, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs font-medium">
                                  {format(new Date(log.date), 'MMM d, yy')}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 rounded text-[10px] font-bold tracking-wider bg-slate-100 text-slate-600">
                                    {log.muscleGroup.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">{log.exercise}</td>
                                <td className="px-6 py-4 text-center font-medium text-slate-600">{log.sets}</td>
                                <td className="px-6 py-4 text-center font-medium text-slate-600">{log.reps}</td>
                                <td className="px-6 py-4 text-center text-indigo-600 font-semibold">{log.weight}</td>
                                <td className="px-6 py-4 text-center">
                                  <button onClick={() => handleDeleteLog(log)} className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete Log">
                                    <Trash2 className="w-4 h-4 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4 text-center">Body Weight</th>
                          <th className="px-6 py-4 text-center">Chest</th>
                          <th className="px-6 py-4 text-center">Hips</th>
                          <th className="px-6 py-4 text-center">Arms</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-sm">
                        {isLoadingLogs ? (
                           <tr><td colSpan={5} className="px-6 py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" /></td></tr>
                        ) : clientMeasurements.length === 0 ? (
                          <tr><td colSpan={5} className="px-6 py-16 text-center text-slate-400 text-sm">No measurements logged.</td></tr>
                        ) : (
                          clientMeasurements.map((m, idx) => (
                            <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs font-medium">
                                {format(new Date(m.date), 'MMM d, yy')}
                              </td>
                              <td className="px-6 py-4 text-center text-indigo-600 font-semibold">{m.weight}</td>
                              <td className="px-6 py-4 text-center font-medium text-slate-600">{m.chest}</td>
                              <td className="px-6 py-4 text-center font-medium text-slate-600">{m.hips}</td>
                              <td className="px-6 py-4 text-center font-medium text-slate-600">{m.arms}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    )}
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


function LoggerForm({ 
  clientName,
  exercises,
  onLogAdded
}: { 
  clientName: string;
  exercises: {name: string, group: string}[];
  onLogAdded: (log: ExerciseLog) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
  const availableGroups = exercises.length > 0 ? Array.from(new Set(exercises.map(e => e.group))) : MUSCLE_GROUPS;
  
  const [muscleGroup, setMuscleGroup] = useState(availableGroups[0] || 'Chest');
  const [exercise, setExercise] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const filteredExercises = exercises.filter(e => e.group === muscleGroup);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !exercise) {
      setErrorMsg('Client name and exercise are required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newLog: ExerciseLog = {
      date,
      clientName,
      muscleGroup,
      exercise,
      sets: sets || '-',
      reps: reps || '-',
      weight: weight || '-'
    };

    try {
      await appendLogRecord(newLog);
      
      onLogAdded(newLog);
      
      setSuccessMsg(`Logged ${exercise}`);
      setSets('');
      setReps('');
      setWeight('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save record.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
      <h3 className="text-sm font-bold text-slate-800 tracking-wider mb-6">ADD EXERCISE LOG</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-[13px] font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="truncate">{successMsg}</span>
          </div>
        )}
        
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Date
          </label>
          <input 
            type="date" 
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mt-2">Muscle Group</label>
          <select 
            value={muscleGroup}
            onChange={(e) => {
               setMuscleGroup(e.target.value);
               setExercise('');
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 outline-none ring-indigo-500 focus:ring-1 focus:bg-white transition-colors shadow-sm"
          >
            {availableGroups.map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 mt-2">Exercise Name</label>
          {filteredExercises.length > 0 ? (
            <select 
              required
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-slate-700 outline-none ring-indigo-500 focus:ring-1 focus:bg-white transition-colors shadow-sm"
            >
              <option value="" disabled>Select an exercise</option>
              {filteredExercises.map((ex) => (
                <option key={ex.name} value={ex.name}>{ex.name}</option>
              ))}
            </select>
          ) : (
            <input 
              type="text" 
              required
              placeholder="e.g. Barbell Squats"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 placeholder:text-slate-400 transition-colors shadow-sm"
            />
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 text-center">Sets</label>
            <input type="number" min="0" placeholder="4" value={sets} onChange={(e) => setSets(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-center outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 text-center">Reps</label>
            <input type="number" min="0" placeholder="12" value={reps} onChange={(e) => setReps(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-center outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 text-center">lbs / kg</label>
            <input type="number" min="0" placeholder="185" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm text-center outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold mt-2 flex justify-center items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-70 shadow-md"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin opacity-70" /> : null}
            {isSaving ? 'Logging Entry...' : 'Log Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MeasurementForm({ 
  clientName,
  onMeasurementAdded
}: { 
  clientName: string;
  onMeasurementAdded: (m: BodyMeasurement) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) return;

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    const newM: BodyMeasurement = {
      date, clientName,
      weight: weight || '-', chest: chest || '-', hips: hips || '-', arms: arms || '-'
    };

    try {
      await appendMeasurement(newM);

      onMeasurementAdded(newM);
      setSuccessMsg(`Logged measurements`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save record.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 shrink-0">
      <h3 className="text-sm font-bold text-slate-800 tracking-wider mb-6">ADD BODY METRICS</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium leading-relaxed">{errorMsg}</div>}
        {successMsg && <div className="p-3 rounded-lg bg-indigo-50 text-indigo-700 text-[13px] font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" /><span className="truncate">{successMsg}</span></div>}
        
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5" /> Date
          </label>
          <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Body Weight</label>
            <input type="text" placeholder="180 lbs" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" required />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Chest</label>
            <input type="text" placeholder="40 in" value={chest} onChange={(e) => setChest(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Hips</label>
            <input type="text" placeholder="34 in" value={hips} onChange={(e) => setHips(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Arms</label>
            <input type="text" placeholder="16 in" value={arms} onChange={(e) => setArms(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm outline-none ring-indigo-500 focus:ring-1 focus:bg-white text-slate-900 transition-colors shadow-sm" />
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold mt-2 flex justify-center items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-70 shadow-md">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin opacity-70" /> : null}
            {isSaving ? 'Logging Metrics...' : 'Log Metrics'}
          </button>
        </div>
      </form>
    </div>
  );
}
