import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Product, Picking, InventoryEntry, SyncItem, LampKit, Menu, Channel, StockItem, Movement, InventoryMaster } from '../types';

interface AppState {
  currentUser: User | null;
  isOnline: boolean;
  products: Product[];
  productsCache: Record<string, Product>;
  lampKits: LampKit[];
  menus: Menu[];
  channels: Channel[];
  pickings: Picking[];
  inventory: InventoryEntry[];
  inventories: InventoryMaster[];
  syncQueue: SyncItem[];
  stock: StockItem[];
  movements: Movement[];
  
  setCurrentUser: (user: User | null) => void;
  setIsOnline: (status: boolean) => void;
  setProducts: (products: Product[]) => void;
  setProductsCache: (cache: Record<string, Product>) => void;
  setLampKits: (kits: LampKit[]) => void;
  setMenus: (menus: Menu[]) => void;
  setChannels: (channels: Channel[]) => void;
  addPicking: (picking: Picking) => void;
  updatePicking: (id: string, updates: Partial<Picking>) => void;
  addInventory: (entry: InventoryEntry) => void;
  addToSyncQueue: (item: SyncItem) => void;
  removeFromSyncQueue: (id: string) => void;
  setStock: (stock: StockItem[]) => void;
  setMovements: (movements: Movement[]) => void;
  setPickings: (pickings: Picking[]) => void;
  setInventories: (inventories: InventoryMaster[]) => void;
  clearPickings: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      isOnline: navigator.onLine,
      products: [],
      productsCache: {},
      lampKits: [],
      menus: [],
      channels: [],
      pickings: [],
      inventory: [],
      syncQueue: [],
      stock: [],
      movements: [],
      inventories: [],

      setCurrentUser: (user) => set({ currentUser: user }),
      setIsOnline: (status) => set({ isOnline: status }),
      setProducts: (products) => set((state) => {
        const newCache = { ...state.productsCache };
        products.forEach(p => {
          if (p.id_interno) newCache[p.id_interno] = p;
          if (p.ean) newCache[p.ean] = p;
        });
        return { products, productsCache: newCache };
      }),
      setProductsCache: (productsCache) => set({ productsCache }),
      setLampKits: (lampKits) => set({ lampKits }),
      setMenus: (menus) => set({ menus }),
      setChannels: (channels) => set({ channels }),
      addPicking: (picking) => set((state) => ({ pickings: [picking, ...state.pickings] })),
      updatePicking: (id, updates) => set((state) => ({
        pickings: state.pickings.map(p => p.rom_id === id ? { ...p, ...updates } : p)
      })),
      setPickings: (pickings) => set({ pickings }),
      clearPickings: () => set({ pickings: [] }),
      addInventory: (entry) => set((state) => ({ inventory: [entry, ...state.inventory] })),
      addToSyncQueue: (item) => set((state) => ({ syncQueue: [...state.syncQueue, item] })),
      removeFromSyncQueue: (id) => set((state) => ({
        syncQueue: state.syncQueue.filter(item => item.id !== id)
      })),
      setStock: (stock) => set({ stock }),
      setMovements: (movements) => set({ movements }),
      setInventories: (inventories) => set({ inventories }),
    }),
    {
      name: 'dy-auto-parts-storage',
      partialize: (state) => {
        const { currentUser, ...rest } = state;
        return rest;
      },
    }
  )
);
