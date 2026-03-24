import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { useStore } from '../store/useStore';
import { apiService } from '../services/apiService';
import { Package, Info, Layers, AlertCircle } from 'lucide-react';
import { Product, StockItem } from '../types';

export const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const { products } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [apiStock, setApiStock] = useState<StockItem[]>([]);
  const [equivalentProducts, setEquivalentProducts] = useState<Product[]>([]);
  const [equivalentStockData, setEquivalentStockData] = useState<Record<string, StockItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isImageOpen, setIsImageOpen] = useState(false);
  
  useEffect(() => {
    const fetchProductAndEquivalents = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // 1. Buscar o produto lido (do store ou API)
        let currentProduct = products.find(p => p.id_interno === id);
        if (!currentProduct) {
          currentProduct = await apiService.buscarProdutoPorId(id) || undefined;
        }

        if (!currentProduct) {
          setError('Produto não encontrado na base de dados.');
          setLoading(false);
          return;
        }

        setProduct(currentProduct);

        // 2. Identificar produtos equivalentes
        // Regra: descricao_base + atributos/valores iguais
        const equivalents = products.filter(p => 
          p.descricao_base === currentProduct?.descricao_base &&
          p.atributo1 === currentProduct?.atributo1 &&
          p.valor1 === currentProduct?.valor1 &&
          p.atributo2 === currentProduct?.atributo2 &&
          p.valor2 === currentProduct?.valor2 &&
          p.atributo3 === currentProduct?.atributo3 &&
          p.valor3 === currentProduct?.valor3 &&
          p.atributo4 === currentProduct?.atributo4 &&
          p.valor4 === currentProduct?.valor4
        );
        
        setEquivalentProducts(equivalents);

        // 3. Buscar estoque de TODOS os equivalentes em paralelo
        const stockPromises = equivalents.map(p => apiService.getEstoque(p.id_interno));
        const allStockResults = await Promise.all(stockPromises);

        const stockMap: Record<string, StockItem[]> = {};
        equivalents.forEach((p, index) => {
          stockMap[p.id_interno] = allStockResults[index] || [];
        });

        setEquivalentStockData(stockMap);
        setApiStock(stockMap[id] || []);

      } catch (err: any) {
        setError(err.message || 'Erro ao carregar detalhes do produto.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndEquivalents();
  }, [id, products]);

  if (loading && !product) {
    return (
      <div className="min-h-screen bg-dy-black flex flex-col">
        <Header title="Carregando..." showBack />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-8 h-8 border-4 border-dy-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs uppercase tracking-widest text-dy-gray-light">Buscando detalhes...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-dy-black flex flex-col">
        <Header title="Erro" showBack />
        <div className="p-10 text-center flex flex-col items-center gap-4">
          <AlertCircle size={48} className="text-dy-accent" />
          <p className="text-dy-accent font-bold uppercase tracking-widest">
            {error || 'Produto não encontrado'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-dy-primary px-6"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  const attributes = [
    { label: product.atributo1, value: product.valor1 },
    { label: product.atributo2, value: product.valor2 },
    { label: product.atributo3, value: product.valor3 },
    { label: product.atributo4, value: product.valor4 },
  ].filter(attr => attr.label && attr.value);

  // Consolidação de Estoque
  const consolidatedStock = (Object.values(equivalentStockData).flat() as StockItem[]);
  const totalConsolidated = consolidatedStock.reduce((acc, curr) => acc + curr.saldo_total, 0);
  const totalAvailable = consolidatedStock.reduce((acc, curr) => acc + curr.saldo_disponivel, 0);
  const totalReserved = consolidatedStock.reduce((acc, curr) => acc + curr.saldo_reservado, 0);

  // Agrupamento por Marca
  const stockByBrand: Record<string, { total: number; locations: Record<string, number> }> = {};
  
  equivalentProducts.forEach(p => {
    const brand = p.marca || 'Sem Marca';
    if (!stockByBrand[brand]) {
      stockByBrand[brand] = { total: 0, locations: {} };
    }
    
    const productStock = equivalentStockData[p.id_interno] || [];
    productStock.forEach(s => {
      stockByBrand[brand].total += s.saldo_total;
      stockByBrand[brand].locations[s.local] = (stockByBrand[brand].locations[s.local] || 0) + s.saldo_total;
    });
  });

  const STANDARD_LOCATIONS = ['TÉRREO', '1° ANDAR', 'DEFEITO', 'MOSTRUARIO'];
  
  // Transform apiStock to ensure all standard locations are present for the current product
  const displayStock = STANDARD_LOCATIONS.map(loc => {
    const items = apiStock.filter(s => s.local.toUpperCase() === loc.toUpperCase());
    return {
      local: loc,
      saldo_disponivel: items.reduce((acc, curr) => acc + curr.saldo_disponivel, 0),
      saldo_reservado: items.reduce((acc, curr) => acc + curr.saldo_reservado, 0),
      saldo_total: items.reduce((acc, curr) => acc + curr.saldo_total, 0),
    };
  });

  // Add any other locations found in apiStock that are not in STANDARD_LOCATIONS
  apiStock.forEach(s => {
    if (!STANDARD_LOCATIONS.some(loc => loc.toUpperCase() === s.local.toUpperCase())) {
      const existing = displayStock.find(d => d.local.toUpperCase() === s.local.toUpperCase());
      if (!existing) {
        displayStock.push({
          local: s.local,
          saldo_disponivel: s.saldo_disponivel,
          saldo_reservado: s.saldo_reservado,
          saldo_total: s.saldo_total,
        });
      }
    }
  });

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="Detalhes do Item" showBack backTo="/produtos" />
      
      {/* Image Modal */}
      {isImageOpen && product.url_imagem && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsImageOpen(false)}
        >
          <img 
            src={product.url_imagem} 
            alt={product.descricao_base} 
            className="max-w-full max-h-full object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
          <button className="absolute top-6 right-6 text-white p-2 bg-white/10 rounded-full">
            <Package size={24} />
          </button>
        </div>
      )}

      <main className="p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Identificação Principal */}
        <div className="dy-card flex gap-6 items-start">
          <button 
            onClick={() => setIsImageOpen(true)}
            className="w-24 h-24 bg-dy-black rounded-xl flex items-center justify-center text-dy-gray-dark overflow-hidden border border-dy-gray-dark shrink-0"
          >
            {product.url_imagem ? (
              <img src={product.url_imagem} alt={product.descricao_base} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Package size={40} />
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center justify-end mb-1">
              <span className={`badge-dy ${product.status === 'Ativo' ? 'bg-dy-success/20 text-dy-success' : 'bg-dy-gray-mid/20 text-dy-gray-mid'}`}>
                {product.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-dy-white leading-tight">{product.descricao_completa || product.descricao_base}</h2>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              <p className="text-[10px] text-dy-gray-light uppercase">
                <span className="text-dy-accent">SKU:</span> {product.sku_fornecedor}
              </p>
              <p className="text-[10px] text-dy-gray-light uppercase">
                <span className="text-dy-accent">EAN:</span> {product.ean}
              </p>
            </div>
            <div className="mt-2">
              <span className="inline-block bg-dy-accent text-dy-black px-2 py-0.5 rounded font-black text-[10px] uppercase tracking-widest">
                ID: {product.id_interno}
              </span>
            </div>
          </div>
        </div>

        {/* Preços e Estoque Total */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="dy-card border-l-4 border-l-dy-accent bg-dy-accent/5 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-dy-gray-light mb-1">Preço Varejo</p>
              <p className="text-4xl font-black text-dy-accent">R$ {product.preco_varejo?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-dy-gray-dark/30 flex justify-between items-end">
              <div>
                <p className="text-[9px] uppercase font-bold text-dy-gray-mid">Atacado (min {product.qtd_minima_atacado} un)</p>
                <p className="text-xl font-bold text-dy-white">R$ {product.preco_atacado?.toFixed(2) || '0.00'}</p>
              </div>
              <p className="text-[10px] text-dy-gray-mid italic">Un: {product.unidade}</p>
            </div>
          </div>
          <div className="dy-card border-l-4 border-l-dy-success bg-dy-success/5">
            <p className="text-[10px] uppercase font-bold text-dy-gray-light mb-1">Estoque Consolidado (Equivalentes)</p>
            <p className="text-4xl font-black text-dy-success">{totalConsolidated} <span className="text-lg font-bold uppercase">{product.unidade}</span></p>
            <div className="flex gap-4 mt-2">
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Detalhamento de Estoque */}
          <div className="dy-card flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-dy-gray-dark pb-2">
              <Layers size={16} className="text-dy-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-dy-white">Posição por Local</h3>
            </div>
            
            <div className="flex flex-col gap-2">
              {displayStock.map((stock, i) => (
                <div key={i} className={`bg-dy-black/40 p-3 rounded-xl border flex justify-between items-center ${stock.saldo_total > 0 ? 'border-dy-accent/30' : 'border-dy-gray-dark'}`}>
                  <div>
                    <p className="text-[10px] text-dy-gray-mid uppercase font-bold mb-1">{stock.local}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black ${stock.saldo_total > 0 ? 'text-dy-white' : 'text-dy-gray-dark'}`}>{stock.saldo_total}</p>
                    <p className="text-[8px] text-dy-gray-mid uppercase">Total</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Técnicas */}
          <div className="dy-card flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-dy-gray-dark pb-2">
              <Info size={16} className="text-dy-accent" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-dy-white">Ficha Técnica</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-[10px] text-dy-gray-mid uppercase">Marca</p>
                <p className="text-sm font-bold text-dy-white">{product.marca}</p>
              </div>
              <div>
                <p className="text-[10px] text-dy-gray-mid uppercase">Cor</p>
                <p className="text-sm font-bold text-dy-white">{product.cor || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-dy-gray-mid uppercase">Categoria</p>
                <p className="text-sm font-bold text-dy-white">{product.categoria}</p>
              </div>
              <div>
                <p className="text-[10px] text-dy-gray-mid uppercase">Subcategoria</p>
                <p className="text-sm font-bold text-dy-white">{product.subcategoria}</p>
              </div>
            </div>

            {attributes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-dy-gray-dark grid grid-cols-2 gap-4">
                {attributes.map((attr, i) => (
                  <div key={i}>
                    <p className="text-[10px] text-dy-gray-mid uppercase">{attr.label}</p>
                    <p className="text-sm font-bold text-dy-white">{attr.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Estoque por Marca */}
        <div className="dy-card flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-dy-gray-dark pb-2">
            <Package size={16} className="text-dy-accent" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-dy-white">Estoque por Marca</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(stockByBrand).map(([brand, data], i) => (
              <div key={i} className="bg-dy-black/40 p-4 rounded-xl border border-dy-gray-dark">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-bold text-dy-white uppercase">{brand}</p>
                  <p className="text-xl font-black text-dy-accent">{data.total}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dy-gray-dark/30">
                  {Object.entries(data.locations).map(([loc, qty], j) => (
                    <div key={j} className="flex justify-between items-center">
                      <span className="text-[9px] text-dy-gray-mid uppercase">{loc}</span>
                      <span className="text-[10px] font-bold text-dy-white">{qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Observações */}
        {product.observacoes && (
          <div className="dy-card bg-dy-gray-dark/30 border-dashed">
            <p className="text-[10px] text-dy-gray-mid uppercase mb-1">Observações</p>
            <p className="text-xs italic text-dy-gray-light">{product.observacoes}</p>
          </div>
        )}
      </main>
    </div>
  );
};
