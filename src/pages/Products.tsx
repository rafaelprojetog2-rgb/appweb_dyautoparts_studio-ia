import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { SearchInput } from '../components/SearchInput';
import { useStore } from '../store/useStore';
import { apiService } from '../services/apiService';
import { ChevronRight, Package, AlertCircle, Loader2 } from 'lucide-react';
import { Product } from '../types';
import { Scanner } from '../components/Scanner';

export const Products: React.FC = () => {
  const navigate = useNavigate();
  const { products, setProducts } = useStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);

  const handleScan = (product: Product) => {
    setIsScannerOpen(false);
    navigate(`/produtos/${product.id_interno}`);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listarProdutos(2000);
      setProducts(data);
    } catch (err: any) {
      setError('Erro ao atualizar base de produtos. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, []);

  // Improved search logic with debouncing and server-side fallback
  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch.length < 2) {
      setResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      const s = trimmedSearch.toLowerCase();
      
      // 1. Local search - ALLOW PARTIAL MATCH FOR CATALOG DISCOVERY
      const localFiltered = products.filter(p => {
        if (!p) return false;
        
        const ean = String(p.ean || '').toLowerCase();
        const id = String(p.id_interno || '').toLowerCase();
        const sku = String(p.sku_fornecedor || '').toLowerCase();
        const name = String(p.descricao_completa || p.descricao_base || '').toLowerCase();

        // Exact match on codes (priority)
        if (ean === s || id === s || sku === s) return true;

        // Partial match on name or codes
        return name.includes(s) || ean.includes(s) || id.includes(s) || sku.includes(s);
      });

      setResults(localFiltered.slice(0, 50));

      // 2. Server search - ONLY if local results are few and we are online
      const { isOnline } = useStore.getState();
      if (isOnline && localFiltered.length < 10) {
        setLoading(true);
        try {
          const serverResults = await apiService.buscarProdutos(trimmedSearch, 50);
          setResults(prev => {
            const combined = [...prev];
            serverResults.forEach(sp => {
              if (!combined.find(lp => lp.id_interno === sp.id_interno)) {
                combined.push(sp);
              }
            });
            return combined.slice(0, 50);
          });
        } catch (e) {
          console.warn('Server search failed:', e);
        } finally {
          setLoading(false);
        }
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [search, products]);

  // Auto-navigate if exact match on EAN/ID/Name
  useEffect(() => {
    const trimmedSearch = search.trim().toLowerCase();
    if (trimmedSearch.length >= 4) {
      const exactMatch = results.find(p => {
        const ean = String(p.ean || '').trim().toLowerCase();
        const id = String(p.id_interno || '').trim().toLowerCase();
        const name = String(p.descricao_completa || p.descricao_base || '').trim().toLowerCase();
        
        return ean === trimmedSearch || 
               id === trimmedSearch || 
               name === trimmedSearch;
      });
      
      if (exactMatch && results.length === 1) { // Only auto-navigate if it's the only result
        navigate(`/produtos/${exactMatch.id_interno}`);
      }
    }
  }, [search, results, navigate]);

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="Consulta de Produtos" showBack backTo="/menu" />
      
      {isScannerOpen && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScannerOpen(false)} 
          title="Buscar Produto"
        />
      )}

      <div className="p-4 sticky top-[64px] bg-dy-black/80 backdrop-blur-md z-40 border-b border-dy-gray-dark">
        <div className="flex flex-col gap-3">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Nome, ID, EAN ou SKU..."
            onCameraClick={() => setIsScannerOpen(true)}
          />
        </div>
      </div>

      <main className="flex-1 p-1 sm:p-4 max-w-3xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-8 h-8 text-dy-accent animate-spin" />
            <p className="text-dy-gray-mid text-[10px] uppercase tracking-widest">Buscando produtos...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-dy-accent/10 border border-dy-accent/20 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="text-dy-accent shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-dy-accent">Ops! Algo deu errado</p>
              <p className="text-xs text-dy-gray-light mt-1">{error}</p>
              <button 
                onClick={fetchProducts}
                className="text-[10px] uppercase font-bold text-dy-accent mt-2 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {!loading && results.map((product, index) => (
            <button
              key={`${product.id_interno}-${index}`}
              onClick={() => navigate(`/produtos/${product.id_interno}`)}
              className="dy-card dy-card-hover flex items-center gap-4 text-left group px-4 py-6 sm:px-6"
            >
              <div className="w-16 h-16 bg-dy-black rounded-full border border-dy-gray-dark flex items-center justify-center shrink-0 overflow-hidden">
                {product.url_imagem ? (
                  <img 
                    src={product.url_imagem} 
                    alt={product.descricao_base} 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Package size={24} className="text-dy-gray-dark" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[17px] text-dy-white group-hover:text-dy-accent transition-colors">
                  {product.descricao_completa || product.descricao_base}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-[13px] text-dy-gray-light uppercase tracking-tighter">
                    <span className="text-dy-accent">SKU:</span> {product.sku_fornecedor} | <span className="text-dy-accent">EAN:</span> {product.ean}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[13px] text-dy-gray-light uppercase tracking-tighter">
                    <span className="text-dy-accent">COR:</span> {product.cor || 'N/A'} | <span className="text-dy-accent">MARCA:</span> {product.marca}
                  </p>
                </div>
                
                <div className="mt-2">
                  <span className="inline-block bg-dy-accent text-dy-black px-2 py-0.5 rounded font-black text-[13px] uppercase tracking-widest">
                    ID: {product.id_interno}
                  </span>
                </div>
              </div>
              
              <ChevronRight className="text-dy-gray-mid group-hover:text-dy-accent shrink-0" size={18} />
            </button>
          ))}
          
          {search.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-dy-gray-dark mb-4" />
              <p className="text-xs uppercase tracking-widest text-dy-gray-mid">Nenhum produto encontrado</p>
            </div>
          )}

          {search.trim().length < 2 && results.length === 0 && !loading && (
            <div className="text-center py-20 opacity-40">
              <Package size={48} className="mx-auto text-dy-gray-dark mb-4" />
              <p className="text-xs uppercase tracking-widest text-dy-gray-mid">Digite para buscar na base</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
