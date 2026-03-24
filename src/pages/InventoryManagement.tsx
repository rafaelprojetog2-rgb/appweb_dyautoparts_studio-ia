import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { apiService } from '../services/apiService';
import { 
  BarChart3, 
  PieChart, 
  Play, 
  Settings, 
  Loader2, 
  Barcode, 
  Keyboard, 
  Camera,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';

type InventoryType = 'geral' | 'inicial' | 'parcial' | 'ajuste';
type InputMethod = 'barcode' | 'manual' | 'camera';

const TYPE_CONFIG = {
  inicial: { label: 'INICIAL', icon: Play, color: '#22C55E' },
  parcial: { label: 'PARCIAL', icon: PieChart, color: '#FACC15' },
  geral: { label: 'GERAL', icon: BarChart3, color: '#3B82F6' },
  ajuste: { label: 'AJUSTE', icon: Settings, color: '#EF4444' },
};

const METHOD_CONFIG = {
  barcode: { label: 'BIPAR', icon: Barcode, color: '#3B82F6' },
  manual: { label: 'DIGITAR', icon: Keyboard, color: '#F97316' },
  camera: { label: 'LEITOR CAMERA', icon: Camera, color: '#EC4899' },
};

export const InventoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, setInventories, inventories } = useStore();
  const [step, setStep] = useState<'type' | 'method'>('type');
  const [selectedType, setSelectedType] = useState<InventoryType | null>(null);
  const [creating, setCreating] = useState(false);

  const handleTypeSelect = (type: InventoryType) => {
    setSelectedType(type);
    setStep('method');
  };

  const handleMethodSelect = async (method: InputMethod) => {
    if (!currentUser || !selectedType) return;
    
    setCreating(true);
    try {
      const newInv = await apiService.criarInventario({
        tipo: selectedType,
        filtro: 'todos',
        criado_por: currentUser.usuario,
        status: 'em_andamento'
      });
      
      if (!newInv || !newInv.inventario_id) {
        throw new Error('ID do inventário não retornado pela API');
      }

      setInventories([newInv, ...inventories]);
      
      // Navigate to detail with method preference
      const params = new URLSearchParams();
      if (method === 'camera') params.append('start', 'true');
      if (method === 'manual') params.append('focus', 'true');
      
      navigate(`/inventario/${newInv.inventario_id}?${params.toString()}`);
    } catch (err: any) {
      console.error('Erro ao criar inventário:', err);
      alert(`Erro ao criar inventário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setCreating(false);
    }
  };

  const renderTypeSelection = () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h2 className="text-xl font-black text-dy-white uppercase tracking-tighter">Novo Inventário</h2>
        <p className="text-[10px] text-dy-gray-mid uppercase font-bold tracking-widest">Selecione o tipo de contagem</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.keys(TYPE_CONFIG) as InventoryType[]).map((type) => {
          const config = TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleTypeSelect(type)}
              className="relative group overflow-hidden text-left"
            >
              <div className="dy-card h-40 flex flex-col items-center justify-center gap-4 border-2 border-transparent transition-all duration-500 group-hover:bg-dy-black/40">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${config.color}20, ${config.color}05)`,
                    border: `1px solid ${config.color}40`,
                    boxShadow: `0 8px 32px -8px ${config.color}30`
                  }}
                >
                  <Icon size={32} style={{ color: config.color }} />
                </div>
                <span className="font-black text-sm text-center uppercase tracking-[0.2em] text-dy-gray-light group-hover:text-dy-white transition-colors">
                  {config.label}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: config.color }} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  const renderMethodSelection = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setStep('type')}
          className="p-2 bg-dy-gray-dark rounded-xl text-dy-gray-light hover:text-dy-accent transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-dy-white uppercase tracking-tighter">Método de Entrada</h2>
          <p className="text-[10px] text-dy-gray-mid uppercase font-bold tracking-widest">Como deseja realizar a leitura?</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.keys(METHOD_CONFIG) as InputMethod[]).map((method) => {
          const config = METHOD_CONFIG[method];
          const Icon = config.icon;
          return (
            <motion.button
              key={method}
              whileHover={{ scale: 1.02, translateY: -4 }}
              whileTap={{ scale: 0.98 }}
              disabled={creating}
              onClick={() => handleMethodSelect(method)}
              className="relative group overflow-hidden text-left"
            >
              <div className="dy-card h-48 flex flex-col items-center justify-center gap-4 border-2 border-transparent transition-all duration-500 group-hover:bg-dy-black/40">
                {creating ? (
                  <Loader2 className="animate-spin text-dy-accent" size={32} />
                ) : (
                  <>
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-500 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${config.color}20, ${config.color}05)`,
                        border: `1px solid ${config.color}40`,
                        boxShadow: `0 8px 32px -8px ${config.color}30`
                      }}
                    >
                      <Icon size={32} style={{ color: config.color }} />
                    </div>
                    <span className="font-black text-[10px] text-center uppercase tracking-[0.2em] text-dy-gray-light group-hover:text-dy-white transition-colors">
                      {config.label}
                    </span>
                  </>
                )}
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500" style={{ backgroundColor: config.color }} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="INVENTÁRIO" showBack backTo="/menu" />
      
      <main className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'type' ? renderTypeSelection() : renderMethodSelection()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
