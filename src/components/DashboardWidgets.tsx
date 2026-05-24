import React, { useState } from "react";
import { X, PieChart, BarChart2, History, GripHorizontal, FileDown, Search, SlidersHorizontal, Settings2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const INDONESIAN_MONTHS = [
    { value: "0", label: "Januari" },
    { value: "1", label: "Februari" },
    { value: "2", label: "Maret" },
    { value: "3", label: "April" },
    { value: "4", label: "Mei" },
    { value: "5", label: "Juni" },
    { value: "6", label: "Juli" },
    { value: "7", label: "Agustus" },
    { value: "8", label: "September" },
    { value: "9", label: "Oktober" },
    { value: "10", label: "November" },
    { value: "11", label: "Desember" }
];

export function MetricsWidget({ inventory, dashboardListType, setDashboardListType }: any) {
    return (
        <>
            {/* Card 1 */}
            <div className={`relative w-full transition-all ${dashboardListType === 'Total' ? 'z-50' : 'z-10 hover:z-40'}`}>
                <div 
                    onClick={() => setDashboardListType(dashboardListType === 'Total' ? null : 'Total')}
                    className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 transition-all duration-300 shadow-xl dark:shadow-[0_0_20px_rgba(0,0,0,0.2)] relative overflow-hidden group cursor-pointer h-full"
                >
                <div className="absolute top-0 left-0 w-1 h-32 bg-slate-400/20"></div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> TOTAL ASET
                </p>
                <p className="text-6xl font-black text-slate-900 dark:text-white mt-1 tracking-tighter">{inventory.length}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-full">Global Database</span>
                </div>
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
                    className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-slate-200 dark:border-emerald-500/10 hover:border-emerald-500/50 transition-all duration-300 shadow-xl dark:shadow-[0_0_20px_rgba(16,185,129,0.05)] relative overflow-hidden group cursor-pointer h-full"
                >
                <div className="absolute top-0 left-0 w-1 h-32 bg-emerald-500/20"></div>
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-500/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span> TERSEDIA
                </p>
                <p className="text-6xl font-black text-emerald-500 mt-1 tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{inventory.filter((i: any) => i.status === "Di Gudang").length}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest border border-emerald-500/20 px-2 py-0.5 rounded-full bg-emerald-500/5">In Warehouse</span>
                </div>
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
                    className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl p-8 rounded-[40px] border border-slate-200 dark:border-orange-500/10 hover:border-orange-500/50 transition-all duration-300 shadow-xl dark:shadow-[0_0_20px_rgba(249,115,22,0.05)] relative overflow-hidden group cursor-pointer h-full"
                >
                <div className="absolute top-0 left-0 w-1 h-32 bg-orange-500/20"></div>
                <p className="text-[10px] font-black text-orange-600 dark:text-orange-500/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]"></span> KELUAR
                </p>
                <p className="text-6xl font-black text-orange-400 mt-1 tracking-tighter drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">{inventory.filter((i: any) => i.status === "Keluar").length}</p>
                <div className="mt-4 flex items-center gap-2">
                    <span className="text-[9px] font-bold text-orange-600 dark:text-orange-500 uppercase tracking-widest border border-orange-500/20 px-2 py-0.5 rounded-full bg-orange-500/5">Borrowed Items</span>
                </div>
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
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedType, setSelectedType] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [isExporting, setIsExporting] = useState<boolean>(false);

    // Extract unique years available in logs
    const availableYears = React.useMemo(() => {
        const years = new Set<string>();
        logs.forEach((l: any) => {
            if (l.timestamp) {
                try {
                    const y = new Date(l.timestamp).getFullYear().toString();
                    years.add(y);
                } catch (e) {}
            }
        });
        const currentYearStr = new Date().getFullYear().toString();
        years.add(currentYearStr);
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [logs]);

    // Apply dynamic multi-filtering
    const filteredLogsResult = React.useMemo(() => {
        return logs.filter((log: any) => {
            const logDate = new Date(log.timestamp || Date.now());

            // 1. Month Filter
            if (selectedMonth !== "all") {
                if (logDate.getMonth().toString() !== selectedMonth) {
                    return false;
                }
            }

            // 2. Year Filter
            if (selectedYear !== "all") {
                if (logDate.getFullYear().toString() !== selectedYear) {
                    return false;
                }
            }

            // 3. Type Filter
            if (selectedType !== "all") {
                if (log.type !== selectedType) {
                    return false;
                }
            }

            // 4. Search text matches ID, Name, Holder, Operator
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                const idMatch = log.id ? log.id.toLowerCase().includes(query) : false;
                const nameMatch = log.name ? log.name.toLowerCase().includes(query) : false;
                const opMatch = log.operator ? log.operator.toLowerCase().includes(query) : false;
                const holderMatch = log.holder ? log.holder.toLowerCase().includes(query) : false;
                return idMatch || nameMatch || opMatch || holderMatch;
            }

            return true;
        }).sort((a: any, b: any) => b.timestamp - a.timestamp); // newest first
    }, [logs, selectedMonth, selectedYear, selectedType, searchQuery]);

    // Handle PDF Export using jsPDF & jsPDF-AutoTable
    const handleExportPDF = () => {
        setIsExporting(true);
        try {
            // Initiate portrait A4 document
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            // 1. Official Institutional Kop Surat (KOP SURAT)
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(115, 125, 140);
            doc.text("KEMENTERIAN PERTAHANAN REPUBLIK INDONESIA", 15, 12);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42); // slate-900 Accent
            doc.text("DIREKTORAT LOGISTIK & INSTALASI INVENTARISASI GUDANG SENJATA", 15, 17);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("Markas Batalyon, Jl. Mayor Jenderal Sutoyo, DKI Jakarta - 13650 | Telp: (021) 809-5678", 15, 21);

            // Double Horizontal Rule as Kop Divider
            doc.setDrawColor(15, 23, 42); // slate-900
            doc.setLineWidth(0.8);
            doc.line(15, 24, 195, 24);
            doc.setDrawColor(148, 163, 184); // slate-400
            doc.setLineWidth(0.2);
            doc.line(15, 25.5, 195, 25.5);

            // 2. Title & Metadata Header
            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text("LAPORAN RESMI MUTASI INVENTARIS GUDANG BATAILLON", 105, 34, { align: "center" });

            // Month Label Text
            const monthLabel = selectedMonth === "all" ? "SEMUA BULAN" : INDONESIAN_MONTHS.find(m => m.value === selectedMonth)?.label?.toUpperCase();
            const yearLabel = selectedYear === "all" ? "SEMUA TAHUN" : selectedYear;
            const periodString = `PERIODE MUTASI: ${monthLabel} ${yearLabel}`;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text(periodString, 105, 39, { align: "center" });

            // Printing timestamp & classification tags
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            const formattedPrintTime = new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "medium" });
            doc.text(`Waktu Cetak: ${formattedPrintTime} WIB | Status Klasifikasi: DOKUMEN INTERNAL TERBATAS`, 105, 43, { align: "center" });

            // 3. Summary Statistics Box
            const totalLogs = filteredLogsResult.length;
            const totalIn = filteredLogsResult.filter((l: any) => l.type === "IN").length;
            const totalOut = filteredLogsResult.filter((l: any) => l.type === "OUT").length;
            const totalSysActions = filteredLogsResult.filter((l: any) => ["ADD", "EDIT", "DELETE"].includes(l.type)).length;

            doc.setFillColor(248, 250, 252); // soft grey background
            doc.rect(15, 47, 180, 14, "F");
            doc.setDrawColor(226, 232, 240); // borders
            doc.rect(15, 47, 180, 14, "D");

            // Label text in Stats Box
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text("TOTAL MUTASI", 20, 52);
            doc.text("MASUK (IN)", 65, 52);
            doc.text("KELUAR (OUT)", 110, 52);
            doc.text("AKSI SISTEM (REG/DEL/MOD)", 150, 52);

            // Numerics in Stats Box
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(`${totalLogs} Kejadian`, 20, 57);
            doc.text(`${totalIn} Kegiatan`, 65, 57);
            doc.text(`${totalOut} Kegiatan`, 110, 57);
            doc.text(`${totalSysActions} Tindakan`, 150, 57);

            // 4. Mutation Logs Data Table with `jspdf-autotable`
            const columns = [
                ["NO", "HARI & TANGGAL", "LOG MUTASI", "ASET & SKU", "INFO KETERANGAN", "OPERATOR/NP"]
            ];

            const rows = filteredLogsResult.map((log: any, idx: number) => {
                let statusLabelText = "";
                switch (log.type) {
                    case "IN": statusLabelText = "MASUK (IN)"; break;
                    case "OUT": statusLabelText = "KELUAR (OUT)"; break;
                    case "ADD": statusLabelText = "REGISTRASI (ADD)"; break;
                    case "DELETE": statusLabelText = "HAPUS (DEL)"; break;
                    case "EDIT": statusLabelText = "EDIT (MOD)"; break;
                    default: statusLabelText = log.type || "";
                }

                let explanationDetail = "";
                if (log.type === 'OUT') {
                    explanationDetail = `PEMEGANG: ${log.holder || '-'}`;
                } else if (log.type === 'DELETE') {
                    explanationDetail = "PENGHAPUSAN AKTIF DARI SISTEM GUDANG";
                } else if (log.type === 'EDIT') {
                    explanationDetail = "PERUBAHAN SPESIFIKASI INFORMASI BARANG";
                } else {
                    explanationDetail = log.holder ? `DIKEMBALIKAN OLEH: ${log.holder}` : "STATUS: TERSEDIA DI GUDANG UTAMA";
                }

                return [
                    (idx + 1).toString(),
                    `${log.fullDate || ""} - ${log.time || ""}`,
                    statusLabelText,
                    `[${log.id}] ${log.name}`.toUpperCase(),
                    explanationDetail.toUpperCase(),
                    (log.operator || "SYSTEM").toUpperCase()
                ];
            });

            autoTable(doc, {
                startY: 66,
                head: columns,
                body: rows,
                theme: "striped",
                headStyles: {
                    fillColor: [15, 23, 42], // Elegance deep Navy Slate
                    textColor: [255, 255, 255],
                    font: "helvetica",
                    fontStyle: "bold",
                    fontSize: 7.5,
                    halign: "center",
                    valign: "middle"
                },
                bodyStyles: {
                    font: "helvetica",
                    fontSize: 7,
                    textColor: [51, 65, 85], // Slate-700
                    valign: "middle"
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252] // light slate tinting
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: "center" }, // No
                    1: { cellWidth: 32 }, // Hari & Tanggal
                    2: { cellWidth: 26, fontStyle: "bold", halign: "center" }, // Log Mutasi
                    3: { cellWidth: 48, fontStyle: "bold" }, // Aset & SKU
                    4: { cellWidth: 44 }, // Info Keterangan
                    5: { cellWidth: 20 }  // Operator
                },
                margin: { left: 15, right: 15, bottom: 25 },
                styles: {
                    overflow: "linebreak",
                    cellPadding: 2
                }
            });

            // 5. Official Signed Authorization Stamp Row
            const finalYCoordinate = (doc as any).lastAutoTable.finalY + 15;
            const paperHeight = doc.internal.pageSize.height;

            // Shift signature layout to next page gracefully if space is cramped
            if (finalYCoordinate > paperHeight - 40) {
                doc.addPage();
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                doc.text("Jakarta, " + new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }), 140, 25);
                
                doc.setFont("helvetica", "bold");
                doc.text("MENGETAHUI & MENGESAHKAN,", 140, 30);
                doc.text("KEPALA GUDANG PERSENJATAAN,", 140, 34);

                doc.text("( RYO KUN, LETDA CHB )", 140, 56);
                doc.setFont("helvetica", "normal");
                doc.text("NRP 21010459 | PERWIRA URUSAN LOGISTIK", 140, 60);
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);
                doc.text("Jakarta, " + new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }), 140, finalYCoordinate);
                
                doc.setFont("helvetica", "bold");
                doc.text("MENGETAHUI & MENGESAHKAN,", 140, finalYCoordinate + 5);
                doc.text("KEPALA GUDANG PERSENJATAAN,", 140, finalYCoordinate + 9);

                doc.text("( RYO KUN, LETDA CHB )", 140, finalYCoordinate + 31);
                doc.setFont("helvetica", "normal");
                doc.text("NRP 21010459 | PERWIRA URUSAN LOGISTIK", 140, finalYCoordinate + 35);
            }

            // Export save action
            doc.save(`LAPORAN_MUTASI_GUDANG_${monthLabel}_${yearLabel}.pdf`);
        } catch (e: any) {
            alert("Gagal melakukan ekspor PDF: " + (e.message || e));
            console.error("PDF Export Error:", e);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div id="logs-audit-widget" className="bg-white dark:bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-200 dark:border-slate-700 relative w-full flex flex-col items-stretch overflow-hidden shadow-sm">
            
            {/* Header with Title & Action controls */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-200 dark:border-slate-800">
                <div className="text-left">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-widest flex items-center gap-2">
                        <History size={16} className="text-blue-600 dark:text-blue-500" /> 
                        <span className="text-slate-400 dark:text-slate-500 mr-1">[</span>LOG AUDIT & MUTASI GUDANG<span className="text-slate-400 dark:text-slate-500 ml-1">]</span>
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">Laporan audit mutasi real-time siap ekspor ke format PDF Kepala Seksi Logistik.</p>
                </div>

                <button
                    onClick={handleExportPDF}
                    disabled={isExporting || filteredLogsResult.length === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700/60 shadow-lg disabled:opacity-55 disabled:cursor-not-allowed group transition-all"
                >
                    <FileDown size={14} className="group-hover:scale-110 transition-transform text-cyan-400" />
                    {isExporting ? "Memproses PDF..." : "Ekspor Laporan PDF"}
                </button>
            </div>

            {/* Sub Filter Controls Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 rounded-2xl bg-slate-50 dark:bg-[#030712]/40 border border-slate-200 dark:border-slate-800/80 text-left">
                
                {/* Search query input */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Pencarian Kata Kunci</label>
                    <div className="relative">
                        <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Aset, SKU, Operator, Pemegang"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl pl-8.5 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 text-[11px]"
                        />
                    </div>
                </div>

                {/* Log Type select */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Tipe Log Mutasi</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 text-[11px] font-mono"
                    >
                        <option value="all">SEMUA TIPE MUTASI</option>
                        <option value="IN">MASUK (IN)</option>
                        <option value="OUT">KELUAR (OUT)</option>
                        <option value="ADD">MASUKBARU (ADD)</option>
                        <option value="EDIT">UBAH INFO (EDIT)</option>
                        <option value="DELETE">HAPUS (DEL)</option>
                    </select>
                </div>

                {/* Month select */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Filter Bulan</label>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 text-[11px] font-mono"
                    >
                        <option value="all">SEMUA BULAN</option>
                        {INDONESIAN_MONTHS.map((m) => (
                            <option key={m.value} value={m.value}>{m.label.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                {/* Year select */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Filter Tahun</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full bg-white dark:bg-[#090d16] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-400 dark:focus:border-slate-700 text-[11px] font-mono"
                    >
                        <option value="all">SEMUA TAHUN</option>
                        {availableYears.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main scroll table */}
            <div className="overflow-auto max-h-[400px] border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-[#020617] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-slate-100 dark:bg-[#020617] sticky top-0 z-10 shadow-sm dark:shadow-none border-b border-slate-200 dark:border-slate-800">
                    <tr>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 w-12 text-center">NO</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">WAKTU MUTASI</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">TIPE MUTASI</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">IDENTITAS ASET</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 w-1/3">KETERANGAN & PEMEGANG</th>
                        <th className="p-4 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">OPERATOR</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                    {filteredLogsResult.map((log: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-center font-bold text-slate-500 text-xs">{idx + 1}</td>
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
                    {filteredLogsResult.length === 0 && (
                        <tr><td colSpan={6} className="p-10 text-center text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">BELUM ADA LOG AKTIVITAS ATAU TIDAK ADA DATA YANG COCOK DENGAN FILTER</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
