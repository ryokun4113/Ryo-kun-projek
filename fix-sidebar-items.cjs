const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /className=\{`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800\/50 \$\{activeTab === '([^']+)' \? 'bg-slate-200 dark:bg-slate-800\/50 text-slate-900 dark:text-white' : ''\}`\}/g;

code = code.replace(regex, (match, tab) => {
    return `className={\`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all \${activeTab === '${tab}' ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}\`}`;
});

fs.writeFileSync('src/App.tsx', code);
