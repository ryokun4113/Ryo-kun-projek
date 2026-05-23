const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The original file is a mess because of regex overlap.
// Step 1: Let's clean up repetitive duplicates
let previousLength = 0;
while (code.length !== previousLength) {
  previousLength = code.length;
  code = code.replace(/text-slate-400 dark:text-slate-500 dark:text-slate-400/g, 'text-slate-600 dark:text-slate-400');
  code = code.replace(/text-slate-500 dark:text-slate-400 dark:text-slate-500/g, 'text-slate-500 dark:text-slate-500');
  code = code.replace(/text-slate-400 dark:text-slate-500/g, 'text-slate-600 dark:text-slate-400');
  
  code = code.replace(/bg-slate-200 dark:bg-slate-800( \/| \w+)/g, 'bg-slate-200 dark:bg-slate-800$1'); // avoid matching /50 if not specified
  code = code.replace(/bg-slate-100 dark:bg-slate-200 dark:bg-slate-800/g, 'bg-slate-200 dark:bg-slate-800');
  code = code.replace(/bg-slate-200 dark:bg-slate-100 dark:bg-slate-800/g, 'bg-slate-200 dark:bg-slate-800');

  // Let's just do a clean pass over everything inside className="..."
  // Wait, regex might be easier.
}

// More specific cascade fixes
code = code.replace(/bg-white dark:bg-white dark:bg-slate-900/g, 'bg-white dark:bg-slate-900');
code = code.replace(/hover:text-slate-900 dark:hover:text-slate-900 dark:hover:text-white/g, 'hover:text-slate-900 dark:hover:text-white');
code = code.replace(/border-slate-300 dark:border-slate-200 dark:border-slate-800/g, 'border-slate-300 dark:border-slate-800');
code = code.replace(/border-slate-200 dark:border-slate-300 dark:border-slate-700/g, 'border-slate-300 dark:border-slate-700');

fs.writeFileSync('src/App.tsx', code);
