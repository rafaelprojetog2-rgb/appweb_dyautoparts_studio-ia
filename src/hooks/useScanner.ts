import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Product } from '../types';

export type ScannerFeedbackType = 'success' | 'error' | 'warning' | 'processing' | 'none';

interface ScannerState {
  type: ScannerFeedbackType;
  message: string;
}

export const useScanner = () => {
  const { products } = useStore();
  const [feedback, setFeedback] = useState<ScannerState>({ type: 'none', message: '' });
  const lastScanTime = useRef<number>(0);
  const lastScanCode = useRef<string>('');
  const COOLDOWN = 1000; // 1 second between scans of the same code

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
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const vibrate = (type: 'success' | 'error') => {
    if ('vibrate' in navigator) {
      if (type === 'success') {
        navigator.vibrate(100);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }
  };

  const processScan = useCallback(async (code: string): Promise<Product | null> => {
    const now = Date.now();
    
    // Prevent duplicate scans within cooldown period
    if (code === lastScanCode.current && now - lastScanTime.current < COOLDOWN) {
      return null;
    }

    lastScanTime.current = now;
    lastScanCode.current = code;

    const cleanCode = code.trim();
    if (cleanCode.length < 1) return null;

    // Validation Rules:
    // 1. EAN: Exactly 13 digits
    const isEan = /^\d{13}$/.test(cleanCode);
    // 2. Internal: DY-000.000 format (DY- followed by 3 digits, a dot, and 3 digits)
    const isInternal = /^DY-\d{3}\.\d{3}$/i.test(cleanCode);
    
    const isValidFormat = isEan || isInternal;

    if (!isValidFormat) {
      setFeedback({ 
        type: 'error', 
        message: 'Código inválido ou incompleto' 
      });
      playSound('error');
      vibrate('error');
      return null;
    }

    const findProductLocal = (searchCode: string) => {
      const input = searchCode.trim().toLowerCase();
      
      return products.find(p => {
        const ean = String(p.ean || '').trim().toLowerCase();
        const id = String(p.id_interno || '').trim().toLowerCase();
        
        return ean === input || id === input;
      });
    };

    // 1. Local Search (Instant)
    let product = findProductLocal(cleanCode);

    if (product) {
      setFeedback({ type: 'success', message: 'Produto Encontrado' });
      playSound('success');
      vibrate('success');
      return product;
    }

    // 2. API Fallback (if online and not found locally)
    const { isOnline } = useStore.getState();
    if (isOnline) {
      try {
        const { apiService } = await import('../services/apiService');
        const results = await apiService.buscarProdutos(cleanCode, 1);
        
        if (results && results.length > 0) {
          const apiProduct = results[0];
          const ean = String(apiProduct.ean || '').trim().toLowerCase();
          const id = String(apiProduct.id_interno || '').trim().toLowerCase();
          const input = cleanCode.trim().toLowerCase();
          
          if (ean === input || id === input) {
            setFeedback({ type: 'success', message: 'Produto Encontrado' });
            playSound('success');
            vibrate('success');
            return apiProduct;
          }
        }
      } catch (error) {
        console.error('Erro na busca de fallback do scanner:', error);
      }
    }

    // 3. Not Found but Valid Format -> Yellow
    setFeedback({ 
      type: 'warning', 
      message: 'Produto não cadastrado' 
    });
    playSound('error');
    vibrate('error');
    return null;
  }, [products]);

  const resetFeedback = useCallback(() => {
    setFeedback({ type: 'none', message: '' });
  }, []);

  return {
    processScan,
    feedback,
    resetFeedback,
    setFeedback
  };
};
