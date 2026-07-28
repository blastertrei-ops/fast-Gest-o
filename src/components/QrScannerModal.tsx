/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Camera, Search, CheckCircle2, X, AlertTriangle, RefreshCw, Eye } from 'lucide-react';
import { Entrega } from '../types';
import QrCodeGenerator from './QrCodeGenerator';

interface QrScannerModalProps {
  deliveries: Entrega[];
  onSelectDelivery: (delivery: Entrega) => void;
  onConfirmDeliveryByQr?: (deliveryId: string) => void;
  onClose: () => void;
}

export default function QrScannerModal({ deliveries, onSelectDelivery, onConfirmDeliveryByQr, onClose }: QrScannerModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [foundDelivery, setFoundDelivery] = useState<Entrega | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Search logic for code
  const handleSearchCode = (code: string) => {
    setErrorMsg(null);
    if (!code.trim()) {
      setFoundDelivery(null);
      return;
    }

    const clean = code.trim().toLowerCase().replace(/^fg-/, '');
    const matched = deliveries.find(d => 
      d.id.toLowerCase() === clean ||
      d.numeroNF.toLowerCase() === clean ||
      (d.numeroPedido && d.numeroPedido.toLowerCase() === clean) ||
      (d.qrCodeId && d.qrCodeId.toLowerCase() === clean) ||
      d.id.toLowerCase().includes(clean) ||
      d.numeroNF.toLowerCase().includes(clean)
    );

    if (matched) {
      setFoundDelivery(matched);
    } else {
      setFoundDelivery(null);
      setErrorMsg(`Nenhuma entrega localizada com o código "${code}".`);
    }
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setErrorMsg(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Erro ao acessar a câmera:', err);
      setIsCameraActive(false);
      setErrorMsg('Não foi possível acessar a câmera do dispositivo. Use o campo de digitação abaixo.');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl relative">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Escanear / Localizar QR Code da Entrega</h3>
            <p className="text-xs text-slate-400">Aproxime a câmera do QR Code da etiqueta ou digite o código da entrega.</p>
          </div>
        </div>

        {/* CAMERA PREVIEW OR PLACEHOLDER */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative min-h-[220px] flex items-center justify-center">
          {isCameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-56 object-cover"
              />
              {/* Target Scan Box overlay */}
              <div className="absolute inset-0 border-2 border-amber-500/60 rounded-xl m-8 pointer-events-none animate-pulse flex items-center justify-center">
                <span className="bg-slate-950/80 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                  Centralize o QR Code
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Câmera desativada.</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md"
              >
                Ativar Câmera
              </button>
            </div>
          )}
        </div>

        {/* MANUAL INPUT BACKUP */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300">Ou digite/cole o Código / Nota Fiscal (Ex: FG-000154 ou NF-1002)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value);
                handleSearchCode(e.target.value);
              }}
              placeholder="Digite o código ou NF da entrega..."
              className="flex-1 bg-slate-950 border border-slate-800 text-white text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => handleSearchCode(manualCode)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Search className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* MATCHED DELIVERY CARD */}
        {foundDelivery && (
          <div className="p-4 bg-slate-950 border border-amber-500/50 rounded-2xl space-y-3 shadow-lg animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-mono text-xs font-bold text-amber-400">NF: {foundDelivery.numeroNF}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                foundDelivery.status === 'entregue' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                {foundDelivery.status}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-white text-xs">{foundDelivery.cliente?.nome}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {foundDelivery.endereco?.ruaNumero}, {foundDelivery.endereco?.numero} — {foundDelivery.endereco?.bairro}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onSelectDelivery(foundDelivery);
                  onClose();
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                Abrir Detalhes
              </button>

              {onConfirmDeliveryByQr && foundDelivery.status !== 'entregue' && (
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onConfirmDeliveryByQr(foundDelivery.id);
                    onClose();
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar Entrega
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
