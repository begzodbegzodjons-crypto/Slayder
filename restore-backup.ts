/**
 * DR.Maruf Clinic — Zaxiradan Tiklash Skripti (Restore Script)
 * ============================================================
 * Berilgan zaxira fayldan TiDB ga barcha ma'lumotni tiklaydi.
 *
 * Ishlatish:
 *   bun run restore-backup.ts <zaxira-fayl-yoli>
 *   yoki: tsx restore-backup.ts <zaxira-fayl-yoli>
 *
 * Agar fayl berilmasa — eng so'nggi daily zaxirani tiklaydi.
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DAILY_DIR = path.join(BACKUP_DIR, 'daily');
const HOURLY_DIR = path.join(BACKUP_DIR, 'hourly');

const pool = mysql.createPool({
  host: process.env.TIDB_HOST || 'gateway01.eu-central-1.prod.aws.tidbcloud.com',
  user: process.env.TIDB_USER || '2WPwbqDSR8g2wQN.root',
  password: process.env.TIDB_PASSWORD || 'RpehiQpU0fwiY5mR',
  database: process.env.TIDB_DATABASE || 'lumina',
  port: parseInt(process.env.TIDB_PORT || '4000'),
  waitForConnections: true,
  connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

// Eng so'nggi zaxira faylini topish
function findLatestBackup(): string | null {
  const allFiles: { file: string; mtime: number }[] = [];
  [DAILY_DIR, HOURLY_DIR].forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
        const fp = path.join(dir, f);
        allFiles.push({ file: fp, mtime: fs.statSync(fp).mtimeMs });
      });
    }
  });
  if (allFiles.length === 0) return null;
  allFiles.sort((a, b) => b.mtime - a.mtime);
  return allFiles[0].file;
}

// Barcha zaxira fayllarini ro'yxati
function listBackups() {
  const allFiles: { file: string; name: string; dir: string; mtime: Date; size: number }[] = [];
  [
    { dir: DAILY_DIR, type: 'DAILY (o\'chirilmaydi)' },
    { dir: HOURLY_DIR, type: 'HOURLY (48 soat)' },
  ].forEach(({ dir, type }) => {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).filter(f => f.endsWith('.json')).forEach(f => {
        const fp = path.join(dir, f);
        const stat = fs.statSync(fp);
        allFiles.push({ file: fp, name: f, dir: type, mtime: stat.mtime, size: stat.size });
      });
    }
  });
  return allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
}

async function restoreFromFile(backupFile: string) {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  DR.Maruf Clinic — Zaxiradan Tiklash');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Zaxira fayl: ${backupFile}\n`);

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Fayl topilmadi: ${backupFile}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const data = raw.data || raw; // eski format qo'llab-quvvatlash
  const keys = Object.keys(data).filter(k => !k.startsWith('_'));
  console.log(`  Tiklanadigan kalitlar: ${keys.join(', ')}`);
  keys.forEach(k => {
    const v = data[k];
    const len = Array.isArray(v) ? v.length : (v ? 1 : 0);
    console.log(`    ${k}: ${len} ta yozuv`);
  });
  console.log('');

  // Tiklash
  for (const key of keys) {
    const jsonStr = JSON.stringify(data[key]);
    await pool.query(
      'INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?',
      [key, jsonStr, jsonStr]
    );
    console.log(`  ✅ ${key}: tiklandi (${jsonStr.length} bytes)`);
  }

  console.log('\n✅ BARCHA MA\'LUMOT TIKLANDI!');
  console.log(`   Fayl: ${backupFile}`);
  console.log(`   Zaxira vaqti: ${raw._meta?.createdAt || 'noma\'lum'}`);
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--list' || arg === '-l') {
    // Barcha zaxiralarni ro'yxati
    const backups = listBackups();
    if (backups.length === 0) {
      console.log('Zaxira fayllar topilmadi.');
      return;
    }
    console.log('═══════════════════════════════════════════════════════');
    console.log('  MAVJUD ZAXIRA FAYLLAR (eng yangi yuqorida)');
    console.log('═══════════════════════════════════════════════════════\n');
    backups.forEach((b, i) => {
      const sizeKB = Math.round(b.size / 1024);
      console.log(`  ${i + 1}. [${b.dir}] ${b.name} (${sizeKB} KB) — ${b.mtime.toISOString()}`);
      console.log(`     To'liq yol: ${b.file}`);
    });
    return;
  }

  // Fayl berilgan bo'lsa — undan tiklash
  if (arg) {
    await restoreFromFile(arg);
    return;
  }

  // Aks holda — eng so'nggi zaxirani topish
  const latest = findLatestBackup();
  if (!latest) {
    console.error('❌ Hech qanday zaxira fayl topilmadi. Papkalar:');
    console.error(`   ${DAILY_DIR}`);
    console.error(`   ${HOURLY_DIR}`);
    process.exit(1);
  }
  console.log(`Eng so'nggi zaxira topildi: ${latest}\n`);
  await restoreFromFile(latest);
}

main().catch(err => {
  console.error('💥 Tiklash xatosi:', err);
  process.exit(1);
}).then(() => process.exit(0));
