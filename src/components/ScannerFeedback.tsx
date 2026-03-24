import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, AlertTriangle, Loader2, Plus } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'processing' | 'none';

interface ScannerFeedbackProps {
  type: FeedbackType;
  message: string;
  onComplete?: () => void;
  duration?: number;
}

export const ScannerFeedback: React.FC<ScannerFeedbackProps> = ({ 
  type, 
  message, 
  onComplete,
  duration = 1500 
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (type !== 'none') {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [type, duration, onComplete]);

  const config = {
    success: {
      color: 'bg-green-500',
      icon: <Check size={64} className="text-white" strokeWidth={4} />,
      shadow: 'shadow-[0_0_50px_rgba(34,197,94,0.5)]',
      textColor: 'text-white',
      hideText: true
    },
    warning: {
      color: 'bg-yellow-500',
      icon: <AlertTriangle size={64} className="text-black" strokeWidth={3} />,
      shadow: 'shadow-[0_0_50px_rgba(234,179,8,0.5)]',
      textColor: 'text-black',
      hideText: false
    },
    error: {
      color: 'bg-red-500', 
      icon: <X size={64} className="text-white" strokeWidth={4} />,
      shadow: 'shadow-[0_0_50px_rgba(239,68,68,0.5)]',
      textColor: 'text-white',
      hideText: false
    },
    processing: {
      color: 'bg-dy-accent', 
      icon: <Loader2 size={64} className="text-dy-black animate-spin" />,
      shadow: 'shadow-[0_0_50px_rgba(254,249,195,0.5)]',
      textColor: 'text-dy-black',
      hideText: false
    },
    none: {
      color: 'transparent',
      icon: null,
      shadow: '',
      textColor: 'text-white'
    }
  };

  const current = config[type === 'none' ? 'none' : type];

  return (
    <AnimatePresence>
      {visible && type !== 'none' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
        >
          {/* Flash Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 ${current.color}`}
          />

          {/* Feedback Card */}
          <motion.div
            initial={{ scale: 0.5, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.5, y: 20, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className={`${current.color} ${current.shadow} p-8 rounded-3xl flex flex-col items-center gap-4 min-w-[240px] text-center`}
          >
            <div className="bg-black/10 p-6 rounded-full backdrop-blur-sm">
              {current.icon}
            </div>
            {!current.hideText && (
              <p className={`${current.textColor} font-black uppercase tracking-widest text-sm`}>
                {message}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
