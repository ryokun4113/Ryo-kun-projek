const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the aside class string entirely
code = code.replace(/<aside className=\{`glass-effect [^`]+`\}>/, 
    "<aside className={`print:hidden fixed md:relative top-0 bottom-0 left-0 w-[280px] md:w-[300px] border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#050b14]/95 backdrop-blur-xl flex flex-col shrink-0 z-[300] transform transition-transform duration-300 ease-in-out md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>");

fs.writeFileSync('src/App.tsx', code);
