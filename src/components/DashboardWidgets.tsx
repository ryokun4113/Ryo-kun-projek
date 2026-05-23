import { X, PieChart, BarChart2, History, GripHorizontal } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export function MetricsWidget({ inventory, dashboardListType, setDashboardListType }: any) {
    return (
        <>
            {/* Card 1 */}
            <div className={`relative w-full transition-all ${dashboardListType === 'Total' ? 'z-50' : 'z-10 hover:z-40'}`}>
                <div 
                    onClick={() => setDashboardListType(dashboardListType === 'Total' ? null : 'Total')}
                    className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 hover:border-slate-500 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                >
                <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-slate-600"></span>
                <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-slate-600"></span>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Total Aset<br/>Terdaftar</p>
                <p className="text-6xl font-black text-slate-900 dark:text-white mt-4">{inventory.length}</p>
                </div>
                {dashboardListType === 'Total' && (
                    <div className="absolute top-full left-0 right-0 mt-4 bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-[30px] p-6 shadow-2xl shadow-black/80 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Detail Total Aset</span>
                        <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800"><X size={14}/></button>
                        </div>
                        <ul className="space-y-2">
                        {inventory.length === 0 && <li className="text-xs text-slate-600 dark:text-slate-400 italic text-center py-4">Kosong</li>}
                        {inventory.map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center bg-white dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-600 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.name}</span>
                                    <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">{item.id}</span>
                                </div>
                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 ${item.status === 'Di Gudang' ? 'text-emerald-500' : 'text-orange-500'}`}>{item.status}</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>
            
            {/* Card 2 */}
            <div className={`relative w-full transition-all ${dashboardListType === 'Tersedia' ? 'z-50' : 'z-10 hover:z-40'}`}>
                <div 
                    onClick={() => setDashboardListType(dashboardListType === 'Tersedia' ? null : 'Tersedia')}
                    className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                >
                <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-emerald-600"></span>
                <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-emerald-600"></span>
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Aset Tersedia<br/>(Di Gudang)</p>
                <p className="text-6xl font-black text-emerald-500 mt-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{inventory.filter((i: any) => i.status === "Di Gudang").length}</p>
                </div>
                {dashboardListType === 'Tersedia' && (
                    <div className="absolute top-full left-0 right-0 mt-4 bg-slate-50 dark:bg-[#020617] border border-emerald-900/50 rounded-[30px] p-6 shadow-2xl shadow-emerald-900/20 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4 border-b border-emerald-900/30 pb-3">
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Detail Aset Tersedia</span>
                        <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-emerald-600 hover:text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/50"><X size={14}/></button>
                        </div>
                        <ul className="space-y-2">
                        {inventory.filter((i: any) => i.status === "Di Gudang").length === 0 && <li className="text-xs text-slate-600 dark:text-slate-400 italic text-center py-4">Kosong</li>}
                        {inventory.filter((i: any) => i.status === "Di Gudang").map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30 hover:border-emerald-700/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.name}</span>
                                    <span className="text-[9px] font-mono text-slate-600 dark:text-slate-400">{item.id}</span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-emerald-500">DI GUDANG</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Card 3 */}
            <div className={`relative w-full transition-all ${dashboardListType === 'Keluar' ? 'z-50' : 'z-10 hover:z-40'}`}>
                <div 
                    onClick={() => setDashboardListType(dashboardListType === 'Keluar' ? null : 'Keluar')}
                    className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-200 dark:border-slate-700 hover:border-orange-500/50 transition-colors shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                >
                <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-orange-600"></span>
                <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-orange-600"></span>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Aset Dipinjamkan<br/>(Keluar)</p>
                <p className="text-6xl font-black text-orange-400 mt-4 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">{inventory.filter((i: any) => i.status === "Keluar").length}</p>
                </div>
                {dashboardListType === 'Keluar' && (
                    <div className="absolute top-full left-0 right-0 mt-4 bg-slate-50 dark:bg-[#020617] border border-orange-900/50 rounded-[30px] p-6 shadow-2xl shadow-orange-900/20 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4 border-b border-orange-900/30 pb-3">
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Detail Aset Dipinjamkan</span>
                        <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-orange-600 hover:text-orange-400 bg-orange-950/40 p-1.5 rounded-lg border border-orange-900/50"><X size={14}/></button>
                        </div>
                        <ul className="space-y-2">
                        {inventory.filter((i: any) => i.status === "Keluar").length === 0 && <li className="text-xs text-slate-600 dark:text-slate-400 italic text-center py-4">Kosong</li>}
                        {inventory.filter((i: any) => i.status === "Keluar").map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between items-center bg-orange-950/20 p-3 rounded-xl border border-orange-900/30 hover:border-orange-700/50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{item.name}</span>
                                    <span className="text-[9px] font-mono text-orange-400">PEMEGANG: {item.holder}</span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-orange-500">KELUAR</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    )
}

export function ChartWidget({ chartData }: any) {
    return (
        <div className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-200 dark:border-slate-700 relative cyber-mesh-bg w-full min-h-[300px]">
            <span className="absolute top-3 left-3 w-3 h-3 border-t border-l border-slate-600"></span>
            <span className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-slate-600"></span>
            
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 mb-8">
                <BarChart2 size={16} className="text-emerald-500" /> AKTIVITAS PEMINJAMAN 7 HARI TERAKHIR
            </h3>
            
            <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Line type="monotone" name="Masuk (IN)" dataKey="In" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" name="Keluar (OUT)" dataKey="Out" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

export function PieWidget() {
    return (
        <div className="bg-white/80 dark:bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-200 dark:border-slate-700 relative w-full min-h-[300px]">
            <span className="absolute top-3 left-3 w-3 h-3 border-t border-l border-orange-600"></span>
            <span className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-orange-600"></span>
            
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase flex items-center gap-2 mb-8">
                <PieChart size={16} className="text-orange-500" /> ASET PALING SERING DIPINJAM
            </h3>

            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 rounded-full border-[20px] border-orange-500 border-l-blue-500 border-t-emerald-500 border-r-purple-500">
                {/* CSS-only simple blocky pie representation */}
                </div>
                
                {/* Legend */}
                <div className="mt-8 flex flex-wrap justify-center gap-4 text-[8px] text-slate-600 dark:text-slate-400 uppercase tracking-widest max-w-sm">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 inline-block"></span> SIG SAUER MPX</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 inline-block"></span> AK 101</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 inline-block"></span> SIG SAUER 716 SNIPER</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 inline-block"></span> STEYR SSG 08 SNIPER</span>
                </div>
            </div>
        </div>
    )
}

export function LogsWidget({ logs }: any) {
    return (
        <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-200 dark:border-slate-700 relative w-full flex flex-col items-stretch overflow-hidden shadow-sm">
            <h3 className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-widest mb-4 flex items-center gap-2">
                <History size={16} className="text-blue-600 dark:text-blue-500" /> <span className="text-slate-400 dark:text-slate-500 mr-1">[</span>LOG AUDIT AKTIFITAS (1 BULAN)<span className="text-slate-400 dark:text-slate-500 ml-1">]</span>
            </h3>
            <div className="overflow-auto max-h-[400px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#020617] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-slate-100 dark:bg-[#020617] sticky top-0 z-10 shadow-sm dark:shadow-none border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">WAKTU</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">TIPE MUTASI</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">ASET</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 w-1/3">KETERANGAN / PEMEGANG</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">OPERATOR</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                    {logs.filter((l: any) => Date.now() - l.timestamp <= 30 * 24 * 60 * 60 * 1000).map((log: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 whitespace-nowrap">
                            <p className="text-xs font-mono font-black text-slate-800 dark:text-slate-300">{log.fullDate}</p>
                            <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">{log.time}</p>
                        </td>
                        <td className="p-4 whitespace-nowrap">
                            {log.type === 'IN' && <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-500 border border-emerald-300 dark:border-emerald-900/50 rounded text-[9px] font-black uppercase tracking-widest">MASUK (IN)</span>}
                            {log.type === 'OUT' && <span className="px-2 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-700 dark:text-orange-500 border border-orange-300 dark:border-orange-900/50 rounded text-[9px] font-black uppercase tracking-widest">KELUAR (OUT)</span>}
                            {log.type === 'ADD' && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-500 border border-blue-300 dark:border-blue-900/50 rounded text-[9px] font-black uppercase tracking-widest">REGISTRASI (ADD)</span>}
                            {log.type === 'DELETE' && <span className="px-2 py-1 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-500 border border-red-300 dark:border-red-900/50 rounded text-[9px] font-black uppercase tracking-widest">HAPUS (DEL)</span>}
                            {log.type === 'EDIT' && <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-500 border border-yellow-300 dark:border-yellow-900/50 rounded text-[9px] font-black uppercase tracking-widest">EDIT (MOD)</span>}
                        </td>
                        <td className="p-4">
                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{log.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 font-mono">[{log.id}]</p>
                        </td>
                        <td className="p-4">
                            {log.type === 'OUT' ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase">DIPINJAM OLEH:</span>
                                    <span className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase">{log.holder || '-'}</span>
                                </div>
                            ) : log.type === 'DELETE' ? (
                                <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">DIHAPUS DARI SISTEM</p>
                            ) : log.type === 'EDIT' ? (
                                <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase">DETAIL ASET DIDALAM SISTEM TELAH DIPERBARUI</p>
                            ) : (
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{log.holder || '-'}</span>
                            )}
                        </td>
                        <td className="p-4 text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-300 uppercase whitespace-nowrap">{log.operator}</td>
                        </tr>
                    ))}
                    {logs.length === 0 && (
                        <tr><td colSpan={5} className="p-10 text-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">BELUM ADA LOG AKTIVITAS 1 BULAN TERAKHIR</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
