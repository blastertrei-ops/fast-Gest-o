import React, { useState } from 'react';

export type BrandLogoVariant = 'full' | 'horizontal' | 'symbol' | 'appIcon';

export interface BrandLogoProps {
  variant?: BrandLogoVariant;
  className?: string;
  alt?: string;
  size?: number | string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

export const BRAND_LOGO_PATHS: Record<BrandLogoVariant, string> = {
  full: '/branding/fast-gestao-logo.png',
  horizontal: '/branding/fast-gestao-logo.png',
  symbol: '/branding/fast-gestao-logo.png',
  appIcon: '/branding/fast-gestao-logo.png',
};

export const BRAND_LOGO_ALTS: Record<BrandLogoVariant, string> = {
  full: 'Fast Gestão',
  horizontal: 'Fast Gestão',
  symbol: 'Fast Gestão',
  appIcon: 'Fast Gestão',
};

export function BrandLogo({
  variant = 'horizontal',
  className = '',
  alt,
  size,
  width,
  height,
  style,
}: BrandLogoProps) {
  const [imgSrc, setImgSrc] = useState<string>(
    BRAND_LOGO_PATHS[variant] || '/branding/fast-gestao-logo.png'
  );

  const defaultAlt = alt || BRAND_LOGO_ALTS[variant] || 'Fast Gestão';

  let computedWidth: string | number | undefined = width;
  let computedHeight: string | number | undefined = height;

  if (size !== undefined && computedWidth === undefined) {
    computedWidth = size;
  }

  const defaultImgStyle: React.CSSProperties = {
    width: computedWidth !== undefined ? (typeof computedWidth === 'number' ? `${computedWidth}px` : computedWidth) : undefined,
    height: computedHeight !== undefined ? (typeof computedHeight === 'number' ? `${computedHeight}px` : computedHeight) : 'auto',
    maxHeight: '100%',
    objectFit: 'contain',
    ...style,
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (imgSrc === '/branding/fast-gestao-logo.png') {
      setImgSrc('/branding/logo-fast-v2.png');
    } else if (imgSrc === '/branding/logo-fast-v2.png') {
      setImgSrc('/fast-gestao-logo.png');
    } else if (imgSrc === '/fast-gestao-logo.png') {
      setImgSrc('/branding/fast-gestao-official-symbol.svg');
    }
  };

  return (
    <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <img
        src={imgSrc}
        alt={defaultAlt}
        style={defaultImgStyle}
        className="object-contain shrink-0 max-w-full"
        onError={handleError}
      />
    </div>
  );
}

export default BrandLogo;

