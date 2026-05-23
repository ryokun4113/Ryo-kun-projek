const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/hover:bg-slate-100\//g, 'hover:bg-slate-200');
code = code.replace(/bg-slate-100\//g, 'bg-slate-200');
code = code.replace(/border-slate-900\/50/g, 'border-slate-200 dark:border-slate-800');
fs.writeFileSync('src/App.tsx', code);
