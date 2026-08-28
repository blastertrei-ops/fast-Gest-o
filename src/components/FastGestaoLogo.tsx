import React from 'react';
import BrandLogo from './BrandLogo';

export interface FastGestaoLogoProps {
  size?: number | string;
  className?: string;
  variant?: string;
  showTagline?: boolean;
}

export default function FastGestaoLogo({
  size = 40,
  className = '',
}: FastGestaoLogoProps) {
  return (
    <BrandLogo
      size={size}
      className={className}
      alt="Fast Gestão"
    />
  );
}



