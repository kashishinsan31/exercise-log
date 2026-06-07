import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Plus, Users, Dumbbell, Activity, LineChart as LineChartIcon, Loader2, Database, Link as LinkIcon, UserPlus, Trash2, Edit2, X, Check } from 'lucide-react';
import { fetchAllClients, fetchAllTrainers, fetchClientLogs, fetchClientMeasurements, ClientProfile, ExerciseLog, BodyMeasurement, initializeDatabase, addTrainer, addClient, deleteTrainerRecord, deleteClientRecord, updateTrainer, updateClient } from '../lib/db';
import { ClientDashboard } from './ClientDashboard';

interface TrackedTrainer {
  id: string;
  name: string;
  email: string;
}

export function AdminApp({ onBack }: { onBack: () => void }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trainers' | 'clients'>('overview');

  // Dash State
  const [dbSpreadsheetId, setDbSpreadsheetId] = useState<string>('');
  const [trainers, setTrainers] = useState<TrackedTrainer[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  
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
    const stored = localStorage.getItem('protrainer_db');
    if (stored) {
       setDbSpreadsheetId(stored);
       loadSystemData();
    } else {
       setDbInputMode('url');
    }
  }, []);

  const loadSystemData = async (spreadsheetId?: string) => {
      try {
          const tData = await fetchAllTrainers();
          const cData = await fetchAllClients();
          setTrainers(tData || []);
          setClients(cData || []);
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
    setActiveTab('trainers');
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
      <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <div className="bg-slate-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Admin Access</h1>
          <p className="text-[13px] text-slate-500 mb-8">Enter the administration password to continue.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password"
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-slate-400 focus:bg-white text-center tracking-widest font-mono"
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-xs font-medium">Incorrect password. Please try again.</p>
            )}
            
            <button 
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-slate-900 rounded-lg px-4 py-3 text-white hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm"
            >
              Sign In
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors mt-4 block mx-auto"
            >
              Back to Role Selection
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 font-sans text-slate-900 overflow-hidden flex-col">
       <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-8 flex items-center justify-between shrink-0 shadow-sm relative z-10">
          <div className="flex items-center space-x-3">
             <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
               <Shield className="w-4 h-4 text-white" />
             </div>
             <h2 className="text-lg font-bold text-white flex items-center">
               Admin Portal 
               {selectedTrainer && (
                 <span className="text-slate-400 font-medium text-sm ml-2 hidden sm:inline">
                   / {selectedTrainer.name} Focus
                 </span>
               )}
             </h2>
          </div>
          <div className="flex items-center gap-4">
             {selectedTrainer && (
                <button 
                  onClick={() => {setSelectedTrainer(null); setSelectedClient(null);}}
                  className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Back to Directory
                </button>
             )}
             <button 
                onClick={onBack}
                className="flex items-center gap-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-md px-3 py-1.5 transition-colors"
             >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
             </button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex">
          
          {/* Main Content Area */}
          {!selectedTrainer ? (
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800">System Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage all connected trainers and clients system-wide.</p>
                  </div>
                </div>

                 {!dbSpreadsheetId ? (
                   <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center items-center text-center max-w-xl mx-auto mt-12">
                     <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Database className="w-8 h-8" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mb-2">Initialize System Database</h3>
                     <p className="text-sm text-slate-500 mb-8 max-w-md">Initialize the Firestore database to begin adding trainers and clients.</p>
                     
                     <div className="w-full space-y-4">
                           <button 
                             onClick={() => handleConnectOrGenerateDB()}
                             disabled={isAddingDB}
                             className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 flex justify-center items-center rounded-xl transition-colors disabled:opacity-50 text-sm shadow-md"
                           >
                              {isAddingDB ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Default Admin Database'}
                           </button>
                     </div>
                   </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Trainers Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                       <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between z-10 shrink-0">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <Shield className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 tracking-wider">TRAINERS</h3>
                              <p className="text-[10px] text-slate-500 font-medium">{trainers.length} active trainers</p>
                            </div>
                         </div>
                         <button onClick={() => setShowAddTrainer(true)} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-2 rounded-lg transition-colors border border-indigo-100">
                           <UserPlus className="w-4 h-4" />
                         </button>
                       </div>
                       
                       {showAddTrainer && (
                         <form onSubmit={handleAddTrainer} className="p-4 bg-indigo-50/50 border-b border-indigo-100 flex flex-col gap-3 shrink-0">
                            <div className="flex justify-between items-center">
                               <h4 className="text-xs font-bold text-indigo-800 tracking-wider">NEW TRAINER ACCOUNT</h4>
                               <button type="button" onClick={() => setShowAddTrainer(false)} className="text-indigo-400 hover:text-indigo-600">×</button>
                            </div>
                            <div className="space-y-2">
                              <input type="text" placeholder="Trainer Name" value={newTrainerName} onChange={e => setNewTrainerName(e.target.value)} required className="w-full bg-white border border-indigo-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                              <input type="email" placeholder="Email Address (Login ID)" value={newTrainerEmail} onChange={e => setNewTrainerEmail(e.target.value)} required className="w-full bg-white border border-indigo-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                              <input type="password" placeholder="Password (Optional)" value={newTrainerPassword} onChange={e => setNewTrainerPassword(e.target.value)} className="w-full bg-white border border-indigo-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm" />
                            </div>
                            <button type="submit" disabled={isAddingTrainer} className="w-full bg-indigo-600 text-white text-xs px-4 py-2 rounded-md font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm">
                               {isAddingTrainer ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Create Trainer'}
                            </button>
                         </form>
                       )}

                       <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
                          <div className="space-y-1">
                             {trainers.map((t, idx) => (
                               <div 
                                 key={idx}
                                 onClick={() => { if (editingTrainerEmail !== t.email) loadTrainerData(t); }}
                                 className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white bg-transparent transition-colors text-left border border-transparent hover:border-slate-200 shadow-sm hover:shadow cursor-pointer"
                               >
                                 {editingTrainerEmail === t.email ? (
                                    <div className="flex-1 right-0 flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                                      <div className="flex-1 space-y-2">
                                        <input type="text" placeholder="Name" value={editTrainerName} onChange={e => setEditTrainerName(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                        <input type="password" placeholder="New Password" value={editTrainerPassword} onChange={e => setEditTrainerPassword(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={(e) => handleEditTrainerSave(e, t.email)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4"/></button>
                                        <button onClick={() => setEditingTrainerEmail(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
                                      </div>
                                    </div>
                                 ) : (
                                   <>
                                     <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm">
                                         {t.name.charAt(0).toUpperCase()}
                                       </div>
                                       <div className="flex-1 overflow-hidden">
                                         <p className="text-sm font-bold text-slate-800 truncate">{t.name}</p>
                                         <p className="text-xs text-slate-500 truncate">{t.email}</p>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2 shrink-0">
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setEditingTrainerEmail(t.email);
                                           setEditTrainerName(t.name);
                                           setEditTrainerPassword('');
                                         }}
                                         className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                         title="Edit Trainer"
                                       >
                                         <Edit2 className="w-4 h-4" />
                                       </button>
                                       <button
                                         onClick={(e) => handleDeleteTrainer(e, t.email)}
                                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                         title="Delete Trainer"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                       <Activity className="w-4 h-4 text-indigo-300" />
                                     </div>
                                   </>
                                 )}
                               </div>
                             ))}
                             {trainers.length === 0 && !showAddTrainer && (
                               <div className="text-center py-12 text-slate-400 text-xs font-bold">No trainers added yet.</div>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* Clients Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
                       <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between z-10 shrink-0">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <Users className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-slate-800 tracking-wider">CLIENTS</h3>
                              <p className="text-[10px] text-slate-500 font-medium">{clients.length} registered clients</p>
                            </div>
                         </div>
                         <button onClick={() => setShowAddClient(true)} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 p-2 rounded-lg transition-colors border border-emerald-100">
                           <UserPlus className="w-4 h-4" />
                         </button>
                       </div>
                       
                       {showAddClient && (
                         <form onSubmit={handleCreateClient} className="p-4 bg-emerald-50/50 border-b border-emerald-100 flex flex-col gap-3 shrink-0">
                            <div className="flex justify-between items-center">
                               <h4 className="text-xs font-bold text-emerald-800 tracking-wider">NEW CLIENT PROFILE</h4>
                               <button type="button" onClick={() => setShowAddClient(false)} className="text-emerald-400 hover:text-emerald-600">×</button>
                            </div>
                            <div className="space-y-2">
                              <input type="text" placeholder="Client Name" value={newClientName} onChange={e => setNewClientName(e.target.value)} required className="w-full bg-white border border-emerald-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                              <select value={newClientTrainer} onChange={e => setNewClientTrainer(e.target.value)} required className="w-full bg-white border border-emerald-200 text-xs font-medium text-slate-700 rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm">
                                <option value="" disabled>Assign to Trainer...</option>
                                {trainers.map(t => <option key={t.email} value={t.email}>{t.name} ({t.email})</option>)}
                              </select>
                              <input type="text" placeholder="Mobile Number" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} className="w-full bg-white border border-emerald-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                              <input type="date" placeholder="Date of Birth" value={newClientDob} onChange={e => setNewClientDob(e.target.value)} className="w-full bg-white border border-emerald-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                              <input type="text" placeholder="Height" value={newClientHeight} onChange={e => setNewClientHeight(e.target.value)} className="w-full bg-white border border-emerald-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                              <input type="password" placeholder="Client Login Password (Optional)" value={newClientPassword} onChange={e => setNewClientPassword(e.target.value)} className="w-full bg-white border border-emerald-200 text-xs rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm" />
                            </div>
                            <button type="submit" disabled={isAddingClient} className="w-full bg-emerald-600 text-white text-xs px-4 py-2 rounded-md font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center shadow-sm">
                               {isAddingClient ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Create Client'}
                            </button>
                         </form>
                       )}

                       <div className="flex-1 overflow-y-auto p-2 bg-slate-50/50">
                          <div className="space-y-1">
                             {clients.map((c, idx) => {
                               const assignedTrainer = trainers.find(t => t.email === c.trainerEmail);
                               const cKey = `${c.name}_${c.trainerEmail}`;
                               return (
                               <div key={idx} className="w-full flex items-center justify-between p-3 rounded-xl bg-transparent border border-transparent shadow-sm">
                                 {editingClientKey === cKey ? (
                                    <div className="flex-1 right-0 flex gap-2 items-center" onClick={e => e.stopPropagation()}>
                                      <div className="flex-1 space-y-1">
                                        <input type="text" placeholder="Phone" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                        <input type="date" placeholder="DOB" value={editClientDob} onChange={e => setEditClientDob(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                        <input type="text" placeholder="Height" value={editClientHeight} onChange={e => setEditClientHeight(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                        <input type="password" placeholder="New Password" value={editClientPassword} onChange={e => setEditClientPassword(e.target.value)} className="w-full text-xs px-2 py-1 border rounded" />
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <button onClick={(e) => handleEditClientSave(e, c.name, c.trainerEmail)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="w-4 h-4"/></button>
                                        <button onClick={() => setEditingClientKey(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4"/></button>
                                      </div>
                                    </div>
                                 ) : (
                                   <>
                                     <div className="flex items-center gap-3">
                                       <div className="flex-1 overflow-hidden">
                                         <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                                         <p className="text-[10px] text-slate-500 truncate font-bold uppercase mt-0.5">Assigned to: {assignedTrainer ? assignedTrainer.name : c.trainerEmail}</p>
                                       </div>
                                     </div>
                                     <div className="flex items-center gap-2 shrink-0">
                                       <button
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setEditingClientKey(cKey);
                                           setEditClientPhone(c.phone || '');
                                           setEditClientDob(c.dob || '');
                                           setEditClientHeight(c.height || '');
                                           setEditClientPassword('');
                                         }}
                                         className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                         title="Edit Client"
                                       >
                                         <Edit2 className="w-4 h-4" />
                                       </button>
                                       <button
                                         onClick={(e) => handleDeleteClient(e, c.name, c.trainerEmail)}
                                         className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                         title="Delete Client"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     </div>
                                   </>
                                 )}
                               </div>
                             )})}
                             {clients.length === 0 && !showAddClient && (
                               <div className="text-center py-12 text-slate-400 text-xs font-bold">No clients added yet.</div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex overflow-hidden">
               {/* Left Sidebar: Clients */}
               <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between z-10">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clients</h3>
                    <span className="text-xs font-bold text-slate-400">{trainerClients.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {isLoadingData && !selectedClient ? (
                      <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                    ) : (
                      trainerClients.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => loadClientData(c)}
                          className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors mb-1 ${selectedClient?.name === c.name ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          {c.name}
                        </button>
                      ))
                    )}
                  </div>
               </div>

               {/* Right Area: View */}
               <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                 {!selectedClient ? (
                   <div className="h-full flex flex-col items-center justify-center text-center">
                     <LineChartIcon className="w-16 h-16 text-slate-200 mb-4" />
                     <h2 className="text-xl font-bold text-slate-700">Audit Dashboard</h2>
                     <p className="text-sm text-slate-500 max-w-md mt-2">Select a client from the sidebar to deeply analyze training logs, volume metrics, and body measurement trends securely.</p>
                   </div>
                 ) : isLoadingData ? (
                   <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                 ) : (
                   <div className="max-w-6xl mx-auto pb-20">
                     <div className="mb-6">
                        <h2 className="text-2xl font-bold text-slate-800">{selectedClient.name} Analytic Report</h2>
                        <p className="text-sm text-slate-500 mt-1">Cross-analyzing workout volume and body measurement trends.</p>
                     </div>
                     
                     <ClientDashboard clientName={selectedClient.name} logs={clientLogs} measurements={clientMeasurements} />
                   </div>
                 )}
               </div>
            </div>
          )}

        </main>
    </div>
  );
}
