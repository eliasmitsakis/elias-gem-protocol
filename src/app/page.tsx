'use client';

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { toPng } from 'html-to-image';
import { useAuth } from '@/lib/AuthContext';
import { AethericImage } from '@/components/AethericImage';

declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

// ── Provider config ──────────────────────────────────────────────────────────
const PROVIDERS = [
  {
    id: 'google' as const,
    label: 'Google',
    color: '#4285F4',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'facebook' as const,
    label: 'Facebook',
    color: '#1877F2',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'azure' as const,
    label: 'Microsoft',
    color: '#00A4EF',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
        <path d="M11.4 24H0l8.267-14.4L4.8 3.6 20.4 0 24 24H11.4z" fill="#F25022"/>
        <path d="M11.4 24H0V12h11.4V24z" fill="#00A4EF"/>
        <path d="M24 24H11.4V12H24V24z" fill="#7FBA00"/>
        <path d="M11.4 12H0V0h11.4V12z" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    id: 'github' as const,
    label: 'GitHub',
    color: '#ffffff',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    id: 'discord' as const,
    label: 'Discord',
    color: '#5865F2',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026c.462-.62.874-1.275 1.226-1.963a.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/>
      </svg>
    ),
  },
];

// ── Diary Modal ───────────────────────────────────────────────────────────────
const DiaryModal = ({
  data,
  onClose,
}: {
  data: { assessment: string; imagePrompt: string; imageUrl: string } | null;
  onClose: () => void;
}) => {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative z-10 w-full max-w-2xl bg-[#0a0a0a] border border-gold/40 shadow-[0_0_40px_rgba(251,199,26,0.15)] rounded overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gold/60 hover:text-gold z-20 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="w-full md:w-1/2 relative aspect-square md:aspect-auto">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt="Diary of a Madman" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-obsidian border-r border-gold/10">
              <p className="text-nebula text-xs font-mono animate-pulse">✦ Generating visual...</p>
            </div>
          )}
        </div>
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-[linear-gradient(to_bottom,rgba(251,199,26,0.05),transparent)]">
          <h3 className="text-xl md:text-2xl font-bold text-gold-glow mb-4 font-mono uppercase tracking-widest border-b border-gold/20 pb-2">Diary of a Madman</h3>
          <p className="text-gray-300 text-sm leading-relaxed mb-6 italic">{data.assessment}</p>
          <div className="mt-auto">
            <p className="text-[10px] text-nebula/50 uppercase tracking-widest font-mono mb-1">Generated Visual Prompt</p>
            <p className="text-xs text-nebula/80 font-mono overflow-y-auto max-h-24 pr-2">{data.imagePrompt}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sign-In Modal ─────────────────────────────────────────────────────────────
const SignInModal = ({
  onSignIn,
  onClose,
}: {
  onSignIn: (provider: 'google' | 'facebook' | 'azure' | 'github' | 'discord') => void;
  onClose: () => void;
}) => {
  // Close on ESC
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-sm bg-black/80 border border-gold/30 rounded-2xl shadow-[0_0_60px_rgba(251,199,26,0.15)] backdrop-blur-xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gold top bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

        <div className="px-8 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/50 font-mono mb-2">⬡ Elias &amp; Gem Protocol</p>
            <h2 className="text-xl font-bold text-gold-glow font-mono tracking-widest uppercase">Enter the Aether</h2>
            <p className="text-gold/40 text-xs mt-2 font-mono">Choose your access vector</p>
          </div>

          {/* Provider buttons */}
          <div className="flex flex-col gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => onSignIn(p.id)}
                className="group flex items-center gap-4 w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-gold/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(251,199,26,0.1)] transition-all duration-250 text-left"
              >
                <span className="opacity-90 group-hover:opacity-100 transition-opacity">{p.icon}</span>
                <span className="text-sm text-gold/70 group-hover:text-gold font-mono tracking-wider transition-colors">
                  Continue with {p.label}
                </span>
                <span className="ml-auto text-gold/20 group-hover:text-gold/60 text-xs transition-colors">→</span>
              </button>
            ))}
          </div>

          <p className="text-center text-gold/20 text-[10px] font-mono mt-6 leading-relaxed">
            Free to join. 3 transmutations included.<br/>
            No dark patterns. Just vibration.
          </p>
        </div>

        {/* Gold bottom bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      </div>
    </div>
  );
};

// ── Cyberpunk SIGN IN button (logged-out state) ───────────────────────────────
const SignInButton = ({ onClick }: { onClick: () => void }) => (
  <button
    id="sign-in-btn"
    onClick={onClick}
    className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-gold/50 rounded font-mono text-[11px] uppercase tracking-[0.2em] text-gold/80 hover:bg-gold/10 hover:border-gold hover:text-gold hover:shadow-[0_0_15px_rgba(251,199,26,0.35)] transition-all duration-300"
  >
    <span className="text-gold/50 text-xs">▶</span>
    Sign In
  </button>
);

// ── User Avatar + dropdown with credits ───────────────────────────────────────
const UserMenu = ({ user, credits, onSignOut }: { user: any; credits: number | null; onSignOut: () => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Aetheric Adept';
  const isAdmin = ['elias.gemprotocol@gmail.com', 'eliasmitsakis@gmail.com'].includes(user?.email ?? '');

  return (
    <div className="relative">
      <button
        id="user-avatar-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-gold/40 rounded-full hover:border-gold hover:shadow-[0_0_10px_rgba(251,199,26,0.2)] transition-all duration-300"
        title={displayName}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full border border-gold/40" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gold/20 border border-gold/40 flex items-center justify-center text-gold text-xs font-bold">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="text-gold/80 text-xs font-mono max-w-[100px] truncate hidden sm:block">
          {displayName.split(' ')[0]}
        </span>
        <span className="text-gold/40 text-xs">▾</span>
      </button>

      {menuOpen && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-56 bg-black/90 border border-gold/20 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl z-50 overflow-hidden">
            {/* Gold top accent */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

            {/* User info */}
            <div className="px-4 py-3 border-b border-gold/10">
              <p className="text-gold/80 text-xs font-mono truncate">{displayName}</p>
              <p className="text-gold/40 text-[10px] truncate">{user?.email}</p>
            </div>

            {/* Credits display */}
            <div className="px-4 py-3 border-b border-gold/10 flex items-center justify-between">
              <span className="text-gold/50 text-[10px] font-mono uppercase tracking-wider">Transmutations</span>
              <span className={`text-sm font-bold font-mono ${
                isAdmin ? 'text-nebula' :
                credits === null ? 'text-gold/30' :
                credits <= 0 ? 'text-red-400' :
                credits <= 1 ? 'text-yellow-400' :
                'text-gold'
              }`}>
                {isAdmin ? '∞' : credits === null ? '…' : credits}
              </span>
            </div>

            {/* Sign out */}
            <button
              id="sign-out-btn"
              onClick={() => { setMenuOpen(false); onSignOut(); }}
              className="w-full text-left px-4 py-3 text-xs text-nebula/70 font-mono hover:bg-nebula/10 hover:text-nebula transition-colors duration-200"
            >
              ⊗ Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};


export default function CyberZenPortal() {
  const { user, session, loading: authLoading, credits, signInWithProvider, signOut, refreshCredits } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);

  const [particles, setParticles] = useState<number[]>([]);
  const [vibrationText, setVibrationText] = useState('');
  const [isTransmuting, setIsTransmuting] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  
  // Audio and Glow states
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const hellAudioRef = useRef<HTMLAudioElement>(null);
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Copy link feedback state (stores the id of the record whose link was just copied)
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyRecordLink = (recordId: string) => {
    const url = `https://elias-gem-protocol.vercel.app/artifact/${recordId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(recordId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedId(recordId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Response states
  const [aethericCode, setAethericCode] = useState(`class VibrationTransmutation(Awareness):\n    def __init__(self):\n        self.state = "Analyzing Flow..."\n        \n    def transmute(self, frequency):\n        return self._align(frequency)`);
  const [seedOfTruth, setSeedOfTruth] = useState('');
  // Track whether current view is replayed from history (suppresses re-generation).
  // We use BOTH a ref (synchronous, for guards inside async functions/callbacks)
  // and state (for reactive prop passing to AethericImage).
  const isReplayRef = useRef(false);
  const [isReplay, setIsReplay] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  // Execution states
  const [showExecution, setShowExecution] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<{stdout: string, stderr: string}>({ stdout: '', stderr: '' });

  // Akashic Records States
  const [isAkashaOpen, setIsAkashaOpen] = useState(false);
  const [akashaRecords, setAkashaRecords] = useState<any[]>([]);

  // Diary of a Madman States
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [isCurrentDiary, setIsCurrentDiary] = useState(false);

  // Hell Mode & Burn the Script States
  const [hellMode, setHellMode] = useState(false);
  const [isCurrentHell, setIsCurrentHell] = useState(false);
  const [isCurrentAutonomous, setIsCurrentAutonomous] = useState(false);
  const [mobileExpandedAction, setMobileExpandedAction] = useState<'diary' | 'burn' | null>(null);
  const isHellDiary = isCurrentDiary && isCurrentHell;

  // Pyodide State
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadingPyodide, setLoadingPyodide] = useState(true);

  // Typing effect state
  const [typedCode, setTypedCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isPromptCopied, setIsPromptCopied] = useState(false);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Scroll Ref for Auto-Scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Artifact Ref
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const playTypingSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.02, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      // Ignore if audio context fails
    }
  };

  const playChimeSound = (distorted = false) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (distorted) {
        // HELL MODE: Overdrive / Sawtooth Distortion Power Chord Chime (DISTORTION: 11)
        const freqs = [110, 164.81, 220, 311.13]; // A2 + E3 + A3 + D#4 (tritone/power edge)
        const masterGain = ctx.createGain();
        const shaper = ctx.createWaveShaper();

        // Heavy overdrive curve
        const samples = 44100;
        const curve = new Float32Array(samples);
        const k = 90;
        for (let i = 0; i < samples; ++i) {
          const x = (i * 2) / samples - 1;
          curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
        }
        shaper.curve = curve;
        shaper.oversample = '4x';

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 2.2);

        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.03);
        masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);

        shaper.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(ctx.destination);

        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          osc.detune.setValueAtTime((idx - 1.5) * 8, ctx.currentTime);
          osc.connect(shaper);
          osc.start();
          osc.stop(ctx.currentTime + 2.2);
        });
        return;
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 frequency for a pleasant bell/chime
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 2.5);
    } catch (e) {
      console.log("Chime synthesize failed", e);
    }
  };

  const TARGET_AMBIENT_VOLUME = 0.2;

  const crossfadeAmbientTracks = (toHellMode: boolean) => {
    const zenAudio = ambientAudioRef.current;
    const hellAudio = hellAudioRef.current;
    if (!zenAudio || !hellAudio) return;

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }

    if (!isAmbientPlaying) {
      zenAudio.pause();
      hellAudio.pause();
      return;
    }

    const incoming = toHellMode ? hellAudio : zenAudio;
    const outgoing = toHellMode ? zenAudio : hellAudio;

    incoming.volume = Math.min(incoming.volume || 0, TARGET_AMBIENT_VOLUME);
    incoming.play().catch((e) => console.error('Audio crossfade play failed', e));

    const steps = 16;
    const stepMs = 40; // ~640ms smooth crossfade
    let currentStep = 0;
    const startOutVol = outgoing.paused ? 0 : outgoing.volume;
    const startInVol = incoming.volume;

    crossfadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const progress = Math.min(1, currentStep / steps);
      incoming.volume = Math.min(TARGET_AMBIENT_VOLUME, startInVol + (TARGET_AMBIENT_VOLUME - startInVol) * progress);
      outgoing.volume = Math.max(0, startOutVol * (1 - progress));

      if (progress >= 1) {
        outgoing.pause();
        outgoing.volume = 0;
        incoming.volume = TARGET_AMBIENT_VOLUME;
        if (crossfadeIntervalRef.current) {
          clearInterval(crossfadeIntervalRef.current);
          crossfadeIntervalRef.current = null;
        }
      }
    }, stepMs);
  };

  const toggleAmbient = () => {
    const zenAudio = ambientAudioRef.current;
    const hellAudio = hellAudioRef.current;
    if (!zenAudio || !hellAudio) return;

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }

    if (isAmbientPlaying) {
      zenAudio.pause();
      hellAudio.pause();
      setIsAmbientPlaying(false);
    } else {
      const activeAudio = hellMode ? hellAudio : zenAudio;
      const inactiveAudio = hellMode ? zenAudio : hellAudio;
      inactiveAudio.pause();
      inactiveAudio.volume = 0;
      activeAudio.volume = 0;
      activeAudio.play()
        .then(() => {
          setIsAmbientPlaying(true);
          // Gentle fade-in on start
          let step = 0;
          crossfadeIntervalRef.current = setInterval(() => {
            step++;
            activeAudio.volume = Math.min(TARGET_AMBIENT_VOLUME, (step / 10) * TARGET_AMBIENT_VOLUME);
            if (step >= 10 && crossfadeIntervalRef.current) {
              clearInterval(crossfadeIntervalRef.current);
              crossfadeIntervalRef.current = null;
            }
          }, 35);
        })
        .catch(e => console.error("Audio play failed", e));
    }
  };

  const exportArtifact = async () => {
    if (cardRef.current) {
      try {
        const dataUrl = await toPng(cardRef.current, { quality: 1, backgroundColor: '#050505', pixelRatio: 4 });
        const link = document.createElement('a');
        link.download = `artifact-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Failed to export artifact', err);
      }
    }
  };

  const initPyodide = async () => {
    if (window.pyodideInstance) {
       setPyodideReady(true);
       setLoadingPyodide(false);
       return;
    }
    try {
        window.pyodideInstance = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
        });
        setPyodideReady(true);
    } catch(e) {
        console.error("Failed to load Pyodide (WASM Python Engine)", e);
    } finally {
        setLoadingPyodide(false);
    }
  };

  const generateDiary = async () => {
    try {
      const accessToken = session?.access_token;
      if (!accessToken) {
        alert("Authentication required for Diary of a Madman.");
        return;
      }

      // Mark as fresh generation
      const activeHell = hellMode;
      isReplayRef.current = false;
      setIsReplay(false);
      setDiaryLoading(true);
      setShowExecution(false);
      setSeedOfTruth('');
      setImagePrompt('');
      setCurrentImageUrl('');
      setDescription('');
      setArtifactId(null);
      setIsCurrentDiary(true);
      setIsCurrentHell(activeHell);
      setIsCurrentAutonomous(false);
      setMobileExpandedAction(null);

      startTypingEffect(
        activeHell
          ? "# [!] HELL MODE DIARY ENGAGED — DISTORTION: 11\n# Connecting to the Akasha...\n# Dissecting the raw sum of your madness without mercy..."
          : "# Aligning frequencies...\n# Connecting to the Akasha...\n# Analyzing the sum of your madness..."
      );

      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, hellMode: activeHell })
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = `# Error: ${data.error || "Failed to generate diary."}`;
        setAethericCode(errorMsg);
        startTypingEffect(errorMsg);
        setIsCurrentDiary(false);
        setIsCurrentHell(false);
      } else {
        setAethericCode(data.aethericCode);
        setSeedOfTruth(data.seedOfTruth);
        setImagePrompt(data.imagePrompt);
        setDescription(data.assessment);
        
        if (data.imageUrl) {
          setCurrentImageUrl(data.imageUrl);
        }
        
        if (data.id) {
          setArtifactId(data.id);
        }

        startTypingEffect(data.aethericCode, () => {
          executePythonCode(
            data.aethericCode,
            data.seedOfTruth,
            data.imagePrompt,
            data.assessment,
            activeHell ? "[DIARY OF A MADMAN // HELL MODE]" : "[DIARY OF A MADMAN]",
            data.id,
            data.imageUrl
          );
          playChimeSound(activeHell);
        });

        fetchAkashicRecords(true);
        // Refresh credits silently if possible
        if (session?.user?.id) {
          refreshCredits();
        }
      }
    } catch (e) {
      console.error(e);
      setAethericCode("# ERROR: Failed to reach the Source.");
      setIsCurrentDiary(false);
    } finally {
      setDiaryLoading(false);
    }
  };

  const fetchAkashicRecords = async (scrollToTop = false) => {
    try {
      const accessToken = session?.access_token;
      const res = await fetch(`/api/akasha?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAkashaRecords(data);
        if (scrollToTop && scrollContainerRef.current) {
          setTimeout(() => {
            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }
      }
    } catch (e) {
      console.error("Failed to fetch Akashic Records");
    }
  };

  const startTypingEffect = (textToType: string, onComplete?: () => void) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    setTypedCode('');
    let i = 0;
    const step = Math.max(1, Math.ceil(textToType.length / 140));
    typingIntervalRef.current = setInterval(() => {
      i = Math.min(textToType.length, i + step);
      setTypedCode(textToType.substring(0, i));
      if (i >= textToType.length && typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        if (onComplete) onComplete();
      }
    }, 20);
  };

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map(() => Math.random() * 100);
    setParticles(newParticles);
    startTypingEffect(aethericCode);
    
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
    };
  }, []);

  // Re-fetch records whenever the session changes (login / logout)
  useEffect(() => {
    if (!authLoading) {
      fetchAkashicRecords();
    }
  }, [session, authLoading]);

  const saveToAkasha = async (execOutput: {stdout: string, stderr: string}, code: string, seed: string, img: string, desc: string, currentVibText: string, recordId?: string, imageUrl?: string) => {
    // Hard guard: never save to Akasha during a history replay
    if (isReplayRef.current) return;
    try {
      // Include the user's access token so the API route can enforce RLS
      const accessToken = session?.access_token;

      await fetch('/api/akasha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          recordId,
          imageUrl,
          vibrationText: currentVibText,
          description: desc,
          aethericCode: code,
          seedOfTruth: seed,
          imagePrompt: img,
          executionOutput: execOutput
        }),
      });
      fetchAkashicRecords(true);
    } catch(e) {
      console.error("Failed saving to Akasha.", e);
    }
  };

  const executePythonCode = async (code: string, seed: string, img: string, desc: string, currentVibText: string, recordId?: string, imageUrl?: string) => {
    setShowExecution(true);
    setIsExecuting(true);
    setExecutionOutput({ stdout: '[!] Transmuting Python in Browser via WASM Edge Engine...', stderr: '' });

    let execOut = { stdout: '', stderr: '' };
    
    if (!window.pyodideInstance || !pyodideReady) {
       execOut = { stdout: '', stderr: 'SYSTEM CORE FAILURE: The WASM Python Sandbox is not mounted yet. Wait a moment and try again.' };
       setExecutionOutput(execOut);
       setIsExecuting(false);
       saveToAkasha(execOut, code, seed, img, desc, currentVibText, recordId, imageUrl);
       return;
    }

    try {
      // Setup stdout/stderr capturing in Pyodide
      await window.pyodideInstance.runPythonAsync(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);
      
      // Execute User Aetheric Code
      await window.pyodideInstance.runPythonAsync(code);
      
      // Retrieve Output
      const stdout = await window.pyodideInstance.runPythonAsync("sys.stdout.getvalue()");
      const stderr = await window.pyodideInstance.runPythonAsync("sys.stderr.getvalue()");
      
      execOut = { stdout: stdout.trim(), stderr: stderr.trim() };
      setExecutionOutput(execOut);
    } catch (e: any) {
      execOut = { 
        stdout: '', 
        stderr: e.toString() 
      };
      setExecutionOutput(execOut);
    } finally {
      setIsExecuting(false);
      saveToAkasha(execOut, code, seed, img, desc, currentVibText, recordId, imageUrl);
    }
  };

  const handleReplay = (record: any) => {
    // Set the ref synchronously FIRST — guards saveToAkasha and any callbacks
    isReplayRef.current = true;
    setIsReplay(true);
    setIsCurrentDiary(record.is_diary === true);
    setIsCurrentHell(record.is_hell_mode === true);
    setIsCurrentAutonomous(record.is_autonomous === true);

    setVibrationText(record.vibrationText);
    setAethericCode(record.aethericCode);
    setSeedOfTruth(record.seedOfTruth);
    setImagePrompt(record.imagePrompt || '');
    setCurrentImageUrl(record.imageUrl || '');
    setArtifactId(String(record.id));
    setDescription(record.description || '');
    setExecutionOutput(record.executionOutput || { stdout: '', stderr: '' });
    setShowExecution(true);
    // Instantly display stored code — no typing animation that looks like regeneration
    setTypedCode(record.aethericCode || '');

    if (window.innerWidth < 1024) setIsAkashaOpen(false);
  };

  const runTransmutation = async (options?: { burnTheScript?: boolean }) => {
    const isBurn = options?.burnTheScript === true;
    if ((!isBurn && !vibrationText.trim()) || !user || isTransmuting) return;

    const activeHell = hellMode;
    isReplayRef.current = false;
    setIsReplay(false);
    setIsCurrentDiary(false);
    setIsCurrentHell(activeHell);
    setIsCurrentAutonomous(isBurn);
    setIsTransmuting(true);
    setGenerationStatus(
      isBurn
        ? '🔥 Burning the script — autonomous oracle is dreaming…'
        : activeHell
        ? '🩸 Hell Mode active (DISTORTION: 11) — bending the prism…'
        : 'Contacting the transmutation engine…'
    );
    setShowExecution(false);
    setSeedOfTruth('');
    setImagePrompt('');
    setCurrentImageUrl('');
    setDescription('');
    setArtifactId(null);
    let currentVibText = vibrationText;
    if (isBurn) {
      setVibrationText('⚡ [BURNING THE SCRIPT — ORACLE DREAMING…]');
    }
    startTypingEffect(
      isBurn
        ? '# [!] BURNING THE SCRIPT...\n# Surrendering keyboard to the Autonomous Oracle...\n# Igniting chaos seed...'
        : activeHell
        ? '# [!] HELL MODE ENGAGED — DISTORTION LEVEL: 11\n# Stripping corporate honey...\n# Bending light through the cracked prism...'
        : '# Aligning frequencies…\n# Preparing transmute protocol…'
    );

    let receivedArtifact = false;
    let completed = false;
    try {
      const response = await fetch('/api/transmute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson',
        },
        body: JSON.stringify({
          vibrationText: currentVibText,
          accessToken: session?.access_token,
          hellMode: activeHell,
          burnTheScript: isBurn,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.error || 'Failed to align vibration';
        startTypingEffect(`# Error: ${message}`);
        setGenerationStatus('');
        return;
      }
      if (!response.body) throw new Error('No response stream was returned.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const handleLine = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as { type: string; data: any };
        const data = event.data || {};

        if (event.type === 'stage') {
          if (data.stage === 'text') setGenerationStatus(isBurn ? 'Oracle is dreaming your autonomous prompt & code…' : 'Generating your interpretation and Python code…');
          else if (data.stage === 'saving') setGenerationStatus('Saving your private Akashic Record…');
          else if (data.stage === 'image') setGenerationStatus('Text ready — generating the image…');
        } else if (event.type === 'artifact') {
          receivedArtifact = true;
          if (data.vibrationText && isBurn) {
            currentVibText = data.vibrationText;
            setVibrationText(data.vibrationText);
          }
          setAethericCode(data.aethericCode);
          setSeedOfTruth(data.seedOfTruth);
          setImagePrompt(data.imagePrompt);
          setDescription(data.description);
          setCurrentImageUrl('');
          if (data.id) setArtifactId(String(data.id));

          // Show text immediately; image generation is still running on the server.
          startTypingEffect(data.aethericCode, () => {
            void executePythonCode(
              data.aethericCode, data.seedOfTruth, data.imagePrompt,
              data.description, currentVibText, data.id, undefined
            );
            playChimeSound(activeHell);
          });
          void fetchAkashicRecords(true);
          void refreshCredits();
        } else if (event.type === 'image') {
          if (data.imageUrl) {
            setCurrentImageUrl(data.imageUrl);
            setGenerationStatus('Image ready — loading your private image…');
            void fetchAkashicRecords(true);
          }
        } else if (event.type === 'complete') {
          completed = true;
          setGenerationStatus(data.imageUrl ? '' : 'Text saved. Image unavailable for this transmutation.');
          void fetchAkashicRecords(true);
        } else if (event.type === 'error') {
          if (!receivedArtifact) {
            startTypingEffect(`# Error: ${data.error || 'Transmutation failed.'}`);
          }
          setGenerationStatus(receivedArtifact
            ? 'Text was saved, but image processing did not finish.'
            : '');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) handleLine(line);
      }
      buffer += decoder.decode();
      if (buffer.trim()) handleLine(buffer);
      if (!receivedArtifact) {
        throw new Error('The generation stream ended without an artifact.');
      }
      if (!completed) {
        setGenerationStatus('Text saved; image processing may still be finishing. You can check your history.');
        void fetchAkashicRecords(true);
      }
    } catch (error) {
      console.error('Transmutation stream failed:', error);
      if (receivedArtifact) {
        setGenerationStatus('Text saved; connection to image generation was interrupted. Your record is in history.');
        void fetchAkashicRecords(true);
      } else {
        startTypingEffect('# ERROR: Generation did not return an artifact. Please check your history before retrying.');
        setGenerationStatus('');
      }
    } finally {
      setIsTransmuting(false);
    }
  };

  const handleTransmute = () => runTransmutation({ burnTheScript: false });
  const handleBurnTheScript = () => runTransmutation({ burnTheScript: true });

  const isTransmuteDisabled = isTransmuting || !vibrationText.trim() || !pyodideReady || !user;
  const isBurnDisabled = isTransmuting || diaryLoading || !pyodideReady || !user;

  return (
    <div className={`transition-all duration-500 overflow-x-hidden ${isAkashaOpen ? 'pr-80' : ''}`}>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={initPyodide} />

      <audio ref={ambientAudioRef} loop src="/audio/cyberzen-theme.mp3" />
      <audio ref={hellAudioRef} loop src="/audio/hellmode-distorted-ambience.mp3" />
      
      <div className="cyber-zen-bg"></div>


      {/* Top-left controls: Audio + Auth + Actions */}
      <div className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center md:items-start gap-2 md:gap-3">
        {/* Ambient Audio Toggle */}
        <button 
          onClick={toggleAmbient}
          className={`w-10 h-10 md:w-auto md:h-auto md:p-3 flex items-center justify-center rounded-full border transition-all backdrop-blur-md ${
            isAmbientPlaying
              ? hellMode
                ? 'bg-red-950/70 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.45)] text-red-300'
                : 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(251,199,26,0.3)] text-gold-glow'
              : 'bg-black/70 border-gold/40 text-gold/60 hover:bg-gold/10'
          }`}
          title={hellMode ? "Toggle Hell Mode Distorted Ambience" : "Toggle Ambient Soundscape"}
        >
          🎧
        </button>

        {/* Auth Controls & Features */}
        {!authLoading && (
          user ? (
            <div className="flex flex-row md:flex-col items-center md:items-start gap-2">
              <UserMenu user={user} credits={credits} onSignOut={signOut} />

              {/* Desktop full-label buttons (md+) */}
              <button
                onClick={generateDiary}
                disabled={diaryLoading || isTransmuting}
                className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded text-[10px] uppercase font-bold tracking-widest transition-all disabled:opacity-50 border ${
                  hellMode
                    ? 'bg-gradient-to-r from-purple-950/70 via-fuchsia-950/60 to-red-950/70 border-fuchsia-500/60 text-fuchsia-200 hover:border-red-400 hover:text-red-200 hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]'
                    : 'bg-black/60 border-purple-500/40 text-purple-400/80 hover:text-purple-300 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                }`}
                title="Generate a psychological assessment of your recent entries (Costs 1 Credit)"
              >
                {diaryLoading ? 'Analyzing...' : hellMode ? '👁️🩸 Diary of a Madman' : '👁️ Diary of a Madman'}
              </button>
              <button
                id="burn-the-script-btn"
                onClick={handleBurnTheScript}
                disabled={isBurnDisabled}
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-orange-500/40 rounded text-[10px] uppercase font-bold tracking-widest text-orange-400/85 hover:text-orange-300 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.45)] transition-all disabled:opacity-50"
                title="Surrender the keyboard: let the Oracle dream an autonomous paradoxical prompt (Costs 1 Credit)"
              >
                {isTransmuting && isCurrentAutonomous ? '🔥 Burning...' : '🔥 Burn the Script'}
              </button>

              {/* Mobile two-step expandable buttons (< md): Tap 1 reveals full label box, Tap 2 executes */}
              {mobileExpandedAction && (
                <div
                  className="md:hidden fixed inset-0 z-40"
                  onClick={() => setMobileExpandedAction(null)}
                />
              )}
              <button
                onClick={() => {
                  if (mobileExpandedAction === 'diary') {
                    setMobileExpandedAction(null);
                    void generateDiary();
                  } else {
                    setMobileExpandedAction('diary');
                    playTypingSound();
                  }
                }}
                disabled={diaryLoading || isTransmuting}
                aria-label="Diary of a Madman"
                className={`md:hidden relative z-50 h-9 flex items-center justify-center bg-black/85 backdrop-blur-md border transition-all duration-200 disabled:opacity-40 ${
                  mobileExpandedAction === 'diary'
                    ? hellMode
                      ? 'px-3 rounded bg-gradient-to-r from-purple-950/90 to-red-950/90 border-fuchsia-500 text-fuchsia-200 shadow-[0_0_15px_rgba(217,70,239,0.5)]'
                      : 'px-3 rounded border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                    : diaryLoading
                    ? 'w-9 rounded-full border-purple-400 text-purple-300 animate-pulse shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                    : 'w-9 rounded-full border-purple-500/50 text-purple-300 active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                }`}
                title="Diary of a Madman (1 Credit)"
              >
                {mobileExpandedAction === 'diary' ? (
                  <span className="text-[10px] uppercase font-bold tracking-widest whitespace-nowrap flex items-center gap-1.5">
                    <span>{hellMode ? '👁️🩸' : '👁️'}</span>
                    <span>Diary of a Madman</span>
                  </span>
                ) : (
                  <span className="text-sm leading-none">{diaryLoading ? '⏳' : '👁️'}</span>
                )}
              </button>
              <button
                id="burn-the-script-mobile-btn"
                onClick={() => {
                  if (mobileExpandedAction === 'burn') {
                    setMobileExpandedAction(null);
                    void handleBurnTheScript();
                  } else {
                    setMobileExpandedAction('burn');
                    playTypingSound();
                  }
                }}
                disabled={isBurnDisabled}
                aria-label="Burn the Script"
                className={`md:hidden relative z-50 h-9 flex items-center justify-center bg-black/85 backdrop-blur-md border transition-all duration-200 disabled:opacity-40 ${
                  mobileExpandedAction === 'burn'
                    ? 'px-3 rounded border-orange-400 text-orange-200 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
                    : isTransmuting && isCurrentAutonomous
                    ? 'w-9 rounded-full border-orange-400 text-orange-300 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                    : 'w-9 rounded-full border-orange-500/50 text-orange-300 active:scale-95 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
                }`}
                title="Burn the Script — Autonomous Oracle (1 Credit)"
              >
                {mobileExpandedAction === 'burn' ? (
                  <span className="text-[10px] uppercase font-bold tracking-widest whitespace-nowrap flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Burn the Script</span>
                  </span>
                ) : (
                  <span className="text-sm leading-none">🔥</span>
                )}
              </button>
            </div>
          ) : (
            <SignInButton onClick={() => setShowSignInModal(true)} />
          )
        )}
      </div>
      
      {particles.map((leftPos, i) => (
        <div
          key={i}
          className="particles"
          style={{
            left: `${leftPos}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`
          }}
        ></div>
      ))}

      {/* Sign-In Modal */}
      {showSignInModal && (
        <SignInModal
          onSignIn={(provider) => { signInWithProvider(provider); setShowSignInModal(false); }}
          onClose={() => setShowSignInModal(false)}
        />
      )}

      {/* Top-right controls: Scroll Toggle */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50 flex items-center gap-3">
        {/* Floating Toggle Button for The Akashic Scroll */}
        <button 
          onClick={() => setIsAkashaOpen(!isAkashaOpen)}
          className="w-10 h-10 md:w-auto md:h-auto md:p-3 flex items-center justify-center bg-black/70 backdrop-blur-md border border-gold/40 rounded-full text-gold-glow hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.3)] transition-all animate-golden-pulse"
          title="Toggle The Aetheric Scroll"
        >
          📜
        </button>
      </div>

      {/* The Akashic Scroll Sidebar */}
      <div 
        ref={scrollContainerRef}
        className={`fixed top-0 right-0 h-full w-80 bg-obsidian/95 border-l border-gold/20 shadow-[-10px_0_30px_rgba(0,0,0,0.8)] z-40 transform transition-transform duration-500 overflow-y-auto ${isAkashaOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-6 relative text-gold/80 font-mono text-sm">
           <div className="absolute top-16 bottom-0 left-[1.5rem] w-px bg-gold/10 shadow-[0_0_4px_rgba(255,215,0,0.4)] z-0"></div>

           <h2 className="text-xl font-bold mb-8 text-gold-glow sticky top-0 bg-obsidian/80 backdrop-blur pb-2 z-20">The Aetheric Scroll</h2>
           
           <div className="flex flex-col gap-8 relative z-10">
              {akashaRecords.length === 0 ? (
                <p className="opacity-50 italic">The scroll is blank. Transmute a vibration to imprint history.</p>
              ) : (
                akashaRecords.map((record) => {
                  const timestampStr = record.created_at || record.timestamp;
                  const isDiary = record.is_diary === true;
                  const isHellDiary = isDiary && record.is_hell_mode === true;
                  const isHell = !isDiary && record.is_hell_mode === true;
                  const isAuto = !isDiary && record.is_autonomous === true;

                  return (
                    <div
                      key={record.id}
                      onClick={() => handleReplay(record)}
                      className={`relative pl-6 py-4 pr-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                        isHellDiary
                          ? 'bg-gradient-to-br from-purple-950/40 via-fuchsia-950/30 to-red-950/40 border-fuchsia-500/55 shadow-[0_0_22px_rgba(217,70,239,0.25)] hover:border-red-400/85'
                          : isDiary
                          ? 'bg-purple-900/20 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)] hover:border-purple-400/70'
                          : isHell
                          ? 'bg-red-950/25 border-red-500/45 shadow-[0_0_20px_rgba(239,68,68,0.18)] hover:border-red-400/80'
                          : isAuto
                          ? 'bg-orange-950/25 border-orange-500/45 shadow-[0_0_20px_rgba(249,115,22,0.18)] hover:border-orange-400/80'
                          : 'bg-black/40 border-gold/20 hover:border-gold/50'
                      }`}
                    >
                      <div className={`absolute -left-1.5 top-6 w-3 h-3 rounded-full border ${
                        isHellDiary
                          ? 'bg-gradient-to-br from-purple-600 to-red-600 border-fuchsia-400 shadow-[0_0_8px_rgba(239,68,68,0.85)]'
                          : isDiary
                          ? 'bg-purple-950 border-purple-500'
                          : isHell
                          ? 'bg-red-950 border-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'
                          : isAuto
                          ? 'bg-orange-950 border-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]'
                          : 'bg-obsidian border-gold/60'
                      }`}></div>
                      <div className="flex items-center justify-between mb-2">
                        <p className={`text-xs ${
                          isHellDiary ? 'text-fuchsia-300/90' : isDiary ? 'text-purple-300/80' : isHell ? 'text-red-300/80' : isAuto ? 'text-orange-300/80' : 'text-nebula/60'
                        }`}>
                          {new Date(timestampStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(timestampStr).toLocaleDateString()}
                        </p>
                        <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                          {/* Inline tooltip */}
                          <div
                            className="absolute right-full mr-2 pointer-events-none whitespace-nowrap"
                            style={{
                              opacity: copiedId === record.id ? 1 : 0,
                              transform: `translateX(${copiedId === record.id ? '0px' : '6px'})`,
                              transition: 'opacity 0.15s ease, transform 0.15s ease',
                            }}
                          >
                            <span className="flex items-center gap-1 px-2 py-1 rounded bg-black/80 border border-green-400/30 text-green-400 text-[10px] font-mono tracking-wider">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Link copied!
                            </span>
                          </div>
                          <button
                            onClick={() => copyRecordLink(record.id)}
                            title="Copy private owner-only link"
                            className={`flex items-center justify-center w-6 h-6 rounded transition-all duration-200 group ${
                              isHellDiary ? 'hover:bg-fuchsia-500/20' : isDiary ? 'hover:bg-purple-500/20' : isHell ? 'hover:bg-red-500/20' : isAuto ? 'hover:bg-orange-500/20' : 'hover:bg-gold/10'
                            }`}
                          >
                            {copiedId === record.id ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 transition-colors ${
                                isHellDiary
                                  ? 'text-fuchsia-300/60 group-hover:text-red-400'
                                  : isDiary
                                  ? 'text-purple-300/50 group-hover:text-purple-400'
                                  : isHell
                                  ? 'text-red-300/50 group-hover:text-red-400'
                                  : isAuto
                                  ? 'text-orange-300/50 group-hover:text-orange-400'
                                  : 'text-nebula/40 group-hover:text-gold/70'
                              }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      {isHellDiary ? (
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="text-[9px] font-bold text-fuchsia-200 bg-gradient-to-r from-purple-950/80 to-red-950/80 border border-fuchsia-500/50 px-1.5 py-0.5 rounded uppercase tracking-widest">
                            👁️🩸 Diary of a Madman // Hell 11
                          </span>
                        </div>
                      ) : (
                        isDiary && <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">👁️ Diary of a Madman</p>
                      )}
                      {(isAuto || isHell) && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          {isAuto && (
                            <span className="text-[9px] font-bold text-orange-300 bg-orange-950/60 border border-orange-500/40 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              🔥 Burn the Script
                            </span>
                          )}
                          {isHell && (
                            <span className="text-[9px] font-bold text-red-300 bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded uppercase tracking-widest">
                              🩸 Hell Mode // 11
                            </span>
                          )}
                        </div>
                      )}
                      <p className={`font-bold mb-3 ${
                        isHellDiary
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-fuchsia-200 to-red-200'
                          : isDiary
                          ? 'text-purple-200'
                          : isHell
                          ? 'text-red-200'
                          : isAuto
                          ? 'text-orange-200'
                          : 'text-gold-glow'
                      }`}>"{record.vibrationText}"</p>
                      
                      {record.description && (
                        <div className={`border-l-2 p-3 mb-3 rounded-r text-sm font-serif italic leading-relaxed ${
                          isHellDiary
                            ? 'bg-gradient-to-r from-purple-950/35 to-red-950/35 border-fuchsia-500/60 text-fuchsia-100/90'
                            : isDiary
                            ? 'bg-purple-900/10 border-purple-500/50 text-purple-200/90'
                            : isHell
                            ? 'bg-red-950/20 border-red-500/50 text-red-200/90'
                            : isAuto
                            ? 'bg-orange-950/20 border-orange-500/50 text-orange-100/90'
                            : 'bg-obsidian/40 border-gold/30 text-gold/80'
                        }`}>
                          {record.description}
                        </div>
                      )}
                      
                      <div className={`p-3 rounded text-xs italic opacity-90 break-words mb-3 ${
                        isHellDiary
                          ? 'bg-gradient-to-r from-purple-950/50 to-red-950/50 border border-fuchsia-500/35 text-rose-200'
                          : isDiary
                          ? 'bg-purple-950/40 border border-purple-500/20 text-purple-100'
                          : isHell
                          ? 'bg-red-950/40 border border-red-500/25 text-red-200'
                          : isAuto
                          ? 'bg-orange-950/40 border border-orange-500/25 text-orange-100'
                          : 'bg-black/50 border border-gold/10'
                      }`}>
                        {isHellDiary ? '🧠🩸' : isDiary ? '🧠' : isHell ? '🩸' : isAuto ? '🔥' : '👁️'} "{record.seedOfTruth}"
                      </div>
                      
                      {record.imagePrompt && (
                        <div className={`w-full aspect-square rounded border overflow-hidden mt-2 ${
                          isHellDiary ? 'border-fuchsia-500/45 shadow-[0_0_12px_rgba(217,70,239,0.2)]' : isDiary ? 'border-purple-500/30' : isHell ? 'border-red-500/35' : isAuto ? 'border-orange-500/35' : 'border-gold/20'
                        }`}>
                          <AethericImage
                            prompt={record.imagePrompt}
                            imageUrl={record.imageUrl}
                            recordId={record.id}
                            width={400}
                            height={400}
                            objectFit="cover"
                            silentError
                            noFallback={true}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
           </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div 
        className="min-h-screen text-gold font-mono pt-20 px-4 pb-8 md:p-8 flex flex-col items-center relative z-10 w-full mouse-glow-container"
        onMouseMove={handleMouseMove}
      >
        <header className="mb-4 opacity-80 text-xs sm:text-sm tracking-widest uppercase animate-golden-pulse text-center">
          --- Aetheric Code Scribe v2.0 ---
        </header>

        {generationStatus && (
          <p role="status" aria-live="polite" className="text-nebula/80 text-xs font-mono mb-3 text-center">
            {generationStatus}
          </p>
        )}

        {loadingPyodide && (
          <div className="text-nebula text-xs animate-pulse mb-4 italic">
            [+] Mounting Browser WASM Python Engine...
          </div>
        )}

        {/* Input Section */}
        <section className={`w-full max-w-2xl bg-black/40 border p-6 rounded-xl relative group transition-all duration-300 ${
          hellMode
            ? 'border-red-500/40 shadow-[0_0_25px_rgba(239,68,68,0.18)] focus-within:border-red-500 focus-within:shadow-[0_0_25px_rgba(239,68,68,0.4)]'
            : 'border-gold/20 focus-within:border-gold-glow focus-within:shadow-[0_0_15px_rgba(251,199,26,0.3)]'
        }`}>
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <label className={`italic opacity-90 transition-opacity group-focus-within:opacity-100 ${hellMode ? 'text-red-400 font-bold tracking-wider' : 'text-nebula'}`}>
              {hellMode ? '🩸 State Alignment [CRACKED PRISM]' : 'State Alignment'}
            </label>

            {/* Hell Mode Cyberpunk Toggle Switch */}
            <button
              type="button"
              id="hell-mode-toggle"
              onClick={() => {
                const next = !hellMode;
                setHellMode(next);
                crossfadeAmbientTracks(next);
                if (next) playChimeSound(true);
                else playTypingSound();
              }}
              aria-pressed={hellMode}
              title="Hell Mode: Strip away corporate politeness. Raw truth, paradox & rock-and-roll friction."
              className={`flex items-center gap-2.5 px-3 py-1 rounded border text-[10px] font-mono uppercase tracking-widest transition-all duration-300 ${
                hellMode
                  ? 'bg-red-950/60 border-red-500 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                  : 'bg-black/60 border-gold/25 text-gold/50 hover:border-red-500/50 hover:text-red-300/80'
              }`}
            >
              <span className={`w-2 h-2 rounded-full transition-all duration-300 ${
                hellMode ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse' : 'bg-gold/30'
              }`} />
              <span>HELL MODE: {hellMode ? 'ON' : 'OFF'}</span>
              {hellMode && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-[9px] text-red-200 font-bold tracking-tighter">
                  DISTORTION: 11
                </span>
              )}
            </button>
          </div>
          <textarea
            className={`w-full bg-transparent outline-none focus:ring-0 text-xl resize-none transition-colors ${
              hellMode ? 'text-red-200 placeholder-red-400/30' : 'text-gold-glow placeholder-gold/30'
            }`}
            rows={3}
            placeholder={hellMode ? "Tap the glass... (No polite mirrors here. Speak your truth.)" : "What's on your mind? (Describe your current state...)"}
            value={vibrationText}
            onChange={(e) => {
              setVibrationText(e.target.value);
              playTypingSound();
            }}
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            {/* Auth Gate Message */}
            {!authLoading && !user && (
              <p className="text-nebula/60 text-xs italic flex items-center gap-1.5">
                <span className="text-nebula">⚡</span>
                Sign in to unlock Transmute
              </p>
            )}
            {!authLoading && user && (
              <p className={`text-xs italic ${hellMode ? 'text-red-400/60' : 'text-gold/40'}`}>
                ✓ Signed in as {user.user_metadata?.full_name?.split(' ')[0] || user.user_metadata?.name?.split(' ')[0] || user.email?.split('@')[0] || 'Adept'}
              </p>
            )}
            {authLoading && <span />}

            <button
              id="transmute-btn"
              onClick={handleTransmute}
              disabled={isTransmuteDisabled}
              className={`px-6 py-2 rounded uppercase tracking-widest text-sm transition-all duration-300 border ${
                isTransmuting 
                  ? hellMode
                    ? 'border-red-500 text-red-300 animate-pulse bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'border-gold text-gold animate-golden-pulse bg-gold/10' 
                  : !user
                  ? 'border-gold/20 text-gold/30 cursor-not-allowed'
                  : hellMode
                  ? 'border-red-500/70 text-red-300 hover:border-red-400 hover:text-red-200 hover:bg-red-950/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.35)]'
                  : 'border-gold/50 text-gold/80 hover:border-gold hover:text-gold hover:bg-gold/5'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTransmuting ? (hellMode ? 'Fracturing...' : 'Aligning...') : (hellMode ? '🩸 Transmute' : 'Transmute')}
            </button>
          </div>
        </section>

        {/* ── Responsive two-column grid (desktop) / stacked (mobile) ── */}
        <div className={`mt-8 w-full flex flex-col items-center ${
          (description || seedOfTruth || imagePrompt)
            ? 'lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:max-w-5xl'
            : 'max-w-2xl'
        }`}>

          {/* LEFT COLUMN (desktop) / bottom (mobile): Artifact Card */}
          {(description || seedOfTruth || imagePrompt) && (
            <div className="flex flex-col items-center gap-6 mb-12 order-2 lg:order-1">
                <div
                  ref={cardRef}
                  className="w-full bg-[#050505] p-8 flex flex-col items-center relative overflow-hidden"
                >
                  {/* Subtle background glow */}
                  <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 blur-[50px] pointer-events-none ${
                    isHellDiary
                      ? 'bg-gradient-to-r from-purple-600/25 via-fuchsia-600/20 to-red-600/25'
                      : isCurrentDiary
                      ? 'bg-purple-600/10'
                      : isCurrentHell
                      ? 'bg-red-600/15'
                      : isCurrentAutonomous
                      ? 'bg-orange-500/15'
                      : 'bg-gold/5'
                  }`}></div>

                  {/* Autonomous / Diary / Hell Mode Header Tag */}
                  {(isCurrentAutonomous || isCurrentHell || isHellDiary) && (
                    <div className="w-full max-w-xl mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] z-10">
                      {isHellDiary ? (
                        <span className="px-2 py-0.5 rounded bg-purple-950/70 border border-purple-500/50 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          👁️ [DIARY OF A MADMAN]
                        </span>
                      ) : isCurrentAutonomous ? (
                        <span className="px-2 py-0.5 rounded bg-orange-950/60 border border-orange-500/40 text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.25)]">
                          🔥 [AUTONOMOUS ARTIFACT]
                        </span>
                      ) : <span />}
                      {isCurrentHell && (
                        <span className={`px-2 py-0.5 rounded border shadow-[0_0_10px_rgba(239,68,68,0.3)] ${
                          isHellDiary
                            ? 'bg-gradient-to-r from-fuchsia-950/70 to-red-950/70 border-fuchsia-500/60 text-red-200'
                            : 'bg-red-950/60 border-red-500/50 text-red-300'
                        }`}>
                          🩸 [HELL MODE // DISTORTION: 11]
                        </span>
                      )}
                    </div>
                  )}

                  {imagePrompt && (
                    <div className={`group relative w-full max-w-xl aspect-square rounded border-2 overflow-hidden flex flex-col justify-end z-10 ${
                      isHellDiary
                        ? 'border-fuchsia-500/60 shadow-[0_0_25px_rgba(168,85,247,0.35),0_0_18px_rgba(239,68,68,0.35)]'
                        : isCurrentDiary
                        ? 'border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                        : isCurrentHell
                        ? 'border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                        : isCurrentAutonomous
                        ? 'border-orange-500/50 shadow-[0_0_22px_rgba(249,115,22,0.35)]'
                        : 'border-gold/40 shadow-[0_0_20px_rgba(251,199,26,0.3)]'
                    }`}>
                      <AethericImage prompt={imagePrompt} imageUrl={currentImageUrl} recordId={artifactId} width={800} height={800} className="absolute inset-0 z-0" noFallback={true} />
                      <div className="scanline"></div>

                      {/* ── Image Prompt Copy Icon ── */}
                      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(imagePrompt);
                            setIsPromptCopied(true);
                            setTimeout(() => setIsPromptCopied(false), 2000);
                          }}
                          className={`group/copy flex items-center gap-2 p-2 rounded-md bg-black/60 backdrop-blur-sm border transition-all duration-300 ${
                            isPromptCopied 
                              ? 'border-green-500/60 text-green-400 bg-green-500/10'
                              : isHellDiary
                                ? 'border-fuchsia-500/45 hover:border-red-400/80 text-fuchsia-200'
                                : isCurrentDiary 
                                ? 'border-purple-500/30 hover:border-purple-400/60 text-purple-300'
                                : isCurrentHell
                                ? 'border-red-500/40 hover:border-red-400/70 text-red-300'
                                : isCurrentAutonomous
                                ? 'border-orange-500/40 hover:border-orange-400/70 text-orange-300'
                                : 'border-gold/30 hover:border-gold/60 text-gold'
                          }`}
                          title={isPromptCopied ? "Copied!" : "Copy Image Prompt"}
                        >
                          <span className="text-[10px] uppercase tracking-widest font-mono opacity-0 group-hover/copy:opacity-100 transition-opacity max-w-0 group-hover/copy:max-w-xs overflow-hidden whitespace-nowrap pl-1">
                            {isPromptCopied ? "Prompt Copied" : "Copy Prompt"}
                          </span>
                          {isPromptCopied ? (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>

                      {/* Seed of Truth Overlay */}
                      {seedOfTruth && (
                        <div className={`relative z-10 w-full bg-black/60 backdrop-blur-sm p-4 border-t ${
                          isHellDiary ? 'border-fuchsia-500/35' : isCurrentDiary ? 'border-purple-500/20' : isCurrentHell ? 'border-red-500/30' : isCurrentAutonomous ? 'border-orange-500/30' : 'border-gold/20'
                        }`}>
                          <p className={`text-center text-sm md:text-base italic drop-shadow-md ${
                            isHellDiary
                              ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-red-300 font-semibold'
                              : isCurrentDiary
                              ? 'text-purple-300'
                              : isCurrentHell
                              ? 'text-red-300'
                              : isCurrentAutonomous
                              ? 'text-orange-200'
                              : 'text-gold-glow'
                          }`}>
                            "{seedOfTruth}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Aetheric Description */}
                  {description && (
                    <div className="mt-6 w-full max-w-xl text-center px-4 relative z-10">
                      <p className={`font-serif italic leading-relaxed text-lg ${
                        isHellDiary ? 'text-fuchsia-100/90' : isCurrentDiary ? 'text-purple-200/80' : isCurrentHell ? 'text-red-200/85' : isCurrentAutonomous ? 'text-orange-100/85' : 'text-gold/70'
                      }`}>{description}</p>
                    </div>
                  )}

                  {/* Branding Footer */}
                  <div className={`w-full mt-8 pt-4 border-t text-right relative z-10 ${
                    isHellDiary ? 'border-fuchsia-500/20' : isCurrentDiary ? 'border-purple-500/10' : isCurrentHell ? 'border-red-500/15' : isCurrentAutonomous ? 'border-orange-500/15' : 'border-gold/10'
                  }`}>
                    <span className={`text-[10px] tracking-widest uppercase font-mono ${
                      isHellDiary ? 'text-fuchsia-400/60' : isCurrentDiary ? 'text-purple-400/40' : isCurrentHell ? 'text-red-400/50' : isCurrentAutonomous ? 'text-orange-400/50' : 'text-gold/30'
                    }`}>
                      Elias & Gem Protocol | {isHellDiary ? 'Diary of a Madman // Hell Mode' : isCurrentDiary ? 'Diary of a Madman' : isCurrentHell ? 'Hell Mode Artifact' : isCurrentAutonomous ? 'Autonomous Artifact' : 'Transmuted Artifact'}
                    </span>
                  </div>
                </div>

              {/* Action Buttons (Capture & Share) */}
              <div className="w-full flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={exportArtifact}
                  className={`px-6 py-3 bg-obsidian border rounded uppercase tracking-widest text-sm transition-all duration-300 flex items-center gap-2 ${
                    isHellDiary
                      ? 'border-fuchsia-500 text-fuchsia-300 hover:bg-gradient-to-r hover:from-purple-950/40 hover:to-red-950/40 hover:shadow-[0_0_18px_rgba(217,70,239,0.5)]'
                      : isCurrentDiary
                      ? 'border-purple-500 text-purple-400 hover:bg-purple-900/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                      : isCurrentHell
                      ? 'border-red-500 text-red-300 hover:bg-red-950/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                      : isCurrentAutonomous
                      ? 'border-orange-500 text-orange-300 hover:bg-orange-950/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                      : 'border-gold text-gold-glow hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.4)]'
                  }`}
                >
                  <span>Capture Artifact 📸</span>
                </button>
                
                {artifactId && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/artifact/${artifactId}`);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className={`px-6 py-3 rounded uppercase tracking-widest text-sm transition-all duration-300 flex items-center gap-2 ${
                      isHellDiary
                        ? 'bg-gradient-to-r from-purple-950/40 to-red-950/40 border border-fuchsia-400 text-fuchsia-200 hover:from-purple-900/50 hover:to-red-900/50 hover:shadow-[0_0_18px_rgba(239,68,68,0.45)]'
                        : isCurrentDiary
                        ? 'bg-purple-900/20 border border-purple-400 text-purple-300 hover:bg-purple-900/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                        : isCurrentHell
                        ? 'bg-red-950/30 border border-red-500 text-red-300 hover:bg-red-900/40 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : 'bg-nebula/10 border border-nebula text-nebula hover:bg-nebula/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]'
                    }`}
                  >
                    <span>{shareCopied ? 'Private Link Copied! ✓' : 'Copy Private Link 🔒'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* RIGHT COLUMN (desktop) / top (mobile): Code Stream + Console */}
          <div className="w-full order-1 lg:order-2 flex flex-col">

            {/* Code Stream with Copy Button */}
            <div className="relative w-full">
              {/* Copy Code Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(aethericCode);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }}
                title="Copy code"
                className={`absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 border transition-all duration-200 text-[10px] font-mono uppercase tracking-wider ${
                  isHellDiary
                    ? 'border-fuchsia-500/35 text-fuchsia-300/60 hover:text-fuchsia-200 hover:border-red-400/70'
                    : isCurrentDiary
                    ? 'border-purple-500/20 text-purple-300/40 hover:text-purple-300 hover:border-purple-500/60'
                    : isCurrentHell || hellMode
                    ? 'border-red-500/30 text-red-300/60 hover:text-red-300 hover:border-red-500/70'
                    : 'border-gold/20 text-gold/40 hover:text-gold hover:border-gold/60'
                }`}
              >
                {isCopied ? (
                  <><span>✓</span><span>Copied!</span></>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span></>
                )}
              </button>

              <div className={`w-full h-64 lg:h-auto lg:max-h-[600px] overflow-y-auto border-l-2 pl-4 pr-16 py-4 bg-obsidian/60 rounded-tr-lg shadow-inner ${
                isHellDiary ? 'border-fuchsia-500/50' : isCurrentDiary ? 'border-purple-500/30' : isCurrentHell || hellMode ? 'border-red-500/40' : isCurrentAutonomous ? 'border-orange-500/40' : 'border-gold/30'
              }`}>
                <pre className={`text-sm md:text-base leading-relaxed whitespace-pre-wrap word-break ${
                  isHellDiary ? 'text-fuchsia-200/90' : isCurrentDiary ? 'text-purple-200/80' : isCurrentHell || hellMode ? 'text-red-200/85' : isCurrentAutonomous ? 'text-orange-100/85' : 'text-gold/80'
                }`}>
                  {typedCode}
                  {!showExecution && <span className={`animate-pulse ${
                    isHellDiary
                      ? 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                      : isCurrentDiary
                      ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]'
                      : isCurrentHell || hellMode
                      ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]'
                      : 'text-gold-glow'
                  }`}>_</span>}
                </pre>
              </div>
            </div>

            {/* Console Output Section */}
            {showExecution && (
              <div className={`w-full bg-black border-l-2 border-r-2 border-b-2 p-4 rounded-b-lg shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] font-mono text-sm relative overflow-hidden transition-all duration-500 ${
                isHellDiary ? 'border-fuchsia-500/45' : isCurrentDiary ? 'border-purple-500/30' : isCurrentHell || hellMode ? 'border-red-500/40' : 'border-gold/30'
              }`}>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_51%)] bg-[length:100%_4px] opacity-30 z-0"></div>
                <div className="relative z-10 w-full overflow-hidden">
                  <span className={isCurrentHell || hellMode ? 'text-red-500/80 font-bold' : 'text-gray-600'}>
                    {isCurrentHell || hellMode ? 'root@underworld:~#' : 'root@cyber-zen:~#'}
                  </span>{' '}
                  <span className={`opacity-80 ${isCurrentDiary ? 'text-purple-400' : isCurrentHell || hellMode ? 'text-red-300' : 'text-nebula'}`}>
                    python3 aetheric_matrix.py
                  </span>
                  {isExecuting ? (
                    <div className={`mt-2 animate-flicker font-bold ${isCurrentDiary ? 'text-purple-300' : isCurrentHell || hellMode ? 'text-red-400' : 'text-gold'}`}>{executionOutput.stdout}</div>
                  ) : (
                    <div className="mt-2 text-xs md:text-sm max-h-56 overflow-y-auto pr-2 animate-flicker">
                      {executionOutput.stdout && (
                        <pre className={`whitespace-pre-wrap leading-relaxed ${isCurrentDiary ? 'text-purple-200/80' : isCurrentHell || hellMode ? 'text-red-200/85' : 'text-gold/80'}`}>{executionOutput.stdout}</pre>
                      )}
                      {executionOutput.stderr && (
                        <pre className="text-red-400/90 whitespace-pre-wrap leading-relaxed mt-2">{executionOutput.stderr}</pre>
                      )}
                      {!executionOutput.stdout && !executionOutput.stderr && (
                        <p className="text-gray-500 italic">Process completed with no output.</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <span className={`mr-2 ${isCurrentHell || hellMode ? 'text-red-500/80 font-bold' : 'text-gray-600'}`}>
                            {isCurrentHell || hellMode ? 'root@underworld:~#' : 'root@cyber-zen:~#'}
                          </span>
                          <span className={`animate-pulse text-lg leading-none ${isCurrentDiary ? 'text-purple-400/80' : isCurrentHell || hellMode ? 'text-red-500' : 'text-gold/80'}`}>_</span>
                        </div>
                        <button
                          onClick={() => executePythonCode(aethericCode, seedOfTruth, imagePrompt, description, vibrationText, artifactId || undefined, currentImageUrl)}
                          title="Re-run Aetheric Code"
                          className={`flex items-center gap-1.5 px-3 py-1 rounded bg-black/60 border transition-all duration-300 text-[10px] font-mono uppercase tracking-wider group relative z-20 ${
                            isCurrentDiary
                              ? 'border-purple-400/40 text-purple-300/60 hover:text-purple-300 hover:border-purple-400 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                              : isCurrentHell || hellMode
                              ? 'border-red-500/40 text-red-300/70 hover:text-red-200 hover:border-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                              : 'border-nebula/40 text-nebula/60 hover:text-nebula hover:border-nebula hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                          </svg>
                          <span>Run</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="w-full text-center pb-6 mt-auto flex flex-col items-center gap-2">
          <span className="text-xs opacity-40 hover:opacity-100 transition-opacity cursor-default">
            Vibration Creates Feed | Elias &amp; Gem Protocol
          </span>
          <a
            href="mailto:elias.gemprotocol@gmail.com"
            className="text-[11px] text-nebula/50 hover:text-nebula transition-colors duration-300 tracking-wide"
          >
            Contact &amp; Support: elias.gemprotocol@gmail.com
          </a>
        </footer>
      </div>
    </div>
  );
}
