import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { useStore } from '../store/useStore';
import { Channel } from '../types';
import { 
  Store, 
  Loader2,
  Zap,
  Truck,
  Mail,
  Gauge
} from 'lucide-react';
import { motion } from 'motion/react';
import { apiService } from '../services/apiService';

const ICON_MAP: Record<string, any> = {
  flex: Zap,
  shopee: Store,
  mercado_livre: Truck,
  magalu: Store,
  correios: Mail,
  turbo: Gauge,
  full: Zap,
  pdv: Store,
  amazon: Store,
  americanas: Store,
  casas_bahia: Store,
  ifood: Truck,
};

const CHANNEL_COLORS = [
  '#22C55E', // Green
  '#EF4444', // Red
  '#FACC15', // Yellow
  '#3B82F6', // Blue
  '#FEF08A', // Light Yellow
  '#86EFAC', // Light Green
  '#F97316', // Orange
  '#EC4899', // Pink
];

export const Separation: React.FC = () => {
  const { channels, setChannels } = useStore();
  
  const [loading, setLoading] = useState(channels.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const channelsData = await apiService.getCanaisEnvio();
        setChannels(channelsData);
      } catch (err) {
        setError('Erro ao carregar dados.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [setChannels]);

  const renderChannelSelection = () => (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <p className="font-bold text-[10px] text-dy-gray-mid uppercase tracking-widest">Canais Disponíveis</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {channels.map((ch, index) => {
        const Icon = ICON_MAP[ch.chave] || Store;
        const color = CHANNEL_COLORS[index % CHANNEL_COLORS.length];
        return (
          <motion.div
            key={`${ch.chave}-${index}`}
            whileHover={{ scale: 1.02, translateY: -4 }}
            className="relative group overflow-hidden"
          >
            <div className="dy-card h-40 flex flex-col items-center justify-center gap-4 border-2 border-transparent transition-all duration-500 group-hover:bg-dy-black/40">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none bg-dy-accent" />
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                style={{
                  background: `linear-gradient(135deg, ${color}20, ${color}05)`,
                  border: `1px solid ${color}40`,
                  boxShadow: `0 8px 32px -8px ${color}30, inset 0 0 10px ${color}10`
                }}
              >
                <Icon size={32} style={{ color: color, filter: `drop-shadow(0 4px 8px ${color}60)` }} />
              </div>
              <span className="font-black text-[11px] text-center uppercase tracking-[0.2em] text-dy-gray-light group-hover:text-dy-white transition-colors">
                {ch.nome}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: color }} />
          </motion.div>
        );
      })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="CANAIS" showBack backTo="/menu" />
      
      <main className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-dy-accent" size={40} />
          </div>
        ) : (
          renderChannelSelection()
        )}
      </main>
    </div>
  );
};
