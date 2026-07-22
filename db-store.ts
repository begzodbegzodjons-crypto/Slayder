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

    // =====================================================
    // PROFESSIONAL RELATIONAL SCHEMA
    // Har bir entity alohida jadvalda — INSERT/UPDATE/DELETE
    // row-level, SQL transactions bilan. JSON merge YO'Q.
    // =====================================================

    // 1. Bemorlar jadvali — har bir bemor alohida row
    await conn.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        queue_number INT,
        status VARCHAR(50),
        department_id VARCHAR(50),
        payment_status VARCHAR(50),
        payment_amount INT,
        doctor_name VARCHAR(255),
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        data LONGTEXT NOT NULL,
        INDEX idx_status (status),
        INDEX idx_department (department_id),
        INDEX idx_created (created_at)
      );
    `);

    // 2. Tranzaksiyalar jadvali — append-only (faqat INSERT)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(20),
        amount INT,
        category VARCHAR(100),
        patient_id VARCHAR(50),
        created_at TIMESTAMP,
        data LONGTEXT NOT NULL,
        INDEX idx_type (type),
        INDEX idx_patient (patient_id),
        INDEX idx_created (created_at)
      );
    `);

    // 3. Statsionar bemorlar jadvali
    await conn.query(`
      CREATE TABLE IF NOT EXISTS inpatient_stays (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50),
        room_number VARCHAR(50),
        department_name VARCHAR(255),
        status VARCHAR(50),
        created_at TIMESTAMP,
        data LONGTEXT NOT NULL,
        INDEX idx_status (status),
        INDEX idx_patient (patient_id)
      );
    `);

    // 4. Eski JSON-blob jadval (departments, rooms, settings uchun hozircha qoladi)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS clinic_erp_data (
        key_name VARCHAR(100) PRIMARY KEY,
        json_value LONGTEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // =====================================================
    // MIGRATSIYA: JSON blob'dagi patients/transactions/inpatientStays
    // ni relational jadvallarga ko'chirish (bir marta)
    // =====================================================
    await migrateJsonToRelational(conn);

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

// Load data — patients/transactions/inpatientStays relational jadvallardan,
// qolganlari (departments, rooms, settings) JSON blob'dan
export async function loadData(): Promise<ClinicData> {
  if (isDbActive && pool) {
    try {
      // Relational jadvallardan o'qish (professional)
      const [patients, transactions, inpatientStays] = await Promise.all([
        loadAllPatients(),
        loadAllTransactions(),
        loadAllInpatientStays(),
      ]);

      // JSON blob'dan qolgan ma'lumotlarni o'qish
      const [rows]: any[] = await pool.query('SELECT key_name, json_value FROM clinic_erp_data');
      const dataMap = new Map<string, any>();
      for (const row of rows) {
        dataMap.set(row.key_name, JSON.parse(row.json_value));
      }

      const hospitalRooms: any[] = dataMap.get('hospitalRooms') || [];

      // PALATA BED STATUS — har doim to'g'ri hisoblanadi
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
        patients,
        departments: dataMap.get('departments') || [],
        receptionStaff: dataMap.get('receptionStaff') || [],
        hospitalRooms: recalculatedRooms,
        inpatientStays,
        transactions,
        diagnosisTemplates: dataMap.get('diagnosisTemplates') || [],
        clinicSettings: dataMap.get('clinicSettings') || null,
      };
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

// ===================================================================
// PROFESSIONAL CRUD — SQL Transactions bilan
// Har bir operatsiya BEGIN → COMMIT/ROLLBACK ichida
// JSON merge YO'Q — faqat row-level INSERT/UPDATE/DELETE
// ===================================================================

// Migratsiya: JSON blob'dan relational jadvallarga (bir marta)
async function migrateJsonToRelational(conn: mysql.PoolConnection) {
  try {
    // patients migratsiyasi
    const [patRows]: any[] = await conn.query("SELECT json_value FROM clinic_erp_data WHERE key_name = 'patients'");
    if (patRows.length > 0) {
      const patients = JSON.parse(patRows[0].json_value);
      if (Array.isArray(patients) && patients.length > 0) {
        // Jadvallarda nechta bemor borligini tekshiramiz
        const [countRow]: any[] = await conn.query("SELECT COUNT(*) as cnt FROM patients");
        if (countRow[0].cnt === 0) {
          console.log(`📦 [Migration]: ${patients.length} ta bemor relational jadvalga ko'chirilmoqda...`);
          for (const p of patients) {
            if (!p.id) continue;
            const created = p.createdAt ? new Date(p.createdAt) : new Date();
            const updated = p.updatedAt ? new Date(p.updatedAt) : created;
            await conn.query(
              `INSERT IGNORE INTO patients (id, queue_number, status, department_id, payment_status, payment_amount, doctor_name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [p.id, p.queueNumber || 0, p.status || 'Kutmoqda', p.departmentId || '', p.paymentStatus || '', p.paymentAmount || 0, p.doctorName || '', created, updated, JSON.stringify(p)]
            );
          }
          console.log(`✅ [Migration]: patients jadvali tayyor`);
        }
      }
    }

    // transactions migratsiyasi
    const [txRows]: any[] = await conn.query("SELECT json_value FROM clinic_erp_data WHERE key_name = 'transactions'");
    if (txRows.length > 0) {
      const txs = JSON.parse(txRows[0].json_value);
      if (Array.isArray(txs) && txs.length > 0) {
        const [countRow]: any[] = await conn.query("SELECT COUNT(*) as cnt FROM transactions");
        if (countRow[0].cnt === 0) {
          console.log(`📦 [Migration]: ${txs.length} ta tranzaksiya relational jadvalga ko'chirilmoqda...`);
          for (const t of txs) {
            if (!t.id) continue;
            const created = t.createdAt ? new Date(t.createdAt) : new Date();
            await conn.query(
              `INSERT IGNORE INTO transactions (id, type, amount, category, patient_id, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [t.id, t.type || 'Kirim', t.amount || 0, t.category || '', t.patientId || '', created, JSON.stringify(t)]
            );
          }
          console.log(`✅ [Migration]: transactions jadvali tayyor`);
        }
      }
    }

    // inpatient_stays migratsiyasi
    const [stayRows]: any[] = await conn.query("SELECT json_value FROM clinic_erp_data WHERE key_name = 'inpatientStays'");
    if (stayRows.length > 0) {
      const stays = JSON.parse(stayRows[0].json_value);
      if (Array.isArray(stays) && stays.length > 0) {
        const [countRow]: any[] = await conn.query("SELECT COUNT(*) as cnt FROM inpatient_stays");
        if (countRow[0].cnt === 0) {
          console.log(`📦 [Migration]: ${stays.length} ta statsionar bemor relational jadvalga ko'chirilmoqda...`);
          for (const s of stays) {
            if (!s.id) continue;
            const created = s.createdAt || s.checkInDate ? new Date(s.createdAt || s.checkInDate) : new Date();
            await conn.query(
              `INSERT IGNORE INTO inpatient_stays (id, patient_id, room_number, department_name, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [s.id, s.patientId || '', s.roomNumber || '', s.departmentName || '', s.status || 'Davolanmoqda', created, JSON.stringify(s)]
            );
          }
          console.log(`✅ [Migration]: inpatient_stays jadvali tayyor`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ [Migration]:`, err.message);
  }
}

// PATIENT CRUD — SQL Transaction bilan

// Bemor qo'shish (INSERT) — transaction ichida
export async function insertPatient(patient: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = patient.createdAt ? new Date(patient.createdAt) : new Date();
    const updated = patient.updatedAt ? new Date(patient.updatedAt) : created;
    await conn.query(
      `INSERT INTO patients (id, queue_number, status, department_id, payment_status, payment_amount, doctor_name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)`,
      [patient.id, patient.queueNumber || 0, patient.status || 'Kutmoqda', patient.departmentId || '', patient.paymentStatus || '', patient.paymentAmount || 0, patient.doctorName || '', created, updated, JSON.stringify(patient)]
    );
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [INSERT Patient]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

// Bemor yangilash (UPDATE) — transaction ichida, faqat shu ID
export async function updatePatient(id: string, updates: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Joriy ma'lumotni o'qish (FOR UPDATE — row lock, race condition yo'q)
    const [rows]: any[] = await conn.query('SELECT data FROM patients WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return false;
    }
    const current = JSON.parse(typeof rows[0].data === 'string' ? rows[0].data : JSON.stringify(rows[0].data));
    const updated = { ...current, ...updates, id };
    const ts = new Date();
    await conn.query(
      `UPDATE patients SET status = ?, department_id = ?, payment_status = ?, payment_amount = ?, doctor_name = ?, updated_at = ?, data = ? WHERE id = ?`,
      [updated.status || 'Kutmoqda', updated.departmentId || '', updated.paymentStatus || '', updated.paymentAmount || 0, updated.doctorName || '', ts, JSON.stringify(updated), id]
    );
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [UPDATE Patient ${id}]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

// Bemor o'chirish (DELETE) — transaction ichida, faqat shu ID
export async function deletePatient(id: string): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM patients WHERE id = ?', [id]);
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [DELETE Patient ${id}]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

// TRANSACTION CRUD (append-only — faqat INSERT)

export async function insertTransaction(tx: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = tx.createdAt ? new Date(tx.createdAt) : new Date();
    await conn.query(
      `INSERT INTO transactions (id, type, amount, category, patient_id, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [tx.id, tx.type || 'Kirim', tx.amount || 0, tx.category || '', tx.patientId || '', created, JSON.stringify(tx)]
    );
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [INSERT Transaction]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

// INPATIENT STAY CRUD

export async function insertInpatientStay(stay: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = stay.createdAt ? new Date(stay.createdAt) : new Date();
    await conn.query(
      `INSERT INTO inpatient_stays (id, patient_id, room_number, department_name, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)`,
      [stay.id, stay.patientId || '', stay.roomNumber || '', stay.departmentName || '', stay.status || 'Davolanmoqda', created, JSON.stringify(stay)]
    );
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [INSERT InpatientStay]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

export async function updateInpatientStay(id: string, updates: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows]: any[] = await conn.query('SELECT data FROM inpatient_stays WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) { await conn.rollback(); return false; }
    const current = JSON.parse(typeof rows[0].data === 'string' ? rows[0].data : JSON.stringify(rows[0].data));
    const updated = { ...current, ...updates, id };
    await conn.query(
      `UPDATE inpatient_stays SET patient_id = ?, room_number = ?, department_name = ?, status = ?, data = ? WHERE id = ?`,
      [updated.patientId || '', updated.roomNumber || '', updated.departmentName || '', updated.status || 'Davolanmoqda', JSON.stringify(updated), id]
    );
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [UPDATE InpatientStay ${id}]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

export async function deleteInpatientStay(id: string): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM inpatient_stays WHERE id = ?', [id]);
    await conn.commit();
    return true;
  } catch (err: any) {
    await conn.rollback();
    console.error(`❌ [DELETE InpatientStay ${id}]:`, err.message);
    return false;
  } finally {
    conn.release();
  }
}

// BARCHA bemorlarni o'qish — relational jadvaldan
export async function loadAllPatients(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT data FROM patients ORDER BY created_at');
    return rows.map((r: any) => {
      try { return JSON.parse(typeof r.data === 'string' ? r.data : JSON.stringify(r.data)); } catch { return null; }
    }).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load Patients]:', err.message);
    return [];
  }
}

// BARCHA tranzaksiyalarni o'qish
export async function loadAllTransactions(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT data FROM transactions ORDER BY created_at');
    return rows.map((r: any) => {
      try { return JSON.parse(typeof r.data === 'string' ? r.data : JSON.stringify(r.data)); } catch { return null; }
    }).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load Transactions]:', err.message);
    return [];
  }
}

// BARCHA statsionar bemorlarni o'qish
export async function loadAllInpatientStays(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT data FROM inpatient_stays ORDER BY created_at');
    return rows.map((r: any) => {
      try { return JSON.parse(typeof r.data === 'string' ? r.data : JSON.stringify(r.data)); } catch { return null; }
    }).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load InpatientStays]:', err.message);
    return [];
  }
}
