import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { SearchInput } from '../components/SearchInput';
import { useStore } from '../store/useStore';
import { apiService } from '../services/apiService';
import { Lightbulb, AlertCircle, Car, Loader2, X, ZoomIn, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LampKit, Product } from '../types';
import { Scanner } from '../components/Scanner';

export const KitLampadas: React.FC = () => {
  const { lampKits, setLampKits } = useStore();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LampKit[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScan = (product: Product) => {
    setIsScannerOpen(false);
    // Use the EAN or ID from the scanned product to search for kits
    setSearch(product.ean || product.id_interno);
  };

  const fetchInitialKits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.listarKitsLampadas();
      setLampKits(data);
    } catch (err: any) {
      setError('Erro ao carregar kits. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (lampKits.length === 0) {
      fetchInitialKits();
    }
    // results starts empty
    setResults([]);
  }, []);

  // Local search in the store lampKits
  useEffect(() => {
    const trimmedSearch = search.trim().toLowerCase();
    if (trimmedSearch.length >= 2) {
      if (!Array.isArray(lampKits)) {
        setResults([]);
        return;
      }

      const filtered = lampKits.filter(k => {
        if (!k) return false;
        
        const montadora = String(k.montadora || '').toLowerCase();
        const modelo = String(k.modelo || '').toLowerCase();
        const ano_inicio = String(k.ano_inicio || '').toLowerCase();
        const ano_fim = String(k.ano_fim || '').toLowerCase();
        const baixo = String(k.baixo || '').toLowerCase();
        const alto = String(k.alto || '').toLowerCase();
        const neblina = String(k.neblina || '').toLowerCase();
        const lanterna = String(k.lanterna_pingo || '').toLowerCase();

        return (
          montadora.includes(trimmedSearch) ||
          modelo.includes(trimmedSearch) ||
          ano_inicio.includes(trimmedSearch) ||
          ano_fim.includes(trimmedSearch) ||
          baixo.includes(trimmedSearch) ||
          alto.includes(trimmedSearch) ||
          neblina.includes(trimmedSearch) ||
          lanterna.includes(trimmedSearch)
        );
      });
      setResults(filtered.slice(0, 50)); // Limit for performance
    } else {
      setResults([]);
    }
  }, [search, lampKits]);

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="Kit Lâmpadas" showBack backTo="/menu" />
      
      {isScannerOpen && (
        <Scanner 
          onScan={handleScan} 
          onClose={() => setIsScannerOpen(false)} 
          title="Buscar Kit por EAN"
        />
      )}

      <div className="p-4 sticky top-[64px] bg-dy-black/80 backdrop-blur-md z-40 border-b border-dy-gray-dark">
        <div className="flex flex-col gap-3">
          <SearchInput 
            value={search} 
            onChange={setSearch} 
            placeholder="Montadora, Modelo ou Ano..."
            onCameraClick={() => setIsScannerOpen(true)}
          />
        </div>
      </div>

      <main className="flex-1 p-4 max-w-3xl mx-auto w-full">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="w-8 h-8 text-dy-accent animate-spin" />
            <p className="text-dy-gray-mid text-[10px] uppercase tracking-widest">Buscando kits...</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-dy-accent/10 border border-dy-accent/20 p-4 rounded-xl mb-6 flex items-start gap-3">
            <AlertCircle className="text-dy-accent shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-dy-accent">Ops! Algo deu errado</p>
              <p className="text-xs text-dy-gray-light mt-1">{error}</p>
              <button 
                onClick={fetchInitialKits}
                className="text-[10px] uppercase font-bold text-dy-accent mt-2 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {!loading && results.map((kit, index) => (
            <div
              key={`${kit.modelo}-${index}`}
              className="dy-card flex flex-col gap-4 p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div 
                  onClick={() => kit.url && setSelectedImage(kit.url)}
                  className="w-20 h-20 bg-dy-black rounded-lg border border-dy-gray-dark flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group/img relative"
                >
                  {kit.url ? (
                    <>
                      <img 
                        src={kit.url} 
                        alt={kit.modelo} 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <Car size={32} className="text-dy-gray-dark" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-dy-accent/20 text-dy-accent px-2 py-0.5 rounded text-[13px] font-bold uppercase tracking-wider border border-dy-accent/30">
                      {kit.montadora}
                    </span>
                  </div>
                  <h3 className="font-bold text-[21px] text-dy-white leading-tight">
                    {kit.modelo}
                  </h3>
                  <p className="text-[15px] text-dy-gray-mid mt-1 uppercase font-bold tracking-widest">
                    {kit.ano_inicio} {kit.ano_fim ? `- ${kit.ano_fim}` : ''}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                <div className="bg-dy-black/50 border border-dy-gray-dark p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[12px] text-dy-gray-mid uppercase font-black tracking-tighter mb-1">Farol Baixo</span>
                  <span className="text-dy-accent font-bold text-[17px]">{kit.baixo || '-'}</span>
                </div>
                <div className="bg-dy-black/50 border border-dy-gray-dark p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[12px] text-dy-gray-mid uppercase font-black tracking-tighter mb-1">Farol Alto</span>
                  <span className="text-dy-accent font-bold text-[17px]">{kit.alto || '-'}</span>
                </div>
                <div className="bg-dy-black/50 border border-dy-gray-dark p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[12px] text-dy-gray-mid uppercase font-black tracking-tighter mb-1">Neblina</span>
                  <span className="text-dy-accent font-bold text-[17px]">{kit.neblina || '-'}</span>
                </div>
                <div className="bg-dy-black/50 border border-dy-gray-dark p-3 rounded-lg flex flex-col items-center text-center">
                  <span className="text-[12px] text-dy-gray-mid uppercase font-black tracking-tighter mb-1">Lanterna</span>
                  <span className="text-dy-accent font-bold text-[17px]">{kit.lanterna_pingo || '-'}</span>
                </div>
              </div>
            </div>
          ))}
          
          {search.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="text-center py-20">
              <Lightbulb size={48} className="mx-auto text-dy-gray-dark mb-4" />
              <p className="text-xs uppercase tracking-widest text-dy-gray-mid">Nenhum kit encontrado</p>
            </div>
          )}

          {search.trim().length < 2 && results.length === 0 && !loading && (
            <div className="text-center py-20 opacity-40">
              <Lightbulb size={48} className="mx-auto text-dy-gray-dark mb-4" />
              <p className="text-xs uppercase tracking-widest text-dy-gray-mid">Busque por montadora ou modelo</p>
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 text-white/70 hover:text-white p-2"
            >
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Zoom"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
