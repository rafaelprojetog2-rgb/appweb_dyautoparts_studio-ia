import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useStore } from '../store/useStore';
import { Picking, Product, PickingItem } from '../types';
import { 
  CheckCircle2, 
  Camera, 
  AlertTriangle,
  ChevronRight,
  Package,
  Search,
  ArrowLeft,
  Loader2,
  Plus,
  Minus,
  Save
} from 'lucide-react';
import { Scanner } from '../components/Scanner';
import { motion, AnimatePresence } from 'motion/react';
import { ScannerFeedback, FeedbackType } from '../components/ScannerFeedback';
import { apiService } from '../services/apiService';
import { offlineService } from '../services/offlineService';

export const Conference: React.FC = () => {
  const navigate = useNavigate();
  const { products, currentUser, pickings, setPickings, updatePicking } = useStore();
  
  const [step, setStep] = useState<'selection' | 'scanning' | 'result' | 'correction'>('selection');
  const [selectedPicking, setSelectedPicking] = useState<Picking | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string }>({ type: 'none', message: '' });

  useEffect(() => {
    const fetchPickings = async () => {
      const { isOnline } = useStore.getState();
      if (!isOnline) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiService.listPickings();
        if (data && data.length > 0) {
          // Merge logic: keep local pickings that are not in the API yet (e.g. status 'checking' or 'separated' but not in API)
          // For simplicity, if we got data from API, we update the store
          setPickings(data);
        }
      } catch (err) {
        console.error('Erro ao carregar separações:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPickings();
  }, [setPickings]);

  const separatedPickings = pickings.filter(p => p.status === 'separado' || p.status === 'conferindo');

  const vibrate = (type: 'success' | 'error') => {
    if (navigator.vibrate) {
      if (type === 'success') navigator.vibrate(100);
      else navigator.vibrate([100, 50, 100]);
    }

    // Sound feedback
    const audio = new Audio(
      type === 'success' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' 
        : 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'
    );
    audio.play().catch(() => {}); // Ignore if blocked by browser
  };

  const handleScan = (product: Product) => {
    if (!selectedPicking) return;

    // Blind conference: just record that we found this product
    const itemIndex = selectedPicking.items.findIndex(i => i.id_interno === product.id_interno);
    
    if (itemIndex === -1) {
      // Allow adding products that are not in the list
      vibrate('success');
      setFeedback({ type: 'success', message: 'Item Extra Adicionado' });
      
      const newItem: PickingItem = {
        rom_id: selectedPicking.rom_id,
        id_interno: product.id_interno,
        ean: product.ean || '',
        descricao: product.descricao_completa || product.descricao_base,
        qtd_solicitada: 0, // Not requested
        qtd_separada: 0, // Not separated
        qtd_conferida: 1
      };
      
      const updatedPicking = { 
        ...selectedPicking, 
        items: [...selectedPicking.items, newItem], 
        status: 'conferindo' as const 
      };
      setSelectedPicking(updatedPicking);
      updatePicking(selectedPicking.rom_id, updatedPicking);
      return;
    }

    // Success (even if it's extra, we record it for comparison later)
    vibrate('success');
    setFeedback({ type: 'success', message: 'OK' });
    
    const updatedItems = [...selectedPicking.items];
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      qtd_conferida: updatedItems[itemIndex].qtd_conferida + 1
    };

    const updatedPicking = { ...selectedPicking, items: updatedItems, status: 'conferindo' as const };
    setSelectedPicking(updatedPicking);
    updatePicking(selectedPicking.rom_id, updatedPicking);
  };

  const handleFinalizeConference = async () => {
    if (!selectedPicking) return;

    const hasDivergence = selectedPicking.items.some(i => i.qtd_conferida !== i.qtd_separada);
    
    if (hasDivergence) {
      setStep('result');
    } else {
      setLoading(true);
      try {
        // 1. Salvar conferência via POST
        for (const item of selectedPicking.items) {
          await apiService.salvarConferencia(
            { ...item, rom_id: selectedPicking.rom_id },
            currentUser?.usuario || 'sistema'
          );
        }

        // 2. Registrar movimentos de saída definitiva via POST
        for (const item of selectedPicking.items) {
          if (item.qtd_conferida > 0) {
            await apiService.registrarMovimento({
              id_interno: item.id_interno,
              tipo: 'saida',
              quantidade: item.qtd_conferida,
              local_origem: 'reserva',
              local_destino: 'cliente',
              usuario: currentUser?.usuario || 'sistema',
              origem: 'Conferência',
              observacao: `Saída definitiva pedido ${selectedPicking.rom_id}`,
              data: new Date().toISOString()
            });
          }
        }
        
        setStep('result');
      } catch (err: any) {
        console.error('Erro ao finalizar conferência:', err);
        alert(`Erro ao finalizar conferência: ${err.message || 'Erro de conexão'}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveCorrection = async () => {
    if (!selectedPicking) return;
      setLoading(true);
      try {
        // 1. Salvar conferência via POST
        for (const item of selectedPicking.items) {
          await apiService.salvarConferencia(
            { ...item, rom_id: selectedPicking.rom_id },
            currentUser?.usuario || 'sistema'
          );
        }

        // 2. Registrar movimentos de saída definitiva via POST
        for (const item of selectedPicking.items) {
          if (item.qtd_conferida > 0) {
            await apiService.registrarMovimento({
              id_interno: item.id_interno,
              tipo: 'saida',
              quantidade: item.qtd_conferida,
              local_origem: 'reserva',
              local_destino: 'cliente',
              usuario: currentUser?.usuario || 'sistema',
              origem: 'Conferência (Correção)',
              observacao: `Saída definitiva pedido ${selectedPicking.rom_id} (corrigido)`,
              data: new Date().toISOString()
            });
          }
        }
        
        alert('Correção salva com sucesso! Movimentos registrados.');
        navigate('/menu');
      } catch (err: any) {
        console.error('Erro ao salvar correção:', err);
        alert(`Erro ao salvar correção: ${err.message || 'Erro de conexão'}`);
      } finally {
        setLoading(false);
      }
  };

  const updateConferredQty = (id_interno: string, delta: number) => {
    if (!selectedPicking) return;
    const updatedItems = selectedPicking.items.map(item => {
      if (item.id_interno === id_interno) {
        return { ...item, qtd_conferida: Math.max(0, item.qtd_conferida + delta) };
      }
      return item;
    });
    const updatedPicking = { ...selectedPicking, items: updatedItems };
    setSelectedPicking(updatedPicking);
    updatePicking(selectedPicking.rom_id, updatedPicking);
  };

  const renderSelection = () => (
    <div className="flex flex-col gap-4">
      <p className="font-bold text-[10px] text-dy-gray-mid uppercase tracking-widest">Separações Prontas para Conferência</p>
      {separatedPickings.map((order) => (
        <motion.button
          key={order.rom_id}
          whileHover={{ x: 4 }}
          onClick={() => {
            setSelectedPicking(order);
            setStep('scanning');
          }}
          className="dy-card flex items-center justify-between hover:border-dy-accent/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-dy-accent/10 flex items-center justify-center text-dy-accent">
              <Package size={20} />
            </div>
            <div className="text-left">
              <p className="font-black text-sm text-dy-white uppercase">{order.rom_id}</p>
              <p className="text-[10px] text-dy-gray-mid uppercase font-bold">{order.canal_nome} • {order.items.length} itens</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-dy-gray-dark" />
        </motion.button>
      ))}
      {separatedPickings.length === 0 && (
        <div className="text-center py-12 text-dy-gray-mid uppercase text-[10px] font-bold tracking-widest border-2 border-dashed border-dy-gray-dark rounded-2xl">
          Nenhuma separação pendente
        </div>
      )}
    </div>
  );

  const renderScanning = () => (
    <div className="flex flex-col gap-8 items-center justify-center py-12">
      <div className="text-center">
        <h2 className="text-2xl font-black text-dy-white uppercase tracking-tighter">Conferência Cega</h2>
        <p className="text-dy-gray-mid text-xs uppercase font-bold mt-2 tracking-widest">Bipe todos os produtos do pacote</p>
      </div>

      <button 
        onClick={() => setIsScannerOpen(true)}
        className="w-48 h-48 rounded-full bg-dy-accent/5 border-4 border-dashed border-dy-accent/20 flex flex-col items-center justify-center gap-4 hover:bg-dy-accent/10 hover:border-dy-accent transition-all group"
      >
        <Camera size={48} className="text-dy-accent group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest text-dy-accent">Abrir Câmera</span>
      </button>

      <div className="w-full max-w-xs relative">
        <input
          type="text"
          placeholder="Código manual..."
          className="input-dy w-full pl-10 text-center"
            onKeyDown={async (e) => {
              if (e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                if (!val) return;
                
                setLoading(true);
                try {
                  const product = await apiService.buscarProdutoExato(val);

                  if (product) {
                    handleScan(product);
                    (e.target as HTMLInputElement).value = '';
                  } else {
                    vibrate('error');
                    setFeedback({ 
                      type: 'warning', 
                      message: 'Produto não cadastrado' 
                    });
                  }
                } catch (err) {
                  console.error('Erro na busca manual:', err);
                  vibrate('error');
                  setFeedback({ type: 'error', message: 'Erro de conexão' });
                } finally {
                  setLoading(false);
                }
              }
            }}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dy-gray-mid" size={18} />
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] text-dy-gray-mid uppercase font-bold tracking-widest">Total Conferido</p>
        <p className="text-4xl font-black text-dy-white">
          {selectedPicking?.items.reduce((acc, i) => acc + i.qtd_conferida, 0)} <span className="text-dy-gray-mid text-sm">un</span>
        </p>
      </div>

      <button 
        onClick={handleFinalizeConference}
        className="btn-dy-primary w-full py-4 text-lg"
      >
        <CheckCircle2 size={24} />
        Finalizar Conferência
      </button>
    </div>
  );

  const renderResult = () => {
    if (!selectedPicking) return null;
    const hasDivergence = selectedPicking.items.some(i => i.qtd_conferida !== i.qtd_separada);

    return (
      <div className="flex flex-col gap-8 items-center justify-center py-12 animate-in fade-in zoom-in">
        {hasDivergence ? (
          <>
            <div className="w-24 h-24 rounded-full bg-dy-danger/10 flex items-center justify-center text-dy-danger shadow-[0_0_50px_rgba(239,68,68,0.2)]">
              <AlertTriangle size={48} />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-dy-danger uppercase tracking-tighter">Divergência!</h2>
              <p className="text-dy-gray-mid text-sm uppercase font-bold mt-2 tracking-widest">As quantidades não conferem</p>
            </div>
            <div className="w-full flex flex-col gap-3">
              <button 
                onClick={() => setStep('correction')}
                className="btn-dy-primary w-full py-4 bg-dy-accent text-dy-black"
              >
                Corrigir Divergência
              </button>
              <button 
                onClick={() => setStep('scanning')}
                className="w-full py-4 text-[10px] font-bold uppercase tracking-widest text-dy-gray-mid hover:text-dy-white transition-colors"
              >
                Voltar para Conferência
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-full bg-dy-success/10 flex items-center justify-center text-dy-success shadow-[0_0_50px_rgba(34,197,94,0.2)]">
              <CheckCircle2 size={48} />
            </div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-dy-success uppercase tracking-tighter">Conferência OK</h2>
              <p className="text-dy-gray-mid text-sm uppercase font-bold mt-2 tracking-widest">Tudo pronto para o envio</p>
            </div>
            <button 
              onClick={() => navigate('/menu')}
              className="btn-dy-primary w-full py-4"
            >
              Finalizar Processo
            </button>
          </>
        )}
      </div>
    );
  };

  const renderCorrection = () => {
    if (!selectedPicking) return null;

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-black text-dy-white uppercase tracking-tighter">Correção de Divergência</h2>
          <p className="text-[10px] text-dy-gray-mid uppercase font-bold tracking-widest">Ajuste as quantidades conferidas</p>
        </div>

        <div className="flex flex-col gap-3">
          {selectedPicking.items.map((item) => {
            const isDivergent = item.qtd_conferida !== item.qtd_separada;
            return (
              <div key={item.id_interno} className={`dy-card flex flex-col gap-4 ${isDivergent ? 'border-dy-danger/50 bg-dy-danger/5' : 'opacity-60'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm text-dy-white uppercase">{item.descricao}</p>
                    <p className="text-[10px] text-dy-gray-mid uppercase font-bold">{item.ean}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Esperado</p>
                    <p className="text-sm font-black text-dy-white">{item.qtd_separada} un</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dy-gray-dark/30">
                  <p className="text-[10px] font-bold text-dy-gray-mid uppercase">Conferido</p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => updateConferredQty(item.id_interno, -1)}
                      className="w-10 h-10 rounded-xl bg-dy-gray-dark flex items-center justify-center text-dy-white hover:bg-dy-danger transition-colors"
                    >
                      <Minus size={20} />
                    </button>
                    <span className={`text-xl font-black w-12 text-center ${isDivergent ? 'text-dy-danger' : 'text-dy-success'}`}>
                      {item.qtd_conferida}
                    </span>
                    <button 
                      onClick={() => updateConferredQty(item.id_interno, 1)}
                      className="w-10 h-10 rounded-xl bg-dy-gray-dark flex items-center justify-center text-dy-white hover:bg-dy-success transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={handleSaveCorrection}
          className="btn-dy-primary w-full py-4 mt-4"
        >
          <Save size={24} />
          Salvar Correção
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="CONFERÊNCIA" showBack backTo="/menu" />
      
      {isScannerOpen && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScannerOpen(false)} 
          title="Conferência Cega"
        />
      )}

      <ScannerFeedback 
        type={feedback.type} 
        message={feedback.message} 
        onComplete={() => setFeedback({ type: 'none', message: '' })}
        duration={600}
      />

      <main className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-dy-accent" size={40} />
          </div>
        ) : (
          <>
            {step === 'selection' && renderSelection()}
            {step === 'scanning' && renderScanning()}
            {step === 'result' && renderResult()}
            {step === 'correction' && renderCorrection()}
          </>
        )}
      </main>
    </div>
  );
};
