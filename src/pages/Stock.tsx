import React, { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { apiService } from '../services/apiService';
import { StockItem, Product } from '../types';
import { Search, Package, MapPin, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

export const Stock: React.FC = () => {
  const { products, stock, setStock } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const fetchStock = async (query?: string) => {
    setLoading(true);
    setError(null);
    try {
      let data: StockItem[];
      if (query) {
        data = await apiService.searchEstoque(query);
      } else {
        data = await apiService.listEstoque();
      }
      setStock(data);
    } catch (err) {
      setError('Erro ao carregar estoque da API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stock.length === 0) {
      fetchStock();
    }
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Effect to trigger server search if needed
  useEffect(() => {
    const s = debouncedSearch.trim();
    if (s.length === 0) {
      // If cleared, reload full list if it was filtered
      if (stock.length < 50) fetchStock();
      return;
    }

    // If it looks like a code (EAN or ID) and we have few results, search server
    const isCode = /^\d+$/.test(s) || s.length >= 8;
    const localResults = stock.filter(item => {
      const product = products.find(p => p.id_interno === item.id_interno);
      const id = item.id_interno.toLowerCase();
      const ean = (product?.ean || '').toLowerCase();
      return id === s.toLowerCase() || ean === s.toLowerCase();
    });

    if (isCode && localResults.length === 0) {
      fetchStock(s);
    }
  }, [debouncedSearch]);

  const filteredStock = stock.filter(item => {
    const product = products.find(p => p.id_interno === item.id_interno);
    const s = searchTerm.trim().toLowerCase();
    if (s.length === 0) return true;

    const id = item.id_interno.toLowerCase();
    const local = item.local.toLowerCase();
    const desc = ((product?.descricao_base || '') + ' ' + (product?.descricao_completa || '')).toLowerCase();
    const ean = (product?.ean || '').toLowerCase();

    // Exact match on codes
    if (id === s || ean === s) return true;

    // Multi-word search
    const words = s.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
      return words.every(word => 
        id.includes(word) || local.includes(word) || desc.includes(word) || ean.includes(word)
      );
    }

    return id.includes(s) || local.includes(s) || desc.includes(s) || ean.includes(s);
  }).sort((a, b) => {
    const s = searchTerm.trim().toLowerCase();
    const productA = products.find(p => p.id_interno === a.id_interno);
    const productB = products.find(p => p.id_interno === b.id_interno);
    
    const idA = a.id_interno.toLowerCase();
    const idB = b.id_interno.toLowerCase();
    const eanA = (productA?.ean || '').toLowerCase();
    const eanB = (productB?.ean || '').toLowerCase();

    // Exact match priority
    if (idA === s || eanA === s) return -1;
    if (idB === s || eanB === s) return 1;

    return 0;
  });

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="Consulta de Estoque" showBack backTo="/menu" />
      
      <div className="p-4 bg-dy-graphite border-b border-dy-gray-dark flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dy-gray-mid" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto ou local..."
            className="input-dy w-full pl-10"
          />
        </div>
        <button 
          onClick={fetchStock} 
          disabled={loading}
          className="flex items-center justify-center gap-2 text-dy-accent text-[10px] uppercase font-bold tracking-widest hover:underline disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar Dados
        </button>
      </div>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full overflow-auto">
        {loading && stock.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-dy-accent" size={32} />
            <p className="text-dy-gray-mid text-xs uppercase tracking-widest">Consultando API...</p>
          </div>
        ) : error ? (
          <div className="bg-dy-danger/10 border border-dy-danger/20 p-6 rounded-2xl flex flex-col items-center gap-4 text-center">
            <AlertCircle className="text-dy-danger" size={32} />
            <div>
              <p className="text-dy-danger font-bold uppercase tracking-wider text-sm">Falha na Conexão</p>
              <p className="text-dy-gray-light text-xs mt-1">{error}</p>
            </div>
            <button onClick={fetchStock} className="btn-dy-primary py-2 px-6 text-xs">Tentar Novamente</button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center px-2">
              <p className="text-[10px] font-bold text-dy-gray-mid uppercase tracking-widest">
                {filteredStock.length} Registros Encontrados
              </p>
            </div>

            {filteredStock.map((item, idx) => {
              const product = products.find(p => p.id_interno === item.id_interno);
              return (
                <div key={idx} className="dy-card flex flex-col gap-4 border-l-4 border-l-dy-accent">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package size={14} className="text-dy-accent" />
                        <p className="font-bold text-dy-white text-sm">
                          {product?.descricao_completa || product?.descricao_base || 'Produto não identificado'}
                        </p>
                      </div>
                      <p className="text-[10px] text-dy-gray-light uppercase tracking-tighter">SKU: {item.id_interno}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-dy-gray-dark px-2 py-1 rounded-lg">
                      <MapPin size={12} className="text-dy-accent" />
                      <span className="text-[10px] font-bold text-dy-white uppercase">{item.local}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-dy-gray-dark/50">
                    <p className="text-[9px] text-dy-gray-mid uppercase">Atualizado em: {new Date(item.atualizado_em).toLocaleString()}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-dy-gray-light uppercase font-bold">Total:</span>
                      <span className="text-lg font-black text-dy-white">{item.saldo_total}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredStock.length === 0 && (
              <div className="text-center py-20 text-dy-gray-mid">
                <Package className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-xs uppercase tracking-widest">Nenhum item de estoque encontrado</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
