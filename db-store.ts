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

// Save specific key's data — supports both arrays AND objects (for clinicSettings)
export async function saveCollection(key: string, items: any): Promise<boolean> {
  const jsonStr = JSON.stringify(items);

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
}
