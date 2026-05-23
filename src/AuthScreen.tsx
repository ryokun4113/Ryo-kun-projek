import React, { useState } from 'react';
import { ShieldCheck, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';

export const AuthScreen = ({ 
  users, 
  onSuccess 
}: { 
  users: any[];
  onSuccess: (user: any) => void;
}) => {
  const [loginId, setLoginId] = useState("");
  const [loginCode, setLoginCode] = useState("");

  const handleLogin = () => {
     if (!loginId || !loginCode) {
        alert("Masukkan ID dan Sandi");
        return;
     }

     const playSound = (type: 'success' | 'error') => {
        try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            if (type === 'success') {
              osc.type = 'sine';
              osc.frequency.setValueAtTime(800, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
              gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.3);
            } else {
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(300, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
              gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.4);
            }
          }
        } catch (e) {
          console.error("Audio not supported");
        }

        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(type === 'success' ? 'Akses diterima' : 'Akses ditolak');
          utterance.lang = 'id-ID';
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        }
     };

     const matchedUser = users.find(u => u.username.toUpperCase() === loginId.toUpperCase() && u.password === loginCode);
     
     if (matchedUser) {
        playSound('success');
        // Give time for sound to play before redirecting
        setTimeout(() => onSuccess(matchedUser), 1000);
     } else {
        playSound('error');
        setTimeout(() => {
           alert("Akses Ditolak. Kredensial tidak valid.");
        }, 500);
     }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-8 left-8 w-8 h-8 border-t-4 border-l-4 border-emerald-900/50"></div>
      <div className="absolute bottom-8 right-8 w-8 h-8 border-b-4 border-r-4 border-emerald-900/50"></div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className="w-full max-w-md bg-[#050b14]/80 backdrop-blur-md p-10 md:p-14 rounded-[50px] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center relative z-10"
      >
        <div className="w-20 h-20 bg-emerald-950/30 rounded-3xl border border-emerald-900/50 flex items-center justify-center mb-8 cyber-cut shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]">
          <ShieldCheck size={40} className="text-emerald-500" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter w-full text-center mb-2">RESTRICTED ACCESS</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-12 w-full text-center">Authentication Required</p>
        
        <div className="w-full space-y-5 mb-10 text-center flex flex-col items-center">
          <input 
            type="text" 
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="NAMA USER / ID" 
            className="w-full bg-[#020617]/50 border-2 border-slate-800 rounded-[20px] py-5 px-4 text-center text-white font-black text-xs uppercase tracking-[0.1em] outline-none focus:border-emerald-500 transition-colors"
          />
          <input 
            type="password" 
            value={loginCode}
            onChange={(e) => setLoginCode(e.target.value)}
            placeholder="KATA SANDI" 
            className="w-full bg-[#020617]/50 border-2 border-slate-800 rounded-[20px] py-5 px-4 text-center text-white font-black text-xs uppercase tracking-[0.1em] outline-none focus:border-emerald-500 transition-colors"
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
          />
          
          <button 
            onClick={handleLogin}
            className="mt-10 w-24 h-24 bg-emerald-950/20 border-[3px] border-emerald-900 hover:border-emerald-500 hover:bg-emerald-900/40 rounded-[35px] flex items-center justify-center transition-all duration-300 group shadow-[0_0_30px_rgba(16,185,129,0.1)]"
          >
            <Fingerprint size={44} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          </button>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-6">Click scanner to authenticate</p>
        </div>
      </motion.div>
    </div>
  );
};
