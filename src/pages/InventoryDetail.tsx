import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { apiService } from '../services/apiService';
import { InventoryMaster, InventoryItem, Product } from '../types';
import { 
  BarChart3, 
  Package, 
  Search, 
  Camera, 
  Loader2, 
  Save, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Scanner } from '../components/Scanner';
import { ScannerFeedback, FeedbackType } from '../components/ScannerFeedback';

export const InventoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, products, inventories } = useStore();
  
  const [inventory, setInventory] = useState<InventoryMaster | null>(
    inventories.find(i => i.inventario_id === id) || null
  );
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(!inventory);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Counting state
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [selectedLocal, setSelectedLocal] = useState('TÉRREO');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message: string }>({ type: 'none', message: '' });

  const LOCALS = ['TÉRREO', '1° ANDAR', 'DEFEITO', 'MOSTRUARIO'];

  // Audio feedback using Web Audio API
  const playSound = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const showFeedback = (type: FeedbackType, message: string = '') => {
    setFeedback({ type, message });
    if (type === 'success' || type === 'error' || type === 'warning') {
      playSound(type === 'success' ? 'success' : 'error');
    }
  };

  const [searchParams] = useSearchParams();

  const fetchData = useCallback(async () => {
    if (!id) return;
    if (!inventory) setLoading(true);
    setError(null);
    try {
      const [invData, itemsData] = await Promise.all([
        apiService.getInventario(id),
        apiService.listInventarioItens(id)
      ]);
      if (!invData) throw new Error('Inventário não encontrado');
      setInventory(invData);
      setItems(itemsData.sort((a, b) => new Date(b.auditado_em).getTime() - new Date(a.auditado_em).getTime()));
    } catch (err: any) {
      console.error('Erro ao buscar dados do inventário:', err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [id, inventory]);

  useEffect(() => {
    fetchData();
  }, [id]); // Only refetch when ID changes

  // Auto-open scanner if start=true or focus input if focus=true
  useEffect(() => {
    if (inventory && inventory.status === 'em_andamento') {
      if (searchParams.get('start') === 'true') {
        setIsScannerOpen(true);
      } else if (searchParams.get('focus') === 'true') {
        const input = document.querySelector('input[placeholder*="código"]') as HTMLInputElement;
        if (input) input.focus();
      }
    }
  }, [searchParams, inventory]);

  // Sync with store if missing
  useEffect(() => {
    if (!inventory && id && inventories.length > 0) {
      const found = inventories.find(i => i.inventario_id === id);
      if (found) {
        setInventory(found);
        setLoading(false);
      }
    }
  }, [id, inventories, inventory]);

  // Physical Scanner Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If time between keys is very short, it's likely a scanner
      if (currentTime - lastKeyTime > 50) {
        buffer = '';
      }
      
      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          handleSearch(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
      
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, items, selectedLocal]);

  const handleStartInventory = async () => {
    if (!inventory || !currentUser) return;
    
    // Optimistic update
    setInventory({ ...inventory, status: 'em_andamento' });
    
    // Also open scanner immediately as requested
    setIsScannerOpen(true);

    try {
      await apiService.updateInventarioStatus(inventory.inventario_id, 'em_andamento');
    } catch (err) {
      console.error('Erro ao persistir status do inventário:', err);
    }
  };

  const handleSearch = async (code?: string) => {
    const searchCode = (code || barcode).trim();
    if (!searchCode) return;

    // Validation Rules:
    // 1. EAN: Exactly 13 digits
    const isEan = /^\d{13}$/.test(searchCode);
    // 2. Internal: DY-000.000 format (DY- followed by 3 digits, a dot, and 3 digits)
    const isInternal = /^DY-\d{3}\.\d{3}$/i.test(searchCode);
    
    const isValidFormat = isEan || isInternal;

    if (!isValidFormat) {
      showFeedback('error', 'Código inválido ou incompleto');
      if (!code) setBarcode('');
      return;
    }

    setSearching(true);
    try {
      const input = searchCode.trim();
      // Use the new exact search action
      const product = await apiService.buscarProdutoExato(input);

      if (product) {
        // If it's still 'aberto', start it automatically
        if (inventory?.status === 'aberto') {
          handleStartInventory();
        }
        setSelectedProduct(product);
        setQty(1); // Default to 1 for quick scanning
        showFeedback('success');
        
        // Check if item already exists in this inventory/local to pre-fill
        const existing = items.find(i => i.id_interno === product!.id_interno && i.local === selectedLocal);
        if (existing) {
          setQty(existing.saldo_fisico + 1);
        }
      } else {
        showFeedback('warning', 'Produto não cadastrado');
      }
    } catch (err) {
      showFeedback('error', 'Erro na leitura');
    } finally {
      setSearching(false);
      if (!code) setBarcode(''); // Clear manual input
    }
  };

  const handleSaveItem = async () => {
    if (!inventory || !selectedProduct || !currentUser) return;
    
    if (qty <= 0) {
      showFeedback('warning', 'A quantidade deve ser maior que zero');
      return;
    }

    setSaving(true);
    
    // Optimistic update for the list
    const newItem: InventoryItem = {
      inventario_id: inventory.inventario_id,
      id_interno: selectedProduct.id_interno,
      local: selectedLocal,
      saldo_fisico: qty,
      usuario: currentUser.usuario,
      saldo_sistema: 0, // Will be updated by backend
      diferenca: 0,
      valor_unitario: 0,
      valor_diferenca: 0,
      auditado_em: new Date().toISOString()
    };
    
    // Check if updating existing
    const existingIndex = items.findIndex(i => i.id_interno === newItem.id_interno && i.local === newItem.local);
    const oldItems = [...items];
    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = { ...newItems[existingIndex], saldo_fisico: qty, auditado_em: newItem.auditado_em };
      setItems(newItems);
    } else {
      setItems([newItem, ...items]);
    }

    try {
      // Pass price for value difference calculation
      const success = await apiService.registrarItemInventario(newItem, selectedProduct.preco_venda || 0);

      if (success) {
        setSelectedProduct(null);
        setBarcode('');
        setQty(0);
        showFeedback('success');
        // Silent refresh in background to get calculated fields
        fetchData(); 
      } else {
        showFeedback('error', 'Erro ao salvar item');
        setItems(oldItems); // Rollback
      }
    } catch (err) {
      showFeedback('error', 'Erro de conexão');
      setItems(oldItems); // Rollback
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!inventory || !currentUser) return;
    if (!window.confirm('Deseja realmente finalizar este inventário? O estoque será atualizado.')) return;
    
    setFinalizing(true);
    try {
      const success = await apiService.finalizarInventario(inventory.inventario_id, currentUser.usuario);
      if (success) {
        alert('Inventário finalizado com sucesso!');
        navigate('/inventario');
      } else {
        alert('Erro ao finalizar inventário.');
      }
    } catch (err) {
      alert('Erro ao finalizar inventário.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleCancel = async () => {
    if (!inventory || !currentUser) return;
    if (!window.confirm('Deseja realmente cancelar este inventário?')) return;
    
    setCanceling(true);
    try {
      const success = await apiService.cancelarInventario(inventory.inventario_id, currentUser.usuario);
      if (success) {
        alert('Inventário cancelado.');
        navigate('/inventario');
      } else {
        alert('Erro ao cancelar inventário.');
      }
    } catch (err) {
      alert('Erro ao cancelar inventário.');
    } finally {
      setCanceling(false);
    }
  };

  if (loading && !inventory) {
    return (
      <div className="min-h-screen bg-dy-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-dy-accent" size={32} />
      </div>
    );
  }

  if (error && !inventory) {
    return (
      <div className="min-h-screen bg-dy-black flex flex-col items-center justify-center gap-6 p-6">
        <div className="w-16 h-16 rounded-full bg-dy-danger/10 flex items-center justify-center text-dy-danger">
          <XCircle size={32} />
        </div>
        <div className="text-center">
          <p className="text-dy-white font-bold uppercase text-sm">{error}</p>
          <p className="text-dy-gray-mid text-[10px] uppercase mt-2">Não foi possível carregar os dados deste inventário.</p>
        </div>
        <button 
          onClick={() => fetchData()}
          className="btn-dy-primary px-8 py-3"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (!inventory) return null;

  const isEditable = inventory.status === 'aberto' || inventory.status === 'em_andamento';

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title={`Inventário: ${inventory.inventario_id}`} showBack backTo="/inventario" />

      <ScannerFeedback 
        type={feedback.type} 
        message={feedback.message} 
        onComplete={() => setFeedback({ type: 'none', message: '' })}
        duration={600}
      />
      
      {isScannerOpen && (
        <Scanner 
          onScan={(p) => {
            setSelectedProduct(p);
            setBarcode(p.id_interno);
            setIsScannerOpen(false);
            handleSearch();
          }} 
          onClose={() => setIsScannerOpen(false)} 
          title="Escanear Produto"
        />
      )}

      <main className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Header Info */}
        <div className="dy-card flex flex-col gap-4 border-t-2 border-t-dy-accent">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-black text-dy-white uppercase tracking-tighter">{inventory.inventario_id}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${
                  inventory.status === 'finalizado' ? 'text-dy-success border-dy-success/20 bg-dy-success/10' :
                  inventory.status === 'cancelado' ? 'text-dy-danger border-dy-danger/20 bg-dy-danger/10' :
                  'text-dy-accent border-dy-accent/20 bg-dy-accent/10'
                }`}>
                  {inventory.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-dy-gray-mid uppercase font-bold tracking-widest">
                Tipo: {inventory.tipo} | Filtro: {inventory.filtro}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-dy-gray-mid uppercase font-bold">Início: {new Date(inventory.data_inicio).toLocaleString()}</p>
              {inventory.data_fim && <p className="text-[10px] text-dy-gray-mid uppercase font-bold">Fim: {new Date(inventory.data_fim).toLocaleString()}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-dy-gray-dark/30">
            <div className="flex flex-col">
              <p className="text-[8px] text-dy-gray-mid uppercase font-bold">SKUs Únicos</p>
              <p className="text-lg font-black text-dy-white">{inventory.total_skus}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Itens Contados</p>
              <p className="text-lg font-black text-dy-white">{inventory.total_itens_contados}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Divergências</p>
              <p className={`text-lg font-black ${inventory.total_divergencias > 0 ? 'text-dy-danger' : 'text-dy-success'}`}>{inventory.total_divergencias}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Vlr. Ajuste Líquido</p>
              <p className={`text-lg font-black ${(inventory.valor_ajuste_positivo - inventory.valor_ajuste_negativo) >= 0 ? 'text-dy-success' : 'text-dy-danger'}`}>
                R$ {(inventory.valor_ajuste_positivo - inventory.valor_ajuste_negativo).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Start Button for 'aberto' status */}
        {inventory.status === 'aberto' && (
          <div className="dy-card bg-dy-accent/10 border-dy-accent/20 flex flex-col items-center justify-center py-10 gap-6">
            <div className="w-20 h-20 rounded-full bg-dy-accent/20 flex items-center justify-center text-dy-accent">
              <BarChart3 size={40} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-dy-white uppercase tracking-tighter">Inventário Pronto</h3>
              <p className="text-dy-gray-mid text-[10px] uppercase font-bold mt-1">Clique abaixo para iniciar a contagem</p>
            </div>
            <button 
              onClick={handleStartInventory}
              className="btn-dy-primary px-10 py-4 text-sm"
            >
              Iniciar Inventário
            </button>
          </div>
        )}

        {/* Counting Area */}
        {isEditable && inventory.status === 'em_andamento' && (
          <div className="flex flex-col gap-4">
            <div className="dy-card flex flex-col gap-4 bg-dy-accent/5 border-dy-accent/20">
              <div className="flex items-center gap-2 border-b border-dy-accent/20 pb-2">
                <BarChart3 size={16} className="text-dy-accent" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-dy-white">Registrar Contagem</h3>
              </div>

              {!selectedProduct ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                          className="input-dy w-full pl-10 text-lg"
                          placeholder="Bipar ou digitar código..."
                          autoFocus
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dy-gray-mid" size={20} />
                      </div>
                      <button 
                        onClick={() => setIsScannerOpen(true)}
                        className="p-3 bg-dy-gray-dark rounded-xl text-dy-accent hover:bg-dy-accent hover:text-white transition-all"
                      >
                        <Camera size={24} />
                      </button>
                      <button 
                        onClick={() => handleSearch()}
                        disabled={searching}
                        className="btn-dy-primary px-6 flex items-center justify-center"
                      >
                        {searching ? <Loader2 className="animate-spin" size={20} /> : 'OK'}
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-dy-gray-mid uppercase tracking-widest text-center">Local de Contagem</label>
                      <div className="grid grid-cols-4 gap-2">
                        {LOCALS.map(loc => (
                          <button
                            key={loc}
                            onClick={() => setSelectedLocal(loc)}
                            className={`py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-all border ${
                              selectedLocal === loc 
                                ? 'bg-dy-accent text-dy-black border-dy-accent' 
                                : 'bg-dy-black/40 text-dy-gray-mid border-dy-gray-dark hover:border-dy-accent/50'
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-4">
                    <div className="bg-dy-black/40 p-4 rounded-xl border border-dy-accent/30 flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-dy-accent uppercase font-bold">Produto Selecionado</p>
                        <p className="text-sm font-bold text-dy-white mt-1">{selectedProduct.descricao_completa || selectedProduct.descricao_base}</p>
                        <p className="text-[10px] text-dy-gray-mid uppercase">ID: {selectedProduct.id_interno} | EAN: {selectedProduct.ean}</p>
                      </div>
                      <button onClick={() => setSelectedProduct(null)} className="text-dy-gray-mid hover:text-dy-danger transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-dy-gray-mid uppercase tracking-widest text-center">Qtd. Física</label>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => setQty(Math.max(0, qty - 1))}
                            className="w-12 h-12 rounded-xl bg-dy-gray-dark flex items-center justify-center text-dy-white hover:bg-dy-gray-mid transition-colors"
                          >
                            <ChevronDown size={24} />
                          </button>
                          <input
                            type="number"
                            value={qty}
                            onChange={(e) => setQty(Number(e.target.value))}
                            className="flex-1 p-4 bg-dy-gray-dark border border-dy-gray-mid rounded-2xl text-4xl font-black text-center text-dy-white focus:outline-none focus:border-dy-accent"
                          />
                          <button 
                            onClick={() => setQty(qty + 1)}
                            className="w-12 h-12 rounded-xl bg-dy-gray-dark flex items-center justify-center text-dy-white hover:bg-dy-gray-mid transition-colors"
                          >
                            <ChevronUp size={24} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={handleSaveItem}
                      disabled={saving}
                      className="btn-dy-primary py-4 flex items-center justify-center gap-2 text-lg"
                    >
                      {saving ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
                      <span>Salvar Contagem</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={16} className="text-dy-gray-mid" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-dy-white">Itens Auditados</h3>
            </div>
            <span className="text-[10px] text-dy-gray-mid uppercase font-bold">{items.length} Registros</span>
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div key={`${item.id_interno}-${item.local}-${i}`} className="dy-card flex flex-col gap-3 group">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-dy-white uppercase">{item.id_interno}</p>
                    <p className="text-[9px] text-dy-gray-mid uppercase font-bold">{item.local}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Sistema</p>
                      <p className="text-xs font-bold text-dy-gray-light">{item.saldo_sistema}</p>
                    </div>
                    <ArrowRightLeft size={12} className="text-dy-gray-dark" />
                    <div className="text-right">
                      <p className="text-[8px] text-dy-gray-mid uppercase font-bold">Físico</p>
                      <p className="text-sm font-black text-dy-white">{item.saldo_fisico}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-dy-gray-dark/30">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      item.diferenca === 0 ? 'bg-dy-success/10 text-dy-success' : 
                      item.diferenca > 0 ? 'bg-blue-400/10 text-blue-400' : 
                      'bg-dy-danger/10 text-dy-danger'
                    }`}>
                      {item.diferenca > 0 ? '+' : ''}{item.diferenca} Dif.
                    </div>
                    <p className="text-[8px] text-dy-gray-mid uppercase font-bold">
                      Ajuste: <span className={item.valor_diferenca >= 0 ? 'text-dy-success' : 'text-dy-danger'}>
                        R$ {item.valor_diferenca.toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <p className="text-[8px] text-dy-gray-mid uppercase italic">
                    {item.usuario} • {new Date(item.auditado_em).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="py-10 text-center border-2 border-dashed border-dy-gray-dark rounded-2xl">
                <p className="text-dy-gray-mid text-[10px] uppercase font-bold tracking-widest">Nenhum item auditado ainda</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isEditable && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-6 border-t border-dy-gray-dark">
            <button 
              onClick={handleCancel}
              disabled={canceling}
              className="flex-1 py-4 flex items-center justify-center gap-2 bg-dy-danger/10 text-dy-danger border border-dy-danger/20 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-dy-danger hover:text-white transition-all"
            >
              {canceling ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
              Cancelar Inventário
            </button>
            <button 
              onClick={handleFinalize}
              disabled={finalizing}
              className="flex-[2] py-4 flex items-center justify-center gap-2 bg-dy-success text-dy-black rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-dy-success/90 transition-all shadow-lg shadow-dy-success/20"
            >
              {finalizing ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Finalizar e Atualizar Estoque
            </button>
          </div>
        )}

        {inventory.status === 'finalizado' && (
          <div className="dy-card bg-dy-success/10 border-dy-success/20 flex flex-col items-center justify-center py-6 gap-2">
            <CheckCircle2 size={32} className="text-dy-success" />
            <p className="text-dy-success font-black uppercase text-sm">Inventário Finalizado</p>
            <p className="text-dy-gray-mid text-[10px] uppercase font-bold">O estoque foi atualizado com sucesso</p>
          </div>
        )}
      </main>
    </div>
  );
};
