import React from 'react';

type Props = {
  opacity?: number;
  color?: string;
};

export function WavePatternOverlay({ opacity = 0.04, color = '#2F2E4B' }: Props) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cpath d='M0 50 C60 20,90 80,150 50 C210 20,240 80,300 50' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Cpath d='M0 110 C60 80,90 140,150 110 C210 80,240 140,300 110' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3Cpath d='M0 170 C60 140,90 200,150 170 C210 140,240 200,300 170' fill='none' stroke='${encodeURIComponent(color)}' stroke-width='2'/%3E%3C/svg%3E")`,
        backgroundSize: '300px 300px',
      }}
    />
  );
}

