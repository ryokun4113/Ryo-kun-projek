const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// For inactive items:
code = code.replace(/hover:bg-slate-200\/50/g, 'hover:bg-slate-50');

// For active items:
code = code.replace(/bg-slate-50 dark:bg-slate-800\/80 border-slate-200 dark:border-slate-700/g, 
'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50');

fs.writeFileSync('src/App.tsx', code);
