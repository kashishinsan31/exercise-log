import React from 'react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileNativeLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  onLogout?: () => void;
  title?: string;
  subtitle?: string;
  bottomNav?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function MobileNativeLayout({ children, onBack, onLogout, title, subtitle, bottomNav, headerRight }: MobileNativeLayoutProps) {
  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center p-0 md:p-8 z-50 font-sans">
      <div className="w-full h-full md:w-[400px] md:h-[800px] md:max-h-[90vh] bg-[#0A0A0C] text-white md:rounded-[3rem] relative overflow-hidden shadow-2xl md:border-[8px] border-[#1A1A1D] flex flex-col">
        
        {/* Dynamic Island / Status Bar area */}
        <div className="absolute top-0 inset-x-0 h-10 flex justify-center items-center z-50 pointer-events-none">
           <div className="w-32 h-6 bg-black rounded-b-3xl"></div>
        </div>

        {/* Header content */}
        <div className="px-5 pt-10 pb-3 flex justify-between items-center z-10 bg-gradient-to-b from-[#0A0A0C] to-transparent shrink-0">
          <div className="flex items-center gap-3">
             {onBack ? (
               <button onClick={onBack} className="w-9 h-9 bg-[#1C1C1E] rounded-full flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm border border-white/5">
                  <ChevronLeft className="w-5 h-5 text-white/80" />
               </button>
             ) : (
               <div className="w-9 h-9 flex items-center justify-center shrink-0 overflow-hidden relative rounded-full">
                 <img src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
               </div>
             )}
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex flex-col"
             >
               {subtitle && <span className="text-[#8e8e93] text-[10px] sm:text-xs font-semibold tracking-wider uppercase mb-0.5">{subtitle}</span>}
               {title && <h1 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1 leading-none">{title}</h1>}
             </motion.div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
             {headerRight}
             {onLogout && (
               <button onClick={onLogout} className="w-9 h-9 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 rounded-full flex items-center justify-center text-[#FF3B30] transition-colors shadow-sm">
                  <LogOut className="w-4 h-4 ml-0.5" />
               </button>
             )}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className={`flex-1 overflow-y-auto scrollbar-hide px-5 ${bottomNav ? 'pb-24' : 'pb-6'} relative z-0`}>
          <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Native Bottom Tab Bar (Glassmorphism) */}
        {bottomNav && (
          <div className="absolute bottom-0 inset-x-0 h-[72px] bg-[#0A0A0C]/90 backdrop-blur-xl border-t border-white/5 flex justify-around items-center px-4 z-50 pb-2">
            {bottomNav}
          </div>
        )}
      </div>
    </div>
  );
}

export function MobileTabItem({ icon, label, isActive, onClick, activeColor = 'text-[#34C759]' }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, activeColor?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors duration-300 w-16 ${isActive ? activeColor : 'text-[#8e8e93] hover:text-[#d1d1d6]'}`}
    >
      <div className="relative">
        <div className={`[&>svg]:w-6 [&>svg]:h-6 [&>svg]:stroke-[1.75px] ${isActive ? '[&>svg]:fill-current [&>svg]:stroke-2' : ''}`}>
          {icon}
        </div>
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </button>
  );
}
