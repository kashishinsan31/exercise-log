import React, { useState } from 'react';
import { doLogin, fetchClientLogs, fetchClientMeasurements, appendMeasurement, deleteMeasurement, ExerciseLog, BodyMeasurement, ClientProfile, addTrainerReview, updateClient, fetchAllLogs, fetchAllClients, fetchAllTrainers, TrackedTrainer, fetchTrainerReviews, TrainerReview } from '../lib/db';
import { Loader2, Dumbbell, Lock, FileText, Activity, User, PlusCircle, Trash2, Star, Settings, Trophy } from 'lucide-react';
import { ClientDashboard } from './ClientDashboard';
import { MobileNativeLayout, MobileTabItem } from './MobileNativeLayout';
import { LeaderboardView } from './LeaderboardView';

export function ClientApp({ onBack, onSwitchRole }: { onBack: () => void, onSwitchRole?: (role: any) => void }) {
  const getGreetingTime = () => {
    const currentHour = new Date().getHours();
    if (currentHour < 12) return 'Good Morning';
    if (currentHour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

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
  const [currentView, setCurrentView] = useState<'dashboard' | 'logs' | 'measurements' | 'trainer' | 'leaderboard' | 'settings'>('dashboard');

  const [globalClients, setGlobalClients] = useState<ClientProfile[]>([]);
  const [globalTrainers, setGlobalTrainers] = useState<TrackedTrainer[]>([]);
  const [globalLogs, setGlobalLogs] = useState<ExerciseLog[]>([]);
  const [trainerReviews, setTrainerReviews] = useState<TrainerReview[]>([]);

  // Review state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewPunctuality, setReviewPunctuality] = useState(5);
  const [reviewProfessionalism, setReviewProfessionalism] = useState(5);
  const [reviewKnowledge, setReviewKnowledge] = useState(5);
  const [reviewCommunication, setReviewCommunication] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settingsTab, setSettingsTab] = useState<'password' | 'review'>('password');

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClient || !currentPassword || !newPassword || !confirmPassword) return;
      if (newPassword !== confirmPassword) {
          setErrorMsg('New passwords do not match.');
          return;
      }
      setIsChangingPassword(true);
      setErrorMsg('');
      setPasswordSuccess('');
      try {
          await doLogin(selectedClient.name, currentPassword, 'client');
          await updateClient(selectedClient.name, selectedClient.trainerEmail, { password: newPassword });
          setPasswordSuccess('Password updated successfully.');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err: any) {
          setErrorMsg('Current password is incorrect or failed to update.');
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedClient) return;
      setIsSubmittingReview(true);
      setErrorMsg('');
      setReviewSuccess('');
      try {
          await addTrainerReview({
              clientName: selectedClient.name,
              trainerEmail: selectedClient.trainerEmail,
              date: new Date().toISOString(),
              rating: reviewRating,
              punctuality: reviewPunctuality,
              professionalism: reviewProfessionalism,
              knowledge: reviewKnowledge,
              communication: reviewCommunication,
              feedbackText: reviewText
          });
          setReviewSuccess('Review submitted successfully! Thank you.');
          setReviewText('');
      } catch (err: any) {
          setErrorMsg('Failed to submit review.');
      } finally {
          setIsSubmittingReview(false);
      }
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('protrainer_session');
    if (saved) {
      try {
        const { role, user } = JSON.parse(saved);
        if (role === 'client' && user) {
          setSelectedClient(user);
          fetchClientData(user);
          setStep('dashboard');
        }
      } catch (e) {}
    }
  }, []);

  const fetchClientData = async (user: {name: string, trainerEmail?: string}) => {
    try {
      const logs = await fetchClientLogs(user.name); 
      const measurements = await fetchClientMeasurements(user.name); 
      const dataPayload = { logs, measurements };
      setClientLogs(dataPayload.logs || []);
      setClientMeasurements(dataPayload.measurements || []);

      const allC = await fetchAllClients();
      setGlobalClients(allC);
      const allT = await fetchAllTrainers();
      setGlobalTrainers(allT);
      const allL = await fetchAllLogs();
      setGlobalLogs(allL);

      if (user.trainerEmail) {
         const revs = await fetchTrainerReviews(user.trainerEmail);
         setTrainerReviews(revs || []);
      }

      setStep('dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch client data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMeasurement = async (m: BodyMeasurement) => {
      if (!m.id) return;
      if (!confirm('Are you sure you want to delete this measurement?')) return;
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
      const data = await doLogin(email.trim(), password, 'client');
      setSelectedClient(data.user);
      localStorage.setItem('protrainer_session', JSON.stringify({ role: 'client', user: data.user }));
      await fetchClientData(data.user);
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
        subtitle={getGreetingTime()}
        onLogout={() => { localStorage.removeItem('protrainer_session'); setStep('login'); setEmail(''); setPassword(''); onBack(); }}
        bottomNav={
          <>
            <MobileTabItem icon={<Activity />} label="Home" isActive={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
            <MobileTabItem icon={<FileText />} label="Logs" isActive={currentView === 'logs'} onClick={() => setCurrentView('logs')} />
            <MobileTabItem icon={<PlusCircle />} label="Stats" isActive={currentView === 'measurements'} onClick={() => setCurrentView('measurements')} />
            <MobileTabItem icon={<Trophy />} label="Ranking" isActive={currentView === 'leaderboard'} onClick={() => setCurrentView('leaderboard')} />
            <MobileTabItem icon={<Settings />} label="Settings" isActive={currentView === 'settings'} onClick={() => setCurrentView('settings')} />
          </>
        }
      >
        {currentView === 'dashboard' && (
          <ClientDashboard 
            clientName={selectedClient.name} 
            logs={clientLogs} 
            measurements={clientMeasurements}
            trainer={globalTrainers.find(t => t.email === selectedClient.trainerEmail)}
            trainerReviews={trainerReviews}
          />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView logs={globalLogs} clients={globalClients} trainers={globalTrainers} currentRole="client" />
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
          <>
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
          
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4 mt-8">Body Metrics History</h3>
            {clientMeasurements.length === 0 ? (
               <div className="text-center text-[#8e8e93] bg-[#1C1C1E] p-8 rounded-3xl border border-white/5">No measurements logged.</div>
            ) : (
               clientMeasurements.map((m, idx) => (
                <div key={idx} className="bg-[#1C1C1E] rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#8e8e93] text-xs font-semibold uppercase">{new Date(m.date).toLocaleDateString()}</span>
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
          </>
        )}

        {currentView === 'settings' && (
          <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5 pb-24 space-y-6">
            <div className="flex gap-2">
              <button onClick={() => setSettingsTab('password')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${settingsTab === 'password' ? 'bg-[#34C759] text-black' : 'bg-white/5 text-[#8e8e93] hover:text-white'}`}>Password</button>
              <button onClick={() => setSettingsTab('review')} className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${settingsTab === 'review' ? 'bg-[#34C759] text-black' : 'bg-white/5 text-[#8e8e93] hover:text-white'}`}>Review</button>
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
                        className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#34C759] transition-all"
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
                        className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#34C759] transition-all"
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
                        className="w-full bg-[#0A0A0C] border border-transparent text-white text-sm rounded-2xl px-4 py-4 outline-none focus:border-[#34C759] transition-all"
                      />
                   </div>

                   <button 
                     type="submit" 
                     disabled={isChangingPassword}
                     className="w-full mt-6 bg-gradient-to-tr from-[#34C759] to-[#30b551] text-black font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-lg"
                   >
                     {isChangingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Password'}
                   </button>
                </form>
              </div>
            )}
            
            {settingsTab === 'review' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-lg font-bold text-white mb-2">Leave a Review</h3>
                <p className="text-[#8e8e93] text-sm mb-6">Rate your experience with your trainer.</p>

                <form onSubmit={handleReviewSubmit} className="space-y-6">
                   {errorMsg && (
                     <div className="p-3 bg-red-500/20 text-[#FF3B30] rounded-xl text-sm font-medium">
                       {errorMsg}
                     </div>
                   )}
                   {reviewSuccess && (
                     <div className="p-3 bg-green-500/20 text-[#34C759] rounded-xl text-sm font-medium">
                       {reviewSuccess}
                     </div>
                   )}

                   {[
                     { label: 'Overall Rating', val: reviewRating, set: setReviewRating },
                     { label: 'Punctuality', val: reviewPunctuality, set: setReviewPunctuality },
                     { label: 'Professionalism', val: reviewProfessionalism, set: setReviewProfessionalism },
                     { label: 'Knowledge & Expertise', val: reviewKnowledge, set: setReviewKnowledge },
                     { label: 'Communication', val: reviewCommunication, set: setReviewCommunication },
                   ].map((metric) => (
                     <div key={metric.label}>
                       <div className="flex justify-between items-end mb-2">
                          <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider">{metric.label}</label>
                          <span className="text-[#34C759] font-bold text-sm">{metric.val}/5</span>
                       </div>
                       <input type="range" min="1" max="5" value={metric.val} onChange={(e) => metric.set(parseInt(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#34C759]" />
                       <div className="flex justify-between text-[10px] text-[#8e8e93] mt-1 px-1 mt-1">
                          <span>Poor</span><span>Excellent</span>
                       </div>
                     </div>
                   ))}

                   <div>
                     <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-2 ml-1">Detail written feedback</label>
                     <textarea 
                       value={reviewText}
                       onChange={e => setReviewText(e.target.value)}
                       required
                       className="w-full bg-[#0A0A0C] border border-white/10 text-white text-sm rounded-2xl px-4 py-3 outline-none focus:border-[#34C759] min-h-[120px] resize-none"
                       placeholder="How was your session? What did you like? What can be improved?"
                     />
                   </div>

                   <button 
                     type="submit" 
                     disabled={isSubmittingReview}
                     className="w-full mt-2 bg-white text-black font-bold py-4 rounded-xl transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center shadow-lg"
                   >
                     {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Review'}
                   </button>
                </form>
              </div>
            )}
          </div>
        )}
      </MobileNativeLayout>
    );
  }

  // Login
  return (
    <MobileNativeLayout>
      <div className="flex flex-col items-center justify-center mt-12 mb-10">
        <img src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" alt="Company Logo" className="w-32 h-32 object-contain mb-8 origin-center" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">Welcome Back</h2>
        <p className="text-[#8e8e93] text-center text-sm max-w-[250px]">Sign in to access your workout metrics.</p>
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
