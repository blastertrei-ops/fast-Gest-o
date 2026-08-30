import { useEffect, useState } from 'react';
interface ProtectedImageProps {
  src: string;
  alt?: string;
  className?: string;
  referrerPolicy?: any;
}

// Proof files served by the API require the same JWT used by the application.
// Legacy data URLs continue to render without a network request.
export default function ProtectedImage({ src, alt, className, referrerPolicy }: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const protectedSource = src.startsWith('/api/proofs/');

  useEffect(() => {
    if (!protectedSource) return;
    const controller = new AbortController();
    let url: string | null = null;
    fetch(src, { headers: { Authorization: `Bearer ${localStorage.getItem('fast_jwt_token') || ''}` }, signal: controller.signal })
      .then(response => response.ok ? response.blob() : Promise.reject(new Error('Não foi possível carregar o comprovante.')))
      .then(blob => { url = URL.createObjectURL(blob); setObjectUrl(url); })
      .catch(() => setObjectUrl(null));
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [protectedSource, src]);

  if (protectedSource && !objectUrl) return <div className="h-16 w-40 animate-pulse rounded bg-slate-100" aria-label="Carregando comprovante" />;
  return <img src={objectUrl || src} alt={alt} className={className} referrerPolicy={referrerPolicy} />;
}
