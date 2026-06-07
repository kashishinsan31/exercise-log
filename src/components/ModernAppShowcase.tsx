import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Home, Compass, User, Bell, TrendingUp, 
  Flame, Droplets, Target, ChevronRight, Moon, 
  MoreHorizontal, Plus
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const mockActivityData = [
  { day: 'M', value: 45 },
  { day: 'T', value: 52 },
  { day: 'W', value: 38 },
  { day: 'T', value: 65 },
  { day: 'F', value: 48 },
  { day: 'S', value: 80 },
  { day: 'S', value: 75 },
];

export function ModernAppShowcase({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center p-0 md:p-8 z-50">
      {/* Phone Frame for Desktop, Full screen on Mobile */}
      <div className="w-full h-full md:w-[400px] md:h-[800px] md:max-h-[90vh] bg-[#0A0A0C] text-white md:rounded-[3rem] relative overflow-hidden shadow-2xl md:border-[8px] border-[#1A1A1D] flex flex-col">
        
        {/* Dynamic Island / Status Bar area */}
        <div className="absolute top-0 inset-x-0 h-10 flex justify-center items-center z-50 pointer-events-none">
           <div className="w-32 h-6 bg-black rounded-b-3xl"></div>
        </div>

        {/* Header content mapping based on tab */}
        <div className="px-6 pt-14 pb-4 flex justify-between items-center z-10 bg-gradient-to-b from-[#0A0A0C] to-transparent">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="text-[#8e8e93] text-sm font-semibold tracking-wider uppercase mb-1">Today, Jun 12</span>
            <h1 className="text-3xl font-bold tracking-tight">Summary</h1>
          </motion.div>
          <div className="flex items-center gap-3">
             <button onClick={onBack} className="w-10 h-10 bg-[#1C1C1E] rounded-full flex items-center justify-center relative overflow-hidden">
                <ChevronRight className="w-5 h-5 text-white/50" />
             </button>
             <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#1C1C1E] relative">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e2e8f0" alt="Avatar" className="w-full h-full object-cover" />
             </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pb-32">
          
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Rings / Main Metric */}
                <div className="w-full aspect-square max-h-[300px] relative mt-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                     <div className="text-center relative z-10">
                        <Flame className="w-8 h-8 text-[#FF3B30] mx-auto mb-2 opacity-80" />
                        <span className="text-5xl font-bold tracking-tighter">846</span>
                        <span className="block text-[#8e8e93] font-medium mt-1 uppercase tracking-widest text-xs">Kcal</span>
                     </div>
                  </div>
                  {/* Decorative concentric arcs */}
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90 stroke-current text-[#1C1C1E]">
                    <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="28" fill="none" strokeWidth="8" strokeLinecap="round" />
                    <circle cx="50" cy="50" r="16" fill="none" strokeWidth="8" strokeLinecap="round" />
                  </svg>
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90 stroke-current text-[#FF3B30]">
                    <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="251" strokeDashoffset="40" className="transition-all duration-1000 ease-out" />
                  </svg>
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90 stroke-current text-[#34C759]">
                    <circle cx="50" cy="50" r="28" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="175" strokeDashoffset="60" className="transition-all duration-1000 delay-150 ease-out" />
                  </svg>
                  <svg viewBox="0 0 100 100" className="w-full h-full absolute inset-0 -rotate-90 stroke-current text-[#00C7BE]">
                    <circle cx="50" cy="50" r="16" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray="100" strokeDashoffset="20" className="transition-all duration-1000 delay-300 ease-out" />
                  </svg>
                </div>

                {/* Grid layout (Bento Box style) */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Heart Rate Card */}
                  <motion.div whileTap={{ scale: 0.95 }} className="bg-[#1C1C1E] rounded-[24px] p-5 flex flex-col justify-between aspect-square">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded-full bg-[#FF3B30]/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#FF3B30]" />
                      </div>
                      <span className="text-[#8e8e93] text-xs font-semibold">12m ago</span>
                    </div>
                    <div>
                      <div className="text-[#FF3B30] text-3xl font-bold tracking-tight">112</div>
                      <div className="text-white/60 text-sm font-medium mt-1">bpm</div>
                    </div>
                  </motion.div>

                  {/* Sleep Card */}
                  <motion.div whileTap={{ scale: 0.95 }} className="bg-[#1C1C1E] rounded-[24px] p-5 flex flex-col justify-between aspect-square">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded-full bg-[#AF52DE]/20 flex items-center justify-center">
                        <Moon className="w-4 h-4 text-[#AF52DE]" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[#AF52DE] text-3xl font-bold tracking-tight">7h 41m</div>
                      <div className="text-white/60 text-sm font-medium mt-1">Time in bed</div>
                    </div>
                  </motion.div>
                </div>

                {/* Steps Section */}
                <motion.div whileTap={{ scale: 0.98 }} className="bg-[#1C1C1E] rounded-[24px] p-5">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-[#34C759] font-semibold text-lg flex items-center gap-2">
                        <Droplets className="w-4 h-4" /> Steps
                      </h3>
                      <p className="text-sm text-[#8e8e93] mt-1">Goal: 10,000</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold tracking-tight text-white">8,432</div>
                    </div>
                  </div>
                  
                  <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mockActivityData}>
                         <defs>
                          <linearGradient id="colorSteps" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#34C759" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#34C759" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="value" stroke="#34C759" strokeWidth={3} fill="url(#colorSteps)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-semibold text-[#8e8e93]">
                    {mockActivityData.map((d, i) => <span key={i}>{d.day}</span>)}
                  </div>
                </motion.div>

              </motion.div>
            )}

            {activeTab !== 'home' && (
              <motion.div
                key="other"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[400px] flex items-center justify-center text-[#8e8e93]"
              >
                <div className="text-center">
                  <Compass className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>More features in development.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Action Button (Glass) */}
        <div className="absolute bottom-28 right-6 z-40">
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             className="w-14 h-14 bg-gradient-to-tr from-[#FF3B30] to-[#FF9500] rounded-full shadow-[0_8px_32px_rgba(255,59,48,0.5)] flex items-center justify-center text-white"
           >
             <Plus className="w-6 h-6" />
           </motion.button>
        </div>

        {/* Native Bottom Tab Bar (Glassmorphism) */}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-[#1C1C1E]/80 backdrop-blur-2xl border-t border-white/10 flex justify-around items-start pt-4 px-6 z-50">
          <TabItem 
            icon={<Home />} 
            label="Home" 
            isActive={activeTab === 'home'} 
            onClick={() => setActiveTab('home')} 
          />
          <TabItem 
            icon={<TrendingUp />} 
            label="Trends" 
            isActive={activeTab === 'trends'} 
            onClick={() => setActiveTab('trends')} 
          />
          <TabItem 
            icon={<Target />} 
            label="Goals" 
            isActive={activeTab === 'goals'} 
            onClick={() => setActiveTab('goals')} 
          />
          <TabItem 
            icon={<User />} 
            label="Profile" 
            isActive={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </div>
      </div>
    </div>
  );
}

function TabItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-colors duration-300 w-16 ${isActive ? 'text-[#FF3B30]' : 'text-[#8e8e93] hover:text-white'}`}
    >
      <div className="relative">
        <div className={`[&>svg]:w-[26px] [&>svg]:h-[26px] [&>svg]:stroke-[1.5px] ${isActive ? '[&>svg]:fill-current [&>svg]:stroke-2' : ''}`}>
          {icon}
        </div>
      </div>
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}
