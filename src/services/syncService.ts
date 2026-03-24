import { useStore } from '../store/useStore';
import { apiService } from './apiService';

export const syncService = {
  async syncItem(item: any) {
    return await apiService.syncItem(item);
  },

  async processQueue() {
    const { syncQueue, removeFromSyncQueue, isOnline } = useStore.getState();
    
    if (!isOnline || syncQueue.length === 0) return;

    console.log(`Processando fila de sincronização: ${syncQueue.length} itens`);
    
    for (const item of syncQueue) {
      try {
        await this.syncItem(item);
        removeFromSyncQueue(item.id);
      } catch (error) {
        console.error('Erro ao sincronizar item:', item.id, error);
        break; // Para se houver erro
      }
    }
  }
};
