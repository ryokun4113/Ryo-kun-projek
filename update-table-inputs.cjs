const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The main search bar
code = code.replace(/bg-slate-50 (dark:bg-\[#020617\] border border-slate-200 dark:border-slate-800 pl-12)/g, 
'bg-white $1 shadow-sm');

// Select for category and sorting
code = code.replace(/className="bg-slate-50 dark:bg-\[#020617\] border border-slate-200 /g,
'className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 ');

// The table container
code = code.replace(/overflow-x-auto bg-slate-50 /g, 'overflow-x-auto bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] ');

fs.writeFileSync('src/App.tsx', code);
