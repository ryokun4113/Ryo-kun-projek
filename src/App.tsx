import React, { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as XLSX from "xlsx";
import { 
  HeartHandshake, ShieldCheck, Camera, Layers, Search, 
  Settings, LogOut, Package, Scan as ScanIcon, 
  Clock, LayoutDashboard, Cpu, PlusSquare, 
  ClipboardCheck, MessageSquare, Database, Download, 
  BellRing, FileText, ArrowRight, X, Phone, Fingerprint, Wifi,
  Upload, RefreshCw, Cloud, Bell, BarChart2, PieChart, AlertTriangle,
  Calendar, History, Printer
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Barcode from 'react-barcode';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { AuthScreen } from "./AuthScreen";
import { initAuth, googleSignIn, logout as googleLogout, getAccessToken } from "./firebaseAuth";
import { backupToDrive, restoreFromDrive, listBackupFilesInDrive } from "./driveSystem";
import type { User as FirebaseUser } from "firebase/auth";

type Item = {
  id: string;
  name: string;
  category: string;
  serial: string;
  popor: string;
  holder: string;
  note: string;
  status: "Di Gudang" | "Keluar";
  date: string;
  customOverdueHours?: number;
  outTimestamp?: number;
  dueDate?: number;
};

type Log = {
  id: string;
  name: string;
  status: string;
  type: string;
  holder: string;
  time: string;
  fullDate: string;
  operator: string;
  timestamp: number;
  sessionName?: string;
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "scanner" | "inventory" | "add" | "opname" | "leaderboard" | "users">("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [inventory, setInventory] = useState<Item[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [printContext, setPrintContext] = useState<any>(null);

  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveBackups, setDriveBackups] = useState<any[]>([]);
  const [showDriveModal, setShowDriveModal] = useState(false);

  useEffect(() => {
    initAuth(
      (user, token) => setGoogleUser(user),
      () => setGoogleUser(null)
    );
  }, []);

  useEffect(() => {
    const afterPrint = () => setPrintContext(null);
    window.addEventListener('afterprint', afterPrint);
    return () => window.removeEventListener('afterprint', afterPrint);
  }, []);

  const handlePrint = (ctx: any) => {
    setPrintContext(ctx);
    setTimeout(() => window.print(), 800);
  };
  
  // Scanner state
  const [scanInput, setScanInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [holderInput, setHolderInput] = useState("");
  const [sessionNameInput, setSessionNameInput] = useState("");
  const [rapidScan, setRapidScan] = useState(false);

  // Added states for missing html features
  const [appSettings, setAppSettings] = useState({ 
    categories: ['Senjata Api', 'Senjata Pelontar', 'Amunisi', 'Perlengkapan Taktis'] 
  });
  const [addForm, setAddForm] = useState({ holder: '', name: '', sku: '', category: 'Senjata Api', customCategory: '', popor: '', serial: '', note: '' });
  const [opnameSession, setOpnameSession] = useState<{ active: boolean; expected: string[]; scanned: string[]; extra: string[]; out: string[]; } | null>(null);
  const [opnameScanInput, setOpnameScanInput] = useState("");
  const [users, setUsers] = useState<any[]>(() => {
    const stored = localStorage.getItem('ryo_users');
    if (stored) {
       const parsed = JSON.parse(stored);
       // Ensure RYO KUN exists in stored users
       if (!parsed.some((u: any) => u.username === 'RYO KUN')) {
           parsed.push({ username: 'RYO KUN', role: 'superadmin', password: '123' });
       }
       return parsed;
    }
    return [{ username: 'RYO KUN', role: 'superadmin', password: '123' }];
  });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem('ryo_users', JSON.stringify(users));
  }, [users]);

  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [autoLogout, setAutoLogout] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardListType, setDashboardListType] = useState<"Total" | "Tersedia" | "Keluar" | null>(null);
  
  const [telegramConfig, setTelegramConfig] = useState<{botToken: string, chatId: string}>(() => {
    const stored = localStorage.getItem('ryo_telegram');
    return stored ? JSON.parse(stored) : { botToken: '', chatId: '' };
  });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySort, setInventorySort] = useState<"newest" | "oldest">("newest");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("ALL");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryCategoryFilter, inventorySort]);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Edit / Info State
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
    const stored = localStorage.getItem('ryo_lite_mode');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('ryo_lite_mode', String(isLiteMode));
  }, [isLiteMode]);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const notifiedOverdueRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const overdueItems = inventory.filter(i => i.status === 'Keluar' && i.dueDate && Date.now() > i.dueDate);
    
    overdueItems.forEach(item => {
      if (!notifiedOverdueRef.current.has(item.id)) {
        new Notification("PERINGATAN GUDANG - OVERDUE", {
          body: `ASET: ${item.name} [${item.id}]\nBelum dikembalikan oleh: ${item.holder}`,
        });
        
        const tConfigStr = localStorage.getItem('ryo_telegram');
        const tConfig = tConfigStr ? JSON.parse(tConfigStr) : { botToken: "", chatId: "" };

        // Also send Telegram Notification
        fetch('/api/telegram/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `🚨 <b>PERINGATAN OVERDUE</b> 🚨\n\n📦 <b>Aset:</b> ${item.name}\n🔖 <b>ID:</b> <code>${item.id}</code>\n👤 <b>Peminjam:</b> ${item.holder}\n\n<i>Harap segera dikembalikan ke Gudang Senjata Batalyon B Pelopor.</i>`,
            botToken: tConfig.botToken,
            chatId: tConfig.chatId
          })
        }).catch(err => console.error("Gagal mengirim notif Telegram:", err));

        notifiedOverdueRef.current.add(item.id);
      }
    });
  }, [currentTime, inventory]);

  const chartData = React.useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric' });
      
      const startOfDay = new Date(d.setHours(0,0,0,0)).getTime();
      const endOfDay = new Date(d.setHours(23,59,59,999)).getTime();
      
      const dayLogs = logs.filter(l => l.timestamp >= startOfDay && l.timestamp <= endOfDay);
      const incoming = dayLogs.filter(l => l.status === 'Di Gudang').length;
      const outgoing = dayLogs.filter(l => l.status === 'Keluar').length;
      
      data.push({
        date: dateStr,
        In: incoming,
        Out: outgoing
      });
    }
    return data;
  }, [logs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeString = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false });
  };

  useEffect(() => {
    // Realtime Sync with Firestore
    const unsubscribeItems = onSnapshot(collection(db, "items"), (snapshot) => {
      const itemsData = snapshot.docs.map(doc => doc.data() as Item);
      // Sort by date inside
      setInventory(itemsData);
    }, (err) => {
      console.error("Firebase Items Error:", err);
    });

    const qLogs = query(collection(db, "logs"), orderBy("timestamp", "desc"));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = snapshot.docs.map(doc => doc.data() as Log);
      setLogs(logsData);
    }, (err) => {
      console.error("Firebase Logs Error:", err);
    });

    return () => {
      unsubscribeItems();
      unsubscribeLogs();
    };
  }, []);

  const saveState = async (newInv: Item[], newLogs: Log[]) => {
    // Optimistic UI update
    setInventory(newInv);
    setLogs(newLogs);
    // Deprecated localStorage items:
    // localStorage.setItem("ryo_inventory", JSON.stringify(newInv));
    // localStorage.setItem("ryo_logs", JSON.stringify(newLogs));
  };
  
  const speakAnnouncement = (item: Item, isOut: boolean) => {
    if ('speechSynthesis' in window) {
      const msg = new SpeechSynthesisUtterance();
      const poporText = item.popor && item.popor !== "-" ? item.popor : "kosong";
      const holderText = item.holder && item.holder !== "-" ? item.holder : "tidak diketahui";
      const actionText = isOut ? "telah keluar gudang" : "telah kembali ke gudang";
      msg.text = `${item.category || 'Aset'}, nomor popor ${poporText}, pemegang ${holderText}, ${actionText}.`;
      msg.lang = 'id-ID';
      
      // cancel previous speech if any
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    }
  };

  const handleScanCode = async (code: string) => {
    if (!code) return;
    const itemIndex = inventory.findIndex(i => i.id.toUpperCase() === code.toUpperCase());
    
    if (itemIndex >= 0) {
      const item = inventory[itemIndex];
      const isOut = item.status === "Di Gudang";
      
      const newHolder = isOut ? (holderInput || item.holder) : "-";
      
      const updatedItem: any = {
        ...item,
        status: isOut ? "Keluar" : "Di Gudang",
        holder: newHolder,
      };

      if (isOut) {
        updatedItem.outTimestamp = Date.now();
        updatedItem.dueDate = Date.now() + 12 * 3600000;
      } else {
        updatedItem.outTimestamp = null;
        updatedItem.dueDate = null;
      }
      
      const newLog: any = {
        id: item.id,
        name: item.name,
        status: isOut ? "Keluar" : "Di Gudang",
        type: "SCAN",
        holder: newHolder,
        time: new Date().toLocaleTimeString('id-ID'),
        fullDate: new Date().toLocaleDateString('id-ID'),
        operator: currentUser?.username || "SYSTEM",
        timestamp: Date.now()
      };
      if (sessionNameInput) {
        newLog.sessionName = sessionNameInput;
      }
      
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "items", item.id), updatedItem);
        batch.set(doc(collection(db, "logs")), newLog);
        await batch.commit();
        
        speakAnnouncement({ ...item, holder: newHolder }, isOut);
        
        if (!rapidScan) {
          alert(`[${isOut ? 'OUT' : 'IN'}] ${item.name} berhasil di-scan.`);
        }
      } catch (err) {
        console.error(err);
        alert("Gagal sinkronisasi data dengan server online!");
      }
    } else {
      alert("Barcode / SKU tidak ditemukan di sistem.");
    }
  };

  const handleAddItem = () => {
    if (!addForm.name || !addForm.sku) {
      alert("NAMA BARANG DAN KODE SKU WAJIB DIISI!");
      return;
    }
    if (inventory.find(i => i.id.toUpperCase() === addForm.sku.toUpperCase())) {
      alert(`KODE SKU [${addForm.sku}] SUDAH TERDAFTAR!`);
      return;
    }
    const category = addForm.category === 'CUSTOM' ? addForm.customCategory.toUpperCase() : addForm.category;
    const newItem: Item = {
      id: addForm.sku.toUpperCase(),
      name: addForm.name.toUpperCase(),
      category: category,
      serial: addForm.serial.toUpperCase() || '-',
      popor: addForm.popor.toUpperCase() || '-',
      holder: addForm.holder.toUpperCase() || '-',
      note: addForm.note.toUpperCase() || '-',
      status: "Di Gudang",
      date: new Date().toISOString().split('T')[0]
    };
    
    if (addForm.category === 'CUSTOM' && category && !appSettings.categories.includes(category)) {
      setAppSettings({...appSettings, categories: [...appSettings.categories, category]});
    }

    const newLog: Log = {
      id: newItem.id, name: newItem.name, status: "BARU", type: "ADD", holder: newItem.holder,
      time: new Date().toLocaleTimeString('id-ID'), fullDate: new Date().toLocaleDateString('id-ID'), operator: currentUser?.username || "SYSTEM", timestamp: Date.now()
    };
    
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "items", newItem.id), newItem);
      batch.set(doc(collection(db, "logs")), newLog);
      batch.commit();
      
      setAddForm({ holder: '', name: '', sku: '', category: appSettings.categories[0], customCategory: '', popor: '', serial: '', note: '' });
      alert("DATA ASET BERHASIL DISIMPAN ONLINE!");
    } catch (e) {
      console.error(e);
      alert("Gagal menyimpan data ke database server!");
    }
  };

  const startOpname = () => {
    const expected = inventory.filter(i => i.status === "Di Gudang").map(i => i.id);
    const outItems = inventory.filter(i => i.status === "Keluar").map(i => i.id);
    setOpnameSession({ active: true, expected, scanned: [], extra: [], out: outItems });
  };

  const handleOpnameScan = (code: string) => {
    if (!opnameSession) return;
    const c = code.toUpperCase();
    const updated = { ...opnameSession };
    if (updated.expected.includes(c)) {
      if (!updated.scanned.includes(c)) updated.scanned.push(c);
      else alert("Aset sudah discan.");
    } else if (updated.out.includes(c)) {
      alert("Perhatian, aset ini tercatat sedang dipinjam.");
    } else {
      if (!updated.extra.includes(c)) updated.extra.push(c);
      alert("Aset tidak dikenal.");
    }
    setOpnameSession(updated);
  };
  
  const handleExportExcel = () => {
    const toExport = inventory.filter(item => selectedItems.length === 0 || selectedItems.includes(item.id));
    const data = toExport.map(item => ({ 
      "SKU/Barcode": item.id, 
      "Nama Aset": item.name, 
      "Kategori": item.category, 
      "Nomor Seri": item.serial, 
      "Nomor Popor": item.popor || '-', 
      "Pemegang": item.holder, 
      "Status": item.status, 
      "Tanggal Registrasi": item.date, 
      "Keterangan": item.note 
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "DataAsetGudang"); XLSX.writeFile(wb, "Data_Aset_Batalyon.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let importedCount = 0;
        const operationsPerItem = 2; // insert + log
        const MAX_BATCH_OPERATIONS = 480;
        const MAX_ITEMS_PER_BATCH = Math.floor(MAX_BATCH_OPERATIONS / operationsPerItem);
        
        const chunks = [];
        for (let i = 0; i < data.length; i += MAX_ITEMS_PER_BATCH) {
           chunks.push(data.slice(i, i + MAX_ITEMS_PER_BATCH));
        }
        
        for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const row of chunk as any[]) {
                const skuRaw = row["SKU/Barcode"] || row["SKU"] || row["Barcode"];
                const nameRaw = row["Nama Aset"] || row["Nama"] || row["Nama Barang"];
                
                if (skuRaw === undefined || nameRaw === undefined) continue;
                
                const sku = String(skuRaw).trim().toUpperCase();
                const name = String(nameRaw).trim().toUpperCase();
                
                if (!sku || !name) continue;
                // Ignore duplicate inside current state
                if (inventory.find(item => item.id === sku)) continue;
                
                const category = String(row["Kategori"] || "Senjata Api").toUpperCase();
                const serial = String(row["Nomor Seri"] || row["Serial"] || "-").toUpperCase();
                const popor = String(row["Nomor Popor"] || row["Popor"] || "-").toUpperCase();
                const holder = String(row["Pemegang"] || "-").toUpperCase();
                const statusRaw = String(row["Status"] || "Di Gudang");
                const note = String(row["Keterangan"] || row["Catatan"] || "-").toUpperCase();
                
                const newItem: Item = {
                  id: sku,
                  name: name,
                  category: category,
                  serial: serial,
                  popor: popor,
                  holder: holder,
                  note: note,
                  status: statusRaw === "Di Gudang" || statusRaw === "Keluar" ? statusRaw : "Di Gudang",
                  date: new Date().toISOString().split('T')[0]
                };
                
                batch.set(doc(db, "items", newItem.id), newItem);
                
                const newLog: Log = {
                  id: newItem.id,
                  name: newItem.name,
                  status: newItem.status,
                  type: "ADD",
                  holder: newItem.holder,
                  time: new Date().toLocaleTimeString('id-ID'),
                  fullDate: new Date().toLocaleDateString('id-ID'),
                  operator: "SYSTEM IMPORT",
                  timestamp: Date.now() + importedCount
                };
                batch.set(doc(collection(db, "logs")), newLog);
                
                importedCount++;
            }
            await batch.commit();
        }
        
        alert(`Berhasil mengimpor ${importedCount} aset dari Excel!`);
      } catch (err) {
        console.error(err);
        alert("Gagal mengimpor data Excel.");
      }
      
      if (excelInputRef.current) {
        excelInputRef.current.value = "";
      }
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveEdit = async () => {
     if (!editingItem) return;
     try {
       await setDoc(doc(db, "items", editingItem.id), editingItem);
       setEditingItem(null);
       alert("Perubahan berhasil disimpan.");
     } catch (err) {
       console.error(err);
       alert("Gagal menyimpan perubahan.");
     }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;
    const isConfirmed = confirm(`Apakah Anda yakin ingin menghapus ${selectedItems.length} aset secara PERMANEN?`);
    if (!isConfirmed) {
       return;
    }
    
    try {
      // Create chunks to avoid Firestore 500 writes limit (deleting 1 item = 2 operations: delete + log)
      const operationsPerItem = 2;
      const MAX_BATCH_OPERATIONS = 480;
      const MAX_ITEMS_PER_BATCH = Math.floor(MAX_BATCH_OPERATIONS / operationsPerItem);
      
      const itemChunks: string[][] = [];
      for (let i = 0; i < selectedItems.length; i += MAX_ITEMS_PER_BATCH) {
         itemChunks.push(selectedItems.slice(i, i + MAX_ITEMS_PER_BATCH));
      }
      
      for (const chunk of itemChunks) {
         const batch = writeBatch(db);
         for (const id of chunk) {
            batch.delete(doc(db, "items", id));
            const newLog: Log = {
              id: id,
              name: "ASET " + id,
              status: "DIHAPUS",
              type: "DELETE",
              holder: "SYSTEM",
              time: new Date().toLocaleTimeString('id-ID'),
              fullDate: new Date().toLocaleDateString('id-ID'),
              operator: currentUser?.username || "SYSTEM",
              timestamp: Date.now()
            };
            batch.set(doc(collection(db, "logs")), newLog);
         }
         await batch.commit();
      }
      
      setSelectedItems([]);
      alert("Aset berhasil dihapus.");
    } catch(err) {
      console.error(err);
      alert("Gagal menghapus aset.");
    }
  };

  const handleDeleteAll = async () => {
    const isConfirmed = confirm("BAHAYA: Apakah Anda yakin ingin menghapus SEMUA ASET (" + inventory.length + ") secara PERMANEN?");
    if (!isConfirmed) return;
    
    try {
      const operationsPerItem = 1;
      const MAX_BATCH_OPERATIONS = 480;
      const MAX_ITEMS_PER_BATCH = Math.floor(MAX_BATCH_OPERATIONS / operationsPerItem);
      
      const itemChunks: Item[][] = [];
      for (let i = 0; i < inventory.length; i += MAX_ITEMS_PER_BATCH) {
         itemChunks.push(inventory.slice(i, i + MAX_ITEMS_PER_BATCH));
      }
      
      for (const chunk of itemChunks) {
         const batch = writeBatch(db);
         for (const item of chunk) {
            batch.delete(doc(db, "items", item.id));
         }
         await batch.commit();
      }
      
      setSelectedItems([]);
      alert("Semua aset berhasil dihapus.");
    } catch(err) {
      console.error(err);
      alert("Terjadi kesalahan saat menghapus semua aset");
    }
  };

  const handleIndividualDelete = async (id: string) => {
     const isConfirmed = confirm(`Apakah Anda yakin ingin menghapus aset ${id} secara PERMANEN?`);
     if (!isConfirmed) {
       return;
     }

     try {
       const batch = writeBatch(db);
       batch.delete(doc(db, "items", id));
       
       const newLog: Log = {
          id: id,
          name: "ASET " + id,
          status: "DIHAPUS",
          type: "DELETE",
          holder: "SYSTEM",
          time: new Date().toLocaleTimeString('id-ID'),
          fullDate: new Date().toLocaleDateString('id-ID'),
          operator: currentUser?.username || "SYSTEM",
          timestamp: Date.now()
       };
       batch.set(doc(collection(db, "logs")), newLog);

       await batch.commit();
       setSelectedItems(selectedItems.filter(item => item !== id));
       alert("Aset berhasil dihapus.");
     } catch (err) {
       console.error(err);
       alert("Gagal menghapus aset.");
     }
  };

  const handleBackupDB = () => {
    const backupData = {
      inventory,
      logs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_gudang_" + new Date().toISOString() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleRestoreDB = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        if (data.inventory && data.logs) {
          setInventory(data.inventory);
          setLogs(data.logs);
          
          alert('Mempersiapkan sinkronisasi database online, harap tunggu sebentar...');
          
          const uploadToFirestore = async () => {
            try {
              for (const item of data.inventory as Item[]) {
                await setDoc(doc(db, "items", item.id), item);
              }
              for (const log of data.logs as Log[]) {
                await setDoc(doc(collection(db, "logs")), log);
              }
              alert('Sinkronisasi cloud Firebase berhasil 100%!');
            } catch (err) {
              console.error(err);
              alert('Beberapa entri mungkin gagal tersinkron ke cloud.');
            }
          };
          uploadToFirestore();
        } else {
          alert('Format file backup tidak valid!');
        }
      } catch (error) {
        alert('Gagal memproses file backup!');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerRestore = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSyncCloud = async () => {
    setShowDriveModal(true);
    if (googleUser) {
        setIsDriveSyncing(true);
        try {
            const files = await listBackupFilesInDrive();
            setDriveBackups(files);
        } catch (err: any) {
            console.error(err);
            alert("Gagal load history dari Google Drive.");
        } finally {
            setIsDriveSyncing(false);
        }
    }
  };

  const executeGoogleLogin = async () => {
      try {
          const res = await googleSignIn();
          if (res) {
              setGoogleUser(res.user);
              setIsDriveSyncing(true);
              const files = await listBackupFilesInDrive();
              setDriveBackups(files);
              setIsDriveSyncing(false);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleBackupToDrive = async () => {
      if (!confirm("Apakah Anda yakin ingin melakukan sinkronisasi pencadangan ke Google Drive Anda?")) return;
      setIsDriveSyncing(true);
      try {
          const backupData = { inventory, logs };
          await backupToDrive(backupData, "backup_gudang_" + new Date().toISOString() + ".json");
          const files = await listBackupFilesInDrive();
          setDriveBackups(files);
          alert("Backup berhasil disimpan ke Google Drive!");
      } catch (err: any) {
          console.error(err);
          alert("Gagal upload backup ke Google Drive");
      } finally {
          setIsDriveSyncing(false);
      }
  };

  const handleRestoreFromDrive = async (fileId: string, fileName: string) => {
      if (!confirm(`Warning!! 

Apakah Anda yakin ingin me-restore dari data: ${fileName}? 
Seluruh data saat ini akan TERTUMPUK dan DIGANTIKAN!!`)) return;
      
      setIsDriveSyncing(true);
      try {
          const data = await restoreFromDrive(fileId);
          if (data.inventory && data.logs) {
              setInventory(data.inventory);
              setLogs(data.logs);
              
              const batch = writeBatch(db);
              
              const itemsRef = collection(db, "items");
              data.inventory.forEach((item: any) => {
                batch.set(doc(itemsRef, item.id), item);
              });
              
              const logsRef = collection(db, "logs");
              data.logs.forEach((log: any) => {
                batch.set(doc(logsRef), log);
              });

              await batch.commit();

              alert("Restore dari Google Drive berhasil! Sistem telah disinkronkan.");
              setShowDriveModal(false);
          } else {
              alert("Data JSON dalam file tidak valid.");
          }
      } catch (err: any) {
          console.error(err);
          alert("Google Drive Download Failed.");
      } finally {
          setIsDriveSyncing(false);
      }
  };

  const handleSetupBot = () => {
    setActiveTab('profile');
  };

  const handleSetAlarm = (id: string) => {
    const itemIndex = inventory.findIndex(i => i.id === id);
    if (itemIndex >= 0) {
      const item = inventory[itemIndex];
      if (item.status !== "Keluar") {
        alert("Alarm hanya dapat diatur untuk aset yang sedang keluar.");
        return;
      }
      const hourInput = prompt(`Atur alarm overdue untuk ${item.name}. Masukkan jumlah jam (contoh: 2 untuk 2 jam, 24 untuk 1 hari):`);
      if (hourInput && !isNaN(Number(hourInput))) {
        const hours = Number(hourInput);
        const due = Date.now() + hours * 3600000;
        const updatedItem = { ...item, dueDate: due };
        setDoc(doc(db, "items", item.id), updatedItem)
          .then(() => alert(`Alarm diatur untuk ${hours} jam dari sekarang.`))
          .catch(e => { console.error(e); alert("Gagal menyimpan alarm ke cloud!"); });
      }
    }
  };

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (cameraActive) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scanner.render(
        (decodedText) => {
          handleScanCode(decodedText);
          setCameraActive(false);
        },
        (error) => {
          // ignore error to keep scanning
        }
      );
    }
    return () => {
      if (scanner) {
        scanner.clear().catch((error) => console.error("Failed to clear scanner", error));
      }
    };
  }, [cameraActive]);

  if (!isAuthenticated || !currentUser) {
    return <AuthScreen users={users} onSuccess={(user) => { setCurrentUser(user); setIsAuthenticated(true); }} />;
  }

  return (
    <div className={`h-screen flex flex-col md:flex-row overflow-hidden relative ${isLiteMode ? 'bg-[#020617]' : 'bg-radar'} print:bg-white print:block print:h-auto print:overflow-visible`}>
      {/* Print View Layer */}
      {printContext && (
        <div className="fixed inset-0 overflow-y-auto w-full min-h-screen text-black bg-white z-[99999] print:static print:min-h-0 print:block">
            <style>{`@media print { @page { size: A4; margin: 5mm; } body { background: white !important; -webkit-print-color-adjust: exact; color-adjust: exact; } }`}</style>
            
            {/* Header for all prints */}
            {printContext.type !== 'inventory-selection' && (
                <div className="border-b-2 border-black pb-4 mb-6 flex items-center justify-between p-4 print:p-0">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">Sistem Gudang Senjata</h1>
                        <p className="text-sm font-bold mt-1">BATALYON B PELOPOR - DOKUMEN RESMI</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-mono">TANGGAL CETAK</p>
                        <p className="text-sm font-bold">{new Date().toLocaleString('id-ID')}</p>
                        <p className="text-xs mt-1 font-mono tracking-widest">{printContext.type}</p>
                    </div>
                </div>
            )}

            {/* Print Type: Selection Barcodes */}
            {printContext.type === 'inventory-selection' && (
                <div className="grid grid-cols-4 gap-2 p-2 print:p-0">
                    {inventory.filter(i => printContext.ids.includes(i.id)).map(item => (
                        <div key={item.id} className="border border-black p-2 flex flex-col justify-center items-center break-inside-avoid text-center">
                            <Barcode value={item.id} width={1.6} height={40} fontSize={11} textPosition="bottom" margin={0} background="#ffffff" lineColor="#000000" displayValue={true} />
                        </div>
                    ))}
                </div>
            )}

            {/* Print Type: Logs History */}
            {printContext.type.startsWith('logs-') && (
                <div>
                   <h2 className="text-base font-black uppercase mb-4 py-2 border-b-2 border-black border-dotted">
                     LAPORAN MUTASI ASET - {
                        printContext.type === 'logs-today' ? "HARI INI (" + new Date().toLocaleDateString('id-ID') + ")" :
                        "KEMARIN (" + (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toLocaleDateString('id-ID'); })() + ")"
                     }
                   </h2>
                   <table className="w-full text-left text-[10px] sm:text-xs">
                     <thead className="border-b-2 border-black font-black">
                       <tr>
                         <th className="py-3 px-2">WAKTU</th>
                         <th className="py-3 px-2">TIPE MUTASI</th>
                         <th className="py-3 px-2">BARCODE / SKU</th>
                         <th className="py-3 px-2">NAMA ASET</th>
                         <th className="py-3 px-2">STATUS</th>
                         <th className="py-3 px-2">KETERANGAN / PEMEGANG</th>
                         <th className="py-3 px-2">OPERATOR</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-black/20 font-mono font-medium">
                       {logs.filter(l => {
                            if (printContext.type === 'logs-today') return l.fullDate === new Date().toLocaleDateString('id-ID');
                            const y = new Date(); y.setDate(y.getDate() - 1);
                            return l.fullDate === y.toLocaleDateString('id-ID');
                       }).map(log => (
                         <tr key={log.timestamp} className="break-inside-avoid">
                           <td className="py-3 px-2 whitespace-nowrap">{log.time}</td>
                           <td className="py-3 px-2">
                              {log.type === 'IN' && <span className="font-black border border-black px-1 py-0.5 bg-gray-100">MASUK (IN)</span>}
                              {log.type === 'OUT' && <span className="font-black border border-black px-1 py-0.5 bg-gray-100 border-dashed">KELUAR (OUT)</span>}
                              {log.type === 'ADD' && <span className="font-black">REGISTRASI (ADD)</span>}
                              {log.type === 'DELETE' && <span className="font-black line-through">HAPUS (DEL)</span>}
                           </td>
                           <td className="py-3 px-2">{log.id}</td>
                           <td className="py-3 px-2 font-black">{log.name}</td>
                           <td className="py-3 px-2 uppercase">{log.status}</td>
                           <td className="py-3 px-2 truncate max-w-[200px]">{log.holder || '-'}</td>
                           <td className="py-3 px-2">{log.operator}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                   {logs.filter(l => {
                            if (printContext.type === 'logs-today') return l.fullDate === new Date().toLocaleDateString('id-ID');
                            const y = new Date(); y.setDate(y.getDate() - 1);
                            return l.fullDate === y.toLocaleDateString('id-ID');
                       }).length === 0 && (
                           <div className="text-center py-10 font-bold border-b border-black">
                               TIDAK ADA DATA LOG UNTUK PERIODE INI.
                           </div>
                       )}
                   
                   <div className="mt-16 flex justify-end">
                       <div className="text-center w-48">
                           <p className="text-xs font-bold mb-16">Pengesahan / Mengetahui</p>
                           <p className="border-t border-black pt-1 font-bold">KEPALA GUDANG</p>
                       </div>
                   </div>
                </div>
            )}
        </div>
      )}

      {!isLiteMode && <div className="noise-overlay print:hidden"></div>}
      
      {/* Mobile Header */}
      <header className="glass-effect md:hidden p-4 flex justify-between items-center shrink-0 w-full fixed top-0 z-[200] print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center cyber-cut relative">
            <ShieldCheck className="text-white w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#020617] animate-pulse"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[12px] font-black text-white italic tracking-tighter uppercase leading-tight">
              SISTEM GUDANG SENJATA <span className="text-[8px] font-medium text-slate-400 not-italic block normal-case tracking-normal">Developed by Ryo Kun</span>
            </h1>
            <span className={`flex items-center gap-1 text-[8px] font-bold tracking-widest uppercase mt-1 ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {isOnline ? 'DATABASE TERHUBUNG' : 'OFFLINE • SINKRONISASI TERTUNDA'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-slate-400 hover:text-white bg-slate-900 p-2 rounded-lg border border-slate-800"
        >
          {isMobileMenuOpen ? <X size={20} /> : <div className="space-y-1"><div className="w-4 h-0.5 bg-current"></div><div className="w-4 h-0.5 bg-current"></div><div className="w-4 h-0.5 bg-current"></div></div>}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-[250] backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`glass-effect print:hidden fixed md:relative top-0 bottom-0 left-0 w-[280px] md:w-80 border-r border-slate-800/60 bg-[#020617] md:bg-transparent flex flex-col shrink-0 z-[300] transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 md:p-8 text-center border-b border-slate-900/50 shrink-0 mt-16 md:mt-0 relative">
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-500 hover:text-white bg-slate-900 p-2 rounded-lg border border-slate-800 btn-interact">
                <X size={16} />
            </button>
            <div className="inline-flex p-3 bg-emerald-600 rounded-2xl mb-4 cyber-cut">
              <ShieldCheck className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
            <h1 className="text-lg md:text-xl font-black text-white italic tracking-tighter leading-tight">
              SISTEM GUDANG SENJATA<br/><span className="uppercase">BATALYON B PELOPOR</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">Developed by Ryo Kun</p>
        </div>
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'dashboard' ? 'bg-slate-800/50 text-white' : ''}`}>
            <LayoutDashboard size={20} /><span className="font-bold text-sm">Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('scanner'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'scanner' ? 'bg-slate-800/50 text-white' : ''}`}>
            <ScanIcon size={20} /><span className="font-bold text-sm">Scanner</span>
          </button>
          <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'inventory' ? 'bg-slate-800/50 text-white' : ''}`}>
            <Package size={20} /><span className="font-bold text-sm">Inventaris</span>
          </button>
          <button onClick={() => { setActiveTab('add'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'add' ? 'bg-slate-800/50 text-white' : ''}`}>
            <PlusSquare size={20} /><span className="font-bold text-sm">Registrasi Baru</span>
          </button>
          <button onClick={() => { setActiveTab('opname'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'opname' ? 'bg-slate-800/50 text-white' : ''}`}>
            <ClipboardCheck size={20} /><span className="font-bold text-sm">Stock Opname</span>
          </button>
          <button onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'leaderboard' ? 'bg-slate-800/50 text-white' : ''}`}>
            <LayoutDashboard size={20} /><span className="font-bold text-sm">Papan Kinerja</span>
          </button>
          <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'users' ? 'bg-slate-800/50 text-white' : ''}`}>
            <Settings size={20} /><span className="font-bold text-sm">Manajemen Akses</span>
          </button>
          <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className={`sidebar-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-400 hover:bg-slate-800/50 ${activeTab === 'profile' ? 'bg-slate-800/50 text-white' : ''}`}>
            <Fingerprint size={20} /><span className="font-bold text-sm">Profil Admin</span>
          </button>
        </nav>
        <div className="p-6 border-t border-slate-900/50 shrink-0">
            <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-emerald-500 cyber-cut">{currentUser?.username?.charAt(0) || "R"}</div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-white uppercase truncate max-w-[90px]">{currentUser?.username || "GUEST"}</p>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{currentUser?.role || "Operator"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={() => { alert('Sesi 2 jam diakhiri manual. Logout berhasil.'); setAutoLogout(false); }} 
                      className="text-slate-400 hover:text-red-500 bg-slate-900 p-2 rounded-xl border border-slate-800 transition-colors"
                      title="Logout Manual"
                    >
                      <LogOut size={16} />
                    </button>
                </div>
            </div>
            <div className="mt-4 bg-[#020617] border border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <div className="text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Auto Logout 2 Jam</p>
                <p className={`text-[11px] font-mono font-bold mt-0.5 ${autoLogout ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {autoLogout ? 'AKTIF' : 'NONAKTIF'}
                </p>
              </div>
              <button 
                onClick={() => setAutoLogout(!autoLogout)} 
                className={`btn-interact text-[9px] ${autoLogout ? 'bg-emerald-950/40 text-emerald-500 hover:text-white border-emerald-900/50' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'} px-3 py-1.5 rounded-lg border font-bold uppercase tracking-widest transition-colors`}
              >
                {autoLogout ? 'OFF-KAN' : 'ON-KAN'}
              </button>
            </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden print:hidden">
        
        {/* Persistent Tactical Status Bar */}
        <div className="flex-none p-3 px-6 border-b border-slate-800/80 bg-[#020617]/90 backdrop-blur-md z-40 flex justify-between items-center hidden md:flex mt-16 md:mt-0">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Status:</span>
              <span className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${isOnline ? 'bg-emerald-950/40 text-emerald-500 border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-red-950/40 text-red-500 border-red-900/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <Database size={12} />
                {isOnline ? 'DATABASE TERHUBUNG' : 'DATABASE OFFLINE (MENYIMPAN LOKAL)'}
              </span>
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
                  <Clock size={12} className="text-emerald-500" />
                  <span className="text-[12px] font-mono font-bold text-emerald-400">{formatTimeString(currentTime)}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-12 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
        {activeTab === 'dashboard' && (
           <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in">
             {/* Status Banner */}
             {(() => {
                const outItems = inventory.filter(i => i.status === 'Keluar');
                const overdueItems = outItems.filter(i => i.dueDate && Date.now() > i.dueDate);
                const borrowedItems = outItems.filter(i => !i.dueDate || Date.now() <= i.dueDate);

                if (overdueItems.length > 0 || borrowedItems.length > 0) {
                  return (
                    <div className="space-y-4">
                      {overdueItems.length > 0 && (
                        <div className="bg-red-950/40 border border-red-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                           <div className="flex items-start gap-4">
                               <div className="p-3 bg-red-950/60 border border-red-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                                  <AlertTriangle size={28} className="text-red-500" />
                               </div>
                               <div>
                                 <h3 className="text-red-500 font-black uppercase tracking-widest text-sm md:text-base">PERINGATAN ALARM: ASET OVERDUE!</h3>
                                 <p className="text-red-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                                   TERDAPAT {overdueItems.length} ASET YANG BELUM DIKEMBALIKAN MELEWATI BATAS WAKTU ALARM.
                                 </p>
                               </div>
                           </div>
                           <div className="mt-4 bg-[#020617]/50 rounded-xl border border-red-900/40 p-4">
                              <p className="text-[10px] font-black text-red-500 mb-2 uppercase tracking-widest border-b border-red-900/30 pb-2">Daftar Aset Overdue:</p>
                              <ul className="space-y-2">
                                {overdueItems.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-center text-xs font-mono">
                                    <span className="text-red-400 font-bold uppercase">{item.name} <span className="text-red-900 ml-2">[{item.id}]</span></span>
                                    <span className="text-orange-500 font-bold">Dipinjam: {item.holder}</span>
                                  </li>
                                ))}
                              </ul>
                           </div>
                        </div>
                      )}
                      
                      {borrowedItems.length > 0 && (
                        <div className="bg-orange-950/40 border border-orange-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                           <div className="flex items-start gap-4">
                               <div className="p-3 bg-orange-950/60 border border-orange-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                                  <AlertTriangle size={28} className="text-orange-500" />
                               </div>
                               <div>
                                 <h3 className="text-orange-500 font-black uppercase tracking-widest text-sm md:text-base">PEMBERITAHUAN: ASET SEDANG DI LUAR GUDANG</h3>
                                 <p className="text-orange-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                                   TERDAPAT {borrowedItems.length} ASET YANG SEDANG DIPINJAM ATAU DI LUAR GUDANG SAAT INI.
                                 </p>
                               </div>
                           </div>
                           <div className="mt-4 bg-[#020617]/50 rounded-xl border border-orange-900/40 p-4">
                              <p className="text-[10px] font-black text-orange-500 mb-2 uppercase tracking-widest border-b border-orange-900/30 pb-2">Daftar Aset Keluar (Dipinjam):</p>
                              <ul className="space-y-2">
                                {borrowedItems.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-center text-xs font-mono">
                                    <span className="text-orange-400 font-bold uppercase">{item.name} <span className="text-orange-900 ml-2">[{item.id}]</span></span>
                                    <span className="text-orange-300 font-bold uppercase">PEMEGANG: {item.holder}</span>
                                  </li>
                                ))}
                              </ul>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="bg-[#020617]/60 border border-slate-700/50 p-6 md:p-8 rounded-[30px] flex items-start gap-4 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                     <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                        <ShieldCheck size={28} className="text-emerald-500" />
                     </div>
                     <div>
                       <h3 className="text-emerald-500 font-black uppercase tracking-widest text-sm md:text-base">KONDISI GUDANG TERKENDALI</h3>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                         SELURUH ASET TERDAFTAR SAAT INI BERADA DI DALAM PENYIMPANAN ATAU DALAM KEADAAN AMAN.
                       </p>
                     </div>
                  </div>
                );
             })()}
             
             <div className="flex justify-between items-start">
               <div className="flex flex-col">
                  <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-tight relative">
                    <span className="text-emerald-500/30 text-4xl mr-2 absolute -left-6 top-0 md:top-2">[</span>
                    STATUS GUDANG<br/>SENJATA
                    <span className="text-emerald-500/30 text-4xl ml-2 absolute -right-6 bottom-0 md:-bottom-2">]</span>
                  </h2>
                  <p className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-widest mt-2">SISTEM KENDALI INVENTARIS TAKTIS</p>
               </div>
               
               {/* Top Right Badges & Bell */}
               <div className="hidden md:flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4 border border-slate-800 rounded-full px-3 py-1 bg-slate-900/50 relative">
                     <span className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-300">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                       ONLINE
                     </span>
                     <span className="w-[1px] h-3 bg-slate-700"></span>
                     <span className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-300">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                       DB SYNCED
                     </span>
                     {/* Decorative corners */}
                     <span className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-emerald-500/50"></span>
                     <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-emerald-500/50"></span>
                  </div>
                  <button className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-slate-800 block"></span>
                  </button>
               </div>
             </div>

             {/* Functional Buttons Grid */}
             <div className="flex flex-wrap gap-3 mt-6">
                 <button onClick={() => setActiveTab('scanner')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-900/60 text-emerald-400 rounded-lg cyber-cut transition-colors shadow-lg shadow-emerald-900/20">
                     <ScanIcon size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">SCAN<br/>MUTASI</span>
                 </button>
                 <button onClick={() => setActiveTab('inventory')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-blue-900/30 hover:bg-blue-800/40 border border-blue-900/50 text-blue-500 rounded-lg cyber-cut transition-colors">
                     <Package size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">DATA<br/>ASET</span>
                 </button>
                 <button onClick={() => setActiveTab('add')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 text-slate-300 rounded-lg cyber-cut transition-colors">
                     <PlusSquare size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">BARANG<br/>BARU</span>
                 </button>
                 <button onClick={handleExportExcel} className="flex flex-col items-center justify-center w-[100px] h-20 bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-900/50 text-emerald-500 rounded-lg cyber-cut transition-colors">
                     <Download size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">EXPORT</span>
                 </button>
                 <button onClick={() => excelInputRef.current?.click()} className="flex flex-col items-center justify-center w-[100px] h-20 bg-orange-900/30 hover:bg-orange-800/40 border border-orange-900/50 text-orange-500 rounded-lg cyber-cut transition-colors">
                     <Upload size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">IMPORT</span>
                 </button>
                 <button onClick={handleBackupDB} className="flex flex-col items-center justify-center w-[100px] h-20 bg-purple-900/30 hover:bg-purple-800/40 border border-purple-900/50 text-purple-500 rounded-lg cyber-cut transition-colors">
                     <Database size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">BACKUP<br/>DB</span>
                 </button>
                 <button onClick={triggerRestore} className="flex flex-col items-center justify-center w-[100px] h-20 bg-pink-900/30 hover:bg-pink-800/40 border border-pink-900/50 text-pink-500 rounded-lg cyber-cut transition-colors">
                     <RefreshCw size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">RESTORE<br/>DB</span>
                 </button>
                 <button onClick={handleSyncCloud} className="flex flex-col items-center justify-center w-[100px] h-20 bg-cyan-900/30 hover:bg-cyan-800/40 border border-cyan-900/50 text-cyan-500 rounded-lg cyber-cut transition-colors">
                     <Cloud size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">SYNC<br/>CLOUD</span>
                 </button>
                 <button onClick={handleSetupBot} className="flex flex-col items-center justify-center w-[100px] h-20 bg-fuchsia-900/30 hover:bg-fuchsia-800/40 border border-fuchsia-900/50 text-fuchsia-500 rounded-lg cyber-cut transition-colors">
                     <MessageSquare size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">SETUP<br/>BOT</span>
                 </button>
                 <input type="file" ref={fileInputRef} onChange={handleRestoreDB} accept=".json" className="hidden" />
             </div>

             {/* Core Metrics Grid */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
                 {/* Card 1 */}
                 <div className={`relative w-full transition-all ${dashboardListType === 'Total' ? 'z-50' : 'z-10 hover:z-40'}`}>
                     <div 
                         onClick={() => setDashboardListType(dashboardListType === 'Total' ? null : 'Total')}
                         className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-700 hover:border-slate-500 transition-colors shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                     >
                        <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-slate-600"></span>
                        <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-slate-600"></span>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Aset<br/>Terdaftar</p>
                        <p className="text-6xl font-black text-white mt-4">{inventory.length}</p>
                     </div>
                     {dashboardListType === 'Total' && (
                         <div className="absolute top-full left-0 right-0 mt-4 bg-[#020617] border border-slate-700 rounded-[30px] p-6 shadow-2xl shadow-black/80 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                             <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Total Aset</span>
                                <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-slate-500 hover:text-white bg-slate-900 p-1.5 rounded-lg border border-slate-800"><X size={14}/></button>
                             </div>
                             <ul className="space-y-2">
                                {inventory.length === 0 && <li className="text-xs text-slate-500 italic text-center py-4">Kosong</li>}
                                {inventory.map((item, idx) => (
                                   <li key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors">
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold text-white uppercase">{item.name}</span>
                                         <span className="text-[9px] font-mono text-slate-500">{item.id}</span>
                                      </div>
                                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded bg-slate-800 ${item.status === 'Di Gudang' ? 'text-emerald-500' : 'text-orange-500'}`}>{item.status}</span>
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
                         className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-700 hover:border-emerald-500/50 transition-colors shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                     >
                        <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-emerald-600"></span>
                        <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-emerald-600"></span>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aset Tersedia<br/>(Di Gudang)</p>
                        <p className="text-6xl font-black text-emerald-500 mt-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{inventory.filter(i => i.status === "Di Gudang").length}</p>
                     </div>
                     {dashboardListType === 'Tersedia' && (
                         <div className="absolute top-full left-0 right-0 mt-4 bg-[#020617] border border-emerald-900/50 rounded-[30px] p-6 shadow-2xl shadow-emerald-900/20 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                             <div className="flex justify-between items-center mb-4 border-b border-emerald-900/30 pb-3">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Detail Aset Tersedia</span>
                                <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-emerald-600 hover:text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/50"><X size={14}/></button>
                             </div>
                             <ul className="space-y-2">
                                {inventory.filter(i => i.status === "Di Gudang").length === 0 && <li className="text-xs text-slate-500 italic text-center py-4">Kosong</li>}
                                {inventory.filter(i => i.status === "Di Gudang").map((item, idx) => (
                                   <li key={idx} className="flex justify-between items-center bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30 hover:border-emerald-700/50 transition-colors">
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold text-white uppercase">{item.name}</span>
                                         <span className="text-[9px] font-mono text-slate-500">{item.id}</span>
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
                         className="bg-[#1e293b]/50 backdrop-blur p-8 rounded-[40px] border border-slate-700 hover:border-orange-500/50 transition-colors shadow-2xl relative overflow-hidden group cursor-pointer h-full"
                     >
                        <span className="absolute top-4 left-4 w-3 h-3 border-t border-l border-orange-600"></span>
                        <span className="absolute bottom-4 right-4 w-3 h-3 border-b border-r border-orange-600"></span>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aset Dipinjamkan<br/>(Keluar)</p>
                        <p className="text-6xl font-black text-orange-400 mt-4 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]">{inventory.filter(i => i.status === "Keluar").length}</p>
                     </div>
                     {dashboardListType === 'Keluar' && (
                         <div className="absolute top-full left-0 right-0 mt-4 bg-[#020617] border border-orange-900/50 rounded-[30px] p-6 shadow-2xl shadow-orange-900/20 max-h-[300px] overflow-y-auto z-50 animate-in slide-in-from-top-4">
                             <div className="flex justify-between items-center mb-4 border-b border-orange-900/30 pb-3">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Detail Aset Dipinjamkan</span>
                                <button onClick={(e) => { e.stopPropagation(); setDashboardListType(null); }} className="text-orange-600 hover:text-orange-400 bg-orange-950/40 p-1.5 rounded-lg border border-orange-900/50"><X size={14}/></button>
                             </div>
                             <ul className="space-y-2">
                                {inventory.filter(i => i.status === "Keluar").length === 0 && <li className="text-xs text-slate-500 italic text-center py-4">Kosong</li>}
                                {inventory.filter(i => i.status === "Keluar").map((item, idx) => (
                                   <li key={idx} className="flex justify-between items-center bg-orange-950/20 p-3 rounded-xl border border-orange-900/30 hover:border-orange-700/50 transition-colors">
                                      <div className="flex flex-col">
                                         <span className="text-xs font-bold text-white uppercase">{item.name}</span>
                                         <span className="text-[9px] font-mono text-orange-400">PEMEGANG: {item.holder}</span>
                                      </div>
                                      <span className="text-[9px] font-black uppercase text-orange-500">KELUAR</span>
                                   </li>
                                ))}
                             </ul>
                         </div>
                     )}
                 </div>
             </div>

             {/* Charts Area */}
             <div className="space-y-6">
                {/* Area Chart Placeholder */}
                <div className="bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-700 relative cyber-mesh-bg w-full min-h-[300px]">
                   <span className="absolute top-3 left-3 w-3 h-3 border-t border-l border-slate-600"></span>
                   <span className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-slate-600"></span>
                   
                   <h3 className="text-sm font-black text-white uppercase flex items-center gap-2 mb-8">
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

                {/* Pie Chart Placeholder */}
                <div className="bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-700 relative w-full min-h-[300px]">
                   <span className="absolute top-3 left-3 w-3 h-3 border-t border-l border-orange-600"></span>
                   <span className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-orange-600"></span>
                   
                   <h3 className="text-sm font-black text-white uppercase flex items-center gap-2 mb-8">
                     <PieChart size={16} className="text-orange-500" /> ASET PALING SERING DIPINJAM
                   </h3>

                   <div className="flex flex-col items-center">
                      <div className="relative w-48 h-48 rounded-full border-[20px] border-orange-500 border-l-blue-500 border-t-emerald-500 border-r-purple-500">
                        {/* CSS-only simple blocky pie representation */}
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-8 flex flex-wrap justify-center gap-4 text-[8px] text-slate-400 uppercase tracking-widest max-w-sm">
                         <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 inline-block"></span> SIG SAUER MPX</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 inline-block"></span> AK 101</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 inline-block"></span> SIG SAUER 716 SNIPER</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-500 inline-block"></span> STEYR SSG 08 SNIPER</span>
                      </div>
                   </div>
                </div>

                {/* Audit Logs */}
                <div className="bg-[#1e293b]/50 backdrop-blur p-6 rounded-[30px] border border-slate-700 relative w-full mt-6 flex flex-col items-stretch overflow-hidden">
                   <h3 className="text-sm font-black text-white italic uppercase tracking-widest mb-4 flex items-center gap-2">
                     <History size={16} className="text-blue-500" /> <span className="text-slate-500 mr-1">[</span>LOG AUDIT AKTIFITAS (1 BULAN)<span className="text-slate-500 ml-1">]</span>
                   </h3>
                   <div className="overflow-auto max-h-[350px] border border-slate-800 rounded-xl bg-[#020617] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                      <table className="w-full text-left min-w-[800px]">
                         <thead className="bg-[#020617] sticky top-0 z-10 shadow-md">
                           <tr>
                             <th className="p-4 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">WAKTU</th>
                             <th className="p-4 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800 whitespace-nowrap">TIPE</th>
                             <th className="p-4 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800 w-1/2">ASET</th>
                             <th className="p-4 text-[10px] font-black uppercase text-slate-500 border-b border-slate-800">OPERATOR</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800/50">
                           {logs.filter(l => Date.now() - l.timestamp <= 30 * 24 * 60 * 60 * 1000).map((log, idx) => (
                             <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                               <td className="p-4 whitespace-nowrap">
                                  <p className="text-xs font-mono text-slate-300">{log.fullDate}</p>
                                  <p className="text-[10px] font-mono text-slate-500 mt-1">{log.time}</p>
                               </td>
                               <td className="p-4 whitespace-nowrap">
                                  {log.type === 'IN' && <span className="px-2 py-1 bg-emerald-950/40 text-emerald-500 border border-emerald-900/50 rounded text-[9px] font-black uppercase tracking-widest">MASUK (IN)</span>}
                                  {log.type === 'OUT' && <span className="px-2 py-1 bg-orange-950/40 text-orange-500 border border-orange-900/50 rounded text-[9px] font-black uppercase tracking-widest">KELUAR (OUT)</span>}
                                  {log.type === 'ADD' && <span className="px-2 py-1 bg-blue-950/40 text-blue-500 border border-blue-900/50 rounded text-[9px] font-black uppercase tracking-widest">REGISTRASI (ADD)</span>}
                                  {log.type === 'DELETE' && <span className="px-2 py-1 bg-red-950/40 text-red-500 border border-red-900/50 rounded text-[9px] font-black uppercase tracking-widest">HAPUS (DEL)</span>}
                               </td>
                               <td className="p-4">
                                  <p className="text-xs font-bold text-white uppercase">{log.name} <span className="text-[10px] text-slate-500 ml-1 font-mono">[{log.id}]</span></p>
                                  {log.type === 'OUT' && <p className="text-[9px] font-bold text-orange-400 mt-1 uppercase">DIPINJAM OLEH: {log.holder}</p>}
                                  {log.type === 'DELETE' && <p className="text-[9px] font-bold text-red-400 mt-1 uppercase">DIHAPUS DARI SISTEM</p>}
                               </td>
                               <td className="p-4 text-[10px] font-black tracking-widest text-slate-400 uppercase whitespace-nowrap">{log.operator}</td>
                             </tr>
                           ))}
                           {logs.length === 0 && (
                             <tr><td colSpan={4} className="p-10 text-center text-[10px] font-black uppercase text-slate-500">BELUM ADA LOG AKTIVITAS 1 BULAN TERAKHIR</td></tr>
                           )}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="max-w-2xl mx-auto py-10 space-y-6 animate-in fade-in">
             <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-600/20 cyber-cut">
                    <ScanIcon size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">[ SIAP MENERIMA INPUT SCANNER HARDWARE & MANUAL ]</p>
              </div>

              {/* Manual Input Container */}
              <form onSubmit={(e) => {
                  e.preventDefault();
                  handleScanCode(scanInput);
                  setScanInput("");
              }}>
                <div className="glass-effect rounded-[30px] border border-slate-700 p-2 focus-within:border-emerald-500 relative overflow-hidden bg-[#020617] hud-card">
                    <div className="crt-scanline absolute inset-0 opacity-50 z-10 pointer-events-none"></div>
                    <input 
                      type="text" 
                      value={scanInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.endsWith('.')) {
                          handleScanCode(val.slice(0, -1));
                          setScanInput("");
                        } else {
                          setScanInput(val);
                        }
                      }}
                      className="w-full bg-[#020617] p-8 rounded-[24px] text-xl font-mono font-bold text-emerald-400 outline-none text-center uppercase tracking-widest relative z-20" 
                      placeholder="KETIK / SCAN BARCODE DI SINI..." 
                    />
                </div>
              </form>

              {/* Holder Input Container */}
              <div className="mt-4">
                <input
                  type="text"
                  value={holderInput}
                  onChange={(e) => setHolderInput(e.target.value)}
                  placeholder="NAMA PEMBAWA ASET (HANYA UNTUK PROSES PEMINJAMAN)"
                  className="w-full bg-[#111827] border border-slate-800 p-4 rounded-[16px] text-xs font-mono font-bold text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Advanced Scan Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="flex items-center gap-3">
                     <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={rapidScan} onChange={(e) => setRapidScan(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-300"></div>
                     </label>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RAPID SCAN</span>
                  </div>
                  <button 
                    onClick={() => setCameraActive(!cameraActive)}
                    className="flex items-center gap-2 bg-emerald-900/30 text-emerald-500 border border-emerald-900/50 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-900/50 transition-colors"
                  >
                     <Camera size={14} /> SCAN KAMERA PERANGKAT
                  </button>
              </div>

              {/* Actual mobile scanner view using html5-qrcode */}
              {cameraActive && (
                <div className="mt-6 bg-[#020617] border-2 border-emerald-500/50 rounded-[24px] p-6 text-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <div id="reader" className="w-full mx-auto overflow-hidden rounded-[16px] mb-4" />
                  <button 
                    onClick={() => setCameraActive(false)}
                    className="bg-red-900/50 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white border border-red-500/50"
                  >
                    Tutup Kamera
                  </button>
                </div>
              )}

              {/* Session Logs Panel */}
              <div className="mt-10 space-y-4">
                {/* Today's log panel */}
                <div className="bg-[#020617]/50 border border-slate-800 rounded-[20px] overflow-hidden">
                   <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                      <div className="flex items-center gap-3 flex-1">
                         <Calendar size={14} className="text-emerald-500" />
                         <input 
                           type="text"
                           value={sessionNameInput}
                           onChange={(e) => setSessionNameInput(e.target.value)}
                           placeholder="KETIK NAMA SESI OPERASIONAL..."
                           className="bg-transparent border-none text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest outline-none w-full"
                         />
                      </div>
                      <button onClick={() => handlePrint({ type: 'logs-today' })} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Printer size={14} />
                      </button>
                   </div>
                   <div className={`p-4 ${logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length === 0 ? "py-16 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDYxMjI1Ij48L3JlY3Q+CjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIxIiBmaWxsPSIjMWUxZTJkIj48L2NpcmNsZT4KPC9zdmc+')]":""}`}>
                      {logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">BELUM ADA RIWAYAT OPERASIONAL HARI INI.</p>
                      ) : (
                        <div className="space-y-3">
                          {logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).map((log, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2">
                              <span className="font-mono text-emerald-500">{log.time}</span>
                              <span className="font-bold text-white uppercase">{log.name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${log.status === 'Keluar' ? 'bg-orange-900/40 text-orange-400' : 'bg-emerald-900/40 text-emerald-400'}`}>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>

                {/* Yesterday's log panel */}
                <div className="bg-[#020617]/50 border border-slate-800 rounded-[20px] overflow-hidden">
                   <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
                      <div className="flex items-center gap-3">
                         <History size={14} className="text-slate-500" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HISTORY KEMARIN</span>
                      </div>
                      <button onClick={() => handlePrint({ type: 'logs-yesterday' })} className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Printer size={14} />
                      </button>
                   </div>
                   <div className={`p-4 ${logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).length === 0 ? "py-16 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDYxMjI1Ij48L3JlY3Q+CjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIxIiBmaWxsPSIjMWUxZTJkIj48L2NpcmNsZT4KPC9zdmc+')]":""}`}>
                      {logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">TIDAK ADA DATA OPERASIONAL KEMARIN.</p>
                      ) : (
                        <div className="space-y-3">
                          {logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).map((log, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2">
                              <span className="font-mono text-emerald-500">{log.time}</span>
                              <span className="font-bold text-white uppercase">{log.name}</span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${log.status === 'Keluar' ? 'bg-orange-900/40 text-orange-400' : 'bg-emerald-900/40 text-emerald-400'}`}>{log.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>
              </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="max-w-6xl mx-auto py-10 animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase"><span className="text-emerald-500/50 mr-2">[</span>Inventaris Aset<span className="text-emerald-500/50 ml-2">]</span></h2>
                 
                 <div className="flex gap-2">
                   <button className="bg-[#020617] border border-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-slate-800" onClick={handleExportExcel}>
                     <Download size={16} /> Export Excel
                   </button>
                   <button className="bg-[#020617] border border-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-slate-800" onClick={() => excelInputRef.current?.click()}>
                     <Upload size={16} /> Import Excel
                   </button>
                   <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />

                   <button className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-emerald-500" onClick={() => {
                     const sku = prompt("Masukkan SKU Baru:");
                     if (sku) {
                       const name = prompt("Masukkan Nama Barang:");
                       const nvItem: Item = { id: sku, name: name || 'BARANG', status: "Di Gudang", category: "Senjata", serial: "-", popor: "-", holder: "-", note: "-", date: new Date().toISOString().split('T')[0] };
                       setDoc(doc(db, "items", sku), nvItem)
                         .then(() => alert("Aset berhasil ditambahkan ke database online!"))
                         .catch(e => { console.error(e); alert("Gagal koneksi ke server!"); });
                     }
                   }}>
                      <PlusSquare size={16} /> Tambah Data
                   </button>
                 </div>
              </div>
              <div className="bg-[#1e293b] p-6 rounded-[30px] border border-slate-800 bg-carbon overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                      <button 
                         onClick={() => {
                            const displayedIds = inventory
                               .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.id.toLowerCase().includes(inventorySearch.toLowerCase()) || item.serial.toLowerCase().includes(inventorySearch.toLowerCase()))
                               .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                               .map(i => i.id);
                            
                            const isAllSelected = displayedIds.length > 0 && displayedIds.every(id => selectedItems.includes(id));
                            if (isAllSelected) {
                               setSelectedItems(selectedItems.filter(id => !displayedIds.includes(id)));
                            } else {
                               const newIds = displayedIds.filter(id => !selectedItems.includes(id));
                               setSelectedItems([...selectedItems, ...newIds]);
                            }
                         }}
                         className="bg-emerald-900/20 p-3 rounded-xl border border-emerald-900/50 flex-shrink-0 hover:bg-emerald-900/40 transition-colors"
                      >
                         <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${(() => {
                             const displayedIds = inventory
                               .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.id.toLowerCase().includes(inventorySearch.toLowerCase()) || item.serial.toLowerCase().includes(inventorySearch.toLowerCase()))
                               .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                               .map(i => i.id);
                             return displayedIds.length > 0 && displayedIds.every(id => selectedItems.includes(id));
                         })() ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-500/50'}`}>
                             {(() => {
                                 const displayedIds = inventory
                                   .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.id.toLowerCase().includes(inventorySearch.toLowerCase()) || item.serial.toLowerCase().includes(inventorySearch.toLowerCase()))
                                   .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                                   .map(i => i.id);
                                 return displayedIds.length > 0 && displayedIds.every(id => selectedItems.includes(id));
                             })() && <div className="w-2.5 h-2.5 bg-[#020617] rounded-sm"></div>}
                         </div> 
                      </button>
                      <div className="relative flex-1 w-full">
                          <input 
                            type="text" 
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder="CARI ASET..." 
                            className="w-full bg-[#020617] border border-slate-800 pl-12 pr-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-colors text-white" 
                          />
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      </div>
                      <select 
                        value={inventoryCategoryFilter}
                        onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                        className="bg-[#020617] border border-slate-800 px-4 py-3 rounded-xl text-xs font-black text-emerald-500 uppercase tracking-widest outline-none w-full md:w-auto"
                      >
                         <option value="ALL">SEMUA KATEGORI</option>
                         {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={inventorySort}
                        onChange={(e) => setInventorySort(e.target.value as any)}
                        className="bg-[#020617] border border-slate-800 px-4 py-3 rounded-xl text-xs font-black text-emerald-500 uppercase tracking-widest outline-none w-full md:w-auto"
                      >
                         <option value="newest">TERBARU TERLEBIH DAHULU</option>
                         <option value="oldest">TERLAMA TERLEBIH DAHULU</option>
                      </select>
                      <button 
                        onClick={() => {
                           if(selectedItems.length === 0) { alert('Pilih aset yang ingin dicetak'); return; }
                           handlePrint({ type: 'inventory-selection', ids: selectedItems });
                        }}
                        disabled={selectedItems.length === 0}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Printer size={16} /> CETAK {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
                      </button>
                  </div>
                  <div className="overflow-x-auto bg-[#020617] rounded-2xl border border-slate-800">
                      <table className="w-full text-left min-w-[800px]">
                          <thead className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800">
                              <tr>
                                <th className="p-4 w-12 text-center"></th>
                                <th className="p-4">SKU/Barcode</th>
                                <th className="p-4">Nama Aset</th>
                                <th className="p-4">Kategori</th>
                                <th className="p-4">Nomor Seri</th>
                                <th className="p-4">Nomor Popor</th>
                                <th className="p-4">Pemegang</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Tanggal Registrasi</th>
                                <th className="p-4">Keterangan</th>
                                <th className="p-4 text-center">AKSI</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {inventory
                                .filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.id.toLowerCase().includes(inventorySearch.toLowerCase()) || item.serial.toLowerCase().includes(inventorySearch.toLowerCase()))
                                .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                                .sort((a, b) => inventorySort === 'newest' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime())
                                .slice((inventoryPage - 1) * 10, inventoryPage * 10)
                                .map((item, i) => {
                                  const isOverdue = item.status === 'Keluar' && item.dueDate && Date.now() > item.dueDate;
                                  const isSelected = selectedItems.includes(item.id);
                                  return (
                                  <tr key={item.id} className={`inventory-row transition-colors cursor-pointer ${isSelected ? 'bg-emerald-900/20' : 'hover:bg-slate-800/50'}`} onClick={() => setViewingItem(item)}>
                                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                         <button 
                                            onClick={() => {
                                               if (isSelected) setSelectedItems(selectedItems.filter(id => id !== item.id));
                                               else setSelectedItems([...selectedItems, item.id]);
                                            }}
                                            className="w-5 h-5 border-2 rounded flex items-center justify-center border-slate-600 hover:border-emerald-500 transition-colors mx-auto"
                                         >
                                            {isSelected && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>}
                                         </button>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-emerald-500">{item.id}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-xs font-black text-white uppercase">{item.name}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase">{item.category}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-300 uppercase">{item.serial}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-300 uppercase">{item.popor}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-bold text-slate-300 uppercase">{item.holder}</p>
                                      </td>
                                      <td className="p-4 flex flex-col items-start justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <span className={`status-badge ${item.status === 'Di Gudang' ? 'status-gudang' : 'status-keluar'}`}>{item.status}</span>
                                        {isOverdue && <span className="text-[9px] font-black uppercase text-red-500 mt-1 animate-pulse border border-red-500/50 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)]">OVERDUE</span>}
                                        {!isOverdue && item.status === 'Keluar' && item.dueDate && <span className="text-[8px] font-mono text-orange-400 mt-1">Due: {new Date(item.dueDate).toLocaleTimeString('id-ID')}</span>}
                                        {item.status === 'Keluar' && (
                                           <button onClick={() => handleSetAlarm(item.id)} className="bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-white border border-orange-900 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 mt-1">
                                               <BellRing size={10} /> Set Alarm
                                           </button>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-300 uppercase">{item.date}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] text-slate-400 max-w-[120px] truncate">{item.note}</p>
                                      </td>
                                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                          <button 
                                            onClick={() => setViewingItem(item)}
                                            title="Info Detail"
                                            className="bg-[#020617] border border-blue-900/50 text-blue-500 hover:bg-blue-900/30 hover:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <FileText size={14} />
                                          </button>
                                          <button 
                                            onClick={() => setEditingItem(item)}
                                            title="Edit Aset"
                                            className="bg-[#020617] border border-orange-900/50 text-orange-500 hover:bg-orange-900/30 hover:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <Settings size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handlePrint({ type: 'inventory-selection', ids: [item.id] })}
                                            title="Cetak Aset"
                                            className="bg-[#020617] border border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <Printer size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handleIndividualDelete(item.id)}
                                            title="Hapus Aset"
                                            className="bg-[#020617] border border-red-900/50 text-red-500 hover:bg-red-900/30 hover:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </td>
                                  </tr>
                                  );
                              })}
                              {inventory.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-slate-500 font-bold uppercase text-xs">Inventaris Kosong.</td></tr>}
                          </tbody>
                      </table>
                  </div>
                  {(() => {
                      const totalAssets = inventory.filter(item => item.name.toLowerCase().includes(inventorySearch.toLowerCase()) || item.id.toLowerCase().includes(inventorySearch.toLowerCase()) || item.serial.toLowerCase().includes(inventorySearch.toLowerCase())).filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter).length;
                      const totalPages = Math.ceil(totalAssets / 10);
                      
                      if (totalPages <= 1) return null;
                      
                      return (
                          <div className="flex justify-between items-center mt-6 p-2 bg-[#020617]/50 rounded-xl border border-slate-800/50">
                              <button 
                                onClick={() => setInventoryPage(p => Math.max(1, p - 1))} 
                                disabled={inventoryPage === 1}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                              >
                                Prev
                              </button>
                              
                              <div className="flex items-center gap-1.5 overflow-x-auto px-2 pb-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                  .filter(pageNum => totalPages <= 7 || pageNum === 1 || pageNum === totalPages || Math.abs(inventoryPage - pageNum) <= 1)
                                  .map((pageNum, idx, arr) => {
                                      const prev = arr[idx - 1];
                                      return (
                                        <React.Fragment key={`page-${pageNum}`}>
                                           {prev && pageNum - prev > 1 && <span className="text-slate-500 px-1 font-bold text-xs">...</span>}
                                           <button 
                                             onClick={() => setInventoryPage(pageNum)}
                                             className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-xs font-black transition-colors border ${inventoryPage === pageNum ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                           >
                                             {pageNum}
                                           </button>
                                        </React.Fragment>
                                      );
                                })}
                              </div>

                              <button 
                                onClick={() => setInventoryPage(p => Math.min(totalPages, p + 1))} 
                                disabled={inventoryPage === totalPages}
                                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                              >
                                Next
                              </button>
                          </div>
                      );
                  })()}
              </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto py-10 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Registrasi Aset Baru<span className="text-emerald-500/50 ml-2">]</span></h2>
              <div className="bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-800 bg-carbon">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-800 pb-4">
                   <p className="text-slate-400 text-sm text-center md:text-left">Formulir pendaftaran aset baru (Senjata/Amunisi/Kendaraan) ke dalam sistem inventaris.</p>
                   <div className="relative">
                      <input 
                        type="file" 
                        accept=".xlsx, .xls, .csv" 
                        onChange={handleImportExcel}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Import Multi Aset dari Excel"
                      />
                      <button className="bg-emerald-900/40 text-emerald-500 hover:bg-emerald-500 hover:text-[#020617] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 border border-emerald-900/50">
                         <PlusSquare size={14} /> Import dari Excel (250+ Item Sekaligus)
                      </button>
                   </div>
                 </div>
                 <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama Pemegang / Penanggung Jawab</label>
                       <input value={addForm.holder} onChange={e=>setAddForm({...addForm, holder: e.target.value})} type="text" className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NAMA PEMEGANG" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nama Barang / Senjata</label>
                       <input value={addForm.name} onChange={e=>setAddForm({...addForm, name: e.target.value})} type="text" className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NAMA BARANG" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SKU / Barcode ID</label>
                        <input value={addForm.sku} onChange={e=>setAddForm({...addForm, sku: e.target.value})} type="text" className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm font-mono uppercase focus:border-emerald-500 outline-none" placeholder="ISI KODE SKU (CONTOH: 1, 2, 250, SN-001)" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                         <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori</label>
                         <select value={addForm.category} onChange={e=>setAddForm({...addForm, category: e.target.value})} className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none appearance-none">
                            {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="CUSTOM">+ TAMBAH KATEGORI BARU...</option>
                         </select>
                         {addForm.category === 'CUSTOM' && (
                           <input value={addForm.customCategory} onChange={e=>setAddForm({...addForm, customCategory: e.target.value})} type="text" className="w-full mt-3 bg-slate-900 border border-emerald-800 rounded-xl p-4 text-emerald-400 text-sm uppercase focus:border-emerald-500 outline-none" placeholder="KETIK KATEGORI BARU" />
                         )}
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nomor Popor Senjata</label>
                           <input value={addForm.popor} onChange={e=>setAddForm({...addForm, popor: e.target.value})} type="text" className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NO POPOR (OPSIONAL)" />
                        </div>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nomor Seri Pabrik (S/N)</label>
                       <input value={addForm.serial} onChange={e=>setAddForm({...addForm, serial: e.target.value})} type="text" className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NOMOR SERI" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Keterangan / Kondisi</label>
                       <textarea value={addForm.note} onChange={e=>setAddForm({...addForm, note: e.target.value})} rows={2} className="w-full mt-1 bg-[#020617]/80 border border-slate-700 rounded-xl p-4 text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="KETERANGAN (OPSIONAL)"></textarea>
                     </div>
                 </div>
                 <button onClick={handleAddItem} className="w-full mt-8 bg-emerald-600 text-white font-black text-sm uppercase tracking-widest p-4 py-5 rounded-xl hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 cyber-cut">SIMPAN DATA ASET</button>
              </div>
          </div>
        )}

        {activeTab === 'opname' && (
          <div className="max-w-6xl mx-auto py-10 animate-in fade-in">
              {!opnameSession?.active ? (
                <div className="text-center max-w-4xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase mb-6"><span className="text-emerald-500/50 mr-2">[</span>Stock Opname Fisik<span className="text-emerald-500/50 ml-2">]</span></h2>
                  <div className="bg-[#1e293b] p-8 md:p-14 rounded-[40px] border border-slate-800 shadow-2xl bg-carbon relative overflow-hidden">
                      <ClipboardCheck className="absolute -top-10 -right-10 w-64 h-64 text-slate-800/20 z-0 pointer-events-none" />
                      <ClipboardCheck className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mx-auto mb-6 relative z-10" />
                      <p className="text-slate-400 mb-6 max-w-2xl mx-auto font-medium text-xs md:text-sm leading-relaxed relative z-10">
                          Fitur Stock Opname Fisik dirancang khusus untuk keperluan <span className="font-bold text-white">Audit Berkala</span>. Sistem akan secara otomatis mengkalkulasi ketersediaan aset secara real-time:
                      </p>
                      <div className="bg-[#020617]/50 border border-slate-800/80 rounded-2xl p-6 text-left max-w-2xl mx-auto mb-8 text-xs font-bold space-y-3 relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                          <p className="text-emerald-400"><span className="text-emerald-500 font-black">1. Aset Diharapkan:</span> <span className="text-slate-400">Barang yang berstatus 'Di Gudang' (wajib discan).</span></p>
                          <p className="text-blue-400"><span className="text-blue-500 font-black">2. Sedang Dipinjam:</span> <span className="text-slate-400">Barang berstatus 'Keluar' (diabaikan dari audit).</span></p>
                          <p className="text-emerald-300"><span className="text-emerald-400 font-black">3. Aset Cocok:</span> <span className="text-slate-400">Fisik barang yang berhasil diverifikasi scanner.</span></p>
                          <p className="text-red-400"><span className="text-red-500 font-black">4. Selisih (Missing):</span> <span className="text-red-900 font-bold">Barang terdata namun fisiknya belum ditemukan di gudang.</span></p>
                          <p className="text-orange-400"><span className="text-orange-500 font-black">5. Ekstra / Tidak Dikenal:</span> <span className="text-orange-900 font-bold">Barcode asing / tak terdaftar terdeteksi.</span></p>
                      </div>
                      <button onClick={startOpname} className="btn-interact cyber-cut bg-emerald-600 text-white px-8 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 relative z-10">MULAI SESI OPNAME SEKARANG</button>
                  </div>
                </div>
              ) : (
                <div>
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                     <h2 className="text-2xl font-black text-white italic uppercase"><span className="text-emerald-500/50 mr-2">[</span>Sesi Opname Sedang Berjalan<span className="text-emerald-500/50 ml-2">]</span></h2>
                     <button onClick={() => setOpnameSession(null)} className="btn-interact cyber-cut bg-red-600 text-white px-6 py-3 font-black uppercase tracking-widest hover:bg-red-500 text-xs shadow-lg flex items-center gap-2"><X size={16} /> Akhiri Sesi</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       <div className="bg-[#020617] p-5 rounded-[20px] border border-slate-800 text-center"><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Diharapkan (In)</p><p className="text-2xl md:text-3xl font-black text-white">{opnameSession.expected.length}</p></div>
                       <div className="bg-[#020617] p-5 rounded-[20px] border border-blue-900/50 text-center"><p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Sedang Dipinjam</p><p className="text-2xl md:text-3xl font-black text-blue-400">{opnameSession.out.length}</p></div>
                       <div className="bg-emerald-950/20 p-5 rounded-[20px] border border-emerald-900/50 text-center shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]"><p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Berhasil Discan</p><p className="text-2xl md:text-3xl font-black text-emerald-400">{opnameSession.scanned.length}</p></div>
                       <div className="bg-red-950/20 p-5 rounded-[20px] border border-red-900/50 text-center shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]"><p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1">Missing / Belum Ditemukan</p><p className="text-2xl md:text-3xl font-black text-red-400">{opnameSession.expected.length - opnameSession.scanned.length}</p></div>
                   </div>
                   <div className="bg-[#020617] p-6 rounded-[30px] border border-slate-700 mb-8 relative">
                       <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-3 text-center">Siap Menerima Input Scanner Hardware</p>
                       <form onSubmit={(e) => {
                           e.preventDefault();
                           handleOpnameScan(opnameScanInput);
                           setOpnameScanInput("");
                       }}>
                         <input 
                           type="text" 
                           value={opnameScanInput} 
                           onChange={(e) => {
                             const val = e.target.value;
                             if (val.endsWith('.')) {
                               handleOpnameScan(val.slice(0, -1));
                               setOpnameScanInput("");
                             } else {
                               setOpnameScanInput(val);
                             }
                           }}
                           placeholder="SCAN BARCODE FISIK ASET DI SINI..." 
                           className="w-full bg-[#020617] border border-slate-700 p-6 rounded-2xl text-emerald-400 font-mono font-bold outline-none uppercase text-center text-xl tracking-widest focus:border-emerald-500 transition-colors shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]" 
                         />
                       </form>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       <div className="bg-[#020617] p-6 rounded-[30px] border border-red-900/50">
                          <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">Belum Ditemukan ({opnameSession.expected.filter(v => !opnameSession.scanned.includes(v)).length})</h3>
                          <ul className="space-y-2">
                             {opnameSession.expected.filter(v => !opnameSession.scanned.includes(v)).map(id => (
                               <li key={id} className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex justify-between text-red-400 font-mono text-xs">{id} <span>{inventory.find(i=>i.id===id)?.name}</span></li>
                             ))}
                          </ul>
                       </div>
                       <div className="bg-[#020617] p-6 rounded-[30px] border border-orange-900/50">
                          <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest mb-4">Aset Tidak Dikenal/Ekstra ({opnameSession.extra.length})</h3>
                          <ul className="space-y-2">
                             {opnameSession.extra.map(id => <li key={id} className="bg-orange-950/20 border border-orange-900/30 p-3 rounded-xl text-orange-400 font-mono text-xs">{id}</li>)}
                          </ul>
                       </div>
                   </div>
                </div>
              )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Papan Kinerja<span className="text-emerald-500/50 ml-2">]</span></h2>
              <div className="bg-[#1e293b] p-8 rounded-[30px] border border-slate-800 text-center bg-carbon">
                 <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Metrik Operator</h3>
                 <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">Log aktivitas dan kecepatan pelayanan dari tiap operator gudang.</p>
                 <div className="bg-[#020617] rounded-2xl p-6 border border-slate-800 text-left">
                     <p className="text-emerald-500 font-bold text-sm">1. Ryo Kun - 120 Transaksi (Bulan Ini)</p>
                     <p className="text-slate-400 font-bold text-sm mt-2">2. Anton S. - 85 Transaksi (Bulan Ini)</p>
                 </div>
              </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Manajemen Akses<span className="text-emerald-500/50 ml-2">]</span></h2>
               <div className="bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-800 bg-carbon mb-8">
                 <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-2">Registrasi Admin Baru</h3>
                 <div className="flex flex-col md:flex-row gap-4">
                   <input value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} type="text" placeholder="USERNAME BARU" className="flex-1 bg-[#020617]/80 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500" />
                   <input value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} type="text" placeholder="PASSWORD BARU" className="flex-1 bg-[#020617]/80 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none uppercase focus:border-blue-500" />
                   <button onClick={() => {
                     if(!newUser.username || !newUser.password) return alert("Isi username dan password");
                     if(users.find(u=>u.username===newUser.username.toUpperCase())) return alert("Username sudah ada");
                     setUsers([...users, {username: newUser.username.toUpperCase(), role: 'admin', password: newUser.password}]);
                     setNewUser({username:'', password:''});
                   }} className="btn-interact cyber-cut bg-blue-600 text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Tambah</button>
                 </div>
              </div>
              <div className="bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-800 bg-carbon overflow-hidden">
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest mb-6">Daftar Pengguna Sistem</h3>
                  <div className="overflow-x-auto bg-[#020617] rounded-2xl border border-slate-800">
                      <table className="w-full text-left min-w-[500px]">
                          <thead className="bg-slate-900/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-800"><tr><th className="p-4 md:p-5">Username</th><th className="p-4 md:p-5 text-center">Role</th><th className="p-4 md:p-5 text-right">Aksi</th></tr></thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {users.map(u => (
                                  <tr key={u.username} className="hover:bg-slate-800/50 transition-colors">
                                      <td className="p-4 md:p-5 font-black text-white uppercase tracking-widest">{u.username}</td>
                                      <td className="p-4 md:p-5 text-center"><span className="bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">{u.role}</span></td>
                                      <td className="p-4 md:p-5 text-right">
                                        {u.role !== 'superadmin' && u.username !== 'RYO KUN' && <button onClick={()=>setUsers(users.filter(x=>x.username!==u.username))} className="btn-interact text-slate-400 hover:text-red-500 bg-[#020617] p-2 rounded-xl border border-slate-800">Hapus</button>}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
        )}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto py-10 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Profil Admin<span className="text-emerald-500/50 ml-2">]</span></h2>
               <div className="bg-[#1e293b] p-6 md:p-10 rounded-[40px] border border-slate-800 bg-carbon hud-card shadow-2xl relative overflow-hidden">
                   <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                     <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-slate-900 border-2 border-emerald-500/30 flex items-center justify-center text-4xl md:text-6xl font-black text-emerald-500 cyber-cut shadow-[0_0_30px_rgba(16,185,129,0.15)] relative">
                        {currentUser?.username?.charAt(0) || "R"}
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#1e293b] animate-pulse"></div>
                     </div>
                     <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        <div>
                          <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter">{currentUser?.username || "RYO KUN"}</h3>
                          <p className="text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1 text-xs">{currentUser?.role === 'superadmin' ? 'Super Admin / Operator Gudang' : 'Admin Gudang'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                           <div className="bg-[#020617] p-4 rounded-[20px] border border-slate-800">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Sesi</p>
                             <p className="text-emerald-400 font-mono font-bold text-lg">{autoLogout ? 'AUTO-LOGOUT AKTIF' : 'AUTO-LOGOUT NONAKTIF'}</p>
                           </div>
                           <div className="bg-[#020617] p-4 rounded-[20px] border border-slate-800">
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Mutasi Anda</p>
                             <p className="text-white font-black text-lg">
                               {logs.filter(l => l.operator === currentUser?.username).length} <span className="text-slate-500 text-[10px]">Aset</span>
                             </p>
                           </div>
                        </div>

                        <div className="mt-8 bg-[#020617] p-4 md:p-6 rounded-[20px] border border-slate-800">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Ubah Kata Sandi (Password)</p>
                            <div className="flex flex-col md:flex-row gap-3">
                               <input 
                                 id="new-password"
                                 type="password" 
                                 placeholder="MASUKKAN PASSWORD BARU" 
                                 className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-white text-xs font-bold w-full uppercase outline-none focus:border-orange-500" 
                               />
                               <button 
                                 onClick={() => {
                                    const input = document.getElementById('new-password') as HTMLInputElement;
                                    const newPass = input.value;
                                    if (!newPass) return alert('Masukkan password baru!');
                                    
                                    const updatedUsers = users.map(u => u.username === currentUser.username ? { ...u, password: newPass } : u);
                                    setUsers(updatedUsers);
                                    setCurrentUser({ ...currentUser, password: newPass });
                                    input.value = '';
                                    alert('Password berhasil diubah!');
                                 }}
                                 className="bg-orange-600/20 text-orange-500 hover:text-white hover:bg-orange-600 border border-orange-900 p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors w-full md:w-auto text-nowrap"
                               >
                                 Simpan
                               </button>
                            </div>
                        </div>
                     </div>
                   </div>

                   <hr className="border-slate-800/50 my-8" />

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tampilan Visual</p>
                      <div className="flex flex-col md:flex-row gap-4 mb-8">
                         <button 
                          onClick={() => setIsLiteMode(!isLiteMode)}
                          className={`btn-interact flex-1 ${!isLiteMode ? 'bg-[#022c22]/40 text-[#34d399] border-[#10b981]/50' : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white'} font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border transition-all flex justify-center items-center gap-3 cyber-cut`}
                        >
                          <Cloud size={18} /> {isLiteMode ? 'AKTIFKAN MODE ANIMASI (BERAT)' : 'ANIMASI AKTIF (KLIK UNTUK MODE RINGAN)'}
                        </button>
                      </div>

                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pengaturan Sesi</p>
                      
                      <div className="flex flex-col md:flex-row gap-4">
                        <button 
                          onClick={() => { alert('Logout manual berhasil. Mengarahkan ke halaman login...'); setAutoLogout(false); }}
                          className="btn-interact flex-1 mt-4 bg-red-950/30 text-red-500 font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border border-red-900/50 hover:bg-red-900/50 hover:text-red-400 transition-all flex justify-center items-center gap-3 cyber-cut"
                        >
                          <LogOut size={18} /> LOGOUT SEKETIKA
                        </button>
                        <button 
                          onClick={() => { setAutoLogout(!autoLogout); alert(`Auto Logout 2 Jam telah ${!autoLogout ? 'diaktifkan' : 'dinonaktifkan'}.`); }}
                          className={`btn-interact flex-1 mt-4 ${autoLogout ? 'bg-slate-900/50 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white' : 'bg-blue-950/30 text-blue-500 border-blue-900/50 hover:bg-blue-900/50 hover:text-blue-400'} font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border transition-all flex justify-center items-center gap-3 cyber-cut`}
                        >
                          <Clock size={18} /> {autoLogout ? 'NONAKTIFKAN AUTO-LOGOUT' : 'AKTIFKAN AUTO-LOGOUT 2 JAM'}
                        </button>
                      </div>
                   </div>
                   
                   <hr className="border-slate-800/50 my-8" />

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Integrasi Bot Telegram</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={telegramConfig.botToken}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                          placeholder="Token Bot (Cth: 12345:ABCDE...)"
                          className="bg-[#020617]/80 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none font-mono text-xs focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={telegramConfig.chatId}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                          placeholder="Chat ID (Cth: 987654321)"
                          className="bg-[#020617]/80 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none font-mono text-xs focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!telegramConfig.botToken || !telegramConfig.chatId) return alert("Harap isi Token Bot dan Chat ID.");
                          localStorage.setItem('ryo_telegram', JSON.stringify(telegramConfig));
                          try {
                            const res = await fetch('/api/telegram/send', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                message: "<i>Uji Coba Notifikasi Telegram</i>\n\n✅ <b>Gudang Senjata Batalyon B Pelopor Terhubung!</b>",
                                botToken: telegramConfig.botToken,
                                chatId: telegramConfig.chatId
                              })
                            });
                            const data = await res.json();
                            if (res.ok) alert("Berhasil disimpan! Notifikasi percobaan berhasil terkirim ke Telegram anda.");
                            else alert("Gagal mengirim: " + (data.error || "Token atau Chat ID mungkin tidak valid."));
                          } catch (e: any) {
                            alert("Response Error: " + e.message);
                          }
                        }}
                        className="w-full btn-interact bg-blue-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 cyber-cut hover:bg-blue-500 transition-colors mt-4"
                      >
                        SIMPAN & UJI COBA
                      </button>
                      <p className="text-[10px] text-slate-500 text-center uppercase font-bold mt-2 tracking-widest">Bot akan memberi tahu jika ada aset yang <span className="text-red-500">overdue</span></p>
                   </div>
               </div>
          </div>
        )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* View Modal */}
        <AnimatePresence>
          {viewingItem && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setViewingItem(null)}
            >
               <motion.div 
                 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                 className="bg-[#050b14] border border-blue-900/50 rounded-[40px] max-w-lg w-full overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] cyber-cut relative"
                 onClick={e => e.stopPropagation()}
               >
                 <button onClick={() => setViewingItem(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 bg-[#020617] rounded-xl border border-slate-800 z-10"><X size={16} /></button>
                 <div className="bg-blue-950/30 p-8 border-b border-blue-900/30">
                    <div className="w-16 h-16 bg-blue-950 border border-blue-900/50 rounded-2xl flex flex-col items-center justify-center text-blue-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                       <FileText size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">{viewingItem.name}</h2>
                    <p className="text-blue-500 font-mono text-sm mt-1">{viewingItem.id}</p>
                 </div>
                 <div className="p-8 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Kategori</p>
                          <p className="font-bold text-sm text-slate-300 uppercase">{viewingItem.category}</p>
                       </div>
                       <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Status</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${viewingItem.status === 'Di Gudang' ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/50' : 'bg-orange-950/40 text-orange-500 border border-orange-900/50'}`}>{viewingItem.status}</span>
                       </div>
                    </div>
                    <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                       <div>
                         <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Dipegang / Dipinjam Oleh</p>
                         <p className="font-bold text-sm text-white uppercase">{viewingItem.holder}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">No. Popor</p>
                          <p className="font-mono text-sm text-slate-300 uppercase">{viewingItem.popor || '-'}</p>
                       </div>
                       <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">No. Seri (S/N)</p>
                          <p className="font-mono text-sm text-slate-300 uppercase">{viewingItem.serial || '-'}</p>
                       </div>
                    </div>
                    <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                       <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Tanggal Registrasi</p>
                       <p className="font-mono text-sm text-slate-300 uppercase">{viewingItem.date}</p>
                    </div>
                    <div className="bg-[#020617] border border-slate-800 rounded-2xl p-4">
                       <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Catatan Tambahan</p>
                       <p className="text-xs text-slate-400">{viewingItem.note || 'Tidak ada catatan.'}</p>
                    </div>
                 </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingItem && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto pt-24 pb-24"
              onClick={() => setEditingItem(null)}
            >
               <motion.div 
                 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                 className="bg-[#050b14] border border-orange-900/50 rounded-[40px] max-w-2xl w-full shadow-[0_0_50px_rgba(249,115,22,0.15)] cyber-cut relative my-auto"
                 onClick={e => e.stopPropagation()}
               >
                 <button onClick={() => setEditingItem(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 bg-[#020617] rounded-xl border border-slate-800 z-10"><X size={16} /></button>
                 <div className="bg-orange-950/30 p-8 border-b border-orange-900/30">
                    <div className="w-16 h-16 bg-orange-950 border border-orange-900/50 rounded-2xl flex flex-col items-center justify-center text-orange-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                       <Settings size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">Edit Aset: {editingItem.id}</h2>
                 </div>
                 <div className="p-8 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nama Aset</label>
                      <input value={editingItem.name} onChange={e=>setEditingItem({...editingItem, name: e.target.value})} type="text" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Kategori</label>
                        <select value={editingItem.category} onChange={e=>setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors appearance-none">
                           {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nama Pemegang / Penanggung Jawab</label>
                        <input value={editingItem.holder} onChange={e=>setEditingItem({...editingItem, holder: e.target.value})} type="text" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">No. Popor</label>
                        <input value={editingItem.popor || ''} onChange={e=>setEditingItem({...editingItem, popor: e.target.value})} type="text" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs font-mono focus:border-orange-500 outline-none transition-colors" placeholder="KOSONG"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">No. Seri Pemasok (S/N)</label>
                        <input value={editingItem.serial || ''} onChange={e=>setEditingItem({...editingItem, serial: e.target.value})} type="text" className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs font-mono focus:border-orange-500 outline-none transition-colors" placeholder="KOSONG" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Catatan Tambahan</label>
                      <textarea value={editingItem.note || ''} onChange={e=>setEditingItem({...editingItem, note: e.target.value})} rows={3} className="w-full bg-[#020617] border border-slate-700 rounded-xl p-4 text-white text-xs focus:border-orange-500 outline-none transition-colors resize-none" placeholder="TAMBAHKAN CATATAN..."></textarea>
                    </div>
                 </div>
                 <div className="p-8 border-t border-slate-800/50 flex justify-end gap-4 bg-[#020617]/50 rounded-b-[40px]">
                    <button onClick={() => setEditingItem(null)} className="px-6 py-4 text-xs font-black uppercase text-slate-400 hover:text-white transition-colors tracking-widest">Batal</button>
                    <button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)] cyber-cut transition-all">SIMPAN PERUBAHAN</button>
                 </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDriveModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto pt-24 pb-24"
              onClick={() => setShowDriveModal(false)}
            >
               <motion.div 
                 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                 className="bg-[#050b14] border border-cyan-900/50 rounded-[40px] max-w-2xl w-full shadow-[0_0_50px_rgba(6,182,212,0.15)] cyber-cut relative my-auto p-8"
                 onClick={e => e.stopPropagation()}
               >
                 <button onClick={() => setShowDriveModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 bg-[#020617] rounded-xl border border-slate-800 z-10"><X size={16} /></button>
                 
                 <div className="flex flex-col items-center justify-center mb-8">
                     <div className="w-16 h-16 bg-cyan-950 border border-cyan-900/50 rounded-2xl flex flex-col items-center justify-center text-cyan-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Cloud size={24} />
                     </div>
                     <h2 className="text-2xl font-black text-white uppercase tracking-wider text-center">Google Drive Sync</h2>
                 </div>

                 {isDriveSyncing ? (
                     <div className="text-center text-slate-400 font-mono py-10 flex border flex-col items-center border-slate-800 rounded-2xl bg-[#020617]">
                        <RefreshCw size={32} className="animate-spin mb-4 text-cyan-500" />
                        Sedang menghubungkan ke server Google Drive...
                     </div>
                 ) : !googleUser ? (
                    <div className="text-center py-10">
                        <p className="text-sm font-bold text-slate-400 mb-6">Hubungkan akun Google Drive Anda untuk mulai mencadangkan dan memulihkan data sistem ke cloud dengan aman.</p>
                        <button onClick={executeGoogleLogin} className="gsi-material-button mx-auto max-w-[300px] w-full px-6 py-4 rounded-full bg-white text-black font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-slate-200 transition-colors">
                            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{display: 'block', width: '20px', height: '20px'}}>
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            </svg>
                            <span>Masuk dengan Google</span>
                        </button>
                    </div>
                 ) : (
                    <div className="space-y-6">
                        <div className="bg-[#020617] border border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-1">AKUN TERHUBUNG</p>
                                <p className="text-white font-bold text-sm tracking-widest">{googleUser.displayName}</p>
                                <p className="text-cyan-500 font-mono text-xs">{googleUser.email}</p>
                            </div>
                            <button onClick={async () => { await googleLogout(); setGoogleUser(null); }} className="px-4 py-2 bg-red-900/30 text-red-500 border border-red-900/50 rounded-xl text-xs font-black uppercase tracking-widest">Logout</button>
                        </div>

                        <div className="border border-slate-800 rounded-2xl overflow-hidden">
                           <div className="bg-[#020617] p-4 border-b border-slate-800 flex items-center justify-between">
                              <h3 className="text-xs font-black uppercase text-slate-300 tracking-widest">Cadangan Tersedia</h3>
                              <button onClick={handleBackupToDrive} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Upload size={14}/> Cadangkan Sekarang</button>
                           </div>
                           <div className="bg-[#0f172a]/50 p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3">
                               {driveBackups.length === 0 ? (
                                  <p className="text-center text-slate-500 font-bold text-xs py-10 uppercase">Belum ada file cadangan di Google Drive Anda.</p>
                               ) : driveBackups.map(file => (
                                   <div key={file.id} className="bg-[#020617] border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                      <div>
                                         <p className="text-cyan-400 font-mono text-xs truncate max-w-[200px] sm:max-w-xs mb-1">{file.name}</p>
                                      </div>
                                      <button onClick={() => handleRestoreFromDrive(file.id, file.name)} className="bg-pink-900/30 text-pink-500 border border-pink-900/50 px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-black uppercase hover:bg-pink-900/50 transition-colors"><Download size={14}/> Restore</button>
                                   </div>
                               ))}
                           </div>
                        </div>
                    </div>
                 )}
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

