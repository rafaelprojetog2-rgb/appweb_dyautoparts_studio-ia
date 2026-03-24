import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { User } from '../types';
import { apiService } from '../services/apiService';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setCurrentUser, setProducts } = useStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiService.getUsers();
        setUsers(data);
      } catch (err) {
        setError('Erro ao carregar usuários. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleLogin = (user: User) => {
    // Perform synchronization in background
    const startSync = async () => {
      try {
        const state = useStore.getState();
        const syncTasks: Promise<any>[] = [];

        if (state.products.length === 0) {
          syncTasks.push(apiService.listarProdutos(2000).then(data => setProducts(data)));
        }
        
        if (state.menus.length === 0) {
          syncTasks.push(apiService.getMenus().then(data => state.setMenus(data)));
        }

        if (state.channels.length === 0) {
          syncTasks.push(apiService.getCanaisEnvio().then(data => state.setChannels(data)));
        }

        syncTasks.push(apiService.listEstoque().then(data => state.setStock(data)));
        syncTasks.push(apiService.listInventarios().then(data => state.setInventories(data)));
        
        if (state.lampKits.length === 0) {
          syncTasks.push(apiService.listarKitsLampadas().then(data => state.setLampKits(data)));
        }

        if (syncTasks.length > 0) {
          await Promise.all(syncTasks);
        }
      } catch (error) {
        console.error('Erro na sincronização em background:', error);
      }
    };

    // Start background sync
    startSync();

    // Navigate immediately
    setCurrentUser(user);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-dy-black flex flex-col items-center p-6 overflow-y-auto scrollbar-hide">
      {isSyncing && (
        <div className="fixed inset-0 z-50 bg-dy-black/90 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-dy-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-dy-accent font-black uppercase tracking-[0.2em] text-sm animate-pulse">
            Sincronizando...
          </p>
        </div>
      )}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg flex flex-col items-center min-h-full"
      >
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center shrink-0">
          <img 
            src={`${import.meta.env.BASE_URL}imagens/icon-512-black.png`} 
            alt="DY Auto Parts Logo" 
            className="w-64 h-auto"
          />
        </div>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-dy-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <p className="text-dy-accent text-xs uppercase tracking-widest mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="text-dy-white text-[10px] uppercase font-bold border border-dy-gray-dark px-4 py-2 rounded-lg"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 gap-6 mb-8 overflow-visible">
            {users.map((user, index) => (
              <button
                key={`${user.usuario}-${index}`}
                onClick={() => handleLogin(user)}
                className="w-full py-10 dy-card dy-card-hover flex items-center justify-center group relative overflow-hidden border-2 border-dy-gray-dark hover:border-dy-accent/50 shrink-0"
              >
                <div className="absolute inset-0 bg-dy-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative font-black text-dy-white tracking-[0.3em] uppercase text-[17px] group-hover:text-dy-accent transition-all group-hover:scale-110">
                  {user.nome}
                </span>
              </button>
            ))}
            {users.length === 0 && (
              <p className="text-dy-gray-mid text-center text-xs uppercase tracking-widest py-12">Nenhum usuário ativo encontrado</p>
            )}
          </div>
        )}

        <footer className="mt-auto py-8 text-center shrink-0">
          <p className="text-[9px] text-dy-gray-mid uppercase tracking-[0.4em] font-bold">
            appweb_studio-ia • SISTEMA OPERACIONAL v1.2
          </p>
        </footer>
      </motion.div>
    </div>
  );
};
