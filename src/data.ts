export interface PresetTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  html: string;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "registration-form",
    title: "Formulir Registrasi Acara Tech",
    category: "Formulir & Input",
    description: "Formulir pendaftaran modern dengan validasi, radio button, checkbox, dan tombol submit yang anggun.",
    html: `<!-- FORMULIR PENDAFTARAN MODERN -->
<div class="registration-container" style="font-family: 'Inter', sans-serif; max-width: 500px; margin: 20px auto; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); padding: 32px; border: 1px solid #eef2f6;">
  
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 24px; font-weight: 700;">Daftar Google I/O Extended</h2>
    <p style="color: #64748b; margin: 0; font-size: 14px;">Reservasi kursi Anda untuk festival developer terbesar tahun ini.</p>
  </div>

  <form id="techEventForm" action="#" method="POST" style="display: flex; flex-direction: column; gap: 20px;">
    <!-- Nama -->
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 14px; font-weight: 600; color: #334155;">Nama Lengkap</label>
      <input type="text" name="fullName" placeholder="Contoh: Rian Pratama" required style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;" />
    </div>

    <!-- Email -->
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <label style="font-size: 14px; font-weight: 600; color: #334155;">Alamat Email</label>
      <input type="email" name="email" placeholder="rian@example.com" required style="padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;" />
    </div>

    <!-- Pilihan Track -->
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <label style="font-size: 14px; font-weight: 600; color: #334155;">Pilih Track Fokus</label>
      
      <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
        <input type="radio" id="track1" name="track" value="web-ai" checked style="margin: 0; scale: 1.1;" />
        <label for="track1" style="font-size: 14px; color: #334155; cursor: pointer; flex: 1;"><strong>Web & AI</strong> (Vite, React, Gemini SDK)</label>
      </div>

      <div style="display: flex; align-items: center; gap: 10px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer;">
        <input type="radio" id="track2" name="track" value="cloud-backend" style="margin: 0; scale: 1.1;" />
        <label for="track2" style="font-size: 14px; color: #334155; cursor: pointer; flex: 1;"><strong>Cloud & Mobile</strong> (GCP, Kotlin, Cloud Run)</label>
      </div>
    </div>

    <!-- S&K Checkbox -->
    <div style="display: flex; align-items: flex-start; gap: 10px; margin-top: 4px;">
      <input type="checkbox" id="termsCheck" required style="margin-top: 4px; scale: 1.1;" />
      <label for="termsCheck" style="font-size: 12px; color: #64748b; line-height: 1.5; cursor: pointer;">
        Saya menyetujui Ketentuan Layanan & Kebijakan Privasi serta bersedia menerima email pembaruan acara.
      </label>
    </div>

    <!-- Tombol Submit -->
    <button type="submit" style="background: #2563eb; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 8px;">
      Kirim Pendaftaran
    </button>
  </form>

</div>`
  },
  {
    id: "modern-calculator",
    title: "Kalkulator Sederhana & Interaktif",
    category: "Aplikasi Utilitas",
    description: "Mini kalkulator dengan tata letak grid, layar ekspresi, dan tombol-tombol operasi matematika.",
    html: `<!-- KALKULATOR ELEGAN -->
<div class="calc-wrapper" style="font-family: 'Inter', sans-serif; max-width: 340px; margin: 20px auto; background: #0f172a; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); padding: 24px; color: white;">
  
  <div style="text-align: center; margin-bottom: 20px;">
    <span style="font-size: 11px; font-weight: 600; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px;">NeoCalc Prime</span>
  </div>

  <!-- Layar Tampilan -->
  <div style="background: #1e293b; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: right; min-height: 72px; display: flex; flex-direction: column; justify-content: flex-end;">
    <div class="calc-history" style="font-size: 14px; color: #94a3b8; margin-bottom: 4px; overflow: hidden; white-space: nowrap;">128 + 256</div>
    <div class="calc-display" style="font-size: 32px; font-weight: 700; color: #f8fafc; overflow: hidden; white-space: nowrap;">384</div>
  </div>

  <!-- Panel Tombol (Grid) -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
    <!-- Baris 1 -->
    <button class="calc-btn btn-action" style="background: #334155; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">AC</button>
    <button class="calc-btn btn-action" style="background: #334155; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">+/-</button>
    <button class="calc-btn btn-action" style="background: #334155; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">%</button>
    <button class="calc-btn btn-operator" style="background: #f97316; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: 600; cursor: pointer;">÷</button>

    <!-- Baris 2 -->
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">7</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">8</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">9</button>
    <button class="calc-btn btn-operator" style="background: #f97316; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: 600; cursor: pointer;">×</button>

    <!-- Baris 3 -->
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">4</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">5</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">6</button>
    <button class="calc-btn btn-operator" style="background: #f97316; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: 600; cursor: pointer;">-</button>

    <!-- Baris 4 -->
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">1</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">2</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">3</button>
    <button class="calc-btn btn-operator" style="background: #f97316; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: 600; cursor: pointer;">+</button>

    <!-- Baris 5 -->
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer; grid-column: span 2;">0</button>
    <button class="calc-btn" style="background: #1e293b; color: #f8fafc; border: none; padding: 16px; border-radius: 12px; font-size: 18px; font-weight: 600; cursor: pointer;">.</button>
    <button class="calc-btn btn-operator" style="background: #10b981; color: white; border: none; padding: 16px; border-radius: 12px; font-size: 20px; font-weight: 600; cursor: pointer;">=</button>
  </div>

</div>`
  },
  {
    id: "sales-dashboard",
    title: "Ringkasan Dasbor Penjualan Toko",
    category: "Dasbor & Data",
    description: "Statistik penjualan toko dengan bento grid, sorotan metrik keuangan, dan tabel transaksi pembeli.",
    html: `<!-- DECORATIVE DASHBOARD COMPONENT -->
<div class="sales-dashboard" style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 20px auto; background: #f8fafc; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 24px; border: 1px solid #e2e8f0; color: #1e293b;">
  
  <!-- Kop Dasbor -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px;">
    <div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a;">Dasbor Kios Berkah</h3>
      <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Laporan harian penjualan produk dan aktivitas pembeli.</p>
    </div>
    <span style="background: #dcfce7; color: #15803d; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 9999px;">Toko Buka</span>
  </div>

  <!-- Bento Metrik -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
    <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
      <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 6px;">Total Pendapatan (Hari Ini)</div>
      <div style="font-size: 20px; font-weight: 700; color: #0f172a;">Rp 1.450.000</div>
      <div style="font-size: 11px; color: #16a34a; font-weight: 600; margin-top: 4px;">↑ +14.2% dibanding kemarin</div>
    </div>

    <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
      <div style="font-size: 12px; color: #64748b; font-weight: 500; margin-bottom: 6px;">Transaksi Berhasil</div>
      <div style="font-size: 20px; font-weight: 700; color: #0f172a;">34 Invoice</div>
      <div style="font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 4px;">↓ -2.4% jam sibuk</div>
    </div>
  </div>

  <!-- Tabel Transaksi -->
  <div style="background: white; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
    <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 700;">Riwayat Pesanan Terbaru</h4>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
      <thead>
        <tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
          <th style="padding: 8px 0; font-weight: 600;">Pelanggan</th>
          <th style="padding: 8px 0; font-weight: 600;">Metode</th>
          <th style="padding: 8px 0; font-weight: 600; text-align: right;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px dashed #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600;">Siti Rahma</td>
          <td style="padding: 10px 0; color: #2563eb;">QRIS GoPay</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700;">Rp 250.000</td>
        </tr>
        <tr style="border-bottom: 1px dashed #f1f5f9;">
          <td style="padding: 10px 0; font-weight: 600;">Budi Santoso</td>
          <td style="padding: 10px 0; color: #0284c7;">Transfer BCA</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700;">Rp 75.000</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; font-weight: 600;">Ahmad Faisal</td>
          <td style="padding: 10px 0; color: #16a34a;">Tunai (Cash)</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700;">Rp 1.125.000</td>
        </tr>
      </tbody>
    </table>
  </div>

</div>`
  }
];
