const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/<span className="uppercase">BATALYON B PELOPOR<\/span>/g, '<span className="uppercase text-emerald-600 dark:text-emerald-500">BATALYON B PELOPOR</span>');

fs.writeFileSync('src/App.tsx', code);
