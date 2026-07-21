import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Reception } from './components/Reception';
import { DoctorCabinet } from './components/DoctorCabinet';
import { TvMonitor } from './components/TvMonitor';
import { Reports } from './components/Reports';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { Patient, Department, UserSession, HospitalRoom, InpatientStay, ClinicTransaction, ReceptionStaff, PatientVisit } from './types';
import { INITIAL_PATIENTS, DEPARTMENTS, INITIAL_ROOMS, INITIAL_STAYS } from './data';
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
  // Prevents concurrent sync runs
  const isSyncingRef = useRef<boolean>(false);

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
        const data = saveQueueRef.current.get(key);
        try {
          const response = await fetch(`${API_BASE}/api/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, data }),
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
  // AWAIT bilan ishlaydi — race condition yo'q. Relative URL dev'da local serverga,
  // prod'da Cloudflare Worker'ga boradi. Xato bo'lsa navbatga qo'yiladi va qayta uriniladi.
  const saveToBackend = async (key: string, data: any) => {
    // 1) Darhol urinish — tez saqlash uchun
    try {
      const response = await fetch(`${API_BASE}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data }),
      });
      if (response.ok) {
        return; // muvaffaqiyatli
      }
      console.error(`Backend save failed for ${key}: HTTP ${response.status} — navbatga qo'yildi`);
    } catch (err) {
      console.error(`Backend sync failed for ${key}:`, err, '— navbatga qo\'yildi');
    }
    // 2) Xato bo'lsa — navbatga qo'yamiz va keyin qayta urinamiz
    saveQueueRef.current.set(key, data);
    // 3 soniyadan so'ng navbatni tozalash (backend tiklangan bo'lishi mumkin)
    setTimeout(() => { flushSaveQueue(); }, 3000);
  };

  // Sinxronlash holati — boshqa qurilmalardan kelgan yangi ma'lumotni qabul qilish
  // Lekin joriy local ma'lumotni BOSMASLIK

  // Load and synchronize all data from backend TiDB database.
  // Avtomatik yangilash - har 5 soniyada boshqa qurilmalardan kiritilgan ma'lumotlarni olish.
  // MUHIM: Refs dan foydalanamiz (stale closure emas). Local save'dan keyin 4 soniya ichida
  // sync o'tkazib yuboriladi — bu race condition'ning oldini oladi.
  useEffect(() => {
    const initAndSyncData = async () => {
      // Agar local save 4 soniya ichida bo'lsa — sync o'tkazamiz (overwrite xavfi yo'q)
      const sinceLastSave = Date.now() - lastLocalSaveRef.current;
      if (sinceLastSave < 4000) return;
      // Oldingi sync tugamagan bo'lsa — o'tkazamiz
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      try {
        const response = await fetch(`${API_BASE}/api/data`);
        if (!response.ok) throw new Error('API server unreachable');
        const dbData = await response.json();

        // 1. Load departments
        if (dbData.departments && dbData.departments.length > 0) {
          departmentsRef.current = dbData.departments;
          setDepartments(dbData.departments);
        } else if (departmentsRef.current.length === 0) {
          // First load with empty backend — seed defaults
          departmentsRef.current = DEPARTMENTS;
          setDepartments(DEPARTMENTS);
          await saveToBackend('departments', DEPARTMENTS);
        }

        // 2. Load reception staff
        if (dbData.receptionStaff && dbData.receptionStaff.length > 0) {
          receptionStaffRef.current = dbData.receptionStaff;
          setReceptionStaff(dbData.receptionStaff);
        } else if (receptionStaffRef.current.length === 0) {
          const def = [{ id: 'rep-1', name: 'Qabulxona xodimi', login: 'qabul', password: 'qabul123' }];
          receptionStaffRef.current = def;
          setReceptionStaff(def);
          await saveToBackend('receptionStaff', def);
        }

        // 3. Load hospital rooms
        if (dbData.hospitalRooms !== undefined) {
          hospitalRoomsRef.current = dbData.hospitalRooms;
          setHospitalRooms(dbData.hospitalRooms);
        } else if (hospitalRoomsRef.current.length === 0) {
          hospitalRoomsRef.current = INITIAL_ROOMS;
          setHospitalRooms(INITIAL_ROOMS);
          await saveToBackend('hospitalRooms', INITIAL_ROOMS);
        }

        // 4. Load inpatient stays
        if (dbData.inpatientStays !== undefined) {
          inpatientStaysRef.current = dbData.inpatientStays;
          setInpatientStays(dbData.inpatientStays);
        } else if (inpatientStaysRef.current.length === 0) {
          inpatientStaysRef.current = INITIAL_STAYS;
          setInpatientStays(INITIAL_STAYS);
          await saveToBackend('inpatientStays', INITIAL_STAYS);
        }

        // 5. Load patients — SMART MERGE using REF (always latest, no stale closure)
        // Bu eng muhim qism: local ma'lumot HECH QACHON yo'qolmaydi
        if (dbData.patients !== undefined) {
          const backendPatients: any[] = dbData.patients;
          const currentLocal: any[] = patientsRef.current; // REF — always latest!

          const localMap = new Map(currentLocal.map((p: any) => [p.id, p]));
          const backendMap = new Map(backendPatients.map((p: any) => [p.id, p]));

          const mergedMap = new Map();
          const allIds = new Set([...localMap.keys(), ...backendMap.keys()]);

          for (const id of allIds) {
            const lp = localMap.get(id) as any;
            const bp = backendMap.get(id) as any;

            if (lp && bp) {
              // Ikkalasida bor — eng boy (to'liq) ma'lumotni olamiz
              // Backend asos, lekin local'dagi BO'SH bo'lmagan maydonlarni saqlaymiz
              const merged: any = { ...bp };

              // selectedServices — local'da bor, backend'da yo'q yoki kam → local'nikini olamiz
              if (lp.selectedServices && lp.selectedServices.length > 0) {
                if (!bp.selectedServices || bp.selectedServices.length < lp.selectedServices.length) {
                  merged.selectedServices = lp.selectedServices;
                }
              }
              // paymentAmount — kattaroq qiymatni olamiz (xizmatlar qo'shilganda oshadi)
              if ((lp.paymentAmount || 0) > (bp.paymentAmount || 0)) {
                merged.paymentAmount = lp.paymentAmount;
              }
              // paymentStatus — To'langan ustunlik qiladi
              if (lp.paymentStatus === 'To\'langan' && bp.paymentStatus !== 'To\'langan') {
                merged.paymentStatus = lp.paymentStatus;
              }
              // diagnosis, prescriptions, complaints, testResults
              if (lp.diagnosis && !bp.diagnosis) merged.diagnosis = lp.diagnosis;
              if (lp.prescriptions && lp.prescriptions.length > 0 && (!bp.prescriptions || bp.prescriptions.length === 0)) {
                merged.prescriptions = lp.prescriptions;
              }
              if (lp.complaints && !bp.complaints) merged.complaints = lp.complaints;
              if (lp.testResults && !bp.testResults) merged.testResults = lp.testResults;
              // refund ma'lumotlari
              if (lp.refundStatus && !bp.refundStatus) merged.refundStatus = lp.refundStatus;
              if (lp.refundedAmount && !bp.refundedAmount) merged.refundedAmount = lp.refundedAmount;
              if (lp.refundedReason && !bp.refundedReason) merged.refundedReason = lp.refundedReason;
              if (lp.refundedAt && !bp.refundedAt) merged.refundedAt = lp.refundedAt;
              // patientHistory
              if (lp.patientHistory && lp.patientHistory.length > 0 && (!bp.patientHistory || bp.patientHistory.length === 0)) {
                merged.patientHistory = lp.patientHistory;
              }
              // returning patient info
              if (lp.isReturning && !bp.isReturning) merged.isReturning = lp.isReturning;
              if (lp.visitCount && !bp.visitCount) merged.visitCount = lp.visitCount;
              if (lp.previousVisitId && !bp.previousVisitId) merged.previousVisitId = lp.previousVisitId;
              // status: local'dagi "Qabulda"/"Yakunlangan"/"Bekor qilingan" ustunlik qiladi
              if (lp.status !== 'Kutmoqda' && bp.status === 'Kutmoqda') {
                merged.status = lp.status;
              }
              // timestamps
              if (lp.calledAt && !bp.calledAt) merged.calledAt = lp.calledAt;
              if (lp.completedAt && !bp.completedAt) merged.completedAt = lp.completedAt;

              mergedMap.set(id, merged);
            } else if (lp) {
              // Faqat local'da bor — saqlaymiz (boshqa qurilmadan o'chirilmagan bo'lsa)
              mergedMap.set(id, lp);
            } else if (bp) {
              // Faqat backend'da bor — boshqa qurilmadan kelgan yangi bemor — qo'shamiz
              mergedMap.set(id, bp);
            }
          }

          const merged = Array.from(mergedMap.values());
          // Faqat farq bo'lsa state'ni yangilaymiz (keraksiz render oldini olish)
          if (merged.length !== currentLocal.length || JSON.stringify(merged) !== JSON.stringify(currentLocal)) {
            patientsRef.current = merged;
            setPatients(merged);
          }
        } else if (patientsRef.current.length === 0) {
          patientsRef.current = INITIAL_PATIENTS;
          setPatients(INITIAL_PATIENTS);
        }

        // 6. Load transactions — merge by ID
        if (dbData.transactions !== undefined) {
          const backendTx: any[] = dbData.transactions;
          const localTx: any[] = transactionsRef.current;
          const txMap = new Map<string, any>();
          // Barcha tranzaksiyalarni qo'shamiz (ID bo'yicha dedup)
          [...localTx, ...backendTx].forEach((t: any) => {
            if (!txMap.has(t.id)) txMap.set(t.id, t);
          });
          const mergedTx = Array.from(txMap.values());
          if (mergedTx.length !== localTx.length) {
            transactionsRef.current = mergedTx;
            setTransactions(mergedTx);
          }
        }

        // 7. Load diagnosis templates
        if (dbData.diagnosisTemplates) {
          diagnosisTemplatesRef.current = dbData.diagnosisTemplates;
          setDiagnosisTemplates(dbData.diagnosisTemplates);
        }

        // 8. Load clinic settings
        if (dbData.clinicSettings) {
          clinicSettingsRef.current = dbData.clinicSettings;
          setClinicSettings(dbData.clinicSettings);
        }

      } catch (err) {
        console.warn('⚠️ [API Fallback]: Could not sync from backend.', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    initAndSyncData();

    // Avtomatik yangilash - har 5 soniyada backend'dan ma'lumot olish
    const syncInterval = setInterval(initAndSyncData, 5000);

    return () => {
      clearInterval(syncInterval);
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

  // Save patients — ASYNC + AWAIT. CRITICAL for data safety.
  // 1. Ref DARHOL yangilanadi (sync'lar eng yangi ma'lumotni ko'radi)
  // 2. React state yangilanadi (UI tez yangilanadi)
  // 3. lastLocalSaveRef o'rnatiladi (4 soniya sync'ni o'tkazib yuboradi)
  // 4. Backend'ga AWAIT bilan saqlanadi (ma'lumot yo'qolmaydi)
  // Boshqa qurilmalarga broadcast
  const savePatientsList = async (updatedPatients: Patient[]) => {
    patientsRef.current = updatedPatients; // REF first — sync sees latest
    setPatients(updatedPatients);
    lastLocalSaveRef.current = Date.now();
    await saveToBackend('patients', updatedPatients); // AWAIT — TiDB saqlaydi

    // Broadcast updates to other tabs
    try {
      const channel = new BroadcastChannel('dr_maruf_queue_channel');
      channel.postMessage({ type: 'CALL_PATIENT', data: updatedPatients });
      channel.close();
    } catch (e) {}
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

    const newPatient: Patient = {
      ...newPatientData,
      id: nextId,
      queueNumber: nextQueueNumber,
      status: 'Kutmoqda',
      createdAt: new Date().toISOString(),
      isReturning,
      previousVisitId,
      visitCount,
      patientHistory,
    };

    const updated = [...currentPatients, newPatient];
    // CRITICAL: AWAIT backend save before returning — ensures TiDB has the data
    // before the caller (Reception.tsx) prints the queue number to XPrinter
    await savePatientsList(updated);

    // Dynamic automatic logging of outpatient payment!
    if (newPatient.paymentStatus === 'To\'langan' && newPatient.paymentAmount > 0) {
      const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;
      const todayDate = new Date().toISOString().split('T')[0];
      const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

      const newTx: ClinicTransaction = {
        id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
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

      const updatedTx = [newTx, ...transactionsRef.current];
      await saveTransactionsList(updatedTx);
    }
  };

  // Toggle patient's payment status — uses REF for latest data
  // ASYNC: savePatientsList AWAIT qilinadi — ma'lumot yo'qolmaydi
  const handleUpdatePaymentStatus = async (patientId: string, status: 'To\'langan' | 'Kutilmoqda') => {
    const currentPatients = patientsRef.current;
    const updated = currentPatients.map((p) => {
      if (p.id === patientId) {
        return { ...p, paymentStatus: status };
      }
      return p;
    });
    await savePatientsList(updated);

    // If changing to 'To'langan', log a transaction!
    const patient = currentPatients.find(p => p.id === patientId);
    const currentTx = transactionsRef.current;
    if (patient && status === 'To\'langan' && patient.paymentAmount > 0) {
      const isAlreadyLogged = currentTx.some(tx => tx.patientId === patientId && tx.category === "Ambulator ko'rik");
      if (!isAlreadyLogged) {
        const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;
        const todayDate = new Date().toISOString().split('T')[0];
        const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

        const newTx: ClinicTransaction = {
          id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
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
        await saveTransactionsList([newTx, ...currentTx]);
      }
    }
  };

  // Call / Accept Patient to Doctor Cabinet — uses REF
  // ASYNC: save AWAIT qilinadi — status darhol TiDB'ga yoziladi
  const handleCallPatient = async (calledPatient: Patient) => {
    const updated = patientsRef.current.map((p) => {
      if (p.id === calledPatient.id) {
        return {
          ...p,
          status: 'Qabulda' as const,
          calledAt: new Date().toISOString(),
        };
      }
      if (p.departmentId === calledPatient.departmentId && p.status === 'Qabulda') {
        return {
          ...p,
          status: 'Yakunlangan' as const,
          completedAt: new Date().toISOString(),
          diagnosis: p.diagnosis || 'Ko\'rik yakunlandi',
        };
      }
      return p;
    });

    await savePatientsList(updated);
  };

  // Save diagnostic checkup records and prescriptions — uses REF
  // ASYNC: save AWAIT qilinadi — tashxis/dori darhol saqlanadi
  const handleUpdatePatientRecord = async (patientId: string, updates: Partial<Patient>) => {
    const updated = patientsRef.current.map((p) => {
      if (p.id === patientId) {
        return { ...p, ...updates };
      }
      return p;
    });
    await savePatientsList(updated);
  };

  // Reset or clear clinical database history is disabled for safety and audit compliance
  const handleClearHistory = () => {
    alert("Arxiv o'chirilmaydi!");
  };

  // Delete/reject a patient (rad etish) — uses REF
  // ASYNC: save AWAIT qilinadi
  const handleDeletePatient = async (patientId: string) => {
    const updated = patientsRef.current.filter((p) => p.id !== patientId);
    await savePatientsList(updated);
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

    // 1. Bemor ma'lumotlarini yangilash
    const updatedPatients = patientsRef.current.map((p) => {
      if (p.id === patientId) {
        return {
          ...p,
          status: 'Bekor qilingan' as const,
          refundStatus: (refundAmount === p.paymentAmount ? 'Qaytarildi' : 'Qisman') as 'Qaytarildi' | 'Qisman',
          refundedAmount: refundAmount,
          refundedAt: new Date().toISOString(),
          refundedReason: reason.trim(),
        };
      }
      return p;
    });
    await savePatientsList(updatedPatients);

    // 2. Kassaga Chiqim (xarajat) tranzaksiyasini qo'shish
    const todayDate = new Date().toISOString().split('T')[0];
    const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const getDeptNameLocal = (id: string) => departmentsRef.current.find((d) => d.id === id)?.name || id;

    const refundTx: ClinicTransaction = {
      id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
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

    const updatedTx = [refundTx, ...transactionsRef.current];
    await saveTransactionsList(updatedTx);
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
