const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Fix the shield icon color to match the emerald background
code = code.replace(/<ShieldCheck className="text-slate-900 dark:text-white w-4 h-4" \/>/, '<ShieldCheck className="text-white w-4 h-4" />');
code = code.replace(/<ShieldCheck className="text-slate-900 dark:text-white w-6 h-6 md:w-8 md:h-8" \/>/, '<ShieldCheck className="text-white w-6 h-6 md:w-8 md:h-8" />');

// Improve bottom user avatar in sidebar
code = code.replace(/className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-emerald-500 cyber-cut"/g, 
'className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-emerald-600 dark:text-emerald-500 cyber-cut"');

// Improve logout button in sidebar
code = code.replace(/text-slate-600 dark:text-slate-400 hover:text-red-500 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors/g,
'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 hover:border-red-200 dark:border-slate-800 dark:hover:border-red-900/50 shadow-sm transition-all');

// Fix "glass-effect" sidebar in Light mode border
code = code.replace(/border-r border-slate-200 dark:border-slate-800\/60 bg-slate-50 dark:bg-\[#020617\]/g, 'border-r border-slate-200/80 dark:border-slate-800/60 bg-slate-50/95 dark:bg-[#020617]/95 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none');

fs.writeFileSync('src/App.tsx', code);
