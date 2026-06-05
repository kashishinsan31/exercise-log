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
import { ExerciseLog, BodyMeasurement } from "../lib/sheets";
import { Dumbbell, Activity, CalendarDays, TrendingUp, Scale } from "lucide-react";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
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
    // Basic stats
    const totalExercises = logs.length;
    let totalVolume = 0;

    // Group by Muscle
    const muscleGroupCount: Record<string, number> = {};
    const exercisesCount: Record<string, number> = {};
    const volumeByDate: Record<string, number> = {};
    const specificExerciseByWeek: Record<string, number> = {};

    logs.forEach((log) => {
      // Calc volume for this log
      const sets = parseInt(log.sets) || 0;
      const reps = parseInt(log.reps) || 0;
      const weight = parseFloat(log.weight) || 0;
      const volume = sets * reps * weight;
      totalVolume += volume;

      // Muscle groups
      muscleGroupCount[log.muscleGroup] =
        (muscleGroupCount[log.muscleGroup] || 0) + 1;

      // Exercises
      exercisesCount[log.exercise] = (exercisesCount[log.exercise] || 0) + 1;

      // Volume by Date
      if (log.date) {
        volumeByDate[log.date] = (volumeByDate[log.date] || 0) + volume;
      }
      
      // Specific Exercise Volume by Week
      if (log.date && log.exercise === selectedExerciseFilter) {
         try {
           const weekStart = format(startOfWeek(parseISO(log.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
           specificExerciseByWeek[weekStart] = (specificExerciseByWeek[weekStart] || 0) + volume;
         } catch (e) {
           // Skip grouping if date is unparseable
         }
      }
    });

    const pieData = Object.keys(muscleGroupCount)
      .map((key) => ({
        name: key,
        value: muscleGroupCount[key],
      }))
      .sort((a, b) => b.value - a.value);

    const exerciseBarData = Object.keys(exercisesCount)
      .map((key) => ({
        name: key,
        count: exercisesCount[key],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
      
    const uniqueExercises = Object.keys(exercisesCount).sort();

    // Prepare Date Volume Data (last 30 days)
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentVolumeData = Object.keys(volumeByDate)
      .filter((date) => {
        try {
          return isAfter(parseISO(date), thirtyDaysAgo);
        } catch (e) {
          return true;
        }
      })
      .map((date) => ({
        date: format(parseISO(date), "MMM d"),
        volume: volumeByDate[date],
        rawDate: parseISO(date).getTime(),
      }))
      .sort((a, b) => a.rawDate - b.rawDate);
      
    // Prepare Specific Exercise Volume
    const specificExerciseData = Object.keys(specificExerciseByWeek)
      // We don't filter by last 30 days for this, to show long term progression per week
      .map((weekStart) => ({
        date: format(parseISO(weekStart), "MMM d"),
        volume: specificExerciseByWeek[weekStart],
        rawDate: parseISO(weekStart).getTime(),
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    const measurementData = measurements
      .filter((m) => {
        try {
          return isAfter(parseISO(m.date), thirtyDaysAgo);
        } catch (e) {
          return true;
        }
      })
      .map((m) => ({
        date: format(parseISO(m.date), "MMM d"),
        weight: parseFloat(m.weight) || 0,
        rawDate: parseISO(m.date).getTime()
      }))
      .sort((a, b) => a.rawDate - b.rawDate);

    return {
      totalExercises,
      totalVolume,
      pieData,
      exerciseBarData,
      recentVolumeData,
      measurementData,
      specificExerciseData,
      uniqueExercises
    };
  }, [logs, measurements, selectedExerciseFilter]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Logs
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalExercises}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Dumbbell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Total Volume
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {stats.totalVolume > 1000
                ? `${(stats.totalVolume / 1000).toFixed(1)}k`
                : stats.totalVolume}{" "}
              <span className="text-sm text-slate-400 font-medium">lbs</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Top Muscle
            </p>
            <p className="text-xl font-bold text-slate-800 line-clamp-1">
              {stats.pieData[0]?.name || "N/A"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Active Days
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {stats.recentVolumeData.length}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4 hidden md:flex">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Current Weight
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {measurements[0]?.weight || "--"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts: Volume over Time */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 tracking-wider">
              WORKOUT VOLUME OVER TIME
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Total lifted weight (Sets x Reps x Weight) in the last 30 days.
            </p>
          </div>

          <div className="h-[300px] w-full">
            {stats.recentVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.recentVolumeData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="colorVolume"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(val) =>
                      val > 1000 ? `${(val / 1000).toFixed(0)}k` : val
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#6366f1"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorVolume)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No volume data in the last 30 days
              </div>
            )}
          </div>
        </div>

        {/* Charts: Body Weight Tracking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 tracking-wider">
              BODY WEIGHT TREND
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Changes in your reported weight over time.
            </p>
          </div>

          <div className="h-[300px] w-full">
            {stats.measurementData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={stats.measurementData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Line type="monotone" dataKey="weight" stroke="#0ea5e9" strokeWidth={3} dot={{ fill: '#0ea5e9', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No recent measurements
              </div>
            )}
          </div>
        </div>

        {/* Charts: Muscle Distribution Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="mb-2 text-center">
            <h3 className="text-sm font-bold text-slate-800 tracking-wider">
              MUSCLE DISTRIBUTION
            </h3>
          </div>
          <div className="h-[240px] w-full">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No data
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {stats.pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-xs font-medium text-slate-600">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Charts: Top Exercises */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-800 tracking-wider">
              MOST REPORTED EXERCISES
            </h3>
          </div>
          <div className="h-[250px] w-full">
            {stats.exerciseBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.exerciseBarData}
                  layout="vertical"
                  margin={{ top: 0, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    width={120}
                  />
                  <Tooltip
                    cursor={{ fill: "#f8fafc" }}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "none",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No data
              </div>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-wider">
                WEEKLY EXERCISE VOLUME
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Volume progression per week for {selectedExerciseFilter || 'a selected exercise'}.
              </p>
            </div>
            {stats.uniqueExercises.length > 0 && (
              <select
                value={selectedExerciseFilter}
                onChange={(e) => setSelectedExerciseFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]"
              >
                {stats.uniqueExercises.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="h-[250px] w-full">
            {stats.specificExerciseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats.specificExerciseData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSpecific" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(val) => val > 1000 ? `${(val / 1000).toFixed(0)}k` : val } />
                  <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSpecific)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No data for this exercise in the last 30 days
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
