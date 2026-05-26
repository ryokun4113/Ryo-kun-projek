import React, { useState, useEffect, useRef } from "react";
import { ShieldCheck, Cpu, X, Maximize2, Minimize2, AlertTriangle, Terminal, Volume2, VolumeX, Eye, Move } from "lucide-react";
import { motion, useDragControls } from "motion/react";

type Item = {
  id: string;
  name: string;
  category: string;
  serial: string;
  popor: string;
  holder: string;
  note: string;
  status: "Di Gudang" | "Keluar";
  date: string;
  customOverdueHours?: number;
  outTimestamp?: number;
  dueDate?: number;
};

type Log = {
  id: string;
  name: string;
  status: string;
  type: string;
  holder: string;
  time: string;
  fullDate: string;
  operator: string;
  timestamp: number;
  sessionName?: string;
};

interface JarvisAssistantProps {
  logs: Log[];
  inventory: Item[];
  isOnline: boolean;
  currentUser: any;
}

export function JarvisAssistant({ logs, inventory, isOnline, currentUser }: JarvisAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(true); // Default minimized on mobile
  const [timeStr, setTimeStr] = useState("");
  const [jarvisLogs, setJarvisLogs] = useState<string[]>([]);
  const [isVoiceOn, setIsVoiceOn] = useState(true);
  const [systemThreatLevel, setSystemThreatLevel] = useState<"SAFE" | "ALERT">("SAFE");
  const processedLogsRef = useRef<Set<string>>(new Set());
  const constraintsRef = useRef(null);

  // Local clock styled chronometer
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString("id-ID", { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine system status/threat level based on overdue items
  useEffect(() => {
    const overdueCount = inventory.filter(i => i.status === "Keluar" && i.dueDate && Date.now() > i.dueDate).length;
    if (overdueCount > 0) {
      setSystemThreatLevel("ALERT");
    } else {
      setSystemThreatLevel("SAFE");
    }
  }, [inventory]);

  // Handle Voice Announcement and Jarvis Live Feed Update on real logs
  useEffect(() => {
    if (!logs || logs.length === 0) {
      // Boot logs
      if (jarvisLogs.length === 0) {
        setJarvisLogs([
          `[SYSTEM] NEURAL LINK ESTABLISHED`,
          `[SYSTEM] PROTOCOL J.A.R.V.I.S ONLINE`,
          `[AUTH] ACCESS GRANTED FOR USER: ${currentUser?.username || "RYO KUN"}`,
          `[STATUS] RADAR SCANS ACTIVE. OVERSEEING CURRENT INVENTORY.`
        ]);
      }
      return;
    }

    // Get the most recent logs
    const latestLogs = [...logs].slice(0, 5).reverse();
    const newFeedLines: string[] = [];

    latestLogs.forEach(log => {
      const uniqueId = `${log.timestamp}-${log.id}-${log.type}`;
      if (!processedLogsRef.current.has(uniqueId)) {
        processedLogsRef.current.add(uniqueId);
        
        let feedText = "";
        if (log.type === "OUT") {
          feedText = `[SCAN OUT] ${log.name} -> PEMEGANG: ${log.holder || "UNKNOWN"}`;
        } else if (log.type === "IN") {
          feedText = `[SCAN IN] ${log.name} -> DI GUDANG`;
        } else if (log.type === "ADD") {
          feedText = `[NEW REG] ${log.name} SKU: ${log.id}`;
        } else if (log.type === "EDIT") {
          feedText = `[UPDATED] ${log.name} MODIFIED BY ${log.operator}`;
        } else {
          feedText = `[MUTASI] ${log.type} ASET ${log.id}`;
        }
        
        newFeedLines.push(feedText);
      }
    });

    if (newFeedLines.length > 0) {
      setJarvisLogs(prev => {
        const updated = [...prev, ...newFeedLines];
        // Limit to last 20 feeds
        return updated.slice(-20);
      });
    }
  }, [logs]);

  // Overdue item check and voice alert
  useEffect(() => {
    const overdueItems = inventory.filter(i => i.status === "Keluar" && i.dueDate && Date.now() > i.dueDate);
    if (overdueItems.length > 0) {
      const overdueNames = overdueItems.map(i => i.name).join(", ");
      const overdueCount = overdueItems.length;
      
      const interval = setInterval(() => {
        if (isVoiceOn) {
          triggerVoiceAnnouncement(`Perhatian, terdeteksi ${overdueCount} pengembalian senjata terlambat. Segera lakukan penindakan.`);
        }
      }, 30000); // remind every 30 seconds if overdue and voice enabled

      return () => clearInterval(interval);
    }
  }, [inventory, isVoiceOn]);

  const triggerVoiceAnnouncement = (text: string) => {
    if (!isVoiceOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;
    utterance.pitch = 0.85; // slightly deeper synthetic robot voice
    window.speechSynthesis.speak(utterance);
  };

  const handleInteractCore = () => {
    const overdueCount = inventory.filter(i => i.status === "Keluar" && i.dueDate && Date.now() > i.dueDate).length;
    let text = "";
    if (overdueCount > 0) {
      text = `Peringatan Komandan, ${overdueCount} aset terduga terlambat dikembalikan. Seluruh instrumen taktis bersiaga.`;
    } else {
      const diGudang = inventory.filter(i => i.status === "Di Gudang").length;
      text = `Seluruh sistem taktis termonitor sangat aman. ${diGudang} persenjataaan tersimpan di dalam armada gudang.`;
    }
    triggerVoiceAnnouncement(text);
  };

  // Sound bars animation height values
  const spectrumBars = [
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.1s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.3s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.5s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.2s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.4s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.6s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.15s]",
    "animate-[spectrum_1.2s_ease-in-out_infinite_0.35s]",
  ];

  return (
    <>
      <style>
        {`
          @keyframes rotate-clockwise {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes rotate-counter {
            from { transform: rotate(360deg); }
            to { transform: rotate(0deg); }
          }
          @keyframes pulse-glow {
            0%, 100% { transform: scale(1); opacity: 0.85; filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.4)); }
            50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 20px rgba(6, 182, 212, 0.9)); }
          }
          @keyframes spectrum {
            0%, 100% { height: 4px; }
            50% { height: 26px; }
          }
          @keyframes scanline {
            0% { top: -100%; }
            100% { top: 100%; }
          }
          @keyframes orbit {
            from { transform: rotate(0deg) translateX(45px) rotate(0deg); }
            to { transform: rotate(360deg) translateX(45px) rotate(-360deg); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-5px); }
          }
          .animate-rotate-cw {
            animation: rotate-clockwise 15s linear infinite;
          }
          .animate-rotate-ccw {
            animation: rotate-counter 10s linear infinite;
          }
          .animate-pulse-glow {
            animation: pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          .animate-scan {
            position: absolute;
            width: 100%;
            height: 2px;
            background: linear-gradient(to right, transparent, rgba(6, 182, 212, 0.5), transparent);
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.8);
            animation: scanline 4s linear infinite;
            z-index: 5;
            pointer-events: none;
          }
          .animate-orbit-1 { animation: orbit 6s linear infinite; }
          .animate-orbit-2 { animation: orbit 8s linear infinite reverse; }
          .animate-float { animation: float 4s ease-in-out infinite; }
          
          .jarvis-panel {
            background: #020617;
            background-image: 
              radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.2) 0%, transparent 70%),
              linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px);
            background-size: 100% 100%, 40px 40px, 40px 40px;
            box-shadow: 
              0 25px 60px -12px rgba(0, 0, 0, 1),
              0 0 0 1px rgba(6, 182, 212, 0.25);
          }
          .jarvis-glass {
            background: #0f172a;
            border: 1px solid rgba(6, 182, 212, 0.25);
            box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5);
          }
          .jarvis-corner-tr {
            border-top: 2px solid #22d3ee;
            border-right: 2px solid #22d3ee;
            filter: drop-shadow(0 0 5px #22d3ee);
          }
          .jarvis-corner-tl {
            border-top: 2px solid #22d3ee;
            border-left: 2px solid #22d3ee;
            filter: drop-shadow(0 0 5px #22d3ee);
          }
          .jarvis-corner-br {
            border-bottom: 2px solid #22d3ee;
            border-right: 2px solid #22d3ee;
            filter: drop-shadow(0 0 5px #22d3ee);
          }
          .jarvis-corner-bl {
            border-bottom: 2px solid #22d3ee;
            border-left: 2px solid #22d3ee;
            filter: drop-shadow(0 0 5px #22d3ee);
          }
          .cyber-text {
            text-shadow: 0 0 5px rgba(6, 182, 212, 0.4);
            font-weight: 900;
            letter-spacing: 0.05em;
          }
          .scrollbar-none::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Constraints for Draggable */}
      <div className="fixed inset-0 pointer-events-none z-[998]" ref={constraintsRef} />

      {/* Main Container - Draggable */}
      <motion.div 
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        initial={{ x: 0, y: 0 }}
        className="fixed bottom-6 right-6 z-[999] print:hidden select-none touch-none"
        id="jarvis-assistant-hud"
      >
        {isMinimized ? (
          /* Minimized glowing AI Core */
          <div 
            onClick={() => setIsMinimized(false)}
            className="group relative cursor-pointer active:scale-95 transition-all duration-300"
            title="Buka Panel Monitor J.A.R.V.I.S."
          >
            {/* outer ambient glow */}
            <div className={`absolute inset-0 bg-cyan-500/30 blur-2xl rounded-full scale-125 animate-pulse ${systemThreatLevel === "ALERT" ? "bg-red-500/40" : ""}`}></div>
            
            {/* Rotating Outer Rings */}
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-dashed border-cyan-400 absolute inset-0 animate-rotate-cw ${systemThreatLevel === "ALERT" ? "border-red-500" : "opacity-60"}`}></div>
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full border border-dotted border-cyan-200/50 absolute inset-0 animate-rotate-ccw ${systemThreatLevel === "ALERT" ? "border-red-300" : "opacity-40"}`}></div>
            
            {/* Core Orb */}
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-slate-950/90 border border-slate-700 m-2 flex items-center justify-center relative shadow-[inset_0_0_15px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_rgba(6,182,212,1)] transition-all ${systemThreatLevel === "ALERT" ? "shadow-[inset_0_0_15px_rgba(239,68,68,0.5)] border-red-500/50 bg-red-950/20" : ""}`}>
              <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full bg-cyan-400 animate-pulse-glow flex items-center justify-center text-slate-950 font-black ${systemThreatLevel === "ALERT" ? "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : ""}`}>
                <Eye size={10} className={systemThreatLevel === "ALERT" ? "text-white animate-bounce" : "text-black"} />
              </div>
              <span className={`absolute -top-1 -right-1 w-3 h-3 md:w-3.5 md:h-3.5 bg-cyan-500 border-2 border-[#090b11] rounded-full flex items-center justify-center text-[7px] font-black text-slate-950 ${systemThreatLevel === "ALERT" ? "bg-red-500 animate-ping" : "animate-pulse"}`}></span>
            </div>
            
            {/* Minimal drag hint */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
               <span className="text-[8px] font-black tracking-widest text-cyan-400 uppercase">DRAG TO MOVE</span>
            </div>
          </div>
        ) : (
          /* Expanded HUD Panel precisely based on Reference UI Image */
          <div className="w-[88vw] sm:w-[340px] md:w-[400px] jarvis-panel border border-cyan-500/20 rounded-[28px] shadow-[0_10px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl p-5 md:p-6 text-slate-200 transition-all duration-500 relative overflow-hidden group">
            {/* HUD SCANNER EFFECT */}
            <div className="animate-scan opacity-30"></div>
            
            {/* Drag Handle Top Overlay */}
            <div className="absolute top-0 left-0 right-0 h-8 cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Move size={12} className="text-cyan-500/40" />
            </div>

            {/* Cyber Brackets (Ref Image Style) */}
            <span className={`absolute top-3 left-3 w-6 h-6 jarvis-corner-tl opacity-80 ${systemThreatLevel === "ALERT" ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : ""}`}></span>
            <span className={`absolute top-3 right-3 w-6 h-6 jarvis-corner-tr opacity-80 ${systemThreatLevel === "ALERT" ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : ""}`}></span>
            <span className={`absolute bottom-3 left-3 w-6 h-6 jarvis-corner-bl opacity-80 ${systemThreatLevel === "ALERT" ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : ""}`}></span>
            <span className={`absolute bottom-3 right-3 w-6 h-6 jarvis-corner-br opacity-80 ${systemThreatLevel === "ALERT" ? "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : ""}`}></span>

            {/* HEADER */}
            <div className="flex justify-between items-center mb-5 md:mb-6 border-b border-cyan-500/20 pb-3.5 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]`}></span>
                  <span className="text-[10px] md:text-[11px] font-black tracking-[0.25em] text-red-500 uppercase font-mono cyber-text">REC ACTIVE</span>
                </div>
                <div className="text-[8px] md:text-[9px] font-mono font-bold text-cyan-400 mt-1.5 tracking-wider uppercase opacity-90">HD MONITORING V5.0</div>
              </div>
              
              <div className="text-center">
                <div className="text-[12px] md:text-[13px] font-mono font-black tracking-[0.1em] text-cyan-300 bg-black/40 px-3 md:py-1.5 rounded-lg border border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.1),0_0_15px_rgba(6,182,212,0.1)] cyber-text">
                  {timeStr}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsVoiceOn(!isVoiceOn)}
                  className={`p-2 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-400 transition-all ${isVoiceOn ? "text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]" : "text-slate-600 grayscale"}`}
                  title={isVoiceOn ? "Disable AI Voice Guidance" : "Enable AI Voice Guidance" }
                >
                  {isVoiceOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-2 rounded-xl border border-transparent hover:border-cyan-500/30 hover:bg-cyan-500/5 text-slate-400 hover:text-white transition-all"
                  title="Minimize Interface"
                >
                  <Minimize2 size={14} />
                </button>
              </div>
            </div>

            {/* DYNAMIC RADAR ORB - ULTRA ADVANCED VERSION */}
            <div className="flex flex-col items-center justify-center my-6 md:my-8 relative z-10">
              <div 
                onClick={handleInteractCore}
                className="w-36 h-36 md:w-44 md:h-44 rounded-full flex items-center justify-center cursor-pointer relative"
              >
                {/* Orbital Particle Satellites */}
                <div className="absolute w-2 h-2 bg-cyan-400 rounded-full blur-[1px] animate-orbit-1 shadow-[0_0_10px_rgba(6,182,212,1)]"></div>
                <div className="absolute w-1.5 h-1.5 bg-cyan-200 rounded-full blur-[1px] animate-orbit-2 shadow-[0_0_8px_rgba(165,243,252,1)]"></div>
                
                {/* Outermost Rotating Compass Ring */}
                <div className={`absolute inset-0 rounded-full border-[3px] border-dashed border-cyan-400/20 animate-rotate-cw ${systemThreatLevel === "ALERT" ? "border-red-500/40" : ""}`}>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full opacity-50"></div>
                </div>
                
                {/* Measurement Ring with Ticks */}
                <div className={`absolute inset-3 rounded-full border border-cyan-300/10 animate-rotate-ccw ${systemThreatLevel === "ALERT" ? "border-red-300/20" : ""}`}>
                   <div className="absolute inset-2 border-t-2 border-transparent border-t-cyan-500/40 rounded-full"></div>
                   <div className="absolute inset-2 border-b-2 border-transparent border-b-cyan-500/40 rounded-full"></div>
                </div>
                
                {/* Dynamic Aura layers */}
                <div className={`absolute inset-8 rounded-full border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2)] transition-all duration-1000 ${systemThreatLevel === "ALERT" ? "border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.3)]" : ""}`}></div>
                
                {/* Multi-layered Central Core */}
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-950 flex shadow-[inset_0_0_35px_rgba(6,182,212,0.8)] border border-cyan-500/30 relative overflow-hidden group items-center justify-center ${systemThreatLevel === "ALERT" ? "shadow-[inset_0_0_35px_rgba(239,68,68,0.8)] border-red-500/50" : ""}`}>
                  {/* Internal rotating grid for core */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[size:10px_10px] animate-rotate-cw opacity-40"></div>
                  
                  {/* Central Nucleus */}
                  <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full bg-cyan-200 animate-pulse-glow z-10 shadow-[0_0_20px_rgba(6,182,212,1)] ${systemThreatLevel === "ALERT" ? "bg-red-400 shadow-[0_0_30px_rgba(239,68,68,1)]" : ""}`} />
                  
                  {/* Holographic scanning arc */}
                  <div className="absolute inset-0 border-r-4 border-r-cyan-400/60 rounded-full animate-rotate-cw z-5"></div>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-500/50 mt-4 cyber-text animate-pulse">
                &gt; CORE STATUS: NOMINAL &lt;
              </p>
            </div>

            {/* METRIC BOXES - FUTURISTIC SLIDE-IN STYLE */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-5 relative z-10">
              <div className="jarvis-glass p-3 md:p-4 rounded-2xl hover:border-cyan-500 transition-all duration-300 shadow-[inset_0_0_15px_rgba(0,0,0,1)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck size={11} className="text-cyan-400" />
                  <p className="text-[9px] font-black tracking-[0.1em] text-slate-400 uppercase">SYSTEM LINK</p>
                </div>
                <p className={`text-[12px] md:text-[14px] font-mono font-black mt-1 cyber-text ${isOnline ? "text-emerald-400" : "text-red-500 animate-pulse"}`}>
                  {isOnline ? "SECURE_ENC" : "ERR_LOG"}
                </p>
              </div>
              <div className="jarvis-glass p-3 md:p-4 rounded-2xl hover:border-cyan-500 transition-all duration-300 shadow-[inset_0_0_15px_rgba(0,0,0,1)] font-mono">
                <div className="flex items-center gap-2 mb-1.5">
                  <Cpu size={11} className="text-cyan-400" />
                  <p className="text-[9px] font-black tracking-[0.1em] text-slate-400 uppercase">THROUGHPUT</p>
                </div>
                <p className="text-[12px] md:text-[14px] font-black text-cyan-400 mt-1 cyber-text">
                  {logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length} OPS
                </p>
              </div>
            </div>

            {/* TERMINAL SESSIONS FEED - GLITCH/CYBERPUNK STYLE */}
            <div className="jarvis-glass rounded-2xl p-4 h-36 md:h-44 overflow-hidden flex flex-col justify-start relative z-10 font-mono text-[10px] leading-relaxed shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
              <div className="flex justify-between items-center mb-3 border-b border-cyan-500/20 pb-1.5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2 cyber-text">
                  <Terminal size={12} className="animate-pulse" /> DATALOG STREAM 
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">LIVE_SYNC</span>
              </div>
              <div className="overflow-y-auto flex-1 h-full pr-1.5 space-y-2.5 md:space-y-3 scrollbar-none mt-1 md:mt-2">
                {jarvisLogs.slice(-12).map((log, index) => {
                  let logColor = "text-cyan-400";
                  let prefix = "> ";
                  if (log.includes("[SCAN OUT]")) {
                    logColor = "text-orange-400 font-black";
                    prefix = "!! ";
                  }
                  if (log.includes("[SCAN IN]")) {
                    logColor = "text-emerald-400 font-black";
                    prefix = "++ ";
                  }
                  if (log.includes("[SYSTEM]")) {
                    logColor = "text-cyan-500/90 font-bold italic";
                    prefix = ":: ";
                  }
                  if (log.includes("OVERDUE") || log.includes("ALERT")) {
                    logColor = "text-red-500 font-black animate-pulse";
                    prefix = "⚠ ";
                  }
                  return (
                    <div key={index} className={`text-[10px] md:text-[11px] flex items-start gap-1.5 md:gap-2 ${logColor} border-l border-current/10 pl-2`}>
                      <span className="opacity-80 flex-shrink-0 font-black">{prefix}</span>
                      <span className="leading-tight tracking-wide font-bold uppercase truncate">{log.replace(/\[.*?\]\s*/, "")}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* FOOTER: JARVIS LABEL + AUDIO WAVEFORM ANALYZER */}
            <div className="flex justify-between items-center mt-5 pt-3 border-t border-cyan-500/30 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <ShieldCheck size={12} className="text-cyan-400" />
                </div>
                <span className="text-[11px] font-black tracking-[0.2em] text-cyan-300 font-mono uppercase cyber-text">
                  J.A.R.V.I.S
                </span>
              </div>
              
              {/* Animated audio spectrum bars - REF IMAGE STYLE REFINED */}
              <div className="flex items-end gap-[2px] h-7 md:h-8 px-3 md:px-4 bg-black/40 rounded-xl border border-cyan-500/20 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                {spectrumBars.map((barClass, idx) => (
                  <div 
                    key={idx} 
                    className={`w-[4px] bg-cyan-400 rounded-t-sm shadow-[0_0_8px_rgba(6,182,212,0.6)] ${barClass} ${systemThreatLevel === "ALERT" ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.7)]" : ""}`}
                    style={{ minHeight: '4px' }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
