const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardWidgets.tsx', 'utf8');

// For total card
code = code.replace(/shadow-2xl relative overflow-hidden group/g, 
'shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl relative overflow-hidden group');

// We have multiple shadow-2xl! Let's just do a blanket regex for shadow-2xl in dashboard cards.
code = code.replace(/shadow-2xl relative/g, 'shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl relative');

fs.writeFileSync('src/components/DashboardWidgets.tsx', code);
