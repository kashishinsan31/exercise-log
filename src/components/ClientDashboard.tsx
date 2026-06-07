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
import { ExerciseLog, BodyMeasurement } from "../lib/db";
import { Dumbbell, Activity, CalendarDays, TrendingUp, Scale, Flame } from "lucide-react";

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
}

export function ClientDashboard({ clientName, logs, measurements = [] }: ClientDashboardProps) {
  const [selectedExerciseFilter, setSelectedExerciseFilter] = useState<string>("");

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
    const specificExerciseByWeek: Record<string, number> = {};

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
      }
      
      if (log.date && log.exercise === selectedExerciseFilter) {
         try {
           const weekStart = format(startOfWeek(parseISO(log.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
           specificExerciseByWeek[weekStart] = (specificExerciseByWeek[weekStart] || 0) + volume;
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
      
    const specificExerciseData = Object.keys(specificExerciseByWeek).map((weekStart) => ({
      date: format(parseISO(weekStart), "MMM d"),
      volume: specificExerciseByWeek[weekStart],
      rawDate: parseISO(weekStart).getTime(),
    })).sort((a, b) => a.rawDate - b.rawDate);

    const measurementData = measurements.filter((m) => {
        try { return isAfter(parseISO(m.date), thirtyDaysAgo); } catch (e) { return true; }
    }).map((m) => ({
      date: format(parseISO(m.date), "MMM d"),
      weight: parseFloat(m.weight) || 0,
      rawDate: parseISO(m.date).getTime()
    })).sort((a, b) => a.rawDate - b.rawDate);

    return { totalExercises, totalVolume, pieData, exerciseBarData, recentVolumeData, measurementData, specificExerciseData, uniqueExercises };
  }, [logs, measurements, selectedExerciseFilter]);

  return (
    <div className="w-full space-y-6">
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

    </div>
  );
}
