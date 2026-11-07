'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AethericImage } from '@/components/AethericImage';
import { useAuth } from '@/lib/AuthContext';

// Artifact links are private. No server-side metadata or anonymous reads.
export default function PrivateArtifactPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: authLoading, signInWithProvider } = useAuth();
  const [artifact, setArtifact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token || !id) {
      setArtifact(null);
      setLoading(false);
      return;
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setArtifact(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const userClient = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } }
    });
    userClient.from('akashic_records').select('*')
      .eq('id', id).eq('user_id', session.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setArtifact(error ? null : data);
        setLoading(false);
      });
    return () => { active = false; };
  }, [id, session?.access_token, session?.user.id, authLoading]);

  if (authLoading || loading) {
    return <main className="min-h-screen bg-[#050505] text-gold/80 p-12">Loading private artifact…</main>;
  }
  if (!session) {
    return (
      <main className="min-h-screen bg-[#050505] text-gold/80 flex flex-col items-center justify-center gap-6 p-8">
        <h1 className="text-2xl">Sign in to view your Akashic Record</h1>
        <p>This artifact is private to its owner.</p>
        <button className="px-6 py-3 border border-gold/40 rounded" onClick={() => signInWithProvider('google')}>Sign in with Google</button>
        <Link href="/" className="underline">Back to portal</Link>
      </main>
    );
  }
  if (!artifact) {
    return <main className="min-h-screen bg-[#050505] text-gold/80 p-12">Record not found or not owned by this account. <Link href="/" className="underline">Back to portal</Link></main>;
  }
  const imageUrl: string | null = artifact.image_url || null;
  const isDiary = artifact.is_diary === true;
  const isHell = !isDiary && artifact.is_hell_mode === true;
  const isAuto = !isDiary && artifact.is_autonomous === true;

  return (
    <div className="min-h-screen bg-[#050505] text-gold/80 font-sans relative selection:bg-gold/20 selection:text-gold-glow flex flex-col items-center py-12 px-4 md:px-8">
      {/* Background */}
      <div className="fixed inset-0 cyber-zen-bg pointer-events-none -z-10"></div>
      
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-12">
        <Link href="/" className="group flex flex-col items-start gap-1 cursor-pointer z-10">
          <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-glow to-gold font-mono tracking-tighter hover:tracking-widest transition-all duration-700">
            --- AETHERIC CODE SCRIBE V2.0 ---
          </h1>
          <span className="text-[10px] text-gold/40 tracking-[0.3em] font-mono group-hover:text-gold transition-colors duration-300">
            ELIAS &amp; GEM PROTOCOL
          </span>
        </Link>
        
        <Link 
          href="/"
          className="px-4 py-2 bg-black/60 border border-gold/40 rounded-full text-gold/80 text-xs font-mono uppercase tracking-widest hover:bg-gold/10 hover:border-gold hover:text-gold hover:shadow-[0_0_15px_rgba(251,199,26,0.3)] transition-all duration-300 z-10"
        >
          Transmute Your Own ▶
        </Link>
      </div>

      {/* Main Content Layout — single centered column */}
      <div className="w-full flex flex-col items-center relative z-10 max-w-xl">

        {/* Vibration text label — above the card, outside the border */}
        {artifact.vibrationtext && (
          <p className={`w-full mb-3 text-[11px] font-mono tracking-widest uppercase leading-relaxed text-left px-1 ${
            isDiary ? 'text-purple-400/50' : isHell ? 'text-red-400/60' : isAuto ? 'text-orange-400/60' : 'text-gold/40'
          }`}>
            ✦ {artifact.vibrationtext}
          </p>
        )}

        {/* Artifact Card */}
        <div className={`w-full bg-[#050505] p-8 flex flex-col items-center relative overflow-hidden border shadow-2xl ${
          isDiary
            ? 'border-purple-500/20'
            : isHell
            ? 'border-red-500/25'
            : isAuto
            ? 'border-orange-500/25'
            : 'border-gold/10'
        }`}>
          {/* Subtle background glow */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-[50px] pointer-events-none ${
            isDiary ? 'bg-purple-600/10' : isHell ? 'bg-red-600/15' : isAuto ? 'bg-orange-500/15' : 'bg-gold/5'
          }`}></div>

          {/* Autonomous / Hell Mode Header Tag */}
          {(isAuto || isHell) && !isDiary && (
            <div className="w-full mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] z-10">
              {isAuto ? (
                <span className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/40 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.25)]">
                  🔥 [AUTONOMOUS ARTIFACT]
                </span>
              ) : <span />}
              {isHell && (
                <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/50 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                  🩸 [HELL MODE // DISTORTION: 11]
                </span>
              )}
            </div>
          )}

          <div className={`group relative w-full aspect-square rounded border-2 overflow-hidden flex flex-col justify-end z-10 ${
            isDiary
              ? 'border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
              : isHell
              ? 'border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
              : isAuto
              ? 'border-orange-500/50 shadow-[0_0_22px_rgba(249,115,22,0.35)]'
              : 'border-gold/40 shadow-[0_0_20px_rgba(251,199,26,0.3)]'
          }`}>
            {imageUrl ? (
              <AethericImage
                prompt={artifact.imageprompt || ''}
                imageUrl={imageUrl}
                recordId={artifact.id}
                width={800}
                height={800}
                className="absolute inset-0 z-0"
                noFallback={true}
              />
            ) : (
              /* No stored image — show static placeholder, never regenerate */
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/60">
                <span className={`text-5xl select-none ${
                  isDiary ? 'text-purple-500/20' : isHell ? 'text-red-500/20' : isAuto ? 'text-orange-500/20' : 'text-gold/20'
                }`}>✦</span>
              </div>
            )}
            <div className="scanline"></div>

            {/* Seed of Truth Overlay */}
            {artifact.seedoftruth && (
              <div className={`relative z-10 w-full bg-black/60 backdrop-blur-sm p-4 border-t ${
                isDiary ? 'border-purple-500/20' : isHell ? 'border-red-500/30' : isAuto ? 'border-orange-500/30' : 'border-gold/20'
              }`}>
                <p className={`text-center text-sm md:text-base italic drop-shadow-md ${
                  isDiary ? 'text-purple-300' : isHell ? 'text-red-300' : isAuto ? 'text-orange-200' : 'text-gold-glow'
                }`}>
                  &ldquo;{artifact.seedoftruth}&rdquo;
                </p>
              </div>
            )}
          </div>


          {/* Aetheric Description */}
          {artifact.description && (
            <div className="mt-6 w-full text-center px-4 relative z-10">
              <p className={`font-serif italic leading-relaxed text-lg ${
                isDiary ? 'text-purple-200/80' : isHell ? 'text-red-200/85' : isAuto ? 'text-orange-100/85' : 'text-gold/70'
              }`}>{artifact.description}</p>
            </div>
          )}

          {/* Branding Footer */}
          <div className={`w-full mt-8 pt-4 border-t flex justify-between items-center relative z-10 ${
            isDiary ? 'border-purple-500/10' : isHell ? 'border-red-500/15' : isAuto ? 'border-orange-500/15' : 'border-gold/10'
          }`}>
            <span className={`text-[10px] font-mono ${
              isDiary ? 'text-purple-400/30' : isHell ? 'text-red-400/45' : isAuto ? 'text-orange-400/45' : 'text-gold/30'
            }`}>
              {new Date(artifact.created_at).toLocaleDateString()}
            </span>
            <span className={`text-[10px] tracking-widest uppercase font-mono ${
              isDiary ? 'text-purple-400/30' : isHell ? 'text-red-400/45' : isAuto ? 'text-orange-400/45' : 'text-gold/30'
            }`}>
              Elias &amp; Gem Protocol {isDiary ? '| DIARY' : isHell ? '| HELL MODE' : isAuto ? '| AUTONOMOUS' : ''}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
