const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// SCAN MUTASI
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-emerald-900\/40 hover:bg-emerald-800\/50 border border-emerald-900\/60 text-emerald-400 rounded-lg cyber-cut transition-colors shadow-lg shadow-emerald-900\/20"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-lg dark:shadow-emerald-900/20"'
);

// DATA ASET
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-blue-900\/30 hover:bg-blue-800\/40 border border-blue-900\/50 text-blue-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// BARANG BARU (Already somewhat okay but lets make it white/slate-100)
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-slate-200 dark:bg-slate-800\/60 hover:bg-slate-300 dark:hover:bg-slate-700\/60 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// EXPORT
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-emerald-900\/30 hover:bg-emerald-800\/40 border border-emerald-900\/50 text-emerald-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-teal-50 dark:bg-emerald-900/30 hover:bg-teal-100 dark:hover:bg-emerald-800/40 border border-teal-200 dark:border-emerald-900/50 text-teal-700 dark:text-emerald-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// IMPORT
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-orange-900\/30 hover:bg-orange-800\/40 border border-orange-900\/50 text-orange-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-800/40 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// BACKUP DB
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-purple-900\/30 hover:bg-purple-800\/40 border border-purple-900\/50 text-purple-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// RESTORE DB
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-pink-900\/30 hover:bg-pink-800\/40 border border-pink-900\/50 text-pink-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-800/40 border border-pink-200 dark:border-pink-900/50 text-pink-700 dark:text-pink-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

// SYNC (Sky)
code = code.replace(
  /className="flex flex-col items-center justify-center w-\[100px\] h-20 bg-sky-900\/30 hover:bg-sky-800\/40 border border-sky-900\/50 text-sky-500 rounded-lg cyber-cut transition-colors"/g,
  'className="flex flex-col items-center justify-center w-[100px] h-20 bg-sky-50 dark:bg-sky-900/30 hover:bg-sky-100 dark:hover:bg-sky-800/40 border border-sky-200 dark:border-sky-900/50 text-sky-700 dark:text-sky-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none"'
);

fs.writeFileSync('src/App.tsx', code);
