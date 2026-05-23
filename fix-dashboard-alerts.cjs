const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// RED ALERT BOX
code = code.replace(
  /className="bg-red-950\/40 border border-red-700\/50 p-6 md:p-8 rounded-\[30px\] flex flex-col gap-4 relative overflow-hidden animate-pulse shadow-\[0_0_15px_rgba\(239,68,68,0\.3\)\]"/g,
  'className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden animate-pulse shadow-[0_4px_20px_rgba(239,68,68,0.1)] dark:shadow-[0_0_15px_rgba(239,68,68,0.3)]"'
);
code = code.replace(
  /className="p-3 bg-red-950\/60 border border-red-900\/80 rounded-2xl flex-shrink-0 cyber-cut mt-1"/g,
  'className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1"'
);
code = code.replace(
  /className="text-red-500 font-black uppercase tracking-widest text-sm md:text-base"/g,
  'className="text-red-700 dark:text-red-500 font-black uppercase tracking-widest text-sm md:text-base"'
);
code = code.replace(
  /className="text-red-400\/80 font-bold uppercase tracking-widest text-\[10px\] mt-2 leading-relaxed"/g,
  'className="text-red-600/80 dark:text-red-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed"'
);
code = code.replace(
  /className="mt-4 bg-slate-50 dark:bg-\[#020617\]\/50 rounded-xl border border-red-900\/40 p-4"/g,
  'className="mt-4 bg-white dark:bg-[#020617]/50 rounded-xl border border-red-200 dark:border-red-900/40 p-4 shadow-sm dark:shadow-none"'
);
code = code.replace(
  /className="text-\[10px\] font-black text-red-500 mb-2 uppercase tracking-widest border-b border-red-900\/30 pb-2"/g,
  'className="text-[10px] font-black text-red-700 dark:text-red-500 mb-2 uppercase tracking-widest border-b border-red-200 dark:border-red-900/30 pb-2"'
);
code = code.replace(
  /className="text-red-400 font-bold uppercase">\{item.name\} <span className="text-red-900 ml-2">/g,
  'className="text-red-600 dark:text-red-400 font-bold uppercase">{item.name} <span className="text-red-400 dark:text-red-900 ml-2">'
);
code = code.replace(
  /className="text-red-500 font-black uppercase w-24 sm:w-32 text-right">PEMEGANG:/g,
  'className="text-red-600 dark:text-red-500 font-black uppercase w-24 sm:w-32 text-right">PEMEGANG:'
);
// Fix text-white dark:text-red-500 etc mapping
code = code.replace(
  /className="text-white dark:text-red-500 truncate/g,
  'className="text-slate-900 dark:text-red-500 truncate'
);
code = code.replace(
  /className="text-white dark:text-orange-500 truncate/g,
  'className="text-slate-900 dark:text-orange-500 truncate'
);


// ORANGE ALERT BOX
code = code.replace(
  /className="bg-orange-950\/40 border border-orange-700\/50 p-6 md:p-8 rounded-\[30px\] flex flex-col gap-4 relative overflow-hidden shadow-\[0_0_10px_rgba\(249,115,22,0\.1\)\]"/g,
  'className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden shadow-[0_4px_20px_rgba(249,115,22,0.1)] dark:shadow-[0_0_10px_rgba(249,115,22,0.1)]"'
);
code = code.replace(
  /className="p-3 bg-orange-950\/60 border border-orange-900\/80 rounded-2xl flex-shrink-0 cyber-cut mt-1"/g,
  'className="p-3 bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1"'
);
code = code.replace(
  /className="text-orange-500 font-black uppercase tracking-widest text-sm md:text-base"/g,
  'className="text-orange-700 dark:text-orange-500 font-black uppercase tracking-widest text-sm md:text-base"'
);
code = code.replace(
  /className="text-orange-400\/80 font-bold uppercase tracking-widest text-\[10px\] mt-2 leading-relaxed"/g,
  'className="text-orange-600/80 dark:text-orange-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed"'
);
code = code.replace(
  /className="mt-4 bg-slate-50 dark:bg-\[#020617\]\/50 rounded-xl border border-orange-900\/40 p-4"/g,
  'className="mt-4 bg-white dark:bg-[#020617]/50 rounded-xl border border-orange-200 dark:border-orange-900/40 p-4 shadow-sm dark:shadow-none"'
);
code = code.replace(
  /className="text-\[10px\] font-black text-orange-500 mb-2 uppercase tracking-widest border-b border-orange-900\/30 pb-2"/g,
  'className="text-[10px] font-black text-orange-700 dark:text-orange-500 mb-2 uppercase tracking-widest border-b border-orange-200 dark:border-orange-900/30 pb-2"'
);
code = code.replace(
  /className="text-orange-400 font-bold uppercase">\{item.name\} <span className="text-orange-900 ml-2">/g,
  'className="text-orange-600 dark:text-orange-400 font-bold uppercase">{item.name} <span className="text-orange-400 dark:text-orange-900 ml-2">'
);
code = code.replace(
  /className="text-orange-500 font-black uppercase w-24 sm:w-32 text-right">PEMEGANG:/g,
  'className="text-orange-600 dark:text-orange-500 font-black uppercase w-24 sm:w-32 text-right">PEMEGANG:'
);

// Fix orange button in alert lists
code = code.replace(
  /className="bg-orange-600\/20 text-orange-500 hover:bg-orange-600 hover:text-slate-900 dark:text-white border border-orange-900 px-2 py-0\.5 rounded text-\[8px\] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 w-fit"/g,
  'className="bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-500 hover:bg-orange-200 dark:hover:bg-orange-600 hover:text-orange-900 dark:hover:text-slate-900 border border-orange-300 dark:border-orange-900 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 w-fit shadow-sm dark:shadow-none"'
);

fs.writeFileSync('src/App.tsx', code);
