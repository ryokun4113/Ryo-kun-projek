import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with a limit of 15MB to handle larger HTML inputs
app.use(express.json({ limit: "15mb" }));

// Initialize GoogleGenAI client lazy-initialized inside route to avoid crashing if GEMINI_API_KEY is not immediately provided
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Convert Endpoint
app.post("/api/convert", async (req, res): Promise<any> => {
  const { html, instruction, themePreference, features } = req.body;

  if (!html) {
    return res.status(400).json({ error: "HTML kosong atau tidak valid." });
  }

  try {
    const ai = getAIClient();
    
    // Formulate a robust prompt to guide Gemini to turn raw HTML into high-quality, production-ready React component
    const prompt = `Ubah kode HTML berikut menjadi sebuah komponen React (JSX) yang sangat fungsional, interaktif, elegan, dan siap digunakan. 
Gunakan standard Tailwind CSS untuk seluruh penataan gaya (clean layouts, consistent spacing, and matching colors).

Kriteria konversi wajib:
1. **Fungsional & Interaktif**: Hidupkan fungsionalitas aslinya. Jika ada tombol, input, formulir, kalkulator, list, modalkan fungsionalitas tersebut dengan menggunakan React hooks (seperti useState, useEffect, dll). 
2. **Icon Modern**: Ganti semua elemen gambar/icon kustom dengan icon modern dari 'lucide-react'. Import icon secara named (contoh: import { CheckCircle, Search, Mail } from 'lucide-react'). Gunakan lucide-react semaksimal mungkin untuk estetika berkelas.
3. **Responsive**: Desain harus responsif dan rapi di semua layar (hp, tablet, desktop).
4. **Keindahan Visual**: Berikan sentuhan visual yang modern, bersih, dengan padding yang proporsional dan transisi yang halus (gunakan Tailwind hover, active, focus states, dan transition-all).
5. **Mandiri (Single Component)**: Hasil konversi harus berupa satu modul file mandiri lengkap (self-contained) yang tidak memerlukan file stylesheet eksternal selain Tailwind. Letakkan semua sub-fungsi atau struktur pembantu di dalam komponen yang sama. Pastikan default export berupa komponen utama.

Gaya tema yang diminta: ${themePreference || "Modern Light/Dark Neutral"}
Fitur tambahan yang diminta: ${features || "Interaktivitas penuh sesuai elemen yang ada"}
Instruksi khusus tambahan (jika ada): ${instruction || "Lakukan konversi sebaik mungkin"}

--- KODE HTML ASLI ---
${html}
----------------------`;

    console.log("Mengirim permintaan konversi ke Gemini API...");
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "Anda adalah pengembang React + Tailwind CSS bertenaga tinggi yang ahli dalam menyulap HTML statis menjadi komponen React interaktif premium dengan UI yang menakjubkan dan UX yang sangat intuitif. Selalu respons dalam bahasa Indonesia.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jsxCode: {
              type: Type.STRING,
              description: "Kode React lengkap yang siap pakai. Kode ini harus langsung di-import di App.tsx. Pastikan untuk mengimpor React, hooks yang diperlukan, serta icon dari 'lucide-react'. Gunakan default export untuk komponen utamanya."
            },
            explanation: {
              type: Type.STRING,
              description: "Penjelasan ringkas dalam bahasa Indonesia mengenai konversi yang dilakukan, bagaimana state dikelola, dan penyempurnaan visual yang ditambahkan."
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 saran tindak lanjut opsional dalam bahasa Indonesia untuk membuat aplikasi ini jauh lebih canggih (misalnya integrasi database lokal, statistik tambahan, dll)."
            }
          },
          required: ["jsxCode", "explanation", "suggestions"]
        }
      }
    });

    const parsedJsonString = response.text?.trim() || "{}";
    const result = JSON.parse(parsedJsonString);

    return res.json({
      success: true,
      jsxCode: result.jsxCode,
      explanation: result.explanation,
      suggestions: result.suggestions,
    });
  } catch (error: any) {
    console.error("Kesalahan konversi:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan internal ketika memproses kode HTML Anda.",
    });
  }
});

// Telegram Notification Endpoint
app.post("/api/telegram/send", async (req, res): Promise<any> => {
  const { message, botToken: bodyBotToken, chatId: bodyChatId } = req.body;
  const botToken = bodyBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = bodyChatId || process.env.TELEGRAM_CHAT_ID;

  if (!message) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  if (!botToken || !chatId) {
    console.warn("TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur.");
    return res.status(200).json({ success: false, note: "Konfigurasi Telegram belum diatur." });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error("Gagal mengirim Telegram Webhook:", data);
        return res.status(500).json({ success: false, error: "Gagal memanggil API Telegram." });
    }

    return res.json({ success: true, message: "Notifikasi Telegram berhasil dikirim." });
  } catch (error: any) {
    console.error("Kesalahan pengiriman Telegram:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dev Server integration with Vite instance
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Fullstack Server] Berjalan pada port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server:", err);
});
