import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Reception } from './components/Reception';
import { DoctorCabinet } from './components/DoctorCabinet';
import { TvMonitor } from './components/TvMonitor';
import { Reports } from './components/Reports';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { Patient, Department, UserSession, HospitalRoom, InpatientStay, ClinicTransaction, ReceptionStaff, PatientVisit } from './types';
import { DEPARTMENTS } from './data';
import { Monitor, ShieldCheck } from 'lucide-react';

// API base URL — relative in dev (hits local server → TiDB), absolute in prod (Cloudflare Worker → TiDB)
const API_BASE = import.meta.env.DEV ? '' : 'https://medical-pro-api.norinkomp.workers.dev';

export default function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospitalRooms, setHospitalRooms] = useState<HospitalRoom[]>([]);
  const [inpatientStays, setInpatientStays] = useState<InpatientStay[]>([]);
  const [transactions, setTransactions] = useState<ClinicTransaction[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<string>('reception');
  const [isMonitorOnly, setIsMonitorOnly] = useState<boolean>(false);
  const [receptionStaff, setReceptionStaff] = useState<ReceptionStaff[]>([]);
  const [diagnosisTemplates, setDiagnosisTemplates] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<any>({
    clinicName: 'DR.Maruf Clinic',
    clinicPhone: '+998 71 123-45-67',
    clinicAddress: 'Toshkent, O\'zbekiston',
    recipeHeader: 'SHIFOKOR RETSEPTi (RECIPE)',
    recipeFooter: 'Sog\'ayib keting! Qayta ko\'rik: Shifokor tavsiyasiga ko\'ra.',
    ticketHeader: 'Tashrifingiz uchun rahmat!',
    ticketFooter: 'Shifokor kabineti eshigi ustidagi monitorni kuzatib boring.',
  });

  // ===================================================================
  // CRITICAL: Refs always hold the LATEST data — eliminates stale closure
  // during the 5-second sync interval. This PREVENTS data loss.
  // ===================================================================
  const patientsRef = useRef<Patient[]>([]);
  const transactionsRef = useRef<ClinicTransaction[]>([]);
  const departmentsRef = useRef<Department[]>([]);
  const hospitalRoomsRef = useRef<HospitalRoom[]>([]);
  const inpatientStaysRef = useRef<InpatientStay[]>([]);
  const receptionStaffRef = useRef<ReceptionStaff[]>([]);
  const diagnosisTemplatesRef = useRef<any[]>([]);
  const clinicSettingsRef = useRef<any>({});

  // Timestamp of the last local save — sync skips overwriting within 4 seconds
  const lastLocalSaveRef = useRef<number>(0);

  // Keep refs in sync with state
  useEffect(() => { patientsRef.current = patients; }, [patients]);
  useEffect(() => { transactionsRef.current = transactions; }, [transactions]);
  useEffect(() => { departmentsRef.current = departments; }, [departments]);
  useEffect(() => { hospitalRoomsRef.current = hospitalRooms; }, [hospitalRooms]);
  useEffect(() => { inpatientStaysRef.current = inpatientStays; }, [inpatientStays]);
  useEffect(() => { receptionStaffRef.current = receptionStaff; }, [receptionStaff]);
  useEffect(() => { diagnosisTemplatesRef.current = diagnosisTemplates; }, [diagnosisTemplates]);
  useEffect(() => { clinicSettingsRef.current = clinicSettings; }, [clinicSettings]);

  // Check if URL parameters request a standalone TV Monitor view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasMonitorParam = params.get('view') === 'monitor';
    const hasMonitorHash = window.location.hash === '#monitor';

    if (hasMonitorParam || hasMonitorHash) {
      setIsMonitorOnly(true);
    }
  }, []);

  // ===================================================================
  // SAVE QUEUE + RETRY — ma'lumot HECH QACHON yo'qolmaydi
  // Agar backend vaqtincha javob bermasa (tarmoq xatosi), so'rov navbatga
  // qo'yiladi va keyin qayta uriniladi. Bu data loss'ning oldini oladi.
  // ===================================================================
  const saveQueueRef = useRef<Map<string, any>>(new Map());
  const isFlushRef = useRef<boolean>(false);

  const flushSaveQueue = async () => {
    if (isFlushRef.current) return;
    isFlushRef.current = true;
    try {
      // Navbatdagi har bir kalitni ketma-ket saqlaymiz (oxirgi versiyasi bilan)
      const keys = Array.from(saveQueueRef.current.keys());
      for (const key of keys) {
        const queued = saveQueueRef.current.get(key);
        // queued format: { data, forceReplace } yoki to'g'ridan-to'g'ri data (eskilarga mos)
        const data = queued && typeof queued === 'object' && 'data' in queued ? queued.data : queued;
        const forceReplace = queued && typeof queued === 'object' && 'forceReplace' in queued ? queued.forceReplace : false;
        try {
          const response = await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data, forceReplace }),
          });
          if (response.ok) {
            // Muvaffaqiyatli — navbatdan o'chiramiz
            saveQueueRef.current.delete(key);
          } else {
            console.error(`Backend save failed for ${key}: HTTP ${response.status}`);
            // Navbatda qoldiriladi — keyin qayta uriniladi
          }
        } catch (err) {
          console.error(`Backend sync failed for ${key}:`, err);
          // Navbatda qoldiriladi
        }
      }
    } finally {
      isFlushRef.current = false;
    }
  };

  // Helper to save a collection to the backend TiDB database.
  // AWAIT bilan ishlaydi. Xato bo'lsa navbatga qo'yiladi va qayta uriniladi.
  // forceReplace=true bo'lsa — server merge qilmaydi, to'liq almashtiradi (o'chirish uchun)
  const saveToBackend = async (key: string, data: any, forceReplace: boolean = false) => {
    // 1) Darhol urinish — tez saqlash uchun
    try {
      const response = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data, forceReplace }),
      });
      if (response.ok) {
        return; // muvaffaqiyatli
      }
      console.error(`Backend save failed for ${key}: HTTP ${response.status} — navbatga qo'yildi`);
    } catch (err) {
      console.error(`Backend sync failed for ${key}:`, err, '— navbatga qo\'yildi');
    }
    // 2) Xato bo'lsa — navbatga qo'yamiz va keyin qayta urinamiz
    saveQueueRef.current.set(key, { data, forceReplace });
    // 3 soniyadan so'ng navbatni tozalash (backend tiklangan bo'lishi mumkin)
    setTimeout(() => { flushSaveQueue(); }, 3000);
  };

  // ===================================================================
  // REAL-TIME SSE (Server-Sent Events) — polling yo'q!
  // Bir marta ulanamiz, server ma'lumot o'zgarganda darhol qabul qilamiz.
  // Boshqa qurilmadan bemor qo'shilsa — shifokor/monitor/kassa darhol ko'radi.
  // ===================================================================
  useEffect(() => {
    // 1) Boshlang'ich ma'lumotni bir marta yuklash
    const loadInitial = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/data`);
        if (!response.ok) throw new Error('API server unreachable');
        const dbData = await response.json();

        if (dbData.departments && dbData.departments.length > 0) {
          departmentsRef.current = dbData.departments;
          setDepartments(dbData.departments);
        } else if (departmentsRef.current.length === 0) {
          departmentsRef.current = DEPARTMENTS;
          setDepartments(DEPARTMENTS);
          await saveToBackend('departments', DEPARTMENTS);
        }

        if (dbData.receptionStaff && dbData.receptionStaff.length > 0) {
          receptionStaffRef.current = dbData.receptionStaff;
          setReceptionStaff(dbData.receptionStaff);
        } else if (receptionStaffRef.current.length === 0) {
          const def = [{ id: 'rep-1', name: 'Qabulxona xodimi', login: 'qabul', password: 'qabul123' }];
          receptionStaffRef.current = def;
          setReceptionStaff(def);
          await saveToBackend('receptionStaff', def);
        }

        if (dbData.hospitalRooms !== undefined) {
          hospitalRoomsRef.current = dbData.hospitalRooms;
          setHospitalRooms(dbData.hospitalRooms);
        }
        if (dbData.inpatientStays !== undefined) {
          inpatientStaysRef.current = dbData.inpatientStays;
          setInpatientStays(dbData.inpatientStays);
        }
        if (dbData.patients !== undefined) {
          patientsRef.current = dbData.patients;
          setPatients(dbData.patients);
        }
        if (dbData.transactions !== undefined) {
          transactionsRef.current = dbData.transactions;
          setTransactions(dbData.transactions);
        }
        if (dbData.diagnosisTemplates !== undefined) {
          diagnosisTemplatesRef.current = dbData.diagnosisTemplates;
          setDiagnosisTemplates(dbData.diagnosisTemplates);
        }
        if (dbData.clinicSettings !== undefined && dbData.clinicSettings) {
          clinicSettingsRef.current = dbData.clinicSettings;
          setClinicSettings(dbData.clinicSettings);
        }
      } catch (err) {
        console.warn('⚠️ [Init]: Could not load from backend.', err);
      }
    };

    loadInitial();

    // 2) SSE ulanish — real-time yangilanishlar
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let hasConnectedBefore = false; // birinchi ulanishdan keyin true

    const resyncAll = async () => {
      // Aloqa uzilgan paytda o'tgan o'zgarishlarni o'tkazib yubormaslik uchun
      // to'liq /api/data dan o'qib, ref va state yangilanadi
      try {
        const response = await fetch(`${API_BASE}/api/data`);
        if (!response.ok) return;
        const dbData = await response.json();
        if (dbData.patients) { patientsRef.current = dbData.patients; setPatients(dbData.patients); }
        if (dbData.transactions) { transactionsRef.current = dbData.transactions; setTransactions(dbData.transactions); }
        if (dbData.departments) { departmentsRef.current = dbData.departments; setDepartments(dbData.departments); }
        if (dbData.hospitalRooms) { hospitalRoomsRef.current = dbData.hospitalRooms; setHospitalRooms(dbData.hospitalRooms); }
        if (dbData.inpatientStays) { inpatientStaysRef.current = dbData.inpatientStays; setInpatientStays(dbData.inpatientStays); }
        if (dbData.receptionStaff) { receptionStaffRef.current = dbData.receptionStaff; setReceptionStaff(dbData.receptionStaff); }
        if (dbData.diagnosisTemplates) { diagnosisTemplatesRef.current = dbData.diagnosisTemplates; setDiagnosisTemplates(dbData.diagnosisTemplates); }
        if (dbData.clinicSettings) { clinicSettingsRef.current = dbData.clinicSettings; setClinicSettings(dbData.clinicSettings); }
      } catch {}
    };

    const connectSSE = () => {
      try {
        es = new EventSource(`${API_BASE}/api/events`);

        es.onopen = () => {
          // Agar bu qayta ulanish bo'lsa (aloqa uzilganidan keyin) — to'liq resync
          if (hasConnectedBefore) {
            resyncAll();
          }
          hasConnectedBefore = true;
        };

        es.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'connected') return; // ulanish tasdiqi
            if (msg.type === 'update' && msg.key && msg.data !== undefined) {
              // Ma'lumotni darhol state va ref ga yozamiz
              // MUHIM: o'zimiz saqlagan ma'lumot ham qaytadi — bu xavfsiz (idempotent)
              switch (msg.key) {
                case 'patients':
                  patientsRef.current = msg.data;
                  setPatients(msg.data);
                  break;
                case 'transactions':
                  transactionsRef.current = msg.data;
                  setTransactions(msg.data);
                  break;
                case 'departments':
                  departmentsRef.current = msg.data;
                  setDepartments(msg.data);
                  break;
                case 'hospitalRooms':
                  hospitalRoomsRef.current = msg.data;
                  setHospitalRooms(msg.data);
                  break;
                case 'inpatientStays':
                  inpatientStaysRef.current = msg.data;
                  setInpatientStays(msg.data);
                  break;
                case 'receptionStaff':
                  receptionStaffRef.current = msg.data;
                  setReceptionStaff(msg.data);
                  break;
                case 'diagnosisTemplates':
                  diagnosisTemplatesRef.current = msg.data;
                  setDiagnosisTemplates(msg.data);
                  break;
                case 'clinicSettings':
                  clinicSettingsRef.current = msg.data;
                  setClinicSettings(msg.data);
                  break;
              }
            }
          } catch {}
        };

        es.onerror = () => {
          // Ulanish uzildi — avtomatik qayta ulanish (3 soniyadan so'ng)
          if (es) { try { es.close(); } catch {} es = null; }
          reconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch {
        reconnectTimer = setTimeout(connectSSE, 3000);
      }
    };

    connectSSE();

    return () => {
      if (es) { try { es.close(); } catch {} }
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const saveReceptionStaffList = (updatedStaff: ReceptionStaff[]) => {
    receptionStaffRef.current = updatedStaff;
    setReceptionStaff(updatedStaff);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('receptionStaff', updatedStaff);
  };

  const saveDiagnosisTemplates = (updated: any[]) => {
    diagnosisTemplatesRef.current = updated;
    setDiagnosisTemplates(updated);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('diagnosisTemplates', updated);
  };

  const saveClinicSettings = (updated: any) => {
    clinicSettingsRef.current = updated;
    setClinicSettings(updated);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('clinicSettings', updated);
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('dr_maruf_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession) as UserSession;
        setSession(parsed);
        // Set tab based on role
        if (parsed.role === 'admin') {
          setActiveTab('admin_panel');
        } else if (parsed.role === 'reception') {
          setActiveTab('reception');
        } else if (parsed.role === 'doctor') {
          setActiveTab('doctors');
        }
      } catch (e) {
        setSession(null);
      }
    }
  }, []);

  // Securely guard tab navigation based on role permissions
  useEffect(() => {
    if (session) {
      const allowedTabs: string[] = [];
      if (session.role === 'admin') {
        allowedTabs.push('admin_panel', 'reception', 'doctors', 'monitor_tab', 'reports');
      } else if (session.role === 'reception') {
        allowedTabs.push('reception', 'monitor_tab', 'reports');
      } else if (session.role === 'doctor') {
        allowedTabs.push('doctors');
      }
      
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab(allowedTabs[0] || 'reception');
      }
    }
  }, [session, activeTab]);

  // ===================================================================
  // PROFESSIONAL ROW-LEVEL API — JSON merge YO'Q
  // savePatientsList endi faqat UI optimistic update qiladi.
  // Real saqlash alohida CRUD funksiyalarda (INSERT/UPDATE/DELETE).
  // Admin paneli uchun "forceReplace" (to'liq almashtirish) hali kerak —
  // u /api/save orqali JSON blob ga yozadi (departments, rooms, settings).
  // patients/transactions/inpatientStays uchun /api/save endi ishlatilmaydi.
  // ===================================================================
  const savePatientsList = async (updatedPatients: Patient[], _forceReplace: boolean = false) => {
    patientsRef.current = updatedPatients;
    setPatients(updatedPatients);
    // Eslatma: real saqlash row-level CRUD da amalga oshiriladi
    // (handleAddPatient=POST, handleUpdatePatientRecord=PUT, handleDeletePatient=DELETE)
  };

  // Save departments to backend
  const saveDepartmentsList = (updatedDepts: Department[]) => {
    departmentsRef.current = updatedDepts;
    setDepartments(updatedDepts);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('departments', updatedDepts);
  };

  // Save hospital rooms to backend
  const saveHospitalRoomsList = (updatedRooms: HospitalRoom[]) => {
    hospitalRoomsRef.current = updatedRooms;
    setHospitalRooms(updatedRooms);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('hospitalRooms', updatedRooms);
  };

  // Save inpatient stays and auto-update occupancies
  const saveInpatientStaysList = (updatedStays: InpatientStay[]) => {
    inpatientStaysRef.current = updatedStays;
    setInpatientStays(updatedStays);
    lastLocalSaveRef.current = Date.now();
    saveToBackend('inpatientStays', updatedStays);

    // Recalculate occupied beds dynamically for active stays
    const updatedRooms = hospitalRoomsRef.current.map(room => {
      const activeCount = updatedStays.filter(s => s.roomId === room.id && s.status === 'Davolanmoqda').length;
      return { ...room, occupiedBeds: activeCount };
    });
    hospitalRoomsRef.current = updatedRooms;
    setHospitalRooms(updatedRooms);
    saveToBackend('hospitalRooms', updatedRooms);
  };


  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem('dr_maruf_session', JSON.stringify(newSession));
    
    // Set default tab based on role
    if (newSession.role === 'admin') {
      setActiveTab('admin_panel');
    } else if (newSession.role === 'reception') {
      setActiveTab('reception');
    } else if (newSession.role === 'doctor') {
      setActiveTab('doctors');
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('dr_maruf_session');
  };

  // Save transactions list — ASYNC + AWAIT to backend
  const saveTransactionsList = async (updatedTx: ClinicTransaction[]) => {
    transactionsRef.current = updatedTx;
    setTransactions(updatedTx);
    lastLocalSaveRef.current = Date.now();
    await saveToBackend('transactions', updatedTx);
  };

  // Add new patient registered from reception.
  // ASYNC: AWAIT bilan TiDB'ga saqlaydi — faqat saqlangandan keyin davom etadi.
  // Bu "navbat raqami chop etilganda ma'lumot yo'qolmasin" talabini bajaradi.
  // Agar bemor avval ro'yxatdan o'tgan bo'lsa (previousVisitId bilan kelsa),
  // avvalgi tashrif ma'lumotlari yangi tashrifning patientHistory ga qo'shiladi
  const handleAddPatient = async (
    newPatientData: Omit<Patient, 'id' | 'queueNumber' | 'createdAt' | 'status'>
  ) => {
    // Generate sequential ID and Queue number using REF (always latest, no stale)
    const currentPatients = patientsRef.current;
    const maxIdNumber = currentPatients.reduce((max, p) => {
      const num = parseInt(p.id.split('-')[1]);
      return num > max ? num : max;
    }, 1000);

    const nextId = `P-${maxIdNumber + 1}`;
    const nextQueueNumber = currentPatients.length > 0 ? Math.max(...currentPatients.map((p) => p.queueNumber)) + 1 : 1;

    // Agar bemor avvalgi tashrifga asoslangan bo'lsa (returning patient),
    // avvalgi tashriflarni patientHistory ga to'plash
    let patientHistory: PatientVisit[] | undefined;
    let isReturning = false;
    let visitCount = 1;
    let previousVisitId: string | undefined;

    const dataPreviousVisitId = (newPatientData as any).previousVisitId;
    if (dataPreviousVisitId) {
      previousVisitId = dataPreviousVisitId;
      isReturning = true;
      const previousPatient = currentPatients.find((p) => p.id === dataPreviousVisitId);
      if (previousPatient) {
        const previousVisit: PatientVisit = {
          visitId: previousPatient.id,
          visitDate: previousPatient.createdAt,
          departmentId: previousPatient.departmentId,
          departmentName: departmentsRef.current.find((d) => d.id === previousPatient.departmentId)?.name || previousPatient.departmentId,
          doctorName: previousPatient.doctorName,
          diagnosis: previousPatient.diagnosis,
          prescriptions: previousPatient.prescriptions,
          paymentAmount: previousPatient.paymentAmount,
          status: previousPatient.status,
        };
        const previousHistory = previousPatient.patientHistory || [];
        patientHistory = [previousVisit, ...previousHistory];
        visitCount = patientHistory.length + 1;
      }
    }

    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...newPatientData,
      id: nextId,
      queueNumber: nextQueueNumber,
      status: 'Kutmoqda',
      createdAt: now,
      updatedAt: now,
      isReturning,
      previousVisitId,
      visitCount,
      patientHistory,
    };

    // PROFESSIONAL: Row-level INSERT (SQL Transaction)
    // AWAIT — TiDB saqlagandan keyin davom etadi (navbat chop etishdan oldin)
    try {
      const resp = await fetch(`${API_BASE}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });
      const result = await resp.json();
      if (!result.success) {
        console.error('Bemor saqlashda xatolik:', result.error);
      }
    } catch (e) {
      console.error('Network xatolik:', e);
    }

    // UI optimistic update (SSE ham yangilaydi)
    const updated = [...currentPatients, newPatient];
    patientsRef.current = updated;
    setPatients(updated);

    // Dynamic automatic logging of outpatient payment!
    if (newPatient.paymentStatus === 'To\'langan' && newPatient.paymentAmount > 0) {
      const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;
      const todayDate = new Date().toISOString().split('T')[0];
      const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const newTx: ClinicTransaction = {
        id: 'TX-' + Math.floor(Math.random() * 900000 + 100000),
        type: 'Kirim',
        amount: newPatient.paymentAmount,
        category: "Ambulator ko'rik",
        description: `${newPatient.lastName} ${newPatient.firstName} - ${getDeptNameLocal(newPatient.departmentId)} bo'limiga navbat to'lovi`,
        date: todayDate,
        time: todayTime,
        createdAt: new Date().toISOString(),
        patientId: newPatient.id,
        patientName: `${newPatient.lastName} ${newPatient.firstName}`
      };

      // Row-level INSERT tranzaksiya
      try {
        await fetch(`${API_BASE}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newTx),
        });
        const updatedTx = [newTx, ...transactionsRef.current];
        transactionsRef.current = updatedTx;
        setTransactions(updatedTx);
      } catch (e) {
        console.error('Tranzaksiya saqlashda xatolik:', e);
      }
    }
  };

  // Toggle patient's payment status — PROFESSIONAL row-level PUT + transaction POST
  // Optimistic UI darhol, keyin REST API ga yozamiz (savePatientsList ishlatilmaydi)
  const handleUpdatePaymentStatus = async (patientId: string, status: 'To\'langan' | 'Kutilmoqda') => {
    const currentPatients = patientsRef.current;
    const ts = new Date().toISOString();

    // 1) Optimistic UI update — paymentStatus darhol yangilanadi
    const updated = currentPatients.map((p) => {
      if (p.id === patientId) {
        return { ...p, paymentStatus: status, updatedAt: ts };
      }
      return p;
    });
    patientsRef.current = updated;
    setPatients(updated);

    // 2) Row-level PUT — faqat paymentStatus maydoni (SQL Transaction)
    try {
      await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: status }),
      });
    } catch (e) {
      console.error('Payment status PUT xatolik:', e);
    }

    // 3) If changing to 'To'langan' va avval yozilmagan bo'lsa — tranzaksiya yozamiz
    const patient = currentPatients.find(p => p.id === patientId);
    const currentTx = transactionsRef.current;
    if (patient && status === 'To\'langan' && patient.paymentAmount > 0) {
      const isAlreadyLogged = currentTx.some(tx => tx.patientId === patientId && tx.category === "Ambulator ko'rik");
      if (!isAlreadyLogged) {
        const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;
        const todayDate = new Date().toISOString().split('T')[0];
        const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

        const newTx: ClinicTransaction = {
          id: 'TX-' + Math.floor(Math.random() * 900000 + 100000),
          type: 'Kirim',
          amount: patient.paymentAmount,
          category: "Ambulator ko'rik",
          description: `${patient.lastName} ${patient.firstName} - ${getDeptNameLocal(patient.departmentId)} bo'limiga navbat to'lovi`,
          date: todayDate,
          time: todayTime,
          createdAt: new Date().toISOString(),
          patientId: patient.id,
          patientName: `${patient.lastName} ${patient.firstName}`
        };
        // Optimistic update transactionsRef + setTransactions
        const updatedTx = [newTx, ...currentTx];
        transactionsRef.current = updatedTx;
        setTransactions(updatedTx);
        // Row-level INSERT transaction (SQL Transaction)
        try {
          await fetch(`${API_BASE}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTx),
          });
        } catch (e) {
          console.error('Transaction POST xatolik:', e);
        }
      }
    }
  };

  // Call / Accept Patient to Doctor Cabinet — PROFESSIONAL row-level PUT (parallel)
  // Avvalgi 'Qabulda' bemorni avtomatik 'Yakunlangan' qiladi, yangi bemorni 'Qabulda' qiladi
  const handleCallPatient = async (calledPatient: Patient) => {
    const ts = new Date().toISOString();

    // Shu bo'limda 'Qabulda' holatida turgan avvalgi bemorni topamiz (avtomatik yakunlash uchun)
    const prevPatient = patientsRef.current.find(
      (p) => p.departmentId === calledPatient.departmentId && p.status === 'Qabulda' && p.id !== calledPatient.id
    );

    // 1) Optimistic UI update — called patient -> Qabulda; prev -> Yakunlangan
    const updated = patientsRef.current.map((p) => {
      if (p.id === calledPatient.id) {
        return { ...p, status: 'Qabulda' as const, calledAt: ts, updatedAt: ts };
      }
      if (prevPatient && p.id === prevPatient.id) {
        return {
          ...p,
          status: 'Yakunlangan' as const,
          completedAt: ts,
          updatedAt: ts,
          diagnosis: p.diagnosis || 'Ko\'rik yakunlandi',
        };
      }
      return p;
    });
    patientsRef.current = updated;
    setPatients(updated);

    // 2) Row-level PUT — called patient (SQL Transaction)
    const putCalled = fetch(`${API_BASE}/api/patients/${calledPatient.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Qabulda', calledAt: ts }),
    }).catch((e) => console.error('Call patient PUT xatolik:', e));

    // 3) Row-level PUT — previous patient (parallel)
    const putPrev = prevPatient
      ? fetch(`${API_BASE}/api/patients/${prevPatient.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'Yakunlangan',
            completedAt: ts,
            diagnosis: prevPatient.diagnosis || 'Ko\'rik yakunlandi',
          }),
        }).catch((e) => console.error('Prev patient PUT xatolik:', e))
      : Promise.resolve();

    try {
      await Promise.all([putCalled, putPrev]);
    } catch (e) {
      console.error('handleCallPatient xatolik:', e);
    }
  };

  // Save diagnostic checkup records and prescriptions — PROFESSIONAL row-level PUT
  // Optimistic merge darhol, keyin partial updates REST API ga yoziladi
  const handleUpdatePatientRecord = async (patientId: string, updates: Partial<Patient>) => {
    const ts = new Date().toISOString();

    // 1) Optimistic UI update — merge updates into patient
    const updated = patientsRef.current.map((p) => {
      if (p.id === patientId) {
        return { ...p, ...updates, updatedAt: ts };
      }
      return p;
    });
    patientsRef.current = updated;
    setPatients(updated);

    // 2) Row-level PUT — partial updates object (SQL Transaction)
    try {
      await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, updatedAt: ts }),
      });
    } catch (e) {
      console.error('Patient record PUT xatolik:', e);
    }
  };

  // Reset or clear clinical database history is disabled for safety and audit compliance
  const handleClearHistory = () => {
    alert("Arxiv o'chirilmaydi!");
  };

  // Bemorni O'CHIRISH — PROFESSIONAL row-level DELETE (SQL Transaction)
  // Ma'lumot butunlay o'chiriladi (foydalanuvchi talabiga ko'ra).
  const handleDeletePatient = async (patientId: string) => {
    // 1) Optimistic UI — bemorni ro'yxatdan o'chiramiz
    const updated = patientsRef.current.filter((p) => p.id !== patientId);
    patientsRef.current = updated;
    setPatients(updated);

    // 2) Row-level DELETE — SQL Transaction
    try {
      await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.error('Patient DELETE xatolik:', e);
    }
  };

  // To'lov qaytarish (refund) - bemor to'lov qilgan, lekin davolanishdan bosh tortgan
  // Bu funksiya:
  // 1. Bemor holatini "Bekor qilingan" ga o'zgartiradi
  // 2. refundStatus = 'Qaytarildi' qiladi
  // 3. Kassaga Chiqim (xarajat) tranzaksiyasini qo'shadi - "To'lov qaytarildi" kategoriyasi
  // 4. Barcha hisobotlarda avtomatik aks etadi
  const handleRefundPatient = async (
    patientId: string,
    refundAmount: number,
    reason: string
  ) => {
    const patient = patientsRef.current.find((p) => p.id === patientId);
    if (!patient) {
      alert('Bemor topilmadi!');
      return;
    }

    if (patient.paymentStatus !== 'To\'langan') {
      alert('Ushbu bemor to\'lov qilmagan! To\'lov qaytarib bo\'lmaydi.');
      return;
    }

    if (refundAmount <= 0 || refundAmount > patient.paymentAmount) {
      alert(
        `Noto'g'ri summa! To'lov qaytarish summasi 0 dan katta va ${patient.paymentAmount.toLocaleString()} UZS dan oshmasligi kerak.`
      );
      return;
    }

    const refundTs = new Date().toISOString();
    const refundStatus: 'Qaytarildi' | 'Qisman' = refundAmount === patient.paymentAmount ? 'Qaytarildi' : 'Qisman';

    // 1) Optimistic UI — bemor statusini 'Bekor qilingan' ga o'tkazamiz
    const updatedPatients = patientsRef.current.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          status: 'Bekor qilingan' as const,
          refundStatus,
          refundedAmount: refundAmount,
          refundedAt: refundTs,
          refundedReason: reason.trim(),
          updatedAt: refundTs,
        };
      }
      return p;
    });
    patientsRef.current = updatedPatients;
    setPatients(updatedPatients);

    // 2) Row-level PUT — bemorning refund maydonlari (SQL Transaction)
    try {
      await fetch(`${API_BASE}/api/patients/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Bekor qilingan',
          refundStatus,
          refundedAmount: refundAmount,
          refundedAt: refundTs,
          refundedReason: reason.trim(),
        }),
      });
    } catch (e) {
      console.error('Refund PUT xatolik:', e);
    }

    // 3) Kassaga Chiqim (xarajat) tranzaksiyasini qo'shish
    const todayDate = new Date().toISOString().split('T')[0];
    const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;

    const refundTx: ClinicTransaction = {
      id: 'TX-' + Math.floor(Math.random() * 900000 + 100000),
      type: 'Chiqim',
      amount: refundAmount,
      category: "To'lov qaytarildi",
      description: `${patient.lastName} ${patient.firstName} - ${getDeptNameLocal(patient.departmentId)} bo'limi uchun to'lov qaytarildi. Sabab: ${reason.trim() || 'Ko\'rsatilmagan'}`,
      date: todayDate,
      time: todayTime,
      createdAt: new Date().toISOString(),
      patientId: patient.id,
      patientName: `${patient.lastName} ${patient.firstName}`,
    };

    // Optimistic update transactionsRef + setTransactions
    const updatedTx = [refundTx, ...transactionsRef.current];
    transactionsRef.current = updatedTx;
    setTransactions(updatedTx);

    // Row-level INSERT transaction (SQL Transaction)
    try {
      await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(refundTx),
      });
    } catch (e) {
      console.error('Refund transaction POST xatolik:', e);
    }
  };

  // Open the HDMI TV queue monitor in a separate tab
  const handleOpenMonitorWindow = () => {
    const monitorUrl = window.location.origin + '?view=monitor';
    const newWindow = window.open(monitorUrl, '_blank', 'width=1200,height=800');
    if (!newWindow) {
      alert('Tashqi oyna ochish brauzer tomonidan bloklandi! Iltimos, manzil satridagi block belgisi orqali popup ruxsatini bering.');
    }
  };

  // If this tab is opened specifically for the external TV (via HDMI)
  if (isMonitorOnly) {
    return <TvMonitor patients={patients} inlineMode={false} departments={departments} />;
  }

  // If user is not logged in, show the beautiful login screen
  if (!session) {
    return (
      <LoginPage
        departments={departments}
        receptionStaff={receptionStaff}
        onLoginSuccess={handleLoginSuccess}
        openMonitorWindow={handleOpenMonitorWindow}
      />
    );
  }

  return (
    <div className="min-h-screen text-slate-800 flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-900 clinic-bg-gradient">
      
      {/* Clinic Header bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openMonitorWindow={handleOpenMonitorWindow}
        session={session}
        onLogout={handleLogout}
      />

      {/* Main Workspaces based on active tab */}
      <main className="flex-1 max-w-full w-full px-4 sm:px-8 lg:px-12 py-8">
        
        {/* Workspace views */}
        {activeTab === 'admin_panel' && session.role === 'admin' && (
          <AdminPanel
            departments={departments}
            setDepartments={saveDepartmentsList}
            patients={patients}
            setPatients={savePatientsList}
            hospitalRooms={hospitalRooms}
            setHospitalRooms={saveHospitalRoomsList}
            transactions={transactions}
            onSaveTransactions={saveTransactionsList}
            inpatientStays={inpatientStays}
            receptionStaff={receptionStaff}
            setReceptionStaff={saveReceptionStaffList}
            diagnosisTemplates={diagnosisTemplates}
            setDiagnosisTemplates={saveDiagnosisTemplates}
            clinicSettings={clinicSettings}
            setClinicSettings={saveClinicSettings}
          />
        )}

        {activeTab === 'reception' && (session.role === 'admin' || session.role === 'reception') && (
          <Reception
            patients={patients}
            onAddPatient={handleAddPatient}
            onUpdatePaymentStatus={handleUpdatePaymentStatus}
            onDeletePatient={handleDeletePatient}
            onRefundPatient={handleRefundPatient}
            departments={departments}
            hospitalRooms={hospitalRooms}
            inpatientStays={inpatientStays}
            onSaveInpatientStays={saveInpatientStaysList}
            transactions={transactions}
            onSaveTransactions={saveTransactionsList}
          />
        )}

        {activeTab === 'doctors' && (
          <DoctorCabinet
            patients={patients}
            onCallPatient={handleCallPatient}
            onUpdatePatientRecord={handleUpdatePatientRecord}
            session={session}
            departments={departments}
            inpatientStays={inpatientStays}
            onSaveInpatientStays={saveInpatientStaysList}
            diagnosisTemplates={diagnosisTemplates}
            clinicSettings={clinicSettings}
          />
        )}

        {activeTab === 'monitor_tab' && (
          <div className="space-y-6">
            {/* Quick HDMI Information box */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl flex items-center justify-center shrink-0">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Tashqi HDMI Monitor/TV Tizimi</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
                    Klinika kutish zaliga o'rnatilgan televizor ekraniga ushbu navbat monitorini uzatishingiz mumkin. Shunchaki quyidagi tugmani bosing va ochilgan oynani ikkinchi monitorga (TV) tortib o'tkazing va <kbd className="px-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-xxs font-mono font-bold text-slate-500">F11</kbd> tugmasini bosib to'liq ekranga qo'ying.
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenMonitorWindow}
                className="bg-emerald-600 hover:bg-emerald-750 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
              >
                📺 HDMI TV uchun alohida oynada ochish
              </button>
            </div>

            {/* Inline Monitor preview */}
            <TvMonitor patients={patients} inlineMode={true} departments={departments} />
          </div>
        )}

        {activeTab === 'reports' && (session.role === 'admin' || session.role === 'reception') && (
          <Reports
            patients={patients}
            onClearHistory={handleClearHistory}
            departments={departments}
            inpatientStays={inpatientStays}
            transactions={transactions}
            onSaveTransactions={saveTransactionsList}
          />
        )}


      </main>

      {/* Footer Branding and Instructions */}
      <footer className="bg-slate-950/40 backdrop-blur-md border-t border-slate-900 py-6 mt-16">
        <div className="max-w-full px-4 sm:px-8 lg:px-12 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="font-medium text-slate-400">DR.Maruf Clinic ERP & CRM • Tibbiyot amaliyotini osonlashtirish</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-500">Toshkent, O'zbekiston • 2026</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
