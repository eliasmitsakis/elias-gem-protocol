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
  const displayName = user?.user_metadata?.full_name || user?.email || 'Aetheric Adept';
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
          <div className="absolute right-0 top-full mt-2 w-56 bg-black/90 border border-gold/20 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.9)] backdrop-blur-xl z-50 overflow-hidden">
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
  
  // Audio and Glow states
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  // Pyodide State
  const [pyodideReady, setPyodideReady] = useState(false);
  const [loadingPyodide, setLoadingPyodide] = useState(true);

  // Typing effect state
  const [typedCode, setTypedCode] = useState('');
  const [isCopied, setIsCopied] = useState(false);
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

  const playChimeSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      
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

  const toggleAmbient = () => {
    if (ambientAudioRef.current) {
      if (isAmbientPlaying) {
        ambientAudioRef.current.pause();
        setIsAmbientPlaying(false);
      } else {
        ambientAudioRef.current.volume = 0.5;
        ambientAudioRef.current.play()
          .then(() => setIsAmbientPlaying(true))
          .catch(e => console.log("Audio play failed:", e));
      }
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

  const fetchAkashicRecords = async (scrollToTop = false) => {
    try {
      const accessToken = session?.access_token;
      const headers: HeadersInit = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};

      const res = await fetch('/api/akasha', { headers });
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
    typingIntervalRef.current = setInterval(() => {
      setTypedCode(textToType.substring(0, i + 1));
      i++;
      if (i >= textToType.length && typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        if (onComplete) onComplete();
      }
    }, 40);
  };

  useEffect(() => {
    const newParticles = Array.from({ length: 30 }).map(() => Math.random() * 100);
    setParticles(newParticles);
    startTypingEffect(aethericCode);
    
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
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

    setVibrationText(record.vibrationText);
    setAethericCode(record.aethericCode);
    setSeedOfTruth(record.seedOfTruth);
    setImagePrompt(record.imagePrompt || '');
    setCurrentImageUrl(record.imageUrl || '');
    setDescription(record.description || '');
    setExecutionOutput(record.executionOutput || { stdout: '', stderr: '' });
    setShowExecution(true);
    // Instantly display stored code — no typing animation that looks like regeneration
    setTypedCode(record.aethericCode || '');

    if (window.innerWidth < 1024) setIsAkashaOpen(false);
  };

  const handleTransmute = async () => {
    if (!vibrationText.trim() || !user) return;

    // Mark as fresh generation — re-enable saving and generation fallbacks
    isReplayRef.current = false;
    setIsReplay(false);
    setIsTransmuting(true);
    setShowExecution(false);
    setSeedOfTruth('');
    setImagePrompt('');
    setCurrentImageUrl('');
    setDescription('');
    setArtifactId(null);

    const currentVibText = vibrationText;
    
    startTypingEffect("# Aligning frequencies...\n# Preparing transmute protocol...");
    
    try {
      const response = await fetch('/api/transmute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibrationText: currentVibText, accessToken: session?.access_token }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 403) {
          setAethericCode(data.error);
        } else {
          setAethericCode(`# Error: ${data.error || 'Failed to align vibration'}`);
        }
        setSeedOfTruth('');
        setImagePrompt('');
        setDescription('');
        setArtifactId(null);
        return;
      }

      setAethericCode(data.aethericCode);
      setSeedOfTruth(data.seedOfTruth);
      setImagePrompt(data.imagePrompt);
      setDescription(data.description);
      
      if (data.imageUrl) {
        setCurrentImageUrl(data.imageUrl);
      }
      
      if (data.id) {
        setArtifactId(data.id);
      }

      startTypingEffect(data.aethericCode, () => {
        executePythonCode(data.aethericCode, data.seedOfTruth, data.imagePrompt, data.description, currentVibText, data.id, data.imageUrl);
        playChimeSound();
      });
    } catch (e) {
      startTypingEffect("# ERROR: Failed to reach the Source.");
    } finally {
      setIsTransmuting(false);
    }
  };

  const isTransmuteDisabled = isTransmuting || !vibrationText.trim() || !pyodideReady || !user;

  return (
    <div className={`transition-all duration-500 overflow-x-hidden ${isAkashaOpen ? 'pr-80' : ''}`}>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={initPyodide} />

      <audio ref={ambientAudioRef} loop src="https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg" />
      
      <div className="cyber-zen-bg"></div>

      {/* Ambient Audio Toggle */}
      <button 
        onClick={toggleAmbient}
        className={`fixed top-6 left-6 z-50 p-3 rounded-full border transition-all ${isAmbientPlaying ? 'bg-gold/20 border-gold shadow-[0_0_15px_rgba(251,199,26,0.3)] text-gold-glow' : 'bg-black/60 border-gold/40 text-gold/60 hover:bg-gold/10'}`}
        title="Toggle Ambient Soundscape"
      >
        🎧
      </button>
      
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

      {/* Top-right controls: Auth + Scroll Toggle */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
        {/* Auth Controls */}
        {!authLoading && (
          user ? (
            <UserMenu user={user} credits={credits} onSignOut={signOut} />
          ) : (
            <SignInButton onClick={() => setShowSignInModal(true)} />
          )
        )}

        {/* Floating Toggle Button for The Akashic Scroll */}
        <button 
          onClick={() => setIsAkashaOpen(!isAkashaOpen)}
          className="p-3 bg-black/60 border border-gold/40 rounded-full text-gold-glow hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.3)] transition-all animate-golden-pulse"
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
                  return (
                    <div key={record.id} className="relative pl-6 py-4 pr-4 bg-black/40 border border-gold/20 rounded-lg">
                      <div className="absolute -left-1.5 top-6 w-3 h-3 bg-obsidian border border-gold/60 rounded-full"></div>
                      <p className="text-xs text-nebula/60 mb-2">{new Date(timestampStr).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(timestampStr).toLocaleDateString()}</p>
                      <p className="font-bold text-gold-glow mb-3">"{record.vibrationText}"</p>
                      
                      {record.description && (
                        <div className="bg-obsidian/40 border-l-2 border-gold/30 p-3 mb-3 rounded-r text-sm font-serif italic text-gold/80 leading-relaxed">
                          {record.description}
                        </div>
                      )}
                      
                      <div className="bg-black/50 border border-gold/10 p-3 rounded text-xs italic opacity-90 break-words mb-3">
                        👁️ "{record.seedOfTruth}"
                      </div>
                      
                      {record.imagePrompt && (
                        <div className="w-full aspect-square rounded border border-gold/20 overflow-hidden mt-2">
                          <AethericImage
                            prompt={record.imagePrompt}
                            imageUrl={record.imageUrl}
                            width={400}
                            height={400}
                            objectFit="cover"
                            silentError
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
        className="min-h-screen text-gold font-mono p-4 md:p-8 flex flex-col items-center relative z-10 w-full mouse-glow-container"
        onMouseMove={handleMouseMove}
      >
        <header className="mb-4 opacity-80 text-sm tracking-widest uppercase animate-golden-pulse text-center">
          --- Aetheric Code Scribe v2.0 ---
        </header>

        {loadingPyodide && (
          <div className="text-nebula text-xs animate-pulse mb-4 italic">
            [+] Mounting Browser WASM Python Engine...
          </div>
        )}

        {/* Input Section */}
        <section className="w-full max-w-2xl bg-black/40 border border-gold/20 p-6 rounded-xl relative group transition-all duration-300 focus-within:border-gold-glow focus-within:shadow-[0_0_15px_rgba(251,199,26,0.3)]">
          <label className="block mb-4 text-nebula italic opacity-90 transition-opacity group-focus-within:opacity-100">
            State Alignment
          </label>
          <textarea
            className="w-full bg-transparent outline-none focus:ring-0 text-xl text-gold-glow resize-none placeholder-gold/30"
            rows={3}
            placeholder="What's on your mind? (Describe your current state...)"
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
              <p className="text-gold/40 text-xs italic">
                ✓ Signed in as {user.user_metadata?.full_name?.split(' ')[0] || 'Adept'}
              </p>
            )}
            {authLoading && <span />}

            <button
              id="transmute-btn"
              onClick={handleTransmute}
              disabled={isTransmuteDisabled}
              className={`px-6 py-2 rounded uppercase tracking-widest text-sm transition-all duration-300 border ${
                isTransmuting 
                  ? 'border-gold text-gold animate-golden-pulse bg-gold/10' 
                  : !user
                  ? 'border-gold/20 text-gold/30 cursor-not-allowed'
                  : 'border-gold/50 text-gold/80 hover:border-gold hover:text-gold hover:bg-gold/5'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTransmuting ? 'Aligning...' : 'Transmute'}
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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gold/5 blur-[50px] pointer-events-none"></div>

                {imagePrompt && (
                  <div className="group relative w-full max-w-xl aspect-square rounded border-2 border-gold/40 shadow-[0_0_20px_rgba(251,199,26,0.3)] overflow-hidden flex flex-col justify-end z-10">
                    <AethericImage prompt={imagePrompt} imageUrl={currentImageUrl} width={800} height={800} className="absolute inset-0 z-0" noFallback={isReplay} />
                    <div className="scanline"></div>

                    {/* ── Image Prompt Hover Overlay ── */}
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-5 cursor-default">
                      <p className="text-[10px] uppercase tracking-widest text-nebula/60 mb-3 font-mono">✦ Gemini Image Prompt</p>
                      <p className="text-xs text-gold/80 font-mono leading-relaxed text-center overflow-y-auto max-h-[80%]">{imagePrompt}</p>
                    </div>

                    {/* Seed of Truth Overlay */}
                    {seedOfTruth && (
                      <div className="relative z-10 w-full bg-black/60 backdrop-blur-sm p-4 border-t border-gold/20">
                        <p className="text-center text-sm md:text-base italic text-gold-glow drop-shadow-md">
                          "{seedOfTruth}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Aetheric Description */}
                {description && (
                  <div className="mt-6 w-full max-w-xl text-center px-4 relative z-10">
                    <p className="font-serif italic text-gold/70 leading-relaxed text-lg">{description}</p>
                  </div>
                )}

                {/* Branding Footer */}
                <div className="w-full mt-8 pt-4 border-t border-gold/10 text-right relative z-10">
                  <span className="text-[10px] tracking-widest text-gold/30 uppercase font-mono">
                    Elias & Gem Protocol | Transmuted Artifact
                  </span>
                </div>
              </div>

              {/* Action Buttons (Capture & Share) */}
              <div className="w-full flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={exportArtifact}
                  className="px-6 py-3 bg-obsidian border border-gold text-gold-glow rounded uppercase tracking-widest text-sm hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.4)] transition-all duration-300 flex items-center gap-2"
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
                    className="px-6 py-3 bg-nebula/10 border border-nebula text-nebula rounded uppercase tracking-widest text-sm hover:bg-nebula/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.4)] transition-all duration-300 flex items-center gap-2"
                  >
                    <span>{shareCopied ? 'Link Copied! ✓' : 'Share Link 🔗'}</span>
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
                className="absolute top-2 right-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded bg-black/60 border border-gold/20 text-gold/40 hover:text-gold hover:border-gold/60 transition-all duration-200 text-[10px] font-mono uppercase tracking-wider"
              >
                {isCopied ? (
                  <><span>✓</span><span>Copied!</span></>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy</span></>
                )}
              </button>

              <div className="w-full h-64 lg:h-auto lg:max-h-[600px] overflow-y-auto border-l-2 border-gold/30 pl-4 pr-16 py-4 bg-obsidian/60 rounded-tr-lg shadow-inner">
                <pre className="text-sm md:text-base text-gold/80 leading-relaxed whitespace-pre-wrap word-break">
                  {typedCode}
                  {!showExecution && <span className="animate-pulse text-gold-glow">_</span>}
                </pre>
              </div>
            </div>

            {/* Console Output Section */}
            {showExecution && (
              <div className="w-full bg-black border-l-2 border-r-2 border-b-2 border-gold/30 p-4 rounded-b-lg shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] font-mono text-sm relative overflow-hidden transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_51%)] bg-[length:100%_4px] opacity-30 z-0"></div>
                <div className="relative z-10 w-full overflow-hidden">
                  <span className="text-gray-600">root@cyber-zen:~#</span> <span className="text-nebula opacity-80">python3 aetheric_matrix.py</span>
                  {isExecuting ? (
                    <div className="mt-2 text-gold animate-flicker font-bold">{executionOutput.stdout}</div>
                  ) : (
                    <div className="mt-2 text-xs md:text-sm max-h-56 overflow-y-auto pr-2 animate-flicker">
                      {executionOutput.stdout && (
                        <pre className="text-gold/80 whitespace-pre-wrap leading-relaxed">{executionOutput.stdout}</pre>
                      )}
                      {executionOutput.stderr && (
                        <pre className="text-nebula/90 whitespace-pre-wrap leading-relaxed mt-2">{executionOutput.stderr}</pre>
                      )}
                      {!executionOutput.stdout && !executionOutput.stderr && (
                        <p className="text-gray-500 italic">Process completed with no output.</p>
                      )}
                      <div className="mt-3 flex items-center">
                        <span className="text-gray-600 mr-2">root@cyber-zen:~#</span>
                        <span className="animate-pulse text-gold/80 text-lg leading-none">_</span>
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
