import React from 'react';

interface FastGestaoLogoProps {
  variant?: 'full' | 'symbol' | 'horizontal';
  size?: number | string;
  className?: string;
  showTagline?: boolean;
}

export default function FastGestaoLogo({
  variant = 'horizontal',
  size = 40,
  className = ''
}: FastGestaoLogoProps) {
  // Numeric size conversion
  const numericSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 40;

  // Render official logo image directly with referrerPolicy="no-referrer"
  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      <img
        src="/fast-gestao-logo.svg"
        alt="Fast Gestão - Logo Oficial"
        width={numericSize}
        height={variant === 'symbol' ? numericSize * 0.75 : numericSize * 0.72}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: 'auto',
          maxHeight: '100%',
          objectFit: 'contain'
        }}
        className="object-contain shrink-0"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

