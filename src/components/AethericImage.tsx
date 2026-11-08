'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Module-level session cache & in-flight deduplication so newly generated images,
// Main Card + Scroll Card pairs, and Scroll replays resolve in 0ms without duplicate round-trips.
const recordImageCache = new Map<string, string>();
const inFlightRecordRequests = new Map<string, Promise<string>>();

export function primeRecordImageCache(recordId: string | number | null | undefined, url: string | null | undefined) {
  if (!recordId || !url) return;
  recordImageCache.set(String(recordId), url);
}

export const AethericImage = ({
  prompt,
  imageUrl,
  recordId,
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
  recordId?: string | number | null;
  width: number;
  height: number;
  className?: string;
  objectFit?: 'cover' | 'contain';
  noFallback?: boolean;
  silentError?: boolean;
  onImageLoaded?: (url: string) => void;
}) => {
  const { session } = useAuth();
  const cacheKey = recordId ? String(recordId) : null;
  const initialCached = cacheKey ? (recordImageCache.get(cacheKey) ?? null) : null;
  const isDirectDataOrBlob = Boolean(imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')));

  const [authenticatedImageUrl, setAuthenticatedImageUrl] = useState<string | null>(null);
  const [privateImageUrl, setPrivateImageUrl] = useState<string | null>(
    initialCached || (isDirectDataOrBlob ? imageUrl! : null)
  );
  const [loaded, setLoaded] = useState(Boolean(initialCached || isDirectDataOrBlob));
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  useEffect(() => {
    const cached = cacheKey ? (recordImageCache.get(cacheKey) ?? null) : null;
    const direct = Boolean(imageUrl && (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')));
    if (cached) {
      setPrivateImageUrl(cached);
      setLoaded(true);
    } else if (direct && imageUrl) {
      if (cacheKey) recordImageCache.set(cacheKey, imageUrl);
      setPrivateImageUrl(imageUrl);
      setLoaded(true);
    } else {
      setLoaded(false);
    }
    setHasError(false);
    setUseFallback(false);
  }, [prompt, imageUrl, cacheKey]);

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

  useEffect(() => {
    if (!cacheKey || !imageUrl || !session?.access_token) {
      if (!cacheKey) setPrivateImageUrl(null);
      return;
    }
    // Instant hit from memory cache or inline data/blob URL
    const existing = recordImageCache.get(cacheKey);
    if (existing) {
      setPrivateImageUrl(existing);
      setLoaded(true);
      return;
    }
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      recordImageCache.set(cacheKey, imageUrl);
      setPrivateImageUrl(imageUrl);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    let requestPromise = inFlightRecordRequests.get(cacheKey);
    if (!requestPromise) {
      requestPromise = fetch('/api/record-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ recordId: cacheKey }),
      }).then(async response => {
        if (!response.ok) throw new Error('Unable to load private record image');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        recordImageCache.set(cacheKey, blobUrl);
        return blobUrl;
      }).finally(() => {
        inFlightRecordRequests.delete(cacheKey);
      });
      inFlightRecordRequests.set(cacheKey, requestPromise);
    }

    requestPromise
      .then(blobUrl => {
        if (!cancelled) {
          setPrivateImageUrl(blobUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [cacheKey, imageUrl, session?.access_token]);

  const currentSrc = needsGeneration ? authenticatedImageUrl :
    (recordId && imageUrl ? privateImageUrl : (imageUrl || null));

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
