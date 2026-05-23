const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// NAMA PEMBAWA ASET input
code = code.replace(
  /className="flex-1 bg-\[#111827\] border border-slate-200 dark:border-slate-800 p-4 rounded-\[16px\] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500\/50 transition-colors"/g,
  'className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 rounded-[16px] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500/50 transition-colors shadow-sm dark:shadow-none"'
);

// JAM ALARM input
code = code.replace(
  /className="w-full bg-\[#111827\] border border-slate-200 dark:border-slate-800 p-4 pr-12 rounded-\[16px\] text-xs font-mono font-bold text-slate-600 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500\/50 transition-colors appearance-none"/g,
  'className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 pr-12 rounded-[16px] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500/50 transition-colors appearance-none shadow-sm dark:shadow-none"'
);

// SCAN KAMERA PERANGKAT button
code = code.replace(
  /className="flex items-center gap-2 bg-emerald-900\/30 text-emerald-500 border border-emerald-900\/50 px-4 py-2\.5 rounded-full text-\[10px\] font-black uppercase tracking-widest hover:bg-emerald-900\/50 transition-colors"/g,
  'className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-900/50 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors shadow-sm dark:shadow-none"'
);

// CETAK MUTASI HARI INI button
code = code.replace(
  /className="flex items-center gap-2 bg-blue-900\/30 text-blue-500 border border-blue-900\/50 px-4 py-2\.5 rounded-full text-\[10px\] font-black uppercase tracking-widest hover:bg-blue-900\/50 transition-colors"/g,
  'className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-900/50 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm dark:shadow-none"'
);

// KETIK NAMA SESI OPERASIONAL card background
code = code.replace(
  /className="bg-slate-50 dark:bg-\[#020617\]\/50 border border-slate-200 dark:border-slate-800 rounded-\[20px\] overflow-hidden"/g,
  'className="bg-white dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden shadow-sm dark:shadow-none"'
);

fs.writeFileSync('src/App.tsx', code);
