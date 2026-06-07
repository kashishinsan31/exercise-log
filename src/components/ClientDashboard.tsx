import React, { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from "recharts";
import { format, parseISO, subDays, isAfter, startOfWeek } from "date-fns";
import { ExerciseLog, BodyMeasurement, TrainerReview, TrackedTrainer } from "../lib/db";
import { Dumbbell, Activity, CalendarDays, TrendingUp, Scale, Flame, Star, MessageSquare } from "lucide-react";

// Modern dark UI neon colors
const COLORS = [
  "#FF3B30", // Red
  "#34C759", // Green
  "#007AFF", // Blue
  "#FF9500", // Orange
  "#AF52DE", // Purple
  "#5856D6", // Indigo
];

interface ClientDashboardProps {
  clientName: string;
  logs: ExerciseLog[];
  measurements?: BodyMeasurement[];
  trainer?: TrackedTrainer;
  trainerReviews?: TrainerReview[];
}

export function ClientDashboard({ clientName, logs, measurements = [], trainer, trainerReviews = [] }: ClientDashboardProps) {
  const [selectedExerciseFilter, setSelectedExerciseFilter] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<'volume' | 'weight' | 'reps'>("volume");

  React.useEffect(() => {
    if (!selectedExerciseFilter && logs.length > 0) {
       const unique = Array.from(new Set(logs.map(l => l.exercise))).sort();
       if (unique.length > 0) setSelectedExerciseFilter(unique[0]);
    }
  }, [logs, selectedExerciseFilter]);

  const stats = useMemo(() => {
    const totalExercises = logs.length;
    let totalVolume = 0;

    const muscleGroupCount: Record<string, number> = {};
    const exercisesCount: Record<string, number> = {};
    const volumeByDate: Record<string, number> = {};
    const specificExerciseStats: Record<string, { volume: number, weight: number, reps: number }> = {};
    let currentWeekVolume = 0;
    let previousWeekVolume = 0;

    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const previousWeekStart = format(startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 }), 'yyyy-MM-dd');

    logs.forEach((log) => {
      const sets = parseInt(log.sets) || 0;
      const reps = parseInt(log.reps) || 0;
      const weight = parseFloat(log.weight) || 0;
      const volume = sets * reps * weight;
      totalVolume += volume;

      muscleGroupCount[log.muscleGroup] = (muscleGroupCount[log.muscleGroup] || 0) + 1;
      exercisesCount[log.exercise] = (exercisesCount[log.exercise] || 0) + 1;

      if (log.date) {
        volumeByDate[log.date] = (volumeByDate[log.date] || 0) + volume;
        
        try {
          const logWeekStart = format(startOfWeek(parseISO(log.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
          if (logWeekStart === currentWeekStart) currentWeekVolume += volume;
          if (logWeekStart === previousWeekStart) previousWeekVolume += volume;
        } catch (e) {}
      }
      
      if (log.date && log.exercise === selectedExerciseFilter) {
         try {
           const weekStart = format(startOfWeek(parseISO(log.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
           if (!specificExerciseStats[weekStart]) specificExerciseStats[weekStart] = { volume: 0, weight: 0, reps: 0 };
           specificExerciseStats[weekStart].volume += volume;
           specificExerciseStats[weekStart].weight = Math.max(specificExerciseStats[weekStart].weight, weight);
           specificExerciseStats[weekStart].reps = Math.max(specificExerciseStats[weekStart].reps, reps);
         } catch (e) {}
      }
    });

    const pieData = Object.keys(muscleGroupCount).map((key) => ({ name: key, value: muscleGroupCount[key] })).sort((a, b) => b.value - a.value);

    const exerciseBarData = Object.keys(exercisesCount).map((key) => ({ name: key, count: exercisesCount[key] })).sort((a, b) => b.count - a.count).slice(0, 5);
      
    const uniqueExercises = Object.keys(exercisesCount).sort();

    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentVolumeData = Object.keys(volumeByDate).filter((date) => {
        try { return isAfter(parseISO(date), thirtyDaysAgo); } catch (e) { return true; }
    }).map((date) => ({
      date: format(parseISO(date), "MMM d"),
      volume: volumeByDate[date],
      rawDate: parseISO(date).getTime(),
    })).sort((a, b) => a.rawDate - b.rawDate);
      
    const specificExerciseData = Object.keys(specificExerciseStats).map((weekStart) => ({
      date: format(parseISO(weekStart), "MMM d"),
      volume: specificExerciseStats[weekStart].volume,
      weight: specificExerciseStats[weekStart].weight,
      reps: specificExerciseStats[weekStart].reps,
      rawDate: parseISO(weekStart).getTime(),
    })).sort((a, b) => a.rawDate - b.rawDate);

    const measurementData = measurements.filter((m) => {
        try { return isAfter(parseISO(m.date), thirtyDaysAgo); } catch (e) { return true; }
    }).map((m) => ({
      date: format(parseISO(m.date), "MMM d"),
      weight: parseFloat(m.weight) || 0,
      rawDate: parseISO(m.date).getTime()
    })).sort((a, b) => a.rawDate - b.rawDate);

    return { totalExercises, totalVolume, pieData, exerciseBarData, recentVolumeData, measurementData, specificExerciseData, uniqueExercises, currentWeekVolume, previousWeekVolume };
  }, [logs, measurements, selectedExerciseFilter]);

  const volumeDiffPercent = stats.previousWeekVolume > 0 
    ? ((stats.currentWeekVolume - stats.previousWeekVolume) / stats.previousWeekVolume) * 100 
    : 0;

  return (
    <div className="w-full space-y-6">
      {/* Weekly Progress Card */}
      <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#34C759]" /> Weekly Progress
            </h3>
            <p className="text-sm text-[#8e8e93]">Volume compared to last week</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${volumeDiffPercent >= 0 ? 'bg-[#34C759]/20 text-[#34C759]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'}`}>
            {volumeDiffPercent >= 0 ? '+' : ''}{volumeDiffPercent.toFixed(1)}%
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
           <div>
             <div className="text-2xl font-bold text-white">
               {stats.currentWeekVolume > 1000 ? `${(stats.currentWeekVolume / 1000).toFixed(1)}k` : stats.currentWeekVolume}
             </div>
             <div className="text-xs text-[#8e8e93] font-semibold uppercase tracking-wider mt-1">This Week</div>
           </div>
           <div>
             <div className="text-2xl font-bold text-[#8e8e93]">
               {stats.previousWeekVolume > 1000 ? `${(stats.previousWeekVolume / 1000).toFixed(1)}k` : stats.previousWeekVolume}
             </div>
             <div className="text-xs text-[#8e8e93]/70 font-semibold uppercase tracking-wider mt-1">Last Week</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1C1C1E] rounded-3xl p-5 border border-white/5 flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-[#FF3B30]/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-[#FF3B30]" />
            </div>
          </div>
          <div>
            <div className="text-[#FF3B30] text-3xl font-bold tracking-tight">
              {stats.totalVolume > 1000 ? `${(stats.totalVolume / 1000).toFixed(1)}k` : stats.totalVolume}
            </div>
            <div className="text-[#8e8e93] text-sm font-semibold mt-1">Total Volume</div>
          </div>
        </div>

        <div className="bg-[#1C1C1E] rounded-3xl p-5 border border-white/5 flex flex-col justify-between aspect-square">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-[#007AFF]" />
            </div>
          </div>
          <div>
             <div className="text-[#007AFF] text-3xl font-bold tracking-tight">{stats.totalExercises}</div>
             <div className="text-[#8e8e93] text-sm font-semibold mt-1">Sets Logged</div>
          </div>
        </div>
      </div>

      <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-[#34C759] font-semibold text-lg flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Activity
            </h3>
            <p className="text-sm text-[#8e8e93] mt-1">Volume Last 30 Days</p>
          </div>
        </div>

        <div className="h-44 w-full">
          {stats.recentVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.recentVolumeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34C759" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#34C759" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} contentStyle={{ backgroundColor: '#000', borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: '#fff' }} />
                <Area type="monotone" dataKey="volume" stroke="#34C759" strokeWidth={3} fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#8e8e93]">No activity data</div>
          )}
        </div>
      </div>

      <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
        <div className="mb-2 text-center">
          <h3 className="text-white font-bold tracking-wide">Muscle Distribution</h3>
        </div>
        <div className="h-[200px] w-full mt-4">
          {stats.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#000', borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#8e8e93]">No data</div>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4">
          {stats.pieData.map((entry, index) => (
            <div key={entry.name} className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
              <span className="text-xs font-medium text-[#8e8e93]">{entry.name}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Weight Chart */}
      <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
        <div className="mb-6">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#007AFF]" /> Body Weight
          </h3>
        </div>

        <div className="h-[200px] w-full">
          {stats.measurementData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.measurementData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} dy={10} />
                <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#000', borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: '#fff' }} />
                <Line type="monotone" dataKey="weight" stroke="#007AFF" strokeWidth={3} dot={{ fill: '#007AFF', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-[#8e8e93]">No recent measurements</div>
          )}
        </div>
      </div>

      {/* Exercise Progress chart */}
      <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
        <div className="mb-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-2">
            <Dumbbell className="w-4 h-4 text-[#AF52DE]" /> Exercise Progress
          </h3>
          {stats.uniqueExercises.length > 0 ? (
            <div className="flex gap-2">
              <select 
                value={selectedExerciseFilter}
                onChange={(e) => setSelectedExerciseFilter(e.target.value)}
                className="bg-[#0A0A0C] border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-[#AF52DE] flex-1 min-w-0"
              >
                 {stats.uniqueExercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
              <select 
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="bg-[#0A0A0C] border border-white/10 text-white text-sm rounded-xl px-3 py-2 outline-none focus:border-[#AF52DE] w-28 shrink-0"
              >
                 <option value="volume">Volume</option>
                 <option value="weight">Max Wt</option>
                 <option value="reps">Max Reps</option>
              </select>
            </div>
          ) : (
            <p className="text-sm text-[#8e8e93]">No exercises logged yet.</p>
          )}
        </div>

        <div className="h-[200px] w-full">
          {stats.specificExerciseData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.specificExerciseData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorExercise" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AF52DE" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#AF52DE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8e8e93" }} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)' }} contentStyle={{ backgroundColor: '#000', borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", color: '#fff' }} />
                <Area type="monotone" dataKey={selectedMetric} stroke="#AF52DE" strokeWidth={3} fillOpacity={1} fill="url(#colorExercise)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {trainer && trainerReviews && trainerReviews.length > 0 && (
        <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
          <div className="mb-4">
            <h3 className="text-white font-bold text-lg flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-500" /> Trainer Reviews
            </h3>
            <p className="text-sm text-[#8e8e93]">See what clients are saying about {trainer.name}.</p>
          </div>
          <div className="space-y-4">
            {trainerReviews.map((r, i) => (
              <div key={i} className="bg-[#0A0A0C] p-4 rounded-2xl border border-white/5">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-white font-medium text-sm">{r.clientName}</span>
                  <div className="flex items-center space-x-1 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span className="text-yellow-500 text-xs font-bold">{r.rating.toFixed(1)}</span>
                  </div>
                </div>
                {r.feedbackText && <p className="text-[#8e8e93] text-sm mt-2 font-medium italic">"{r.feedbackText}"</p>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
