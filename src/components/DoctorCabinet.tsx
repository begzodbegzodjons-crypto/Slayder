import React, { useState, useEffect } from 'react';
import { Patient, Medication, UserSession, Department, InpatientStay, DailyTreatment, DiagnosisTemplate, ClinicSettings } from '../types';
import {
  Stethoscope,
  User,
  Play,
  Check,
  Plus,
  Trash2,
  Printer,
  FileText,
  Bed,
  Calendar,
  Save,
  PlusCircle,
  ChevronRight,
  X,
  Clock,
  Activity,
  Coins,
  FileSpreadsheet
} from 'lucide-react';

interface DoctorCabinetProps {
  patients: Patient[];
  onUpdatePatientRecord: (patientId: string, updates: Partial<Patient>) => void;
  onCallPatient: (patient: Patient) => void;
  session: UserSession | null;
  departments: Department[];
  inpatientStays: InpatientStay[];
  onSaveInpatientStays: (stays: InpatientStay[]) => void;
  diagnosisTemplates?: DiagnosisTemplate[];
  clinicSettings?: ClinicSettings;
}

export const DoctorCabinet: React.FC<DoctorCabinetProps> = ({
  patients,
  onUpdatePatientRecord,
  onCallPatient,
  session,
  departments,
  inpatientStays = [],
  onSaveInpatientStays,
  diagnosisTemplates = [],
  clinicSettings,
}) => {
  // Default clinic settings
  const cs: ClinicSettings = clinicSettings || {
    clinicName: 'DR.Maruf Clinic',
    clinicPhone: '+998 71 123-45-67',
    clinicAddress: 'Toshkent, O\'zbekiston',
    recipeHeader: 'SHIFOKOR RETSEPTi (RECIPE)',
    recipeFooter: 'Sog\'ayib keting! Qayta ko\'rik: Shifokor tavsiyasiga ko\'ra.',
    ticketHeader: 'Tashrifingiz uchun rahmat!',
    ticketFooter: 'Shifokor kabineti eshigi ustidagi monitorni kuzatib boring.',
  };
  // If role is doctor, active doctor department matches session.doctorId
  // If role is admin, admin can select which doctor's cabinet to view
  const [activeDoctorId, setActiveDoctorId] = useState<string>('');

  // Primary Sub-Tab: 'ambulatory' (Ambulator Qabul) vs 'inpatient_wards' (Yotib Davolanayotganlar)
  const [activeSubTab, setActiveSubTab] = useState<'ambulatory' | 'inpatient_wards'>('ambulatory');

  useEffect(() => {
    if (session) {
      if (session.role === 'doctor' && session.doctorId) {
        setActiveDoctorId(session.doctorId);
      } else if (session.role === 'admin' && departments.length > 0) {
        // Default to first department for admin to view
        setActiveDoctorId(departments[0].id);
      }
    }
  }, [session, departments]);

  const currentDoctorId = (session?.role === 'doctor' && session.doctorId) ? session.doctorId : activeDoctorId;
  const activeDept = departments.find((d) => d.id === currentDoctorId);

  // ==========================================
  // 1. AMBULATORY QABUL STATES & LOGIC
  // ==========================================
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [complaints, setComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [testResults, setTestResults] = useState('');
  const [medsList, setMedsList] = useState<Medication[]>([{ name: '', dosage: '', days: '' }]);

  // Update active patient from patients prop if it changes or if currentDoctorId changes
  useEffect(() => {
    if (currentDoctorId) {
      const currentActive = patients.find(
        (p) => p.departmentId === currentDoctorId && p.status === 'Qabulda'
      );
      if (currentActive) {
        setActivePatient(currentActive);
        setComplaints(currentActive.complaints || '');
        setDiagnosis(currentActive.diagnosis || '');
        setTestResults(currentActive.testResults || '');
        if (currentActive.prescriptions && currentActive.prescriptions.length > 0) {
          setMedsList(currentActive.prescriptions);
        } else {
          setMedsList([{ name: '', dosage: '', days: '' }]);
        }
      } else {
        setActivePatient(null);
      }
    }
  }, [patients, currentDoctorId]);

  const addMedRow = () => {
    setMedsList([...medsList, { name: '', dosage: '', days: '' }]);
  };

  const removeMedRow = (index: number) => {
    const newList = medsList.filter((_, i) => i !== index);
    setMedsList(newList.length > 0 ? newList : [{ name: '', dosage: '', days: '' }]);
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string) => {
    const newList = [...medsList];
    newList[index][field] = value;
    setMedsList(newList);
  };

  const handleCallPatient = (patient: Patient) => {
    onCallPatient(patient);
  };

  const handleSaveCheckup = () => {
    if (!activePatient) return;

    if (!diagnosis) {
      alert('Iltimos, tashxisni kiriting!');
      return;
    }

    const cleanMeds = medsList.filter((m) => m.name.trim() !== '');

    onUpdatePatientRecord(activePatient.id, {
      status: 'Yakunlangan',
      complaints,
      diagnosis,
      testResults,
      prescriptions: cleanMeds,
      completedAt: new Date().toISOString(),
    });

    alert('Qabul yakunlandi! Ma\'lumotlar muvaffaqiyatli saqlandi.');
    setActivePatient(null);
    setComplaints('');
    setDiagnosis('');
    setTestResults('');
    setMedsList([{ name: '', dosage: '', days: '' }]);
  };

  const handlePrintRecipe = () => {
    if (!activePatient || !activeDept) return;

    const printWindow = window.open('', '_blank', 'width=350,height=550');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi! Brauzer sozlamalaridan popupga ruxsat bering.');
      return;
    }

    const cleanMeds = medsList.filter((m) => m.name.trim() !== '');

    printWindow.document.write(`
      <html>
        <head>
          <title>Retsept - ${activePatient.lastName} ${activePatient.firstName}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 15px;
              width: 290px;
              margin: 0 auto;
              color: #000;
              font-size: 13px;
              line-height: 1.4;
            }
            .header { text-align: center; border-bottom: 2px double #000; padding-bottom: 8px; margin-bottom: 12px; }
            .clinic-name { font-size: 16px; font-weight: bold; }
            .section-title { font-weight: bold; border-bottom: 1px dashed #000; margin: 10px 0 5px 0; padding-bottom: 2px; text-transform: uppercase; }
            .med-item { margin-bottom: 10px; padding-left: 10px; }
            .footer { border-top: 1px dashed #000; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 11px; }
            .stamp { float: right; border: 2px solid #000; padding: 10px; margin-top: 15px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
            button { display: block; width: 100%; padding: 10px; margin-top: 25px; background: #000; color: #fff; border: none; font-weight: bold; cursor: pointer; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="clinic-name">${cs.clinicName}</div>
            <div style="font-size: 10px;">Tel: ${cs.clinicPhone}</div>
            <div style="font-size: 11px; font-weight: bold; margin-top: 5px;">${cs.recipeHeader}</div>
          </div>

          <div>
            <strong>Sana:</strong> ${new Date().toLocaleDateString('uz-UZ')}<br>
            <strong>Shifokor:</strong> ${activeDept.doctorName}<br>
            <strong>Xona:</strong> ${activeDept.room}<br>
            <strong>Mutaxassislik:</strong> ${activeDept.name}<br>
          </div>

          <div class="section-title">Bemor Ma'lumotlari</div>
          <div>
            <strong>F.I.SH:</strong> ${activePatient.lastName} ${activePatient.firstName} ${activePatient.middleName || ''}<br>
            <strong>Tug'ilgan yil:</strong> ${activePatient.birthDate || 'Kiritilmagan'}<br>
            <strong>ID:</strong> ${activePatient.id}<br>
          </div>

          <div class="section-title">Tashxis (Diagnosis)</div>
          <div style="font-style: italic;">
            ${diagnosis || 'Kiritish vaqtida tashxis qo\'yilmagan'}
          </div>

          ${cleanMeds.length > 0 ? `
            <div class="section-title">Tayinlangan Dorilar (Rx)</div>
            <ol style="margin: 0; padding-left: 20px;">
              ${cleanMeds.map((med) => `
                <li style="margin-bottom: 8px;">
                  <strong>${med.name}</strong><br>
                  <span style="font-size: 11px; color: #333;">↪ Qabul qilish: ${med.dosage} (${med.days})</span>
                </li>
              `).join('')}
            </ol>
          ` : ''}

          <div class="section-title">Shifokor tavsiyalari</div>
          <div style="font-size: 11px;">
            Suyuqlik ko'p ichilsin, dori-darmonlar belgilangan vaqtda qat'iy rejimda olinsin.
          </div>

          <div class="stamp">
            ${cs.clinicName.toUpperCase()}<br>
            ${cs.clinicAddress}
          </div>

          <div class="footer">
            ${cs.recipeFooter}
          </div>

          <button onclick="window.print(); window.close();">Retseptni Chop Etish (XPrinter 80mm)</button>

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

  const waitingPatients = patients.filter(
    (p) => currentDoctorId && p.departmentId === currentDoctorId && p.status === 'Kutmoqda'
  );

  // ==========================================
  // 2. STATSIONAR PALATALAR PORTAL LOGIC & STATES
  // ==========================================
  const [selectedInpatientId, setSelectedInpatientId] = useState<string | null>(null);

  // Form states for adding a daily treatment/recipe log
  const [inpDate, setInpDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [inpProcedures, setInpProcedures] = useState<string>('');
  const [inpNotes, setInpNotes] = useState<string>('');
  const [inpMeds, setInpMeds] = useState<Medication[]>([{ name: '', dosage: '', days: '' }]);

  // Filter inpatient stays to only those currently hospitalized (Davolanmoqda)
  const hospitalizedPatients = inpatientStays.filter((stay) => stay.status === 'Davolanmoqda');

  const selectedInpatient = inpatientStays.find((stay) => stay.id === selectedInpatientId);

  // Load the selected patient's values when clicked
  const selectInpatientPatient = (stay: InpatientStay) => {
    setSelectedInpatientId(stay.id);
    setInpDate(new Date().toISOString().split('T')[0]);
    setInpProcedures('');
    setInpNotes('');
    setInpMeds([{ name: '', dosage: '', days: '' }]);
  };

  // Add treatment medication row in daily prescription list
  const addInpMedRow = () => {
    setInpMeds([...inpMeds, { name: '', dosage: '', days: '' }]);
  };

  const removeInpMedRow = (index: number) => {
    const newList = inpMeds.filter((_, i) => i !== index);
    setInpMeds(newList.length > 0 ? newList : [{ name: '', dosage: '', days: '' }]);
  };

  const handleInpMedChange = (index: number, field: keyof Medication, value: string) => {
    const newList = [...inpMeds];
    newList[index][field] = value;
    setInpMeds(newList);
  };

  // Save the daily treatment log to the selected inpatient's stay record
  const handleSaveDailyTreatment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInpatient) {
      alert('Xatolik: Bemor tanlanmagan!');
      return;
    }

    if (!inpDate) {
      alert('Iltimos, ko\'rik/muolaja sanasini tanlang!');
      return;
    }

    if (!inpProcedures.trim() && !inpNotes.trim() && inpMeds.every(m => m.name.trim() === '')) {
      alert('Iltimos, muolajalar, shifokor eslatmasi yoki kamida bitta dori kiritilganiga ishonch hosil qiling!');
      return;
    }

    const cleanDailyMeds = inpMeds.filter((m) => m.name.trim() !== '');

    const newTreatmentLog: DailyTreatment = {
      id: 'T-' + Date.now(),
      date: inpDate,
      prescriptions: cleanDailyMeds,
      procedures: inpProcedures.trim(),
      doctorNotes: inpNotes.trim(),
    };

    // Append to existing daily treatments
    const currentLogs = selectedInpatient.dailyTreatments || [];
    const updatedLogs = [newTreatmentLog, ...currentLogs].sort((a, b) => b.date.localeCompare(a.date));

    // Update global state via callback
    const updatedStays = inpatientStays.map((stay) => {
      if (stay.id === selectedInpatient.id) {
        return {
          ...stay,
          dailyTreatments: updatedLogs,
          // Let's also sync the latest general prescriptions if desired
          prescriptions: cleanDailyMeds.length > 0 ? cleanDailyMeds : stay.prescriptions,
        };
      }
      return stay;
    });

    onSaveInpatientStays(updatedStays);
    alert(`${inpDate} kungi davolash va muolaja varaqasi muvaffaqiyatli saqlandi!`);

    // Reset form states
    setInpProcedures('');
    setInpNotes('');
    setInpMeds([{ name: '', dosage: '', days: '' }]);
  };

  // Delete a specific daily treatment record
  const handleDeleteDailyTreatment = (treatmentId: string) => {
    if (!selectedInpatient) return;
    if (!confirm('Ushbu kungi davolash yozuvini o\'chirishni xohlaysizmi?')) return;

    const currentLogs = selectedInpatient.dailyTreatments || [];
    const updatedLogs = currentLogs.filter((log) => log.id !== treatmentId);

    const updatedStays = inpatientStays.map((stay) => {
      if (stay.id === selectedInpatient.id) {
        return {
          ...stay,
          dailyTreatments: updatedLogs,
        };
      }
      return stay;
    });

    onSaveInpatientStays(updatedStays);
  };

  // Print a specific day's treatment & procedures list via XPrinter
  const printDailyTreatment = (stay: InpatientStay, treatment: DailyTreatment) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan popupga ruxsat bering.');
      return;
    }

    const medRows = treatment.prescriptions && treatment.prescriptions.length > 0
      ? treatment.prescriptions.map((m, idx) => `${idx + 1}. ${m.name}<br>&nbsp;&nbsp;↪ Doza: ${m.dosage} (${m.days})`).join('<br>')
      : 'Dori vositalari belgilanmagan';

    printWindow.document.write(`
      <html>
        <head>
          <title>Kunlik Davolash - ${stay.lastName} ${stay.firstName}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 15px;
              width: 290px;
              margin: 0 auto;
              color: #000;
              font-size: 12px;
              line-height: 1.4;
            }
            .title { font-size: 15px; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 3px; }
            .subtitle { font-size: 10px; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 10px; }
            .info { margin: 8px 0; text-align: left; }
            .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; margin-top: 15px; padding-bottom: 2px; text-transform: uppercase; }
            .text-block { font-style: italic; margin-top: 5px; white-space: pre-wrap; background: #fafafa; padding: 5px; }
            .footer { font-size: 9px; text-align: center; border-top: 1px dashed #000; padding-top: 8px; margin-top: 20px; }
            button { display: block; width: 100%; padding: 8px; margin-top: 15px; background: #000; color: #fff; border: none; font-weight: bold; cursor: pointer; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="title">${cs.clinicName}</div>
          <div class="subtitle">KUNLIK SHIFO VA MUOLAJA VARAQASI</div>

          <div class="info">
            <strong>Bemor:</strong> ${stay.lastName.toUpperCase()} ${stay.firstName.toUpperCase()}<br>
            <strong>ID:</strong> ${stay.patientId}<br>
            <strong>Palata:</strong> № ${stay.roomNumber}<br>
            <strong>Ko'rik Sanasi:</strong> ${new Date(treatment.date).toLocaleDateString('uz-UZ')}<br>
            <strong>Shifokor:</strong> ${stay.doctorName}
          </div>

          <div class="section-title">Tayinlangan Muolajalar</div>
          <div class="text-block">
            ${treatment.procedures || "Muolajalar kiritilmagan"}
          </div>

          <div class="section-title">Kunlik Retsept (Rx)</div>
          <div class="info" style="font-size: 11px;">
            ${medRows}
          </div>

          <div class="section-title">Shifokor ko'rsatmasi</div>
          <div class="text-block" style="font-size: 11px;">
            ${treatment.doctorNotes || "Eslatmalar kiritilmagan"}
          </div>

          <div class="footer">
            Ushbu varaqadagi muolajalar faqat belgilangan kunga tegishli.<br>
            ${cs.recipeFooter}<br>
            ${cs.clinicName}
          </div>

          <button onclick="window.print(); window.close();">XPrinterda Chop etish</button>
          
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

  // Print all inpatient treatments history summary via XPrinter
  const printFullStayHistory = (stay: InpatientStay) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan popupga ruxsat bering.');
      return;
    }

    const logs = stay.dailyTreatments || [];
    const logsHtml = logs.length > 0
      ? logs.map((log) => `
          <div style="border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px;">
            <strong>Sana:</strong> ${new Date(log.date).toLocaleDateString('uz-UZ')}<br>
            <strong>Muolajalar:</strong> ${log.procedures || 'yo\'q'}<br>
            <strong>Ko'rsatma:</strong> ${log.doctorNotes || 'yo\'q'}<br>
            <strong>Rx Dorilar:</strong> ${log.prescriptions.map(m => m.name + " (" + m.dosage + ")").join(', ') || 'yo\'q'}
          </div>
        `).join('')
      : 'Kunlik muolajalar tarixi kiritilmagan';

    printWindow.document.write(`
      <html>
        <head>
          <title>Davolanish Tarixi - ${stay.lastName} ${stay.firstName}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 15px;
              width: 290px;
              margin: 0 auto;
              color: #000;
              font-size: 12px;
              line-height: 1.4;
            }
            .title { font-size: 15px; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 3px; }
            .subtitle { font-size: 10px; text-align: center; border-bottom: 2px double #000; padding-bottom: 8px; margin-bottom: 10px; }
            .info { margin: 8px 0; text-align: left; }
            .section-title { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; margin-top: 15px; padding-bottom: 2px; text-transform: uppercase; }
            .footer { font-size: 9px; text-align: center; border-top: 1px dashed #000; padding-top: 8px; margin-top: 20px; }
            button { display: block; width: 100%; padding: 8px; margin-top: 15px; background: #000; color: #fff; border: none; font-weight: bold; cursor: pointer; }
            @media print {
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="title">${cs.clinicName}</div>
          <div class="subtitle">STATSIONAR DAVOLANISH KRONOLOGIYASI</div>

          <div class="info">
            <strong>Bemor:</strong> ${stay.lastName.toUpperCase()} ${stay.firstName.toUpperCase()}<br>
            <strong>ID:</strong> ${stay.patientId}<br>
            <strong>Palata:</strong> № ${stay.roomNumber}<br>
            <strong>Kirish Sanasi:</strong> ${stay.checkInDate}<br>
            <strong>Shifokor:</strong> ${stay.doctorName}
          </div>

          <div class="section-title">Davolash va Muolajalar Tarixi</div>
          <div class="info" style="font-size: 11px;">
            ${logsHtml}
          </div>

          <div class="footer">
            Klinika Statsionar Bo'limi Hisoboti.<br>
            ${cs.clinicName}
          </div>

          <button onclick="window.print(); window.close();">XPrinterda Chop etish</button>
          
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


  if (!currentDoctorId || !activeDept) {
    return (
      <div className="max-w-md mx-auto bg-white/95 backdrop-blur-md p-10 rounded-2xl border border-rose-100 shadow-xl text-center">
        <p className="text-slate-600 font-bold">Mavjud shifokor yoki bo'limlar topilmadi.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Doctor Cabinet Banner with sub-tab controls */}
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] neon-glow-emerald flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 animate-fade-in relative overflow-hidden">
        {/* Top aesthetic gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        <div className="flex items-center space-x-4 z-10">
          <div className="bg-emerald-500/10 text-emerald-600 p-3.5 rounded-2xl flex items-center justify-center">
            <Stethoscope className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
              {activeDept.doctorName} kabineti
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              Mutaxassislik: <span className="text-emerald-700 font-extrabold">{activeDept.name}</span> • Xona: <span className="text-slate-800 font-black">🚪 {activeDept.room}</span>
            </p>
          </div>
        </div>

        {/* Doctor Portal View Switcher Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 z-10 w-full lg:w-auto">
          <button
            onClick={() => setActiveSubTab('ambulatory')}
            className={`flex-1 lg:flex-none px-5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeSubTab === 'ambulatory'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>📈 Ambulator Ko'rik</span>
          </button>
          <button
            onClick={() => setActiveSubTab('inpatient_wards')}
            className={`flex-1 lg:flex-none px-5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              activeSubTab === 'inpatient_wards'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/10'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bed className="h-4 w-4" />
            <span>🛌 Statsionar Palatalar ({hospitalizedPatients.length})</span>
          </button>
        </div>

        {/* If Admin is viewing, they can toggle which doctor's cabinet to inspect */}
        {session?.role === 'admin' && (
          <div className="flex items-center space-x-2 bg-[#f8fafc] p-2 rounded-2xl border border-slate-200/80 z-10">
            <span className="text-xs font-bold text-slate-500">Kabinetni tanlash:</span>
            <select
              value={activeDoctorId}
              onChange={(e) => setActiveDoctorId(e.target.value)}
              className="text-xs font-black text-slate-800 bg-white border border-slate-300 p-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.doctorName} ({d.name})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ==========================================
          SUB-TAB 1: AMBULATORY CHECKUP (ORIGINAL CORE)
          ========================================== */}
      {activeSubTab === 'ambulatory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Left column: Waiting Queue */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/30 p-6 rounded-3xl border border-amber-100 shadow-[0_20px_40px_rgba(245,158,11,0.03)]">
              <h3 className="text-sm font-black text-slate-900 mb-4 pb-3 border-b border-amber-200/50 flex items-center justify-between">
                <span>Navbatda Kutayotganlar</span>
                <span className="bg-amber-100 text-amber-900 border border-amber-200 text-xs px-2.5 py-1 rounded-xl font-black">
                  {waitingPatients.length} nafar
                </span>
              </h3>

              {waitingPatients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-bold text-xs">Sizning bo'limingizda kutayotgan bemorlar yo'q.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {waitingPatients.map((patient) => {
                    return (
                      <div
                        key={patient.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-amber-300 hover:shadow-md transition-all flex justify-between items-center gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="h-6 w-6 rounded-lg bg-emerald-500/10 text-emerald-700 border border-emerald-500/10 font-black text-[11px] flex items-center justify-center">
                              {patient.queueNumber}
                            </span>
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {patient.lastName} {patient.firstName}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1.5 pl-8">
                            ID: <strong className="font-semibold text-slate-700">{patient.id}</strong> • Tel: {patient.phone}
                          </p>
                        </div>

                        <button
                          id={`accept-patient-btn-${patient.id}`}
                          onClick={() => handleCallPatient(patient)}
                          disabled={!!activePatient}
                          className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center space-x-1 shrink-0 ${
                            activePatient
                              ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-600/10'
                          }`}
                          title={activePatient ? "Avval joriy qabulni yakunlang!" : "Bemorga qabulni boshlash"}
                        >
                          <Play className="h-2.5 w-2.5 fill-current" />
                          <span>Qabul</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Middle and Right: Active Checkup form */}
          <div className="lg:col-span-2">
            {!activePatient ? (
              <div className="bg-white/95 backdrop-blur-md p-12 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.015)] text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <div className="bg-slate-100 text-slate-500 p-4 rounded-full border border-slate-200">
                  <User className="h-10 w-10 stroke-[1.5]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Hozirda qabulda bemor yo'q</h3>
                <p className="text-xs text-slate-500 font-bold max-w-sm leading-relaxed">
                  Qabulni boshlash uchun chap tomondagi ro'yxatdan navbatdagi bemorning "Qabul" tugmasini bosing. Monitor TVda ushbu bemor navbati chaqiriladi.
                </p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-teal-50/40 via-white to-emerald-50/20 p-6 rounded-3xl border border-teal-200/60 shadow-[0_20px_50px_rgba(20,184,166,0.04)] space-y-6 animate-fade-in relative overflow-hidden">
                {/* Form aesthetic top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-500"></div>
                
                {/* Active patient heading */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-teal-100 gap-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl uppercase tracking-wider border border-emerald-200">
                      Navbatdagi Bemor Qabulda
                    </span>
                    <h3 className="text-base font-black text-slate-950 mt-2.5">
                      #{activePatient.queueNumber} - {activePatient.lastName} {activePatient.firstName} {activePatient.middleName || ''}
                    </h3>
                    <p className="text-xs text-slate-500 font-bold">
                      ID: <strong className="text-slate-800 font-bold">{activePatient.id}</strong> • Jinsi: {activePatient.gender} • Tug'ilgan yili: {activePatient.birthDate || 'noma\'lum'}
                    </p>
                  </div>

                  <div className="flex space-x-2 shrink-0">
                    <button
                      onClick={handlePrintRecipe}
                      className="bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 flex items-center space-x-1.5 cursor-pointer transition-all shadow-sm hover:scale-102"
                    >
                      <Printer className="h-4 w-4 text-slate-500" />
                      <span>Retseptni chop etish</span>
                    </button>
                  </div>
                </div>

                {/* Patient examination form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Complaints */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                      1. SHIKOYATLAR VA ANAMNEZ
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Bemorning shikoyatlari va kasallik tarixi..."
                      value={complaints}
                      onChange={(e) => setComplaints(e.target.value)}
                      className="w-full px-3.5 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all placeholder-slate-400"
                    />
                  </div>

                  {/* Test results */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                      2. TEKSHIRUV VA LABORATORIYA NATIJALARI
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ko'rik natijalari, tahlillar yoki apparat ko'rsatkichlari..."
                      value={testResults}
                      onChange={(e) => setTestResults(e.target.value)}
                      className="w-full px-3.5 py-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                    3. YAKUNIY TASHXIS (DIAGNOSIS) *
                  </label>

                  {/* Kasallik shablonlari dropdown — faqat shu bo'lim uchun */}
                  {(() => {
                    const deptTemplates = diagnosisTemplates.filter((t) => t.departmentId === currentDoctorId);
                    if (deptTemplates.length === 0) return null;
                    return (
                      <div className="mb-2">
                        <label className="block text-[9px] font-bold text-emerald-700 mb-1 uppercase tracking-wide">
                          💊 Kasallikni tanlang — dorilar avtomatik to'ldiriladi ({activeDept?.name})
                        </label>
                        <select
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const template = deptTemplates.find((t) => t.id === e.target.value);
                            if (template) {
                              setDiagnosis(template.name);
                              if (template.medications.length > 0) {
                                setMedsList(template.medications.map(m => ({ ...m })));
                              }
                            }
                          }}
                          value=""
                          className="w-full px-3 py-2.5 text-xs border-2 border-emerald-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-emerald-50/30 text-slate-800 font-bold transition-all cursor-pointer"
                        >
                          <option value="">-- {activeDept?.name} bo'limi kasallik shabloni tanlang --</option>
                          {deptTemplates.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.medications.length} ta dori)
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  <input
                    type="text"
                    placeholder="Klinik yoki yakuniy tashxisni yozing..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-900 font-black transition-all placeholder-slate-400"
                  />
                </div>

                {/* Medications Recipe Grid */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-teal-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center space-x-1.5 tracking-wider">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span>4. TAYINLANGAN DORILAR (RETSEPT)</span>
                    </span>
                    <button
                      onClick={addMedRow}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-4 py-2 rounded-xl text-xs font-extrabold flex items-center space-x-1 cursor-pointer transition-all hover:scale-102"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Dori qo'shish</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                    {medsList.map((med, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                        {/* Name */}
                        <input
                          type="text"
                          placeholder="Dori nomi va dozasi (masalan: Amoksitsillin 500mg)"
                          value={med.name}
                          onChange={(e) => handleMedChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all placeholder-slate-400"
                        />
                        {/* Dosage */}
                        <input
                          type="text"
                          placeholder="Qabul qilish (masalan: 3 mahal ovqatdan so'ng)"
                          value={med.dosage}
                          onChange={(e) => handleMedChange(index, 'dosage', e.target.value)}
                          className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all placeholder-slate-400"
                        />
                        {/* Days / Row Actions */}
                        <div className="flex items-center space-x-2">
                          <input
                             type="text"
                             placeholder="Muddati (masalan: 7 kun)"
                             value={med.days}
                             onChange={(e) => handleMedChange(index, 'days', e.target.value)}
                             className="flex-1 px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 bg-[#f8fafc] text-slate-800 font-bold transition-all placeholder-slate-400"
                          />
                          <button
                            onClick={() => removeMedRow(index)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-all cursor-pointer"
                            title="Dori satrini o'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complete and save */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                  <button
                    id="finish-session-btn"
                    onClick={handleSaveCheckup}
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:scale-102 cursor-pointer flex items-center space-x-1.5"
                  >
                    <Check className="h-4.5 w-4.5 stroke-[3]" />
                    <span>Tekshiruvni Yakunlash & Saqlash</span>
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          SUB-TAB 2: INPATIENT (STATSIONAR) WARDS PORTAL
          ========================================== */}
      {activeSubTab === 'inpatient_wards' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in text-xs">
          
          {/* Left panel: Ward Patient list cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center space-x-1">
                    <Bed className="h-4 w-4 text-emerald-600" />
                    <span>Yotgan Bemorlar</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">Faol davolanayotgan statsionarlar</p>
                </div>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-1 rounded-xl font-black text-[10px]">
                  {hospitalizedPatients.length} ta palata
                </span>
              </div>

              {hospitalizedPatients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-bold">Hozirda shifoxonada yotib davolanayotgan bemorlar yo'q.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {hospitalizedPatients.map((stay) => {
                    const isSelected = selectedInpatientId === stay.id;
                    const logCount = stay.dailyTreatments?.length || 0;

                    return (
                      <button
                        key={stay.id}
                        onClick={() => selectInpatientPatient(stay)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col space-y-2 cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {stay.lastName} {stay.firstName}
                          </span>
                          <span className="bg-slate-100 border border-slate-200 text-slate-600 font-black px-2 py-0.5 rounded text-[8px] uppercase">
                            🚪 {stay.roomNumber}-Xona
                          </span>
                        </div>

                        <div className="text-[10px] text-slate-500 font-bold flex justify-between">
                          <span>Shifokor: <strong className="text-slate-700 font-bold">{stay.doctorName}</strong></span>
                          <span className="text-indigo-700 font-black">🗓 {stay.plannedDays} kun</span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-100/60 mt-1">
                          <span className="text-[9px] text-slate-400 font-medium">Sana: {stay.checkInDate} dan</span>
                          <span className="bg-emerald-100/60 text-emerald-800 text-[8px] font-black px-1.5 py-0.5 rounded-md">
                            {logCount} marta ko'rilgan
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Details, logs timeline, and new treatment entry */}
          <div className="lg:col-span-2 space-y-6">
            {!selectedInpatient ? (
              <div className="bg-white/95 p-12 rounded-3xl border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
                <div className="bg-slate-50 text-slate-400 p-5 rounded-full border border-slate-100">
                  <FileSpreadsheet className="h-10 w-10 stroke-[1.2]" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-sm">Bemor kartochkasi tanlanmagan</h3>
                <p className="text-xs text-slate-500 font-bold max-w-sm leading-relaxed">
                  Kunlik muolajalar, davolash retseptlarini kiritish va xprinterda chop etish uchun chap tomondagi statsionar bemorlardan birini tanlang.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                
                {/* 1. Patient Inpatient Header Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-150">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-emerald-100 text-emerald-800 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                          Bemor Haqida Ma'lumot
                        </span>
                        <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded">
                          ID: {selectedInpatient.patientId}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase mt-2">
                        {selectedInpatient.lastName} {selectedInpatient.firstName} {selectedInpatient.middleName || ''}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-semibold mt-1">
                        Jinsi: <strong className="text-slate-700">{selectedInpatient.gender}</strong> • Telefon: <strong className="text-slate-700">{selectedInpatient.phone}</strong>
                      </p>
                    </div>

                    {/* Print full chronology button */}
                    <button
                      onClick={() => printFullStayHistory(selectedInpatient)}
                      className="bg-slate-900 hover:bg-black text-white px-4 py-2 text-[10px] font-black rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shadow-sm"
                    >
                      <Printer className="h-4 w-4" />
                      <span>To'liq Davolanish Tarixini Chop Etish</span>
                    </button>
                  </div>

                  {/* Bed and stay duration properties */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-bold">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-black uppercase">Palata</span>
                      <span className="text-indigo-800 font-extrabold">🚪 Xona № {selectedInpatient.roomNumber}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-black uppercase">Shifokor</span>
                      <span className="text-slate-800 font-extrabold">{selectedInpatient.doctorName}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-black uppercase">Kelgan Sana</span>
                      <span className="text-slate-800 font-bold">🗓 {selectedInpatient.checkInDate}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[9px] text-slate-400 block font-black uppercase">Muddati</span>
                      <span className="text-emerald-700 font-extrabold">{selectedInpatient.plannedDays} kunlik shartnoma</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-500/10 space-y-1">
                    <span className="text-[9px] text-emerald-800 font-black block uppercase tracking-wider">Ushbu Statsionarga qo'yilgan umumiy diagnoz</span>
                    <p className="text-slate-900 font-extrabold text-xs">{selectedInpatient.diagnosis || 'Kiritilmagan'}</p>
                  </div>
                </div>

                {/* 2. Form to add a new daily treatment / medication log */}
                <div className="bg-gradient-to-br from-slate-50 to-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="pb-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-black text-slate-900 text-xs uppercase flex items-center space-x-1.5">
                      <PlusCircle className="h-4.5 w-4.5 text-emerald-600" />
                      <span>Kunlik Muolaja va Dorilarni Yozish</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-bold">Ko'rik varaqasi generatori</span>
                  </div>

                  <form onSubmit={handleSaveDailyTreatment} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Date selector */}
                      <div className="sm:col-span-1">
                        <label className="block text-[9px] font-black text-slate-500 mb-1 uppercase">
                          Ko'rik / Muolaja Sanasi *
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={inpDate}
                            onChange={(e) => setInpDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-800 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Procedures list input */}
                      <div className="sm:col-span-2">
                        <label className="block text-[9px] font-black text-slate-500 mb-1 uppercase">
                          Tayinlangan Muolajalar (ukollar, fizioterapiya, bog'lovlar, osma tahlillar va h.z.)
                        </label>
                        <input
                          type="text"
                          placeholder="masalan: Osma osildi, 2 mahal vitamin ukol qilinadi"
                          value={inpProcedures}
                          onChange={(e) => setInpProcedures(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Doctor notes */}
                    <div>
                      <label className="block text-[9px] font-black text-slate-500 mb-1 uppercase">
                        Shifokor Ko'rsatmalari / Kunlik Tavsiyalar
                      </label>
                      <textarea
                        rows={2}
                        placeholder="masalan: Qon bosimi o'lchab turilsin, ovqatdan so'ng dam olish tavsiya etildi..."
                        value={inpNotes}
                        onChange={(e) => setInpNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-800"
                      />
                    </div>

                    {/* Daily Medications List (Rx) */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          Bugungi Kungi Dorilar Ro'yxati (Retsept)
                        </span>
                        <button
                          type="button"
                          onClick={addInpMedRow}
                          className="text-emerald-700 hover:text-emerald-800 font-extrabold text-[10px] flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>Dori qo'shish</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {inpMeds.map((med, index) => (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                            <input
                              type="text"
                              placeholder="Dori nomi (Amoksitsillin)"
                              value={med.name}
                              onChange={(e) => handleInpMedChange(index, 'name', e.target.value)}
                              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none bg-white text-slate-800 placeholder-slate-400"
                            />
                            <input
                              type="text"
                              placeholder="Doza (masalan: 1 mahal)"
                              value={med.dosage}
                              onChange={(e) => handleInpMedChange(index, 'dosage', e.target.value)}
                              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none bg-white text-slate-800 placeholder-slate-400"
                            />
                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                placeholder="Kunlar (3 kun)"
                                value={med.days}
                                onChange={(e) => handleInpMedChange(index, 'days', e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none bg-white text-slate-800 placeholder-slate-400"
                              />
                              <button
                                type="button"
                                onClick={() => removeInpMedRow(index)}
                                className="text-slate-400 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-colors flex items-center space-x-1 shadow-md shadow-emerald-500/15 cursor-pointer"
                      >
                        <Save className="h-4 w-4" />
                        <span>Sana Bo'yicha Muolajani Saqlash</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* 3. Chronological Daily Treatment History Timeline */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-slate-900 text-xs uppercase flex items-center space-x-1.5">
                        <Clock className="h-4.5 w-4.5 text-slate-600" />
                        <span>Kunlar Bo'yicha Barcha Muolajalar & Retseptlar</span>
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">Sana bo'yicha ketma-ketlikda yozib borilgan tarixdagi varaqalar</p>
                    </div>
                  </div>

                  {!selectedInpatient.dailyTreatments || selectedInpatient.dailyTreatments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100">
                      <p className="text-slate-400 font-semibold">Ushbu bemorga hali kunlik davolash yozuvlari kiritilmagan.</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Yuqoridagi formadan kiritishingiz mumkin.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedInpatient.dailyTreatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-colors space-y-3 relative"
                        >
                          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                            <span className="font-extrabold text-slate-950 text-xs flex items-center space-x-1.5">
                              <Calendar className="h-4 w-4 text-slate-500" />
                              <span>{new Date(treatment.date).toLocaleDateString('uz-UZ')} ko'rik bayoni</span>
                            </span>

                            <div className="flex items-center space-x-2">
                              {/* Print single treatment record */}
                              <button
                                onClick={() => printDailyTreatment(selectedInpatient, treatment)}
                                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-black text-[9px] flex items-center space-x-1 transition-all cursor-pointer"
                              >
                                <Printer className="h-3 w-3" />
                                <span>XPrinterda Chop etish</span>
                              </button>

                              {/* Delete option */}
                              <button
                                onClick={() => handleDeleteDailyTreatment(treatment.id)}
                                className="text-rose-600 hover:bg-rose-50 p-1 rounded-lg"
                                title="Yozuvni o'chirish"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-700">
                            <div>
                              <span className="text-[9px] text-slate-400 block font-black uppercase">Amalga oshirilgan muolajalar</span>
                              <p className="text-slate-800 font-bold text-[11px] leading-relaxed">
                                {treatment.procedures || "Kiritilmagan"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-400 block font-black uppercase">Shifokor eslatmalari</span>
                              <p className="text-slate-800 font-semibold italic text-[11px] leading-relaxed">
                                {treatment.doctorNotes || "Eslatmalar kiritilmagan"}
                              </p>
                            </div>
                          </div>

                          {treatment.prescriptions && treatment.prescriptions.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/40">
                              <span className="text-[9px] text-slate-400 block font-black uppercase mb-1">Berilgan dorilar (Retsept)</span>
                              <div className="flex flex-wrap gap-2">
                                {treatment.prescriptions.map((m, idx) => (
                                  <span key={idx} className="bg-white border border-slate-200 text-slate-800 text-[10px] px-2.5 py-1 rounded-lg font-bold">
                                    💊 <strong className="font-black text-slate-900">{m.name}</strong> - {m.dosage} ({m.days})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
