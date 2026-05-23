import React, { useState } from 'react';
import { Item } from '../types';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, CheckSquare, Square, Search, X } from 'lucide-react';
import { motion } from 'motion/react';

interface PrintLabelsProps {
  inventory: Item[];
}

export function PrintLabels({ inventory }: PrintLabelsProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [layout, setLayout] = useState<'A4' | 'THERMAL'>('A4');

  const filteredInventory = inventory.filter(item => 
    item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedItems.size === filteredInventory.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredInventory.map(i => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const selectedItemsList = inventory.filter(i => selectedItems.has(i.id));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto py-6 animate-in fade-in h-[calc(100vh-200px)] min-h-[500px] flex flex-col md:flex-row gap-6">
      {/* Left Sidebar - Selection */}
      <div className="print:hidden w-full md:w-1/3 flex flex-col gap-4 bg-white dark:bg-[#1e293b] p-6 rounded-[30px] border border-slate-200 dark:border-slate-800 shadow-sm h-full overflow-hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Printer className="text-emerald-500" /> Cetak Label 
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
            Pilih item untuk dicetak kode QR-nya.
          </p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari aset..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 pl-9 pr-4 py-3 rounded-xl text-xs font-bold focus:border-emerald-500 outline-none uppercase dark:text-white"
          />
        </div>

        <div className="flex gap-2 text-xs font-bold uppercase">
          <button 
            onClick={() => setLayout('A4')}
            className={`flex-1 py-2 rounded-lg border transition-colors ${layout === 'A4' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Kertas A4
          </button>
          <button 
            onClick={() => setLayout('THERMAL')}
            className={`flex-1 py-2 rounded-lg border transition-colors ${layout === 'THERMAL' ? 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
          >
            Label Thermal
          </button>
        </div>

        <div className="flex justify-between items-center bg-slate-50 dark:bg-[#020617] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
           <button onClick={handleSelectAll} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors">
              {selectedItems.size === filteredInventory.length && filteredInventory.length > 0 ? <CheckSquare size={16} className="text-emerald-500" /> : <Square size={16} />}
              Pilih Semua ({filteredInventory.length})
           </button>
           <span className="text-xs font-black text-emerald-600 dark:text-emerald-500">{selectedItems.size} TERPILIH</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {filteredInventory.map(item => (
            <div 
              key={item.id} 
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-colors flex items-center gap-3 ${selectedItems.has(item.id) ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/50'}`}
            >
              {selectedItems.has(item.id) ? <CheckSquare size={16} className="text-emerald-600 dark:text-emerald-500 shrink-0" /> : <Square size={16} className="text-slate-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs uppercase truncate dark:text-white">{item.name}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.id}</p>
              </div>
            </div>
          ))}
          {filteredInventory.length === 0 && (
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 py-8 font-mono">TIDAK ADA DATA</p>
          )}
        </div>

        <button 
          onClick={handlePrint}
          disabled={selectedItems.size === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:dark:bg-slate-800 disabled:cursor-not-allowed text-white dark:text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Printer size={16} /> CETAK SEKARANG
        </button>
      </div>

      {/* Right Side - Print Preview */}
      <div className="print:hidden w-full md:w-2/3 bg-slate-100 dark:bg-[#020617] rounded-[30px] border border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center overflow-y-auto">
         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 border-b border-slate-200 dark:border-slate-800 pb-2 w-full text-center">Print Preview ({layout})</p>
         
         {/* Preview Container Wrapper to simulate paper */}
         {selectedItems.size > 0 ? (
           <div className={`bg-white shadow-xl min-h-[500px] w-full max-w-2xl transform origin-top ${layout === 'A4' ? 'p-8 aspect-[1/1.414]' : 'p-4'}`}>
              <div className={`grid gap-4 ${layout === 'A4' ? 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : 'grid-cols-2 md:grid-cols-3'}`}>
                {selectedItemsList.map(item => (
                  <div key={item.id} className="border border-slate-200 p-2 flex flex-col items-center justify-center text-center bg-white break-inside-avoid">
                      <QRCodeSVG value={item.id} size={layout === 'A4' ? 60 : 80} />
                      <p className="text-[8px] sm:text-[10px] font-black uppercase mt-2 text-black leading-tight max-w-full overflow-hidden text-ellipsis line-clamp-2">{item.name}</p>
                      <p className="text-[7px] sm:text-[8px] font-mono mt-1 text-slate-600">{item.id}</p>
                  </div>
                ))}
              </div>
           </div>
         ) : (
           <div className="flex flex-col items-center justify-center h-full text-slate-400">
             <Printer size={48} className="mb-4 opacity-50" />
             <p className="text-xs font-bold uppercase tracking-widest">Belum ada aset terpilih</p>
           </div>
         )}
      </div>

      {/* Print-Only Area - Rendered purely for window.print() */}
      <div className="hidden print:block w-full bg-white text-black p-0 m-0">
          <div className={`w-full grid ${layout === 'A4' ? 'grid-cols-5 gap-3' : 'grid-cols-3 gap-2'}`}>
            {selectedItemsList.map(item => (
              <div key={item.id} className="border border-slate-300 p-2 flex flex-col items-center justify-center text-center break-inside-avoid page-break-inside-avoid">
                  <QRCodeSVG value={item.id} size={layout === 'A4' ? 64 : 80} />
                  <p className="text-[9px] font-black uppercase mt-2 text-black leading-tight max-w-full overflow-hidden text-ellipsis line-clamp-2">{item.name}</p>
                  <p className="text-[8px] font-mono mt-1 text-slate-700">{item.id}</p>
              </div>
            ))}
          </div>
      </div>
    </div>
  );
}
