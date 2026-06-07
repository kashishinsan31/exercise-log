import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    
    // Check if running as standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (isDismissed === 'true' || isStandalone) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Update UI notify the user they can install the PWA
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Some iOS specific checks for prompt (iOS doesn't support beforeinstallprompt natively but we could show a fallback UI if needed)
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIos && !isInStandaloneMode && isDismissed !== 'true') {
        setShowPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
        // Fallback for iOS
        alert("To install: tap the Share icon below and select 'Add to Home Screen'.");
        handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-6 inset-x-4 md:left-1/2 md:-translate-x-1/2 md:w-[350px] bg-[#1C1C1E] border border-white/10 p-5 rounded-2xl shadow-2xl z-[100] font-sans flex flex-col gap-4 text-white"
      >
        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-[#8e8e93] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4 pr-6">
          <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-shrink-0 items-center justify-center p-2">
            <img src="https://waiterwalk.com/wp-content/uploads/2018/05/Waiter-walk-Final-logo-298x300-1.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="font-bold text-[15px]">Install ProTrainer</h3>
            <p className="text-xs text-[#8e8e93] mt-0.5">Add to your home screen for quick access and full-screen experience.</p>
          </div>
        </div>
        <button
          onClick={handleInstallClick}
          className="w-full py-3 bg-[#0A84FF] text-white font-semibold rounded-xl text-[15px] flex items-center justify-center gap-2 hover:bg-[#007AFF] active:scale-[0.98] transition-all"
        >
          <Download className="w-4 h-4" /> Install App
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
