/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react';

interface CameraCaptureProps {
  label: string;
  onCapture: (dataUrl: string) => void;
  savedImage?: string;
  onClear?: () => void;
}

const SAMPLE_DELIVERY_PHOTOS = [
  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80', // Package box outside door
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80', // Sneaker box
  'https://images.unsplash.com/photo-1566576912321-d58edd7a2808?w=600&auto=format&fit=crop&q=80', // Hand holding package
  'https://images.unsplash.com/photo-1620406897444-139930c51088?w=600&auto=format&fit=crop&q=80', // Cardboard boxes
];

export default function CameraCapture({ label, onCapture, savedImage, onClear }: CameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(savedImage || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onCapture(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSimulatePhoto = () => {
    // Choose a random package/delivery mock photo
    const randomIndex = Math.floor(Math.random() * SAMPLE_DELIVERY_PHOTOS.length);
    const chosenUrl = SAMPLE_DELIVERY_PHOTOS[randomIndex];
    setPreview(chosenUrl);
    onCapture(chosenUrl);
  };

  const clearPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-xs text-slate-500 font-medium mb-1">
        {label}
      </label>

      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 group bg-slate-50 aspect-video flex items-center justify-center">
          <img
            src={preview}
            alt="Comprovante de entrega"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={triggerFileInput}
              className="p-2 rounded-full bg-white/90 text-slate-800 hover:bg-white hover:scale-105 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <Camera className="w-4 h-4" />
              Tirar Outra
            </button>
            <button
              type="button"
              onClick={clearPhoto}
              className="p-2 rounded-full bg-red-600/90 text-white hover:bg-red-600 hover:scale-105 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </div>
      ) : (
        <div 
          onClick={triggerFileInput}
          className="border-2 border-dashed border-slate-300 hover:border-amber-500 transition-colors rounded-xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-amber-50/20 flex flex-col items-center justify-center gap-2 group min-h-32"
        >
          <div className="p-3 bg-white rounded-full shadow-xs text-slate-400 group-hover:text-amber-600 group-hover:bg-amber-100 transition-all">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Tirar foto pelo celular</p>
            <p className="text-xs text-slate-400 mt-0.5">Clique para abrir a câmera ou galeria</p>
          </div>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSimulatePhoto();
            }}
            className="mt-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white border border-slate-200 text-amber-600 hover:border-amber-300 hover:bg-amber-50/50 shadow-xs transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Simular foto real
          </button>
        </div>
      )}

      {/* Hidden input to access device camera directly */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
    </div>
  );
}
