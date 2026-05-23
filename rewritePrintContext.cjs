const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /\{\/\* Print View Layer \*\/\}\s*\{printContext && \(\s*<div className="absolute inset-0 w-full min-h-screen bg-white z-\[99999\] text-black print:static print:overflow-visible print:h-auto print:min-h-0 print:block">([\s\S]*?)<\/div>\n\s*\)\}/s;

const match = code.match(regex);
if (!match) {
  console.log("No match found!");
  process.exit(1);
}

const innerContent = match[1];

const replacement = `      {/* Print View Layer */}
      {printContext && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex p-4 md:p-8 print:p-0 print:bg-white print:block">
          <div className="w-80 bg-white dark:bg-slate-900 flex-shrink-0 flex flex-col p-6 rounded-2xl print:hidden shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative mr-6 z-[100000]">
            <h2 className="text-lg font-black uppercase mb-4 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4 flex items-center gap-2">
               <Printer className="text-emerald-500" /> Print Preview
            </h2>
            {/* Controls */}
            <div className="space-y-3 mt-2">
               <button onClick={() => { setTimeout(() => window.print(), 100); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 cyber-cut"><Printer size={16} /> Cetak Sekarang</button>
               <button onClick={() => setPrintContext(null)} className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-colors shadow-sm cyber-cut">Batal</button>
            </div>
            {/* Configs */}
            <div className="mt-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
               <h3 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 pb-2">Pengaturan Layar</h3>
               
               {printContext.type === 'inventory-selection' && (
                 <label className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                   <input type="checkbox" checked={printContext.compact} onChange={(e) => setPrintContext({...printContext, compact: e.target.checked})} className="w-4 h-4 accent-emerald-500" />
                   Compact Mode
                 </label>
               )}

               <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                  <label className="flex justify-between items-center text-[10px] font-black text-slate-700 dark:text-slate-300 mb-4 tracking-widest uppercase">
                    <span>Skala Kertas Zoom</span>
                    <span className="text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded shadow-sm">{printContext.scale || 100}%</span>
                  </label>
                  <input type="range" min="30" max="150" step="5" value={printContext.scale || 100} onChange={(e) => setPrintContext({...printContext, scale: Number(e.target.value)})} className="w-full accent-emerald-500 outline-none hover:opacity-80 transition-opacity" />
                  <p className="text-[8px] text-slate-500 mt-3 font-semibold uppercase tracking-widest leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                     <AlertTriangle size={10} className="inline mr-1 text-orange-500 mb-0.5" /> Skala ini BUKAN untuk ukuran mesin cetak, HANYA untuk memudahkan tinjauan visualisasi layout HTML A4 di layar perangkat anda.
                  </p>
               </div>
               
               <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/40 p-4 rounded-xl">
                  <h4 className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest mb-2 flex items-center gap-1">
                     <Settings size={12} /> Panduan Setting Browser
                  </h4>
                  <ul className="text-[9px] text-blue-800/80 dark:text-blue-300/80 font-bold space-y-2 uppercase leading-relaxed tracking-wide">
                     <li className="flex items-start gap-1"><span className="text-blue-500 mt-0.5">•</span> Pastikan <span className="font-black text-blue-600 dark:text-blue-400">Paper Size</span> diatur ke A4 atau Roll Sticker di dialog cetak browser.</li>
                     <li className="flex items-start gap-1"><span className="text-blue-500 mt-0.5">•</span> Centang opsi <span className="font-black text-blue-600 dark:text-blue-400">Background Graphics</span> agar warna latar tercetak.</li>
                     <li className="flex items-start gap-1"><span className="text-blue-500 mt-0.5">•</span> Set Margins ke <span className="font-black text-blue-600 dark:text-blue-400">Minimum/None</span> jika menggunakan mode Roll Barcode agar desain fit ke kertas.</li>
                  </ul>
               </div>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-200 dark:bg-[#050b14]/90 border border-slate-300 dark:border-slate-800 rounded-2xl overflow-auto flex py-10 justify-center print:p-0 print:border-none print:bg-white print:rounded-none relative shadow-[inset_0_4px_24px_rgba(0,0,0,0.05)] dark:shadow-none custom-scrollbar print:!overflow-visible print:!block z-10 w-full">
             {/* Dynamic Canvas Container for Preview */}
             <div className="flex justify-center items-start print:block print:w-full print:h-full">
                 {/* A4 Paper Canvas (or customized) */}
                 <div 
                   className="bg-white relative transition-transform origin-top text-black print:!block print:!w-full print:!m-0 print:!scale-100 print:transform-none"
                   style={{
                      width: printContext.type === 'barcode-roll' ? '100mm' : '210mm',
                      minHeight: printContext.type === 'barcode-roll' ? 'auto' : '297mm',
                      maxWidth: '100%',
                      padding: printContext.type === 'barcode-roll' ? '0' : '10mm',
                      transform: document.body.classList.contains('is-printing') ? 'scale(1)' : \`scale(\${(printContext.scale || 100)/100})\`,
                      marginBottom: '40px',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.15)'
                   }}
                 >
                   <div className="print-content-wrapper w-full h-full bg-white print:bg-transparent">
${innerContent}
                   </div>
                 </div>
             </div>
          </div>
        </div>
      )}`;

code = code.replace(regex, replacement);

const handlePrintRegex = /const handlePrint = \(ctx: any\) => \{\n\s*setPrintContext\(ctx\);\n\s*setTimeout\(\(\) => window\.print\(\), 800\);\n\s*\};/;
const handlePrintReplacement = `const handlePrint = (ctx: any) => {
    setPrintContext({...ctx, scale: Math.min(100, Math.floor((window.innerWidth - 450) / 800 * 100))});
  };`;
code = code.replace(handlePrintRegex, handlePrintReplacement);

// Remove box shadow from print
code = code.replace(/boxShadow: '0 20px 50px rgba\(0,0,0,0\.15\)'/g, "boxShadow: document.body.classList.contains('is-printing') ? 'none' : '0 20px 50px rgba(0,0,0,0.15)'");

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
