import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, Zap, ZapOff, AlertCircle } from 'lucide-react';
import { ScannerFeedback } from './ScannerFeedback';
import { useScanner } from '../hooks/useScanner';
import { Product } from '../types';

interface ScannerProps {
  onScan: (product: Product) => void;
  onClose: () => void;
  title?: string;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose, title = 'Escanear Produto' }) => {
  const { processScan, feedback, resetFeedback } = useScanner();
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerId = "reader";

  useEffect(() => {
    let isMounted = true;

    const startScanner = async () => {
      // Pequeno delay para garantir que o elemento DOM esteja pronto
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!isMounted || !scannerRef.current) return;

      try {
        const html5QrCode = new Html5Qrcode(scannerId);
        html5QrCodeRef.current = html5QrCode;

        const config = {
          fps: 20,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ]
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            if (!isMounted) return;
            const product = await processScan(decodedText);
            if (product && isMounted) {
              onScan(product);
            }
          },
          () => {} // Ignore scan errors
        );
      } catch (err: any) {
        if (isMounted) {
          console.error("Erro ao iniciar o scanner:", err);
          setError("Não foi possível acessar a câmera. Verifique as permissões.");
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrCodeRef.current) {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().then(() => {
            html5QrCodeRef.current?.clear();
          }).catch(err => console.error("Erro ao parar o scanner:", err));
        }
      }
    };
  }, [processScan, onScan]);

  const toggleTorch = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        const newState = !isTorchOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: newState } as any]
        });
        setIsTorchOn(newState);
      } catch (err) {
        console.warn("Lanterna não suportada neste dispositivo", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-dy-black flex flex-col animate-in fade-in">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-dy-gray-dark bg-dy-black/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Camera size={20} className="text-dy-accent" />
          <h2 className="text-sm font-black uppercase tracking-widest text-dy-white">{title}</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 bg-dy-gray-dark rounded-full text-dy-gray-light hover:text-dy-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Reader Container */}
      <div className="flex-1 relative flex flex-col items-center justify-center p-6">
        {error ? (
          <div className="text-center p-8 flex flex-col items-center gap-4">
            <AlertCircle size={48} className="text-dy-accent" />
            <p className="text-dy-accent font-bold uppercase tracking-widest text-sm">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-dy-primary px-6 py-2 text-xs"
            >
              Recarregar App
            </button>
          </div>
        ) : (
          <>
            <div 
              id={scannerId} 
              ref={scannerRef}
              className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-dy-accent shadow-[0_0_30px_rgba(254,249,195,0.2)] bg-black" 
            />
            
            <div className="mt-8 text-center">
              <p className="text-xs text-dy-gray-mid uppercase font-bold tracking-[0.2em]">Posicione o código no quadro</p>
              <p className="text-[10px] text-dy-gray-dark mt-2">EAN-13 • QR CODE • CODE-128</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-12 flex gap-4">
              <button 
                className="p-4 bg-dy-gray-dark rounded-full text-dy-gray-light hover:text-dy-accent transition-colors"
                onClick={toggleTorch}
              >
                {isTorchOn ? <Zap size={24} /> : <ZapOff size={24} />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Feedback Overlay */}
      <ScannerFeedback 
        type={feedback.type} 
        message={feedback.message} 
        onComplete={resetFeedback}
      />

      <style>{`
        #reader video { 
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 20px !important; 
        }
      `}</style>
    </div>
  );
};
