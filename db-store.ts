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
    
    const config: mysql.PoolOptions = dbUrl ? {
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
        rejectUnauthorized: false // Cloud databases often require SSL
      }
    };

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

    // Auto-detect and wipe demo data from database
    try {
      const [rows]: any[] = await pool.query('SELECT json_value FROM clinic_erp_data WHERE key_name = "patients"');
      if (rows.length > 0) {
        const patients = JSON.parse(rows[0].json_value);
        const hasDemo = patients.some((p: any) => p.id === 'P-1001' || p.firstName === 'Azizbek');
        if (hasDemo) {
          console.log('🧹 [DB Cleanup]: Demo data detected in cloud database! Wiping patients, inpatientStays, and transactions...');
          await pool.query('INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?', ['patients', '[]', '[]']);
          await pool.query('INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?', ['inpatientStays', '[]', '[]']);
          await pool.query('INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?', ['transactions', '[]', '[]']);
          
          // Let\'s reset hospitalRooms occupiedBeds to 0
          const [roomRows]: any[] = await pool.query('SELECT json_value FROM clinic_erp_data WHERE key_name = "hospitalRooms"');
          if (roomRows.length > 0) {
            const rooms = JSON.parse(roomRows[0].json_value);
            const clearedRooms = rooms.map((r: any) => ({ ...r, occupiedBeds: 0 }));
            await pool.query('INSERT INTO clinic_erp_data (key_name, json_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE json_value = ?', ['hospitalRooms', JSON.stringify(clearedRooms), JSON.stringify(clearedRooms)]);
          }
        }
      }
    } catch (cleanupErr: any) {
      console.error('⚠️ [DB Cleanup Error]: Failed to perform database demo cleanup:', cleanupErr.message);
    }
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
        return {
          patients: dataMap.get('patients') || [],
          departments: dataMap.get('departments') || [],
          receptionStaff: dataMap.get('receptionStaff') || [],
          hospitalRooms: dataMap.get('hospitalRooms') || [],
          inpatientStays: dataMap.get('inpatientStays') || [],
          transactions: dataMap.get('transactions') || []
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
    transactions: []
  };
}

// Save specific key's data
export async function saveCollection(key: keyof ClinicData, items: any[]): Promise<boolean> {
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
    let currentData: ClinicData = {
      patients: [],
      departments: [],
      receptionStaff: [],
      hospitalRooms: [],
      inpatientStays: [],
      transactions: []
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
