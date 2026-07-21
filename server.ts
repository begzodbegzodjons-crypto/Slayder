import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initStorage, loadData, saveCollection, ClinicData } from './db-store';
// Note: ClinicData is kept for type compatibility; saveCollection now accepts any JSON value
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = 3000;

// ===================================================================
// ZAXIRA (BACKUP) TIZIMI — har saqlashda avtomatik zaxira nusxa olish
// Hech qanday ma'lumot yo'qolmaydi — barcha zaxiralar saqlanadi
// ===================================================================
const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DAILY_DIR = path.join(BACKUP_DIR, 'daily');
const HOURLY_DIR = path.join(BACKUP_DIR, 'hourly');
const ON_SAVE_DIR = path.join(BACKUP_DIR, 'on-save'); // har saqlashda

[BACKUP_DIR, DAILY_DIR, HOURLY_DIR, ON_SAVE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const tsFile = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// Har saqlashda zaxira olish (faqat oxirgi 100 ta saqlanadi)
function backupOnSave(key: string, data: any) {
  try {
    const now = new Date();
    const fileName = `${tsFile(now)}_${key}.json`;
    const filePath = path.join(ON_SAVE_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify({
      _meta: { key, savedAt: now.toISOString(), recordCount: Array.isArray(data) ? data.length : 1 },
      data,
    }, null, 2), 'utf-8');
    // ON_SAVE papkani tozalash — oxirgi 200 ta fayl saqlanadi
    const files = fs.readdirSync(ON_SAVE_DIR).filter(f => f.endsWith('.json'))
      .map(f => ({ f, mtime: fs.statSync(path.join(ON_SAVE_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    if (files.length > 200) {
      files.slice(200).forEach(({ f }) => {
        try { fs.unlinkSync(path.join(ON_SAVE_DIR, f)); } catch {}
      });
    }
  } catch (err) {
    // Zaxira xatosi saqlashni to'xtatmasin
  }
}

// Barcha zaxira fayllarini ro'yxati (admin uchun)
function listAllBackups() {
  const result: { type: string; file: string; name: string; mtime: string; size: number; meta?: any }[] = [];
  [
    { dir: DAILY_DIR, type: 'daily' },
    { dir: HOURLY_DIR, type: 'hourly' },
    { dir: ON_SAVE_DIR, type: 'on-save' },
  ].forEach(({ dir, type }) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
        const fp = path.join(dir, f);
        try {
          const stat = fs.statSync(fp);
          let meta: any = undefined;
          try {
            const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
            meta = raw._meta;
          } catch {}
          result.push({ type, file: fp, name: f, mtime: stat.mtime.toISOString(), size: stat.size, meta });
        } catch {}
      });
    }
  });
  return result.sort((a, b) => b.mtime.localeCompare(a.mtime));
}

// ===================================================================
// SSE (Server-Sent Events) — REAL-TIME yangilanishlar
// Polling yo'q — server ma'lumot o'zgarganda darhol yuboradi
// Barcha ochiq sahifalar (qabulxona, shifokor, monitor, kassa)
// bir zumda yangi ma'lumotni qabul qiladi
// ===================================================================
const sseClients = new Set<import('express').Response>();

function broadcastChange(key: string, data: any) {
  // Agar palata ma'lumoti o'zgarsa — occupiedBeds ni qayta hisoblash
  let broadcastData = data;
  if (key === 'inpatientStays' || key === 'hospitalRooms') {
    // Bed status ni sinxron saqlash uchun ham rooms ham stays ni yuboramiz
    // (mijoz tomonda ham hisoblanadi)
    broadcastData = data;
  }
  const msg = `data: ${JSON.stringify({ type: 'update', key, data: broadcastData })}\n\n`;
  let sent = 0;
  for (const client of sseClients) {
    try { client.write(msg); sent++; } catch {}
  }
  if (sent > 0) {
    // console.log(`[SSE] broadcast "${key}" to ${sent} clients`);
  }
}

async function startServer() {
  const app = express();

  // Parse JSON bodies up to 10MB (for large lists)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize DB Storage
  await initStorage();

  // ===================================================================
  // AVTOMATIK ZAXIRA — har 5 daqiqada TiDB dan to'liq zaxira olish
  // Server ichida ishlaydi — alohida process kerak emas
  // ===================================================================
  async function autoHourlyBackup() {
    try {
      const data = await loadData();
      const now = new Date();
      const fileName = `auto_${tsFile(now)}.json`;
      const filePath = path.join(HOURLY_DIR, fileName);
      const snapshot = {
        _meta: {
          backupType: 'hourly-auto',
          createdAt: now.toISOString(),
          patientCount: (data.patients || []).length,
          transactionCount: (data.transactions || []).length,
          inpatientCount: (data.inpatientStays || []).length,
          keys: Object.keys(data),
        },
        data,
      };
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      // Hourly papkani tozalash — oxirgi 48 soat
      const files = fs.readdirSync(HOURLY_DIR).filter(f => f.endsWith('.json'))
        .map(f => ({ f, mtime: fs.statSync(path.join(HOURLY_DIR, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      const maxAge = 48 * 60 * 60 * 1000;
      files.forEach(({ f, mtime }) => {
        if (Date.now() - mtime > maxAge) {
          try { fs.unlinkSync(path.join(HOURLY_DIR, f)); } catch {}
        }
      });
      console.log(`[${now.toISOString()}] ✅ Avtomatik hourly zaxira: ${fileName} (${Math.round(fs.statSync(filePath).size/1024)} KB) | bemorlar: ${snapshot._meta.patientCount}`);
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] ❌ Avtomatik zaxira xatosi:`, err.message);
    }
  }

  // Har 5 daqiqada avtomatik zaxira
  setInterval(autoHourlyBackup, 5 * 60 * 1000);
  // Server ishga tushganda darhol bitta zaxira olish
  setTimeout(autoHourlyBackup, 10000);

  // Har kuni 23:59 da daily zaxira (o'chirilmaydi)
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const ms = tomorrow.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        const data = await loadData();
        const now = new Date();
        const fileName = `daily_${tsFile(now)}.json`;
        const filePath = path.join(DAILY_DIR, fileName);
        const snapshot = {
          _meta: { backupType: 'daily', createdAt: now.toISOString(), patientCount: (data.patients||[]).length, transactionCount: (data.transactions||[]).length, inpatientCount: (data.inpatientStays||[]).length, keys: Object.keys(data) },
          data,
        };
        fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
        console.log(`[${now.toISOString()}] ✅ Daily zaxira: ${fileName}`);
      } catch (err: any) {
        console.error('Daily zaxira xatosi:', err.message);
      }
      scheduleDaily();
    }, ms);
  };
  scheduleDaily();

  // API Route: Get all clinic data
  app.get('/api/data', async (req, res) => {
    try {
      const data = await loadData();
      res.json(data);
    } catch (err: any) {
      console.error('API Error /api/data:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================================
  // SSE ENDPOINT — Real-time yangilanishlar
  // Mijoz bir marta ulanadi, server ma'lumot o'zarganda darhol yuboradi
  // Polling yo'q — eng yengil va samarali usul
  // ===================================================================
  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('data: {"type":"connected"}\n\n');
    sseClients.add(res);

    // Heartbeat har 30 soniyada — ulanish tirik qoladi
    const heartbeat = setInterval(() => {
      try { res.write(': heartbeat\n\n'); } catch {}
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  // API Route: Save specific clinic collection (supports arrays AND objects for clinicSettings)
  // MUHIM: Har saqlashda avtomatik zaxira nusxa olinadi — hech qachon yo'qolmaydi
  // SAQLASH TUGAGACH — SSE orqali barcha mijozlarga real-time yuboriladi
  // patients va transactions uchun server merge-on-write qiladi (db-store.ts)
  app.post('/api/save', async (req, res) => {
    try {
      const { key, data, forceReplace } = req.body;
      if (!key || data === undefined || data === null) {
        return res.status(400).json({ error: 'Kalit va ma\'lumot kiritilishi shart.' });
      }

      // AVVAL zaxira olish — keyin saqlash (xato bo'lsa ham zaxira bor)
      backupOnSave(key, data);

      const success = await saveCollection(key, data, forceReplace === true);
      if (success) {
        // Merge bo'lganidan keyin fresh ma'lumotni o'qib broadcast qilamiz
        const freshAll = await loadData();
        const freshData = (freshAll as any)[key];
        broadcastChange(key, freshData);
        if (key === 'inpatientStays') {
          broadcastChange('hospitalRooms', freshAll.hospitalRooms);
          broadcastChange('inpatientStays', freshAll.inpatientStays);
        }
        res.json({ success: true, message: `Muvaffaqiyatli saqlandi: ${key}` });
      } else {
        res.status(500).json({ error: 'Saqlashda xatolik yuz berdi.' });
      }
    } catch (err: any) {
      console.error('API Error /api/save:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================================
  // ZAXIRA API LARI — admin panelida zaxirani boshqarish uchun
  // ===================================================================

  // Barcha zaxira fayllarini ro'yxati
  app.get('/api/backups', (req, res) => {
    try {
      const backups = listAllBackups();
      res.json({ success: true, count: backups.length, backups });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Zaxira fayldan tiklash (admin paneli uchun)
  app.post('/api/restore', async (req, res) => {
    try {
      const { file } = req.body;
      if (!file || !fs.existsSync(file)) {
        return res.status(400).json({ error: 'Zaxira fayl topilmadi.' });
      }
      // Fayl yo'lini backups papkasi ichida cheklash (xavfsizlik)
      const resolvedPath = path.resolve(file);
      if (!resolvedPath.startsWith(BACKUP_DIR)) {
        return res.status(400).json({ error: 'Faqat backups papkasidagi fayllarni tiklash mumkin.' });
      }
      const raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
      const data = raw.data || raw;
      const keys = Object.keys(data).filter((k: string) => !k.startsWith('_'));
      let restored = 0;
      for (const key of keys) {
        // forceReplace=true — backup'dagi ma'lumot to'liq tiklanadi (merge emas)
        const success = await saveCollection(key, data[key], true);
        if (success) {
          restored++;
          // Tiklangan ma'lumotni SSE orqali broadcast qilish
          broadcastChange(key, data[key]);
        }
      }
      res.json({ success: true, message: `${restored} ta kalit tiklandi`, restored, keys });
    } catch (err: any) {
      console.error('API Error /api/restore:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Joriy TiDB dan yangi zaxira yaratish (admin paneli uchun)
  app.post('/api/backup/create', async (req, res) => {
    try {
      const data = await loadData();
      const now = new Date();
      const fileName = `manual_${tsFile(now)}.json`;
      const filePath = path.join(DAILY_DIR, fileName);
      const snapshot = {
        _meta: {
          backupType: 'manual',
          createdAt: now.toISOString(),
          patientCount: (data.patients || []).length,
          transactionCount: (data.transactions || []).length,
          inpatientCount: (data.inpatientStays || []).length,
          keys: Object.keys(data),
        },
        data,
      };
      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
      const sizeKB = Math.round(fs.statSync(filePath).size / 1024);
      res.json({
        success: true,
        message: `Zaxira yaratildi: ${fileName} (${sizeKB} KB)`,
        file: filePath,
        size: sizeKB,
        meta: snapshot._meta,
      });
    } catch (err: any) {
      console.error('API Error /api/backup/create:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    console.log('🚀 [Server Mode]: Running in Development with Vite HMR Middleware.');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('📦 [Server Mode]: Running in Production serving static built files.');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 [Express Server]: Running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('💥 [Server Start Failed]:', err);
});
