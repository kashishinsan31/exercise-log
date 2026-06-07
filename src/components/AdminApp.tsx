import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Plus, Users, Dumbbell, Activity, LineChart as LineChartIcon, Loader2, Database, Link as LinkIcon, UserPlus, Trash2, Edit2, X, Check, Search, Menu } from 'lucide-react';
import { fetchAllClients, fetchAllTrainers, fetchClientLogs, fetchClientMeasurements, fetchExercises, addExerciseRecord, deleteExerciseRecord, ClientProfile, ExerciseLog, BodyMeasurement, initializeDatabase, addTrainer, addClient, deleteTrainerRecord, deleteClientRecord, updateTrainer, updateClient } from '../lib/db';
import { ClientDashboard } from './ClientDashboard';
import { MobileNativeLayout, MobileTabItem } from './MobileNativeLayout';

interface TrackedTrainer {
  id: string;
  name: string;
  email: string;
}

interface ExerciseItem {
  id?: string;
  name: string;
  group: string;
}

export function AdminApp({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'trainers' | 'clients' | 'exercises' | 'overview'>('trainers');

  // Dash State
  const [dbSpreadsheetId, setDbSpreadsheetId] = useState<string>('');
  const [trainers, setTrainers] = useState<TrackedTrainer[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  
  const [isAddingDB, setIsAddingDB] = useState(false);
  const [addDBError, setAddDBError] = useState('');
  const [dbInputMode, setDbInputMode] = useState<'url' | 'none'>('none');
  const [dbUrl, setDbUrl] = useState('');

  // Add Trainer State
  const [showAddTrainer, setShowAddTrainer] = useState(false);
  const [newTrainerName, setNewTrainerName] = useState('');
  const [newTrainerEmail, setNewTrainerEmail] = useState('');
  const [newTrainerPassword, setNewTrainerPassword] = useState('');
  const [isAddingTrainer, setIsAddingTrainer] = useState(false);
  
  // Add Client State
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTrainer, setNewClientTrainer] = useState('');
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
  const [editTrainerPassword, setEditTrainerPassword] = useState('');

  // Edit Client State
  const [editingClientKey, setEditingClientKey] = useState<string | null>(null);
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
    } else {
      setError(true);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = localStorage.getItem('protrainer_db');
    if (stored) {
       setDbSpreadsheetId(stored);
       loadSystemData();
    } else {
       setDbInputMode('url');
    }
  }, [isAuthenticated]);

  const loadSystemData = async (spreadsheetId?: string) => {
      try {
          const tData = await fetchAllTrainers();
          const cData = await fetchAllClients();
          const eData = await fetchExercises();
          setTrainers(tData || []);
          setClients(cData || []);
          setExercises(eData || []);
          setAddDBError('');
      } catch (err: any) {
         console.error('Failed to load system data:', err);
         setAddDBError(err.message || 'Failed to connect to database.');
      }
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

  const handleAddTrainer = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newTrainerName || !newTrainerEmail) return;
      setIsAddingTrainer(true);
      try {
          await addTrainer({ name: newTrainerName, email: newTrainerEmail, password: newTrainerPassword });
          await loadSystemData(dbSpreadsheetId);
          setShowAddTrainer(false);
          setNewTrainerName('');
          setNewTrainerEmail('');
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
      setIsAddingClient(true);
      try {
          await addClient({ name: newClientName, trainerEmail: newClientTrainer, phone: newClientPhone, dob: newClientDob, height: newClientHeight, password: newClientPassword});
          await loadSystemData(dbSpreadsheetId);
          setShowAddClient(false);
          setNewClientName('');
          setNewClientTrainer('');
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
      if (!confirm('Are you sure you want to delete this exercise?')) return;
      try {
          await deleteExerciseRecord(id);
          setExercises(prev => prev.filter(ex => ex.id !== id));
      } catch (err: any) {
          alert(err.message);
      }
  };

  const handleDeleteTrainer = async (e: React.MouseEvent, email: string) => { e.stopPropagation(); if (!confirm('Are you sure you want to delete trainer ' + email + '?')) return; try { await deleteTrainerRecord(email); setTrainers(prev => prev.filter(t => t.email !== email)); if (selectedTrainer?.email === email) { setSelectedTrainer(null); setTrainerClients([]); } } catch (err: any) { alert(err.message); } }; 

  const handleDeleteClient = async (e: React.MouseEvent, name: string, trainerEmail: string) => { e.stopPropagation(); if (!confirm('Are you sure you want to delete client ' + name + '?')) return; try { await deleteClientRecord(name, trainerEmail); setClients(prev => prev.filter(c => !(c.name === name && c.trainerEmail === trainerEmail))); if (selectedTrainer?.email === trainerEmail) { setTrainerClients(prev => prev.filter(c => c.name !== name)); } if (selectedClient?.name === name) { setSelectedClient(null); } } catch (err: any) { alert(err.message); } }; 

  const handleEditTrainerSave = async (e: React.MouseEvent | React.FormEvent, email: string) => {
      e.stopPropagation();
      e.preventDefault();
      try {
          await updateTrainer(email, { name: editTrainerName, password: editTrainerPassword });
          setEditingTrainerEmail(null);
          await loadSystemData(dbSpreadsheetId);
      } catch (err: any) {
          alert('Error updating: ' + err.message);
      }
  };

  const handleEditClientSave = async (e: React.MouseEvent | React.FormEvent, name: string, trainerEmail: string) => {
      e.stopPropagation();
      e.preventDefault();
      try {
          await updateClient(name, trainerEmail, { phone: editClientPhone, dob: editClientDob, height: editClientHeight, password: editClientPassword });
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
    setTrainerClients(clients.filter(c => c.trainerEmail === trainer.email));
    setActiveTab('overview');
    setIsLoadingData(false);
  };

  const loadClientData = async (client: ClientProfile) => {
    setIsLoadingData(true);
    setSelectedClient(client);
    try {
      const logs = await fetchClientLogs(client.name);
      const measurements = await fetchClientMeasurements(client.name);
      setClientLogs(logs);
      setClientMeasurements(measurements);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingData(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <MobileNativeLayout onBack={onBack} title="Admin Login">
        <div className="flex flex-col items-center justify-center mt-8 mb-12">
          <div className="w-20 h-20 bg-[#1C1C1E] rounded-[2rem] flex items-center justify-center mb-6 shadow-[0_8px_32px_rgba(255,59,48,0.2)]">
            <Shield className="w-10 h-10 text-[#FF3B30]" />
          </div>
          <p className="text-[#8e8e93] text-center max-w-[250px]">System administration access.</p>
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
                 <div className="bg-[#1C1C1E] rounded-3xl overflow-hidden p-2">
                   <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
                 </div>
               )}
             </div>
          )}
        </div>
      </MobileNativeLayout>
    );
  }

  return (
    <MobileNativeLayout
      title="Admin Portal"
      subtitle="System Overview"
      onBack={() => setIsAuthenticated(false)}
      bottomNav={
        <>
          <MobileTabItem icon={<Dumbbell />} label="Trainers" isActive={activeTab === 'trainers'} onClick={() => setActiveTab('trainers')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Users />} label="Clients" isActive={activeTab === 'clients'} onClick={() => setActiveTab('clients')} activeColor="text-[#FF3B30]" />
          <MobileTabItem icon={<Activity />} label="Exercises" isActive={activeTab === 'exercises'} onClick={() => setActiveTab('exercises')} activeColor="text-[#FF3B30]" />
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
                <input type="text" placeholder="Name" value={newTrainerName} onChange={e => setNewTrainerName(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
                <input type="email" placeholder="Email" value={newTrainerEmail} onChange={e => setNewTrainerEmail(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#FF3B30]" />
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
                          <input type="text" placeholder="Name" value={editTrainerName} onChange={e => setEditTrainerName(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#FF3B30] outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Account Password</label>
                          <input type="password" placeholder="Leave blank to keep current" value={editTrainerPassword} onChange={e => setEditTrainerPassword(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#FF3B30] outline-none" />
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
                      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                        <button onClick={(e) => { e.stopPropagation(); setEditingTrainerEmail(t.email); setEditTrainerName(t.name); setEditTrainerPassword(''); }} className="p-2 text-[#8e8e93] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={(e) => handleDeleteTrainer(e, t.email)} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
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
                <input type="text" placeholder="Name" value={newClientName} onChange={e => setNewClientName(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                <select value={newClientTrainer} onChange={e => setNewClientTrainer(e.target.value)} required className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]">
                  <option value="" disabled>Assign to Trainer...</option>
                  {trainers.map(t => <option key={t.email} value={t.email}>{t.name} ({t.email})</option>)}
                </select>
                <input type="text" placeholder="Phone" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
                <input type="date" placeholder="DOB" value={newClientDob} onChange={e => setNewClientDob(e.target.value)} className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-[#007AFF]" />
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
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Phone</label>
                           <input type="text" placeholder="Phone" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Date of Birth</label>
                           <input type="date" value={editClientDob} onChange={e => setEditClientDob(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                       </div>
                       <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Height</label>
                           <input type="text" placeholder="Height" value={editClientHeight} onChange={e => setEditClientHeight(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
                         </div>
                         <div className="space-y-1">
                           <label className="text-[10px] text-[#8e8e93] font-bold uppercase ml-1">Account Password</label>
                           <input type="password" placeholder="Leave blank to keep" value={editClientPassword} onChange={e => setEditClientPassword(e.target.value)} className="w-full text-sm bg-[#1C1C1E] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#007AFF] outline-none" />
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
                       <div className="text-[#8e8e93] text-xs font-medium mt-1 uppercase">Trainer: <span className="text-[#007AFF]">{assignedTrainer ? assignedTrainer.name : c.trainerEmail}</span></div>
                     </div>
                     <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-white/5">
                       <button onClick={(e) => { e.stopPropagation(); setEditingClientKey(cKey); setEditClientPhone(c.phone || ''); setEditClientDob(c.dob || ''); setEditClientHeight(c.height || ''); setEditClientPassword(''); }} className="p-2 text-[#8e8e93] hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={(e) => handleDeleteClient(e, c.name, c.trainerEmail)} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
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
            <button onClick={() => setShowAddExercise(!showAddExercise)} className="bg-[#FF3B30]/20 text-[#FF3B30] p-2 rounded-xl">
              {showAddExercise ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
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
                 <div className="bg-[#0A0A0C] px-4 py-3 border-b border-white/5">
                    <h3 className="text-[#8e8e93] text-xs font-bold uppercase tracking-wider">{group}</h3>
                 </div>
                 <div className="divide-y divide-white/5">
                   {exs.map((ex, idx) => (
                     <div key={idx} className="flex justify-between items-center p-4">
                       <span className="text-white text-sm font-medium">{ex.name}</span>
                       {ex.id && (
                         <button onClick={(e) => handleDeleteExercise(e, ex.id)} className="p-2 text-[#8e8e93] hover:text-[#FF3B30] transition-colors"><Trash2 className="w-4 h-4" /></button>
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
      ) : null}
    </MobileNativeLayout>
  );
}
