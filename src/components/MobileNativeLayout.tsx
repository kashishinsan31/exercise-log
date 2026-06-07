import React from 'react';
import { ChevronLeft, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InstallPWA } from './InstallPWA';

interface MobileNativeLayoutProps {
  children: React.ReactNode;
  onBack?: () => void;
  onLogout?: () => void;
  onRefresh?: () => void;
  title?: string;
  subtitle?: string;
  bottomNav?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function MobileNativeLayout({ children, onBack, onLogout, onRefresh, title, subtitle, bottomNav, headerRight }: MobileNativeLayoutProps) {
  return (
    <div className="fixed inset-0 bg-[#0A0A0C] flex justify-center p-0 z-50 font-sans sm:bg-black/90">
      <div className="w-full h-[100dvh] sm:h-full sm:max-w-md sm:border-x border-white/10 bg-[#0A0A0C] text-white relative overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header content */}
        <div className="px-5 pt-3 pb-2 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-3">
             {onBack && (
               <button onClick={onBack} className="w-9 h-9 bg-[#1C1C1E] rounded-full flex items-center justify-center relative overflow-hidden shrink-0 shadow-sm border border-white/5">
                  <ChevronLeft className="w-5 h-5 text-white/80" />
               </button>
             )}
             <motion.div 
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex flex-col"
             >
               {subtitle && <span className="text-[#8e8e93] text-[10px] sm:text-xs font-semibold tracking-wider uppercase mb-0.5">{subtitle}</span>}
               {title && <h1 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1 leading-none capitalize">{title}</h1>}
             </motion.div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
             {headerRight}
             {onRefresh && (
               <button onClick={onRefresh} className="w-9 h-9 bg-[#1C1C1E] hover:bg-[#2C2C2E] rounded-full flex items-center justify-center text-white transition-colors shadow-sm">
                  <RefreshCw className="w-4 h-4 text-white/80" />
               </button>
             )}
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
          <div className="absolute bottom-0 inset-x-0 h-[72px] bg-[#0A0A0C]/90 backdrop-blur-xl border-t border-white/5 flex items-center px-2 z-50 pb-2 justify-between custom-scrollbar overflow-x-auto sm:justify-around">
            {bottomNav}
          </div>
        )}
      </div>
      <InstallPWA />
    </div>
  );
}

export function MobileTabItem({ icon, label, isActive, onClick, activeColor = 'text-[#34C759]' }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, activeColor?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 transition-colors duration-300 min-w-[60px] flex-shrink-0 ${isActive ? activeColor : 'text-[#8e8e93] hover:text-[#d1d1d6]'}`}
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
