'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export const AethericImage = ({
  prompt,
  imageUrl,
  width,
  height,
  className = "",
  objectFit = 'cover',
  noFallback = false,
  silentError = false,
  onImageLoaded,
}: {
  prompt: string;
  imageUrl?: string;
  width: number;
  height: number;
  className?: string;
  objectFit?: 'cover' | 'contain';
  noFallback?: boolean;
  silentError?: boolean;
  onImageLoaded?: (url: string) => void;
}) => {
  const { session } = useAuth();
  const [authenticatedImageUrl, setAuthenticatedImageUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
    setUseFallback(false);
  }, [prompt, imageUrl]);

  const needsGeneration = !noFallback && (useFallback || !imageUrl);
  useEffect(() => {
    if (!needsGeneration || !prompt || !session?.access_token) {
      setAuthenticatedImageUrl(null);
      return;
    }
    const controller = new AbortController();
    let blobUrl: string | null = null;
    setAuthenticatedImageUrl(null);
    fetch(`/api/vision?prompt=${encodeURIComponent(prompt)}&width=${width}&height=${height}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('Vision generation failed');
      const blob = await response.blob();
      if (!controller.signal.aborted) {
        blobUrl = URL.createObjectURL(blob);
        setAuthenticatedImageUrl(blobUrl);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setHasError(true);
    });
    return () => {
      controller.abort();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [needsGeneration, prompt, width, height, session?.access_token]);

  const currentSrc = needsGeneration ? authenticatedImageUrl : (imageUrl || null);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && !loaded && !hasError && currentSrc) {
      setLoaded(true);
    }
  }, [currentSrc, loaded, hasError]);

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
          ref={imgRef}
          src={currentSrc}
          alt="Aetheric Vision"
          className={`w-full h-full ${fitClass} transition-all duration-1000 relative z-10 ${loaded ? 'opacity-80 group-hover:opacity-100 group-hover:scale-105' : 'opacity-0'}`}
          onLoad={() => {
            setLoaded(true);
            if (onImageLoaded && currentSrc) onImageLoaded(currentSrc);
          }}
          onError={() => {
            // If noFallback is set, or the explicit imageUrl failed → show error, never regenerate
            if (noFallback || (imageUrl && currentSrc === imageUrl)) {
              setHasError(true);
              setLoaded(true);
            } else if (!useFallback) {
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
    </div>
  );
};
