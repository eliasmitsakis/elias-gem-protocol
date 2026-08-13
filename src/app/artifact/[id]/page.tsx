import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { AethericImage } from '@/components/AethericImage';

// Setup Supabase client for reading
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Next.js dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { data: artifact } = await supabase
    .from('akashic_records')
    .select('description, seedoftruth, imageprompt, image_url')
    .eq('id', resolvedParams.id)
    .single();

  if (!artifact) {
    return { title: 'Artifact Not Found | Cyber-Zen' };
  }

  return {
    title: `Aetheric Artifact | Elias & Gem Protocol`,
    description: artifact.description || artifact.seedoftruth || 'A vibration transmuted into code.',
    openGraph: {
      title: 'Transmuted Artifact | Cyber-Zen',
      description: artifact.description || artifact.seedoftruth,
      images: [
        {
          url: artifact.image_url || `https://image.pollinations.ai/prompt/${encodeURIComponent(artifact.imageprompt || 'abstract fractal')}?width=1200&height=630&nologo=true`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function SharedArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // Fetch artifact from DB
  const { data: artifact, error } = await supabase
    .from('akashic_records')
    .select('*')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !artifact) {
    notFound();
  }

  // Use the locked image_url from DB only — never regenerate
  const imageUrl = artifact.image_url || null;

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
          <p className="w-full mb-3 text-[11px] font-mono text-gold/40 tracking-widest uppercase leading-relaxed text-left px-1">
            ✦ {artifact.vibrationtext}
          </p>
        )}

        {/* Artifact Card */}
        <div className="w-full bg-[#050505] p-8 flex flex-col items-center relative overflow-hidden border border-gold/10 shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gold/5 blur-[50px] pointer-events-none"></div>

          <div className="group relative w-full aspect-square rounded border-2 border-gold/40 shadow-[0_0_20px_rgba(251,199,26,0.3)] overflow-hidden flex flex-col justify-end z-10">
            {imageUrl ? (
              <AethericImage
                prompt={artifact.imageprompt || ''}
                imageUrl={imageUrl}
                width={800}
                height={800}
                className="absolute inset-0 z-0"
                noFallback={true}
              />
            ) : (
              /* No stored image — show static placeholder, never regenerate */
              <div className="absolute inset-0 z-0 flex items-center justify-center bg-black/60">
                <span className="text-gold/20 text-5xl select-none">✦</span>
              </div>
            )}
            <div className="scanline"></div>

            {/* Seed of Truth Overlay */}
            {artifact.seedoftruth && (
              <div className="relative z-10 w-full bg-black/60 backdrop-blur-sm p-4 border-t border-gold/20">
                <p className="text-center text-sm md:text-base italic text-gold-glow drop-shadow-md">
                  &ldquo;{artifact.seedoftruth}&rdquo;
                </p>
              </div>
            )}
          </div>


          {/* Aetheric Description */}
          {artifact.description && (
            <div className="mt-6 w-full text-center px-4 relative z-10">
              <p className="font-serif italic text-gold/70 leading-relaxed text-lg">{artifact.description}</p>
            </div>
          )}

          {/* Branding Footer */}
          <div className="w-full mt-8 pt-4 border-t border-gold/10 flex justify-between items-center relative z-10">
            <span className="text-[10px] text-gold/30 font-mono">
              {new Date(artifact.created_at).toLocaleDateString()}
            </span>
            <span className="text-[10px] tracking-widest text-gold/30 uppercase font-mono">
              Elias &amp; Gem Protocol
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
