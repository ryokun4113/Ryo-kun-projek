const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The messed up values are from cascading replacements. 
// E.g. 'text-slate-400' -> 'text-slate-500 dark:text-slate-400' -> 'text-slate-400 dark:text-slate-500 dark:text-slate-400'
// Let's just fix the messed up classes:

const fixes = {
  'text-slate-400 dark:text-slate-500 dark:text-slate-400': 'text-slate-500 dark:text-slate-400',
  'text-slate-400 dark:text-slate-500 hover:text-slate-900': 'text-slate-500 hover:text-slate-900', // wait, look at what we actually got
};

// Instead of guess work, let's write a regex that matches combinations of dark: and normal and cleans them up.
// For tailwind classes, it's safe to just remove duplicates.
