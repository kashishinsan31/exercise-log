import React, { useState, useEffect } from 'react';
import { LogOut, Dumbbell, Calendar as CalendarIcon, Loader2, CheckCircle2, List as ListIcon, Activity, Plus, PieChart as ChartIcon, Lock, Trash2, Users, Star, Settings } from 'lucide-react';
import { ExerciseLog, BodyMeasurement, TrainerReview, fetchExercises, fetchAllClients, doLogin, fetchClientLogs, fetchClientMeasurements, deleteLogRecord, appendLogRecord, appendMeasurement, deleteMeasurement, updateMeasurement, fetchTrainerReviews, updateTrainer, fetchAllLogs, fetchAllTrainers, TrackedTrainer, ClientProfile, subscribeToAllClients, subscribeToAllTrainers, subscribeToAllLogs, subscribeToTrainerReviews, subscribeToLogs, subscribeToMeasurements, subscribeToExercises } from '../lib/db';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ClientDashboard } from './ClientDashboard';
import { MobileNativeLayout, MobileTabItem } from './MobileNativeLayout';
import { LeaderboardView } from './LeaderboardView';
import { Trophy } from 'lucide-react';

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
  const [clients, setClients] = useState<{name: string, password?: string, trainerEmail?: string, phone?: string}[]>([]);
  const [exercises, setExercises] = useState<{name: string, group: string}[]>([]);
  
  const [selectedClient, setSelectedClient] = useState('');
  const [clientLogs, setClientLogs] = useState<ExerciseLog[]>([]);
  const [clientMeasurements, setClientMeasurements] = useState<BodyMeasurement[]>([]);
  const [trainerReviews, setTrainerReviews] = useState<TrainerReview[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'clients' | 'dashboard' | 'logs' | 'measurements' | 'reviews' | 'leaderboard' | 'settings'>('clients');

  const [globalClients, setGlobalClients] = useState<ClientProfile[]>([]);
  const [globalTrainers, setGlobalTrainers] = useState<TrackedTrainer[]>([]);
  const [globalLogs, setGlobalLogs] = useState<ExerciseLog[]>([]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settingsTab, setSettingsTab] = useState<'password'>('password');

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      const session = localStorage.getItem('protrainer_session');
      if (!session || !currentPassword || !newPassword || !confirmPassword) return;
      if (newPassword !== confirmPassword) {
          setErrorMsg('New passwords do not match.');
          return;
      }
      const { user } = JSON.parse(session);
      if (!user || user.role !== 'trainer') {
         // Fallback
      }
      setIsChangingPassword(true);
      setErrorMsg('');
      setPasswordSuccess('');
      try {
          // Verify current password first
          const loginData = await doLogin(user.email, currentPassword, 'trainer');
          if (!loginData.success) {
            throw new Error('Current password is incorrect.');
          }

          await updateTrainer(user.email, { password: newPassword });
          setPasswordSuccess('Password updated successfully.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err: any) {
          setErrorMsg(err.message || 'Failed to update password.');
      } finally {
          setIsChangingPassword(false);
      }
  };

  useEffect(() => {
    const unsubEx = subscribeToExercises(setExercises);
    
    let unsubTrainerClients: any;
    let unsubTrainerTrainers: any;
    let unsubTrainerLogs: any;
    let unsubReviews: any;

    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'trainer' && user) {
          setTrainerName(user.name);
          setEmail(user.email);
          setStep('dashboard');

          unsubTrainerClients = subscribeToAllClients((all) => {
             setClients(all.filter(c => c.trainerEmail === user.email || c.secondaryTrainerEmail === user.email)); 
             setGlobalClients(all);
          });
          unsubReviews = subscribeToTrainerReviews(user.email, setTrainerReviews);
          unsubTrainerTrainers = subscribeToAllTrainers(setGlobalTrainers);
          unsubTrainerLogs = subscribeToAllLogs(setGlobalLogs);
        }
      } catch(e) {}
    }

    return () => {
       unsubEx();
       if (unsubTrainerClients) unsubTrainerClients();
       if (unsubReviews) unsubReviews();
       if (unsubTrainerTrainers) unsubTrainerTrainers();
       if (unsubTrainerLogs) unsubTrainerLogs();
    };
  }, []);

  useEffect(() => {
    if (selectedClient) {
       setIsLoadingLogs(true);
       const unsubLogs = subscribeToLogs(selectedClient, setClientLogs);
       const unsubMeasurements = subscribeToMeasurements(selectedClient, setClientMeasurements);
       setIsLoadingLogs(false);
       return () => {
          unsubLogs();
          unsubMeasurements();
       };
    }
  }, [selectedClient]);

  const fetchClients = async (tEmail: string) => { 
      // Handled by state subscriptions
  };

  const handleDeleteMeasurement = async (m: BodyMeasurement) => {
      if (!m.id) return;
      // if (!confirm('Are you sure you want to delete this measurement?')) return;
      try {
          await deleteMeasurement(m.id);
          setClientMeasurements(prev => prev.filter(x => x.id !== m.id));
      } catch (err: any) {
          setErrorMsg('Failed to delete measurement.');
      }
  };

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
        setErrorMsg(err.message || 'Login failed.');
      } finally {
        setIsLoading(false);
      }
  };

  const loadClientData = async (clientName: string) => {
    setSelectedClient(clientName);
    setActiveTab('dashboard');
    setErrorMsg('');
  };

  const handleDeleteLog = async (log: ExerciseLog) => {
    // const isConfirmed = window.confirm(`Are you sure you want to delete this log? This action cannot be undone.`);
    // if (!isConfirmed) return;
    try {
      await deleteLogRecord(log);
      
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

  if (step === 'login') {
    return (
      <MobileNativeLayout onBack={onBack}>
        <div className="flex flex-col items-center justify-center mt-12 mb-10">
          <img src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" alt="Company Logo" className="w-32 h-32 object-contain mb-8 origin-center" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Trainer Portal</h2>
          <p className="text-[#8e8e93] text-center text-sm max-w-[250px]">Manage your clients securely.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
              {errorMsg}
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Email</label>
            <div className="relative">
              <LogOut className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e8e93]" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trainer@example.com"
                className="w-full bg-[#1C1C1E] border border-transparent rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#007AFF] focus:bg-[#2C2C2E] transition-all"
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
                className="w-full bg-[#1C1C1E] border border-transparent rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#007AFF] focus:bg-[#2C2C2E] transition-all"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 bg-[#007AFF] text-white font-bold py-4 flex justify-center items-center rounded-2xl transition-transform active:scale-95 disabled:opacity-50 shadow-[0_8px_24px_rgba(0,122,255,0.3)]"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Secure Login'}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col items-center">
          <p className="text-[#8e8e93] text-xs text-center max-w-xs mb-4 leading-relaxed">
            By logging in, you agree to our Terms of Service and Privacy Policy. Secure access is monitored and logged for compliance.
          </p>
          <div className="flex gap-4 text-[#007AFF] text-xs font-medium">
            <button className="hover:underline hover:text-white transition-colors">Help Center</button>
            <span>&bull;</span>
            <button className="hover:underline hover:text-white transition-colors">Contact Support</button>
          </div>
        </div>
      </MobileNativeLayout>
    );
  }

  return (
    <MobileNativeLayout
      title={trainerName}
      subtitle={selectedClient || "Select a Client"}
      onRefresh={() => {
        if (email) fetchClients(email);
        if (selectedClient) loadClientData(selectedClient);
      }}
      onLogout={() => { localStorage.removeItem('protrainer_session'); setStep('login'); setEmail(''); setPassword(''); onBack(); }}
      bottomNav={
        <>
          <MobileTabItem icon={<Users />} label="Clients" isActive={activeTab === 'clients'} onClick={() => setActiveTab('clients')} activeColor="text-[#007AFF]" />
          {selectedClient && <MobileTabItem icon={<Activity />} label="Home" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} activeColor="text-[#007AFF]" />}
          {selectedClient && <MobileTabItem icon={<ListIcon />} label="Logs" isActive={activeTab === 'logs'} onClick={() => setActiveTab('logs')} activeColor="text-[#007AFF]" />}
          {selectedClient && <MobileTabItem icon={<Plus />} label="Metrics" isActive={activeTab === 'measurements'} onClick={() => setActiveTab('measurements')} activeColor="text-[#007AFF]" />}
          <MobileTabItem icon={<Star />} label="Reviews" isActive={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} activeColor="text-[#007AFF]" />
          <MobileTabItem icon={<Trophy />} label="Ranking" isActive={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} activeColor="text-[#007AFF]" />
          <MobileTabItem icon={<Settings />} label="Settings" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} activeColor="text-[#007AFF]" />
        </>
      }
  >
    {activeTab === 'leaderboard' && (
      <LeaderboardView logs={globalLogs} clients={globalClients} trainers={globalTrainers} currentRole="trainer" loggedInUserEmail={email} />
    )}
    
    {activeTab === 'clients' && (
      <div className="space-y-4">
          <h3 className="text-white font-bold text-lg mb-4">Assigned Clients</h3>
          {clients.length === 0 ? (
            <div className="text-center text-[#8e8e93] mt-12 bg-[#1C1C1E] rounded-3xl p-8 border border-white/5">No clients assigned.</div>
          ) : (
            clients.map((client) => (
              <button 
                key={client.name}
                onClick={() => loadClientData(client.name)}
                className="w-full bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex items-center justify-between transition-colors hover:bg-[#2C2C2E]"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#007AFF]/20 text-[#007AFF] flex flex-col justify-center items-center font-bold text-lg shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold text-lg">{client.name}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedClient && activeTab === 'dashboard' && (
        <div className="pb-10">
          <ClientDashboard clientName={selectedClient} logs={clientLogs} measurements={clientMeasurements} />
        </div>
      )}

      {selectedClient && activeTab === 'logs' && (
        <div className="space-y-6 pb-20">
          <LoggerForm 
            clientName={selectedClient}
            exercises={exercises}
            onLogAdded={(log) => setClientLogs(p => [log, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
          />
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4 mt-6">Logged Exercises</h3>
            {isLoadingLogs ? (
               <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
            ) : clientLogs.length === 0 ? (
               <div className="text-center text-[#8e8e93] bg-[#1C1C1E] p-8 rounded-3xl border border-white/5">No exercises logged.</div>
            ) : (
               clientLogs.map((log, idx) => (
                <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        {log.exercise}
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-white/70">
                          {log.muscleGroup}
                        </span>
                      </div>
                      <div className="text-[#007AFF] text-sm mt-1">{log.sets} sets × {log.reps} reps @ {log.weight}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <button onClick={() => handleDeleteLog(log)} className="text-[#8e8e93] hover:text-[#FF3B30] p-1"><Trash2 className="w-4 h-4" /></button>
                       <div className="text-[#8e8e93] text-xs pt-1">{format(new Date(log.date), 'MMM d')}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedClient && activeTab === 'measurements' && (
        <div className="space-y-6 pb-20">
          <MeasurementForm 
            clientName={selectedClient}
            onMeasurementAdded={(m) => setClientMeasurements(p => [m, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
          />
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4 mt-6">Body Metrics</h3>
            {isLoadingLogs ? (
               <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
            ) : clientMeasurements.length === 0 ? (
               <div className="text-center text-[#8e8e93] bg-[#1C1C1E] p-8 rounded-3xl border border-white/5">No measurements logged.</div>
            ) : (
               clientMeasurements.map((m, idx) => (
                <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#8e8e93] text-xs font-semibold uppercase">{format(new Date(m.date), 'MMMM d, yyyy')}</span>
                    {m.id && (
                       <button onClick={() => handleDeleteMeasurement(m)} className="p-1 text-[#8e8e93] hover:text-[#FF3B30]"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div><span className="text-[10px] text-[#8e8e93] uppercase">Weight</span><p className="text-white font-bold">{m.weight}</p></div>
                    <div><span className="text-[10px] text-[#8e8e93] uppercase">Chest</span><p className="text-white font-bold">{m.chest}</p></div>
                    <div><span className="text-[10px] text-[#8e8e93] uppercase">Hips</span><p className="text-white font-bold">{m.hips}</p></div>
                    <div><span className="text-[10px] text-[#8e8e93] uppercase">Arms</span><p className="text-white font-bold">{m.arms}</p></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedClient && activeTab === 'reviews' && (
        <div className="space-y-4 pb-20">
          <h3 className="text-white font-bold text-lg mb-4 mt-6">Client Reviews</h3>
          {trainerReviews.length === 0 ? (
             <div className="text-center text-[#8e8e93] bg-[#1C1C1E] p-8 rounded-3xl border border-white/5">No reviews yet.</div>
          ) : (
             trainerReviews.map((rev, idx) => (
              <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-5 border border-white/5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-bold">{rev.clientName}</div>
                    <div className="text-[#8e8e93] text-xs mt-0.5">{new Date(rev.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-1 bg-[#34C759]/10 px-2 flex-col rounded-lg">
                    <span className="text-lg font-bold text-[#34C759] leading-none mt-2">{rev.rating}</span>
                    <span className="text-[10px] text-[#34C759] uppercase font-bold tracking-wider mb-1">Overall</span>
                  </div>
                </div>
                <p className="text-sm text-white/80 italic">"{rev.feedbackText}"</p>
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                  <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-xs">Punctuality</span><span className="text-white font-medium text-xs">{rev.punctuality}/5</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-xs">Professionalism</span><span className="text-white font-medium text-xs">{rev.professionalism}/5</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-xs">Knowledge</span><span className="text-white font-medium text-xs">{rev.knowledge}/5</span></div>
                  <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-xs">Communication</span><span className="text-white font-medium text-xs">{rev.communication}/5</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5 pb-24 mt-6">
          <div className="flex gap-2 mb-6">
            <button onClick={() => setSettingsTab('password')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${settingsTab === 'password' ? 'bg-[#007AFF] text-white' : 'bg-white/5 text-[#8e8e93] hover:text-white'}`}>Password</button>
          </div>

          {settingsTab === 'password' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-bold text-white mb-2">Change Password</h3>
              <p className="text-[#8e8e93] text-sm mb-6">Update your account secured password.</p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                 {errorMsg && (
                   <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
                     {errorMsg}
                   </div>
                 )}
                 {passwordSuccess && (
                   <div className="p-3 bg-green-500/20 text-[#34C759] rounded-xl text-sm font-medium">
                     {passwordSuccess}
                   </div>
                 )}
                 
                 <div>
                    <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Current Password</label>
                    <input 
                      type="password" 
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter current password"
                      className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#007AFF] transition-all"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">New Password</label>
                    <input 
                      type="password" 
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#007AFF] transition-all"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Confirm New Password</label>
                    <input 
                      type="password" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
                      className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#007AFF] transition-all"
                    />
                 </div>

                 <button 
                   type="submit" 
                   disabled={isChangingPassword}
                   className="w-full mt-6 bg-[#007AFF] text-white font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-[0_4px_14px_rgba(0,122,255,0.3)]"
                 >
                   {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Password'}
                 </button>
              </form>
            </div>
          )}
        </div>
      )}
    </MobileNativeLayout>
  );
}

export function LoggerForm({ 
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
    <div className="bg-[#1C1C1E] p-6 rounded-3xl border border-white/5">
      <h3 className="text-white font-bold text-lg mb-4">Add Log for {clientName}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <div className="p-3 rounded-xl bg-red-500/20 text-[#FF3B30] text-sm font-medium">{errorMsg}</div>}
        {successMsg && <div className="p-3 rounded-xl bg-[#34C759]/20 text-[#34C759] text-sm font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{successMsg}</div>}
        
        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Date</label>
          <input type="date" required value={date} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Muscle Group</label>
          <select value={muscleGroup} onChange={(e) => { setMuscleGroup(e.target.value); setExercise(''); }}
            className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors"
          >
            {availableGroups.map((group) => <option key={group} value={group}>{group}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Exercise Name</label>
          <input 
            list="exercises-list" 
            type="text" 
            required 
            placeholder="Search or add custom exercise..." 
            value={exercise} 
            onChange={(e) => setExercise(e.target.value)}
            className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors" 
          />
          <datalist id="exercises-list">
            {filteredExercises.map((ex) => <option key={ex.name} value={ex.name}>{ex.name}</option>)}
          </datalist>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 text-center">Sets</label>
            <input type="number" min="0" placeholder="4" value={sets} onChange={(e) => setSets(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#007AFF] text-center transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 text-center">Reps</label>
            <input type="number" min="0" placeholder="12" value={reps} onChange={(e) => setReps(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#007AFF] text-center transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 text-center">Weight</label>
            <input type="number" min="0" placeholder="185" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-3 text-white outline-none focus:border-[#007AFF] text-center transition-colors" />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full mt-4 bg-[#007AFF] text-white font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center">
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Log'}
        </button>
      </form>
    </div>
  );
}

function MeasurementForm({ clientName, onMeasurementAdded }: { clientName: string; onMeasurementAdded: (m: BodyMeasurement) => void; }) {
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
      setWeight(''); setChest(''); setHips(''); setArms('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save record.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="bg-[#1C1C1E] p-6 rounded-3xl border border-white/5">
      <h3 className="text-white font-bold text-lg mb-4">Add Metrics for {clientName}</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && <div className="p-3 rounded-xl bg-red-500/20 text-[#FF3B30] text-sm font-medium">{errorMsg}</div>}
        {successMsg && <div className="p-3 rounded-xl bg-[#34C759]/20 text-[#34C759] text-sm font-medium flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{successMsg}</div>}
        
        <div>
          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Date</label>
          <input type="date" required value={date} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Body Weight</label>
            <input type="number" step="0.1" placeholder="lbs/kg" value={weight} onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Chest</label>
            <input type="number" step="0.1" placeholder="in/cm" value={chest} onChange={(e) => setChest(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Hips</label>
            <input type="number" step="0.1" placeholder="in/cm" value={hips} onChange={(e) => setHips(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2">Arms</label>
            <input type="number" step="0.1" placeholder="in/cm" value={arms} onChange={(e) => setArms(e.target.value)}
              className="w-full bg-[#0A0A0C] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#007AFF] transition-colors" />
          </div>
        </div>

        <button type="submit" disabled={isSaving} className="w-full mt-4 bg-[#007AFF] text-white font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Metrics'}
        </button>
      </form>
    </div>
  );
}