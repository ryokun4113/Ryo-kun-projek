const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = {
  'bg-\\[#020617\\]': 'bg-slate-50 dark:bg-[#020617]',
  'text-white': 'text-slate-900 dark:text-white',
  'bg-slate-900': 'bg-white dark:bg-slate-900',
  'bg-slate-800(?!/)': 'bg-slate-100 dark:bg-slate-800',
  'bg-slate-800/': 'bg-slate-100/ dark:bg-slate-800/',
  'bg-slate-950': 'bg-slate-200 dark:bg-slate-950',
  'border-slate-800': 'border-slate-200 dark:border-slate-800',
  'border-slate-700': 'border-slate-300 dark:border-slate-700',
  'text-slate-400': 'text-slate-500 dark:text-slate-400',
  'text-slate-300': 'text-slate-600 dark:text-slate-300',
  'text-slate-500': 'text-slate-400 dark:text-slate-500',
  'hover:bg-slate-800(?!/)': 'hover:bg-slate-200 dark:hover:bg-slate-800',
  'hover:bg-slate-800/': 'hover:bg-slate-200/ dark:hover:bg-slate-800/',
  'hover:bg-slate-700': 'hover:bg-slate-300 dark:hover:bg-slate-700',
  'hover:text-white': 'hover:text-slate-900 dark:hover:text-white'
};

// carefully replace using Regex
for (const [key, val] of Object.entries(replacements)) {
  const regex = new RegExp(`(?<!dark:)${key}`, 'g');
  code = code.replace(regex, val);
}

fs.writeFileSync('src/App.tsx', code);
console.log('Done replacing colors.');
