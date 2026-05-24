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
  Calendar, History, Printer, ArrowDownRight, ArrowUpRight, Trophy, Medal
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Barcode from 'react-barcode';
import { QRCodeSVG } from "qrcode.react";
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDocs, where } from "firebase/firestore";
import { db } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { AuthScreen } from "./AuthScreen";
import { initAuth, googleSignIn, logout as googleLogout, getAccessToken } from "./firebaseAuth";
import { JarvisAssistant } from "./components/JarvisAssistant";
import { backupToDrive, restoreFromDrive, listBackupFilesInDrive } from "./driveSystem";
import { findOrCreateSpreadsheet, syncDataToSpreadsheet, pullDataFromSpreadsheet, sendTransactionEmail } from "./sheetsSystem";
import type { User as FirebaseUser } from "firebase/auth";

// Safe Storage Wrapper to handle iFrame and locked third-party storage environments
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied for getItem:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access denied for setItem:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access denied for removeItem:", e);
    }
  }
};

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

import { MetricsWidget, ChartWidget, PieWidget, LogsWidget } from "./components/DashboardWidgets";

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

  const [sheetsSpreadsheetId, setSheetsSpreadsheetId] = useState<string | null>(() => safeStorage.getItem("sheets_spreadsheet_id") || null);
  const [isSheetsAutosyncEnabled, setIsSheetsAutosyncEnabled] = useState<boolean>(() => safeStorage.getItem("sheets_autosync") !== "false");
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);

  const [notificationEmail, setNotificationEmail] = useState<string>(() => safeStorage.getItem("notification_email") || "");
  const [isEmailNotificationEnabled, setIsEmailNotificationEnabled] = useState<boolean>(() => safeStorage.getItem("email_notification_enabled") === "true");

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
    // Dynamic timeout based on volume: bulk barcodes need more time to initialize DOM elements
    let timeout = 1200;
    if (ctx.type === 'inventory-selection') {
      const count = ctx.ids?.length || 0;
      timeout = count > 20 ? 5000 : 3500;
    } else if (ctx.type === 'barcode-roll') {
      const count = ctx.ids?.length || 0;
      timeout = count > 10 ? 4000 : 3000;
    }
    
    setTimeout(() => {
      window.print();
    }, timeout);
  };
  
  // PWA (Progressive Web App) Installation Engine
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appInstalled, setAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event dispatched and captured.');
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setAppInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed successfully!');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerPwaInstall = async () => {
    if (!deferredPrompt) {
      alert("Browser Anda belum memicu persetujuan instal secara otomatis. Harap ikuti petunjuk manual di bawah.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome to installation: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };
  
  // Scanner state
  const [scanInput, setScanInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [holderInput, setHolderInput] = useState("");
  const [sessionNameInput, setSessionNameInput] = useState("");
  const [rapidScan, setRapidScan] = useState(false);
  const [overdueHoursInput, setOverdueHoursInput] = useState<number | ''>(8);

  // Added states for missing html features
  const [appSettings, setAppSettings] = useState({ 
    categories: ['Senjata Api', 'Senjata Pelontar', 'Amunisi', 'Perlengkapan Taktis'] 
  });
  const [addForm, setAddForm] = useState({ holder: '', name: '', sku: '', category: 'Senjata Api', customCategory: '', popor: '', serial: '', note: '' });
  const [opnameSession, setOpnameSession] = useState<{ active: boolean; expected: string[]; scanned: string[]; extra: string[]; out: string[]; } | null>(null);
  const [opnameScanInput, setOpnameScanInput] = useState("");
  const [users, setUsers] = useState<any[]>(() => {
    return [{ username: 'RYO KUN', role: 'superadmin', password: '123' }];
  });
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [newUser, setNewUser] = useState({ username: '', password: '' });
  const [autoLogout, setAutoLogout] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardListType, setDashboardListType] = useState<"Total" | "Tersedia" | "Keluar" | null>(null);
  const [closedPushNotifs, setClosedPushNotifs] = useState<string[]>([]);
  
  const [dashboardLayout, setDashboardLayout] = useState<string[]>(() => {
    try {
      const saved = safeStorage.getItem('ryo_dashboard_layout');
      if (saved && saved !== "undefined") return JSON.parse(saved);
    } catch(e) {}
    return ['metrics', 'chart', 'pie', 'logs'];
  });

  useEffect(() => {
    safeStorage.setItem('ryo_dashboard_layout', JSON.stringify(dashboardLayout));
  }, [dashboardLayout]);

  const [telegramConfig, setTelegramConfig] = useState<{botToken: string, chatId: string}>(() => {
    try {
      const stored = safeStorage.getItem('ryo_telegram');
      if (stored && stored !== "undefined") return JSON.parse(stored);
    } catch(e) {}
    return { botToken: '', chatId: '' };
  });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventorySort, setInventorySort] = useState<"newest" | "oldest">("newest");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("ALL");
  const [printLayout, setPrintLayout] = useState<"auto" | "normal" | "compact">("auto");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [onlyOverdueFilter, setOnlyOverdueFilter] = useState(false);

  useEffect(() => {
    setInventoryPage(1);
  }, [inventorySearch, inventoryCategoryFilter, inventorySort, onlyOverdueFilter]);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Edit / Info State
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewingItem, setViewingItem] = useState<Item | null>(null);

  const [isLiteMode, setIsLiteMode] = useState<boolean>(() => {
    const stored = safeStorage.getItem('ryo_lite_mode');
    return stored === 'true';
  });

  useEffect(() => {
    safeStorage.setItem('ryo_lite_mode', String(isLiteMode));
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

  const filteredInventory = React.useMemo(() => {
    return inventory
      .filter(item => {
        const searchLower = (inventorySearch || "").toLowerCase();
        return (item.name || "").toLowerCase().includes(searchLower) || 
               (item.id || "").toLowerCase().includes(searchLower) || 
               (item.serial || "").toLowerCase().includes(searchLower);
      })
      .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
      .filter(item => !onlyOverdueFilter || (item.status === 'Keluar' && item.dueDate && Date.now() > item.dueDate));
  }, [inventory, inventorySearch, inventoryCategoryFilter, onlyOverdueFilter]);
  
  // Notification System Support (Fallback to In-App HUD and Telegram only, completely disabling browser popups)
  const sendPushNotification = (title: string, options?: any) => {
    // Completely disable native browser push notifications to avoid Chrome permission popups
    console.info("[In-App Notification]", title, options?.body || "");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const notifiedOverdueRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const overdueItems = inventory.filter(i => i.status === 'Keluar' && i.dueDate && Date.now() > i.dueDate);
    
    overdueItems.forEach(item => {
      if (!notifiedOverdueRef.current.has(item.id)) {
        sendPushNotification("PERINGATAN GUDANG - OVERDUE", {
          body: `ASET: ${item.name} [${item.id}]\nBelum dikembalikan oleh: ${item.holder}`,
        });
        
        const tConfigStr = safeStorage.getItem('ryo_telegram');
        let tConfig = { botToken: "", chatId: "" };
        try { if (tConfigStr && tConfigStr !== "undefined") tConfig = JSON.parse(tConfigStr); } catch(e){}

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

  const operatorStats = React.useMemo(() => {
    const stats: Record<string, { total: number; scansOut: number; scansIn: number; adds: number }> = {};
    users.forEach(u => {
      const uname = (u?.username || "UNKNOWN").toUpperCase();
      stats[uname] = { total: 0, scansOut: 0, scansIn: 0, adds: 0 };
    });
    logs.forEach(log => {
      const op = (log.operator || "SYSTEM").toString().toUpperCase();
      if (!stats[op]) {
        stats[op] = { total: 0, scansOut: 0, scansIn: 0, adds: 0 };
      }
      stats[op].total += 1;
      if (log.type === "OUT") stats[op].scansOut += 1;
      else if (log.type === "IN") stats[op].scansIn += 1;
      else if (log.type === "ADD") stats[op].adds += 1;
    });
    return Object.entries(stats)
      .map(([username, data]) => ({ name: username, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [logs, users]);

  const holderStats = React.useMemo(() => {
    const stats: Record<string, { total: number; scansOut: number; scansIn: number; days: Set<string> }> = {};
    
    logs.forEach(log => {
      if (!log.holder || log.holder === "-" || log.holder === "SISTEM") return;
      const h = log.holder.toString().toUpperCase();
      if (!stats[h]) {
        stats[h] = { total: 0, scansOut: 0, scansIn: 0, days: new Set() };
      }
      stats[h].total += 1;
      if (log.type === "OUT") stats[h].scansOut += 1;
      else if (log.type === "IN") stats[h].scansIn += 1;
      if (log.fullDate) stats[h].days.add(log.fullDate);
    });

    return Object.entries(stats)
      .map(([name, data]) => {
        const uniqueDays = data.days.size;
        // Logic: frequency (total) + consistency (unique days)
        const score = (data.total * 10) + (uniqueDays * 50);
        return {
          name,
          total: data.total,
          scansOut: data.scansOut,
          scansIn: data.scansIn,
          uniqueDays,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
  }, [logs]);

  const peakHours = React.useMemo(() => {
    const hours = { pagi: 0, siang: 0, sore: 0, malam: 0 };
    logs.forEach(log => {
      const ts = log.timestamp;
      if (!ts) return;
      const dateObj = new Date(ts);
      const hour = dateObj.getHours();
      if (hour >= 6 && hour < 12) hours.pagi += 1;
      else if (hour >= 12 && hour < 18) hours.siang += 1;
      else if (hour >= 18 && hour < 24) hours.sore += 1;
      else hours.malam += 1;
    });
    return hours;
  }, [logs]);

  const overdueNotifications = React.useMemo(() => {
    return inventory.filter(i => i.status === 'Keluar' && i.dueDate && Date.now() > i.dueDate && !closedPushNotifs.includes(i.id));
  }, [inventory, closedPushNotifs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimeString = (date: Date) => {
    return date.toLocaleTimeString('id-ID', { hour12: false });
  };

  const previousItemsRefForNotification = useRef<Map<string, Item>>(new Map());

  useEffect(() => {
    // Auto-clean history logs older than 3 months (90 days) on startup
    const cleanOldDbLogs = async () => {
      try {
        const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
        const cutoff = Date.now() - THREE_MONTHS_MS;
        const qOldLogs = query(collection(db, "logs"), where("timestamp", "<", cutoff));
        const snapshot = await getDocs(qOldLogs);
        
        if (!snapshot.empty) {
          console.info(`[Log Purge] Found ${snapshot.size} logs older than 3 months. Preparing automated cleanup...`);
          // Batch deletes capped at 400 for safety against Firestore batch limit (500)
          const batch = writeBatch(db);
          const slicedDocs = snapshot.docs.slice(0, 400);
          slicedDocs.forEach(d => batch.delete(d.ref));
          await batch.commit();
          console.info(`[Log Purge] Cleaned up ${slicedDocs.length} historical logs successfully.`);
        } else {
          console.info("[Log Purge] No logs older than 3 months found. System database optimal.");
        }
      } catch (error) {
        console.error("Historical log cleanup error:", error);
      }
    };

    // Run 3 seconds after startup to prioritize quick initial rendering
    const delayTimer = setTimeout(() => {
      cleanOldDbLogs();
    }, 3000);

    return () => clearTimeout(delayTimer);
  }, []);

  useEffect(() => {
    // Realtime Sync with Firestore
    const unsubscribeItems = onSnapshot(collection(db, "items"), (snapshot) => {
      const itemsData = snapshot.docs.map(doc => doc.data() as Item);
      
      const newMap = new Map();
      itemsData.forEach(item => newMap.set(item.id, item));

      // Check for critical changes
      if (previousItemsRefForNotification.current.size > 0) {
          itemsData.forEach(newItem => {
             const oldItem = previousItemsRefForNotification.current.get(newItem.id);
             if (oldItem && oldItem.status !== newItem.status && newItem.status === "Keluar") {
                sendPushNotification('Peringatan: Status Aset Kritis', { body: `Aset ${newItem.name} (SKU: ${newItem.id}) telah dikeluarkan oleh ${newItem.holder || 'Seseorang'}.` });
             }
          });
      }

      previousItemsRefForNotification.current = newMap;
      
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

    const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          ...data,
          username: data.username || doc.id
        };
      });
      // Ensure RYO KUN exists in usersData
      if (!usersData.some((u: any) => (u.username || "").toString().toUpperCase() === 'RYO KUN')) {
          usersData.push({ username: 'RYO KUN', role: 'superadmin', password: '123' });
      }
      setUsers(usersData);
    }, (err) => {
      console.error("Firebase Users Error:", err);
    });

    return () => {
      unsubscribeItems();
      unsubscribeLogs();
      unsubscribeUsers();
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
      
      const hasHolder = item.holder && item.holder !== "-" && item.holder !== "";
      const holderPart = hasHolder ? `atas nama ${item.holder}` : "";
      
      const hasPopor = item.popor && item.popor !== "-" && item.popor !== "";
      const poporPart = hasPopor ? `nomor popor ${item.popor}` : "";
      
      const nameText = item.name.toLowerCase();
      const actionText = isOut ? "telah keluar dari gudang" : "telah kembali masuk gudang";
      
      const announcement = [nameText, holderPart, poporPart, actionText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      msg.text = announcement;
      
      msg.lang = 'id-ID';
      msg.rate = 0.9;
      msg.pitch = 1;
      
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
        const alarmHours = typeof overdueHoursInput === 'number' ? overdueHoursInput : 8;
        updatedItem.dueDate = Date.now() + alarmHours * 3600000;
      } else {
        updatedItem.outTimestamp = null;
        updatedItem.dueDate = null;
      }
      
      const newLog: any = {
        id: item.id,
        name: item.name,
        status: isOut ? "Keluar" : "Di Gudang",
        type: isOut ? "OUT" : "IN",
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

        // Send Email Notification if configured
        if (isEmailNotificationEnabled && notificationEmail && googleUser) {
          const typeLabel = isOut ? "KELUAR (CHECK-OUT)" : "KEMBALI (CHECK-IN)";
          const subject = `[MUTASI GUDANG ASET] ${updatedItem.name} - ${typeLabel}`;
          const body = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #0f172a; background-color: #ffffff;">
              <h2 style="color: ${isOut ? "#dc2626" : "#16a34a"}; margin-top: 0; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; font-size: 18px; font-weight: 800; text-transform: uppercase;">Notifikasi Mutasi Aset Gudang</h2>
              <p style="font-size: 13px; line-height: 1.6; color: #475569;">Sistem mencatat perubahan status mutasi barang inventaris dengan rincian operasional di bawah ini:</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="background-color: #f8fafc;">
                  <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #475569;">Parameter</th>
                  <th style="text-align: left; padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #475569;">Detail Terdaftar</th>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b; width: 180px;">Nama Aset</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #0f172a; font-weight: 600;">${updatedItem.name}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">SKU / ID Barcode</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #ef4444; font-name: monospace; font-weight: 700;">${updatedItem.id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Kategori</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${updatedItem.category}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Nomor Seri</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${updatedItem.serial || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Nomor Popor / Rak</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${updatedItem.popor || '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Aksi Transaksi</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 800; color: ${isOut ? "#dc2626" : "#16a34a"};">${typeLabel}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Peminjam / Pemegang</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #020617; font-weight: bold;">${newHolder}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Batas Pengembalian</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #b91c1c; font-weight: bold;">${updatedItem.dueDate ? new Date(updatedItem.dueDate).toLocaleString('id-ID') : '-'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Operator Pelapor</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${currentUser?.username || "SYSTEM"}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #1e293b;">Timestamp Laporan</td>
                  <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">${newLog.fullDate} ${newLog.time}</td>
                </tr>
              </table>

              <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; font-family: monospace;">
                Pemberitahuan Otomatis Gudang Senjata & Inventaris • Terproteksi Secure API
              </div>
            </div>
          `;
          sendTransactionEmail(notificationEmail, subject, body).catch(e => {
            console.error("Gagal mengirim email mutasi:", e);
          });
        }
        
        speakAnnouncement({ ...item, holder: isOut ? newHolder : item.holder }, isOut);
        
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
    const cleanSerial = addForm.serial.trim().toUpperCase();
    if (cleanSerial && cleanSerial !== '-') {
      const existingWithSameSerial = inventory.find(i => i.serial.toUpperCase() === cleanSerial);
      if (existingWithSameSerial) {
         alert(`NOMOR SERI [${cleanSerial}] SUDAH DIGUNAKAN OLEH SKU [${existingWithSameSerial.id}]!`);
         return;
      }
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
     
     const cleanSerial = (editingItem.serial || '').trim().toUpperCase();
     if (cleanSerial && cleanSerial !== '-') {
       const existingWithSameSerial = inventory.find(i => i.serial.toUpperCase() === cleanSerial && i.id !== editingItem.id);
       if (existingWithSameSerial) {
          alert(`GAGAL: NOMOR SERI [${cleanSerial}] SUDAH DIGUNAKAN OLEH SKU [${existingWithSameSerial.id}]!`);
          return;
       }
     }

     try {
       const batch = writeBatch(db);
       batch.set(doc(db, "items", editingItem.id), editingItem);
       
       const newLog: Log = {
          id: editingItem.id,
          name: editingItem.name,
          status: editingItem.status,
          type: "EDIT",
          holder: editingItem.holder,
          time: new Date().toLocaleTimeString('id-ID'),
          fullDate: new Date().toLocaleDateString('id-ID'),
          operator: currentUser?.username || "SYSTEM",
          timestamp: Date.now()
       };
       batch.set(doc(collection(db, "logs")), newLog);

       await batch.commit();
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

  const handleConnectToSheets = async () => {
    setIsSheetsSyncing(true);
    try {
      const sheetId = await findOrCreateSpreadsheet();
      setSheetsSpreadsheetId(sheetId);
      safeStorage.setItem("sheets_spreadsheet_id", sheetId);
      
      // Perform an initial sync
      await syncDataToSpreadsheet(sheetId, inventory, logs);
      alert("Koneksi Google Sheets Berhasil! File 'Database Inventaris Gudang' telah terhubung dan disinkronkan.");
    } catch (err: any) {
      console.error(err);
      alert("Gagal menghubungkan Google Sheets: " + (err.message || err));
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  const handleSyncToSheets = async () => {
    if (!sheetsSpreadsheetId) return;
    setIsSheetsSyncing(true);
    try {
      await syncDataToSpreadsheet(sheetsSpreadsheetId, inventory, logs);
      alert("Sinkronisasi Google Sheets Berhasil!");
    } catch (err: any) {
      console.error(err);
      alert("Gagal sinkronisasi Google Sheets: " + (err.message || err));
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  const handleToggleSheetsAutosync = (enabled: boolean) => {
    setIsSheetsAutosyncEnabled(enabled);
    safeStorage.setItem("sheets_autosync", enabled ? "true" : "false");
  };

  const handlePullFromSheets = async () => {
    if (!sheetsSpreadsheetId) return;
    setIsSheetsSyncing(true);
    try {
      const gsheetItems = await pullDataFromSpreadsheet(sheetsSpreadsheetId);
      if (gsheetItems.length === 0) {
        alert("Tidak ada item ditemukan di Google Sheets untuk ditarik.");
        return;
      }

      const confirmPull = confirm(
        `Berhasil memuat ${gsheetItems.length} aset dari Google Sheets.\nApakah Anda yakin ingin melakukan sinkronisasi dua arah? Data akan diperbarui di Firebase dan Web sesuai isi spreadsheet.`
      );
      if (!confirmPull) return;

      const batch = writeBatch(db);
      // We overwrite existing or add new ones pulled from google sheet values
      for (const item of gsheetItems) {
        batch.set(doc(db, "items", item.id), item);
      }

      await batch.commit();
      alert("Sinkronisasi dua arah berhasil! Database lokal dan Firebase telah diperbarui sesuai isi Google Sheets.");
    } catch (err: any) {
      console.error(err);
      alert("Gagal sinkronisasi dari Google Sheets: " + (err.message || err));
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  // Autosync effect
  useEffect(() => {
    if (!googleUser || !sheetsSpreadsheetId || !isSheetsAutosyncEnabled || inventory.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        console.log("Auto-syncing newest state to Google Sheets...");
        await syncDataToSpreadsheet(sheetsSpreadsheetId, inventory, logs);
      } catch (err) {
        console.error("Autosync Sheets Gagal:", err);
      }
    }, 4000); // 4 seconds debouncing

    return () => clearTimeout(timer);
  }, [inventory, logs, sheetsSpreadsheetId, googleUser, isSheetsAutosyncEnabled]);

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
      const hourInput = prompt(`Atur alarm overdue untuk ${item.name}. Masukkan jumlah jam (contoh: 2 untuk 2 jam, 24 untuk 1 hari):`, "8");
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

  const [appTheme, setAppTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = safeStorage.getItem('ryo_theme') as 'dark' | 'light';
    if (savedTheme) {
      setAppTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    safeStorage.setItem('ryo_theme', appTheme);
    if (appTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appTheme]);

  const toggleTheme = () => {
    const newTheme = appTheme === 'dark' ? 'light' : 'dark';
    setAppTheme(newTheme);
    safeStorage.setItem('ryo_theme', newTheme);
  };

  if (!isAuthenticated || !currentUser) {
    return <AuthScreen users={users} onSuccess={(user) => { setCurrentUser(user); setIsAuthenticated(true); }} />;
  }

  return (
    <div className={`${appTheme === 'dark' ? 'dark' : ''} w-full h-full`}>
      <div className="scanline-overlay opacity-0 dark:opacity-100"></div>
      <div className="fixed inset-0 bg-tactical-grid opacity-0 dark:opacity-[0.03] pointer-events-none z-0"></div>
      
    <div className={`h-screen flex flex-col md:flex-row overflow-hidden relative ${isLiteMode ? 'bg-slate-50 dark:bg-[#020617]' : 'bg-radar dark:bg-radar'} print:bg-white print:block print:h-auto print:overflow-visible transition-colors duration-500`}>
      {/* Decorative Labels */}
      <div className="fixed left-0 top-1/2 -translate-y-1/2 -rotate-90 origin-left ml-2 hidden lg:block z-0 opacity-0 dark:opacity-20 pointer-events-none">
        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.6em] whitespace-nowrap">{"TACTICAL INVENTORY (V5.2)"}</p>
      </div>
      <div className="fixed right-0 top-1/2 -translate-y-1/2 rotate-90 origin-right mr-2 hidden lg:block z-0 opacity-0 dark:opacity-20 pointer-events-none">
        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.6em] whitespace-nowrap">{"SECURED SYSTEM"}</p>
      </div>
      {/* Print View Layer */}
      {printContext && (
        <div className="absolute inset-0 w-full min-h-screen bg-white z-[99999] text-black print:static print:overflow-visible print:h-auto print:min-h-0 print:block">
            {/* Close Button (Hidden during print) */}
            <button 
              onClick={() => setPrintContext(null)}
              className="fixed top-4 right-4 z-[100000] p-3 bg-red-600 text-white rounded-full shadow-2xl hover:bg-red-700 transition-all active:scale-95 print:hidden group flex items-center gap-2"
              title="Tutup Preview Cetak"
            >
              <X size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden w-0 group-hover:w-24 transition-all duration-300">Tutup Preview</span>
            </button>

            <style>
              {printContext.type === 'barcode-roll' ? `
                @media print {
                  @page { margin: 0; size: auto; }
                  body { background: white !important; margin: 0; padding: 0; }
                }
              ` : `
                @media print { 
                  @page { size: A4; margin: 5mm; } 
                  body { background: white !important; -webkit-print-color-adjust: exact; color-adjust: exact; } 
                }
              `}
            </style>
            
            {/* Header for all prints */}
            {printContext.type !== 'inventory-selection' && printContext.type !== 'barcode-roll' && (
                <div className="border-b-2 border-black pb-4 mb-6 flex items-center justify-between p-4 print:p-0">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">SISTEM MANAJEMEN GUDANG SENJATA</h1>
                        <p className="text-sm font-bold mt-1">BATALYON B PELOPOR</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">Developed by RYO KUN</p>
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
                <div className={`flex flex-wrap p-1 print:p-0 justify-start items-start ${printContext.compact ? 'gap-1 print:gap-1.5' : 'gap-1.5 print:gap-2'}`}>
                    {inventory
                      .filter(i => printContext.ids.includes(i.id))
                      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
                      .map(item => (
                        <div key={item.id} className={`border border-black/50 flex flex-col justify-start items-center text-center bg-white w-fit ${printContext.compact ? 'p-0.5' : 'p-1'}`} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', margin: '1px' }}>
                            <div className={`truncate font-black uppercase leading-tight mb-0.5 border-b border-black w-full bg-slate-50 ${printContext.compact ? 'max-w-[110px] print:max-w-[120px] text-[7px] print:text-[8px]' : 'max-w-[140px] print:max-w-[160px] text-[8px] print:text-[9px]'}`}>{item.name}</div>
                            
                            <div className="flex items-center gap-2 px-1">
                                <div className="p-0.5">
                                    <Barcode 
                                      value={item.id} 
                                      width={printContext.compact ? 1.0 : 1.2} 
                                      height={printContext.compact ? 22 : 30} 
                                      fontSize={printContext.compact ? 8 : 9} 
                                      textPosition="bottom" 
                                      margin={2} 
                                      background="#ffffff" 
                                      lineColor="#000000" 
                                      displayValue={true} 
                                      renderer="svg"
                                      format="CODE128"
                                    />
                                </div>
                                
                                {/* QR Code Side-by-Side - Now enabled for both modes with scaling */}
                                <div className={`pl-2 border-l border-black/20 py-1 flex items-center justify-center`}>
                                  <QRCodeSVG value={item.id} size={printContext.compact ? 32 : 44} includeMargin={false} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Print Type: Barcode Roll */}
            {printContext.type === 'barcode-roll' && (
                <div className="flex flex-col m-0 p-0 items-center gap-4">
                    {inventory
                      .filter(i => printContext.ids.includes(i.id))
                      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }))
                      .map((item, index) => (
                        <div key={item.id} style={{ pageBreakAfter: 'always', breakAfter: 'always', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', boxSizing: 'border-box' }} className="barcode-roll-label">
                            <div className="font-black uppercase text-[15px] print:text-[18px] leading-tight text-center max-w-[90%] truncate">{item.name}</div>
                            {item.serial && <div className="font-bold text-[9px] print:text-[11px] leading-tight text-center mb-1 max-w-[90%] truncate text-slate-700">SN: {item.serial}</div>}
                            
                            <div className="flex items-center gap-4 mt-2 px-4 py-2 border border-black/10 rounded-lg bg-slate-50/50">
                                <div className="flex flex-col items-center">
                                    <Barcode 
                                      value={item.id} 
                                      width={2.2} 
                                      height={55} 
                                      fontSize={14} 
                                      textPosition="bottom" 
                                      margin={4} 
                                      background="transparent" 
                                      lineColor="#000000" 
                                      displayValue={true} 
                                      renderer="svg"
                                      format="CODE128"
                                    />
                                </div>
                                <div className="border-l border-black/20 pl-4 flex items-center justify-center">
                                  <div className="border border-black p-1 bg-white shadow-sm">
                                    <QRCodeSVG value={item.id} size={65} includeMargin={false} />
                                  </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

             {/* Print Type: Logs History */}
            {printContext.type.startsWith('logs-') && (() => {
                const filteredLogs = logs.filter(l => {
                    if (printContext.type === 'logs-today') return l.fullDate === new Date().toLocaleDateString('id-ID');
                    const y = new Date(); y.setDate(y.getDate() - 1);
                    return l.fullDate === y.toLocaleDateString('id-ID');
                });
                
                const sortedFilteredLogs = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
                const latestLogMap = new Map();
                sortedFilteredLogs.forEach(log => {
                    if (!latestLogMap.has(log.id)) {
                        latestLogMap.set(log.id, log);
                    }
                });

                const logsStillOut = [];
                const logsInsideOrOther = [];
                
                filteredLogs.forEach(log => {
                    const latestLog = latestLogMap.get(log.id);
                    const currentItem = inventory.find(i => i.id === log.id);
                    const isCurrentlyOut = currentItem && currentItem.status === 'Keluar';
                    
                    if (isCurrentlyOut && log.timestamp === latestLog.timestamp && log.type === 'OUT') {
                        logsStillOut.push(log);
                    } else {
                        logsInsideOrOther.push(log);
                    }
                });

                return (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <h2 className="text-sm font-black uppercase mb-1 py-1 border-b-[1.5px] border-black border-dotted print:mt-[-10px]">
                     LAPORAN MUTASI ASET - {
                        printContext.type === 'logs-today' ? "HARI INI (" + new Date().toLocaleDateString('id-ID') + ")" :
                        "KEMARIN (" + (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toLocaleDateString('id-ID'); })() + ")"
                     }
                   </h2>

                   <h3 className="text-[10px] font-black uppercase mt-4 mb-2 text-red-600">BAGIAN 1: ASET YANG MASIH DI LUAR GUDANG (BELUM KEMBALI / MERAH)</h3>
                   <table className="w-full text-left text-[7px] print:text-[8px] leading-tight mb-6 border-collapse">
                     <thead className="border-b-[1.5px] border-black font-black bg-red-50">
                       <tr>
                         <th className="py-1 px-1">WAKTU</th>
                         <th className="py-1 px-1">TIPE</th>
                         <th className="py-1 px-1">SKU</th>
                         <th className="py-1 px-1">NAMA ASET</th>
                         <th className="py-1 px-1">STATUS SEKARANG</th>
                         <th className="py-1 px-1">PEMEGANG SAAT INI</th>
                         <th className="py-1 px-1">OP</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-black/20 font-mono">
                       {logsStillOut.map(log => (
                         <tr key={log.timestamp} className="break-inside-avoid text-red-600 print:text-red-700 font-bold bg-red-50/30">
                           <td className="py-1 px-1 whitespace-nowrap">{log.time}</td>
                           <td className="py-1 px-1">
                              {log.type === 'IN' && <span className="font-black border border-current px-0.5 py-px">IN</span>}
                              {log.type === 'OUT' && <span className="font-black border border-current px-0.5 py-px border-dashed">OUT</span>}
                              {log.type === 'ADD' && <span className="font-black">ADD</span>}
                              {log.type === 'DELETE' && <span className="font-black line-through">DEL</span>}
                              {log.type === 'EDIT' && <span className="font-black underline border-dotted border-current">EDIT</span>}
                           </td>
                           <td className="py-1 px-1">{log.id}</td>
                           <td className="py-1 px-1 font-black">{log.name}</td>
                           <td className="py-1 px-1 uppercase">{log.status}</td>
                           <td className="py-1 px-1 truncate max-w-[150px]">{log.holder || '-'}</td>
                           <td className="py-1 px-1">{log.operator}</td>
                         </tr>
                       ))}
                       {logsStillOut.length === 0 && (
                          <tr><td colSpan={7} className="text-center py-4 font-bold border-b border-black text-slate-500">SELURUH ASET YANG KELUAR SUDAH KEMBALI KE GUDANG.</td></tr>
                       )}
                     </tbody>
                   </table>

                   <h3 className="text-[10px] font-black uppercase mt-4 mb-2 text-slate-800">BAGIAN 2: RIWAYAT MUTASI / ASET YANG SUDAH KEMBALI</h3>
                   <table className="w-full text-left text-[7px] print:text-[8px] leading-tight border-collapse">
                     <thead className="border-b-[1.5px] border-black font-black bg-slate-50">
                       <tr>
                         <th className="py-1 px-1">WAKTU</th>
                         <th className="py-1 px-1">TIPE</th>
                         <th className="py-1 px-1">SKU</th>
                         <th className="py-1 px-1">NAMA ASET</th>
                         <th className="py-1 px-1">STATUS LOG</th>
                         <th className="py-1 px-1">KETERANGAN</th>
                         <th className="py-1 px-1">OP</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-black/20 font-mono text-black font-medium">
                       {logsInsideOrOther.map(log => (
                         <tr key={log.timestamp} className="break-inside-avoid">
                           <td className="py-0.5 px-1 whitespace-nowrap">{log.time}</td>
                           <td className="py-0.5 px-1">
                              {log.type === 'IN' && <span className="font-black border border-black px-0.5 py-px bg-gray-100 uppercase">IN</span>}
                              {log.type === 'OUT' && <span className="font-black border border-black px-0.5 py-px bg-gray-100 border-dashed uppercase">OUT</span>}
                              {log.type === 'ADD' && <span className="font-black uppercase">ADD</span>}
                              {log.type === 'DELETE' && <span className="font-black line-through uppercase">DEL</span>}
                              {log.type === 'EDIT' && <span className="font-black border border-black px-0.5 py-px bg-gray-100 border-dotted uppercase">EDIT</span>}
                           </td>
                           <td className="py-0.5 px-1">{log.id}</td>
                           <td className="py-0.5 px-1 font-black">{log.name}</td>
                           <td className="py-0.5 px-1 uppercase">{log.status}</td>
                           <td className="py-0.5 px-1 truncate max-w-[150px]">{log.holder || '-'}</td>
                           <td className="py-0.5 px-1">{log.operator}</td>
                         </tr>
                       ))}
                       {logsInsideOrOther.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-4 font-bold border-b border-black">TIDAK ADA DATA LOG MUTASI LAINNYA.</td></tr>
                       )}
                     </tbody>
                   </table>
                   
                   <div className="mt-16 flex justify-end">
                       <div className="text-center w-48">
                           <p className="text-xs font-bold mb-16">Pengesahan / Mengetahui</p>
                           <p className="border-t border-black pt-1 font-bold">KEPALA GUDANG</p>
                       </div>
                   </div>
                </div>
                );
            })()}
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
            <h1 className="text-[10px] font-black text-slate-900 dark:text-white italic tracking-tighter uppercase leading-[1.1]">
              SISTEM MANAJEMEN GUDANG SENJATA
            </h1>
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-tighter">BATALYON B PELOPOR</span>
            <span className="text-[7px] font-medium text-slate-500 dark:text-slate-400 not-italic block normal-case tracking-normal">Developed by RYO KUN</span>
            <span className={`flex items-center gap-1.5 text-[7px] font-black tracking-widest uppercase mt-0.5 ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
              {isOnline ? 'DATABASE TERHUBUNG' : 'SERVER DISCONNECTED'}
            </span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800"
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
      <aside className={`print:hidden fixed md:relative top-0 bottom-0 left-0 w-[280px] md:w-[300px] border-r border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#050b14]/95 backdrop-blur-xl flex flex-col shrink-0 z-[300] transform transition-transform duration-300 ease-in-out md:translate-x-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 md:p-8 text-center border-b border-slate-200 dark:border-slate-800 shrink-0 mt-16 md:mt-0 relative">
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800 btn-interact">
                <X size={16} />
            </button>
            <div className="inline-flex p-3 bg-emerald-600 rounded-2xl mb-4 cyber-cut">
              <ShieldCheck className="text-white w-6 h-6 md:w-8 md:h-8" />
            </div>
                    <h1 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter leading-[0.9] uppercase">
                      SISTEM MANAJEMEN<br/>GUDANG SENJATA
                    </h1>
                    <p className="text-emerald-600 dark:text-emerald-500 text-xs font-black tracking-[0.2em] mt-2 uppercase">BATALYON B PELOPOR</p>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-2 font-black uppercase tracking-widest">Developed by RYO KUN</p>
        </div>
        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Menu Utama</p>
          <button onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'dashboard' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <LayoutDashboard size={20} /><span className="font-bold text-sm">Dashboard</span>
          </button>
          <button onClick={() => { setActiveTab('scanner'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'scanner' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <ScanIcon size={20} /><span className="font-bold text-sm">Scanner</span>
          </button>
          <button onClick={() => { setActiveTab('inventory'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'inventory' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <Package size={20} /><span className="font-bold text-sm">Inventaris</span>
          </button>
          <button onClick={() => { setActiveTab('add'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'add' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <PlusSquare size={20} /><span className="font-bold text-sm">Registrasi Baru</span>
          </button>
          <button onClick={() => { setActiveTab('opname'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'opname' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <ClipboardCheck size={20} /><span className="font-bold text-sm">Stock Opname</span>
          </button>
          <button onClick={() => { setActiveTab('leaderboard'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'leaderboard' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <LayoutDashboard size={20} /><span className="font-bold text-sm">Papan Kinerja</span>
          </button>
          <button onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'users' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <Settings size={20} /><span className="font-bold text-sm">Manajemen Akses</span>
          </button>
          <button onClick={() => { setActiveTab('profile'); setIsMobileMenuOpen(false); }} className={`sidebar-item btn-interact w-full flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all ${activeTab === 'profile' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 shadow-sm text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'}`}>
            <Fingerprint size={20} /><span className="font-bold text-sm">Profil Admin</span>
          </button>
        </nav>
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center font-black text-emerald-600 dark:text-emerald-500 cyber-cut">{currentUser?.username?.charAt(0) || "R"}</div>
                  <div className="text-left">
                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[90px]">{currentUser?.username || "GUEST"}</p>
                    <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{currentUser?.role || "Operator"}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                    <button 
                      onClick={() => { alert('Sesi 2 jam diakhiri manual. Logout berhasil.'); setAutoLogout(false); }} 
                      className="text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 hover:border-red-200 dark:border-slate-800 dark:hover:border-red-900/50 shadow-sm transition-all"
                      title="Logout Manual"
                    >
                      <LogOut size={16} />
                    </button>
                </div>
            </div>
            <div className="mt-4 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center">
              <div className="text-left">
                <p className="text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Auto Logout 2 Jam</p>
                <p className={`text-[11px] font-mono font-bold mt-0.5 ${autoLogout ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'}`}>
                  {autoLogout ? 'AKTIF' : 'NONAKTIF'}
                </p>
              </div>
              <button 
                onClick={() => setAutoLogout(!autoLogout)} 
                className={`btn-interact text-[9px] ${autoLogout ? 'bg-emerald-950/40 text-emerald-500 hover:text-slate-900 dark:text-white border-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border-slate-300 dark:border-slate-700'} px-3 py-1.5 rounded-lg border font-bold uppercase tracking-widest transition-colors`}
              >
                {autoLogout ? 'OFF-KAN' : 'ON-KAN'}
              </button>
            </div>

            {/* Tactical Chronometer Clock Sidebar Footer */}
            <div className="mt-4 p-4 mx-3 bg-slate-50 dark:bg-[#020617] rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
              <div className="text-left">
                <p className="text-[8px] font-black text-slate-500 dark:text-cyan-400 tracking-wider uppercase">TACTICAL CHRONO</p>
                <p className="text-lg font-mono font-black text-slate-900 dark:text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)] mt-0.5">
                  {formatTimeString(currentTime)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold text-slate-500 font-mono">
                  {currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }).toUpperCase()}
                </span>
                <span className="block text-[8px] font-bold text-emerald-500 animate-pulse mt-0.5">● LIVE SYNC</span>
              </div>
            </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col relative w-full h-full overflow-hidden print:hidden">
        
        {/* Persistent Tactical Status Bar */}
        <div className="flex-none p-3 px-6 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#020617]/95 backdrop-blur-md z-40 flex justify-between items-center hidden md:flex mt-16 md:mt-0 shadow-lg shadow-black/5">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] opacity-60">System Status:</span>
                 <span className={`flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-full border ${isOnline ? 'bg-emerald-950/40 text-emerald-500 border-emerald-900/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'bg-red-950/40 text-red-500 border-red-900/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]'}`}>
                   <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                   {isOnline ? 'DATABASE ONLINE' : 'DATABASE OFFLINE (LOKAL)'}
                 </span>
              </div>
              
              <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-800 pl-6 group">
                 <Wifi size={12} className={isOnline ? "text-emerald-500" : "text-red-500"} />
                 <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Net: {isOnline ? 'Stable' : 'Unstable'}</span>
              </div>
              
              <div className="flex items-center gap-2 border-l border-slate-300 dark:border-slate-800 pl-6">
                 <Cpu size={12} className="text-blue-500" />
                 <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Core: V5.2-Alpha</span>
              </div>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                 <p className="text-[11px] font-mono font-bold text-slate-900 dark:text-emerald-400 tracking-tighter bg-slate-200 dark:bg-slate-950/80 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-800">
                    {currentTime.toLocaleTimeString('id-ID')}
                 </p>
              </div>
           </div>
        </div>
         <div className="flex-1 overflow-y-auto px-4 md:px-6 pt-6 pb-12 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
                        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden animate-pulse shadow-[0_4px_20px_rgba(239,68,68,0.1)] dark:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                           <div className="flex items-start gap-4">
                               <div className="p-3 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                                  <AlertTriangle size={28} className="text-red-500" />
                               </div>
                               <div>
                                 <h3 className="text-red-700 dark:text-red-500 font-black uppercase tracking-widest text-sm md:text-base">PERINGATAN ALARM: ASET OVERDUE!</h3>
                                 <p className="text-red-600/80 dark:text-red-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                                   TERDAPAT {overdueItems.length} ASET YANG BELUM DIKEMBALIKAN MELEWATI BATAS WAKTU ALARM.
                                 </p>
                               </div>
                           </div>
                           <div className="mt-4 bg-white dark:bg-[#020617]/50 rounded-xl border border-red-200 dark:border-red-900/40 p-4 shadow-sm dark:shadow-none">
                              <p className="text-[10px] font-black text-red-700 dark:text-red-500 mb-2 uppercase tracking-widest border-b border-red-200 dark:border-red-900/30 pb-2">Daftar Aset Overdue:</p>
                              <ul className="space-y-2">
                                {overdueItems.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-center text-xs font-mono">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span className="text-red-600 dark:text-red-400 font-bold uppercase">{item.name} <span className="text-red-400 dark:text-red-900 ml-2">[{item.id}]</span></span>
                                        <button onClick={() => handleSetAlarm(item.id)} className="bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-500 hover:bg-orange-200 dark:hover:bg-orange-600 hover:text-orange-900 dark:hover:text-slate-900 border border-orange-300 dark:border-orange-900 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 w-fit shadow-sm dark:shadow-none">
                                           <BellRing size={10} /> Atur Ulang Alarm
                                        </button>
                                    </div>
                                    <span className="text-orange-500 font-bold uppercase">PEMEGANG: {item.holder}</span>
                                  </li>
                                ))}
                              </ul>
                           </div>
                        </div>
                      )}
                      
                      {borrowedItems.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-700/50 p-6 md:p-8 rounded-[30px] flex flex-col gap-4 relative overflow-hidden shadow-[0_4px_20px_rgba(249,115,22,0.1)] dark:shadow-[0_0_10px_rgba(249,115,22,0.1)]">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                           <div className="flex items-start gap-4">
                               <div className="p-3 bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/80 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                                  <AlertTriangle size={28} className="text-orange-500" />
                               </div>
                               <div>
                                 <h3 className="text-orange-700 dark:text-orange-500 font-black uppercase tracking-widest text-sm md:text-base">PEMBERITAHUAN: ASET SEDANG DI LUAR GUDANG</h3>
                                 <p className="text-orange-600/80 dark:text-orange-400/80 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                                   TERDAPAT {borrowedItems.length} ASET YANG SEDANG DIPINJAM ATAU DI LUAR GUDANG SAAT INI.
                                 </p>
                               </div>
                           </div>
                           <div className="mt-4 bg-white dark:bg-[#020617]/50 rounded-xl border border-orange-200 dark:border-orange-900/40 p-4 shadow-sm dark:shadow-none">
                              <p className="text-[10px] font-black text-orange-700 dark:text-orange-500 mb-2 uppercase tracking-widest border-b border-orange-200 dark:border-orange-900/30 pb-2">Daftar Aset Keluar (Dipinjam):</p>
                              <ul className="space-y-2">
                                {borrowedItems.map((item, idx) => (
                                  <li key={idx} className="flex justify-between items-center text-xs font-mono">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span className="text-orange-600 dark:text-orange-400 font-bold uppercase">{item.name} <span className="text-orange-400 dark:text-orange-900 ml-2">[{item.id}]</span></span>
                                        <button onClick={() => handleSetAlarm(item.id)} className="bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-500 hover:bg-orange-200 dark:hover:bg-orange-600 hover:text-orange-900 dark:hover:text-slate-900 border border-orange-300 dark:border-orange-900 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 w-fit shadow-sm dark:shadow-none">
                                           <BellRing size={10} /> Set Alarm
                                        </button>
                                    </div>
                                    <span className="text-orange-300 font-bold uppercase text-right">PEMEGANG: {item.holder}</span>
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
                  <div className="bg-slate-50 dark:bg-[#020617]/60 border border-slate-300 dark:border-slate-700/50 p-6 md:p-8 rounded-[30px] flex items-start gap-4 relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                     <div className="p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-2xl flex-shrink-0 cyber-cut mt-1">
                        <ShieldCheck size={28} className="text-emerald-500" />
                     </div>
                     <div>
                       <h3 className="text-emerald-500 font-black uppercase tracking-widest text-sm md:text-base">KONDISI GUDANG TERKENDALI</h3>
                       <p className="text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 leading-relaxed">
                         SELURUH ASET TERDAFTAR SAAT INI BERADA DI DALAM PENYIMPANAN ATAU DALAM KEADAAN AMAN.
                       </p>
                     </div>
                  </div>
                );
             })()}
             
             <div className="flex justify-between items-start">
               <div className="flex flex-col">
                   <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase leading-[0.8] relative group cursor-default">
                     <span className="text-emerald-500/10 text-3xl md:text-5xl mr-2 absolute -left-8 md:-left-12 top-0 pointer-events-none select-none">[</span>
                     COMMAND<br/>CENTER
                     <span className="text-emerald-500/20 text-3xl md:text-5xl ml-2 absolute -right-8 md:-right-12 bottom-0 pointer-events-none select-none">]</span>
                   </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2 border-l-2 border-emerald-500 pl-3">Sistem Kendali Inventaris Taktis V5.2</p>
               </div>
               
               {/* Top Right Badges & Bell */}
               <div className="hidden md:flex flex-col items-end gap-3">
                  <div className="flex items-center gap-4 border border-slate-200 dark:border-slate-800 rounded-full px-3 py-1 bg-white dark:bg-slate-900/50 relative">
                     <span className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                       ONLINE
                     </span>
                     <span className="w-[1px] h-3 bg-slate-700"></span>
                     <span className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                       DB SYNCED
                     </span>
                     {/* Decorative corners */}
                     <span className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-emerald-500/50"></span>
                     <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-emerald-500/50"></span>
                  </div>
                  <button className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border-2 border-slate-200 dark:border-slate-800 block"></span>
                  </button>
               </div>
             </div>

             {/* Functional Buttons Grid */}
             <div className="flex flex-wrap gap-3 mt-6">
                 <button onClick={() => setActiveTab('scanner')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-emerald-50 dark:bg-emerald-900/40 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-lg dark:shadow-emerald-900/20">
                     <ScanIcon size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">SCAN<br/>MUTASI</span>
                 </button>
                 <button onClick={() => setActiveTab('inventory')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
                     <Package size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">DATA<br/>ASET</span>
                 </button>
                 <button onClick={() => setActiveTab('add')} className="flex flex-col items-center justify-center w-[100px] h-20 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
                     <PlusSquare size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">BARANG<br/>BARU</span>
                 </button>
                 <button onClick={handleExportExcel} className="flex flex-col items-center justify-center w-[100px] h-20 bg-teal-50 dark:bg-emerald-900/30 hover:bg-teal-100 dark:hover:bg-emerald-800/40 border border-teal-200 dark:border-emerald-900/50 text-teal-700 dark:text-emerald-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
                     <Download size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">EXPORT</span>
                 </button>
                 <button onClick={() => excelInputRef.current?.click()} className="flex flex-col items-center justify-center w-[100px] h-20 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-800/40 border border-orange-200 dark:border-orange-900/50 text-orange-700 dark:text-orange-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
                     <Upload size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">IMPORT</span>
                 </button>
                 <button onClick={handleBackupDB} className="flex flex-col items-center justify-center w-[100px] h-20 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-800/40 border border-purple-200 dark:border-purple-900/50 text-purple-700 dark:text-purple-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
                     <Database size={20} className="mb-2" />
                     <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">BACKUP<br/>DB</span>
                 </button>
                 <button onClick={triggerRestore} className="flex flex-col items-center justify-center w-[100px] h-20 bg-pink-50 dark:bg-pink-900/30 hover:bg-pink-100 dark:hover:bg-pink-800/40 border border-pink-200 dark:border-pink-900/50 text-pink-700 dark:text-pink-500 rounded-lg cyber-cut transition-colors shadow-sm dark:shadow-none">
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
             </div>

             {/* Static Dashboard Layout */}
             <div className="space-y-6 mt-6 pb-20">
                {dashboardLayout.map((widgetId) => (
                   <motion.div 
                     key={widgetId} 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.4 }}
                     className="relative z-0 group"
                   >
                      {widgetId === 'metrics' && (
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <MetricsWidget inventory={inventory} dashboardListType={dashboardListType} setDashboardListType={setDashboardListType} />
                         </div>
                      )}

                      {widgetId === 'chart' && (
                         <ChartWidget chartData={chartData} />
                      )}

                      {widgetId === 'pie' && (
                         <PieWidget />
                      )}

                      {widgetId === 'logs' && (
                         <LogsWidget logs={logs} />
                      )}
                   </motion.div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'scanner' && (
          <div className="max-w-2xl mx-auto py-10 space-y-6 animate-in fade-in">
             <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-600/20 cyber-cut">
                    <ScanIcon size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em]">[ SIAP MENERIMA INPUT SCANNER HARDWARE & MANUAL ]</p>
              </div>

              {/* Manual Input Container */}
              <form onSubmit={(e) => {
                  e.preventDefault();
                  handleScanCode(scanInput);
                  setScanInput("");
              }}>
                <div className="glass-effect rounded-[30px] border border-slate-300 dark:border-slate-700 p-2 focus-within:border-emerald-500 relative overflow-hidden bg-white dark:bg-[#020617] hud-card shadow-sm dark:shadow-none">
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
                      className="w-full bg-white dark:bg-[#020617] p-8 rounded-[24px] text-xl font-mono font-bold text-emerald-500 dark:text-emerald-400 outline-none text-center uppercase tracking-widest relative z-20 shadow-sm dark:shadow-none" 
                      placeholder="KETIK / SCAN BARCODE DI SINI..." 
                    />
                </div>
              </form>

              {/* Holder Input Container */}
              <div className="mt-4 flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={holderInput}
                  onChange={(e) => setHolderInput(e.target.value)}
                  placeholder="NAMA PEMBAWA ASET (PEMINJAMAN)"
                  className="flex-1 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 rounded-[16px] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500/50 transition-colors shadow-sm dark:shadow-none"
                />
                <div className="relative w-full sm:w-48 shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={overdueHoursInput}
                    onChange={(e) => setOverdueHoursInput(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="JAM"
                    className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 p-4 pr-12 rounded-[16px] text-xs font-mono font-bold text-slate-700 dark:text-slate-300 outline-none uppercase tracking-widest text-center focus:border-emerald-500/50 transition-colors appearance-none shadow-sm dark:shadow-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 pointer-events-none">JAM ALARM</span>
                </div>
              </div>

              {/* Advanced Scan Buttons */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   <div className="flex items-center justify-center gap-4 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <label className="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" checked={rapidScan} onChange={(e) => setRapidScan(e.target.checked)} className="sr-only peer" />
                         <div className="w-9 h-5 bg-slate-400 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                      <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">RAPID SCAN MODE</span>
                   </div>
                   <button 
                     onClick={() => setCameraActive(!cameraActive)}
                     className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-900/50 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-sm dark:shadow-none btn-interact group"
                   >
                      <Camera size={18} className="group-hover:scale-110 transition-transform" /> AKTIFKAN KAMERA
                   </button>
                   <button 
                     onClick={() => handlePrint({ type: 'logs-today' })}
                     className="flex items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 border border-blue-200 dark:border-blue-900/50 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all shadow-sm dark:shadow-none btn-interact group sm:col-span-2 lg:col-span-1"
                   >
                      <Printer size={18} className="group-hover:scale-110 transition-transform" /> CETAK MUTASI HARI INI
                   </button>
              </div>

              {/* Actual mobile scanner view using html5-qrcode */}
              {cameraActive && (
                <div className="mt-6 bg-slate-50 dark:bg-[#020617] border-2 border-emerald-500/50 rounded-[24px] p-6 text-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <div id="reader" className="w-full mx-auto overflow-hidden rounded-[16px] mb-4" />
                  <button 
                    onClick={() => setCameraActive(false)}
                    className="bg-red-900/50 text-red-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-slate-900 dark:text-white border border-red-500/50"
                  >
                    Tutup Kamera
                  </button>
                </div>
              )}

              {/* Session Logs Panel */}
              <div className="mt-10 space-y-4">
                {/* Today's log panel */}
                <div className="bg-white dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden shadow-sm dark:shadow-none">
                   <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800/50">
                      <div className="flex items-center gap-3 flex-1">
                         <Calendar size={14} className="text-emerald-500" />
                         <input 
                           type="text"
                           value={sessionNameInput}
                           onChange={(e) => setSessionNameInput(e.target.value)}
                           placeholder="KETIK NAMA SESI OPERASIONAL..."
                           className="bg-transparent border-none text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest outline-none w-full"
                         />
                      </div>
                      <button onClick={() => handlePrint({ type: 'logs-today' })} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                        <Printer size={14} />
                      </button>
                   </div>
                   <div className={`p-4 ${logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length === 0 ? "py-16 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDYxMjI1Ij48L3JlY3Q+CjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIxIiBmaWxsPSIjMWUxZTJkIj48L2NpcmNsZT4KPC9zdmc+')]":""}`}>
                      {logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">BELUM ADA RIWAYAT OPERASIONAL HARI INI.</p>
                      ) : (
                        <div className="space-y-3">
                          {logs.filter(l => l.fullDate === new Date().toLocaleDateString('id-ID')).map((log, idx) => (
                            <div key={idx} className="grid grid-cols-[80px_1fr_80px] items-start gap-3 text-[11px] border-b border-slate-200 dark:border-slate-800/50 pb-2.5 mb-2 last:border-0 last:pb-0 last:mb-0">
                               <span className="font-mono text-emerald-500 font-bold mt-0.5">{log.time.split(' ').pop()}</span>
                               <div className="flex flex-col min-w-0">
                                 <span className="font-black text-slate-900 dark:text-white uppercase truncate">{log.name}</span>
                                 <div className="flex items-center gap-2 mt-0.5 opacity-70">
                                   <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight truncate">PEMEGANG: {log.holder && log.holder !== '-' ? log.holder : 'SISTEM'}</span>
                                 </div>
                               </div>
                               <div className="flex justify-end">
                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border min-w-[75px] text-center shadow-sm ${log.status === 'Keluar' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                                   {log.status === 'Keluar' ? 'KELUAR' : 'MASUK'}
                                 </span>
                               </div>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>
                </div>

                {/* Yesterday's log panel */}
                <div className="bg-white dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800 rounded-[20px] overflow-hidden shadow-sm dark:shadow-none">
                   <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800/50">
                      <div className="flex items-center gap-3">
                         <History size={14} className="text-slate-600 dark:text-slate-400" />
                         <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">HISTORY KEMARIN</span>
                      </div>
                      <button onClick={() => handlePrint({ type: 'logs-yesterday' })} className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">
                        <Printer size={14} />
                      </button>
                   </div>
                   <div className={`p-4 ${logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).length === 0 ? "py-16 text-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMDYxMjI1Ij48L3JlY3Q+CjxjaXJjbGUgY3g9IjMiIGN5PSIzIiByPSIxIiBmaWxsPSIjMWUxZTJkIj48L2NpcmNsZT4KPC9zdmc+')]":""}`}>
                      {logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).length === 0 ? (
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">TIDAK ADA DATA OPERASIONAL KEMARIN.</p>
                      ) : (
                        <div className="space-y-3">
                          {logs.filter(l => { const y = new Date(); y.setDate(y.getDate() - 1); return l.fullDate === y.toLocaleDateString('id-ID'); }).map((log, idx) => (
                            <div key={idx} className="grid grid-cols-[80px_1fr_80px] items-start gap-3 text-[11px] border-b border-slate-200 dark:border-slate-800/50 pb-2.5 mb-2 last:border-0 last:pb-0 last:mb-0">
                               <span className="font-mono text-emerald-500 font-bold mt-0.5">{log.time.split(' ').pop()}</span>
                               <div className="flex flex-col min-w-0">
                                 <span className="font-black text-slate-900 dark:text-white uppercase truncate">{log.name}</span>
                                 <div className="flex items-center gap-2 mt-0.5 opacity-70">
                                   <span className="text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight truncate">PEMEGANG: {log.holder && log.holder !== '-' ? log.holder : 'SISTEM'}</span>
                                 </div>
                               </div>
                               <div className="flex justify-end">
                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border min-w-[75px] text-center shadow-sm ${log.status === 'Keluar' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                                   {log.status === 'Keluar' ? 'KELUAR' : 'MASUK'}
                                 </span>
                               </div>
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
                 <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase"><span className="text-emerald-500/50 mr-2">[</span>Inventaris Aset<span className="text-emerald-500/50 ml-2">]</span></h2>
                 
                 <div className="flex gap-2">
                   <button className="bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-slate-100 dark:bg-slate-800" onClick={handleExportExcel}>
                     <Download size={16} /> Export Excel
                   </button>
                   <button className="bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-slate-100 dark:bg-slate-800" onClick={() => excelInputRef.current?.click()}>
                     <Upload size={16} /> Import Excel
                   </button>
                   <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />

                   <button className="bg-emerald-600 text-slate-900 dark:text-white px-4 py-2 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-emerald-500" onClick={() => {
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
              <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[30px] border border-slate-200 dark:border-slate-800 bg-carbon overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                      <button 
                         onClick={() => {
                            const displayedIds = inventory
                               .filter(item => (item.name || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.id || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.serial || "").toLowerCase().includes((inventorySearch || "").toLowerCase()))
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
                         className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/50 flex-shrink-0 hover:bg-emerald-950/40 transition-colors"
                      >
                         <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${(() => {
                             const displayedIds = inventory
                               .filter(item => (item.name || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.id || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.serial || "").toLowerCase().includes((inventorySearch || "").toLowerCase()))
                               .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                               .map(i => i.id);
                             return displayedIds.length > 0 && displayedIds.every(id => selectedItems.includes(id));
                         })() ? 'border-emerald-500 bg-emerald-500' : 'border-emerald-500/50'}`}>
                             {(() => {
                                 const displayedIds = inventory
                                   .filter(item => (item.name || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.id || "").toLowerCase().includes((inventorySearch || "").toLowerCase()) || (item.serial || "").toLowerCase().includes((inventorySearch || "").toLowerCase()))
                                   .filter(item => inventoryCategoryFilter === "ALL" || item.category === inventoryCategoryFilter)
                                   .map(i => i.id);
                                 return displayedIds.length > 0 && displayedIds.every(id => selectedItems.includes(id));
                             })() && <div className="w-2.5 h-2.5 bg-slate-50 dark:bg-[#020617] rounded-sm"></div>}
                         </div> 
                      </button>
                      <div className="relative flex-1 w-full">
                          <input 
                            type="text" 
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            placeholder="CARI ASET..." 
                            className="w-full bg-white dark:bg-[#020617] border border-slate-200 dark:border-slate-800 pl-12 shadow-sm pr-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-colors text-slate-900 dark:text-white" 
                          />
                          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400" />
                      </div>
                      {/* Overdue Quick Filter Button */}
                      <button
                        type="button"
                        onClick={() => setOnlyOverdueFilter(!onlyOverdueFilter)}
                        className={`shadow-[0_2px_10px_rgba(0,0,0,0.02)] px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest outline-none flex items-center justify-center gap-2 border w-full md:w-auto transition-all cursor-pointer ${
                          onlyOverdueFilter
                            ? "bg-rose-600 text-white border-rose-600 dark:bg-rose-500 hover:bg-rose-500 dark:hover:bg-rose-450 shadow-[0_0_12px_rgba(244,63,94,0.4)]"
                            : "bg-slate-50 dark:bg-[#020617]/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        <AlertTriangle size={14} className={onlyOverdueFilter ? "animate-pulse" : ""} />
                        <span>OVERDUE ({inventory.filter(i => i.status === 'Keluar' && i.dueDate && Date.now() > i.dueDate).length})</span>
                      </button>

                      <select 
                        value={inventoryCategoryFilter}
                        onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                        className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-black text-emerald-500 uppercase tracking-widest outline-none w-full md:w-auto"
                      >
                         <option value="ALL">SEMUA KATEGORI</option>
                         {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <select 
                        value={inventorySort}
                        onChange={(e) => setInventorySort(e.target.value as any)}
                        className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-black text-emerald-500 uppercase tracking-widest outline-none w-full md:w-auto"
                      >
                         <option value="newest">TERBARU TERLEBIH DAHULU</option>
                         <option value="oldest">TERLAMA TERLEBIH DAHULU</option>
                      </select>
                      <select 
                        value={printLayout}
                        onChange={(e) => setPrintLayout(e.target.value as any)}
                        className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-black text-emerald-500 uppercase tracking-widest outline-none w-full md:w-auto"
                      >
                         <option value="auto">LAYOUT: AUTO (CERDAS)</option>
                         <option value="normal">LAYOUT: NORMAL</option>
                         <option value="compact">LAYOUT: COMPACT</option>
                      </select>
                      <button 
                        onClick={() => {
                           if(selectedItems.length === 0) { alert('Pilih aset yang ingin dicetak'); return; }
                           let isCompact = printLayout === 'compact';
                           if(printLayout === 'auto') {
                               isCompact = selectedItems.length > 21; // automatically use compact layout for > 21 items (approximately fitting standard A4 sizes nicely)
                           }
                           handlePrint({ type: 'inventory-selection', ids: selectedItems, compact: isCompact });
                        }}
                        disabled={selectedItems.length === 0}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Printer size={14} /> A4 CETAK
                      </button>
                      <button 
                        onClick={() => {
                           if(selectedItems.length === 0) { alert('Pilih aset yang ingin dicetak'); return; }
                           handlePrint({ type: 'barcode-roll', ids: selectedItems });
                        }}
                        disabled={selectedItems.length === 0}
                        className="bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 border border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Printer size={14} /> BARCODE (ROLL) {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
                      </button>
                  </div>
                  <div className="overflow-x-auto bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:bg-[#020617] rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left min-w-[800px]">
                          <thead className="bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-800">
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
                              {filteredInventory
                                .sort((a, b) => inventorySort === 'newest' ? new Date(b.date).getTime() - new Date(a.date).getTime() : new Date(a.date).getTime() - new Date(b.date).getTime())
                                .slice((inventoryPage - 1) * 10, inventoryPage * 10)
                                .map((item, i) => {
                                  const isOverdue = item.status === 'Keluar' && item.dueDate && Date.now() > item.dueDate;
                                  const isSelected = selectedItems.includes(item.id);
                                  return (
                                  <tr key={item.id} className={`inventory-row transition-colors cursor-pointer ${isSelected ? 'bg-emerald-900/20' : 'hover:bg-slate-200 dark:hover:bg-slate-800/50'}`} onClick={() => setViewingItem(item)}>
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
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.name}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{item.category}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">{item.serial}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">{item.popor}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{item.holder}</p>
                                      </td>
                                      <td className="p-4 flex flex-col items-start justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <span className={`status-badge ${item.status === 'Di Gudang' ? 'status-gudang' : 'status-keluar'}`}>{item.status}</span>
                                        {isOverdue && <span className="text-[9px] font-black uppercase text-red-500 mt-1 animate-pulse border border-red-500/50 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(239,68,68,0.5)]">OVERDUE</span>}
                                        {!isOverdue && item.status === 'Keluar' && item.dueDate && <span className="text-[8px] font-mono text-orange-400 mt-1">Due: {new Date(item.dueDate).toLocaleTimeString('id-ID')}</span>}
                                        {item.status === 'Keluar' && (
                                           <button onClick={() => handleSetAlarm(item.id)} className="bg-orange-600/20 text-orange-500 hover:bg-orange-600 hover:text-slate-900 dark:text-white border border-orange-900 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-colors inline-flex items-center gap-1 mt-1">
                                               <BellRing size={10} /> Set Alarm
                                           </button>
                                        )}
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase">{item.date}</p>
                                      </td>
                                      <td className="p-4">
                                        <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-[120px] truncate">{item.note}</p>
                                      </td>
                                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-2">
                                          <button 
                                            onClick={() => setViewingItem(item)}
                                            title="Info Detail"
                                            className="bg-slate-50 dark:bg-[#020617] border border-blue-900/50 text-blue-500 hover:bg-blue-900/30 hover:text-slate-900 dark:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <FileText size={14} />
                                          </button>
                                          <button 
                                            onClick={() => setEditingItem(item)}
                                            title="Edit Aset"
                                            className="bg-slate-50 dark:bg-[#020617] border border-orange-900/50 text-orange-500 hover:bg-orange-900/30 hover:text-slate-900 dark:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <Settings size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handlePrint({ type: 'inventory-selection', ids: [item.id] })}
                                            title="Cetak A4"
                                            className="bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <Printer size={14} />
                                          </button>
                                          <button 
                                            onClick={() => handlePrint({ type: 'barcode-roll', ids: [item.id] })}
                                            title="Cetak Label Roll"
                                            className="bg-orange-50 dark:bg-[#020617] border border-orange-300 dark:border-orange-900/50 text-orange-600 dark:text-orange-500 hover:bg-orange-100 dark:bg-orange-900/30 hover:text-orange-700 dark:text-orange-400 px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors flex items-center justify-center font-mono gap-1"
                                          >
                                            <Printer size={14} /> ROLL
                                          </button>
                                          <button 
                                            onClick={() => handleIndividualDelete(item.id)}
                                            title="Hapus Aset"
                                            className="bg-slate-50 dark:bg-[#020617] border border-red-900/50 text-red-500 hover:bg-red-900/30 hover:text-slate-900 dark:text-white px-2 py-2 rounded-lg text-[9px] font-black uppercase transition-colors"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </td>
                                  </tr>
                                  );
                              })}
                              {filteredInventory.length === 0 && <tr><td colSpan={11} className="p-10 text-center text-slate-600 dark:text-slate-400 font-bold uppercase text-xs">Aset tidak ditemukan atau filter tidak mencocokkan apa pun.</td></tr>}
                          </tbody>
                      </table>
                  </div>
                  {(() => {
                      const totalAssets = filteredInventory.length;
                      const totalPages = Math.ceil(totalAssets / 10);
                      
                      if (totalPages <= 1) return null;
                      
                      return (
                          <div className="flex justify-between items-center mt-6 p-2 bg-slate-50 dark:bg-[#020617]/50 rounded-xl border border-slate-200 dark:border-slate-800/50">
                              <button 
                                onClick={() => setInventoryPage(p => Math.max(1, p - 1))} 
                                disabled={inventoryPage === 1}
                                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
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
                                           {prev && pageNum - prev > 1 && <span className="text-slate-600 dark:text-slate-400 px-1 font-bold text-xs">...</span>}
                                           <button 
                                             onClick={() => setInventoryPage(pageNum)}
                                             className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-md text-xs font-black transition-colors border ${inventoryPage === pageNum ? 'bg-emerald-600 text-slate-900 dark:text-white border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white'}`}
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
                                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
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
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Registrasi Aset Baru<span className="text-emerald-500/50 ml-2">]</span></h2>
              <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 bg-carbon">
                 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                   <p className="text-slate-600 dark:text-slate-400 text-sm text-center md:text-left">Formulir pendaftaran aset baru (Senjata/Amunisi/Kendaraan) ke dalam sistem inventaris.</p>
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
                       <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Nama Pemegang / Penanggung Jawab</label>
                       <input value={addForm.holder} onChange={e=>setAddForm({...addForm, holder: e.target.value})} type="text" className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NAMA PEMEGANG" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Nama Barang / Senjata</label>
                       <input value={addForm.name} onChange={e=>setAddForm({...addForm, name: e.target.value})} type="text" className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NAMA BARANG" />
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">SKU / Barcode ID</label>
                        <input value={addForm.sku} onChange={e=>setAddForm({...addForm, sku: e.target.value})} type="text" className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm font-mono uppercase focus:border-emerald-500 outline-none" placeholder="ISI KODE SKU (CONTOH: 1, 2, 250, SN-001)" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                         <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Kategori</label>
                         <select value={addForm.category} onChange={e=>setAddForm({...addForm, category: e.target.value})} className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none appearance-none">
                            {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="CUSTOM">+ TAMBAH KATEGORI BARU...</option>
                         </select>
                         {addForm.category === 'CUSTOM' && (
                           <input value={addForm.customCategory} onChange={e=>setAddForm({...addForm, customCategory: e.target.value})} type="text" className="w-full mt-3 bg-white dark:bg-slate-900 border border-emerald-800 rounded-xl p-4 text-emerald-400 text-sm uppercase focus:border-emerald-500 outline-none" placeholder="KETIK KATEGORI BARU" />
                         )}
                        </div>
                        <div>
                           <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Nomor Popor Senjata</label>
                           <input value={addForm.popor} onChange={e=>setAddForm({...addForm, popor: e.target.value})} type="text" className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NO POPOR (OPSIONAL)" />
                        </div>
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Nomor Seri Pabrik (S/N)</label>
                       <input value={addForm.serial} onChange={e=>setAddForm({...addForm, serial: e.target.value})} type="text" className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="NOMOR SERI" />
                     </div>
                     <div>
                       <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Keterangan / Kondisi</label>
                       <textarea value={addForm.note} onChange={e=>setAddForm({...addForm, note: e.target.value})} rows={2} className="w-full mt-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-sm uppercase focus:border-emerald-500 outline-none" placeholder="KETERANGAN (OPSIONAL)"></textarea>
                     </div>
                 </div>
                 <button onClick={handleAddItem} className="w-full mt-8 bg-emerald-600 text-slate-900 dark:text-white font-black text-sm uppercase tracking-widest p-4 py-5 rounded-xl hover:bg-emerald-500 flex items-center justify-center gap-2 shadow-xl shadow-emerald-900/20 cyber-cut">SIMPAN DATA ASET</button>
              </div>
          </div>
        )}

        {activeTab === 'opname' && (
          <div className="max-w-6xl mx-auto py-10 animate-in fade-in">
              {!opnameSession?.active ? (
                <div className="text-center max-w-4xl mx-auto">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase mb-6"><span className="text-emerald-500/50 mr-2">[</span>Stock Opname Fisik<span className="text-emerald-500/50 ml-2">]</span></h2>
                  <div className="bg-white dark:bg-[#1e293b] p-8 md:p-14 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-2xl bg-carbon relative overflow-hidden">
                      <ClipboardCheck className="absolute -top-10 -right-10 w-64 h-64 text-slate-800/20 z-0 pointer-events-none" />
                      <ClipboardCheck className="w-16 h-16 md:w-20 md:h-20 text-emerald-500 mx-auto mb-6 relative z-10" />
                      <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto font-medium text-xs md:text-sm leading-relaxed relative z-10">
                          Fitur Stock Opname Fisik dirancang khusus untuk keperluan <span className="font-bold text-slate-900 dark:text-white">Audit Berkala</span>. Sistem akan secara otomatis mengkalkulasi ketersediaan aset secara real-time:
                      </p>
                      <div className="bg-slate-50 dark:bg-[#020617]/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 text-left max-w-2xl mx-auto mb-8 text-xs font-bold space-y-3 relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                          <p className="text-emerald-400"><span className="text-emerald-500 font-black">1. Aset Diharapkan:</span> <span className="text-slate-600 dark:text-slate-400">Barang yang berstatus 'Di Gudang' (wajib discan).</span></p>
                          <p className="text-blue-400"><span className="text-blue-500 font-black">2. Sedang Dipinjam:</span> <span className="text-slate-600 dark:text-slate-400">Barang berstatus 'Keluar' (diabaikan dari audit).</span></p>
                          <p className="text-emerald-300"><span className="text-emerald-400 font-black">3. Aset Cocok:</span> <span className="text-slate-600 dark:text-slate-400">Fisik barang yang berhasil diverifikasi scanner.</span></p>
                          <p className="text-red-400"><span className="text-red-500 font-black">4. Selisih (Missing):</span> <span className="text-red-900 font-bold">Barang terdata namun fisiknya belum ditemukan di gudang.</span></p>
                          <p className="text-orange-400"><span className="text-orange-500 font-black">5. Ekstra / Tidak Dikenal:</span> <span className="text-orange-900 font-bold">Barcode asing / tak terdaftar terdeteksi.</span></p>
                      </div>
                      <button onClick={startOpname} className="btn-interact cyber-cut bg-emerald-600 text-slate-900 dark:text-white px-8 py-5 rounded-2xl font-black uppercase text-sm tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 relative z-10">MULAI SESI OPNAME SEKARANG</button>
                  </div>
                </div>
              ) : (
                <div>
                   <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase"><span className="text-emerald-500/50 mr-2">[</span>Sesi Opname Sedang Berjalan<span className="text-emerald-500/50 ml-2">]</span></h2>
                     <button onClick={() => setOpnameSession(null)} className="btn-interact cyber-cut bg-red-600 text-slate-900 dark:text-white px-6 py-3 font-black uppercase tracking-widest hover:bg-red-500 text-xs shadow-lg flex items-center gap-2"><X size={16} /> Akhiri Sesi</button>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       <div className="bg-slate-50 dark:bg-[#020617] p-5 rounded-[20px] border border-slate-200 dark:border-slate-800 text-center"><p className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest mb-1">Diharapkan (In)</p><p className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{opnameSession.expected.length}</p></div>
                       <div className="bg-slate-50 dark:bg-[#020617] p-5 rounded-[20px] border border-blue-900/50 text-center"><p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1">Sedang Dipinjam</p><p className="text-2xl md:text-3xl font-black text-blue-400">{opnameSession.out.length}</p></div>
                       <div className="bg-emerald-950/20 p-5 rounded-[20px] border border-emerald-900/50 text-center shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]"><p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mb-1">Berhasil Discan</p><p className="text-2xl md:text-3xl font-black text-emerald-400">{opnameSession.scanned.length}</p></div>
                       <div className="bg-red-950/20 p-5 rounded-[20px] border border-red-900/50 text-center shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]"><p className="text-[9px] text-red-500 font-black uppercase tracking-widest mb-1">Missing / Belum Ditemukan</p><p className="text-2xl md:text-3xl font-black text-red-400">{opnameSession.expected.length - opnameSession.scanned.length}</p></div>
                   </div>
                   <div className="bg-slate-50 dark:bg-[#020617] p-6 rounded-[30px] border border-slate-300 dark:border-slate-700 mb-8 relative">
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
                           className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 p-6 rounded-2xl text-emerald-400 font-mono font-bold outline-none uppercase text-center text-xl tracking-widest focus:border-emerald-500 transition-colors shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]" 
                         />
                       </form>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                       <div className="bg-slate-50 dark:bg-[#020617] p-6 rounded-[30px] border border-red-900/50">
                          <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4">Belum Ditemukan ({opnameSession.expected.filter(v => !opnameSession.scanned.includes(v)).length})</h3>
                          <ul className="space-y-2">
                             {opnameSession.expected.filter(v => !opnameSession.scanned.includes(v)).map(id => (
                               <li key={id} className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl flex justify-between text-red-400 font-mono text-xs">{id} <span>{inventory.find(i=>i.id===id)?.name}</span></li>
                             ))}
                          </ul>
                       </div>
                       <div className="bg-slate-50 dark:bg-[#020617] p-6 rounded-[30px] border border-orange-900/50">
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
          <div className="max-w-5xl mx-auto py-10 animate-in fade-in transition-all">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase text-center mb-8">
                <span className="text-emerald-500/50 mr-2">[</span>Papan Kinerja Taktis<span className="text-emerald-500/50 ml-2">]</span>
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Metric Card 1 */}
                <div className="bg-white dark:bg-[#1e293b]/55 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                  <span className="absolute top-3 left-3 w-2 h-2 border-t border-l border-cyan-500"></span>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Operasi Log</p>
                  <p className="text-4xl font-black text-slate-900 dark:text-white mt-2 font-mono">{logs.length}</p>
                  <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase">● Seluruh Waktu</p>
                </div>
                {/* Metric Card 2 */}
                <div className="bg-white dark:bg-[#1e293b]/55 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                  <span className="absolute top-3 left-3 w-2 h-2 border-t border-l border-emerald-500"></span>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Efisiensi Sistem</p>
                  <p className="text-4xl font-black text-emerald-500 mt-2 font-mono">99.8%</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase">RESPONS MUTASI INSTAN</p>
                </div>
                {/* Metric Card 3 */}
                <div className="bg-white dark:bg-[#1e293b]/55 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                  <span className="absolute top-3 left-3 w-2 h-2 border-t border-l border-purple-500"></span>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Operator Aktif</p>
                  <p className="text-4xl font-black text-purple-400 mt-2 font-mono">{operatorStats.filter(o => o.total > 0).length}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 uppercase">LOGIN VALID</p>
                </div>
                {/* Metric Card 4 */}
                <div className="bg-white dark:bg-[#1e293b]/55 p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                  <span className="absolute top-3 left-3 w-2 h-2 border-t border-l border-amber-500"></span>
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Elite Guardian</p>
                  <p className="text-lg font-black text-amber-500 mt-3 uppercase truncate leading-tight">{holderStats[0]?.name || "N/A"}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-2 uppercase">SCORE: {holderStats[0]?.score || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Operator Productivity Leaderboard */}
                <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 relative overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">Metrik Kecepatan Operator</h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Dihitung otomatis dari beban log mutasi yang ditangani operator.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {operatorStats.map((op, idx) => {
                      const maxTotal = operatorStats[0]?.total || 1;
                      const ratio = Math.round((op.total / maxTotal) * 100);
                      
                      return (
                        <div key={op.name} className="bg-slate-50 dark:bg-[#020617]/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-400 transition-colors">
                          <div className="flex justify-between items-center mb-2.5">
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                {idx + 1}
                              </span>
                              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">{op.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-900 dark:text-cyan-400 font-mono">{op.total} TRANS</span>
                            </div>
                          </div>

                          {/* Horizontal Progress Bar */}
                          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : 'bg-slate-500'}`}
                              style={{ width: `${Math.max(5, ratio)}%` }}
                            ></div>
                          </div>

                          {/* Mutasi Breakdown Segments */}
                          <div className="flex items-center gap-3 text-[9px] font-mono tracking-wide text-slate-400 uppercase mt-1">
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> IN: {op.scansIn}</span>
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> OUT: {op.scansOut}</span>
                            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> ADD: {op.adds}</span>
                          </div>
                        </div>
                      );
                    })}
                    {operatorStats.length === 0 && (
                      <p className="text-center py-8 text-xs text-slate-500 italic uppercase">BELUM ADA DATA OPERASI OPERATOR</p>
                    )}
                  </div>
                </div>

                {/* Peaks of Activity (Siklus Jam Kerja) */}
                <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1">Puncak Aktivitas Gudang</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-6">Analisis waktu operasional penumpukan log checkout dan checkin.</p>
                  </div>

                  <div className="space-y-6">
                    {/* Pagi */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-black mb-1.5 uppercase font-mono">
                        <span className="tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">☀️ PAGI (06:00 - 12:00)</span>
                        <span className="text-cyan-400">{peakHours.pagi} LOGS</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${logs.length > 0 ? (peakHours.pagi / logs.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    {/* Siang */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-black mb-1.5 uppercase font-mono">
                        <span className="tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">🔥 SIANG (12:00 - 18:00)</span>
                        <span className="text-orange-400">{peakHours.siang} LOGS</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${logs.length > 0 ? (peakHours.siang / logs.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    {/* Sore */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-black mb-1.5 uppercase font-mono">
                        <span className="tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">🌇 SORE (18:00 - 24:00)</span>
                        <span className="text-emerald-500">{peakHours.sore} LOGS</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${logs.length > 0 ? (peakHours.sore / logs.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>

                    {/* Malam */}
                    <div>
                      <div className="flex justify-between items-center text-xs font-black mb-1.5 uppercase font-mono">
                        <span className="tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">🌙 MALAM (00:00 - 06:00)</span>
                        <span className="text-purple-400">{peakHours.malam} LOGS</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full" style={{ width: `${logs.length > 0 ? (peakHours.malam / logs.length) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 bg-slate-50 dark:bg-[#020617] border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl text-left font-mono text-[9px] leading-relaxed text-slate-500 max-w-sm">
                    &gt; LOG ANALYSIS SUMMARY: Gudang paling sibuk terjadi pada koridor waktu dengan diagram bar tertinggi. Pastikan ketersediaan personil operator mencukupi.
                  </div>
                </div>

                {/* Leaderboard Personil Tergiat & Reward */}
                <div className="bg-white dark:bg-[#1e293b]/50 backdrop-blur p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 relative overflow-hidden mt-8 lg:col-span-2">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-3">
                        <Trophy className="text-amber-500" /> Prestasi Personil Tergiat
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase">Sistem reward otomatis berdasarkan intensitas mutasi & kedisiplinan.</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl">
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Update Real-time</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {holderStats.map((holder, idx) => {
                       const getTier = (rank: number) => {
                         if (rank === 0) return { label: 'ELITE GUARDIAN', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
                         if (rank < 3) return { label: 'TACTICAL MASTER', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/30' };
                         if (rank < 5) return { label: 'RELIABLE SOLDIER', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' };
                         return { label: 'ACTIVE PERSONNEL', color: 'text-slate-500', bg: 'bg-slate-500/5', border: 'border-slate-500/20' };
                       };
                       const tier = getTier(idx);
                       
                       return (
                         <div key={holder.name} className="group relative bg-slate-50 dark:bg-[#020617]/40 p-5 rounded-[24px] border border-slate-200/60 dark:border-slate-800/80 hover:scale-[1.02] transition-all">
                            <div className="flex justify-between items-start mb-4">
                               <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl ${tier.bg} ${tier.border} border flex items-center justify-center font-black text-xl ${tier.color} shadow-lg shadow-black/20`}>
                                     {idx + 1}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-1 line-clamp-1">{holder.name}</p>
                                     <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em] ${tier.bg} ${tier.color} ${tier.border} border`}>
                                        {tier.label}
                                     </div>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Impact Score</p>
                                  <p className="text-lg font-black text-slate-900 dark:text-white font-mono">{holder.score}</p>
                               </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-3">
                               <div className="bg-white dark:bg-white/5 p-2 rounded-xl text-center">
                                  <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Total</p>
                                  <p className="text-[10px] font-bold text-slate-900 dark:text-white">{holder.total}</p>
                               </div>
                               <div className="bg-white dark:bg-white/5 p-2 rounded-xl text-center border-x border-slate-100 dark:border-white/5">
                                  <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">Hari</p>
                                  <p className="text-[10px] font-bold text-slate-900 dark:text-white">{holder.uniqueDays}</p>
                               </div>
                               <div className="bg-white dark:bg-white/5 p-2 rounded-xl text-center">
                                  <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">In/Out</p>
                                  <p className="text-[10px] font-bold text-emerald-500">{holder.scansIn}/{holder.scansOut}</p>
                               </div>
                            </div>
                            
                            {/* Achievement Bar */}
                             <div className="mt-4 w-full bg-slate-100 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-slate-400 dark:bg-slate-700'}`} 
                                  style={{ width: `${Math.min(100, (holder.score / (holderStats[0]?.score || 1)) * 100)}%` }}
                                ></div>
                             </div>
                         </div>
                       );
                    })}
                  </div>
                  
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 dark:border-slate-800 pt-8">
                     <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500"><Medal size={16} /></div>
                        <p className="text-[9px] leading-tight text-slate-500 dark:text-slate-400 uppercase font-bold"><span className="text-slate-900 dark:text-white">Gold Reward:</span> Sertifikat Penghargaan & Prioritas Pinjam Lanjut.</p>
                     </div>
                     <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-300/10 border border-slate-300/30 flex items-center justify-center text-slate-300"><Medal size={16} /></div>
                        <p className="text-[9px] leading-tight text-slate-500 dark:text-slate-400 uppercase font-bold"><span className="text-slate-900 dark:text-white">Silver Reward:</span> Akses Area Terbatas & Badge Personil Unggul.</p>
                     </div>
                     <div className="flex gap-3 items-center">
                        <div className="w-8 h-8 rounded-full bg-orange-400/10 border border-orange-400/30 flex items-center justify-center text-orange-400"><Medal size={16} /></div>
                        <p className="text-[9px] leading-tight text-slate-500 dark:text-slate-400 uppercase font-bold"><span className="text-slate-900 dark:text-white">Bronze Reward:</span> Rekomendasi Kinerja Bulanan Otomatis.</p>
                     </div>
                  </div>
                </div>

              </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="max-w-4xl mx-auto py-10 animate-in fade-in">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Manajemen Akses<span className="text-emerald-500/50 ml-2">]</span></h2>
               <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 bg-carbon mb-8">
                 <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-6 flex items-center gap-2">Registrasi Admin Baru</h3>
                 <div className="flex flex-col md:flex-row gap-4">
                   <input value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} type="text" placeholder="USERNAME BARU" className="flex-1 bg-slate-50 dark:bg-[#020617]/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold outline-none uppercase focus:border-blue-500" />
                   <button onClick={async () => {
                     if(!newUser.username) return alert("Isi username!");
                     if(users.find(u=>u.username===newUser.username.toUpperCase())) return alert("Username sudah ada");
                     try {
                        await setDoc(doc(db, "users", newUser.username.toUpperCase()), {
                            username: newUser.username.toUpperCase(),
                            role: 'admin',
                            password: "123"
                        });
                        setNewUser({username:'', password:''});
                        alert('Admin ditambahkan dengan password default: 123');
                     } catch (e) {
                         alert("Gagal menambahkan pengguna ke cloud");
                     }
                   }} className="btn-interact cyber-cut bg-blue-600 text-slate-900 dark:text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-blue-500 transition-all">Tambah</button>
                 </div>
              </div>
              <div className="bg-white dark:bg-[#1e293b] p-6 md:p-8 rounded-[30px] border border-slate-200 dark:border-slate-800 bg-carbon overflow-hidden">
                  <h3 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest mb-6">Daftar Pengguna Sistem</h3>
                  <div className="overflow-x-auto bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:bg-[#020617] rounded-2xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left min-w-[500px]">
                          <thead className="bg-white dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-slate-800"><tr><th className="p-4 md:p-5">Username</th><th className="p-4 md:p-5 text-center">Role</th><th className="p-4 md:p-5 text-right">Aksi</th></tr></thead>
                          <tbody className="divide-y divide-slate-800/50">
                              {users.map(u => (
                                  <tr key={u.username} className="hover:bg-slate-200 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-4 md:p-5 font-black text-slate-900 dark:text-white uppercase tracking-widest">{u.username}</td>
                                      <td className="p-4 md:p-5 text-center"><span className="bg-emerald-950/50 border border-emerald-900/50 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">{u.role}</span></td>
                                      <td className="p-4 md:p-5 text-right flex items-center justify-end gap-2">
                                        {currentUser.username === u.username && (
                                            <button onClick={async () => {
                                                const newPass = prompt("Masukkan password baru Anda:");
                                                if (newPass) {
                                                    try {
                                                        await setDoc(doc(db, "users", currentUser.username), {
                                                            ...currentUser,
                                                            password: newPass
                                                        });
                                                        setCurrentUser({ ...currentUser, password: newPass });
                                                        alert('Password berhasil diubah!');
                                                    } catch (e) {
                                                        alert('Gagal mengubah password di cloud!');
                                                    }
                                                }
                                            }} className="btn-interact text-slate-600 dark:text-slate-400 hover:text-orange-500 bg-slate-50 dark:bg-[#020617] p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                                                Ubah Sandi
                                            </button>
                                        )}
                                        {u.role !== 'superadmin' && u.username !== 'RYO KUN' && <button onClick={async ()=>{
                                            if(window.confirm(`Hapus admin ${u.username}?`)) {
                                                try {
                                                    await deleteDoc(doc(db, "users", u.username));
                                                } catch (e) {
                                                    alert("Gagal menghapus pengguna dari cloud");
                                                }
                                            }
                                        }} className="btn-interact text-slate-600 dark:text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-[#020617] p-2 rounded-xl border border-slate-200 dark:border-slate-800">Hapus</button>}
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
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white italic uppercase text-center mb-6"><span className="text-emerald-500/50 mr-2">[</span>Profil Admin<span className="text-emerald-500/50 ml-2">]</span></h2>
               <div className="bg-white dark:bg-[#1e293b] p-6 md:p-10 rounded-[40px] border border-slate-200 dark:border-slate-800 bg-carbon hud-card shadow-2xl relative overflow-hidden">
                   <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                     <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 flex items-center justify-center text-4xl md:text-6xl font-black text-emerald-500 cyber-cut shadow-[0_0_30px_rgba(16,185,129,0.15)] relative">
                        {currentUser?.username?.charAt(0) || "R"}
                        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#1e293b] animate-pulse"></div>
                     </div>
                     <div className="flex-1 text-center md:text-left space-y-4 w-full">
                        <div>
                          <h3 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{currentUser?.username || "RYO KUN"}</h3>
                          <p className="text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1 text-xs">{currentUser?.role === 'superadmin' ? 'Super Admin / Operator Gudang' : 'Admin Gudang'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                           <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
                             <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Status Sesi</p>
                             <p className="text-emerald-400 font-mono font-bold text-lg">{autoLogout ? 'AUTO-LOGOUT AKTIF' : 'AUTO-LOGOUT NONAKTIF'}</p>
                           </div>
                           <div className="bg-slate-50 dark:bg-[#020617] p-4 rounded-[20px] border border-slate-200 dark:border-slate-800">
                             <p className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1">Total Mutasi Anda</p>
                             <p className="text-slate-900 dark:text-white font-black text-lg">
                               {logs.filter(l => l.operator === currentUser?.username).length} <span className="text-slate-600 dark:text-slate-400 text-[10px]">Aset</span>
                             </p>
                           </div>
                        </div>

                        <div className="mt-8 bg-slate-50 dark:bg-[#020617] p-4 md:p-6 rounded-[20px] border border-slate-200 dark:border-slate-800">
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-4">Ubah Kata Sandi (Password)</p>
                            <div className="flex flex-col md:flex-row gap-3">
                               <input 
                                 id="new-password"
                                 type="password" 
                                 placeholder="MASUKKAN PASSWORD BARU" 
                                 className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-slate-900 dark:text-white text-xs font-bold w-full uppercase outline-none focus:border-orange-500" 
                               />
                               <button 
                                 onClick={async () => {
                                    const input = document.getElementById('new-password') as HTMLInputElement;
                                    const newPass = input.value;
                                    if (!newPass) return alert('Masukkan password baru!');
                                    
                                    try {
                                        await setDoc(doc(db, "users", currentUser.username), {
                                            ...currentUser,
                                            password: newPass
                                        });
                                        setCurrentUser({ ...currentUser, password: newPass });
                                        input.value = '';
                                        alert('Password berhasil diubah!');
                                    } catch (e) {
                                        alert('Gagal mengubah password di cloud!');
                                    }
                                 }}
                                 className="bg-orange-600/20 text-orange-500 hover:text-slate-900 dark:text-white hover:bg-orange-600 border border-orange-900 p-3 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-colors w-full md:w-auto text-nowrap"
                               >
                                 Simpan
                               </button>
                            </div>
                        </div>
                     </div>
                   </div>

                   <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Tampilan Visual</p>
                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mt-8 mb-4">Pengaturan Tampilan & Tema</p>
                      <div className="flex flex-col md:flex-row gap-4 mb-8">
                         <button 
                          onClick={toggleTheme}
                          className="btn-interact flex-1 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border transition-all flex justify-center items-center gap-3 cyber-cut"
                        >
                          {appTheme === 'dark' ? <Fingerprint size={18} /> : <div className="w-4 h-4 rounded-full border-2 border-current"></div>} 
                          TEMA: {appTheme === 'dark' ? 'GELAP (TEKNIKAL)' : 'TERANG (LAPANGAN)'}
                        </button>
                         <button 
                          onClick={() => setIsLiteMode(!isLiteMode)}
                          className={`btn-interact flex-1 ${!isLiteMode ? 'bg-[#022c22]/40 text-[#34d399] border-[#10b981]/50' : 'bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white'} font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border transition-all flex justify-center items-center gap-3 cyber-cut`}
                        >
                          <Cloud size={18} /> {isLiteMode ? 'AKTIFKAN MODE ANIMASI (BERAT)' : 'ANIMASI AKTIF (KLIK UNTUK MODE RINGAN)'}
                        </button>
                      </div>

                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Pengaturan Sesi</p>
                      
                      <div className="flex flex-col md:flex-row gap-4">
                        <button 
                          onClick={() => { alert('Logout manual berhasil. Mengarahkan ke halaman login...'); setAutoLogout(false); }}
                          className="btn-interact flex-1 mt-4 bg-red-950/30 text-red-500 font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border border-red-900/50 hover:bg-red-900/50 hover:text-red-400 transition-all flex justify-center items-center gap-3 cyber-cut"
                        >
                          <LogOut size={18} /> LOGOUT SEKETIKA
                        </button>
                        <button 
                          onClick={() => { setAutoLogout(!autoLogout); alert(`Auto Logout 2 Jam telah ${!autoLogout ? 'diaktifkan' : 'dinonaktifkan'}.`); }}
                          className={`btn-interact flex-1 mt-4 ${autoLogout ? 'bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-900 dark:text-white' : 'bg-blue-950/30 text-blue-500 border-blue-900/50 hover:bg-blue-900/50 hover:text-blue-400'} font-black text-xs uppercase tracking-widest p-4 py-5 rounded-2xl border transition-all flex justify-center items-center gap-3 cyber-cut`}
                        >
                          <Clock size={18} /> {autoLogout ? 'NONAKTIFKAN AUTO-LOGOUT' : 'AKTIFKAN AUTO-LOGOUT 2 JAM'}
                        </button>
                      </div>
                   </div>
                   
                   <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

                   <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Integrasi Bot Telegram</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={telegramConfig.botToken}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                          placeholder="Token Bot (Cth: 12345:ABCDE...)"
                          className="bg-slate-50 dark:bg-[#020617]/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold outline-none font-mono text-xs focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={telegramConfig.chatId}
                          onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                          placeholder="Chat ID (Cth: 987654321)"
                          className="bg-slate-50 dark:bg-[#020617]/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-slate-900 dark:text-white font-bold outline-none font-mono text-xs focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!telegramConfig.botToken || !telegramConfig.chatId) return alert("Harap isi Token Bot dan Chat ID.");
                          safeStorage.setItem('ryo_telegram', JSON.stringify(telegramConfig));
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
                        className="w-full btn-interact bg-blue-600 text-slate-900 dark:text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 cyber-cut hover:bg-blue-500 transition-colors mt-4"
                      >
                        SIMPAN & UJI COBA
                      </button>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 text-center uppercase font-bold mt-2 tracking-widest">Bot akan memberi tahu jika ada aset yang <span className="text-red-500">overdue</span></p>
                   </div>

                   <hr className="border-slate-200 dark:border-slate-800/50 my-8" />

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Phone size={16} className="text-emerald-500" />
                        <p className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Instalasi Aplikasi Handphone (PWA)</p>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-[#020617] p-6 rounded-[24px] border border-slate-200 dark:border-slate-800">
                         {(() => {
                           const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
                           if (isStandalone) {
                             return (
                               <div className="text-center py-4">
                                 <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-500 rounded-full mb-3">
                                   <ShieldCheck size={24} />
                                 </div>
                                 <h4 className="text-sm font-black text-slate-950 dark:text-white uppercase">Aplikasi Sudah Terpasang</h4>
                                 <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 uppercase font-bold tracking-wider">Anda sedang menggunakan versi aplikasi mandiri gudang senjata (PWA) di perangkat handphone.</p>
                               </div>
                             );
                           }

                           return (
                             <div className="space-y-6">
                               <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/50">
                                  <div className="text-center md:text-left">
                                     <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">Instal ke Layar Utama HP</h4>
                                     <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 cursor-default">Gunakan aplikasi dengan lebih cepat, lancar, dan mendukung notifikasi realtime di HP anda.</p>
                                  </div>
                                  {deferredPrompt ? (
                                    <button 
                                      onClick={triggerPwaInstall}
                                      className="btn-interact bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 shadow-lg shadow-emerald-900/10 cursor-pointer"
                                    >
                                       <Download size={14} /> INSTAL SEKARANG
                                    </button>
                                  ) : (
                                    <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0 select-none">
                                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">SIAP DIINSTAL MANUAL</span>
                                    </div>
                                  )}
                               </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                     <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">Petunjuk Android (Google Chrome)</span>
                                     </div>
                                     <ol className="text-[10px] font-bold text-slate-500 dark:text-slate-400 list-decimal pl-4 space-y-1 normal-case leading-relaxed text-left">
                                        <li>Buka link share / website publish di aplikasi <strong className="text-slate-900 dark:text-slate-200">Google Chrome</strong> HP Anda.</li>
                                        <li>Klik tombol <strong className="text-slate-900 dark:text-slate-200">Instal Sekarang</strong> di atas, ATAU tap <strong className="text-slate-900 dark:text-slate-200">titik tiga (menu)</strong> di pojok kanan atas Chrome.</li>
                                        <li>Pilih menu <strong className="text-emerald-500">"Tambahkan ke Layar Utama"</strong> atau <strong className="text-emerald-500">"Instal Aplikasi"</strong>.</li>
                                        <li>Aplikasi siap diakses langsung dari beranda HP anda tanpa browser!</li>
                                     </ol>
                                  </div>

                                  <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800/60 pt-4 md:pt-0 md:pl-6">
                                     <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>
                                        <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-left">Petunjuk iPhone / iOS (Safari)</span>
                                     </div>
                                     <ol className="text-[10px] font-bold text-slate-500 dark:text-slate-400 list-decimal pl-4 space-y-1 normal-case leading-relaxed text-left">
                                        <li>Pastikan Anda sedang membuka website publish ini melalui browser <strong className="text-slate-900 dark:text-slate-200">Safari</strong> bawaan iOS.</li>
                                        <li>Tap tombol <strong className="text-slate-900 dark:text-slate-200">"Bagikan / Share"</strong> (ikon kotak dengan panah ke atas) di deretan menu Safari.</li>
                                        <li>Scroll ke bawah dan tap pada menu <strong className="text-emerald-500">"Tambahkan ke Layar Utama" (Add to Home Screen)</strong>.</li>
                                        <li>Selesai! Aplikasi akan muncul di halaman utama iPhone Anda bagaikan aplikasi App Store.</li>
                                     </ol>
                                  </div>
                                </div>
                             </div>
                           );
                         })()}
                      </div>
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
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
              animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40"
              onClick={() => setViewingItem(null)}
            >
               <motion.div 
                 initial={{ y: 50, scale: 0.95, opacity: 0 }} 
                 animate={{ y: 0, scale: 1, opacity: 1 }} 
                 exit={{ y: 30, scale: 0.95, opacity: 0 }} 
                 transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.9 }}
                 className="bg-[#050b14] flex flex-col max-h-[90vh] border border-blue-900/50 rounded-[40px] max-w-2xl w-full overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] cyber-cut relative"
                 onClick={e => e.stopPropagation()}
               >
                 <div className="absolute top-6 right-6 flex items-center justify-end gap-2 z-10">
                   <button onClick={() => handlePrint({ type: 'barcode-roll', ids: [viewingItem.id] })} className="text-orange-600 dark:text-orange-500 hover:text-orange-900 dark:text-orange-300 p-2 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/50 flex items-center gap-2 font-black text-[9px] uppercase tracking-widest"><Printer size={16} /> ROLL LABEL</button>
                   <button onClick={() => setViewingItem(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 bg-slate-50 dark:bg-[#020617] rounded-xl border border-slate-200 dark:border-slate-800"><X size={16} /></button>
                 </div>
                 <div className="bg-blue-950/30 p-8 border-b border-blue-900/30 shrink-0">
                    <div className="w-16 h-16 bg-blue-950 border border-blue-900/50 rounded-2xl flex flex-col items-center justify-center text-blue-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                       <FileText size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">{viewingItem.name}</h2>
                    <p className="text-blue-500 font-mono text-sm mt-1">{viewingItem.id}</p>
                    <div className="mt-4 bg-white p-2 w-fit rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                      <QRCodeSVG value={viewingItem.id} size={80} level="H" includeMargin={false} />
                      <p className="text-[8px] font-black text-center text-slate-900 mt-1 uppercase font-mono">SCAN INFO</p>
                    </div>
                 </div>
                 <div className="p-4 sm:p-8 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-900/50 scrollbar-track-transparent">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">Kategori</p>
                          <p className="font-bold text-sm text-slate-600 dark:text-slate-300 uppercase">{viewingItem.category}</p>
                       </div>
                       <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">Status</p>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${viewingItem.status === 'Di Gudang' ? 'bg-emerald-950/40 text-emerald-500 border border-emerald-900/50' : 'bg-orange-950/40 text-orange-500 border border-orange-900/50'}`}>{viewingItem.status}</span>
                       </div>
                    </div>
                    <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                       <div>
                         <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">Dipegang / Dipinjam Oleh</p>
                         <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">{viewingItem.holder}</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">No. Popor</p>
                          <p className="font-mono text-sm text-slate-600 dark:text-slate-300 uppercase">{viewingItem.popor || '-'}</p>
                       </div>
                       <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                          <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">No. Seri (S/N)</p>
                          <p className="font-mono text-sm text-slate-600 dark:text-slate-300 uppercase">{viewingItem.serial || '-'}</p>
                       </div>
                    </div>
                    <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                       <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">Tanggal Registrasi</p>
                       <p className="font-mono text-sm text-slate-600 dark:text-slate-300 uppercase">{viewingItem.date}</p>
                    </div>
                    <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
                       <p className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-widest mb-1">Catatan Tambahan</p>
                       <p className="text-xs text-slate-600 dark:text-slate-400">{viewingItem.note || 'Tidak ada catatan.'}</p>
                    </div>

                    {/* Add Item Log History */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-6 flex items-center gap-2">
                           <History size={14} className="text-blue-500" /> TIMELINE TRACK & TRACE ASET (MUTASI)
                        </h3>
                        
                        {(() => {
                           const itemLogs = logs
                             .filter(l => l.id === viewingItem.id)
                             .sort((a, b) => a.timestamp - b.timestamp); // Chronological track & trace path
                             
                           if (itemLogs.length === 0) {
                             return <p className="text-xs text-slate-500 italic px-4">Belum ada riwayat mutasi untuk aset ini di dalam sistem.</p>;
                           }

                           return (
                             <div className="relative pl-6 border-l border-slate-200 dark:border-blue-900/40 ml-4 space-y-6">
                               {itemLogs.map((log, index) => {
                                 const isLast = index === itemLogs.length - 1;
                                 const isFirst = index === 0;
                                 
                                 let indicatorColor = "bg-blue-500 border-blue-200 dark:border-blue-950";
                                 let typeLabel = "REGISTRASI";
                                 let badgeClassName = "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/30";
                                 let details = `Aset pertama kali didaftarkan dengan status awal '${log.status}' oleh operator.`;

                                 if (log.type === 'IN') {
                                   indicatorColor = "bg-emerald-500 border-emerald-200 dark:border-emerald-950 text-white";
                                   typeLabel = "CHECK-IN (KEMBALI)";
                                   badgeClassName = "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/30";
                                   details = `Dikembalikan ke gudang oleh ${log.holder || 'Seseorang'}. Status berubah menjadi Di Gudang.`;
                                 } else if (log.type === 'OUT') {
                                   indicatorColor = "bg-orange-500 border-orange-200 dark:border-orange-950 text-white";
                                   typeLabel = "CHECK-OUT (KELUAR)";
                                   badgeClassName = "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-200/50 dark:border-orange-900/30";
                                   details = `Dikeluarkan / Dipinjam oleh pemegang: ${log.holder || 'Seseorang'}.`;
                                 } else if (log.type === 'EDIT') {
                                   indicatorColor = "bg-amber-500 border-amber-200 dark:border-amber-950 text-white";
                                   typeLabel = "METADATA UPDATE";
                                   badgeClassName = "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30";
                                   details = `Perubahan informasi data teknis atau spesifikasi aset oleh operator.`;
                                 } else if (log.type === 'DELETE') {
                                   indicatorColor = "bg-rose-500 border-rose-200 dark:border-rose-950 text-white";
                                   typeLabel = "SISTEM PURGE";
                                   badgeClassName = "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-950/30";
                                   details = `Aset dihapus dari inventaris utama.`;
                                 }

                                 return (
                                   <div key={log.timestamp} className="relative group">
                                     <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${indicatorColor} flex items-center justify-center shadow-md transition-transform group-hover:scale-125 z-10`} />
                                     
                                     <div className={`rounded-2xl p-4 transition-all duration-300 ${
                                       isLast 
                                         ? "bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                                         : "bg-white dark:bg-[#020617]/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700"
                                     }`}>
                                       <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                         <div className="flex items-center gap-2">
                                           <span className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded font-mono ${badgeClassName}`}>
                                             {typeLabel}
                                           </span>
                                           {isLast && (
                                             <span className="text-[8px] font-extrabold bg-blue-500 text-white px-1.5 py-0.5 rounded animate-pulse font-mono tracking-wider">
                                               TERBARU (AKTIF)
                                             </span>
                                           )}
                                           {isFirst && (
                                             <span className="text-[8px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono tracking-wider">
                                               REGISTRASI AWAL
                                             </span>
                                           )}
                                         </div>
                                         <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                                           <Clock size={10} className="text-slate-400" />
                                           <span>{log.fullDate} - {log.time}</span>
                                         </div>
                                       </div>
                                       
                                       <p className="text-xs font-bold text-slate-800 dark:text-white mb-1 leading-relaxed text-left">
                                         {details}
                                       </p>
                                       
                                       <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                                         <span className="flex items-center gap-1">
                                           <Fingerprint size={10} className="text-slate-400" />
                                           Operator: <strong className="text-slate-800 dark:text-slate-300 font-semibold">{log.operator}</strong>
                                         </span>
                                         {log.sessionName && (
                                           <span className="bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                             Opname: {log.sessionName}
                                           </span>
                                         )}
                                       </div>
                                     </div>
                                   </div>
                                 );
                               })}
                             </div>
                           );
                        })()}
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
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
              animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/40 overflow-y-auto pt-24 pb-24"
              onClick={() => setEditingItem(null)}
            >
               <motion.div 
                 initial={{ y: 50, scale: 0.95, opacity: 0 }} 
                 animate={{ y: 0, scale: 1, opacity: 1 }} 
                 exit={{ y: 30, scale: 0.95, opacity: 0 }} 
                 transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.9 }}
                 className="bg-[#050b14] border border-orange-900/50 rounded-[40px] max-w-2xl w-full shadow-[0_0_50px_rgba(249,115,22,0.15)] cyber-cut relative my-auto"
                 onClick={e => e.stopPropagation()}
               >
                 <button onClick={() => setEditingItem(null)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 bg-slate-50 dark:bg-[#020617] rounded-xl border border-slate-200 dark:border-slate-800 z-10"><X size={16} /></button>
                 <div className="bg-orange-950/30 p-8 border-b border-orange-900/30">
                    <div className="w-16 h-16 bg-orange-950 border border-orange-900/50 rounded-2xl flex flex-col items-center justify-center text-orange-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                       <Settings size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Edit Aset: {editingItem.id}</h2>
                 </div>
                 <div className="p-8 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">Nama Aset</label>
                      <input value={editingItem.name} onChange={e=>setEditingItem({...editingItem, name: e.target.value})} type="text" className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">Kategori</label>
                        <select value={editingItem.category} onChange={e=>setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors appearance-none">
                           {appSettings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">Nama Pemegang / Penanggung Jawab</label>
                        <input value={editingItem.holder} onChange={e=>setEditingItem({...editingItem, holder: e.target.value})} type="text" className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs font-bold uppercase focus:border-orange-500 outline-none transition-colors" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">No. Popor</label>
                        <input value={editingItem.popor || ''} onChange={e=>setEditingItem({...editingItem, popor: e.target.value})} type="text" className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs font-mono focus:border-orange-500 outline-none transition-colors" placeholder="KOSONG"/>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">No. Seri Pemasok (S/N)</label>
                        <input value={editingItem.serial || ''} onChange={e=>setEditingItem({...editingItem, serial: e.target.value})} type="text" className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs font-mono focus:border-orange-500 outline-none transition-colors" placeholder="KOSONG" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1 block">Catatan Tambahan</label>
                      <textarea value={editingItem.note || ''} onChange={e=>setEditingItem({...editingItem, note: e.target.value})} rows={3} className="w-full bg-slate-50 dark:bg-[#020617] border border-slate-300 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white text-xs focus:border-orange-500 outline-none transition-colors resize-none" placeholder="TAMBAHKAN CATATAN..."></textarea>
                    </div>
                 </div>
                 <div className="p-8 border-t border-slate-200 dark:border-slate-800/50 flex justify-end gap-4 bg-slate-50 dark:bg-[#020617]/50 rounded-b-[40px]">
                    <button onClick={() => setEditingItem(null)} className="px-6 py-4 text-xs font-black uppercase text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors tracking-widest">Batal</button>
                    <button onClick={handleSaveEdit} className="bg-orange-600 hover:bg-orange-500 text-slate-900 dark:text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(249,115,22,0.3)] cyber-cut transition-all">SIMPAN PERUBAHAN</button>
                 </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showDriveModal && (
            <motion.div 
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }} 
              animate={{ opacity: 1, backdropFilter: "blur(12px)" }} 
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/40 overflow-y-auto pt-24 pb-24"
              onClick={() => setShowDriveModal(false)}
            >
               <motion.div 
                 initial={{ y: 50, scale: 0.95, opacity: 0 }} 
                 animate={{ y: 0, scale: 1, opacity: 1 }} 
                 exit={{ y: 30, scale: 0.95, opacity: 0 }} 
                 transition={{ type: "spring", damping: 28, stiffness: 320, mass: 0.9 }}
                 className="bg-[#050b14] border border-cyan-900/50 rounded-[40px] max-w-2xl w-full shadow-[0_0_50px_rgba(6,182,212,0.15)] cyber-cut relative my-auto p-8"
                 onClick={e => e.stopPropagation()}
               >
                 <button onClick={() => setShowDriveModal(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 bg-slate-50 dark:bg-[#020617] rounded-xl border border-slate-200 dark:border-slate-800 z-10"><X size={16} /></button>
                 
                 <div className="flex flex-col items-center justify-center mb-8">
                     <div className="w-16 h-16 bg-cyan-950 border border-cyan-900/50 rounded-2xl flex flex-col items-center justify-center text-cyan-500 mb-6 cyber-cut shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                        <Cloud size={24} />
                     </div>
                     <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider text-center">Google Drive Sync</h2>
                 </div>

                 {isDriveSyncing ? (
                     <div className="text-center text-slate-600 dark:text-slate-400 font-mono py-10 flex border flex-col items-center border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-[#020617]">
                        <RefreshCw size={32} className="animate-spin mb-4 text-cyan-500" />
                        Sedang menghubungkan ke server Google Drive...
                     </div>
                 ) : !googleUser ? (
                    <div className="text-center py-10">
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-6">Hubungkan akun Google Drive Anda untuk mulai mencadangkan dan memulihkan data sistem ke cloud dengan aman.</p>
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
                        <div className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 dark:text-slate-400 mb-1">AKUN TERHUBUNG</p>
                                <p className="text-slate-900 dark:text-white font-bold text-sm tracking-widest">{googleUser.displayName}</p>
                                <p className="text-cyan-500 font-mono text-xs">{googleUser.email}</p>
                            </div>
                            <button onClick={async () => { await googleLogout(); setGoogleUser(null); }} className="px-4 py-2 bg-red-900/30 text-red-500 border border-red-900/50 rounded-xl text-xs font-black uppercase tracking-widest">Logout</button>
                        </div>

                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                           <div className="bg-slate-50 dark:bg-[#020617] p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                              <h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-widest">Cadangan Tersedia (Google Drive)</h3>
                              <button onClick={handleBackupToDrive} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-900 dark:text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Upload size={14}/> Cadangkan Sekarang</button>
                           </div>
                           <div className="bg-[#0f172a]/50 p-4 min-h-[140px] max-h-[200px] overflow-y-auto space-y-3">
                               {driveBackups.length === 0 ? (
                                  <p className="text-center text-slate-600 dark:text-slate-400 font-bold text-xs py-10 uppercase">Belum ada file cadangan di Google Drive Anda.</p>
                               ) : driveBackups.map(file => (
                                   <div key={file.id} className="bg-white dark:bg-[#020617]/50 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                                      <div>
                                         <p className="text-cyan-400 font-mono text-xs truncate max-w-[200px] sm:max-w-xs mb-1">{file.name}</p>
                                      </div>
                                      <button onClick={() => handleRestoreFromDrive(file.id, file.name)} className="bg-pink-900/30 text-pink-500 border border-pink-900/50 px-4 py-2 flex items-center gap-2 rounded-lg text-[10px] font-black uppercase hover:bg-pink-900/50 transition-colors"><Download size={14}/> Restore</button>
                                   </div>
                               ))}
                           </div>
                        </div>

                        {/* Google Sheets Live Database Sync */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-[#020617]/30 p-5 space-y-4 text-left">
                           <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                              <div className="flex items-center gap-2">
                                 <FileText size={16} className="text-emerald-500" />
                                 <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest text-left">Kolaborasi Google Sheets</h3>
                              </div>
                              {isSheetsSyncing && (
                                 <span className="text-[10px] font-mono text-emerald-400 animate-pulse flex items-center gap-1">
                                    <RefreshCw size={10} className="animate-spin" /> Sedang memperbarui...
                                 </span>
                              )}
                           </div>

                           {!sheetsSpreadsheetId ? (
                              <div className="space-y-3 text-center sm:text-left">
                                 <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed text-left">
                                    Sambungkan inventaris Anda ke Google Spreadsheet. Sistem akan otomatis membuat file <strong className="text-slate-800 dark:text-slate-200">"Database Inventaris Gudang"</strong> dengan tab terpisah untuk Aset dan Riwayat Mutasi yang ter-update secara otomatis.
                                 </p>
                                 <button 
                                    onClick={handleConnectToSheets}
                                    disabled={isSheetsSyncing}
                                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900/40 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-colors"
                                 >
                                    Hubungkan & Buat Spreadsheet Baru
                                 </button>
                              </div>
                           ) : (
                              <div className="space-y-4">
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-[#020617]/80 p-3.5 border border-slate-200 dark:border-slate-800 rounded-xl">
                                    <div className="min-w-0 text-left">
                                       <span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-widest bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/30 font-mono mb-1.5">
                                          ● TERHUBUNG
                                       </span>
                                       <p className="text-xs font-black text-slate-800 dark:text-white uppercase truncate">Database Inventaris Gudang</p>
                                    </div>
                                    <a 
                                       href={`https://docs.google.com/spreadsheets/d/${sheetsSpreadsheetId}/edit`}
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
                                    >
                                       <FileText size={12} /> Buka Spreadsheet
                                    </a>
                                 </div>

                                 <div className="flex items-center justify-between gap-4 py-1.5 border-t border-b border-slate-200 dark:border-slate-800">
                                    <div className="text-left">
                                       <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">Autosync Real-time (Latar Belakang)</p>
                                       <p className="text-[9px] text-slate-600 dark:text-slate-400">Otomatis update Spreadsheet sesaat setelah database lokal atau Firebase diperbarui.</p>
                                    </div>
                                    <button 
                                       onClick={() => handleToggleSheetsAutosync(!isSheetsAutosyncEnabled)}
                                       className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                                          isSheetsAutosyncEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-800'
                                       } relative flex items-center shrink-0`}
                                    >
                                       <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                          isSheetsAutosyncEnabled ? 'translate-x-[22px]' : 'translate-x-0'
                                       }`} />
                                    </button>
                                 </div>

                                 <div className="flex flex-col sm:flex-row gap-2">
                                    <button 
                                       onClick={handleSyncToSheets}
                                       disabled={isSheetsSyncing}
                                       className="flex-1 px-3 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-slate-200 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors font-sans"
                                    >
                                       Kirim ke Sheets
                                    </button>
                                    <button 
                                       onClick={handlePullFromSheets}
                                       disabled={isSheetsSyncing}
                                       className="flex-1 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_2px_10px_rgba(16,185,129,0.15)] transition-colors font-sans"
                                    >
                                       Tarik dari Sheets
                                    </button>
                                    <button 
                                       onClick={() => {
                                          if (confirm("Apakah Anda yakin ingin melepas koneksi Google Sheets?")) {
                                             setSheetsSpreadsheetId(null);
                                             safeStorage.removeItem("sheets_spreadsheet_id");
                                          }
                                       }}
                                       className="px-3 py-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-500 hover:text-red-400 border border-red-900/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 font-sans"
                                    >
                                       Putuskan
                                    </button>
                                 </div>

                                 {/* BOT NOTIFIKASI EMAIL */}
                                 <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#020617]/50 p-5 mt-6 space-y-4 text-left">
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                       <div className="flex items-center gap-2">
                                          <Bell size={16} className="text-cyan-500" />
                                          <h3 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-widest text-left">Pemberitahuan Bot Email</h3>
                                       </div>
                                    </div>

                                    <div className="space-y-4">
                                       <div className="space-y-1.5">
                                          <label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 tracking-wider">Email Alamat Penerima</label>
                                          <input 
                                             type="email" 
                                             placeholder="contoh: ryo.kun4113@gmail.com" 
                                             value={notificationEmail} 
                                             onChange={(e) => {
                                                setNotificationEmail(e.target.value);
                                                safeStorage.setItem("notification_email", e.target.value);
                                             }}
                                             className="w-full bg-[#050b14]/50 border border-slate-200 dark:border-slate-800 dark:bg-[#020617] text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none placeholder:text-slate-500"
                                          />
                                       </div>

                                       <div className="flex items-center justify-between gap-4 py-1.5 border-t border-b border-slate-200 dark:border-slate-800">
                                          <div className="text-left">
                                             <p className="text-[11px] font-bold text-slate-800 dark:text-white">Aktifkan Notifikasi Email</p>
                                             <p className="text-[9px] text-slate-600 dark:text-slate-400 font-sans">Kirim email otomatis saat ada scan check-in atau check-out.</p>
                                          </div>
                                          <button 
                                             onClick={() => {
                                                const nextEnabled = !isEmailNotificationEnabled;
                                                setIsEmailNotificationEnabled(nextEnabled);
                                                safeStorage.setItem("email_notification_enabled", nextEnabled ? "true" : "false");
                                             }}
                                             className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ${
                                                isEmailNotificationEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-800'
                                             } relative flex items-center shrink-0`}
                                          >
                                             <span className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                                                isEmailNotificationEnabled ? 'translate-x-[22px]' : 'translate-x-0'
                                             }`} />
                                          </button>
                                       </div>

                                       <button
                                          onClick={async () => {
                                             if (!notificationEmail) {
                                                alert("Harap masukkan alamat email yang valid terlebih dahulu.");
                                                return;
                                             }
                                             try {
                                                await sendTransactionEmail(
                                                   notificationEmail, 
                                                   "TEST KONEKSI - BOT NOTIFIKASI GUDANG", 
                                                   `
                                                     <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; color: #010409; background-color: #ffffff;">
                                                        <h3 style="color: #06b6d4; font-size: 16px; margin-top: 0; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">Koneksi Bot Berhasil!</h3>
                                                        <p style="font-size: 13px; line-height: 1.6; color: #484f58;">Bot Notifikasi Gudang telah sukses terhubung ke email Anda. Mulai sekarang, rincian keluar-masuk senjata/aset akan dikirimkan ke sini secara instan.</p>
                                                     </div>
                                                   `
                                                );
                                                alert("Email uji coba berhasil dikirim! Periksa kotak masuk Anda.");
                                             } catch (err) {
                                                alert("Gagal kirim email uji coba: " + (err.message || err));
                                             }
                                          }}
                                          className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors font-sans"
                                       >
                                          Kirim Email Uji Coba (Test Connection)
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                    </div>
                 )}
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* J.A.R.V.I.S Assistant Element */}
        <JarvisAssistant 
          logs={logs} 
          inventory={inventory} 
          isOnline={isOnline} 
          currentUser={currentUser} 
        />

        {/* Hidden Global Inputs */}
        <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
        <input type="file" ref={fileInputRef} onChange={handleRestoreDB} accept=".json" className="hidden" />

      </main>
    </div>
    </div>
  );
}

