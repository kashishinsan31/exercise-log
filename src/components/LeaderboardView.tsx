import React, { useMemo, useState } from 'react';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';
import { ClientProfile, ExerciseLog, TrackedTrainer } from '../lib/db';
import { startOfMonth, parseISO, format, isAfter, startOfWeek } from 'date-fns';

interface LeaderboardProps {
  logs: ExerciseLog[];
  clients: ClientProfile[];
  trainers: TrackedTrainer[];
  currentRole: 'client' | 'trainer' | 'admin';
  loggedInUserEmail?: string;
}

export function LeaderboardView({ logs, clients, trainers, currentRole, loggedInUserEmail }: LeaderboardProps) {
  const [timeFilter, setTimeFilter] = useState<'month' | 'week'>('month');
  const [viewType, setViewType] = useState<'overall' | 'trainers' | 'myClients'>('overall');

  const stats = useMemo(() => {
    const now = new Date();
    const startDate = timeFilter === 'month' 
      ? startOfMonth(now) 
      : startOfWeek(now, { weekStartsOn: 1 });
    startDate.setHours(0, 0, 0, 0);
      
    let validLogs = logs.filter(l => {
      if (!l || !l.date) return false;
      try {
        const parsed = parseISO(l.date);
        if (isNaN(parsed.getTime())) return false;
        return parsed.getTime() >= startDate.getTime();
      } catch (e) {
        return false;
      }
    });

    const clientVolumes: Record<string, number> = {};
    const trainerVolumes: Record<string, number> = {};
    const trainerClients: Record<string, Record<string, number>> = {};

    validLogs.forEach(log => {
      const volume = (Number(log.sets) || 0) * (Number(log.reps) || 0) * (Number(log.weight) || 0);
      if (volume > 0 && log.clientName) {
        const nameKey = log.clientName.trim().toLowerCase();
        clientVolumes[nameKey] = (clientVolumes[nameKey] || 0) + volume;
      }
    });

    // Map clients to trainers
    clients.forEach(c => {
      if (!c || !c.name) return;
      const cleanName = c.name.trim();
      const matchKey = cleanName.toLowerCase();
      const vol = clientVolumes[matchKey] || 0;
      if (c.trainerEmail) {
        const cleanEmail = c.trainerEmail.trim().toLowerCase();
        trainerVolumes[cleanEmail] = (trainerVolumes[cleanEmail] || 0) + vol;
        
        if (!trainerClients[cleanEmail]) trainerClients[cleanEmail] = {};
        trainerClients[cleanEmail][cleanName] = (trainerClients[cleanEmail][cleanName] || 0) + vol;
      }
    });

    // Match registered clients first
    const mappedClientNames = new Set(clients.map(c => c.name.trim().toLowerCase()));
    const clientsList = clients.map(c => {
      const matchKey = c.name.trim().toLowerCase();
      const vol = clientVolumes[matchKey] || 0;
      return { name: c.name, volume: vol };
    });

    // Fallback for logged names not found in registered client list
    Object.entries(clientVolumes).forEach(([nameKey, vol]) => {
      if (!mappedClientNames.has(nameKey)) {
        // Find if we have original casing in any log
        const originalLog = validLogs.find(l => l.clientName.trim().toLowerCase() === nameKey);
        const originalName = originalLog ? originalLog.clientName.trim() : nameKey;
        clientsList.push({ name: originalName, volume: vol });
      }
    });

    const overallClients = clientsList
      .filter(c => c.volume > 0)
      .sort((a, b) => b.volume - a.volume);

    const overallTrainers = Object.entries(trainerVolumes)
      .map(([email, volume]) => {
        const t = trainers?.find(tr => tr?.email?.trim().toLowerCase() === email);
        return { name: t?.name || email, email, volume };
      })
      .sort((a, b) => b.volume - a.volume);

    const topClientsByTrainer = Object.entries(trainerClients)
      .map(([email, cVols]) => {
        const topClient = Object.entries(cVols).sort((a, b) => b[1] - a[1])[0];
        const t = trainers?.find(tr => tr?.email?.trim().toLowerCase() === email);
        return {
          trainerName: t?.name || email,
          topClientName: topClient?.[0] || 'N/A',
          topClientVolume: topClient?.[1] || 0
        };
      })
      .sort((a, b) => b.topClientVolume - a.topClientVolume);
      
    const myClientsList = clientsList
      .filter(item => {
        const matchKey = item.name.trim().toLowerCase();
        const client = clients.find(c => c?.name?.trim().toLowerCase() === matchKey);
        return client?.trainerEmail?.trim().toLowerCase() === loggedInUserEmail?.trim().toLowerCase();
      })
      .sort((a, b) => b.volume - a.volume);

    return { overallClients, overallTrainers, topClientsByTrainer, myClientsList };
  }, [logs, clients, trainers, timeFilter, loggedInUserEmail]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col mb-4">
        <h3 className="text-white font-bold text-xl px-1">Leaderboards</h3>
        <p className="text-[#8e8e93] text-sm px-1 mt-1">Automatic progress reports & rankings.</p>
      </div>

      <div className="bg-[#1C1C1E] p-1 rounded-full flex w-fit border border-white/5 gap-1 shadow-inner">
         <button 
           onClick={() => setTimeFilter('month')} 
           className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${timeFilter === 'month' ? 'bg-white/10 text-white shadow-md' : 'text-[#8e8e93] hover:text-white bg-transparent'}`}
         >
           This Month
         </button>
         <button 
           onClick={() => setTimeFilter('week')} 
           className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${timeFilter === 'week' ? 'bg-white/10 text-white shadow-md' : 'text-[#8e8e93] hover:text-white bg-transparent'}`}
         >
           This Week
         </button>
      </div>

      {currentRole !== 'client' && (
        <div className="bg-[#1C1C1E] p-1 rounded-2xl flex w-full border border-white/5 gap-1">
           <button 
             onClick={() => setViewType('overall')} 
             className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${viewType === 'overall' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8e8e93] hover:text-white'}`}
           >
             Overall Leaderboard
           </button>
           {currentRole === 'trainer' && (
             <button 
               onClick={() => setViewType('myClients')} 
               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${viewType === 'myClients' ? 'bg-[#34C759] text-white shadow-md' : 'text-[#8e8e93] hover:text-white'}`}
             >
               My Clients Only
             </button>
           )}
           {currentRole === 'admin' && (
             <button 
               onClick={() => setViewType('trainers')} 
               className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${viewType === 'trainers' ? 'bg-[#007AFF] text-white shadow-md' : 'text-[#8e8e93] hover:text-white'}`}
             >
               By Trainer
             </button>
           )}
        </div>
      )}

      {viewType === 'overall' && (
        <div className="space-y-4">
          <h4 className="text-white font-bold px-1 flex items-center gap-2 mt-4"><Trophy className="w-5 h-5 text-yellow-500" /> Top Clients ({timeFilter})</h4>
          <div className="bg-[#1C1C1E] rounded-3xl p-4 border border-white/5 space-y-3">
             {stats.overallClients.length === 0 ? (
                <p className="text-[#8e8e93] text-sm text-center py-4">No data to calculate.</p>
             ) : (
                stats.overallClients.slice(0, currentRole === 'admin' ? 100 : 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-sm ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-amber-700/20 text-amber-500' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>
                        {i + 1}
                      </div>
                      <span className="font-semibold text-white text-sm capitalize">{c.name}</span>
                    </div>
                    <div className="font-mono font-bold text-sm text-[#FF3B30] whitespace-nowrap">
                       {c.volume >= 1000 ? `${(c.volume/1000).toFixed(1)}k` : c.volume} <span className="text-[10px] text-[#8e8e93]">lbs</span>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
      )}

      {viewType === 'myClients' && currentRole === 'trainer' && (
        <div className="space-y-4 mt-4">
          <h4 className="text-white font-bold px-1 flex items-center gap-2 mt-4"><Medal className="w-5 h-5 text-blue-500" /> My Top Clients ({timeFilter})</h4>
          <div className="bg-[#1C1C1E] rounded-3xl p-4 border border-white/5 space-y-3">
             {stats.myClientsList.length === 0 ? (
                <p className="text-[#8e8e93] text-sm text-center py-4">No data to calculate.</p>
             ) : (
                stats.myClientsList.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-sm ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>
                        {i + 1}
                      </div>
                      <span className="font-semibold text-white text-sm capitalize">{c.name}</span>
                    </div>
                    <div className="font-mono font-bold text-sm text-[#FF3B30] whitespace-nowrap">
                       {c.volume >= 1000 ? `${(c.volume/1000).toFixed(1)}k` : c.volume} <span className="text-[10px] text-[#8e8e93]">lbs</span>
                    </div>
                  </div>
                ))
             )}
          </div>
        </div>
      )}

      {viewType === 'trainers' && currentRole === 'admin' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-white font-bold px-1 flex items-center gap-2"><Award className="w-5 h-5 text-[#34C759]" /> Top Trainers (Total Client Volume)</h4>
            <div className="bg-[#1C1C1E] rounded-3xl p-4 border border-white/5 space-y-3">
               {stats.overallTrainers.length === 0 ? (
                  <p className="text-[#8e8e93] text-sm text-center py-4">No data to calculate.</p>
               ) : (
                  stats.overallTrainers.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-sm ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-[#0A0A0C] text-[#8e8e93]'}`}>
                          {i + 1}
                        </div>
                        <span className="font-semibold text-white text-sm capitalize">{t.name}</span>
                      </div>
                      <div className="font-mono font-bold text-sm text-[#34C759] whitespace-nowrap">
                         {t.volume >= 1000 ? `${(t.volume/1000).toFixed(1)}k` : t.volume} <span className="text-[10px] text-[#8e8e93]">lbs</span>
                      </div>
                    </div>
                  ))
               )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold px-1 flex items-center gap-2"><Medal className="w-5 h-5 text-blue-500" /> Top Client per Trainer</h4>
            <div className="bg-[#1C1C1E] rounded-3xl p-4 border border-white/5 space-y-3">
               {stats.topClientsByTrainer.length === 0 ? (
                  <p className="text-[#8e8e93] text-sm text-center py-4">No data to calculate.</p>
               ) : (
                  stats.topClientsByTrainer.map((t, i) => (
                    <div key={i} className="flex flex-col p-3 rounded-2xl bg-white/5">
                       <span className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-bold mb-1">Trainer: {t.trainerName}</span>
                       <div className="flex items-center justify-between">
                         <span className="font-semibold text-white text-sm capitalize flex items-center gap-2">
                           <Medal className="w-4 h-4 text-yellow-500" /> {t.topClientName}
                         </span>
                         <div className="font-mono font-bold text-sm text-white whitespace-nowrap">
                            {t.topClientVolume >= 1000 ? `${(t.topClientVolume/1000).toFixed(1)}k` : t.topClientVolume} <span className="text-[10px] text-[#8e8e93]">lbs</span>
                         </div>
                       </div>
                    </div>
                  ))
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
