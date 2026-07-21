/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface QrCodeProps {
  value: string;
  size?: number;
  onClick?: () => void;
}

export default function QrCodeGenerator({ value, size = 100, onClick }: QrCodeProps) {
  // Deterministic fake but realistic QR code matrix generator
  // Generates unique dot pattern based on string hashing
  const generateMatrix = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const matrix: boolean[][] = [];
    const matrixSize = 21; // 21x21 QR Code Version 1
    
    for (let r = 0; r < matrixSize; r++) {
      matrix[r] = [];
      for (let c = 0; c < matrixSize; c++) {
        // QR Code Finder Patterns (Top-Left, Top-Right, Bottom-Left corners)
        const isFinderLeftTop = r < 7 && c < 7;
        const isFinderRightTop = r < 7 && c >= 14;
        const isFinderLeftBottom = r >= 14 && c < 7;
        
        if (isFinderLeftTop) {
          // 7x7 Finder pattern logic
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[r][c] = border || center;
        } else if (isFinderRightTop) {
          const border = r === 0 || r === 6 || c === 14 || c === 20;
          const center = r >= 2 && r <= 4 && c >= 16 && c <= 18;
          matrix[r][c] = border || center;
        } else if (isFinderLeftBottom) {
          const border = r === 14 || r === 20 || c === 0 || c === 6;
          const center = r >= 16 && r <= 18 && c >= 2 && c <= 4;
          matrix[r][c] = border || center;
        } else {
          // Deterministic pseudo-random dots based on string hash
          const val = Math.abs(Math.sin(hash + r * 13 + c * 37));
          matrix[r][c] = val > 0.5;
        }
      }
    }
    return matrix;
  };

  const matrix = generateMatrix(value);
  const matrixSize = matrix.length;
  const cellSize = size / matrixSize;

  return (
    <div 
      onClick={onClick}
      className={`bg-white p-2 rounded-lg inline-block border border-slate-200 cursor-pointer hover:border-amber-500 hover:scale-105 transition-all shadow-2xs`}
      title={`QR Code para ${value}. Clique para escanear/abrir.`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {matrix.map((row, r) => 
          row.map((active, c) => {
            if (!active) return null;
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize}
                height={cellSize}
                fill="#0f172a" // slate-900
              />
            );
          })
        )}
      </svg>
    </div>
  );
}
