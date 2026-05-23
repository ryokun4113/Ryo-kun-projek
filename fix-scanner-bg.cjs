const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /className="glass-effect rounded-\[30px\] border border-slate-300 dark:border-slate-700 p-2 focus-within:border-emerald-500 relative overflow-hidden bg-slate-50 dark:bg-\[#020617\] hud-card"/g,
  'className="glass-effect rounded-[30px] border border-slate-300 dark:border-slate-700 p-2 focus-within:border-emerald-500 relative overflow-hidden bg-white dark:bg-[#020617] hud-card shadow-sm dark:shadow-none"'
);

code = code.replace(
  /className="w-full bg-slate-50 dark:bg-\[#020617\] p-8 rounded-\[24px\] text-xl font-mono font-bold text-emerald-400 outline-none text-center uppercase tracking-widest relative z-20"/g,
  'className="w-full bg-white dark:bg-[#020617] p-8 rounded-[24px] text-xl font-mono font-bold text-emerald-500 dark:text-emerald-400 outline-none text-center uppercase tracking-widest relative z-20 shadow-sm dark:shadow-none"'
);

fs.writeFileSync('src/App.tsx', code);
