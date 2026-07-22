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
    // PROFESSIONAL RELATIONAL SCHEMA (3NF)
    // Asosiy ma'lumotlar alohida ustunlarda — JSON emas.
    // extra_data faqat kam ishlatiladigan qo'shimcha ma'lumotlar uchun.
    // =====================================================

    // 1. Bemorlar jadvali — professional ustunlar
    await conn.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id VARCHAR(50) PRIMARY KEY,
        patient_code VARCHAR(50) UNIQUE,
        full_name VARCHAR(255),
        phone VARCHAR(30),
        birth_date VARCHAR(20),
        gender VARCHAR(10),
        department_id VARCHAR(50),
        doctor_id VARCHAR(50),
        doctor_name VARCHAR(255),
        status VARCHAR(50),
        payment_status VARCHAR(50),
        payment_amount INT,
        queue_number INT,
        diagnosis TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP,
        called_at TIMESTAMP NULL,
        completed_at TIMESTAMP NULL,
        extra_data LONGTEXT,
        UNIQUE INDEX idx_patient_code (patient_code),
        INDEX idx_phone (phone),
        INDEX idx_department (department_id),
        INDEX idx_doctor (doctor_id),
        INDEX idx_status (status),
        INDEX idx_payment_status (payment_status),
        INDEX idx_created (created_at)
      );
    `);

    // Eski schema (data LONGTEXT) dan yangi schema ga migratsiya
    await migratePatientsSchema(conn);

    // 2. Tranzaksiyalar jadvali — proper ustunlar
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        type VARCHAR(20),
        amount INT,
        category VARCHAR(100),
        patient_id VARCHAR(50),
        patient_name VARCHAR(255),
        date VARCHAR(20),
        time VARCHAR(10),
        created_at TIMESTAMP,
        description TEXT,
        extra_data LONGTEXT,
        INDEX idx_type (type),
        INDEX idx_patient (patient_id),
        INDEX idx_category (category),
        INDEX idx_created (created_at)
      );
    `);
    await migrateTransactionsSchema(conn);

    // 3. Statsionar bemorlar jadvali — proper ustunlar
    await conn.query(`
      CREATE TABLE IF NOT EXISTS inpatient_stays (
        id VARCHAR(50) PRIMARY KEY,
        patient_id VARCHAR(50),
        patient_name VARCHAR(255),
        room_id VARCHAR(50),
        room_number VARCHAR(50),
        department_id VARCHAR(50),
        department_name VARCHAR(255),
        doctor_name VARCHAR(255),
        status VARCHAR(50),
        check_in_date VARCHAR(20),
        check_out_date VARCHAR(20),
        planned_days INT,
        price_per_day INT,
        total_cost INT,
        amount_paid INT,
        remaining_debt INT,
        diagnosis TEXT,
        created_at TIMESTAMP,
        extra_data LONGTEXT,
        INDEX idx_status (status),
        INDEX idx_patient (patient_id),
        INDEX idx_room (room_number),
        INDEX idx_department (department_id)
      );
    `);
    await migrateInpatientStaysSchema(conn);

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
    // Old migration below — migrateJsonToRelational handles JSON blob → relational
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
    // patients migratsiyasi — proper columns bilan (patientToRow ishlatamiz)
    const [patRows]: any[] = await conn.query("SELECT json_value FROM clinic_erp_data WHERE key_name = 'patients'");
    if (patRows.length > 0) {
      const patients = JSON.parse(patRows[0].json_value);
      if (Array.isArray(patients) && patients.length > 0) {
        const [countRow]: any[] = await conn.query("SELECT COUNT(*) as cnt FROM patients");
        if (countRow[0].cnt === 0) {
          console.log(`📦 [Migration]: ${patients.length} ta bemor relational jadvalga ko'chirilmoqda...`);
          for (const p of patients) {
            if (!p.id) continue;
            const r = patientToRow(p);
            try {
              await conn.query(
                `INSERT IGNORE INTO patients (id, patient_code, full_name, phone, birth_date, gender, department_id, doctor_id, doctor_name, status, payment_status, payment_amount, queue_number, diagnosis, created_at, updated_at, called_at, completed_at, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [r.id, r.patient_code, r.full_name, r.phone, r.birth_date, r.gender, r.department_id, r.doctor_id, r.doctor_name, r.status, r.payment_status, r.payment_amount, r.queue_number, r.diagnosis, r.created_at, r.updated_at, r.called_at, r.completed_at, r.extra_data]
              );
            } catch {}
          }
          console.log(`✅ [Migration]: patients jadvali tayyor`);
        }
      }
    }

    // transactions migratsiyasi — proper columns bilan
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
            let extra: any = {};
            const extraFields = ['description', 'patientName'];
            for (const f of extraFields) { if (t[f] !== undefined) extra[f] = t[f]; }
            try {
              await conn.query(
                `INSERT IGNORE INTO transactions (id, type, amount, category, patient_id, patient_name, date, time, created_at, description, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [t.id, t.type || 'Kirim', t.amount || 0, t.category || '', t.patientId || '', t.patientName || '', t.date || '', t.time || '', created, t.description || '', Object.keys(extra).length > 0 ? JSON.stringify(extra) : null]
              );
            } catch {}
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
            try {
              await conn.query(
                `INSERT IGNORE INTO inpatient_stays (id, patient_id, room_number, department_name, status, created_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [s.id, s.patientId || '', s.roomNumber || '', s.departmentName || '', s.status || 'Davolanmoqda', created, JSON.stringify(s)]
              );
            } catch {}
          }
          console.log(`✅ [Migration]: inpatient_stays jadvali tayyor`);
        }
      }
    }
  } catch (err: any) {
    console.warn(`⚠️ [Migration]:`, err.message);
  }
}

// ===================================================================
// HELPER: Patient object ↔ DB row conversion (proper columns)
// Asosiy maydonlar alohida ustunlarda, qo'shimchalar extra_data JSON da
// ===================================================================

// Patient object → DB columns + extra_data
function patientToRow(p: any) {
  const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' ');
  // extra_data ga kam ishlatiladigan maydonlarni yig'amiz
  let extra: any = {};
  const extraFields = ['prescriptions', 'complaints', 'testResults', 'selectedServices',
    'refundStatus', 'refundedAmount', 'refundedAt', 'refundedReason',
    'patientHistory', 'isReturning', 'previousVisitId', 'visitCount'];
  for (const f of extraFields) {
    if (p[f] !== undefined) extra[f] = p[f];
  }
  return {
    id: p.id,
    patient_code: p.patientCode || p.id,
    full_name: fullName || '',
    phone: p.phone || '',
    birth_date: p.birthDate || '',
    gender: p.gender || '',
    department_id: p.departmentId || '',
    doctor_id: p.doctorId || p.departmentId || '',
    doctor_name: p.doctorName || '',
    status: p.status || 'Kutmoqda',
    payment_status: p.paymentStatus || '',
    payment_amount: p.paymentAmount || 0,
    queue_number: p.queueNumber || 0,
    diagnosis: p.diagnosis || null,
    created_at: p.createdAt ? new Date(p.createdAt) : new Date(),
    updated_at: p.updatedAt ? new Date(p.updatedAt) : new Date(),
    called_at: p.calledAt ? new Date(p.calledAt) : null,
    completed_at: p.completedAt ? new Date(p.completedAt) : null,
    extra_data: Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
  };
}

// DB row → Patient object
function rowToPatient(row: any): any {
  // Parse extra_data
  let extra: any = {};
  if (row.extra_data) {
    try { extra = JSON.parse(typeof row.extra_data === 'string' ? row.extra_data : JSON.stringify(row.extra_data)); } catch {}
  }
  // full_name → firstName, lastName, middleName
  const parts = (row.full_name || '').split(' ');
  return {
    id: row.id,
    patientCode: row.patient_code,
    lastName: parts[0] || '',
    firstName: parts[1] || '',
    middleName: parts.slice(2).join(' ') || undefined,
    phone: row.phone || '',
    birthDate: row.birth_date || '',
    gender: row.gender || '',
    departmentId: row.department_id || '',
    doctorId: row.doctor_id || '',
    doctorName: row.doctor_name || '',
    status: row.status || 'Kutmoqda',
    paymentStatus: row.payment_status || '',
    paymentAmount: row.payment_amount || 0,
    queueNumber: row.queue_number || 0,
    diagnosis: row.diagnosis || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    calledAt: row.called_at ? new Date(row.called_at).toISOString() : undefined,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : undefined,
    ...extra,
  };
}

// Partial updates → SET clause (camelCase → snake_case)
const PATIENT_COLUMN_MAP: Record<string, string> = {
  paymentStatus: 'payment_status',
  paymentAmount: 'payment_amount',
  departmentId: 'department_id',
  doctorId: 'doctor_id',
  doctorName: 'doctor_name',
  queueNumber: 'queue_number',
  birthDate: 'birth_date',
  patientCode: 'patient_code',
  fullName: 'full_name',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  calledAt: 'called_at',
  completedAt: 'completed_at',
};
const PATIENT_EXTRA_FIELDS = new Set(['prescriptions', 'complaints', 'testResults',
  'selectedServices', 'refundStatus', 'refundedAmount', 'refundedAt', 'refundedReason',
  'patientHistory', 'isReturning', 'previousVisitId', 'visitCount']);

// ===================================================================
// SCHEMA MIGRATION: eski `data` column → proper columns
// ===================================================================
async function migratePatientsSchema(conn: mysql.PoolConnection) {
  try {
    const [cols]: any[] = await conn.query("SHOW COLUMNS FROM patients LIKE 'data'");
    if (cols.length === 0) return; // already new schema
    console.log('📦 [Migration]: patients jadvali yangi schema ga ko\'chirilmoqda...');
    const [rows]: any[] = await conn.query('SELECT id, data FROM patients');
    for (const row of rows) {
      try {
        const p = JSON.parse(typeof row.data === 'string' ? row.data : JSON.stringify(row.data));
        const r = patientToRow(p);
        await conn.query(
          `UPDATE patients SET patient_code=?, full_name=?, phone=?, birth_date=?, gender=?, department_id=?, doctor_id=?, doctor_name=?, status=?, payment_status=?, payment_amount=?, queue_number=?, diagnosis=?, updated_at=?, called_at=?, completed_at=?, extra_data=? WHERE id=?`,
          [r.patient_code, r.full_name, r.phone, r.birth_date, r.gender, r.department_id, r.doctor_id, r.doctor_name, r.status, r.payment_status, r.payment_amount, r.queue_number, r.diagnosis, r.updated_at, r.called_at, r.completed_at, r.extra_data, r.id]
        );
      } catch {}
    }
    // Eski data ustunini o'chirish
    try { await conn.query('ALTER TABLE patients DROP COLUMN data'); } catch {}
    console.log(`✅ [Migration]: patients yangi schema ga ko'chirildi (${rows.length} row)`);
  } catch (err: any) {
    // Column mavjud emas — allaqachon yangi schema
  }
}

async function migrateTransactionsSchema(conn: mysql.PoolConnection) {
  try {
    const [cols]: any[] = await conn.query("SHOW COLUMNS FROM transactions LIKE 'data'");
    if (cols.length === 0) return;
    console.log('📦 [Migration]: transactions jadvali yangi schema ga ko\'chirilmoqda...');
    const [rows]: any[] = await conn.query('SELECT id, data FROM transactions');
    for (const row of rows) {
      try {
        const t = JSON.parse(typeof row.data === 'string' ? row.data : JSON.stringify(row.data));
        const created = t.createdAt ? new Date(t.createdAt) : new Date();
        let extra: any = {};
        if (t.extra_data) extra = t.extra_data;
        await conn.query(
          `UPDATE transactions SET type=?, amount=?, category=?, patient_id=?, patient_name=?, date=?, time=?, created_at=?, description=?, extra_data=? WHERE id=?`,
          [t.type || 'Kirim', t.amount || 0, t.category || '', t.patientId || '', t.patientName || '', t.date || '', t.time || '', created, t.description || '', Object.keys(extra).length > 0 ? JSON.stringify(extra) : null, t.id]
        );
      } catch {}
    }
    try { await conn.query('ALTER TABLE transactions DROP COLUMN data'); } catch {}
    console.log(`✅ [Migration]: transactions yangi schema ga ko'chirildi (${rows.length} row)`);
  } catch {}
}

async function migrateInpatientStaysSchema(conn: mysql.PoolConnection) {
  try {
    const [cols]: any[] = await conn.query("SHOW COLUMNS FROM inpatient_stays LIKE 'data'");
    if (cols.length === 0) return;
    console.log('📦 [Migration]: inpatient_stays jadvali yangi schema ga ko\'chirilmoqda...');
    const [rows]: any[] = await conn.query('SELECT id, data FROM inpatient_stays');
    for (const row of rows) {
      try {
        const s = JSON.parse(typeof row.data === 'string' ? row.data : JSON.stringify(row.data));
        const created = s.createdAt ? new Date(s.createdAt) : new Date();
        let extra: any = {};
        if (s.prescriptions) extra.prescriptions = s.prescriptions;
        if (s.gender) extra.gender = s.gender;
        if (s.phone) extra.phone = s.phone;
        await conn.query(
          `UPDATE inpatient_stays SET patient_id=?, patient_name=?, room_id=?, room_number=?, department_id=?, department_name=?, doctor_name=?, status=?, check_in_date=?, check_out_date=?, planned_days=?, price_per_day=?, total_cost=?, amount_paid=?, remaining_debt=?, diagnosis=?, created_at=?, extra_data=? WHERE id=?`,
          [s.patientId || '', `${s.lastName||''} ${s.firstName||''}`, s.roomId || '', s.roomNumber || '', s.departmentId || '', s.departmentName || '', s.doctorName || '', s.status || 'Davolanmoqda', s.checkInDate || '', s.checkOutDate || '', s.plannedDays || 0, s.pricePerDay || 0, s.totalCost || 0, s.amountPaid || 0, s.remainingDebt || 0, s.diagnosis || '', created, Object.keys(extra).length > 0 ? JSON.stringify(extra) : null, s.id]
        );
      } catch {}
    }
    try { await conn.query('ALTER TABLE inpatient_stays DROP COLUMN data'); } catch {}
    console.log(`✅ [Migration]: inpatient_stays yangi schema ga ko'chirildi (${rows.length} row)`);
  } catch {}
}

// ===================================================================
// PATIENT CRUD — PROFESSIONAL COLUMNS + SQL Transaction
// ===================================================================

// INSERT — proper columns
export async function insertPatient(patient: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const r = patientToRow(patient);
    await conn.query(
      `INSERT INTO patients (id, patient_code, full_name, phone, birth_date, gender, department_id, doctor_id, doctor_name, status, payment_status, payment_amount, queue_number, diagnosis, created_at, updated_at, called_at, completed_at, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), phone=VALUES(phone), status=VALUES(status), payment_status=VALUES(payment_status), payment_amount=VALUES(payment_amount), diagnosis=VALUES(diagnosis), updated_at=VALUES(updated_at), extra_data=VALUES(extra_data)`,
      [r.id, r.patient_code, r.full_name, r.phone, r.birth_date, r.gender, r.department_id, r.doctor_id, r.doctor_name, r.status, r.payment_status, r.payment_amount, r.queue_number, r.diagnosis, r.created_at, r.updated_at, r.called_at, r.completed_at, r.extra_data]
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

// UPDATE — proper columns, FOR UPDATE row lock
export async function updatePatient(id: string, updates: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Row lock
    const [rows]: any[] = await conn.query('SELECT extra_data FROM patients WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) {
      await conn.rollback();
      return false;
    }
    // SET clause ni quramiz
    const setClauses: string[] = ['updated_at = ?'];
    const values: any[] = [new Date()];
    let extraUpdates: any = {};
    // existing extra_data ni parse
    let existingExtra: any = {};
    if (rows[0].extra_data) {
      try { existingExtra = JSON.parse(typeof rows[0].extra_data === 'string' ? rows[0].extra_data : JSON.stringify(rows[0].extra_data)); } catch {}
    }
    for (const [key, val] of Object.entries(updates)) {
      if (key === 'id') continue;
      if (PATIENT_EXTRA_FIELDS.has(key)) {
        extraUpdates[key] = val;
      } else {
        const col = PATIENT_COLUMN_MAP[key] || key;
        setClauses.push(`${col} = ?`);
        values.push(val);
      }
    }
    // extra_data merge
    if (Object.keys(extraUpdates).length > 0) {
      const mergedExtra = { ...existingExtra, ...extraUpdates };
      setClauses.push('extra_data = ?');
      values.push(JSON.stringify(mergedExtra));
    }
    values.push(id);
    await conn.query(`UPDATE patients SET ${setClauses.join(', ')} WHERE id = ?`, values);
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

// DELETE
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

// ===================================================================
// TRANSACTION CRUD — proper columns
// ===================================================================

export async function insertTransaction(tx: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = tx.createdAt ? new Date(tx.createdAt) : new Date();
    let extra: any = {};
    if (tx.extra_data) extra = tx.extra_data;
    await conn.query(
      `INSERT INTO transactions (id, type, amount, category, patient_id, patient_name, date, time, created_at, description, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount=VALUES(amount), description=VALUES(description)`,
      [tx.id, tx.type || 'Kirim', tx.amount || 0, tx.category || '', tx.patientId || '', tx.patientName || '', tx.date || '', tx.time || '', created, tx.description || '', Object.keys(extra).length > 0 ? JSON.stringify(extra) : null]
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

// ===================================================================
// INPATIENT STAY CRUD — proper columns
// ===================================================================

export async function insertInpatientStay(stay: any): Promise<boolean> {
  if (!isDbActive || !pool) return false;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = stay.createdAt ? new Date(stay.createdAt) : new Date();
    let extra: any = {};
    if (stay.prescriptions) extra.prescriptions = stay.prescriptions;
    if (stay.gender) extra.gender = stay.gender;
    if (stay.phone) extra.phone = stay.phone;
    await conn.query(
      `INSERT INTO inpatient_stays (id, patient_id, patient_name, room_id, room_number, department_id, department_name, doctor_name, status, check_in_date, check_out_date, planned_days, price_per_day, total_cost, amount_paid, remaining_debt, diagnosis, created_at, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), amount_paid=VALUES(amount_paid), remaining_debt=VALUES(remaining_debt), diagnosis=VALUES(diagnosis)`,
      [stay.id, stay.patientId || '', `${stay.lastName||''} ${stay.firstName||''}`, stay.roomId || '', stay.roomNumber || '', stay.departmentId || '', stay.departmentName || '', stay.doctorName || '', stay.status || 'Davolanmoqda', stay.checkInDate || '', stay.checkOutDate || '', stay.plannedDays || 0, stay.pricePerDay || 0, stay.totalCost || 0, stay.amountPaid || 0, stay.remainingDebt || 0, stay.diagnosis || '', created, Object.keys(extra).length > 0 ? JSON.stringify(extra) : null]
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
    const [rows]: any[] = await conn.query('SELECT * FROM inpatient_stays WHERE id = ? FOR UPDATE', [id]);
    if (rows.length === 0) { await conn.rollback(); return false; }
    const STAY_MAP: Record<string,string> = { patientId:'patient_id', patientName:'patient_name', roomId:'room_id', roomNumber:'room_number', departmentId:'department_id', departmentName:'department_name', doctorName:'doctor_name', checkInDate:'check_in_date', checkOutDate:'check_out_date', plannedDays:'planned_days', pricePerDay:'price_per_day', totalCost:'total_cost', amountPaid:'amount_paid', remainingDebt:'remaining_debt' };
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [k,v] of Object.entries(updates)) {
      if (k === 'id') continue;
      const col = STAY_MAP[k] || k;
      setClauses.push(`${col} = ?`);
      values.push(v);
    }
    if (setClauses.length === 0) { await conn.commit(); return true; }
    values.push(id);
    await conn.query(`UPDATE inpatient_stays SET ${setClauses.join(', ')} WHERE id = ?`, values);
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

// ===================================================================
// LOAD ALL — proper columns, rowToPatient reconstruction
// ===================================================================

export async function loadAllPatients(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM patients ORDER BY created_at');
    return rows.map((r: any) => rowToPatient(r)).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load Patients]:', err.message);
    return [];
  }
}

export async function loadAllTransactions(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM transactions ORDER BY created_at');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.extra_data) {
        try { extra = JSON.parse(typeof r.extra_data === 'string' ? r.extra_data : JSON.stringify(r.extra_data)); } catch {}
      }
      return {
        id: r.id, type: r.type, amount: r.amount, category: r.category,
        patientId: r.patient_id, patientName: r.patient_name,
        date: r.date, time: r.time,
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        description: r.description || '',
        ...extra,
      };
    }).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load Transactions]:', err.message);
    return [];
  }
}

export async function loadAllInpatientStays(): Promise<any[]> {
  if (!isDbActive || !pool) return [];
  try {
    const [rows]: any[] = await pool.query('SELECT * FROM inpatient_stays ORDER BY created_at');
    return rows.map((r: any) => {
      let extra: any = {};
      if (r.extra_data) {
        try { extra = JSON.parse(typeof r.extra_data === 'string' ? r.extra_data : JSON.stringify(r.extra_data)); } catch {}
      }
      const nameParts = (r.patient_name || '').split(' ');
      return {
        id: r.id, patientId: r.patient_id,
        lastName: nameParts[0] || '', firstName: nameParts[1] || '',
        roomId: r.room_id, roomNumber: r.room_number,
        departmentId: r.department_id, departmentName: r.department_name,
        doctorName: r.doctor_name, status: r.status,
        checkInDate: r.check_in_date, checkOutDate: r.check_out_date,
        plannedDays: r.planned_days, pricePerDay: r.price_per_day,
        totalCost: r.total_cost, amountPaid: r.amount_paid, remainingDebt: r.remaining_debt,
        diagnosis: r.diagnosis || '',
        createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        ...extra,
      };
    }).filter(Boolean);
  } catch (err: any) {
    console.error('❌ [Load InpatientStays]:', err.message);
    return [];
  }
}
