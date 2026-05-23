export type Item = {
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

export type Log = {
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
  isOverdue?: boolean;
};
