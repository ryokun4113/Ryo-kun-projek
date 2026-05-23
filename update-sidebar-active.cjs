const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className=\{`sidebar-item \[^`\]+`\}/g; // this regex is wrong

// let's just do a specific string replace for the active classes
code = code.replace(/'bg-white dark:bg-slate-800\/80 border-slate-200 dark:border-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400'/g, 
"'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400'");

fs.writeFileSync('src/App.tsx', code);
