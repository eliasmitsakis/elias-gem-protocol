'use client';

import React, { useState, useEffect } from 'react';

export const AethericImage = ({
  prompt,
  imageUrl,
  width,
  height,
  className = "",
  objectFit = 'cover',
  noFallback = false,
  silentError = false,
}: {
  prompt: string;
  imageUrl?: string;
  width: number;
  height: number;
  className?: string;
  objectFit?: 'cover' | 'contain';
  noFallback?: boolean;
  silentError?: boolean;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
    setUseFallback(false);
  }, [prompt, imageUrl]);

  const currentSrc = (!noFallback && (useFallback || !imageUrl))
    ? `/api/vision?prompt=${encodeURIComponent(prompt)}&width=${width}&height=${height}`
    : (imageUrl || null);

  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <div className={`relative w-full h-full bg-obsidian/60 flex items-center justify-center overflow-hidden group ${className}`}>
      {!loaded && !hasError && currentSrc && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
          <p className="text-nebula text-xs animate-pulse opacity-90 font-mono italic mb-2">
            [+] Manifesting Vision...
          </p>
          <p className="text-nebula/60 text-[10px] break-words line-clamp-2 w-full max-w-[90%]">
            "{prompt}"
          </p>
        </div>
      )}
      {hasError && (
        silentError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-gold/20 text-2xl">✦</span>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0 border border-red-900/30 bg-red-900/10">
            <p className="text-red-500/80 text-xs font-mono italic mb-2">
              [!] Vision collapsed in the void.
            </p>
          </div>
        )
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!hasError && currentSrc && (
        <img
          src={currentSrc}
          alt="Aetheric Vision"
          className={`w-full h-full ${fitClass} transition-all duration-1000 relative z-10 ${loaded ? 'opacity-80 group-hover:opacity-100 group-hover:scale-105' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!noFallback && !useFallback && !imageUrl) {
              setUseFallback(true);
            } else if (!noFallback && !useFallback && imageUrl && currentSrc === imageUrl) {
              setUseFallback(true);
            } else {
              setHasError(true);
              setLoaded(true);
            }
          }}
        />
      )}
      {!hasError && !currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <span className="text-gold/20 text-2xl">✦</span>
        </div>
      )}
      
      {/* DEBUG OVERLAY */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-green-400 text-[8px] p-1 z-50 break-all">
        {currentSrc ? currentSrc : "null"}
      </div>
    </div>
  );
};
