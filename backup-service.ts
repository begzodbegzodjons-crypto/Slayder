/**
 * DR.Maruf Clinic — Avtomatik Zaxira Nusxa Xizmati (Backup Service)
 * =================================================================
 * Har 5 daqiqada TiDB dagi barcha ma'lumotlarni local papkaga saqlaydi.
 * Har kuni soat 23:59 da to'liq zaxira nusxa yaratadi (timestamp bilan).
 * Hech qanday ma'lumot o'chirilmaydi — barcha zaxiralar saqlanib qoladi.
 *
 * Ishga tushirish: bun run backup-service.ts
 * Yoki: tsx backup-service.ts
 *
 * Papka tuzilishi:
 *   /home/z/my-project/backups/
 *     ├── daily/                  — har kuni to'liq zaxira (o'chirilmaydi)
 *     │   ├── 2026-07-20_235900.json
 *     │   └── 2026-07-21_235900.json
 *     └── hourly/                 — har soatda zaxira (oxirgi 24 soat saqlanadi)
 *         ├── 2026-07-21_140000.json
 *         └── 2026-07-21_150000.json
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DAILY_DIR = path.join(BACKUP_DIR, 'daily');
const HOURLY_DIR = path.join(BACKUP_DIR, 'hourly');

// Papkalarni yaratish
[BACKUP_DIR, DAILY_DIR, HOURLY_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// TiDB ga ulanish
const pool = mysql.createPool({
  host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  user: process.env.TIDB_USER || '2WPwbqDSR8g2wQN.root',
  password: process.env.TIDB_PASSWORD || 'RpehiQpU0fwiY5mR',
  database: process.env.TIDB_DATABASE || 'lumina',
  port: parseInt(process.env.TIDB_PORT || '4000'),
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  ssl: { rejectUnauthorized: false },
});

// Joriy vaqt formatlari
const tsFile = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

// Barcha ma'lumotlarni TiDB dan o'qish
async function fetchAllData() {
  const [rows]: any[] = await pool.query('SELECT key_name, json_value FROM clinic_erp_data');
  const data: any = {};
  for (const row of rows) {
    try { data[row.key_name] = JSON.parse(row.json_value); } catch {}
  }
  return data;
}

// Zaxira nusxa yaratish
async function createBackup(type: 'hourly' | 'daily') {
  try {
    const data = await fetchAllData();
    const now = new Date();
    const fileName = `${tsFile(now)}.json`;
    const dir = type === 'daily' ? DAILY_DIR : HOURLY_DIR;
    const filePath = path.join(dir, fileName);
    const snapshot = {
      _meta: {
        backupType: type,
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
    console.log(`[${now.toISOString()}] ✅ ${type} zaxira: ${fileName} (${sizeKB} KB) | bemorlar: ${snapshot._meta.patientCount} | tranzaksiyalar: ${snapshot._meta.transactionCount}`);
    return true;
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ❌ ${type} zaxira xatosi:`, err.message);
    return false;
  }
}

// Hourly papkani tozalash (faqat oxirgi 48 soat saqlaymiz)
function cleanHourlyBackups() {
  try {
    const files = fs.readdirSync(HOURLY_DIR).filter(f => f.endsWith('.json'));
    const now = Date.now();
    const maxAge = 48 * 60 * 60 * 1000; // 48 soat
    let removed = 0;
    files.forEach(f => {
      const filePath = path.join(HOURLY_DIR, f);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        removed++;
      }
    });
    if (removed > 0) console.log(`[${new Date().toISOString()}] 🧹 ${removed} ta eski hourly zaxira o'chirildi (48 soatdan eski)`);
  } catch {}
}

// Asosiy tsikl
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DR.Maruf Clinic — Avtomatik Zaxira Nusxa Xizmati');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Zaxira papkasi: ${BACKUP_DIR}`);
  console.log(`  Daily papka:   ${DAILY_DIR} (o'chirilmaydi)`);
  console.log(`  Hourly papka:  ${HOURLY_DIR} (oxirgi 48 soat)`);
  console.log(`  Server vaqti:  ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Test ulanish
  try {
    const conn = await pool.getConnection();
    const [rows]: any[] = await conn.query('SELECT COUNT(*) as cnt FROM clinic_erp_data');
    console.log(`✅ TiDB ga ulandi. clinic_erp_data da ${rows[0].cnt} ta kalit bor.\n`);
    conn.release();
  } catch (err: any) {
    console.error('❌ TiDB ga ulanish xatosi:', err.message);
    process.exit(1);
  }

  // Boshlang'ich zaxira
  await createBackup('hourly');

  // Har 5 daqiqada hourly zaxira
  setInterval(() => { createBackup('hourly'); }, 5 * 60 * 1000);

  // Har 1 soatda hourly papkani tozalash
  setInterval(() => { cleanHourlyBackups(); }, 60 * 60 * 1000);

  // Har kuni soat 23:59 da daily zaxira
  const scheduleDaily = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const msUntilDaily = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      createBackup('daily');
      scheduleDaily(); // keyingi kun
    }, msUntilDaily);
    console.log(`⏰ Keyingi daily zaxira: ${tomorrow.toISOString()}`);
  };
  scheduleDaily();

  console.log('\n🚀 Zaxira xizmati ishga tushdi. Har 5 daqiqada zaxira yaratiladi.');
  console.log('   To\'xtatish uchun Ctrl+C bosing.\n');
}

main().catch(err => {
  console.error('💥 Zaxira xizmati xatosi:', err);
  process.exit(1);
});
