import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  showLogout?: boolean;
  showLogo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack, backTo, showLogout, showLogo }) => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, isOnline, syncQueue } = useStore();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="bg-dy-black border-b border-dy-gray-dark text-dy-white py-4 px-4 sticky top-0 z-50">
      <div className="grid grid-cols-3 items-center max-w-2xl mx-auto">
        <div className="flex items-center">
          {showBack ? (
            <button onClick={handleBack} className="p-2 -ml-2 hover:text-dy-accent transition-colors flex items-center justify-center">
              <ArrowLeft size={24} />
            </button>
          ) : showLogo ? (
            <div className="relative h-12 w-32">
              <img 
                src={`${import.meta.env.BASE_URL}imagens/icon-512-black.png`} 
                alt="DY Logo" 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-[120px] w-auto max-w-none"
              />
            </div>
          ) : null}
        </div>
        
        <div className="text-center">
          <h1 className="text-lg font-black tracking-tighter uppercase truncate">{title}</h1>
        </div>
        
        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const { offlineService } = require('../services/offlineService');
                offlineService.syncQueue();
              }}
              className={`p-1.5 rounded-full bg-dy-gray-dark transition-all active:scale-90 ${
                syncQueue.length > 0 ? 'text-dy-accent animate-pulse' : 'text-dy-gray-mid opacity-50'
              }`}
              title="Sincronizar"
            >
              <RefreshCw size={14} />
            </button>

            <div className={`p-1.5 rounded-full ${isOnline ? 'bg-dy-success/10' : 'bg-dy-gray-dark'}`}>
              {isOnline ? (
                <Wifi size={14} className="text-dy-success" />
              ) : (
                <WifiOff size={14} className="text-dy-gray-mid" />
              )}
            </div>
          </div>
          
          {showLogout && (
            <button onClick={handleLogout} className="p-2 bg-dy-gray-dark rounded-xl text-dy-gray-light hover:text-dy-accent transition-all active:scale-90">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>
      {currentUser && !showLogout && (
        <div className="mt-1 text-[7px] uppercase tracking-widest text-dy-gray-mid text-center max-w-2xl mx-auto font-bold hover:text-dy-accent transition-colors cursor-default">
          {currentUser.nome}
        </div>
      )}
    </header>
  );
};
