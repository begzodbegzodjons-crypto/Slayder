import { useState, useEffect } from 'react';
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

  // Check if URL parameters request a standalone TV Monitor view
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasMonitorParam = params.get('view') === 'monitor';
    const hasMonitorHash = window.location.hash === '#monitor';

    if (hasMonitorParam || hasMonitorHash) {
      setIsMonitorOnly(true);
    }
  }, []);

  // Helper to save a collection to the backend database
  const saveToBackend = async (key: string, data: any) => {
    try {
      await fetch('https://medical-pro-api.norinkomp.workers.dev/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data }),
      });
    } catch (err) {
      console.error(`Backend sync failed for ${key}:`, err);
    }
  };

  // Load and synchronize all data from backend TiDB/MySQL database or fallbacks
  useEffect(() => {
    const initAndSyncData = async () => {
      try {
        const response = await fetch('https://medical-pro-api.norinkomp.workers.dev/api/data');
        if (!response.ok) throw new Error('API server unreachable');
        const dbData = await response.json();

        // 1. Load departments
        let activeDepts = DEPARTMENTS;
        if (dbData.departments && dbData.departments.length > 0) {
          activeDepts = dbData.departments;
        } else {
          const saved = localStorage.getItem('dr_maruf_departments');
          if (saved) {
            try { activeDepts = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('departments', activeDepts);
        }
        setDepartments(activeDepts);

        // 2. Load reception staff
        let activeStaff = [{ id: 'rep-1', name: 'Qabulxona xodimi', login: 'qabul', password: 'qabul123' }];
        if (dbData.receptionStaff && dbData.receptionStaff.length > 0) {
          activeStaff = dbData.receptionStaff;
        } else {
          const saved = localStorage.getItem('dr_maruf_reception_staff');
          if (saved) {
            try { activeStaff = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('receptionStaff', activeStaff);
        }
        setReceptionStaff(activeStaff);

        // 3. Load hospital rooms
        let activeRooms = INITIAL_ROOMS;
        if (dbData.hospitalRooms !== undefined) {
          activeRooms = dbData.hospitalRooms;
          localStorage.setItem('dr_maruf_hospital_rooms', JSON.stringify(activeRooms));
        } else {
          const saved = localStorage.getItem('dr_maruf_hospital_rooms');
          if (saved) {
            try { activeRooms = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('hospitalRooms', activeRooms);
        }
        setHospitalRooms(activeRooms);

        // 4. Load inpatient stays
        let activeStays = INITIAL_STAYS;
        if (dbData.inpatientStays !== undefined) {
          activeStays = dbData.inpatientStays;
          localStorage.setItem('dr_maruf_inpatient_stays', JSON.stringify(activeStays));
        } else {
          const saved = localStorage.getItem('dr_maruf_inpatient_stays');
          if (saved) {
            try { activeStays = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('inpatientStays', activeStays);
        }
        setInpatientStays(activeStays);

        // 5. Load patients
        let activePatients = INITIAL_PATIENTS;
        if (dbData.patients !== undefined) {
          activePatients = dbData.patients;
          localStorage.setItem('dr_maruf_patients_list', JSON.stringify(activePatients));
        } else {
          const saved = localStorage.getItem('dr_maruf_patients_list');
          if (saved) {
            try { activePatients = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('patients', activePatients);
        }
        setPatients(activePatients);

        // 6. Load transactions
        let activeTx: ClinicTransaction[] = [];
        if (dbData.transactions !== undefined) {
          activeTx = dbData.transactions;
          localStorage.setItem('dr_maruf_financial_transactions', JSON.stringify(activeTx));
        } else {
          const saved = localStorage.getItem('dr_maruf_financial_transactions');
          if (saved) {
            try { activeTx = JSON.parse(saved); } catch (e) {}
          }
          await saveToBackend('transactions', activeTx);
        }
        setTransactions(activeTx);

        // Load diagnosis templates
        if (dbData.diagnosisTemplates) {
          setDiagnosisTemplates(dbData.diagnosisTemplates);
          localStorage.setItem('dr_maruf_diagnosis_templates', JSON.stringify(dbData.diagnosisTemplates));
        } else {
          const saved = localStorage.getItem('dr_maruf_diagnosis_templates');
          if (saved) { try { setDiagnosisTemplates(JSON.parse(saved)); } catch (e) {} }
        }

        // Load clinic settings
        if (dbData.clinicSettings) {
          setClinicSettings(dbData.clinicSettings);
          localStorage.setItem('dr_maruf_clinic_settings', JSON.stringify(dbData.clinicSettings));
        } else {
          const saved = localStorage.getItem('dr_maruf_clinic_settings');
          if (saved) { try { setClinicSettings(JSON.parse(saved)); } catch (e) {} }
        }

      } catch (err) {
        console.warn('⚠️ [Full-Stack API Fallback]: Could not query full-stack backend. Running purely from browser localStorage.', err);
        // Pure LocalStorage recovery if backend itself throws an exception
        const savedPatients = localStorage.getItem('dr_maruf_patients_list');
        const savedRooms = localStorage.getItem('dr_maruf_hospital_rooms');
        const savedStays = localStorage.getItem('dr_maruf_inpatient_stays');
        const savedTx = localStorage.getItem('dr_maruf_financial_transactions');
        const savedDepts = localStorage.getItem('dr_maruf_departments');
        const savedStaff = localStorage.getItem('dr_maruf_reception_staff');

        try {
          if (savedPatients) setPatients(JSON.parse(savedPatients)); else setPatients(INITIAL_PATIENTS);
          if (savedRooms) setHospitalRooms(JSON.parse(savedRooms)); else setHospitalRooms(INITIAL_ROOMS);
          if (savedStays) setInpatientStays(JSON.parse(savedStays)); else setInpatientStays(INITIAL_STAYS);
          if (savedTx) setTransactions(JSON.parse(savedTx)); else setTransactions([]);
          if (savedDepts) setDepartments(JSON.parse(savedDepts)); else setDepartments(DEPARTMENTS);
          if (savedStaff) setReceptionStaff(JSON.parse(savedStaff)); else setReceptionStaff([{ id: 'rep-1', name: 'Qabulxona xodimi', login: 'qabul', password: 'qabul123' }]);
        } catch (e) {
          // absolute recovery defaults
          setPatients(INITIAL_PATIENTS);
          setHospitalRooms(INITIAL_ROOMS);
          setInpatientStays(INITIAL_STAYS);
          setDepartments(DEPARTMENTS);
        }
      }
    };

    initAndSyncData();
  }, []);

  const saveReceptionStaffList = (updatedStaff: ReceptionStaff[]) => {
    setReceptionStaff(updatedStaff);
    localStorage.setItem('dr_maruf_reception_staff', JSON.stringify(updatedStaff));
    saveToBackend('receptionStaff', updatedStaff);
  };

  const saveDiagnosisTemplates = (updated: any[]) => {
    setDiagnosisTemplates(updated);
    localStorage.setItem('dr_maruf_diagnosis_templates', JSON.stringify(updated));
    saveToBackend('diagnosisTemplates', updated);
  };

  const saveClinicSettings = (updated: any) => {
    setClinicSettings(updated);
    localStorage.setItem('dr_maruf_clinic_settings', JSON.stringify(updated));
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

  // Save patients state changes and trigger broadcast channel
  const savePatientsList = (updatedPatients: Patient[]) => {
    setPatients(updatedPatients);
    localStorage.setItem('dr_maruf_patients_list', JSON.stringify(updatedPatients));
    saveToBackend('patients', updatedPatients);
    
    // Broadcast updates to other tabs (for real-time HDMI TV monitor updating)
    try {
      const channel = new BroadcastChannel('dr_maruf_queue_channel');
      channel.postMessage({ type: 'CALL_PATIENT', data: updatedPatients });
      channel.close();
    } catch (e) {
      // Ignored if BroadcastChannel is blocked
    }
  };

  // Save departments to localStorage
  const saveDepartmentsList = (updatedDepts: Department[]) => {
    setDepartments(updatedDepts);
    localStorage.setItem('dr_maruf_departments', JSON.stringify(updatedDepts));
    saveToBackend('departments', updatedDepts);
  };

  // Save hospital rooms to localStorage
  const saveHospitalRoomsList = (updatedRooms: HospitalRoom[]) => {
    setHospitalRooms(updatedRooms);
    localStorage.setItem('dr_maruf_hospital_rooms', JSON.stringify(updatedRooms));
    saveToBackend('hospitalRooms', updatedRooms);
  };

  // Save inpatient stays and auto-update occupancies
  const saveInpatientStaysList = (updatedStays: InpatientStay[]) => {
    setInpatientStays(updatedStays);
    localStorage.setItem('dr_maruf_inpatient_stays', JSON.stringify(updatedStays));
    saveToBackend('inpatientStays', updatedStays);
    
    // Recalculate occupied beds dynamically for active stays
    const updatedRooms = hospitalRooms.map(room => {
      const activeCount = updatedStays.filter(s => s.roomId === room.id && s.status === 'Davolanmoqda').length;
      return { ...room, occupiedBeds: activeCount };
    });
    setHospitalRooms(updatedRooms);
    localStorage.setItem('dr_maruf_hospital_rooms', JSON.stringify(updatedRooms));
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

  // Save transactions list and sync with localStorage
  const saveTransactionsList = (updatedTx: ClinicTransaction[]) => {
    setTransactions(updatedTx);
    localStorage.setItem('dr_maruf_financial_transactions', JSON.stringify(updatedTx));
    saveToBackend('transactions', updatedTx);
  };

  // Add new patient registered from reception
  // Agar bemor avval ro'yxatdan o'tgan bo'lsa (previousVisitId bilan kelsa),
  // avvalgi tashrif ma'lumotlari yangi tashrifning patientHistory ga qo'shiladi
  const handleAddPatient = (
    newPatientData: Omit<Patient, 'id' | 'queueNumber' | 'createdAt' | 'status'>
  ) => {
    // Generate sequential ID and Queue number
    const maxIdNumber = patients.reduce((max, p) => {
      const num = parseInt(p.id.split('-')[1]);
      return num > max ? num : max;
    }, 1000);

    const nextId = `P-${maxIdNumber + 1}`;
    const nextQueueNumber = patients.length > 0 ? Math.max(...patients.map((p) => p.queueNumber)) + 1 : 1;

    // Agar bemor avvalgi tashrifga asoslangan bo'lsa (returning patient),
    // avvalgi tashriflarni patientHistory ga to'plash
    let patientHistory: PatientVisit[] | undefined;
    let isReturning = false;
    let visitCount = 1;
    let previousVisitId: string | undefined;

    // newPatientData.previousVisitId ni tekshirish
    const dataPreviousVisitId = (newPatientData as any).previousVisitId;
    if (dataPreviousVisitId) {
      previousVisitId = dataPreviousVisitId;
      isReturning = true;
      // Avvalgi bemorni topish
      const previousPatient = patients.find((p) => p.id === dataPreviousVisitId);
      if (previousPatient) {
        // Avvalgi tashrif ma'lumotlarini PatientVisit ga aylantirish
        const previousVisit: PatientVisit = {
          visitId: previousPatient.id,
          visitDate: previousPatient.createdAt,
          departmentId: previousPatient.departmentId,
          departmentName: departments.find((d) => d.id === previousPatient.departmentId)?.name || previousPatient.departmentId,
          doctorName: previousPatient.doctorName,
          diagnosis: previousPatient.diagnosis,
          prescriptions: previousPatient.prescriptions,
          paymentAmount: previousPatient.paymentAmount,
          status: previousPatient.status,
        };
        // Avvalgi bemorning ham tarixi bo'lishi mumkin - ularni ham qo'shamiz
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

    const updated = [...patients, newPatient];
    savePatientsList(updated);

    // Dynamic automatic logging of outpatient payment!
    if (newPatient.paymentStatus === 'To\'langan' && newPatient.paymentAmount > 0) {
      const getDeptNameLocal = (id: string) => departments.find((d) => d.id === id)?.name || id;
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

      const updatedTx = [newTx, ...transactions];
      saveTransactionsList(updatedTx);
    }
  };

  // Toggle patient's payment status
  const handleUpdatePaymentStatus = (patientId: string, status: 'To\'langan' | 'Kutilmoqda') => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return { ...p, paymentStatus: status };
      }
      return p;
    });
    savePatientsList(updated);

    // If changing to 'To'langan', log a transaction!
    const patient = patients.find(p => p.id === patientId);
    if (patient && status === 'To\'langan' && patient.paymentAmount > 0) {
      const isAlreadyLogged = transactions.some(tx => tx.patientId === patientId && tx.category === "Ambulator ko'rik");
      if (!isAlreadyLogged) {
        const getDeptNameLocal = (id: string) => departments.find((d) => d.id === id)?.name || id;
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
        saveTransactionsList([newTx, ...transactions]);
      }
    }
  };

  // Call / Accept Patient to Doctor Cabinet (turns status to 'Qabulda' and alerts TV Monitor)
  const handleCallPatient = (calledPatient: Patient) => {
    // Reset any other patient currently 'Qabulda' for the same doctor/department to completed or waiting
    const updated = patients.map((p) => {
      if (p.id === calledPatient.id) {
        return {
          ...p,
          status: 'Qabulda' as const,
          calledAt: new Date().toISOString(),
        };
      }
      // If there was an unfinished patient in 'Qabulda' for this department, push them to Completed to clear state
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

    savePatientsList(updated);
  };

  // Save diagnostic checkup records and prescriptions
  const handleUpdatePatientRecord = (patientId: string, updates: Partial<Patient>) => {
    const updated = patients.map((p) => {
      if (p.id === patientId) {
        return { ...p, ...updates };
      }
      return p;
    });
    savePatientsList(updated);
  };

  // Reset or clear clinical database history is disabled for safety and audit compliance
  const handleClearHistory = () => {
    alert("Arxiv o'chirilmaydi!");
  };

  // Delete/reject a patient (rad etish)
  const handleDeletePatient = (patientId: string) => {
    const updated = patients.filter((p) => p.id !== patientId);
    savePatientsList(updated);
  };

  // To'lov qaytarish (refund) - bemor to'lov qilgan, lekin davolanishdan bosh tortgan
  // Bu funksiya:
  // 1. Bemor holatini "Bekor qilingan" ga o'zgartiradi
  // 2. refundStatus = 'Qaytarildi' qiladi
  // 3. Kassaga Chiqim (xarajat) tranzaksiyasini qo'shadi - "To'lov qaytarildi" kategoriyasi
  // 4. Barcha hisobotlarda avtomatik aks etadi
  const handleRefundPatient = (
    patientId: string,
    refundAmount: number,
    reason: string
  ) => {
    const patient = patients.find((p) => p.id === patientId);
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
    const updatedPatients = patients.map((p) => {
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
    savePatientsList(updatedPatients);

    // 2. Kassaga Chiqim (xarajat) tranzaksiyasini qo'shish
    const todayDate = new Date().toISOString().split('T')[0];
    const todayTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
    const getDeptNameLocal = (id: string) => departments.find((d) => d.id === id)?.name || id;

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

    const updatedTx = [refundTx, ...transactions];
    saveTransactionsList(updatedTx);
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
