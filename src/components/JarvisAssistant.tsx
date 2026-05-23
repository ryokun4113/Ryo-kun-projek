import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Activity, Shield, Terminal, Minimize2, Radio, Server, Database, Crosshair, Zap, Focus, Fingerprint } from 'lucide-react';
import { Log, Item } from '../types';

interface JarvisProps {
  logs: Log[];
  inventory: Item[];
  isOnline: boolean;
  currentUser: any;
}

export const JarvisAssistant: React.FC<JarvisProps> = ({ logs, inventory, isOnline, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemLogs, setSystemLogs] = useState<string[]>([]);
  const [audioWaves, setAudioWaves] = useState<number[]>(Array(10).fill(20));
  const [memoryHex, setMemoryHex] = useState<string[]>([]);
  const [cpuLoad, setCpuLoad] = useState(42);
  const [netTraffic, setNetTraffic] = useState(1024);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        setAudioWaves(Array(10).fill(0).map(() => Math.random() * 80 + 20));
        setMemoryHex(Array(6).fill(0).map(() => '0x' + Math.floor(Math.random()*16777215).toString(16).toUpperCase().padStart(4, '0')));
        setCpuLoad(Math.floor(Math.random() * 40) + 20);
        setNetTraffic(Math.floor(Math.random() * 9000) + 1000);
    }, 250);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
        const latest = logs[0];
        const newLog = `[${latest.type}] ${latest.name}`;
        setSystemLogs(prev => [newLog, ...prev].slice(0, 6));
    }
  }, [logs]);

  useEffect(() => {
    setSystemLogs([
        "INIT CORE.SYS v4.2.9",
        "SYNCING ENCRYPTED DB...",
        "NETWORK NODE: STABLE",
        `AUTH VERIFIED: ${currentUser?.username || 'GUEST'}`,
        "SYSTEM OPTIMAL."
    ]);
  }, [currentUser]);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] cursor-pointer group" onClick={() => setIsOpen(true)}>
         <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-[#02050A]/90 backdrop-blur-md border-[1.5px] border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.6)] group-hover:shadow-[0_0_40px_rgba(6,182,212,0.9)] transition-all overflow-hidden">
            <div className="absolute inset-0 jarvis-radar-cone opacity-50"></div>
            <Cpu className="text-cyan-300 group-hover:scale-110 group-hover:text-white transition-all z-10 filter drop-shadow-[0_0_10px_cyan]" size={24} />
            <div className="absolute inset-1 rounded-full border border-cyan-400/50 border-dashed jarvis-ring-1" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-cyan-300/80 border-b-cyan-300/80 jarvis-ring-2" />
            <div className={`absolute top-1 right-1 w-3 h-3 rounded-full z-20 ${isOnline ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-red-500 shadow-[0_0_12px_#ef4444]'}`}></div>
         </div>
         <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-cyan-950/80 border border-cyan-500/50 text-[9px] font-black tracking-[0.3em] text-cyan-300 uppercase px-3 py-1 rounded shadow-[0_0_15px_rgba(6,182,212,0.6)] opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap cyber-cut">
            WAKE CORE
         </div>
      </div>
    );
  }

  const activeCount = logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] w-[calc(100vw-32px)] md:w-[400px] bg-[#02050A]/95 backdrop-blur-2xl rounded-2xl p-0 text-cyan-50 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.25)] border border-cyan-500/30 print:hidden"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Background Tech Grid */}
        <div className="absolute inset-0 jarvis-grid-bg opacity-40 pointer-events-none"></div>

        {/* Scanline over whole panel */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-[200%] animate-[jarvis-data-scrolling_4s_linear_infinite] opacity-50 pointer-events-none z-0"></div>

        <div className="p-6 relative z-10">
            {/* Holographic Header */}
            <div className="flex justify-between items-start mb-6 border-b border-cyan-500/30 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Cpu className="text-cyan-400" size={16} />
                        <span className="text-cyan-400 font-black tracking-[0.4em] text-sm md:text-base text-shadow-glow">A.I CORE</span>
                    </div>
                    <div className="text-[9px] text-cyan-500 font-bold tracking-widest uppercase flex items-center gap-2 opacity-90">
                       v.4.2.9 <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_cyan]"></span> {currentTime.toLocaleTimeString('en-GB')}
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex flex-col items-end mr-1">
                        <div className="flex items-center gap-1.5 text-red-500 font-bold text-[9px] tracking-widest mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_red]"></div>
                            LIVE STREAM
                        </div>
                        <div className={`text-[8px] tracking-[0.2em] font-black ${isOnline ? 'text-emerald-400' : 'text-orange-400'} jarvis-glitch-text`}>
                            {isOnline ? 'LINK SECURE' : 'LINK LOST'}
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="bg-cyan-950/50 border border-cyan-500/50 hover:bg-cyan-900 hover:scale-105 hover:shadow-[0_0_15px_cyan] text-cyan-400 hover:text-cyan-100 p-2 rounded transition-all">
                       <Minimize2 size={16} />
                    </button>
                </div>
            </div>

            {/* Radar & Memory Block */}
            <div className="grid grid-cols-[1fr_90px] gap-5 mb-6">
                {/* Tactical Radar */}
                <div className="relative flex justify-center items-center h-44 bg-[#010308]/60 border border-cyan-500/20 rounded-xl overflow-hidden shadow-[inset_0_0_30px_rgba(6,182,212,0.1)]">
                    <div className="w-36 h-36 relative flex items-center justify-center z-10">
                        {/* Sweeping Cone */}
                        <div className="absolute inset-0 jarvis-radar-cone opacity-50" />

                        {/* Dashed Tracking Rings */}
                        <div className="absolute inset-0 rounded-full border-2 border-cyan-900/80 border-dashed jarvis-ring-3" />
                        <div className="absolute inset-2 rounded-full border-[1.5px] border-cyan-600/50 jarvis-ring-2" />
                        
                        {/* Solid Ring & Crosshairs */}
                        <div className="absolute inset-5 rounded-full border border-cyan-500/30" />
                        <svg className="absolute inset-0 w-full h-full jarvis-ring-1" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="35" fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="40 180" strokeLinecap="round" />
                            <circle cx="50" cy="50" r="28" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="80 120" strokeLinecap="round" />
                            <line x1="50" y1="5" x2="50" y2="95" stroke="#06b6d4" strokeWidth="0.5" opacity="0.4" />
                            <line x1="5" y1="50" x2="95" y2="50" stroke="#06b6d4" strokeWidth="0.5" opacity="0.4" />
                        </svg>

                        {/* Blips */}
                        <div className="absolute top-[20%] left-[25%] w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_8px_cyan] animate-pulse"></div>
                        <div className="absolute bottom-[30%] right-[30%] w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_5px_#34d399] animate-ping"></div>

                        {/* Arc Reactor Core */}
                        <div className="w-10 h-10 rounded-full bg-[#010308] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,1)] jarvis-core relative overflow-hidden">
                            <Focus className="text-cyan-300 w-5 h-5 animate-pulse" />
                            <div className="absolute inset-1 rounded-full bg-cyan-300/20 blur-[2px]"></div>
                        </div>
                    </div>

                    {/* Corner Targeting Brackets */}
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/80"></div>
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/80"></div>
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/80"></div>
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/80"></div>
                </div>

                {/* Hex Memory Column */}
                <div className="bg-[#010308]/60 border border-cyan-500/30 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden relative shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]">
                     <div className="text-[8px] font-black text-cyan-300 tracking-[0.2em] uppercase mb-1.5 border-b border-cyan-500/30 pb-1.5 flex items-center gap-1">
                        <Database size={8} className="text-cyan-400" /> MEM.DUMP
                     </div>
                     <div className="space-y-1.5 flex-1 mt-1">
                         {memoryHex.map((hex, i) => (
                            <div key={i} className="text-[9px] text-cyan-500/90 font-mono tracking-tighter whitespace-nowrap jarvis-glitch-text">{hex}</div>
                         ))}
                     </div>
                     <div className="mt-2 pt-2 border-t border-cyan-500/30">
                        <div className="text-[7px] font-bold text-cyan-400 uppercase tracking-widest mb-1">CPU LOAD: {cpuLoad}%</div>
                        <div className="w-full h-1 bg-cyan-950 rounded-full overflow-hidden">
                            <div className="h-full bg-cyan-400 shadow-[0_0_8px_cyan] transition-all duration-300" style={{ width: `${cpuLoad}%` }}></div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Neural Matrix Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                 <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-lg flex flex-col p-3 relative overflow-hidden group hover:border-cyan-500/60 transition-colors">
                     <div className="absolute top-0 right-0 w-10 h-10 bg-cyan-500/5 blur-[15px] rounded-full group-hover:bg-cyan-500/10 transition-colors"></div>
                     <span className="text-[8px] text-cyan-500 font-black tracking-[0.2em] uppercase mb-1 flex items-center gap-1.5"><Shield size={10} /> ENTRIES</span>
                     <span className="text-sm font-black text-cyan-300 text-shadow-glow">{inventory.length}</span>
                 </div>
                 <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-lg flex flex-col p-3 relative overflow-hidden group hover:border-cyan-500/60 transition-colors">
                     <div className="absolute top-0 right-0 w-10 h-10 bg-cyan-500/5 blur-[15px] rounded-full group-hover:bg-cyan-500/10 transition-colors"></div>
                     <span className="text-[8px] text-cyan-500 font-black tracking-[0.2em] uppercase mb-1 flex items-center gap-1.5"><Activity size={10} /> TASKS</span>
                     <span className="text-sm font-black text-cyan-300 text-shadow-glow">{activeCount} OPS</span>
                 </div>
                 <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-lg flex flex-col p-3 relative overflow-hidden group hover:border-cyan-500/60 transition-colors">
                     <div className="absolute top-0 right-0 w-10 h-10 bg-cyan-500/5 blur-[15px] rounded-full group-hover:bg-cyan-500/10 transition-colors"></div>
                     <span className="text-[8px] text-cyan-500 font-black tracking-[0.2em] uppercase mb-1 flex items-center gap-1.5"><Radio size={10} /> I/O NET</span>
                     <span className="text-sm font-black text-cyan-300 text-shadow-glow">{netTraffic} B/s</span>
                 </div>
            </div>

            {/* Tactical Live Terminal */}
            <div className="bg-[#010205] border border-cyan-500/40 rounded-xl p-3 h-[110px] overflow-hidden relative shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]">
                {/* Equalizer Visualizer */}
                <div className="absolute top-3 right-3 bottom-3 w-1.5 flex flex-col justify-end gap-[3px]">
                   {audioWaves.map((h, i) => (
                      <div key={i} className="w-full bg-cyan-400 rounded-t-sm shadow-[0_0_5px_cyan]" style={{ height: `${h}%`, opacity: Math.max(0.3, h/100), transition: 'height 0.15s ease' }}></div>
                   ))}
                </div>

                <div className="flex items-center gap-2 mb-2 text-[9px] text-cyan-400 uppercase font-black tracking-[0.3em] border-b border-cyan-900/60 pb-1.5">
                   <Terminal size={12} className="text-cyan-500" /> SYSTEM.DIAGNOSTICS //
                </div>
                <div className="space-y-1.5 pr-6">
                   {systemLogs.map((log, i) => (
                      <div key={i} className="text-[10px] text-cyan-300 font-mono leading-none truncate jarvis-glitch-text flex items-start">
                         <span className="text-cyan-600 mr-2 font-black">{'>'}</span>
                         <span className="uppercase opacity-90 truncate">{log}</span>
                      </div>
                   ))}
                </div>
            </div>
        </div>
        
        {/* Optical Edges */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60"></div>
      </motion.div>
    </AnimatePresence>
  );
};
