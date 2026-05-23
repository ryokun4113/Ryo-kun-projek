const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/hover:bg-slate-200 dark:bg-slate-800\/50/g, 'hover:bg-slate-200 dark:hover:bg-slate-800/50');
fs.writeFileSync('src/App.tsx', code);
