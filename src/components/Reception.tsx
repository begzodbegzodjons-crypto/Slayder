import React, { useState, useEffect, useMemo } from 'react';
import { Patient, DepartmentId, Department, HospitalRoom, InpatientStay, Medication, ClinicTransaction, ExtraService, DepartmentService } from '../types';
import {
  Plus,
  Search,
  UserCheck,
  Coins,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Bed,
  Trash2,
  User,
  Stethoscope,
  FileText,
  CheckCircle,
  X,
  PlusCircle,
  Calendar,
  Printer,
  XCircle,
  FlaskConical,
  Activity,
  ListChecks,
} from 'lucide-react';

interface ReceptionProps {
  patients: Patient[];
  onAddPatient: (patient: Omit<Patient, 'id' | 'queueNumber' | 'createdAt' | 'status'>) => void;
  onUpdatePaymentStatus: (patientId: string, status: 'To\'langan' | 'Kutilmoqda') => void;
  onDeletePatient?: (patientId: string) => void;
  onRefundPatient?: (patientId: string, refundAmount: number, reason: string) => void;
  departments: Department[];
  hospitalRooms: HospitalRoom[];
  inpatientStays: InpatientStay[];
  onSaveInpatientStays: (stays: InpatientStay[]) => void;
  transactions: ClinicTransaction[];
  onSaveTransactions: (tx: ClinicTransaction[]) => void;
}

export const Reception: React.FC<ReceptionProps> = ({
  patients,
  onAddPatient,
  onUpdatePaymentStatus,
  onDeletePatient,
  onRefundPatient,
  departments,
  hospitalRooms = [],
  inpatientStays = [],
  onSaveInpatientStays,
  transactions = [],
  onSaveTransactions,
}) => {
  const DEPARTMENTS = departments;

  // Active sub-tab inside reception (Ambulator navbat vs Shifoxona yotib davolanish vs Moliya)
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'inpatient' | 'finance'>('queue');

  // Interactive room & beds details modal states
  const [selectedRoomForBeds, setSelectedRoomForBeds] = useState<HospitalRoom | null>(null);
  const [isAdmittingFromBed, setIsAdmittingFromBed] = useState<boolean>(false);
  const [admittingBedIndex, setAdmittingBedIndex] = useState<number>(-1);

  // ==========================================
  // 3. FINANCIAL TRANSACTIONS / KASSA STATES
  // ==========================================
  const [financeType, setFinanceType] = useState<'Kirim' | 'Chiqim'>('Kirim');
  const [financeAmount, setFinanceAmount] = useState<number>(0);
  const [financeCategory, setFinanceCategory] = useState<string>('Klinika xarajati');
  const [financeDescription, setFinanceDescription] = useState<string>('');
  const [financeDate, setFinanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [financeTime, setFinanceTime] = useState<string>('');
  const [financeSearch, setFinanceSearch] = useState<string>('');
  const [financeFilter, setFinanceFilter] = useState<string>('all');

  // Set default financeTime on mount
  useEffect(() => {
    if (!financeTime) {
      setFinanceTime(new Date().toTimeString().split(' ')[0].substring(0, 5));
    }
  }, [financeTime]);

  // Helper to add transaction
  const addTransaction = (
    type: 'Kirim' | 'Chiqim',
    amount: number,
    category: string,
    description: string,
    patientId?: string,
    patientName?: string,
    customDate?: string,
    customTime?: string
  ) => {
    const txDate = customDate || new Date().toISOString().split('T')[0];
    const txTime = customTime || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const newTx: ClinicTransaction = {
      id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
      type,
      amount,
      category,
      description,
      date: txDate,
      time: txTime,
      createdAt: new Date(`${txDate}T${txTime}:00`).toISOString(),
      patientId,
      patientName
    };
    const updated = [newTx, ...transactions];
    onSaveTransactions(updated);
  };

  // ==========================================
  // 1. AMBULATORY / QUEUE REGISTRATION STATES
  // ==========================================
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('+998');
  const [gender, setGender] = useState<'Erkak' | 'Ayol'>('Erkak');
  const [departmentId, setDepartmentId] = useState<DepartmentId>('');
  const [paymentStatus, setPaymentStatus] = useState<'To\'langan' | 'Kutilmoqda'>('To\'langan');
  const [customPrice, setCustomPrice] = useState<number>(150000);
  const [selectedServices, setSelectedServices] = useState<DepartmentService[]>([]);
  const [manualPriceOverride, setManualPriceOverride] = useState<boolean>(false);

  // Duplicate patient detection - avval ro'yxatdan o'tgan bemorlarni topish
  const [previousVisitId, setPreviousVisitId] = useState<string | undefined>(undefined);
  const [duplicatePatientSelected, setDuplicatePatientSelected] = useState<Patient | null>(null);

  // Foydalanuvchi familiya kiritayotganda, avval ro'yxatdan o'tgan bemorlarni topish
  // (faqat Yakunlangan va Bekor qilingan holatdagi bemorlar - faol navbatdagilar emas)
  const duplicatePatients = useMemo(() => {
    if (!lastName.trim() || lastName.trim().length < 2) return [];
    const search = lastName.trim().toLowerCase();
    return patients.filter(
      (p) =>
        p.lastName.trim().toLowerCase() === search &&
        (p.status === 'Yakunlangan' || p.status === 'Bekor qilingan') &&
        !previousVisitId
    ).slice(0, 8);
  }, [lastName, patients, previousVisitId]);

  // Bemor tanlanganda (duplicate patient), barcha maydonlarni avtomatik to'ldirish
  const handleSelectExistingPatient = (existingPatient: Patient) => {
    // Bemorning shaxsiy ma'lumotlarini avtomatik to'ldirish
    setFirstName(existingPatient.firstName);
    setMiddleName(existingPatient.middleName || '');
    setPhone(existingPatient.phone);
    setBirthDate(existingPatient.birthDate);
    setGender(existingPatient.gender);
    setPreviousVisitId(existingPatient.id);
    setDuplicatePatientSelected(existingPatient);
    // Bo'lim va narxni ham avvalgi tashrifdan o'tkazish
    if (existingPatient.departmentId) {
      setDepartmentId(existingPatient.departmentId);
      const dept = DEPARTMENTS.find((d) => d.id === existingPatient.departmentId);
      if (dept) {
        setCustomPrice(dept.price);
        setSelectedServices([]);
        setManualPriceOverride(false);
      }
    }
  };

  // Bemor tanlashni bekor qilish
  const handleClearDuplicateSelection = () => {
    setPreviousVisitId(undefined);
    setDuplicatePatientSelected(null);
    setLastName('');
    setFirstName('');
    setMiddleName('');
    setPhone('+998');
    setBirthDate('');
    setGender('Erkak');
  };

  // Search/Filter states for ambulatory queue
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Print ticket success flash alert
  const [printedPatient, setPrintedPatient] = useState<Patient | null>(null);

  // Auto-set first department & price
  useEffect(() => {
    if (DEPARTMENTS.length > 0 && !departmentId) {
      setDepartmentId(DEPARTMENTS[0].id);
      setCustomPrice(DEPARTMENTS[0].price);
    }
  }, [DEPARTMENTS, departmentId]);

  const handleDeptChange = (deptId: DepartmentId) => {
    setDepartmentId(deptId);
    setSelectedServices([]); // Clear services when department changes
    const dept = DEPARTMENTS.find((d) => d.id === deptId);
    if (dept) {
      setCustomPrice(dept.price);
      setManualPriceOverride(false);
    }
  };

  // Helper: compute total price based on department base + selected services
  const computeTotalPrice = (dept: Department | undefined, services: DepartmentService[]): number => {
    if (!dept) return 0;
    const base = dept.price || 0;
    const servicesTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
    return base + servicesTotal;
  };

  // Toggle service selection
  const toggleServiceSelection = (service: DepartmentService) => {
    const exists = selectedServices.find((s) => s.id === service.id);
    let newSelected: DepartmentService[];
    if (exists) {
      newSelected = selectedServices.filter((s) => s.id !== service.id);
    } else {
      newSelected = [...selectedServices, service];
    }
    setSelectedServices(newSelected);
    const dept = DEPARTMENTS.find((d) => d.id === departmentId);
    setCustomPrice(computeTotalPrice(dept, newSelected));
    setManualPriceOverride(false);
  };

  // Watch for manual price edits
  const handlePriceChange = (value: number) => {
    setCustomPrice(value);
    setManualPriceOverride(true);
  };

  const handleAmbulatorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      alert('Iltimos, ism, familiya va telefon raqamini kiriting!');
      return;
    }

    // Eski duplicate check olib tashlandi - endi familiya kiritganda
    // avtomatik dropdown chiqadi va foydalanuvchi bemorni tanlaydi

    const currentDeptId = departmentId || (DEPARTMENTS[0]?.id || '');
    const selectedDept = DEPARTMENTS.find((d) => d.id === currentDeptId);
    const doctorName = selectedDept ? selectedDept.doctorName : '';

    onAddPatient({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim(),
      birthDate: birthDate || '1990-01-01',
      phone: phone.trim(),
      gender,
      departmentId: currentDeptId,
      doctorName,
      paymentStatus,
      paymentAmount: customPrice,
      selectedServices: selectedServices.length > 0 ? selectedServices : undefined,
      previousVisitId,
    });

    // Save transaction if paid
    if (paymentStatus === 'To\'langan') {
      addTransaction(
        'Kirim',
        customPrice,
        "Ambulator ko'rik",
        `${lastName.trim()} ${firstName.trim()} - ${selectedDept?.name || 'Klinika'} bo'limi shifokor ko'rigi uchun navbat to'lovi`
      );
    }

    // Setup print notification
    const fakeIdNumber = patients.reduce((max, p) => {
      const num = parseInt(p.id.split('-')[1]);
      return num > max ? num : max;
    }, 1000) + 1;

    const fakeQueueNum = patients.length > 0 ? Math.max(...patients.map(p => p.queueNumber)) + 1 : 1;

    setPrintedPatient({
      id: `P-${fakeIdNumber}`,
      queueNumber: fakeQueueNum,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      middleName: middleName.trim(),
      birthDate: birthDate || '1990-01-01',
      phone: phone.trim(),
      gender,
      departmentId: currentDeptId,
      doctorName,
      paymentStatus,
      paymentAmount: customPrice,
      status: 'Kutmoqda',
      createdAt: new Date().toISOString(),
    });

    // Reset Form Fields
    setFirstName('');
    setLastName('');
    setMiddleName('');
    setBirthDate('');
    setPhone('+998');
    setGender('Erkak');
    setPaymentStatus('To\'langan');
    setSelectedServices([]);
    setManualPriceOverride(false);
    setPreviousVisitId(undefined);
    setDuplicatePatientSelected(null);
    if (DEPARTMENTS.length > 0) {
      setCustomPrice(DEPARTMENTS[0].price);
      setDepartmentId(DEPARTMENTS[0].id);
    }

    setTimeout(() => setPrintedPatient(null), 10000);
  };

  // Ambulatory Filters
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.lastName} ${patient.firstName} ${patient.middleName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.queueNumber.toString() === searchQuery;

    const matchesDept = deptFilter === 'all' || patient.departmentId === deptFilter;
    const matchesPayment = paymentFilter === 'all' || patient.paymentStatus === paymentFilter;

    return matchesSearch && matchesDept && matchesPayment;
  });

  const getDeptName = (id: DepartmentId) => {
    return DEPARTMENTS.find((d) => d.id === id)?.name || id;
  };

  // Print Queue ticket on XPrinter
  const printTicket = (patient: Patient) => {
    const printWindow = window.open('', '_blank', 'width=350,height=450');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan ruxsat bering.');
      return;
    }

    const deptName = getDeptName(patient.departmentId);
    const room = DEPARTMENTS.find((d) => d.id === patient.departmentId)?.room || 'Noma\'lum';

    printWindow.document.write(`
      <html>
        <head>
          <title>Navbat Chiptasi - #${patient.queueNumber}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              text-align: center;
              padding: 20px;
              width: 280px;
              margin: 0 auto;
              color: #000;
            }
            .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 11px; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .number { font-size: 52px; font-weight: bold; margin: 15px 0; }
            .info { font-size: 13px; text-align: left; margin-bottom: 15px; line-height: 1.5; }
            .footer { font-size: 10px; border-top: 1px dashed #000; padding-top: 10px; margin-top: 15px; }
            button { display: block; width: 100%; padding: 10px; margin-top: 20px; background: #000; color: #fff; border: none; font-weight: bold; cursor: pointer; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="title">DR.Maruf Clinic</div>
          <div class="subtitle">Tashrifingiz uchun rahmat!</div>
          
          <div style="font-size: 12px; font-weight: bold;">NAVBAT RAQAMI</div>
          <div class="number">#${patient.queueNumber}</div>
          
          <div class="info">
            <strong>Bemor:</strong> ${patient.lastName} ${patient.firstName}<br>
            <strong>ID:</strong> ${patient.id}<br>
            <strong>Bo'lim:</strong> ${deptName}<br>
            <strong>Xona:</strong> ${room}<br>
            <strong>Shifokor:</strong> ${patient.doctorName}<br>
            <strong>To'lov:</strong> ${patient.paymentAmount.toLocaleString()} UZS (${patient.paymentStatus})<br>
            <strong>Sana:</strong> ${new Date(patient.createdAt).toLocaleDateString('uz-UZ')} ${new Date(patient.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div class="footer">
            Shifokor kabineti eshigi ustidagi monitorni kuzatib boring.<br>
            Sog'ligingiz o'z qo'lingizda!
          </div>
          
          <button onclick="window.print(); window.close();">Chiptani Chop Etish (XPrinter)</button>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ==========================================
  // 2. HOSPITAL STAY / INPATIENT STATES
  // ==========================================
  const [isNewPatient, setIsNewPatient] = useState<boolean>(true);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Brand-new inpatient registration details
  const [inpLastName, setInpLastName] = useState('');
  const [inpFirstName, setInpFirstName] = useState('');
  const [inpMiddleName, setInpMiddleName] = useState('');
  const [inpPhone, setInpPhone] = useState('+998');
  const [inpGender, setInpGender] = useState<'Erkak' | 'Ayol'>('Erkak');
  const [inpBirthDate, setInpBirthDate] = useState('');

  // Room stay options
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [stayDays, setStayDays] = useState<number>(5);
  const [inpPricePerDay, setInpPricePerDay] = useState<number>(150000);
  const [stayAmountPaid, setStayAmountPaid] = useState<number>(0);
  const [stayDoctorId, setStayDoctorId] = useState('');
  const [stayDiagnosis, setStayDiagnosis] = useState('');

  // Dynamic prescriptions array during hospitalization
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medDays, setMedDays] = useState('');
  const [tempMeds, setTempMeds] = useState<Medication[]>([]);

  // Inpatient search & filters
  const [inpSearchQuery, setInpSearchQuery] = useState('');
  const [inpStatusFilter, setInpStatusFilter] = useState<'all' | 'Davolanmoqda' | 'Yakunlangan'>('all');

  // Expanded card/history view for inpatient
  const [expandedStayId, setExpandedStayId] = useState<string | null>(null);

  // Financial top-up modal or inline form
  const [payingStayId, setPayingStayId] = useState<string | null>(null);
  const [extraPayment, setExtraPayment] = useState<number>(0);

  // Auto-set room price when room selection changes
  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = hospitalRooms.find((r) => r.id === roomId);
    if (room) {
      setInpPricePerDay(room.pricePerDay);
    }
  };

  // Helper to add medication to dynamic stay list
  const addMedication = () => {
    if (!medName.trim()) {
      alert('Iltimos, dori nomini kiriting!');
      return;
    }
    const newMed: Medication = {
      name: medName.trim(),
      dosage: medDosage.trim() || 'Shifokor ko\'rsatmasi bo\'yicha',
      days: medDays.trim() || `${stayDays} kun`,
    };
    setTempMeds([...tempMeds, newMed]);
    setMedName('');
    setMedDosage('');
    setMedDays('');
  };

  const removeMedication = (index: number) => {
    setTempMeds(tempMeds.filter((_, i) => i !== index));
  };

  // Submit Inpatient Admission
  const handleInpatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let pId = '';
    let fName = '';
    let lName = '';
    let mName = '';
    let pPhone = '';
    let pGender: 'Erkak' | 'Ayol' = 'Erkak';
    let pBirth = '';

    if (isNewPatient) {
      if (!inpFirstName.trim() || !inpLastName.trim() || !inpPhone.trim()) {
        alert('Iltimos, yangi bemorning ism, familiya va telefon raqamini kiriting!');
        return;
      }

      // Check if patient with the same name and phone already exists
      const exactMatch = patients.find(
        (p) =>
          p.firstName.trim().toLowerCase() === inpFirstName.trim().toLowerCase() &&
          p.lastName.trim().toLowerCase() === inpLastName.trim().toLowerCase() &&
          p.phone.trim().replace(/\s+/g, '') === inpPhone.trim().replace(/\s+/g, '')
      );

      if (exactMatch) {
        const confirmRegister = window.confirm(
          `⚠️ DIQQAT! Tizimda ushbu bemor allaqachon mavjud!\n\nIsmi: ${exactMatch.lastName} ${exactMatch.firstName}\nTelefon: ${exactMatch.phone}\nQayd etilgan vaqti: ${new Date(exactMatch.createdAt).toLocaleDateString('uz-UZ')}\n\nUshbu bemorni yangi Statsionar davolashga yotqizishda davom etishni xohlaysizmi?`
        );
        if (!confirmRegister) {
          return;
        }
      }

      const maxIdNumber = patients.reduce((max, p) => {
        const num = parseInt(p.id.split('-')[1]);
        return num > max ? num : max;
      }, 1000);
      pId = `P-${maxIdNumber + 1}`;
      fName = inpFirstName.trim();
      lName = inpLastName.trim();
      mName = inpMiddleName.trim();
      pPhone = inpPhone.trim();
      pGender = inpGender;
      pBirth = inpBirthDate || '1990-01-01';

      // Automatically register them in the general patient queue archive
      // with status Completed so they appear in clinic records properly.
      onAddPatient({
        firstName: fName,
        lastName: lName,
        middleName: mName,
        birthDate: pBirth,
        phone: pPhone,
        gender: pGender,
        departmentId: stayDoctorId || DEPARTMENTS[0]?.id || 'nevrologiya',
        doctorName: DEPARTMENTS.find((d) => d.id === stayDoctorId)?.doctorName || 'Shifokor',
        paymentStatus: 'To\'langan',
        paymentAmount: stayAmountPaid,
      });
    } else {
      const existing = patients.find((p) => p.id === selectedPatientId);
      if (!existing) {
        alert('Iltimos, shifoxonadagi mavjud bemorlardan tanlang!');
        return;
      }
      pId = existing.id;
      fName = existing.firstName;
      lName = existing.lastName;
      mName = existing.middleName || '';
      pPhone = existing.phone;
      pGender = existing.gender;
      pBirth = existing.birthDate;
    }

    const room = hospitalRooms.find((r) => r.id === selectedRoomId);
    if (!room) {
      alert('Iltimos, davolanish uchun bo\'sh palatani belgilang!');
      return;
    }

    if (room.occupiedBeds >= room.capacity) {
      alert('Ushbu palatada bo\'sh o\'rinlar qolmagan! Boshqa xona belgilang.');
      return;
    }

    const selectedDoc = DEPARTMENTS.find((d) => d.id === stayDoctorId) || DEPARTMENTS[0];
    const totalCost = stayDays * inpPricePerDay;

    const newStay: InpatientStay = {
      id: 'S-' + Math.floor(Math.random() * 90000 + 10000),
      patientId: pId,
      firstName: fName,
      lastName: lName,
      middleName: mName,
      phone: pPhone,
      gender: pGender,
      roomId: room.id,
      roomNumber: room.roomNumber,
      checkInDate: new Date().toISOString().split('T')[0],
      plannedDays: Number(stayDays),
      pricePerDay: Number(inpPricePerDay),
      totalCost,
      amountPaid: Number(stayAmountPaid),
      remainingDebt: totalCost - Number(stayAmountPaid),
      status: 'Davolanmoqda',
      doctorName: selectedDoc?.doctorName || 'Navbatchi Shifokor',
      departmentName: selectedDoc?.name || 'Nevrologiya bo\'limi',
      diagnosis: stayDiagnosis.trim() || 'Klinik tahlillar va statsionar davolanish',
      prescriptions: tempMeds,
    };

    onSaveInpatientStays([...inpatientStays, newStay]);

    // Save transaction if payment was received
    if (Number(stayAmountPaid) > 0) {
      addTransaction(
        'Kirim',
        Number(stayAmountPaid),
        "Statsionar to'lov",
        `${lName} ${fName} - ${room.roomNumber}-palata yotish depoziti to'lovi`,
        pId,
        `${lName} ${fName}`
      );
    }

    // Reset Form Fields
    setInpFirstName('');
    setInpLastName('');
    setInpMiddleName('');
    setInpPhone('+998');
    setInpGender('Erkak');
    setInpBirthDate('');
    setSelectedPatientId('');
    setSelectedRoomId('');
    setStayDays(5);
    setStayAmountPaid(0);
    setStayDiagnosis('');
    setTempMeds([]);
    alert('Bemor muvaffaqiyatli palataga yotqizildi va to\'lovi hisobga olindi!');
  };

  // Perform additional payment top-up for remaining debt
  const handleAddStayPayment = (stayId: string) => {
    if (!extraPayment || extraPayment <= 0) {
      alert('Iltimos, to\'g\'ri summa kiriting!');
      return;
    }

    const stay = inpatientStays.find((s) => s.id === stayId);

    const updatedStays = inpatientStays.map((s) => {
      if (s.id === stayId) {
        const updatedPaid = s.amountPaid + extraPayment;
        const updatedDebt = Math.max(0, s.totalCost - updatedPaid);
        return {
          ...s,
          amountPaid: updatedPaid,
          remainingDebt: updatedDebt,
        };
      }
      return s;
    });

    onSaveInpatientStays(updatedStays);

    if (stay) {
      addTransaction(
        'Kirim',
        extraPayment,
        "Statsionar to'lov",
        `${stay.lastName} ${stay.firstName} - ${stay.roomNumber}-palata qoldiq qarz to'lovi`,
        stay.patientId,
        `${stay.lastName} ${stay.firstName}`
      );
    }

    setPayingStayId(null);
    setExtraPayment(0);
    alert('To\'lov muvaffaqiyatli qabul qilindi va kvitansiya yangilandi!');
  };

  // Discharge patient (checkout)
  const handleDischargePatient = (stayId: string) => {
    const stay = inpatientStays.find((s) => s.id === stayId);
    if (stay && stay.remainingDebt > 0) {
      if (!window.confirm(`Diqqat! Bemorda ${stay.remainingDebt.toLocaleString()} UZS qarzdorlik mavjud. Shunda ham shifoxonadan chiqarishni tasdiqlaysizmi?`)) {
        return;
      }
    } else {
      if (!window.confirm('Haqiqatdan ham ushbu bemorni davolash tugatilganini tasdiqlaysizmi va palatani bo\'shatmoqchisiz?')) {
        return;
      }
    }

    const updatedStays = inpatientStays.map((s) => {
      if (s.id === stayId) {
        return {
          ...s,
          status: 'Yakunlangan' as const,
          checkOutDate: new Date().toISOString().split('T')[0],
        };
      }
      return s;
    });

    onSaveInpatientStays(updatedStays);
    alert('Bemor muvaffaqiyatli palatadan chiqarildi (discharge) va o\'rin bo\'shatildi.');
  };

  // Add extra service to inpatient stay (analiz, tahlil, qo'shimcha xizmat)
  const [extraServiceStayId, setExtraServiceStayId] = useState<string | null>(null);
  const [extraServiceName, setExtraServiceName] = useState('');
  const [extraServiceAmount, setExtraServiceAmount] = useState(0);
  const [extraServiceNotes, setExtraServiceNotes] = useState('');

  const handleAddExtraService = (stayId: string) => {
    if (!extraServiceName.trim() || extraServiceAmount <= 0) {
      alert('Iltimos, xizmat nomi va summasini kiriting!');
      return;
    }

    const newService: ExtraService = {
      id: 'ES-' + Math.floor(Math.random() * 90000 + 10000),
      name: extraServiceName.trim(),
      amount: Number(extraServiceAmount),
      date: new Date().toISOString().split('T')[0],
      notes: extraServiceNotes.trim() || undefined,
    };

    const updatedStays = inpatientStays.map((s) => {
      if (s.id === stayId) {
        const currentExtras = s.extraServices || [];
        const baseCost = s.plannedDays * s.pricePerDay;
        const extrasTotal = [...currentExtras, newService].reduce((sum, e) => sum + e.amount, 0);
        const newTotalCost = baseCost + extrasTotal;
        const newDebt = Math.max(0, newTotalCost - s.amountPaid);
        return {
          ...s,
          extraServices: [...currentExtras, newService],
          totalCost: newTotalCost,
          remainingDebt: newDebt,
        };
      }
      return s;
    });

    onSaveInpatientStays(updatedStays);

    // Add transaction for the extra service
    const stay = inpatientStays.find((s) => s.id === stayId);
    if (stay) {
      addTransaction(
        'Kirim',
        Number(extraServiceAmount),
        "Qo'shimcha xizmat",
        `${stay.lastName} ${stay.firstName} - ${extraServiceName.trim()} (${stay.roomNumber}-palata)`,
        stay.patientId,
        `${stay.lastName} ${stay.firstName}`
      );
    }

    setExtraServiceStayId(null);
    setExtraServiceName('');
    setExtraServiceAmount(0);
    setExtraServiceNotes('');
    alert('Qo\'shimcha xizmat muvaffaqiyatli qo\'shildi va to\'lov hisoblandi!');
  };

  // Reject/cancel ambulatory patient (rad etish)
  const handleRejectPatient = (patientId: string) => {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    // Bemor qayta kelgan (returning) bo'lsa, uning eski tarixi saqlanib qoladi
    // Faqat o'sha oxirgi yangi ko'rik rad etiladi va to'lovi qaytariladi
    const isReturning = patient.isReturning || (patient.previousVisitId ? true : false);
    const historyCount = patient.patientHistory?.length || 0;

    const confirmMsg = isReturning
      ? `⚠️ RAD ETISH (Qayta tashrif)\n\n` +
        `Bemor: ${patient.lastName} ${patient.firstName}\n` +
        `Bo'lim: ${getDeptName(patient.departmentId)}\n` +
        `To'lov: ${patient.paymentAmount.toLocaleString()} UZS\n` +
        `Tashrif #: ${patient.visitCount || 1}\n` +
        `Avvalgi tashriflar: ${historyCount} ta (SAQLANIB QOLADI)\n\n` +
        `✅ Faqat o'sha oxirgi ko'rik rad etiladi\n` +
        `✅ To'lov qaytariladi va hisobotlardan o'chiriladi\n` +
        `✅ Bemorning eski tarixi ma'lumotlari o'chmaydi\n\n` +
        `Davom etasizmi?`
      : `⚠️ RAD ETISH\n\n` +
        `Bemor: ${patient.lastName} ${patient.firstName}\n` +
        `Bo'lim: ${getDeptName(patient.departmentId)}\n` +
        `To'lov: ${patient.paymentAmount.toLocaleString()} UZS\n\n` +
        `✅ O'sha ko'rik rad etiladi\n` +
        `✅ To'lov qaytariladi va hisobotlardan o'chiriladi\n\n` +
        `Davom etasizmi?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    // 1. To'lov qaytarish (refund) - to'langan bo'lsa, to'lovni qaytarish
    if (patient.paymentStatus === 'To\'langan' && patient.paymentAmount > 0) {
      if (onRefundPatient) {
        // To'lov qaytarish funksiyasini chaqiramiz - bu avtomatik:
        // - bemor holatini "Bekor qilingan" ga o'zgartiradi
        // - refundStatus, refundedAmount, refundedAt, refundedReason ni o'rnatadi
        // - kassaga "To'lov qaytarildi" chiqim tranzaksiyasini qo'shadi
        onRefundPatient(patientId, patient.paymentAmount, 'Bemor rad etildi - ko\'rik bekor qilindi');
      } else {
        // Fallback: agar onRefundPatient bo'lmasa, eski usul bilan
        // to'lov tranzaksiyasini o'chiramiz va bemorni o'chirib tashlaymiz
        const updatedTx = transactions.filter(
          (t) => !(t.patientId === patientId && t.category === "Ambulator ko'rik")
        );
        onSaveTransactions(updatedTx);
        if (onDeletePatient) {
          onDeletePatient(patientId);
        }
      }
    } else {
      // To'lov qilmagan bemor - oddiygina o'chirib tashlaymiz
      if (onDeletePatient) {
        onDeletePatient(patientId);
      }
    }

    alert(
      `✅ RAD ETILDI\n\n` +
      `Bemor: ${patient.lastName} ${patient.firstName}\n` +
      (patient.paymentStatus === 'To\'langan'
        ? `To'lov qaytarildi: ${patient.paymentAmount.toLocaleString()} UZS\n` +
          `Hisobotlar va kassadan o'chirildi.`
        : `To'lov qilmagan bemor o'chirildi.`) +
      (isReturning ? `\n\nBemorning ${historyCount} ta avvalgi tashrifi saqlanib qoldi.` : '')
    );
  };

  // Filter inpatient stays
  const filteredStays = inpatientStays.filter((stay) => {
    const fullName = `${stay.lastName} ${stay.firstName} ${stay.middleName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(inpSearchQuery.toLowerCase()) ||
      stay.phone.includes(inpSearchQuery) ||
      stay.patientId.toLowerCase().includes(inpSearchQuery.toLowerCase()) ||
      stay.roomNumber.toLowerCase().includes(inpSearchQuery.toLowerCase());

    const matchesStatus = inpStatusFilter === 'all' || stay.status === inpStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Print inpatient stay ticket
  const printInpatientInvoice = (stay: InpatientStay) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan ruxsat bering.');
      return;
    }

    const prescriptionsHtml =
      stay.prescriptions && stay.prescriptions.length > 0
        ? stay.prescriptions.map((m) => `• ${m.name} (${m.dosage}, ${m.days})`).join('<br>')
        : 'Muolajalar belgilanmagan';

    printWindow.document.write(`
      <html>
        <head>
          <title>Shifoxona Yo'llanmasi - ${stay.lastName} ${stay.firstName}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              text-align: center;
              padding: 20px;
              width: 290px;
              margin: 0 auto;
              color: #000;
              font-size: 12px;
            }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .subtitle { font-size: 10px; margin-bottom: 12px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
            .section-title { font-size: 11px; font-weight: bold; text-align: left; margin-top: 15px; border-bottom: 1px solid #000; padding-bottom: 2px; text-transform: uppercase; }
            .info { text-align: left; margin: 8px 0; line-height: 1.4; }
            .footer { font-size: 9px; border-top: 1px dashed #000; padding-top: 8px; margin-top: 15px; }
            button { display: block; width: 100%; padding: 8px; margin-top: 15px; background: #000; color: #fff; border: none; font-weight: bold; cursor: pointer; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="title">DR.Maruf Clinic</div>
          <div class="subtitle">SHIFOXONADA DAVOLANISH QABUL KARTI</div>
          
          <div class="info">
            <strong>Bemor:</strong> ${stay.lastName.toUpperCase()} ${stay.firstName.toUpperCase()}<br>
            <strong>ID:</strong> ${stay.patientId}<br>
            <strong>Tel:</strong> ${stay.phone}<br>
            <strong>Jinsi:</strong> ${stay.gender}
          </div>

          <div class="section-title">Joylashuv va Shifokor</div>
          <div class="info">
            <strong>Palata:</strong> ${stay.roomNumber}<br>
            <strong>Bo'lim:</strong> ${stay.departmentName}<br>
            <strong>Davolovchi:</strong> ${stay.doctorName}
          </div>

          <div class="section-title">Tashxis</div>
          <div class="info">
            ${stay.diagnosis || "Statsionar davolanish va ko'rik"}
          </div>

          <div class="section-title">Muolaja Retseptlari</div>
          <div class="info" style="font-size: 11px; line-height: 1.3;">
            ${prescriptionsHtml}
          </div>

          <div class="section-title">To'lovlar Tafsiloti</div>
          <div class="info">
            <strong>Kelgan sanasi:</strong> ${stay.checkInDate}<br>
            ${stay.checkOutDate ? `<strong>Chiqib ketgan:</strong> ${stay.checkOutDate}<br>` : ''}
            <strong>Turish muddati:</strong> ${stay.plannedDays} kun<br>
            <strong>Kunlik narx:</strong> ${stay.pricePerDay.toLocaleString()} UZS<br>
            <strong>Umumiy hisob:</strong> ${stay.totalCost.toLocaleString()} UZS<br>
            <strong style="color: green;">To'langan:</strong> ${stay.amountPaid.toLocaleString()} UZS<br>
            <strong style="color: red;">Qarz:</strong> ${stay.remainingDebt.toLocaleString()} UZS<br>
            <strong>Holati:</strong> ${stay.status === 'Davolanmoqda' ? 'DAVOLANMOQDA' : 'YAKUNLANGAN (JAVOB BERILDI)'}
          </div>

          <div class="footer">
            Shifoxonamizda davolanib tezroq sog'ayishingizni tilaymiz!<br>
            DR.Maruf Clinic ERP • Avtomatlashtirilgan kvitansiya.
          </div>
          
          <button onclick="window.print(); window.close();">Chop etish (XPrinter)</button>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Real-time Ticket Notification */}
      {printedPatient && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl shadow-md flex justify-between items-center animate-fade-in">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-white p-2 rounded-lg">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Yangi bemor muvaffaqiyatli ro'yxatga olindi!
              </p>
              <p className="text-xs text-slate-500">
                Navbat #<span className="font-bold text-emerald-600">{printedPatient.queueNumber}</span> - {printedPatient.lastName} {printedPatient.firstName} ({getDeptName(printedPatient.departmentId)})
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => printTicket(printedPatient)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              🖨️ XPrinterda Chop Etish
            </button>
            <button
              onClick={() => setPrintedPatient(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1.5"
            >
              Yopish
            </button>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex bg-[#e2e8f0]/40 p-1 rounded-2xl max-w-xl border border-slate-200/55 shadow-inner">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'queue'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          👥 Ambulator Navbat (Queue)
        </button>
        <button
          onClick={() => setActiveSubTab('inpatient')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'inpatient'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          🏥 Statsionar & Palatalar
        </button>
        <button
          onClick={() => setActiveSubTab('finance')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          💰 Kassa & Moliya Hisoboti
        </button>
      </div>

      {/* ==========================================
          SUB-TAB 1: AMBULATORY QUEUE MANAGEMENT
          ========================================== */}
      {activeSubTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Registration Form */}
          <div className="lg:col-span-1 bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100/80 shadow-[0_20px_50px_rgba(16,185,129,0.05)] neon-glow-emerald relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

            <div className="flex items-center space-x-2.5 mb-6 pb-4 border-b border-slate-100">
              <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl flex items-center justify-center shadow-xs">
                <Plus className="h-5 w-5 stroke-[2.5]" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Ambulator Navbatga Bemor</h2>
            </div>

            <form onSubmit={handleAmbulatorySubmit} className="space-y-4">
              {/* Last Name - DUPLICATE DETECTION */}
              <div className="relative">
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">FAMILIYASI *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Karimov"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    // Foydalanuvchi yozishni o'zgartirsa, tanlangan bemorni bekor qilamiz
                    if (previousVisitId) {
                      setPreviousVisitId(undefined);
                      setDuplicatePatientSelected(null);
                    }
                  }}
                  autoComplete="off"
                  className={`w-full px-3.5 py-3 text-sm border rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 transition-all ${
                    duplicatePatientSelected
                      ? 'border-emerald-500 bg-emerald-50/50 focus:border-emerald-500'
                      : duplicatePatients.length > 0
                      ? 'border-amber-400 focus:border-amber-500'
                      : 'border-slate-200 focus:border-emerald-500'
                  }`}
                />

                {/* Tanlangan bemor badge */}
                {duplicatePatientSelected && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-emerald-800 truncate">
                          ✅ {duplicatePatientSelected.lastName} {duplicatePatientSelected.firstName}
                        </p>
                        <p className="text-[9px] text-emerald-600 font-bold">
                          Tashrif #{(duplicatePatientSelected.visitCount || 1) + 1} • Avvalgi: {new Date(duplicatePatientSelected.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearDuplicateSelection}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg transition-all cursor-pointer shrink-0"
                      title="Bemor tanlashni bekor qilish"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* AVVAL RO'YXATDAN O'TGAN BEMORLAR TAKLIFLARI - familiya yozilgan tagidan chiqadi */}
                {!duplicatePatientSelected && duplicatePatients.length > 0 && (
                  <div className="mt-2 bg-white border-2 border-amber-300 rounded-xl shadow-xl overflow-hidden z-10 relative">
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 px-3 py-2 border-b border-amber-200">
                      <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Search className="h-3 w-3" />
                        🔍 {duplicatePatients.length} ta avval ro'yxatdan o'tgan bemor topildi
                      </p>
                      <p className="text-[9px] text-amber-600 font-bold mt-0.5">
                        Bemorni tanlang — ma'lumotlar avtomatik to'ldiriladi va tarixi saqlanadi
                      </p>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {duplicatePatients.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectExistingPatient(p)}
                          className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 border-b border-slate-100 last:border-b-0 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-900 truncate group-hover:text-emerald-700">
                                {p.lastName} {p.firstName} {p.middleName || ''}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[9px] text-slate-500 font-bold">ID: {p.id}</span>
                                <span className="text-[9px] text-slate-400">•</span>
                                <span className="text-[9px] text-slate-500 font-bold">📞 {p.phone}</span>
                              </div>
                              <p className="text-[9px] text-slate-600 mt-0.5">
                                📅 Oxirgi tashrif: {new Date(p.createdAt).toLocaleDateString('ru-RU')}
                              </p>
                              {p.diagnosis && (
                                <p className="text-[9px] text-slate-500 mt-0.5 italic truncate">
                                  📋 {p.diagnosis.substring(0, 50)}
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 text-right flex flex-col items-end gap-1">
                              <span className="inline-block text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">
                                {p.status}
                              </span>
                              {p.visitCount && p.visitCount > 1 && (
                                <span className="text-[8px] text-purple-600 font-black bg-purple-50 px-1.5 py-0.5 rounded">
                                  {p.visitCount} marta
                                </span>
                              )}
                              <span className="text-[9px] text-emerald-600 font-black opacity-0 group-hover:opacity-100 transition-opacity">
                                Tanlash →
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">ISMI *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Azizbek"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 transition-all"
                />
              </div>

              {/* Middle Name */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">OTASINING ISMI</label>
                <input
                  type="text"
                  placeholder="Masalan: Olimovich"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Gender */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">JINSI</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Erkak' | 'Ayol')}
                    className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all"
                  >
                    <option value="Erkak">Erkak</option>
                    <option value="Ayol">Ayol</option>
                  </select>
                </div>

                {/* Birthdate */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">TUG'ILGAN SANA</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">TELEFON RAQAMI *</label>
                <input
                  type="text"
                  required
                  placeholder="+998901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">YO'NALTIRILADIGAN BO'LIM *</label>
                <select
                  value={departmentId}
                  onChange={(e) => handleDeptChange(e.target.value as DepartmentId)}
                  className="w-full px-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.doctorName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Services Selection */}
              {(() => {
                const currentDept = DEPARTMENTS.find((d) => d.id === departmentId);
                const deptServices = currentDept?.services || [];
                if (deptServices.length === 0) return null;

                const basePrice = currentDept?.price || 0;
                const servicesTotal = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
                const grandTotal = basePrice + servicesTotal;

                return (
                  <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4 rounded-2xl border border-emerald-200/70 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200/50">
                      <div className="flex items-center gap-1.5">
                        <ListChecks className="h-4 w-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
                          {currentDept?.name} - Qo'shimcha Xizmatlar
                        </span>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {selectedServices.length} ta tanlandi
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                      {deptServices.map((svc) => {
                        const isSelected = !!selectedServices.find((s) => s.id === svc.id);
                        return (
                          <button
                            key={svc.id}
                            type="button"
                            onClick={() => toggleServiceSelection(svc)}
                            className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all cursor-pointer text-left ${
                              isSelected
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-white border-white' : 'border-slate-300'
                              }`}>
                                {isSelected && (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                )}
                              </div>
                              <span className="text-xs font-bold truncate">{svc.name}</span>
                            </div>
                            <span className={`text-xs font-black shrink-0 ${
                              isSelected ? 'text-white' : 'text-emerald-700'
                            }`}>
                              +{svc.price.toLocaleString()} UZS
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Price breakdown */}
                    <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold text-slate-600">
                        <span>Bo'lim bazaviy narxi:</span>
                        <span className="text-slate-900 font-extrabold">{basePrice.toLocaleString()} UZS</span>
                      </div>
                      {selectedServices.length > 0 && (
                        <div className="space-y-1">
                          {selectedServices.map((s) => (
                            <div key={s.id} className="flex justify-between text-[10px] font-bold text-emerald-700">
                              <span className="truncate pr-2">+ {s.name}</span>
                              <span className="shrink-0">{s.price.toLocaleString()} UZS</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-black text-emerald-900 pt-1.5 border-t border-emerald-100">
                        <span>Jami summa:</span>
                        <span>{grandTotal.toLocaleString()} UZS</span>
                      </div>
                      {manualPriceOverride && (
                        <p className="text-[9px] text-amber-600 italic font-bold pt-1">
                          ⚠️ Narx qo'lda o'zgartirilgan - avtomatik hisob-kitob faol emas
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Payment Section */}
              <div className="bg-[#f0fdf4] p-4 rounded-2xl border border-emerald-100 space-y-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Xizmat narxi:</span>
                  <span className="text-base font-black text-emerald-700">
                    {customPrice.toLocaleString()} UZS
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-wide">KO'RIK NARXI (Tahrirlash):</label>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => handlePriceChange(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-white text-slate-800 font-extrabold transition-all"
                  />
                </div>

                {/* Payment status */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('To\'langan')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'To\'langan'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    To'langan
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('Kutilmoqda')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'Kutilmoqda'
                        ? 'bg-amber-500 border-amber-500 text-white shadow-md font-extrabold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Kutilmoqda
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-2xl font-black text-xs shadow transition-all duration-300 cursor-pointer flex items-center justify-center space-x-2"
              >
                <UserCheck className="h-4.5 w-4.5" />
                <span>Navbatga qo'shish & Chipta</span>
              </button>
            </form>
          </div>

          {/* Right column: Patient Search and Queue List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-blue-100 shadow-[0_20px_50px_rgba(59,130,246,0.05)] neon-glow-blue relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-sky-400 to-teal-400"></div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Bugungi Ambulator Navbatlar</h2>
                  <p className="text-xs text-slate-500 font-bold">Jami: <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{patients.length} nafar</span></p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl font-extrabold shadow-sm">
                    Kutayotgan: {patients.filter(p => p.status === 'Kutmoqda').length}
                  </span>
                  <span className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-extrabold shadow-sm">
                    Tugallangan: {patients.filter(p => p.status === 'Yakunlangan').length}
                  </span>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Qidiruv (F.I.SH, ID, tel)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400"
                  />
                </div>

                <div>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold"
                  >
                    <option value="all">Barcha bo'limlar</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold"
                  >
                    <option value="all">Barcha to'lovlar</option>
                    <option value="To'langan">To'langan</option>
                    <option value="Kutilmoqda">Kutilmoqda</option>
                  </select>
                </div>
              </div>

              {/* Patients list table */}
              <div className="overflow-x-auto">
                {filteredPatients.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-400 font-bold text-sm">Hech qanday bemor topilmadi.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-[#f8fafc] text-slate-700 font-black uppercase text-[9px]">
                        <th className="py-3 px-4">№</th>
                        <th className="py-3 px-4">Bemor ismi (ID)</th>
                        <th className="py-3 px-4">Shifokor & Bo'lim</th>
                        <th className="py-3 px-4">Ko'rik to'lovi</th>
                        <th className="py-3 px-4">Navbat holati</th>
                        <th className="py-3 px-4 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPatients.map((patient) => {
                        const isPaid = patient.paymentStatus === 'To\'langan';
                        const statusColor =
                          patient.status === 'Kutmoqda'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : patient.status === 'Qabulda'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                          <tr key={patient.id} className="hover:bg-slate-50/70 transition-colors bg-white font-semibold">
                            <td className="py-4 px-4">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200">
                                #{patient.queueNumber}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-extrabold text-slate-900">{patient.lastName} {patient.firstName}</div>
                              <div className="text-[10px] text-slate-400 font-bold mt-0.5">{patient.id} • {patient.phone}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-900">{getDeptName(patient.departmentId)}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{patient.doctorName}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-950">{patient.paymentAmount.toLocaleString()} UZS</div>
                              <button
                                onClick={() => onUpdatePaymentStatus(patient.id, isPaid ? 'Kutilmoqda' : 'To\'langan')}
                                className={`inline-flex items-center space-x-1 mt-1 px-2 py-0.5 border text-[9px] font-black rounded-lg transition-all cursor-pointer ${
                                  isPaid
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                                }`}
                              >
                                {isPaid ? <CheckCircle2 className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                                <span>{patient.paymentStatus}</span>
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-black ${statusColor}`}>
                                {patient.status}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => printTicket(patient)}
                                  className="px-2.5 py-1.5 bg-[#f0fdf4] hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg font-black text-[10px] transition-all cursor-pointer"
                                >
                                  🖨️ Chipta
                                </button>
                                {patient.status === 'Kutmoqda' && onDeletePatient && (
                                  <button
                                    onClick={() => handleRejectPatient(patient.id)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 rounded-lg font-black text-[10px] transition-all cursor-pointer flex items-center gap-1"
                                    title="Bemorni rad etish va o'chirish"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Rad etish
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-TAB 2: INPATIENT (YOTIB DAVOLANISH)
          ========================================== */}
      {activeSubTab === 'inpatient' && (
        <div className="space-y-6">
          
          {/* Section A: Visual Rooms Map */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Bed className="h-4 w-4 text-emerald-600" />
              🏥 Shifoxona Palatalari / Bo'sh va Band o'rinlar Holati
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {hospitalRooms.map((room) => {
                const isFull = room.occupiedBeds >= room.capacity;
                const freeBeds = room.capacity - room.occupiedBeds;

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomForBeds(room);
                      setIsAdmittingFromBed(false);
                      setAdmittingBedIndex(-1);
                    }}
                    className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:ring-2 hover:ring-emerald-500/20 hover:shadow-md ${
                      isFull
                        ? 'bg-rose-50/40 border-rose-200 shadow-sm'
                        : room.occupiedBeds > 0
                        ? 'bg-amber-50/40 border-amber-200 shadow-sm'
                        : 'bg-emerald-50/30 border-emerald-200/80 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-sm text-slate-900">{room.roomNumber}</h4>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                        room.genderType === 'Erkak'
                          ? 'bg-blue-50 text-blue-700'
                          : room.genderType === 'Ayol'
                          ? 'bg-pink-50 text-pink-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}>
                        {room.genderType}
                      </span>
                    </div>

                    {/* Bed Capacity Visual Bars */}
                    <div className="flex gap-1.5 my-3">
                      {Array.from({ length: room.capacity }).map((_, i) => {
                        const isOccupied = i < room.occupiedBeds;
                        return (
                          <div
                            key={i}
                            className={`h-2.5 flex-1 rounded-full border transition-all ${
                              isOccupied
                                ? 'bg-rose-500 border-rose-600 shadow-xs'
                                : 'bg-emerald-400 border-emerald-500 shadow-xs animate-pulse'
                            }`}
                            title={isOccupied ? "O'rin Band" : "O'rin bo'sh"}
                          />
                        );
                      })}
                    </div>

                    <div className="text-[11px] font-bold text-slate-600 flex justify-between">
                      <span>Bo'sh o'rin:</span>
                      <span className={freeBeds === 0 ? "text-rose-600 font-extrabold" : "text-emerald-700 font-extrabold"}>
                        {freeBeds} ta / {room.capacity} ta
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-1 flex justify-between">
                      <span>Kunlik:</span>
                      <span className="font-extrabold text-slate-900">{room.pricePerDay.toLocaleString()} UZS</span>
                    </div>
                    <div className="text-[9px] text-emerald-600 font-black mt-2 text-center pt-1.5 border-t border-slate-100 uppercase tracking-wider flex items-center justify-center gap-1">
                      🔍 O'rinlar holati & Yotqizish
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Section B: Inpatient Admission Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-emerald-100 shadow-md relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>
              
              <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-slate-100">
                <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-xl">
                  <Bed className="h-5 w-5" />
                </div>
                <h2 className="text-base font-extrabold text-slate-900">Bemor Yotqizish (Statsionar)</h2>
              </div>

              {/* Toggle new vs existing patient */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => setIsNewPatient(true)}
                  className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center ${
                    isNewPatient
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ➕ YANGI BEMOR
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewPatient(false)}
                  className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center ${
                    !isNewPatient
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🔍 TIZIMDAGI BEMOR
                </button>
              </div>

              <form onSubmit={handleInpatientSubmit} className="space-y-4">
                
                {isNewPatient ? (
                  /* Form for New Patient details */
                  <div className="space-y-3.5 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100/50">
                    <span className="text-[9px] font-black text-emerald-800 uppercase block tracking-wider">Yangi bemor ma'lumotlari:</span>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">FAMILIYASI *</label>
                      <input
                        type="text"
                        required
                        placeholder="Karimov"
                        value={inpLastName}
                        onChange={(e) => setInpLastName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">ISMI *</label>
                      <input
                        type="text"
                        required
                        placeholder="Azizbek"
                        value={inpFirstName}
                        onChange={(e) => setInpFirstName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">OTASINING ISMI</label>
                      <input
                        type="text"
                        placeholder="Olimovich"
                        value={inpMiddleName}
                        onChange={(e) => setInpMiddleName(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">JINSI</label>
                        <select
                          value={inpGender}
                          onChange={(e) => setInpGender(e.target.value as 'Erkak' | 'Ayol')}
                          className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                        >
                          <option value="Erkak">Erkak</option>
                          <option value="Ayol">Ayol</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 mb-1">TUG'ILGAN SANA</label>
                        <input
                          type="date"
                          value={inpBirthDate}
                          onChange={(e) => setInpBirthDate(e.target.value)}
                          className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 mb-1">TEL *</label>
                      <input
                        type="text"
                        required
                        placeholder="+998901234567"
                        value={inpPhone}
                        onChange={(e) => setInpPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                      />
                    </div>
                  </div>
                ) : (
                  /* Dropdown select for Existing patient */
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">BEMORNI TANLANG *</label>
                    <select
                      required
                      value={selectedPatientId}
                      onChange={(e) => setSelectedPatientId(e.target.value)}
                      className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold"
                    >
                      <option value="">-- Bemorni ro'yxatdan tanlang --</option>
                      {patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.lastName} {p.firstName} ({p.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Room selection */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">PALATA / XONA TANLASH *</label>
                  <select
                    required
                    value={selectedRoomId}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                    className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold"
                  >
                    <option value="">-- Bo'sh xonani tanlang --</option>
                    {hospitalRooms
                      .filter((r) => r.occupiedBeds < r.capacity)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          🚪 {r.roomNumber} ({r.genderType}) - Bo'sh {r.capacity - r.occupiedBeds} ta o'rin
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Days */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">NECHA KUN YOTADI *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={stayDays}
                      onChange={(e) => setStayDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold"
                    />
                  </div>

                  {/* Price per day (customizable) */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">KUNLIK TO'LOV (UZS) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={inpPricePerDay}
                      onChange={(e) => setInpPricePerDay(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold"
                    />
                  </div>
                </div>

                {/* Admitting Doctor */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">YUBORGAN SHIFOKOR / BO'LIM *</label>
                  <select
                    value={stayDoctorId}
                    onChange={(e) => setStayDoctorId(e.target.value)}
                    className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] text-slate-800 font-bold"
                  >
                    <option value="">-- Shifokorni tanlang --</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.doctorName} ({d.name})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stay Diagnosis */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">TASHXIS / SABAB</label>
                  <input
                    type="text"
                    placeholder="Masalan: Surunkali radikulit, o'tkir og'riq"
                    value={stayDiagnosis}
                    onChange={(e) => setStayDiagnosis(e.target.value)}
                    className="w-full px-3 py-3 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400"
                  />
                </div>

                {/* Prescription adding block inside Admission */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">RESEPT / DORILAR QO'SHISH</span>
                  
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Dori nomi (Novalgin, Kavinton)"
                      value={medName}
                      onChange={(e) => setMedName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded bg-white text-xs font-bold"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Dozasi (Kuniga 2 mahal)"
                        value={medDosage}
                        onChange={(e) => setMedDosage(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-xxs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Kunlari (5 kun)"
                        value={medDays}
                        onChange={(e) => setMedDays(e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded bg-white text-xxs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addMedication}
                      className="w-full py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded text-xxs font-black flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Dori qo'shish
                    </button>
                  </div>

                  {tempMeds.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-24 overflow-y-auto pt-2 border-t border-slate-200/60">
                      {tempMeds.map((med, index) => (
                        <div key={index} className="flex justify-between items-center text-[10px] bg-white p-1.5 rounded border border-slate-100">
                          <span className="font-bold text-slate-800 truncate max-w-[150px]">{med.name} ({med.dosage})</span>
                          <button
                            type="button"
                            onClick={() => removeMedication(index)}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Real-time automatic dynamic billing block */}
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100/80 space-y-3.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Umumiy xizmat summasi:</span>
                    <span className="text-sm font-black text-emerald-850">
                      {(stayDays * inpPricePerDay).toLocaleString()} UZS
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-emerald-850 mb-1.5 uppercase tracking-wide">QANCHA TO'LOV QILDI (UZS) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={stayAmountPaid}
                      onChange={(e) => setStayAmountPaid(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-2 text-xs border border-emerald-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/15 bg-white text-emerald-950 font-black"
                    />
                  </div>

                  {/* Automated dynamic balance */}
                  <div className="flex justify-between items-center text-xs font-bold pt-1.5 border-t border-emerald-100">
                    <span>Yana qolgan qarz:</span>
                    <span className={`font-black text-xs ${
                      (stayDays * inpPricePerDay) - stayAmountPaid > 0 ? "text-rose-600 animate-pulse" : "text-emerald-700"
                    }`}>
                      {Math.max(0, (stayDays * inpPricePerDay) - stayAmountPaid).toLocaleString()} UZS
                    </span>
                  </div>
                </div>

                {/* Save stay button */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-2xl font-black text-xs shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <UserCheck className="h-4.5 w-4.5" />
                  <span>Statsionarga joylashtirish</span>
                </button>
              </form>
            </div>

            {/* Section C: Inpatient stays history and logs */}
            <div className="lg:col-span-2 space-y-6 animate-fade-in">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Statsionar Bemori Hisoboti va Tarixi</h2>
                    <p className="text-xs text-slate-500 font-bold">Shifoxonada hozirda davolanuvchilar</p>
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={inpStatusFilter}
                      onChange={(e) => setInpStatusFilter(e.target.value as any)}
                      className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-bold"
                    >
                      <option value="all">Barcha holatlar</option>
                      <option value="Davolanmoqda">Hozir davolanayotganlar</option>
                      <option value="Yakunlangan">Javob berilgan (Arxiv)</option>
                    </select>
                  </div>
                </div>

                {/* Search Bar for Inpatients */}
                <div className="relative mb-5">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Bemor familiyasi va ismi bo'yicha tezkor qidiruv..."
                    value={inpSearchQuery}
                    onChange={(e) => setInpSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none bg-slate-50 font-bold text-slate-800 placeholder-slate-400"
                  />
                </div>

                {/* Active Hospital stays table */}
                <div className="overflow-x-auto">
                  {filteredStays.length === 0 ? (
                    <div className="text-center py-12">
                      <Bed className="h-10 w-10 text-slate-300 mx-auto animate-pulse mb-2" />
                      <p className="text-sm font-bold text-slate-400">Statsionarda bemorlar topilmadi.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredStays.map((stay) => {
                        const isExpanded = expandedStayId === stay.id;
                        const isDebt = stay.remainingDebt > 0;
                        const activeStay = stay.status === 'Davolanmoqda';

                        return (
                          <div
                            key={stay.id}
                            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                              isExpanded 
                                ? 'border-emerald-400 ring-2 ring-emerald-500/10 bg-emerald-50/5' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            {/* Summary Header Row */}
                            <div
                              onClick={() => setExpandedStayId(isExpanded ? null : stay.id)}
                              className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
                            >
                              <div className="flex items-center space-x-3.5">
                                <div className={`p-2.5 rounded-xl ${
                                  activeStay 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                                }`}>
                                  <Bed className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-extrabold text-sm text-slate-900 uppercase">
                                    {stay.lastName} {stay.firstName} {stay.middleName || ''}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">ID: {stay.patientId}</span>
                                    <span>•</span>
                                    <span>Tel: {stay.phone}</span>
                                    <span>•</span>
                                    <span className="text-indigo-700">🚪 {stay.roomNumber}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3.5 text-xs">
                                <div className="text-right">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase">Kelgan kuni</span>
                                  <span className="font-bold text-slate-700">{stay.checkInDate}</span>
                                </div>

                                <div className="text-right">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase font-mono">To'langan</span>
                                  <span className="font-extrabold text-emerald-700">{stay.amountPaid.toLocaleString()} UZS</span>
                                </div>

                                <div className="text-right">
                                  <span className="block text-[9px] font-black text-slate-400 uppercase font-mono">Qarz</span>
                                  <span className={`font-black ${isDebt ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                                    {stay.remainingDebt.toLocaleString()} UZS
                                  </span>
                                </div>

                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black border uppercase ${
                                  activeStay 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                  {stay.status}
                                </span>
                              </div>
                            </div>

                            {/* Expanded Details Section */}
                            {isExpanded && (
                              <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-5 animate-fade-in text-xs text-slate-700">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                  
                                  {/* Section 1: Admission and stay info */}
                                  <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xxs">
                                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                                      Tashrif tafsilotlari
                                    </h4>
                                    <div className="space-y-1 font-bold text-slate-600">
                                      <div className="flex justify-between"><span>Kelgan kuni:</span> <span className="text-slate-900">{stay.checkInDate}</span></div>
                                      {stay.checkOutDate && (
                                        <div className="flex justify-between"><span>Javob berilgan:</span> <span className="text-slate-900">{stay.checkOutDate}</span></div>
                                      )}
                                      <div className="flex justify-between"><span>Muddati:</span> <span className="text-slate-900">{stay.plannedDays} kun</span></div>
                                      <div className="flex justify-between"><span>Kunlik tarif:</span> <span className="text-slate-900">{stay.pricePerDay.toLocaleString()} UZS</span></div>
                                    </div>
                                  </div>

                                  {/* Section 2: Clinical Details */}
                                  <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xxs">
                                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                      <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                                      Tashxis va Shifokor
                                    </h4>
                                    <div className="space-y-1 font-bold text-slate-600">
                                      <div><span className="text-slate-500 block text-[9px] uppercase">Bo'lim:</span> <span className="text-slate-900">{stay.departmentName}</span></div>
                                      <div><span className="text-slate-500 block text-[9px] uppercase">Davolovchi:</span> <span className="text-indigo-700 font-extrabold">{stay.doctorName}</span></div>
                                      <div><span className="text-slate-500 block text-[9px] uppercase">Tashxis:</span> <span className="text-slate-900 bg-slate-50 p-1 rounded block border border-slate-100 mt-1 font-semibold">{stay.diagnosis || 'Kiritilmagan'}</span></div>
                                    </div>
                                  </div>

                                  {/* Section 3: Inpatient Financials & Top up */}
                                  <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xxs">
                                    <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                      <Coins className="h-3.5 w-3.5 text-emerald-600" />
                                      To'lov hisob-kitobi
                                    </h4>
                                    <div className="space-y-1 font-bold text-slate-600 mb-2">
                                      <div className="flex justify-between"><span>Umumiy summa:</span> <span className="text-slate-900 font-extrabold">{stay.totalCost.toLocaleString()} UZS</span></div>
                                      <div className="flex justify-between"><span>To'langan:</span> <span className="text-emerald-700 font-extrabold">{stay.amountPaid.toLocaleString()} UZS</span></div>
                                      <div className="flex justify-between"><span>Qarz balansi:</span> <span className={`font-black ${isDebt ? 'text-rose-600' : 'text-emerald-700'}`}>{stay.remainingDebt.toLocaleString()} UZS</span></div>
                                    </div>

                                    {/* Additional Top Up Action inline input */}
                                    {activeStay && isDebt && (
                                      <div className="pt-2 border-t border-slate-100 space-y-2">
                                        {payingStayId === stay.id ? (
                                          <div className="flex gap-1.5 items-center">
                                            <input
                                              type="number"
                                              placeholder="Summa..."
                                              value={extraPayment}
                                              onChange={(e) => setExtraPayment(parseInt(e.target.value) || 0)}
                                              className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs font-bold"
                                            />
                                            <button
                                              onClick={() => handleAddStayPayment(stay.id)}
                                              className="px-2 py-1.5 bg-emerald-600 text-white font-bold rounded text-xxs shrink-0"
                                            >
                                              Kiritish
                                            </button>
                                            <button
                                              onClick={() => setPayingStayId(null)}
                                              className="text-slate-400"
                                            >
                                              <X className="h-4 w-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setPayingStayId(stay.id);
                                              setExtraPayment(stay.remainingDebt);
                                            }}
                                            className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded font-black text-[10px] uppercase flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                                          >
                                            <Coins className="h-3 w-3" /> Qarz To'lash (Top up)
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                </div>

                                {/* Section 4: Prescriptions lists */}
                                <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xxs space-y-2">
                                  <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                    Belgilangan dori vositalari / Muolajalar
                                  </h4>
                                  
                                  {!stay.prescriptions || stay.prescriptions.length === 0 ? (
                                    <p className="text-slate-400 text-xs italic font-semibold">Statsionar dori/retseptlar belgilanmagan.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {stay.prescriptions.map((med, idx) => (
                                        <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center font-bold">
                                          <div>
                                            <span className="text-slate-900 block text-xs font-extrabold">{med.name}</span>
                                            <span className="text-[10px] text-slate-500">{med.dosage}</span>
                                          </div>
                                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                                            {med.days}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Expanded stay action panel */}
                                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 flex-wrap">
                                  <button
                                    onClick={() => printInpatientInvoice(stay)}
                                    className="px-4 py-2 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                  >
                                    <Printer className="h-3.5 w-3.5" />
                                    <span>XPrinter Chop Etish</span>
                                  </button>

                                  <button
                                    onClick={() => setExtraServiceStayId(extraServiceStayId === stay.id ? null : stay.id)}
                                    className="px-4 py-2 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                  >
                                    <FlaskConical className="h-3.5 w-3.5" />
                                    <span>Qo'shimcha Xizmat</span>
                                  </button>

                                  {activeStay && (
                                    <button
                                      onClick={() => handleDischargePatient(stay.id)}
                                      className="px-4 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      <span>Javob Berish (Discharge)</span>
                                    </button>
                                  )}
                                </div>

                                {/* Extra service form */}
                                {extraServiceStayId === stay.id && (
                                  <div className="mt-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-200">
                                    <h4 className="text-xs font-black text-purple-800 mb-3 flex items-center gap-1.5">
                                      <Activity className="h-4 w-4" />
                                      Qo'shimcha Xizmat (Tahlil, Analiz, Muolaja)
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Xizmat nomi *</label>
                                        <input
                                          type="text"
                                          value={extraServiceName}
                                          onChange={(e) => setExtraServiceName(e.target.value)}
                                          placeholder="Masalan: Qon tahlili, MRT, UZI..."
                                          className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white font-bold"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Summa (UZS) *</label>
                                        <input
                                          type="number"
                                          value={extraServiceAmount}
                                          onChange={(e) => setExtraServiceAmount(Number(e.target.value))}
                                          placeholder="150000"
                                          className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white font-bold"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Izoh</label>
                                        <input
                                          type="text"
                                          value={extraServiceNotes}
                                          onChange={(e) => setExtraServiceNotes(e.target.value)}
                                          placeholder="Qo'shimcha ma'lumot..."
                                          className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white font-bold"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-3">
                                      <button
                                        onClick={() => { setExtraServiceStayId(null); setExtraServiceName(''); setExtraServiceAmount(0); setExtraServiceNotes(''); }}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                                      >
                                        Bekor
                                      </button>
                                      <button
                                        onClick={() => handleAddExtraService(stay.id)}
                                        className="px-4 py-1.5 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all flex items-center gap-1"
                                      >
                                        <PlusCircle className="h-3.5 w-3.5" />
                                        Qo'shish
                                      </button>
                                    </div>

                                    {/* Show existing extra services */}
                                    {stay.extraServices && stay.extraServices.length > 0 && (
                                      <div className="mt-3 pt-3 border-t border-purple-200">
                                        <p className="text-[10px] font-bold text-purple-700 mb-2">Mavjud qo'shimcha xizmatlar:</p>
                                        <div className="space-y-1">
                                          {stay.extraServices.map((svc, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs bg-white px-3 py-1.5 rounded-lg border border-purple-100">
                                              <span className="font-bold text-slate-700">{svc.name}</span>
                                              <span className="font-bold text-purple-700">{svc.amount.toLocaleString()} UZS</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          SUB-TAB 3: KASSA & FINANSIYAL HISOBOTLAR
          ========================================== */}
      {activeSubTab === 'finance' && (
        <div className="space-y-6">
          {/* Financial KPI stats overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Income */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-3xl border border-emerald-400/20 shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Coins className="h-32 w-32" />
              </div>
              <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Kirimlar</span>
              <h3 className="text-2xl font-black mt-2">
                {transactions.filter(t => t.type === 'Kirim').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} UZS
              </h3>
              <p className="text-xxs font-bold text-emerald-100 mt-1 flex items-center gap-1">
                <span>●</span> Jami qabul qilingan to'lovlar
              </p>
            </div>

            {/* Total Expenses */}
            <div className="bg-gradient-to-br from-rose-500 to-amber-600 text-white p-6 rounded-3xl border border-rose-400/20 shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 opacity-10">
                <Receipt className="h-32 w-32" />
              </div>
              <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Xarajatlar / Chiqim</span>
              <h3 className="text-2xl font-black mt-2">
                {transactions.filter(t => t.type === 'Chiqim').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} UZS
              </h3>
              <p className="text-xxs font-bold text-rose-100 mt-1 flex items-center gap-1">
                <span>●</span> Shifoxona harajatlari va chiqimlari
              </p>
            </div>

            {/* Net Balance */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Kassa Qoldig'i</span>
                <h3 className={`text-2xl font-black mt-2 ${
                  (transactions.filter(t => t.type === 'Kirim').reduce((sum, t) => sum + t.amount, 0) -
                   transactions.filter(t => t.type === 'Chiqim').reduce((sum, t) => sum + t.amount, 0)) >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}>
                  {(
                    transactions.filter(t => t.type === 'Kirim').reduce((sum, t) => sum + t.amount, 0) -
                    transactions.filter(t => t.type === 'Chiqim').reduce((sum, t) => sum + t.amount, 0)
                  ).toLocaleString()} UZS
                </h3>
              </div>
              <p className="text-xxs font-bold text-slate-400 mt-1">
                Tizimdagi real vaqt kassa balansi
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Log New Expense (Chiqim) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-rose-100 shadow-[0_20px_50px_rgba(244,63,94,0.02)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
              <h3 className="text-sm font-black text-rose-950 uppercase tracking-wider mb-4 pb-3 border-b border-rose-50 flex items-center gap-2">
                <Receipt className="h-4.5 w-4.5 text-rose-600" />
                Xarajatlarni Kiritish (Chiqim)
              </h3>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (financeAmount <= 0) {
                  alert('Iltimos, to\'g\'ri miqdordagi xarajat summasini kiriting!');
                  return;
                }
                if (!financeDescription.trim()) {
                  alert('Iltimos, xarajat izohini yozing!');
                  return;
                }

                addTransaction(
                  'Chiqim',
                  financeAmount,
                  financeCategory,
                  financeDescription.trim(),
                  undefined,
                  undefined,
                  financeDate,
                  financeTime
                );

                // Reset
                setFinanceAmount(0);
                setFinanceDescription('');
                alert('Xarajat muvaffaqiyatli kassa jurnaliga chiqim sifatida kiritildi!');
              }} className="space-y-4 font-bold">
                
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black text-rose-800 mb-1.5 uppercase tracking-wide">Xarajat Summasi (UZS) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={financeAmount || ''}
                    onChange={(e) => {
                      setFinanceAmount(Math.max(0, parseInt(e.target.value) || 0));
                      setFinanceType('Chiqim'); // force expense type
                    }}
                    placeholder="Xarajat miqdorini kiriting"
                    className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl font-black focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 bg-[#f8fafc] text-rose-950"
                  />
                </div>

                {/* Category selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Kategoriya *</label>
                  <select
                    value={financeCategory}
                    onChange={(e) => setFinanceCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="Klinika xarajati">Klinika ma'muriy xarajati</option>
                    <option value="Kommunal to'lov">Kommunal to'lovlar (Gaz, Suv, Tok)</option>
                    <option value="Dori-darmon xaridi">Dori-darmon xaridi</option>
                    <option value="Maosh">Xodimlar maoshi</option>
                    <option value="Oziq-ovqat">Statsionar oziq-ovqat harajatlari</option>
                    <option value="Boshqa harajat">Boshqa chiqim/harajatlar</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Sana</label>
                    <input
                      type="date"
                      value={financeDate}
                      onChange={(e) => setFinanceDate(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Vaqt</label>
                    <input
                      type="time"
                      value={financeTime}
                      onChange={(e) => setFinanceTime(e.target.value)}
                      className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Tranzaksiya izohi / Tafsilot *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Xarid qilingan narsa yoki sababni aniq yozing..."
                    value={financeDescription}
                    onChange={(e) => setFinanceDescription(e.target.value)}
                    className="w-full px-3.5 py-3.5 text-xs border border-slate-200 rounded-xl font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 placeholder-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  Tranzaksiyani Saqlash (Save)
                </button>
              </form>
            </div>

            {/* Right Column: Transactions Journal Ledger */}
            <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Kassa Tranzaksiyalar Jurnali</h3>
                    <p className="text-xxs text-slate-400 font-bold">Barcha klinika kirim va chiqimlari xronologiyasi</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1.5 bg-slate-50 text-slate-500 border border-slate-150 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                      🔒 Kassa jurnali arxivlanmoqda (O'chirilmaydi)
                    </span>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {/* Search bar */}
                  <div className="relative col-span-2">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Izoh yoki bemor nomi bilan qidirish..."
                      value={financeSearch}
                      onChange={(e) => setFinanceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400"
                    />
                  </div>

                  {/* Filter select */}
                  <div>
                    <select
                      value={financeFilter}
                      onChange={(e) => setFinanceFilter(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800"
                    >
                      <option value="all">Barcha operatsiyalar</option>
                      <option value="Kirim">Faqat Kirimlar (Tushumlar)</option>
                      <option value="Chiqim">Faqat Chiqimlar (Harajatlar)</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[450px] overflow-y-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="p-3">Sana va Vaqt</th>
                        <th className="p-3">Turi</th>
                        <th className="p-3">Kategoriya</th>
                        <th className="p-3">Tafsilot (Izoh)</th>
                        <th className="p-3">Summa</th>
                        <th className="p-3 text-right">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold">
                      {transactions
                        .filter(tx => {
                          const query = financeSearch.toLowerCase().trim();
                          const matchesQuery =
                            tx.description.toLowerCase().includes(query) ||
                            tx.category.toLowerCase().includes(query) ||
                            (tx.patientName && tx.patientName.toLowerCase().includes(query));
                          const matchesType = financeFilter === 'all' || tx.type === financeFilter;
                          return matchesQuery && matchesType;
                        })
                        .map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-slate-500 whitespace-nowrap text-xxs">
                              <div>📅 {tx.date}</div>
                              <div className="text-slate-400 mt-0.5">🕒 {tx.time}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                tx.type === 'Kirim'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                                {tx.category}
                              </span>
                            </td>
                            <td className="p-3 text-slate-700 text-xxs leading-relaxed max-w-[200px] truncate" title={tx.description}>
                              {tx.description}
                              {tx.patientId && (
                                <div className="text-slate-400 text-[10px] mt-0.5">ID: {tx.patientId}</div>
                              )}
                            </td>
                            <td className={`p-3 font-extrabold text-sm whitespace-nowrap ${
                              tx.type === 'Kirim' ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {tx.type === 'Kirim' ? '+' : '-'}{tx.amount.toLocaleString()} UZS
                            </td>
                            <td className="p-3 text-right">
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-slate-50 text-slate-400 border border-slate-150 rounded text-[9px] font-black tracking-wider" title="Tranzaksiya arxivlangan va himoyalangan">
                                🔒 LOCKED
                              </span>
                            </td>
                          </tr>
                        ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400">
                            Hech qanday tranzaksiya qayd etilmagan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: INTERACTIVE WARD & BEDS DETAILS
          ========================================== */}
      {selectedRoomForBeds && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200/80 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 flex justify-between items-center relative">
              <div>
                <span className="text-[10px] bg-white/20 px-2.5 py-1 rounded-full font-black uppercase tracking-wider">Palata nazorati</span>
                <h3 className="text-lg font-black mt-1 flex items-center gap-2">
                  🚪 {selectedRoomForBeds.roomNumber}-Palata Holati ({selectedRoomForBeds.genderType})
                </h3>
              </div>
              <button
                onClick={() => setSelectedRoomForBeds(null)}
                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all cursor-pointer text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700">
                <div>
                  <p className="font-bold">Palata raqami: <span className="font-black text-slate-900">{selectedRoomForBeds.roomNumber}</span></p>
                  <p className="font-bold mt-1">Bemoring jinsi: <span className="font-black text-slate-900">{selectedRoomForBeds.genderType}</span></p>
                </div>
                <div>
                  <p className="font-bold">Palata sig'imi: <span className="font-black text-slate-900">{selectedRoomForBeds.capacity} ta o'rin</span></p>
                  <p className="font-bold mt-1">Kunlik to'lov: <span className="font-black text-emerald-700">{selectedRoomForBeds.pricePerDay.toLocaleString()} UZS</span></p>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">Palatadagi o'rinlar ({selectedRoomForBeds.capacity} ta joy)</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.from({ length: selectedRoomForBeds.capacity }).map((_, idx) => {
                    // Match stay at this bed index
                    const roomStays = inpatientStays.filter(s => s.roomId === selectedRoomForBeds.id && s.status === 'Davolanmoqda');
                    const stay = roomStays[idx];

                    if (stay) {
                      // Occupied bed (Band o'rin)
                      return (
                        <div key={idx} className="bg-rose-50/50 border border-rose-200/90 rounded-2xl p-4 flex flex-col justify-between relative shadow-xs">
                          <div className="absolute top-3 right-3 text-rose-500 bg-rose-100/60 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase">
                            🔴 BAND
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="bg-rose-100 text-rose-600 p-2 rounded-xl">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-xxs font-black text-rose-500 uppercase">Bemor</div>
                                <h5 className="text-xs font-extrabold text-slate-900">{stay.lastName} {stay.firstName}</h5>
                              </div>
                            </div>

                            <div className="text-xxs font-bold text-slate-600 grid grid-cols-2 gap-y-1.5 gap-x-2 pt-2 border-t border-rose-100">
                              <div>Kelgan sana: <span className="font-extrabold text-slate-800">{stay.checkInDate}</span></div>
                              <div>Muddati: <span className="font-extrabold text-slate-800">{stay.plannedDays} kun</span></div>
                              <div>To'lagan: <span className="font-extrabold text-emerald-700">{stay.amountPaid.toLocaleString()} UZS</span></div>
                              <div>Qarz: <span className={`font-extrabold ${stay.remainingDebt > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{stay.remainingDebt.toLocaleString()} UZS</span></div>
                              <div className="col-span-2 truncate">Tashxis: <span className="font-extrabold text-slate-800">{stay.diagnosis}</span></div>
                              <div className="col-span-2 truncate">Doktor: <span className="font-extrabold text-slate-800">{stay.doctorName}</span></div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-4 pt-3 border-t border-rose-100">
                            <button
                              onClick={() => printInpatientInvoice(stay)}
                              className="flex-1 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xxs font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              <Printer className="h-3 w-3" /> Kvitansiya
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`${stay.lastName} ${stay.firstName}ning davolanish muddati tugatildi va hisobdan chiqarilmoqdami?`)) {
                                  handleDischargePatient(stay.id);
                                  // Live refresh room for beds
                                  const updatedRoom = { ...selectedRoomForBeds, occupiedBeds: selectedRoomForBeds.occupiedBeds - 1 };
                                  setSelectedRoomForBeds(updatedRoom);
                                }
                              }}
                              className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xxs font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
                            >
                              🚪 Chiqarish
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      // Free bed (Bo'sh o'rin) - STYLED IN BEAUTIFUL BLUE / KO'K RANG
                      const isAdmittingThisBed = isAdmittingFromBed && admittingBedIndex === idx;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setIsAdmittingFromBed(true);
                            setAdmittingBedIndex(idx);
                            // Pre-set room in our admission state
                            setSelectedRoomId(selectedRoomForBeds.id);
                            setInpPricePerDay(selectedRoomForBeds.pricePerDay);
                          }}
                          className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[140px] group ${
                            isAdmittingThisBed
                              ? 'bg-blue-100/80 border-blue-500 ring-4 ring-blue-500/10'
                              : 'bg-sky-50/50 hover:bg-sky-50 border-sky-300 text-sky-800 hover:border-sky-500'
                          }`}
                        >
                          <div className="bg-sky-100 text-sky-600 p-2.5 rounded-2xl mb-2 transition-transform group-hover:scale-110">
                            <Bed className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">{idx + 1}-o'rin</span>
                          <h5 className="text-xs font-black text-sky-900 mt-0.5">BO'SH O'RIN</h5>
                          <p className="text-[10px] text-sky-600/80 font-bold mt-1">Joylashtirish uchun bosing</p>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>

              {/* Patient Admission Form Inline within Modal */}
              {isAdmittingFromBed && (
                <div className="border border-blue-100 bg-blue-50/20 rounded-3xl p-6 relative overflow-hidden animate-in slide-in-from-bottom duration-300">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-400"></div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      📝 {selectedRoomForBeds.roomNumber}-Palatadagi {admittingBedIndex + 1}-o'ringa Bemor Yotqizish Formasi
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdmittingFromBed(false);
                        setAdmittingBedIndex(-1);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    
                    let pId = '';
                    let fName = '';
                    let lName = '';
                    let mName = '';
                    let pPhone = '';
                    let pGender: 'Erkak' | 'Ayol' = 'Erkak';
                    let pBirth = '';

                    if (isNewPatient) {
                      if (!inpFirstName.trim() || !inpLastName.trim() || !inpPhone.trim()) {
                        alert('Iltimos, yangi bemorning ism, familiya va telefon raqamini kiriting!');
                        return;
                      }

                      // Check if patient with the same name and phone already exists
                      const exactMatch = patients.find(
                        (p) =>
                          p.firstName.trim().toLowerCase() === inpFirstName.trim().toLowerCase() &&
                          p.lastName.trim().toLowerCase() === inpLastName.trim().toLowerCase() &&
                          p.phone.trim().replace(/\s+/g, '') === inpPhone.trim().replace(/\s+/g, '')
                      );

                      if (exactMatch) {
                        const confirmRegister = window.confirm(
                          `⚠️ DIQQAT! Tizimda ushbu bemor allaqachon mavjud!\n\nIsmi: ${exactMatch.lastName} ${exactMatch.firstName}\nTelefon: ${exactMatch.phone}\nQayd etilgan vaqti: ${new Date(exactMatch.createdAt).toLocaleDateString('uz-UZ')}\n\nUshbu bemorni yangi Statsionar davolashga yotqizishda davom etishni xohlaysizmi?`
                        );
                        if (!confirmRegister) {
                          return;
                        }
                      }

                      const maxIdNumber = patients.reduce((max, p) => {
                        const num = parseInt(p.id.split('-')[1]);
                        return num > max ? num : max;
                      }, 1000);
                      pId = `P-${maxIdNumber + 1}`;
                      fName = inpFirstName.trim();
                      lName = inpLastName.trim();
                      mName = inpMiddleName.trim();
                      pPhone = inpPhone.trim();
                      pGender = inpGender;
                      pBirth = inpBirthDate || '1990-01-01';

                      onAddPatient({
                        firstName: fName,
                        lastName: lName,
                        middleName: mName,
                        birthDate: pBirth,
                        phone: pPhone,
                        gender: pGender,
                        departmentId: stayDoctorId || DEPARTMENTS[0]?.id || 'nevrologiya',
                        doctorName: DEPARTMENTS.find((d) => d.id === stayDoctorId)?.doctorName || 'Shifokor',
                        paymentStatus: 'To\'langan',
                        paymentAmount: stayAmountPaid,
                      });
                    } else {
                      const existing = patients.find((p) => p.id === selectedPatientId);
                      if (!existing) {
                        alert('Iltimos, shifoxonadagi mavjud bemorlardan tanlang!');
                        return;
                      }
                      pId = existing.id;
                      fName = existing.firstName;
                      lName = existing.lastName;
                      mName = existing.middleName || '';
                      pPhone = existing.phone;
                      pGender = existing.gender;
                      pBirth = existing.birthDate;
                    }

                    const selectedDoc = DEPARTMENTS.find((d) => d.id === stayDoctorId) || DEPARTMENTS[0];
                    const totalCost = stayDays * selectedRoomForBeds.pricePerDay;

                    const newStay: InpatientStay = {
                      id: 'S-' + Math.floor(Math.random() * 90000 + 10000),
                      patientId: pId,
                      firstName: fName,
                      lastName: lName,
                      middleName: mName,
                      phone: pPhone,
                      gender: pGender,
                      roomId: selectedRoomForBeds.id,
                      roomNumber: selectedRoomForBeds.roomNumber,
                      checkInDate: new Date().toISOString().split('T')[0],
                      plannedDays: Number(stayDays),
                      pricePerDay: Number(selectedRoomForBeds.pricePerDay),
                      totalCost,
                      amountPaid: Number(stayAmountPaid),
                      remainingDebt: totalCost - Number(stayAmountPaid),
                      status: 'Davolanmoqda',
                      doctorName: selectedDoc?.doctorName || 'Navbatchi Shifokor',
                      departmentName: selectedDoc?.name || 'Nevrologiya bo\'limi',
                      diagnosis: stayDiagnosis.trim() || 'Klinik tahlillar va statsionar davolanish',
                      prescriptions: tempMeds,
                    };

                    onSaveInpatientStays([...inpatientStays, newStay]);

                    // Log financial transaction
                    if (Number(stayAmountPaid) > 0) {
                      addTransaction(
                        'Kirim',
                        Number(stayAmountPaid),
                        "Statsionar to'lov",
                        `${lName} ${fName} - ${selectedRoomForBeds.roomNumber}-palata yotish depoziti to'lovi`,
                        pId,
                        `${lName} ${fName}`
                      );
                    }

                    // Reset form & state
                    setInpFirstName('');
                    setInpLastName('');
                    setInpMiddleName('');
                    setInpPhone('+998');
                    setInpGender('Erkak');
                    setInpBirthDate('');
                    setSelectedPatientId('');
                    setStayDays(5);
                    setStayAmountPaid(0);
                    setStayDiagnosis('');
                    setTempMeds([]);
                    setIsAdmittingFromBed(false);
                    setAdmittingBedIndex(-1);

                    // Update live room details
                    const updatedRoom = { ...selectedRoomForBeds, occupiedBeds: selectedRoomForBeds.occupiedBeds + 1 };
                    setSelectedRoomForBeds(updatedRoom);
                    
                    alert('Bemor muvaffaqiyatli palataga joylashtirildi!');
                  }} className="space-y-4">
                    {/* Toggle new vs existing patient */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl mb-4 max-w-xs">
                      <button
                        type="button"
                        onClick={() => setIsNewPatient(true)}
                        className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center ${
                          isNewPatient ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ➕ YANGI BEMOR
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewPatient(false)}
                        className={`py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer text-center ${
                          !isNewPatient ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔍 TIZIMDAGI BEMOR
                      </button>
                    </div>

                    {isNewPatient ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">FAMILIYA *</label>
                          <input
                            type="text"
                            required
                            placeholder="Alimov"
                            value={inpLastName}
                            onChange={(e) => setInpLastName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">ISM *</label>
                          <input
                            type="text"
                            required
                            placeholder="Anvar"
                            value={inpFirstName}
                            onChange={(e) => setInpFirstName(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1">TEL *</label>
                          <input
                            type="text"
                            required
                            placeholder="+998901234567"
                            value={inpPhone}
                            onChange={(e) => setInpPhone(e.target.value)}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-1">JINSI</label>
                            <select
                              value={inpGender}
                              onChange={(e) => setInpGender(e.target.value as 'Erkak' | 'Ayol')}
                              className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                            >
                              <option value="Erkak">Erkak</option>
                              <option value="Ayol">Ayol</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-1">TUG'ILGAN SANA</label>
                            <input
                              type="date"
                              value={inpBirthDate}
                              onChange={(e) => setInpBirthDate(e.target.value)}
                              className="w-full px-2 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">BEMORNI TANLANG *</label>
                        <select
                          required
                          value={selectedPatientId}
                          onChange={(e) => setSelectedPatientId(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-800 font-bold"
                        >
                          <option value="">-- Bemorni ro'yxatdan tanlang --</option>
                          {patients.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.lastName} {p.firstName} ({p.id})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">NECHA KUN YOTADI *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={stayDays}
                          onChange={(e) => setStayDays(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">JAMI SUMMA (UZS)</label>
                        <div className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-100 font-extrabold text-slate-800">
                          {(stayDays * selectedRoomForBeds.pricePerDay).toLocaleString()} UZS
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">TO'LOV SUMMASI (UZS) *</label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={stayDays * selectedRoomForBeds.pricePerDay}
                          value={stayAmountPaid}
                          onChange={(e) => setStayAmountPaid(Math.min(stayDays * selectedRoomForBeds.pricePerDay, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full px-3 py-2.5 text-xs border-blue-200 focus:border-blue-500 rounded-xl bg-white font-extrabold text-blue-700"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">SHIFOKOR *</label>
                        <select
                          required
                          value={stayDoctorId}
                          onChange={(e) => setStayDoctorId(e.target.value)}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                        >
                          <option value="">-- Shifokorni tanlang --</option>
                          {DEPARTMENTS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.doctorName} ({d.name})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">TASHXIS / SABAB</label>
                      <input
                        type="text"
                        placeholder="Masalan: Surunkali radikulit, davolash kursi"
                        value={stayDiagnosis}
                        onChange={(e) => setStayDiagnosis(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-white font-bold"
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdmittingFromBed(false);
                          setAdmittingBedIndex(-1);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                      >
                        Joylashtirish & To'lov
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRoomForBeds(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
