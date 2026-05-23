import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const SidebarClock: React.FC = () => {
  const [time, setTime] = useState(new Date());
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
      setBlink(b => !b);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="shrink-0 mb-4 mt-4 px-4 py-3 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between relative overflow-hidden backdrop-blur-md shadow-sm">
      <div className="animate-pulse absolute top-0 left-0 w-8 h-8 bg-emerald-500/20 blur-[20px] rounded-full pointer-events-none"></div>
      
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-emerald-500" />
        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
           {time.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>
      
      <div className="font-mono text-sm font-black text-slate-800 dark:text-slate-100 tracking-wider flex items-center">
        <span>{time.getHours().toString().padStart(2, '0')}</span>
        <span className={`${blink ? 'opacity-100' : 'opacity-0'} text-emerald-500 mx-[2px] transition-opacity duration-100`}>:</span>
        <span>{time.getMinutes().toString().padStart(2, '0')}</span>
      </div>
    </div>
  );
};

