const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const target1 = `                    <div className="text-right">
                        <p className="text-xs font-mono">TANGGAL CETAK</p>
                        <p className="text-sm font-bold">{new Date().toLocaleString('id-ID')}</p>
                        <p className="text-xs mt-1 font-mono tracking-widest">{printContext.type}</p>
                    </div>
                
                   </div>
                 </div>
             </div>
          </div>
        </div>
      )}`;

const replacement1 = `                    <div className="text-right">
                        <p className="text-xs font-mono">TANGGAL CETAK</p>
                        <p className="text-sm font-bold">{new Date().toLocaleString('id-ID')}</p>
                        <p className="text-xs mt-1 font-mono tracking-widest">{printContext.type}</p>
                    </div>
                </div>
            )}`;

code = code.replace(target1, replacement1);

const target2 = `                    <div className="mt-16 flex justify-end">
                       <div className="text-center w-48">
                           <p className="text-xs font-bold mb-16">Pengesahan / Mengetahui</p>
                           <p className="border-t border-black pt-1 font-bold">KEPALA GUDANG</p>
                       </div>
                   </div>
                </div>
                );
            })}
        </div>
      )}
`;

const replacement2 = `                    <div className="mt-16 flex justify-end">
                       <div className="text-center w-48">
                           <p className="text-xs font-bold mb-16">Pengesahan / Mengetahui</p>
                           <p className="border-t border-black pt-1 font-bold">KEPALA GUDANG</p>
                       </div>
                   </div>
                </div>
                );
            })}
                   </div>
                 </div>
             </div>
          </div>
        </div>
      )}
`;

code = code.replace(target2, replacement2);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
