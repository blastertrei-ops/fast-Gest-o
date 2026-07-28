import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCep, searchViaCep } from '../lib/cep';

export interface CepAddressData {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

interface CepInputProps {
  value: string;
  onChange: (value: string) => void;
  onAddressFound: (address: CepAddressData) => void;
  targetNumeroInputId?: string; // ID of the number input element to autofocus
  label?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function CepInput({
  value,
  onChange,
  onAddressFound,
  targetNumeroInputId,
  label = 'CEP',
  required = false,
  className = '',
  placeholder = '00000-000',
  disabled = false
}: CepInputProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const lastQueriedRef = useRef<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatCep(rawValue);
    onChange(formatted);

    const clean = formatted.replace(/\D/g, '');
    if (clean.length < 8) {
      setStatus('idle');
      setMessage(null);
      lastQueriedRef.current = '';
    }
  };

  const executeLookup = async (cepValue: string) => {
    const clean = cepValue.replace(/\D/g, '');
    if (clean.length !== 8) return;
    if (clean === lastQueriedRef.current) return;

    lastQueriedRef.current = clean;
    setLoading(true);
    setStatus('loading');
    setMessage('Buscando endereço...');

    const result = await searchViaCep(clean);

    setLoading(false);
    setStatus(result.status);
    setMessage(result.message || null);

    if (result.success) {
      onAddressFound({
        rua: result.rua || '',
        bairro: result.bairro || '',
        cidade: result.cidade || '',
        estado: result.estado || '',
        complemento: result.complemento || ''
      });

      // Autofocus no campo Número
      if (targetNumeroInputId) {
        setTimeout(() => {
          const numInput = document.getElementById(targetNumeroInputId) as HTMLInputElement | null;
          if (numInput) {
            numInput.focus();
            numInput.select?.();
          }
        }, 150);
      }
    }
  };

  // Debounced lookup on typing
  useEffect(() => {
    const clean = value.replace(/\D/g, '');
    if (clean.length !== 8) return;

    const timer = setTimeout(() => {
      executeLookup(value);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [value]);

  const handleBlur = () => {
    const clean = value.replace(/\D/g, '');
    if (clean.length === 8 && clean !== lastQueriedRef.current) {
      executeLookup(value);
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-slate-400 mb-1 font-semibold text-xs">
          <span>{label} {required && <span className="text-amber-500">*</span>}</span>
        </label>
      )}

      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          ) : (
            <MapPin className="w-4 h-4 text-slate-400" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled || loading}
          maxLength={9}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-white font-mono focus:outline-none focus:border-amber-500 disabled:opacity-60 text-xs"
        />
      </div>

      {/* FEEDBACK STATUS MESSAGE */}
      {message && (
        <div className={`text-[11px] font-medium flex items-center gap-1 mt-1 transition-all ${
          status === 'loading' ? 'text-amber-400' :
          status === 'success' ? 'text-emerald-400 font-semibold' :
          'text-red-400'
        }`}>
          {status === 'loading' && <Loader2 className="w-3 h-3 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
