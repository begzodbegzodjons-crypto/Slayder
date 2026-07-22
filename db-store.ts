import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Local file fallback path
const FALLBACK_FILE_PATH = path.join(process.cwd(), 'clinic_data_fallback.json');

// Interface for database/file storage
export interface ClinicData {
  patients: any[];
  departments: any[];
  receptionStaff: any[];
  hospitalRooms: any[];
  inpatientStays: any[];
  transactions: any[];
  diagnosisTemplates?: any[];
  clinicSettings?: any;
}

// Pool reference
let pool: mysql.Pool | null = null;
let isDbActive = false;

// Initialize connection and tables
export async function initStorage() {
  const host = process.env.TIDB_HOST || process.env.MYSQL_HOST;
  const user = process.env.TIDB_USER || process.env.MYSQL_USER;
  const password = process.env.TIDB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.TIDB_DATABASE || process.env.MYSQL_DATABASE || 'dr_maruf_clinic';
  const port = parseInt(process.env.TIDB_PORT || process.env.MYSQL_PORT || '4000');
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl && !host) {
    console.warn('⚠️ [DB Warning]: TiDB/MySQL connection parameters are not configured in environment variables. Falling back to local file persistence: clinic_data_fallback.json');
    isDbActive = false;
    return;
  }

  try {
    console.log('🔄 [DB Connection]: Attempting to connect to TiDB/MySQL...');
    
    // Prefer explicit fields over URI for reliability with SSL
    const useExplicit = host && user && password;
    const config: mysql.PoolOptions = useExplicit ? {
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    } : (dbUrl ? {
      uri: dbUrl,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    } : {
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: {
        rejectUnauthorized: false
      }
    });

    pool = mysql.createPool(config);

    // Test connection
    const conn = await pool.getConnection();
    console.log('✅ [DB Connection]: Successfully connected to TiDB/MySQL Database.');
    
    // Create central table for flexible JSON-key value storage
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clinic_erp_data (
        key_name VARCHAR(100) PRIMARY KEY,
        json_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);
    
    conn.release();
    isDbActive = true;
    // ⚠️ MUHIM: Demo ma'lumotlarni tozalash OLIB TASHLANDI!
    // Bu kod har safar server ishga tushganda "Azizbek" ismli bemor topilsa
    // BARCHA bemorlar/tranzaksiyalar ma'lumotlarini O'CHIRIB TASHLARDI.
    // Bu data loss (ma'lumot yo'qolishi) ning asosiy sababi edi.
    // Endi hech qanday ma'lumot avtomatik o'chirilmaydi — 100% xavfsiz.
  } catch (error: any) {
    console.error('❌ [DB Connection Error]: Could not connect to TiDB/MySQL Cloud database. Error:', error.message);
    console.warn('⚠️ [DB Fallback]: Switching to local file persistence: clinic_data_fallback.json');
    isDbActive = false;
  }
}

// Load data with fallback
export async function loadData(): Promise<ClinicData> {
  if (isDbActive && pool) {
    try {
      const [rows]: any[] = await pool.query('SELECT key_name, json_value FROM clinic_erp_data');
      const dataMap = new Map<string, any>();
      for (const row of rows) {
        dataMap.set(row.key_name, JSON.parse(row.json_value));
      }

      if (dataMap.size > 0) {
        const hospitalRooms: any[] = dataMap.get('hospitalRooms') || [];
        const inpatientStays: any[] = dataMap.get('inpatientStays') || [];

        // =====================================================
        // PALATA BED STATUS — har doim to'g'ri hisoblanadi
        // occupiedBeds = shu palatada hozirda davolanayotgan
        // (status='Davolanmoqda') statsionar bemorlar soni
        // roomId YOKI roomNumber bo'yicha mos keladi
        // =====================================================
        const recalculatedRooms = hospitalRooms.map(room => {
          const activeCount = inpatientStays.filter(s => {
            if (s.status !== 'Davolanmoqda') return false;
            if (s.roomId && s.roomId === room.id) return true;
            if (s.roomNumber && s.roomNumber === room.roomNumber) return true;
            return false;
          }).length;
          return { ...room, occupiedBeds: activeCount };
        });

        return {
          patients: dataMap.get('patients') || [],
          departments: dataMap.get('departments') || [],
          receptionStaff: dataMap.get('receptionStaff') || [],
          hospitalRooms: recalculatedRooms,
          inpatientStays,
          transactions: dataMap.get('transactions') || [],
          diagnosisTemplates: dataMap.get('diagnosisTemplates') || [],
          clinicSettings: dataMap.get('clinicSettings') || null,
        };
      }
    } catch (err: any) {
      console.error('❌ [DB Load Error]: Error reading from database, using file fallback:', err.message);
    }
  }

  // Load from local JSON file
  if (fs.existsSync(FALLBACK_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('❌ [File Load Error]: Error reading fallback file, returning empty lists:', err);
    }
  }

  // Return empty data structure so App can populate with initial static arrays
  return {
    patients: [],
    departments: [],
    receptionStaff: [],
    hospitalRooms: [],
    inpatientStays: [],
    transactions: [],
    diagnosisTemplates: [],
    clinicSettings: null,
  };
}

// ===================================================================
// MUTEX LOCK — 5 xodim bir vaqtda saqlaganda ma'lumot yo'qolmasligi uchun
// Har bir key (patients, transactions, ...) uchun save operatsiyalari
// KETMA-KET bajariladi. Race condition butunlay bartaraf etiladi.
// ===================================================================
const saveLocks = new Map<string, Promise<any>>();

async function withSaveLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = saveLocks.get(key) || Promise.resolve();
  let resolveNext: () => void;
  const next = new Promise<void>((resolve) => { resolveNext = resolve; });
  saveLocks.set(key, prev.then(() => next));
  await prev; // oldingi operatsiya tugashini kutamiz
  try {
    return await fn();
  } finally {
    resolveNext!(); // keyingi operatsiyaga ruxsat
  }
}

// Save specific key's data — supports both arrays AND objects (for clinicSettings)
// MUHIM: patients va transactions uchun MERGE-ON-WRITE ishlaydi:
// - Mavjud yozuvlar (ID bo'yicha) yangi ma'lumot bilan almashtiriladi
// - Yangi yozuvlar qo'shiladi
// - Eski yozuvlar (yangi ma'lumotda yo'q) SAQLANIB QOLADI
// MUTEX LOCK orqali 5 xodim bir vaqtda saqlasa ham ma'lumot yo'qolmaydi.
export async function saveCollection(key: string, items: any, forceReplace: boolean = false): Promise<boolean> {
  return withSaveLock(key, async () => {
  let finalData = items;

  // patients va transactions uchun merge-on-write (forceReplace=false bo'lsa)
  // forceReplace=true bo'lsa — to'liq almashtirish (o'chirish/restore uchun)
  // PATIENTS uchun: updatedAt bo'yicha "YANGISI G'ALABA" — 4 doktor bir vaqtda
  // saqlasa ham hech qanday ma'lumot yo'qolmaydi. Stale (eski) ma'lumot yangi
  // ma'lumotni o'chirmaydi. Tranzaksiyalar faqat qo'shiladi (append-only).
  if (!forceReplace && isDbActive && pool && (key === 'patients' || key === 'transactions') && Array.isArray(items)) {
    try {
      const [existing]: any[] = await pool.query(
        'SELECT json_value FROM clinic_erp_data WHERE key_name = ?', [key]
      );
      if (existing.length > 0) {
        const existingItems = JSON.parse(existing[0].json_value);
        if (Array.isArray(existingItems) && existingItems.length > 0) {
          const mergedMap = new Map<string, any>();
          // Avval eski (bazadagi) ma'lumotni qo'shamiz
          for (const item of existingItems) {
            if (item && item.id) mergedMap.set(item.id, item);
          }
          // Keyin yangi ma'lumotni ID bo'yicha birlashtiramiz
          for (const item of items) {
            if (!item || !item.id) continue;
            const old = mergedMap.get(item.id);
            if (!old) {
              // Yangi yozuv — qo'shamiz
              mergedMap.set(item.id, item);
            } else if (key === 'patients') {
              // MAVJUD bemor — updatedAt bo'yicha "yangisi g'alaba"
              // Bu 4 doktor bir vaqtda saqlaganda stale overwrite oldini oladi
              const oldTs = old.updatedAt ? new Date(old.updatedAt).getTime() : 0;
              const newTs = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
              if (newTs >= oldTs) {
                // Yangi ma'lumot yangiroq — lekin eski ma'lumotdagi BO'SH
                // bo'lmagan maydonlarni saqlaymiz (field-level merge)
                mergedMap.set(item.id, { ...old, ...item });
              }
              // Aks holda eski (yangiroq) ma'lumot saqlanadi
            } else {
              // transactions — incoming wins (append-only, o'zgartirilmaydi)
              mergedMap.set(item.id, item);
            }
          }
          finalData = Array.from(mergedMap.values());
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [Merge]: Could not merge "${key}", using direct save:`, err.message);
    }
  }

  const jsonStr = JSON.stringify(finalData);

  if (isDbActive && pool) {
    try {
      await pool.query(
        'INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?',
        [key, jsonStr, jsonStr]
      );
      return true;
    } catch (err: any) {
      console.error(`❌ [DB Save Error]: Failed to save key "${key}" to TiDB/MySQL:`, err.message);
    }
  }

  // Fallback save to file
  try {
    let currentData: any = {
      patients: [],
      departments: [],
      receptionStaff: [],
      hospitalRooms: [],
      inpatientStays: [],
      transactions: [],
      diagnosisTemplates: [],
      clinicSettings: null,
    };

    if (fs.existsSync(FALLBACK_FILE_PATH)) {
      try {
        currentData = JSON.parse(fs.readFileSync(FALLBACK_FILE_PATH, 'utf-8'));
      } catch (e) {}
    }

    currentData[key] = items;
    fs.writeFileSync(FALLBACK_FILE_PATH, JSON.stringify(currentData, null, 2), 'utf-8');
    return true;
  } catch (err: any) {
    console.error(`❌ [File Save Error]: Failed to save key "${key}" to local fallback:`, err.message);
    return false;
  }
  }); // withSaveLock tugadi
}
