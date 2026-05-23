const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = `               <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                  <label className="flex justify-between items-center text-[10px] font-black text-slate-700 dark:text-slate-300 mb-4 tracking-widest uppercase">
                    <span>Skala Kertas Zoom</span>
                    <span className="text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded shadow-sm">{printContext.scale || 100}%</span>
                  </label>
                  <input type="range" min="30" max="150" step="5" value={printContext.scale || 100} onChange={(e) => setPrintContext({...printContext, scale: Number(e.target.value)})} className="w-full accent-emerald-500 outline-none hover:opacity-80 transition-opacity" />
                  <p className="text-[8px] text-slate-500 mt-3 font-semibold uppercase tracking-widest leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                     <AlertTriangle size={10} className="inline mr-1 text-orange-500 mb-0.5" /> Skala ini BUKAN untuk ukuran mesin cetak, HANYA untuk memudahkan tinjauan visualisasi layout HTML A4 di layar perangkat anda.
                  </p>
               </div>`;

const r1 = `               <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  {printContext.type !== 'barcode-roll' && (
                    <>
                    <div>
                      <label className="flex text-[10px] font-black text-slate-700 dark:text-slate-300 mb-2 tracking-widest uppercase">Orientasi Kertas (A4)</label>
                      <select value={printContext.orientation || 'portrait'} onChange={e => setPrintContext({...printContext, orientation: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs uppercase font-bold outline-none text-slate-800 dark:text-slate-200 focus:border-emerald-500 cyber-cut">
                         <option value="portrait">Portrait (Tegak)</option>
                         <option value="landscape">Landscape (Mendatar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex text-[10px] font-black text-slate-700 dark:text-slate-300 mb-2 tracking-widest uppercase">Margin Dokumen</label>
                      <select value={printContext.margin || '10mm'} onChange={e => setPrintContext({...printContext, margin: e.target.value})} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs uppercase font-bold outline-none text-slate-800 dark:text-slate-200 focus:border-emerald-500 cyber-cut">
                         <option value="5mm">Sempit (5mm)</option>
                         <option value="10mm">Normal (10mm)</option>
                         <option value="20mm">Lebar (20mm)</option>
                      </select>
                    </div>
                    <hr className="border-slate-200 dark:border-slate-700/50" />
                    </>
                  )}
                  <div>
                    <label className="flex justify-between items-center text-[10px] font-black text-slate-700 dark:text-slate-300 mb-4 tracking-widest uppercase">
                      <span>Skala Preview Layar</span>
                      <span className="text-emerald-600 dark:text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded shadow-sm">{printContext.scale || 100}%</span>
                    </label>
                    <input type="range" min="30" max="150" step="5" value={printContext.scale || 100} onChange={(e) => setPrintContext({...printContext, scale: Number(e.target.value)})} className="w-full accent-emerald-500 outline-none hover:opacity-80 transition-opacity" />
                    <p className="text-[8px] text-slate-500 mt-3 font-semibold uppercase tracking-widest leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                       <AlertTriangle size={10} className="inline mr-1 text-orange-500 mb-0.5" /> Hanya zoom visual untuk preview, TIDAK berpengaruh ke hasil cetak asli.
                    </p>
                  </div>
               </div>`;

code = code.replace(t1, r1);

const t2 = `                    style={{
                       width: printContext.type === 'barcode-roll' ? '100mm' : '210mm',
                       minHeight: printContext.type === 'barcode-roll' ? 'auto' : '297mm',
                       maxWidth: '100%',
                       padding: printContext.type === 'barcode-roll' ? '0' : '10mm',`;

const r2 = `                    style={{
                       width: printContext.type === 'barcode-roll' ? '100mm' : (printContext.orientation === 'landscape' ? '297mm' : '210mm'),
                       minHeight: printContext.type === 'barcode-roll' ? 'auto' : (printContext.orientation === 'landscape' ? '210mm' : '297mm'),
                       maxWidth: '100%',
                       padding: printContext.type === 'barcode-roll' ? '0' : (printContext.margin || '10mm'),`;

code = code.replace(t2, r2);

const t3 = `                @media print { 
                  @page { size: A4; margin: 5mm; } 
                  body { background: white !important; -webkit-print-color-adjust: exact; color-adjust: exact; } 
                  #print-canvas { transform: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; }
                }`;

const r3 = `                @media print { 
                  @page { size: A4 \${printContext.orientation || 'portrait'}; margin: \${printContext.margin || '10mm'}; } 
                  body { background: white !important; -webkit-print-color-adjust: exact; color-adjust: exact; } 
                  #print-canvas { transform: none !important; box-shadow: none !important; margin: 0 !important; width: 100% !important; }
                }`;

code = code.replace(t3, r3);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
