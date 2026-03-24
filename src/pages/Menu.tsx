import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ClipboardList, CheckSquare, BarChart3, Lightbulb, AlertCircle, History } from 'lucide-react';
import { Header } from '../components/Header';
import { MenuCard } from '../components/MenuCard';
import { apiService } from '../services/apiService';
import { useStore } from '../store/useStore';
import { Menu as MenuType } from '../types';

const ICON_MAP: Record<string, any> = {
  produtos: Package,
  separacao: ClipboardList,
  conferencia: CheckSquare,
  inventario: BarChart3,
  kit_lampada: Lightbulb,
  estoque: BarChart3,
  movimentos: History,
};

const ROUTE_MAP: Record<string, string> = {
  produtos: '/produtos',
  separacao: '/separacao',
  conferencia: '/conferencia',
  inventario: '/inventario',
  kit_lampada: '/kit-lampadas',
  estoque: '/estoque',
  movimentos: '/movimentos',
};

export const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { menus, setMenus } = useStore();
  const [loading, setLoading] = useState(menus.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      if (menus.length > 0) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiService.getMenus();
        setMenus(data);
      } catch (err) {
        setError('Erro ao carregar menus.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenus();
  }, [setMenus, menus.length]);

  return (
    <div className="min-h-screen bg-dy-black flex flex-col">
      <Header title="Menu Principal" showLogout showLogo />
      
      <main className="p-6 flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-2 border-dy-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-dy-danger/10 border border-dy-danger/20 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-dy-danger shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-dy-danger">Erro ao carregar menus</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-[10px] uppercase font-bold text-dy-danger mt-2 hover:underline"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 w-full">
            {menus
              .filter(m => m.chave !== 'movimentos' && m.nome.toUpperCase() !== 'MOVIMENTAÇÕES')
              .map((menu, index) => (
                <MenuCard 
                  key={`${menu.chave}-${index}`}
                  title={menu.chave === 'conferencia' ? 'CONFERÊNCIA' : menu.nome} 
                  icon={ICON_MAP[menu.chave] || Package} 
                  onClick={() => navigate(ROUTE_MAP[menu.chave] || '/menu')} 
                />
              ))}
            {menus.length === 0 && (
              <p className="col-span-2 text-dy-gray-mid text-center text-xs uppercase tracking-widest">Nenhum menu ativo encontrado</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
