import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Plus, Users, Dumbbell, Activity, LineChart as LineChartIcon, Loader2, Database, Link as LinkIcon, UserPlus, Trash2, Edit2, X, Check, Search, Menu, Star, Bell } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { fetchAllClients, fetchAllTrainers, fetchClientLogs, fetchClientMeasurements, fetchExercises, addExerciseRecord, deleteExerciseRecord, ClientProfile, ExerciseLog, BodyMeasurement, initializeDatabase, addTrainer, addClient, deleteTrainerRecord, deleteClientRecord, updateTrainer, updateClient, TrainerReview, fetchAllTrainerReviews, sendNotification, fetchAllLogs, subscribeToExercises, subscribeToAllClients, subscribeToAllTrainers, subscribeToAllLogs, subscribeToTrainerReviews, subscribeToLogs, subscribeToMeasurements } from '../lib/db';
import { ClientDashboard } from './ClientDashboard';
import { LoggerForm } from './TrainerApp';
import { MobileNativeLayout, MobileTabItem } from './MobileNativeLayout';
import { LeaderboardView } from './LeaderboardView';

interface TrackedTrainer {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface ExerciseItem {
  id?: string;
  name: string;
  group: string;
}

export function AdminApp({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
     const session = localStorage.getItem('protrainer_session');
     if (session) {
         try {
           const parsed = JSON.parse(session);
           if (parsed.role === 'admin') return true;
         } catch(e) {}
     }
     return false;
  });
  const [error, setError] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'trainers' | 'clients' | 'exercises' | 'overview' | 'reviews' | 'notifications' | 'leaderboard'>('trainers');

  // Dash State
  const [dbSpreadsheetId, setDbSpreadsheetId] = useState<string>('');
  const [trainers, setTrainers] = useState<TrackedTrainer[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [allLogs, setAllLogs] = useState<ExerciseLog[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [allReviews, setAllReviews] = useState<TrainerReview[]>([]);
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<string | null>(null);
  const [confirmDeleteTrainer, setConfirmDeleteTrainer] = useState<string | null>(null);
  const [confirmDeleteClient, setConfirmDeleteClient] = useState<string | null>(null);
  
  const [isAddingDB, setIsAddingDB] = useState(false);
  const [addDBError, setAddDBError] = useState('');
  const [dbInputMode, setDbInputMode] = useState<'url' | 'none'>('none');
  const [dbUrl, setDbUrl] = useState('');

  // Add Trainer State
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [newTrainerName, setNewTrainerName] = useState('');
  const [newTrainerEmail, setNewTrainerEmail] = useState('');
  const [newTrainerPhone, setNewTrainerPhone] = useState('');
  const [newTrainerPassword, setNewTrainerPassword] = useState('');
  const [isAddingTrainer, setIsAddingTrainer] = useState(false);
  
  // Add Client State
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTrainer, setNewClientTrainer] = useState('');
  const [newClientSecondaryTrainer, setNewClientSecondaryTrainer] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDob, setNewClientDob] = useState('');
  const [newClientHeight, setNewClientHeight] = useState('');
  const [isAddingClient, setIsAddingClient] = useState(false);

  // Add Exercise State
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseGroup, setNewExerciseGroup] = useState('');
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  // Edit Trainer State
  const [editingTrainerEmail, setEditingTrainerEmail] = useState<string | null>(null);
  const [editTrainerName, setEditTrainerName] = useState('');
  const [editTrainerPhone, setEditTrainerPhone] = useState('');
  const [editTrainerPassword, setEditTrainerPassword] = useState('');

  // Edit Client State
  const [editingClientKey, setEditingClientKey] = useState<string | null>(null);
  const [editClientTrainerEmail, setEditClientTrainerEmail] = useState('');
  const [editClientSecondaryTrainerEmail, setEditClientSecondaryTrainerEmail] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientDob, setEditClientDob] = useState('');
  const [editClientHeight, setEditClientHeight] = useState('');
  const [editClientPassword, setEditClientPassword] = useState('');

  // Selected Trainer State
  const [selectedTrainer, setSelectedTrainer] = useState<TrackedTrainer | null>(null);
  const [trainerClients, setTrainerClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  
  // Client Data State
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [clientLogs, setClientLogs] = useState<ExerciseLog[]>([]);
  const [clientMeasurements, setClientMeasurements] = useState<BodyMeasurement[]>([]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
      setError(false);
      localStorage.setItem('protrainer_session', JSON.stringify({ role: 'admin' }));
    } else {
      setError(true);
    }
  };

  // Notifications State
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifRole, setNotifRole] = useState<'client' | 'trainer' | 'both'>('client');
  const [isSendingNotif, setIsSendingNotif] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState(false);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifBody) return;
    setIsSendingNotif(true);
    setNotifSuccess(false);
    try {
      await sendNotification(notifTitle, notifBody, notifRole);
      setNotifTitle('');
      setNotifBody('');
      setNotifSuccess(true);
      setTimeout(() => setNotifSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error sending notification');
    }
    setIsSendingNotif(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = localStorage.getItem('protrainer_db');
    if (stored) {
       setDbSpreadsheetId(stored);
    } else {
       setDbInputMode('url');
    }

    const unsubT = subscribeToAllTrainers(setTrainers);
    const unsubC = subscribeToAllClients(setClients);
    const unsubE = subscribeToExercises(setExercises);
    const unsubR = subscribeToTrainerReviews(undefined, setAllReviews);
    const unsubL = subscribeToAllLogs(setAllLogs);
    
    return () => {
       unsubT();
       unsubC();
       unsubE();
       unsubR();
       unsubL();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedClient) {
       setIsLoadingData(true);
       const unsubL = subscribeToLogs(selectedClient.name, setClientLogs);
       const unsubM = subscribeToMeasurements(selectedClient.name, setClientMeasurements);
       setIsLoadingData(false);
       return () => {
          unsubL(); unsubM();
       };
    }
  }, [selectedClient]);

  const loadSystemData = async (spreadsheetId?: string) => {
      // Data is synced in real-time, but this gives visual feedback for the refresh button
      setIsLoadingData(true);
      setTimeout(() => setIsLoadingData(false), 600);
  };

  const handleConnectOrGenerateDB = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    setIsAddingDB(true);
    setAddDBError('');
    try {
         const sid = await initializeDatabase("admin@example.com");
         localStorage.setItem('protrainer_db', sid);
         setDbSpreadsheetId(sid);
      await loadSystemData();
      setDbInputMode('none');
    } catch (err: any) {
      console.error(err);
      setAddDBError(err.message || 'Failed to connect to database.');
    } finally {
      setIsAddingDB(false);
    }
  };

  const isPhoneUnique = (phoneToCheck: string, excludeEmail?: string, excludeClientName?: string) => {
      if (!phoneToCheck) return true;
      const trainerMatch = trainers.find(t => t.phone === phoneToCheck);
      if (trainerMatch && trainerMatch.email !== excludeEmail) return false;
      const clientMatch = clients.find(c => c.phone === phoneToCheck);
      if (clientMatch && clientMatch.name !== excludeClientName) return false;
      return true;
  };

  const handleAddTrainer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTrainerName || !newTrainerEmail || !newTrainerPhone) return;
      if (!isPhoneUnique(newTrainerPhone.trim())) {
          alert('This mobile number is already registered.');
          return;
      }
      setIsAddingTrainer(true);
      try {
          await addTrainer({ name: newTrainerName, email: newTrainerEmail, phone: newTrainerPhone, password: newTrainerPassword });
          await loadSystemData(dbSpreadsheetId);
          setShowAddTrainer(false);
          setNewTrainerName('');
          setNewTrainerEmail('');
          setNewTrainerPhone('');
          setNewTrainerPassword('');
      } catch (err: any) {
          alert('Error adding trainer: ' + err.message);
      } finally {
          setIsAddingTrainer(false);
      }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!dbSpreadsheetId || !newClientName || !newClientTrainer) return;
      if (newClientPhone && !isPhoneUnique(newClientPhone.trim())) {
          alert('This mobile number is already registered.');
          return;
      }
      setIsAddingClient(true);
      try {
          await addClient({ name: newClientName, trainerEmail: newClientTrainer, secondaryTrainerEmail: newClientSecondaryTrainer, phone: newClientPhone, dob: newClientDob, height: newClientHeight, password: newClientPassword});
          await loadSystemData(dbSpreadsheetId);
          setShowAddClient(false);
          setNewClientName('');
          setNewClientTrainer('');
          setNewClientSecondaryTrainer('');
          setNewClientPassword('');
          setNewClientPhone('');
          setNewClientDob('');
          setNewClientHeight('');
      } catch (err: any) {
          alert('Error adding client: ' + err.message);
      } finally {
          setIsAddingClient(false);
      }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newExerciseName || !newExerciseGroup) return;
      setIsAddingExercise(true);
      try {
          await addExerciseRecord({ name: newExerciseName, group: newExerciseGroup });
          await loadSystemData();
          setShowAddExercise(false);
          setNewExerciseName('');
          setNewExerciseGroup('');
      } catch (err: any) {
          alert('Error adding exercise: ' + err.message);
      } finally {
          setIsAddingExercise(false);
      }
  };

  const handleDeleteExercise = async (e: React.MouseEvent, id?: string) => {
      e.stopPropagation();
      if (!id) return;
      try {
          await deleteExerciseRecord(id);
          setExercises(prev => prev.filter(ex => ex.id !== id));
          setConfirmDeleteId(null);
      } catch (err: any) {
          alert(err.message);
      }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, group: string, groupExercises: typeof exercises) => {
      e.stopPropagation();
      try {
          for (const ex of groupExercises) {
             if (ex.id) await deleteExerciseRecord(ex.id);
          }
          setExercises(prev => prev.filter(ex => ex.group !== group));
          setConfirmDeleteGroup(null);
      } catch (err: any) {
          alert('Delete error: ' + err.message);
      }
  };

  const handleDeleteTrainer = async (e: React.MouseEvent, email: string) => { 
      e.stopPropagation(); 
      try { 
          await deleteTrainerRecord(email); 
          setTrainers(prev => prev.filter(t => t.email !== email)); 
          if (selectedTrainer?.email === email) { 
              setSelectedTrainer(null); 
              setTrainerClients([]); 
          } 
          setConfirmDeleteTrainer(null);
      } catch (err: any) { 
          alert(err.message); 
      } 
  }; 

  const handleDeleteClient = async (e: React.MouseEvent, name: string, trainerEmail: string) => { 
      e.stopPropagation(); 
      try { 
          await deleteClientRecord(name, trainerEmail); 
          setClients(prev => prev.filter(c => !(c.name === name && c.trainerEmail === trainerEmail))); 
          if (selectedTrainer?.email === trainerEmail) { 
              setTrainerClients(prev => prev.filter(c => c.name !== name)); 
          } 
          if (selectedClient?.name === name) { 
              setSelectedClient(null); 
          } 
          setConfirmDeleteClient(null);
      } catch (err: any) { 
          alert(err.message); 
      } 
  };

  const handleEditTrainerSave = async (e: React.MouseEvent | React.FormEvent, email: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (editTrainerPhone && !isPhoneUnique(editTrainerPhone.trim(), email)) {
          alert('This mobile number is already registered.');
          return;
      }
      try {
          await updateTrainer(email, { name: editTrainerName, phone: editTrainerPhone, password: editTrainerPassword });
          setEditingTrainerEmail(null);
          await loadSystemData(dbSpreadsheetId);
      } catch (err: any) {
          alert('Error updating: ' + err.message);
      }
  };

  const handleEditClientSave = async (e: React.MouseEvent | React.FormEvent, name: string, oldTrainerEmail: string) => {
      e.stopPropagation();
      e.preventDefault();
      if (editClientPhone && !isPhoneUnique(editClientPhone.trim(), undefined, name)) {
          alert('This mobile number is already registered.');
          return;
      }
      try {
          if (editClientTrainerEmail !== oldTrainerEmail) {
             // trainer changed, we need to delete the old document and create a new one
             await deleteClientRecord(name, oldTrainerEmail);
             await addClient({ name, trainerEmail: editClientTrainerEmail, secondaryTrainerEmail: editClientSecondaryTrainerEmail, phone: editClientPhone, dob: editClientDob, height: editClientHeight, password: editClientPassword });
          } else {
             // trainer is same, just update
             await updateClient(name, editClientTrainerEmail, { secondaryTrainerEmail: editClientSecondaryTrainerEmail, phone: editClientPhone, dob: editClientDob, height: editClientHeight, password: editClientPassword });
          }
          setEditingClientKey(null);
          await loadSystemData(dbSpreadsheetId);
      } catch (err: any) {
          alert('Error updating: ' + err.message);
      }
  };

  const loadTrainerData = async (trainer: TrackedTrainer) => {
    setIsLoadingData(true);
    setSelectedTrainer(trainer);
    setSelectedClient(null);
    setTrainerClients(clients.filter(c => c.trainerEmail === trainer.email || c.secondaryTrainerEmail === trainer.email));
    setActiveTab('overview');
    setIsLoadingData(false);
  };

  const loadClientData = async (client: ClientProfile) => {
    setSelectedClient(client);
  };

  if (!isAuthenticated) {
    return (
      <MobileNativeLayout onBack={onBack}>
        <div className="flex flex-col items-center justify-center mt-12 mb-10">
          <img src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" alt="Company Logo" className="w-32 h-32 object-contain mb-8 origin-center" />
          <h2 className="text-2xl font-bold tracking-tight mb-2">Admin Portal</h2>
          <p className="text-[#8e8e93] text-center text-sm max-w-[250px]">System administration access.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
              Incorrect password. Please try again.
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Password</label>
            <div className="relative">
              <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8e8e93]" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#1C1C1E] border border-transparent rounded-2xl pl-12 pr-4 py-4 text-white outline-none focus:border-[#FF3B30] focus:bg-[#2C2C2E] transition-all tracking-widest font-mono"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full mt-6 bg-[#FF3B30] text-white font-bold py-4 flex justify-center items-center rounded-2xl transition-transform active:scale-95 shadow-[0_8px_24px_rgba(255,59,48,0.3)]"
          >
            Authenticate
          </button>
        </form>
      </MobileNativeLayout>
    );
  }

  // Inside selected trainer view
  if (selectedTrainer) {
    return (
      <MobileNativeLayout
        title={selectedTrainer.name}
        subtitle="Trainer Overview"
        onBack={() => {setSelectedTrainer(null); setSelectedClient(null);}}
      >
        <div className="pb-20 space-y-4">
          <div className="flex items-center gap-2 mb-6 text-[#8e8e93]">
            <Dumbbell className="w-4 h-4" />
            <span className="text-sm">Assigned Clients ({trainerClients.length})</span>
          </div>

          {!selectedClient ? (
             <div className="space-y-3">
               {trainerClients.length === 0 ? (
                 <div className="text-center text-[#8e8e93] bg-[#1C1C1E] p-8 rounded-3xl border border-white/5">No clients assigned to this trainer yet.</div>
               ) : (
                 trainerClients.map((c, i) => (
                   <button
                     key={i}
                     onClick={() => loadClientData(c)}
                     className="w-full bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex flex-col gap-2 hover:bg-[#2C2C2E] transition-colors text-left"
                   >
                      <div className="text-white font-semibold text-lg">{c.name}</div>
                      <div className="text-[#007AFF] text-xs">View Logs & Metrics &rarr;</div>
                   </button>
                 ))
               )}
             </div>
          ) : (
             <div className="space-y-4">
               <button onClick={() => setSelectedClient(null)} className="text-[#007AFF] text-sm font-medium mb-2">&larr; Back to Clients</button>
               {isLoadingData ? (
                 <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
               ) : (
                 <div className="space-y-6">
                   <LoggerForm 
                     clientName={selectedClient.name}
                     exercises={exercises}
                     onLogAdded={(log) => setClientLogs(p => [log, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
                   />
                   <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden p-2">
                     <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
                   </div>
                 </div>
               )}
             </div>
          )}
        </div>
      </MobileNativeLayout>
    );
  }

  if (selectedClient && !selectedTrainer) {
    return (
      <MobileNativeLayout
        title={selectedClient.name}
        subtitle="Client Overview"
        onBack={() => setSelectedClient(null)}
      >
        <div className="pb-20 space-y-6">
           {isLoadingData ? (
             <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" /></div>
           ) : (
             <>
               <LoggerForm 
                 clientName={selectedClient.name}
                 exercises={exercises}
                 onLogAdded={(log) => setClientLogs(p => [log, ...p].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()))}
               />
               <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden p-2">
                 <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
               </div>
             </>
           )}
        </div>
      </MobileNativeLayout>
    );
  }

  return (
    <MobileNativeLayout
      title="Admin Portal"
      subtitle="System Overview"
      onRefresh={() => loadSystemData(dbSpreadsheetId)}
      onLogout={() => { localStorage.removeItem('protrainer_session'); setIsAuthenticated(false); onBack(); }}
      bottomNav={
        <>
          <MobileTabItem icon={<Dumbbell />} label="Trainers" isActive={activeTab === 'trainers'} onClick={() => setActiveTab('trainers')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Users />} label="Clients" isActive={activeTab === 'clients'} onClick={() => setActiveTab('clients')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Activity />} label="Exercises" isActive={activeTab === 'exercises'} onClick={() => setActiveTab('exercises')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Star />} label="Reviews" isActive={activeTab === 'reviews'} onClick={() => setActiveTab('reviews')} activeColor="text-yellow-500" />
          <MobileTabItem icon={<Trophy />} label="Ranking" isActive={activeTab === 'leaderboard'} onClick={() => setActiveTab('leaderboard')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Bell />} label="Alerts" isActive={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} activeColor="text-[#FF3B30]" />
        </>
      }
    >
      {!dbSpreadsheetId ? (
         <div className="flex flex-col items-center justify-center py-12 px-4 text-center pb-20">
           <div className="w-20 h-20 bg-[#1C1C1E] rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Database className="w-10 h-10 text-[#FF3B30]" />
           </div>
           <h3 className="text-xl font-bold text-white mb-2">Initialize Database</h3>
           <p className="text-sm text-[#8e8e93] mb-8 max-w-[250px]">Create the master Firebase collection for all system data.</p>
           
           <button 
             onClick={() => handleConnectOrGenerateDB()}
             disabled={isAddingDB}
             className="w-full max-w-sm bg-[#FF3B30] text-white font-bold py-4 rounded-xl flex justify-center items-center disabled:opacity-50"
           >
              {isAddingDB ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Database'}
           </button>
         </div>
      ) : activeTab === 'trainers' ? (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center bg-[#1C1C1E] p-4 rounded-2xl border border-white/5">
            <div>
              <div className="text-white font-bold">{trainers.length} Trainers</div>
              <div className="text-[#8e8e93] text-xs">Active in system</div>
            </div>
            <button onClick={() => setShowAddTrainer(!showAddTrainer)} className="bg-[#FF3B30]/20 text-[#FF3B30] p-2 rounded-xl">
              {showAddTrainer ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          {showAddTrainer && (
             <form onSubmit={handleAddTrainer} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">New Trainer</h4>
                <input type="text" placeholder="Name" value={newTrainerName} onChange={e => setNewTrainerName(e.target.value.replace(/[0-9]/g, ''))} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <input type="email" placeholder="Email" value={newTrainerEmail} onChange={e => setNewTrainerEmail(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <input type="tel" placeholder="Mobile Number (Unique Identity)" value={newTrainerPhone} onChange={e => setNewTrainerPhone(e.target.value.replace(/[^0-9]/g, ''))} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <input type="password" placeholder="Password (Optional)" value={newTrainerPassword} onChange={e => setNewTrainerPassword(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <button type="submit" disabled={isAddingTrainer} className="w-full bg-[#FF3B30] text-white font-bold py-3 rounded-xl flex justify-center items-center mt-2 disabled:opacity-50">
                  {isAddingTrainer ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Add Trainer'}
                </button>
             </form>
          )}

          <div className="space-y-3">
             {trainers.map((t, idx) => (
                <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
                  {editingTrainerEmail === t.email ? (
                     <div className="space-y-4 bg-[#0A0A0C] p-4 rounded-xl border border-white/10">
                        <div className="flex justify-between items-center bg-transparent border-none">
                            <h4 className="text-white text-sm font-bold uppercase tracking-wider">Edit Trainer Profile</h4>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Trainer Name</label>
                          <input type="text" placeholder="Name" value={editTrainerName} onChange={e => setEditTrainerName(e.target.value.replace(/[0-9]/g, ''))} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#FF3B30] outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Mobile No.</label>
                          <input type="tel" placeholder="Mobile Number" value={editTrainerPhone} onChange={e => setEditTrainerPhone(e.target.value.replace(/[^0-9]/g, ''))} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#FF3B30] outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Account Password</label>
                          <input type="text" placeholder="Leave blank to keep current" value={editTrainerPassword} onChange={e => setEditTrainerPassword(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#FF3B30] outline-none" />
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                          <button onClick={() => setEditingTrainerEmail(null)} className="px-4 py-2 border border-[#8e8e93]/30 text-[#8e8e93] text-sm font-bold rounded-lg hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                          <button onClick={(e) => handleEditTrainerSave(e, t.email)} className="px-4 py-2 bg-[#FF3B30] text-white text-sm font-bold rounded-lg hover:bg-[#FF3B30]/90 transition-colors shadow-sm">Save Changes</button>
                        </div>
                     </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start cursor-pointer" onClick={() => loadTrainerData(t)}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#FF3B30]/20 text-[#FF3B30] flex items-center justify-center font-bold text-lg">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-bold">{t.name}</div>
                            <div className="text-[#8e8e93] text-xs">{t.email}</div>
                          </div>
                        </div>
                        <Activity className="w-5 h-5 text-[#8e8e93]" />
                      </div>
                      <div className="flex flex-wrap justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                        <button onClick={(e) => { e.stopPropagation(); setEditingTrainerEmail(t.email); setEditTrainerName(t.name); setEditTrainerPhone(t.phone || ''); setEditTrainerPassword(''); }} className="p-2 text-[#8e8e93] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                        {confirmDeleteTrainer === t.email ? (
                          <div className="flex gap-2 items-center">
                            <span className="text-[#8e8e93] text-xs font-bold">Sure?</span>
                            <button onClick={(e) => handleDeleteTrainer(e, t.email)} className="px-3 py-1 bg-[#FF3B30] text-white text-xs font-bold rounded-lg hover:bg-[#FF3B30]/90 transition-colors">Yes</button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTrainer(null); }} className="px-3 py-1 bg-[#1C1C1E] text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-colors">No</button>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteTrainer(t.email); }} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </>
                  )}
                </div>
             ))}
             {trainers.length === 0 && !showAddTrainer && (
               <div className="text-center py-12 text-[#8e8e93] text-sm">No trainers added.</div>
             )}
          </div>
        </div>
      ) : activeTab === 'clients' ? (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center bg-[#1C1C1E] p-4 rounded-2xl border border-white/5">
            <div>
              <div className="text-white font-bold">{clients.length} Clients</div>
              <div className="text-[#8e8e93] text-xs">Across all trainers</div>
            </div>
            <button onClick={() => setShowAddClient(!showAddClient)} className="bg-[#007AFF]/20 text-[#007AFF] p-2 rounded-xl">
              {showAddClient ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>

          {showAddClient && (
             <form onSubmit={handleCreateClient} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">New Client Profile</h4>
                <input type="text" placeholder="Name" value={newClientName} onChange={e => setNewClientName(e.target.value.replace(/[0-9]/g, ''))} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                <select value={newClientTrainer} onChange={e => setNewClientTrainer(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]">
                  <option value="" disabled>Assign Primary Trainer...</option>
                  {trainers.map(t => <option key={t.email} value={t.email}>{t.name} ({t.email})</option>)}
                </select>
                <select value={newClientSecondaryTrainer} onChange={e => setNewClientSecondaryTrainer(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]">
                  <option value="">No Secondary Trainer</option>
                  {trainers.map(t => <option key={t.email} value={t.email}>{t.name} ({t.email})</option>)}
                </select>
                <input type="tel" placeholder="Mobile Number (Unique Identity)" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value.replace(/[^0-9]/g, ''))} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                <input 
   type="date" 
   placeholder="DOB" 
   value={newClientDob} 
   onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }} 
   onChange={e => setNewClientDob(e.target.value)} 
   className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" 
/>
                <input type="text" placeholder="Height" value={newClientHeight} onChange={e => setNewClientHeight(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                <input type="password" placeholder="Password (Optional)" value={newClientPassword} onChange={e => setNewClientPassword(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                
                <button type="submit" disabled={isAddingClient} className="w-full bg-[#007AFF] text-white font-bold py-3 rounded-xl flex justify-center items-center mt-2 disabled:opacity-50">
                  {isAddingClient ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Add Client'}
                </button>
             </form>
          )}

          <div className="space-y-3">
             {clients.map((c, idx) => {
               const assignedTrainer = trainers.find(t => t.email === c.trainerEmail);
               const secondaryTrainer = trainers.find(t => t.email === c.secondaryTrainerEmail);
               const cKey = `${c.name}_${c.trainerEmail}`;
               return (
               <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
                 {editingClientKey === cKey ? (
                    <div className="space-y-4 bg-[#0A0A0C] p-4 rounded-xl border border-white/10">
                       <div className="flex justify-between items-center">
                           <h4 className="text-white text-sm font-bold uppercase tracking-wider">Edit Client Profile</h4>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Primary Trainer</label>
                           <select value={editClientTrainerEmail} onChange={e => setEditClientTrainerEmail(e.target.value)} required className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-3 text-white focus:border-[#007AFF] outline-none">
                             {trainers.map(t => <option key={t.email} value={t.email}>{t.name}</option>)}
                           </select>
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Secondary Trainer</label>
                           <select value={editClientSecondaryTrainerEmail} onChange={e => setEditClientSecondaryTrainerEmail(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-3 text-white focus:border-[#007AFF] outline-none">
                             <option value="">None</option>
                             {trainers.map(t => <option key={t.email} value={t.email}>{t.name}</option>)}
                           </select>
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Mobile No.</label>
                           <input type="tel" placeholder="Mobile Number" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value.replace(/[^0-9]/g, ''))} required className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Date of Birth</label>
                           <input type="date" value={editClientDob} onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }} onChange={e => setEditClientDob(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" />
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Height</label>
                           <input type="text" placeholder="Height" value={editClientHeight} onChange={e => setEditClientHeight(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Account Password</label>
                           <input type="text" placeholder="Leave blank to keep" value={editClientPassword} onChange={e => setEditClientPassword(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                       </div>
                       <div className="flex gap-2 justify-end mt-2">
                         <button onClick={() => setEditingClientKey(null)} className="px-4 py-2 border border-[#8e8e93]/30 text-[#8e8e93] text-sm font-bold rounded-lg hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                         <button onClick={(e) => handleEditClientSave(e, c.name, c.trainerEmail)} className="px-4 py-2 bg-[#007AFF] text-white text-sm font-bold rounded-lg hover:bg-[#007AFF]/90 transition-colors shadow-sm">Save Changes</button>
                       </div>
                    </div>
                 ) : (
                   <>
                     <div>
                       <div className="text-white font-bold text-lg">{c.name}</div>
                       <div className="text-[#8e8e93] text-xs font-medium mt-1 uppercase">
                         Trainer: <span className="text-[#007AFF]">{assignedTrainer ? assignedTrainer.name : c.trainerEmail}</span>
                         {c.secondaryTrainerEmail && (
                           <span className="ml-1">
                             / <span className="text-[#007AFF]">{secondaryTrainer ? secondaryTrainer.name : c.secondaryTrainerEmail}</span>
                           </span>
                         )}
                       </div>
                     </div>
                     <div className="flex flex-wrap items-center justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                       <button onClick={(e) => {
                         e.stopPropagation();
                         localStorage.setItem('protrainer_session', JSON.stringify({ role: 'client', user: { name: c.name, trainerEmail: c.trainerEmail } }));
                         window.location.reload();
                       }} className="px-3 py-1 bg-[#34C759]/20 text-[#34C759] text-xs font-bold rounded-lg hover:bg-[#34C759]/30 transition-colors mr-auto">Login As</button>
                       <button onClick={(e) => { e.stopPropagation(); loadClientData(c); }} className="px-3 py-1 bg-[#007AFF]/20 text-[#007AFF] text-xs font-bold rounded-lg hover:bg-[#007AFF]/30 transition-colors">View Logs</button>
                       <button onClick={(e) => { e.stopPropagation(); setEditingClientKey(cKey); setEditClientTrainerEmail(c.trainerEmail); setEditClientSecondaryTrainerEmail(c.secondaryTrainerEmail || ''); setEditClientPhone(c.phone || ''); setEditClientDob(c.dob || ''); setEditClientHeight(c.height || ''); setEditClientPassword(c.password || ''); }} className="p-2 text-[#8e8e93] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                       {confirmDeleteClient === cKey ? (
                         <div className="flex gap-2 items-center">
                           <span className="text-[#8e8e93] text-xs font-bold">Sure?</span>
                           <button onClick={(e) => handleDeleteClient(e, c.name, c.trainerEmail)} className="px-3 py-1 bg-[#FF3B30] text-white text-xs font-bold rounded-lg hover:bg-[#FF3B30]/90 transition-colors">Yes</button>
                           <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClient(null); }} className="px-3 py-1 bg-[#1C1C1E] text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-colors">No</button>
                         </div>
                       ) : (
                         <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteClient(cKey); }} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
                       )}
                     </div>
                   </>
                 )}
               </div>
             )})}
             {clients.length === 0 && !showAddClient && (
               <div className="text-center py-12 text-[#8e8e93] text-sm">No clients added.</div>
             )}
          </div>
        </div>
      ) : activeTab === 'exercises' ? (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center bg-[#1C1C1E] p-4 rounded-2xl border border-white/5">
            <div>
              <div className="text-white font-bold">{exercises.length} Exercises</div>
              <div className="text-[#8e8e93] text-xs">Global dictionary</div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const content = "Name,Group\nBench Press,Chest\nSquat,Legs\nDeadlift,Back\nBicep Curl,Arms";
                  const blob = new Blob([content], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'sample_exercises.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-white/10 text-white p-2 rounded-xl text-xs font-bold px-3 hover:bg-white/20 transition-colors"
              >
                Sample CSV
              </button>
              <label className="bg-[#34C759]/20 text-[#34C759] p-2 rounded-xl cursor-pointer hover:bg-[#34C759]/30 transition-colors flex items-center justify-center">
                <span className="text-xs font-bold px-2">Upload CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const text = await file.text();
                  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                  let added = 0;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (i === 0 && line.toLowerCase().includes('name')) continue; // Skip header
                    const parts = line.split(',');
                    const name = parts[0]?.trim();
                    const group = parts[1]?.trim() || "Uncategorized";
                    if (name) {
                       await addExerciseRecord({ name, group });
                       added++;
                    }
                  }
                  if (added > 0) {
                    const eData = await fetchExercises();
                    setExercises(eData || []);
                    alert(`Successfully imported ${added} exercises.`);
                  }
                  e.target.value = '';
                }} />
              </label>
              <button onClick={() => setShowAddExercise(!showAddExercise)} className="bg-[#FF3B30]/20 text-[#FF3B30] p-2 rounded-xl hover:bg-[#FF3B30]/30 transition-colors">
                {showAddExercise ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {showAddExercise && (
             <form onSubmit={handleAddExercise} className="bg-[#1C1C1E] p-4 rounded-2xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2">New Exercise</h4>
                <input type="text" placeholder="Exercise Name (e.g. Bench Press)" value={newExerciseName} onChange={e => setNewExerciseName(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <input type="text" placeholder="Muscle Group (e.g. Chest)" value={newExerciseGroup} onChange={e => setNewExerciseGroup(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <button type="submit" disabled={isAddingExercise} className="w-full bg-[#FF3B30] text-white font-bold py-3 rounded-xl flex justify-center items-center mt-2 disabled:opacity-50">
                  {isAddingExercise ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Add Exercise'}
                </button>
             </form>
          )}

          <div className="space-y-3">
             {Object.entries(exercises.reduce((groups, ex) => {
               if (!groups[ex.group]) groups[ex.group] = [];
               groups[ex.group].push(ex);
               return groups;
             }, {} as Record<string, typeof exercises>)).map(([group, exs]) => (
               <div key={group} className="bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5">
                 <div className="bg-[#0A0A0C] px-4 py-3 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-[#8e8e93] text-xs font-bold uppercase tracking-wider">{group}</h3>
                    {confirmDeleteGroup === group ? (
                      <div className="flex gap-2 items-center">
                        <span className="text-[#8e8e93] text-[10px] uppercase font-bold">Sure?</span>
                        <button onClick={(e) => handleDeleteGroup(e, group, exs)} className="px-2 py-1 bg-[#FF3B30] text-white text-[10px] uppercase font-bold rounded-lg hover:bg-[#FF3B30]/90 transition-colors">Yes</button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup(null); }} className="px-2 py-1 bg-[#1C1C1E] text-white text-[10px] uppercase font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-colors">No</button>
                      </div>
                    ) : (
                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteGroup(group); }} className="text-[#8e8e93] hover:text-[#FF3B30] text-[10px] font-bold uppercase tracking-wider transition-colors py-1 px-2 border border-transparent hover:border-[#FF3B30]/30 rounded-lg">Delete Group</button>
                    )}
                 </div>
                 <div className="divide-y divide-white/5">
                   {(exs as typeof exercises).map((ex, idx) => (
                     <div key={idx} className="flex justify-between items-center p-4">
                       <span className="text-white text-sm font-medium">{ex.name}</span>
                       {ex.id && (
                         confirmDeleteId === ex.id ? (
                           <div className="flex gap-2 items-center">
                             <span className="text-[#8e8e93] text-xs font-bold">Sure?</span>
                             <button onClick={(e) => handleDeleteExercise(e, ex.id)} className="px-3 py-1 bg-[#FF3B30] text-white text-xs font-bold rounded-lg hover:bg-[#FF3B30]/90 transition-colors">Yes</button>
                             <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-3 py-1 bg-[#1C1C1E] text-white text-xs font-bold rounded-lg border border-white/10 hover:bg-white/5 transition-colors">No</button>
                           </div>
                         ) : (
                           <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(ex.id!); }} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
                         )
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             ))}
             {exercises.length === 0 && !showAddExercise && (
               <div className="text-center py-12 text-[#8e8e93] text-sm">No exercises added.</div>
             )}
          </div>
        </div>
      ) : activeTab === 'reviews' ? (
        <div className="space-y-6 pb-20">
          <div className="flex justify-between items-center mt-2 mb-4">
             <h3 className="text-white font-bold text-xl px-1">Global Reviews</h3>
             <span className="text-[#FF3B30] font-bold bg-[#FF3B30]/10 px-3 py-1 rounded-full text-xs">All Trainers</span>
          </div>
          
          <div className="space-y-4">
             {allReviews.length === 0 ? (
                <div className="text-center py-12 text-[#8e8e93] text-sm bg-[#1C1C1E] rounded-3xl border border-white/5">No client reviews submitted yet.</div>
             ) : (
                allReviews.map((rev, idx) => {
                  const tInfo = trainers.find(t => t.email === rev.trainerEmail);
                  return (
                    <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-5 border border-white/5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-white font-bold text-lg">{rev.clientName}</div>
                          <div className="text-[#8e8e93] text-xs font-semibold uppercase mt-0.5">Trainer: <span className="text-[#007AFF]">{tInfo?.name || rev.trainerEmail}</span></div>
                        </div>
                        <div className="flex items-center gap-1 bg-[#34C759]/10 px-3 py-1 flex-col rounded-xl">
                          <span className="text-2xl font-bold text-[#34C759] leading-none mb-1 mt-1">{rev.rating}</span>
                          <span className="text-[10px] text-[#34C759] uppercase font-bold tracking-wider mb-1">Overall</span>
                        </div>
                      </div>
                      <p className="text-sm text-white/90 italic pt-2 pb-1">"{rev.feedbackText}"</p>
                      <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3 mt-1">
                        <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-[11px] font-medium uppercase tracking-wider">Punctuality</span><span className="text-white font-bold text-xs">{rev.punctuality}/5</span></div>
                        <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-[11px] font-medium uppercase tracking-wider">Professionalism</span><span className="text-white font-bold text-xs">{rev.professionalism}/5</span></div>
                        <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-[11px] font-medium uppercase tracking-wider">Knowledge</span><span className="text-white font-bold text-xs">{rev.knowledge}/5</span></div>
                        <div className="flex justify-between items-center"><span className="text-[#8e8e93] text-[11px] font-medium uppercase tracking-wider">Communication</span><span className="text-white font-bold text-xs">{rev.communication}/5</span></div>
                      </div>
                    </div>
                  );
                })
             )}
          </div>
        </div>
      ) : activeTab === 'leaderboard' ? (
        <LeaderboardView logs={allLogs} clients={clients} trainers={trainers} currentRole="admin" />
      ) : activeTab === 'notifications' ? (
        <div className="space-y-6 pb-20">
          <div className="flex flex-col mb-4">
             <h3 className="text-white font-bold text-xl px-1">Send Alert</h3>
             <p className="text-[#8e8e93] text-sm px-1 mt-1">Push notifications to users.</p>
          </div>
          
          <form onSubmit={handleSendNotification} className="bg-[#1C1C1E] p-5 rounded-2xl border border-white/5 space-y-4">
            <div>
              <label className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2 block">Target Audience</label>
              <div className="grid grid-cols-3 gap-2">
                 <button type="button" onClick={() => setNotifRole('client')} className={`py-2 rounded-xl text-sm font-semibold transition-colors ${notifRole === 'client' ? 'bg-[#FF3B30] text-white' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>Clients</button>
                 <button type="button" onClick={() => setNotifRole('trainer')} className={`py-2 rounded-xl text-sm font-semibold transition-colors ${notifRole === 'trainer' ? 'bg-[#FF3B30] text-white' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>Trainers</button>
                 <button type="button" onClick={() => setNotifRole('both')} className={`py-2 rounded-xl text-sm font-semibold transition-colors ${notifRole === 'both' ? 'bg-[#FF3B30] text-white' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>Both</button>
              </div>
            </div>
            
            <div>
              <label className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2 block">Notification Title</label>
              <input type="text" placeholder="E.g., System Maintenance" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
            </div>

            <div>
              <label className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider mb-2 block">Message Body</label>
              <textarea placeholder="Write message here..." value={notifBody} onChange={e => setNotifBody(e.target.value)} required rows={4} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30] resize-none" />
            </div>

            <button type="submit" disabled={isSendingNotif} className="w-full bg-[#FF3B30] text-white font-bold py-3 rounded-xl flex justify-center items-center mt-2 disabled:opacity-50">
               {isSendingNotif ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Notification'}
            </button>
            
            {notifSuccess && (
              <div className="flex items-center justify-center gap-2 text-[#34C759] text-sm font-semibold mt-4">
                 <Check className="w-4 h-4" /> Delivered successfully
              </div>
            )}
          </form>
        </div>
      ) : null}
    </MobileNativeLayout>
  );
}
