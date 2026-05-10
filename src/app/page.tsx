'use client';

import React, { useEffect, useState, useRef } from 'react';
import Script from 'next/script';
import { toPng } from 'html-to-image';

declare global {
  interface Window {
    loadPyodide: any;
    pyodideInstance: any;
  }
}

const AethericImage = ({ prompt, imageUrl, width, height, className = "" }: { prompt: string; imageUrl?: string; width: number; height: number; className?: string }) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setHasError(false);
    setUseFallback(false);
  }, [prompt, imageUrl]);

  const currentSrc = useFallback || !imageUrl 
    ? `/api/vision?prompt=${encodeURIComponent(prompt)}&width=${width}&height=${height}`
    : imageUrl;

  return (
    <div className={`relative w-full h-full bg-obsidian/60 flex items-center justify-center overflow-hidden group ${className}`}>
      {!loaded && !hasError && (
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
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0 border border-red-900/30 bg-red-900/10">
          <p className="text-red-500/80 text-xs font-mono italic mb-2">
            [!] Vision collapsed in the void.
          </p>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!hasError && (
        <img 
          src={currentSrc} 
          alt="Aetheric Vision" 
          className={`w-full h-full object-cover transition-all duration-1000 relative z-10 ${loaded ? 'opacity-80 group-hover:opacity-100 group-hover:scale-105' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            if (!useFallback && imageUrl) {
              setUseFallback(true);
            } else {
              setHasError(true);
              setLoaded(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default function CyberZenPortal() {
  const [particles, setParticles] = useState<number[]>([]);
  const [vibrationText, setVibrationText] = useState('');
  const [isTransmuting, setIsTransmuting] = useState(false);
  
  // Audio and Glow states
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Response states
  const [aethericCode, setAethericCode] = useState(`class VibrationTransmutation(Awareness):\n    def __init__(self):\n        self.state = "Analyzing Flow..."\n        \n    def transmute(self, frequency):\n        return self._align(frequency)`);
  const [seedOfTruth, setSeedOfTruth] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [description, setDescription] = useState('');

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
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (isAmbientPlaying) {
        if (ambientGainRef.current && ambientOscRef.current) {
          ambientGainRef.current.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1);
          const oscToStop = ambientOscRef.current;
          setTimeout(() => {
            try {
              oscToStop.stop();
              oscToStop.disconnect();
            } catch (e) {}
          }, 1000);
          ambientOscRef.current = null;
        }
        setIsAmbientPlaying(false);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        // Deep meditative drone (C2)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65.41, ctx.currentTime);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 3); // 3-second fade in
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        ambientOscRef.current = osc;
        ambientGainRef.current = gain;
        
        setIsAmbientPlaying(true);
      }
    } catch (e) {
      console.error("Ambient toggle failed", e);
    }
  };

  const exportArtifact = async () => {
    if (cardRef.current) {
      try {
        const dataUrl = await toPng(cardRef.current, { quality: 1, backgroundColor: '#050505' });
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
      const res = await fetch('/api/akasha');
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
    fetchAkashicRecords();
    
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    };
  }, []);

  const saveToAkasha = async (execOutput: {stdout: string, stderr: string}, code: string, seed: string, img: string, desc: string, currentVibText: string) => {
    try {
      await fetch('/api/akasha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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

  const executePythonCode = async (code: string, seed: string, img: string, desc: string, currentVibText: string) => {
    setShowExecution(true);
    setIsExecuting(true);
    setExecutionOutput({ stdout: '[!] Transmuting Python in Browser via WASM Edge Engine...', stderr: '' });

    let execOut = { stdout: '', stderr: '' };
    
    if (!window.pyodideInstance || !pyodideReady) {
       execOut = { stdout: '', stderr: 'SYSTEM CORE FAILURE: The WASM Python Sandbox is not mounted yet. Wait a moment and try again.' };
       setExecutionOutput(execOut);
       setIsExecuting(false);
       saveToAkasha(execOut, code, seed, img, desc, currentVibText);
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
      saveToAkasha(execOut, code, seed, img, desc, currentVibText);
    }
  };

  const handleReplay = (record: any) => {
    setVibrationText(record.vibrationText);
    setAethericCode(record.aethericCode);
    setSeedOfTruth(record.seedOfTruth);
    setImagePrompt(record.imagePrompt || '');
    setCurrentImageUrl(record.imageUrl || '');
    setDescription(''); 
    
    setShowExecution(false);
    setIsExecuting(false);
    
    startTypingEffect(record.aethericCode, () => {
      setExecutionOutput(record.executionOutput || { stdout: '', stderr: '' });
      setShowExecution(true);
    });

    if (window.innerWidth < 1024) setIsAkashaOpen(false);
  };

  const handleTransmute = async () => {
    if (!vibrationText.trim()) return;
    
    setIsTransmuting(true);
    setShowExecution(false);
    setSeedOfTruth('');
    setImagePrompt('');
    setCurrentImageUrl('');
    setDescription('');

    const currentVibText = vibrationText;
    
    startTypingEffect("# Aligning frequencies...\n# Preparing transmute protocol...");
    
    try {
      const response = await fetch('/api/transmute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vibrationText: currentVibText }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setAethericCode(data.aethericCode);
        setSeedOfTruth(data.seedOfTruth);
        setImagePrompt(data.imagePrompt);
        setDescription(data.description);

        startTypingEffect(data.aethericCode, () => {
          executePythonCode(data.aethericCode, data.seedOfTruth, data.imagePrompt, data.description, currentVibText);
          playChimeSound();
        });
      } else {
        startTypingEffect("# ERROR: Reality breach detected.\n# " + data.error);
      }
    } catch (e) {
      startTypingEffect("# ERROR: Failed to reach the Source.");
    } finally {
      setIsTransmuting(false);
    }
  };

  return (
    <div className={`transition-all duration-500 overflow-x-hidden ${isAkashaOpen ? 'pr-80' : ''}`}>
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" onLoad={initPyodide} />

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

      {/* Floating Toggle Button for The Akashic Scroll */}
      <button 
        onClick={() => setIsAkashaOpen(!isAkashaOpen)}
        className="fixed top-6 right-6 z-50 p-3 bg-black/60 border border-gold/40 rounded-full text-gold-glow hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.3)] transition-all animate-golden-pulse"
        title="Toggle The Aetheric Scroll"
      >
        📜
      </button>

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
                    <div key={record.id} onClick={() => handleReplay(record)} className="relative pl-6 py-4 pr-4 bg-black/40 border border-gold/20 rounded-lg group cursor-pointer hover:bg-black/60 hover:border-gold/50 hover:shadow-[0_0_15px_rgba(251,199,26,0.1)] transition-all">
                      <div className="absolute -left-1.5 top-6 w-3 h-3 bg-obsidian border border-gold/60 rounded-full group-hover:bg-gold-glow group-hover:shadow-[0_0_8px_rgba(251,199,26,0.8)] transition-all"></div>
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
                        <div className="w-full aspect-video rounded border border-gold/20 overflow-hidden mt-2">
                          <AethericImage prompt={record.imagePrompt} imageUrl={record.imageUrl} width={800} height={400} />
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
            placeholder="What’s on your mind? (Describe your current state...)"
            value={vibrationText}
            onChange={(e) => {
              setVibrationText(e.target.value);
              playTypingSound();
            }}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleTransmute}
              disabled={isTransmuting || !vibrationText.trim() || !pyodideReady}
              className={`px-6 py-2 rounded uppercase tracking-widest text-sm transition-all duration-300 border ${
                isTransmuting 
                  ? 'border-gold text-gold animate-golden-pulse bg-gold/10' 
                  : 'border-gold/50 text-gold/80 hover:border-gold hover:text-gold hover:bg-gold/5'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isTransmuting ? 'Aligning...' : 'Transmute'}
            </button>
          </div>
        </section>

        {/* Code Stream Section */}
        <div className="mt-8 w-full max-w-2xl h-64 overflow-y-auto border-l-2 border-gold/30 pl-4 py-4 bg-obsidian/60 rounded-tr-lg shadow-inner">
          <pre className="text-sm md:text-base text-gold/80 leading-relaxed whitespace-pre-wrap word-break">
            {typedCode}
            {!showExecution && <span className="animate-pulse text-gold-glow">_</span>}
          </pre>
        </div>

        {/* Console Output Section */}
        {showExecution && (
          <div className="w-full max-w-2xl bg-black border-l-2 border-r-2 border-b-2 border-gold/30 p-4 rounded-b-lg shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)] font-mono text-sm relative overflow-hidden transition-all duration-500">
             <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.25)_51%)] bg-[length:100%_4px] opacity-30 z-0"></div>
             <div className="relative z-10 w-full overflow-hidden">
               <span className="text-gray-600">root@cyber-zen:~#</span> <span className="text-nebula opacity-80">python3 aetheric_matrix.py</span>
               
               {isExecuting ? (
                 <div className="mt-2 text-gold animate-flicker font-bold">
                   {executionOutput.stdout}
                 </div>
               ) : (
                 <div className="mt-2 text-xs md:text-sm max-h-40 overflow-y-auto pr-2 animate-flicker">
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
                     <span className="text-gray-600 mr-2">root@cyber-zen:~#</span> <span className="animate-pulse text-gold/80 text-lg leading-none">_</span>
                   </div>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Artifact Card Container */}
        {(description || seedOfTruth || imagePrompt) && (
          <div className="mt-8 w-full max-w-2xl flex flex-col items-center gap-6 mb-12">
            <div 
              ref={cardRef}
              className="w-full bg-[#050505] p-8 flex flex-col items-center relative overflow-hidden"
            >
              {/* Subtle background glow for the card */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gold/5 blur-[50px] pointer-events-none"></div>

              {imagePrompt && (
                <div className="relative w-full max-w-xl aspect-square md:aspect-[4/3] rounded border-2 border-gold/40 shadow-[0_0_20px_rgba(251,199,26,0.3)] overflow-hidden flex flex-col justify-end z-10">
                   <AethericImage prompt={imagePrompt} imageUrl={currentImageUrl} width={800} height={800} className="absolute inset-0 z-0" />
                   <div className="scanline"></div>
                   
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

              {/* Aetheric Description Below Image */}
              {description && (
                <div className="mt-6 w-full max-w-xl text-center px-4 relative z-10">
                  <p className="font-serif italic text-gold/70 leading-relaxed text-lg">
                    {description}
                  </p>
                </div>
              )}

              {/* Branding Footer */}
              <div className="w-full mt-8 pt-4 border-t border-gold/10 text-right relative z-10">
                <span className="text-[10px] tracking-widest text-gold/30 uppercase font-mono">
                  Elias & Gem Protocol | Transmuted Artifact
                </span>
              </div>
            </div>

            {/* Capture Artifact Button */}
            <button
              onClick={exportArtifact}
              className="px-6 py-3 bg-obsidian border border-gold text-gold-glow rounded uppercase tracking-widest text-sm hover:bg-gold/10 hover:shadow-[0_0_15px_rgba(251,199,26,0.4)] transition-all duration-300 flex items-center gap-2"
            >
              <span>Capture Artifact 📸</span>
            </button>
          </div>
        )}

        <footer className="w-full text-center pb-6 mt-auto text-xs opacity-40 hover:opacity-100 transition-opacity cursor-default">
          Vibration Creates Feed | Elias & Gem Protocol
        </footer>
      </div>
    </div>
  );
}
