import { Product, LampKit, User, Menu, Channel, StockItem, Movement, InventoryMaster, InventoryItem, Picking, PickingItem } from '../types';
import { API_CONFIG } from './apiConfig';

export interface ApiResponse<T> {
  ok: boolean;
  message?: string;
  total?: number;
  items?: T[];
  item?: T;
}

class ApiService {
  async fetchApi<T>(action: string, params: Record<string, string> = {}): Promise<ApiResponse<T>> {
    const url = new URL(API_CONFIG.BASE_URL);
    url.searchParams.append('action', action.toLowerCase());
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição API (${action}):`, error);
      throw error;
    }
  }

  private async postApi<T>(action: string, data: any): Promise<ApiResponse<T>> {
    try {
      const payload = JSON.stringify({ ...data, action: action.toLowerCase() });
      const response = await fetch(`${API_CONFIG.BASE_URL}`, {
        method: 'POST',
        redirect: 'follow',
        body: new URLSearchParams({ payload })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Erro na requisição POST (${action}):`, error);
      throw error;
    }
  }

  async verificarSaudeApi(): Promise<boolean> {
    try {
      const data = await this.fetchApi<any>('health');
      return data.ok;
    } catch (error) {
      return false;
    }
  }

  async getUsers(): Promise<User[]> {
    const cached = localStorage.getItem('dy_users_cache');
    const cacheTime = localStorage.getItem('dy_users_cache_time');
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<User>('listusers');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar usuários');
      const items = (data.items || []).filter(u => 
        u.status && u.status.toLowerCase().trim() === 'ativo'
      );
      
      localStorage.setItem('dy_users_cache', JSON.stringify(items));
      localStorage.setItem('dy_users_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async getMenus(): Promise<Menu[]> {
    const cached = localStorage.getItem('dy_menus_cache');
    const cacheTime = localStorage.getItem('dy_menus_cache_time');
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<Menu>('listmenus');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar menus');
      const items = (data.items || [])
        .filter(m => m.status && m.status.toLowerCase().trim() === 'ativo')
        .sort((a, b) => a.ordem - b.ordem);
      
      localStorage.setItem('dy_menus_cache', JSON.stringify(items));
      localStorage.setItem('dy_menus_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async getCanaisEnvio(): Promise<Channel[]> {
    const cached = localStorage.getItem('dy_channels_cache');
    const cacheTime = localStorage.getItem('dy_channels_cache_time');
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<Channel>('listcanaisenvio');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar canais de envio');
      const items = (data.items || []).filter(c => 
        c.status && c.status.toLowerCase().trim() === 'ativo'
      );
      
      localStorage.setItem('dy_channels_cache', JSON.stringify(items));
      localStorage.setItem('dy_channels_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async listarProdutos(limit: number = 2000): Promise<Product[]> {
    const cached = localStorage.getItem('dy_products_cache');
    const cacheTime = localStorage.getItem('dy_products_cache_time');
    const CACHE_DURATION = 1000 * 60 * 60; // 1 hora
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<Product>('list', { limit: limit.toString() });
      if (!data.ok) throw new Error(data.message || 'Erro ao listar produtos');
      
      const items = data.items || [];
      localStorage.setItem('dy_products_cache', JSON.stringify(items));
      localStorage.setItem('dy_products_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async buscarProdutos(q: string, limit: number = 20, signal?: AbortSignal): Promise<Product[]> {
    try {
      const data = await this.fetchApi<Product>('search', { q, limit: limit.toString() });
      if (!data.ok) throw new Error(data.message || 'Erro ao buscar produtos');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async buscarProdutoPorId(id: string): Promise<Product | null> {
    try {
      const data = await this.fetchApi<Product>('getbyid', { id });
      if (!data.ok) return null;
      return data.item || null;
    } catch (error) {
      return null;
    }
  }

  async searchLampKits(params: { q?: string; montadora?: string; modelo?: string; ano?: string }): Promise<LampKit[]> {
    try {
      const data = await this.fetchApi<LampKit>('searchlampkits', params as Record<string, string>);
      if (!data.ok) throw new Error(data.message || 'Erro ao buscar kits de lâmpadas');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async listarKitsLampadas(): Promise<LampKit[]> {
    const cached = localStorage.getItem('dy_lamp_kits_cache');
    const cacheTime = localStorage.getItem('dy_lamp_kits_cache_time');
    const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 horas
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<LampKit>('listlampkits', { limit: '1000' });
      if (!data.ok) throw new Error(data.message || 'Erro ao listar kits de lâmpadas');
      const items = data.items || [];
      
      localStorage.setItem('dy_lamp_kits_cache', JSON.stringify(items));
      localStorage.setItem('dy_lamp_kits_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async syncItem(item: any): Promise<boolean> {
    try {
      const data = await this.postApi<any>('sync', item);
      return data.ok;
    } catch (error) {
      console.error('Erro ao sincronizar item:', error);
      return false;
    }
  }

  async listEstoque(): Promise<StockItem[]> {
    const cached = localStorage.getItem('dy_stock_cache');
    const cacheTime = localStorage.getItem('dy_stock_cache_time');
    const CACHE_DURATION = 1000 * 60 * 10; // 10 minutos
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<StockItem>('listestoque');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar estoque');
      const items = data.items || [];
      
      localStorage.setItem('dy_stock_cache', JSON.stringify(items));
      localStorage.setItem('dy_stock_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async searchEstoque(q: string): Promise<StockItem[]> {
    try {
      const data = await this.fetchApi<StockItem>('searchestoque', { q });
      if (!data.ok) throw new Error(data.message || 'Erro ao buscar estoque');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async getEstoque(id_interno: string): Promise<StockItem[]> {
    try {
      const data = await this.fetchApi<StockItem>('getestoque', { id_interno });
      if (!data.ok) throw new Error(data.message || 'Erro ao obter estoque');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async listMovimentos(): Promise<Movement[]> {
    const cached = localStorage.getItem('dy_movements_cache');
    const cacheTime = localStorage.getItem('dy_movements_cache_time');
    const CACHE_DURATION = 1000 * 60 * 5; // 5 minutos
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<Movement>('listmovimentos');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar movimentos');
      const items = data.items || [];
      
      localStorage.setItem('dy_movements_cache', JSON.stringify(items));
      localStorage.setItem('dy_movements_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async searchMovimentos(id_interno: string): Promise<Movement[]> {
    try {
      const data = await this.fetchApi<Movement>('searchmovimentos', { id_interno });
      if (!data.ok) throw new Error(data.message || 'Erro ao buscar movimentos');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async registrarMovimento(movimento: Movement): Promise<boolean> {
    try {
      const data = await this.postApi<any>('registrarmovimento', movimento);
      return data.ok;
    } catch (error) {
      console.error('Erro ao registrar movimento:', error);
      return false;
    }
  }

  // Módulo de Inventário Estruturado
  async listInventarios(): Promise<InventoryMaster[]> {
    const cached = localStorage.getItem('dy_inventories_cache');
    const cacheTime = localStorage.getItem('dy_inventories_cache_time');
    const CACHE_DURATION = 1000 * 60 * 10; // 10 minutos
    
    if (cached && cacheTime) {
      const isRecent = Date.now() - parseInt(cacheTime) < CACHE_DURATION;
      if (isRecent) {
        try { return JSON.parse(cached); } catch (e) {}
      }
    }

    try {
      const data = await this.fetchApi<InventoryMaster>('listinventarios');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar inventários');
      const items = data.items || [];
      
      localStorage.setItem('dy_inventories_cache', JSON.stringify(items));
      localStorage.setItem('dy_inventories_cache_time', Date.now().toString());
      
      return items;
    } catch (error) {
      if (cached) try { return JSON.parse(cached); } catch (e) {}
      throw error;
    }
  }

  async getInventario(id: string): Promise<InventoryMaster | null> {
    try {
      const data = await this.fetchApi<InventoryMaster>('getinventario', { id });
      if (!data.ok) return null;
      return data.item || null;
    } catch (error) {
      return null;
    }
  }

  async listInventarioItens(inventarioId: string): Promise<InventoryItem[]> {
    try {
      const data = await this.fetchApi<InventoryItem>('listinventarioitens', { inventario_id: inventarioId });
      if (!data.ok) throw new Error(data.message || 'Erro ao listar itens do inventário');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async cancelarInventario(id: string, usuario: string): Promise<boolean> {
    try {
      const data = await this.postApi<any>('cancelarinventario', { inventario_id: id, usuario });
      return data.ok;
    } catch (error) {
      console.error('Erro ao cancelar inventário:', error);
      return false;
    }
  }

  async updateInventarioStatus(id: string, status: string): Promise<boolean> {
    try {
      const data = await this.fetchApi<any>('updateinventariostatus', { id, status });
      return data.ok;
    } catch (error) {
      return false;
    }
  }

  async buscarProdutoExato(code: string): Promise<Product | null> {
    try {
      const data = await this.fetchApi<Product>('getproductexact', { code });
      if (!data.ok) return null;
      return data.item || null;
    } catch (error) {
      return null;
    }
  }

  async criarInventario(inventario: Partial<InventoryMaster>): Promise<InventoryMaster> {
    try {
      const data = await this.postApi<any>('criarinventario', {
        tipo: inventario.tipo || 'geral',
        filtro: inventario.filtro || 'todos',
        usuario: inventario.criado_por || 'sistema'
      });
      
      if (!data.ok) throw new Error(data.message || 'Erro ao criar inventário');
      
      return {
        ...inventario,
        inventario_id: (data as any).inventario_id,
        status: 'em_andamento',
        data_inicio: new Date().toISOString(),
        total_skus: 0,
        total_itens_contados: 0,
        total_divergencias: 0,
        valor_ajuste_positivo: 0,
        valor_ajuste_negativo: 0
      } as InventoryMaster;
    } catch (error) {
      console.error('Erro ao criar inventário:', error);
      throw error;
    }
  }

  async registrarItemInventario(item: InventoryItem, valorUnitario: number): Promise<boolean> {
    try {
      const data = await this.postApi<any>('salvariteminventario', {
        inventario_id: item.inventario_id,
        id_interno: item.id_interno,
        local: item.local,
        saldo_sistema: item.saldo_sistema,
        saldo_fisico: item.saldo_fisico,
        valor_unitario: valorUnitario,
        usuario: item.usuario
      });
      return data.ok;
    } catch (error) {
      console.error('Erro ao registrar item no inventário:', error);
      return false;
    }
  }

  async finalizarInventario(id: string, usuario: string): Promise<boolean> {
    try {
      const data = await this.postApi<any>('finalizarinventario', { inventario_id: id, usuario });
      return data.ok;
    } catch (error) {
      console.error('Erro ao finalizar inventário:', error);
      return false;
    }
  }

  async clearPickings(): Promise<boolean> {
    try {
      const data = await this.postApi<any>('clearpickings', {});
      return data.ok;
    } catch (error) {
      console.error('Erro ao limpar separações:', error);
      return false;
    }
  }

  async listPickings(): Promise<Picking[]> {
    try {
      const data = await this.fetchApi<Picking>('listpickings');
      if (!data.ok) throw new Error(data.message || 'Erro ao listar separações');
      return data.items || [];
    } catch (error) {
      return [];
    }
  }

  async criarSeparacao(picking: Partial<Picking>): Promise<string> {
    try {
      const data = await this.postApi<any>('criarseparacao', {
        rom_id: picking.rom_id,
        canal_id: picking.canal_id,
        canal_nome: picking.canal_nome,
        usuario: picking.criado_por,
        observacao: picking.observacao
      });
      if (!data.ok) throw new Error(data.message || 'Erro ao criar separação');
      return (data as any).rom_id;
    } catch (error) {
      console.error('Erro ao criar separação:', error);
      throw error;
    }
  }

  async salvarItemSeparacao(item: PickingItem, localOrigem: string, usuario: string): Promise<boolean> {
    try {
      const data = await this.postApi<any>('salvaritemseparacao', {
        rom_id: item.rom_id,
        id_interno: item.id_interno,
        ean: item.ean,
        descricao: item.descricao,
        qtd_solicitada: item.qtd_solicitada,
        qtd_separada: item.qtd_separada,
        local_origem: localOrigem,
        usuario: usuario
      });
      return data.ok;
    } catch (error) {
      console.error('Erro ao salvar item da separação:', error);
      return false;
    }
  }

  async finalizarSeparacao(romId: string): Promise<boolean> {
    try {
      const data = await this.postApi<any>('finalizarseparacao', { rom_id: romId });
      return data.ok;
    } catch (error) {
      console.error('Erro ao finalizar separação:', error);
      return false;
    }
  }

  async salvarConferencia(item: PickingItem, usuario: string): Promise<boolean> {
    try {
      const data = await this.postApi<any>('salvarconferencia', {
        rom_id: item.rom_id,
        id_interno: item.id_interno,
        ean: item.ean,
        descricao: item.descricao,
        qtd_separada: item.qtd_separada,
        qtd_conferida: item.qtd_conferida,
        usuario: usuario
      });
      return data.ok;
    } catch (error) {
      console.error('Erro ao salvar conferência:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();
