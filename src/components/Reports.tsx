import React, { useState } from 'react';
import { Patient, DepartmentId, Department, InpatientStay, Medication, ClinicTransaction } from '../types';
import {
  BarChart3,
  Search,
  Trash2,
  Calendar,
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Coins,
  ArrowUpRight,
  Bed,
  Printer,
  X,
  FileText,
  Stethoscope,
  Plus,
  AlertTriangle,
  CreditCard,
  FileDown,
} from 'lucide-react';
import { exportClinicReportToExcel } from '../utils/excelExport';

interface ReportsProps {
  patients: Patient[];
  onClearHistory: () => void;
  departments: Department[];
  inpatientStays: InpatientStay[];
  transactions: ClinicTransaction[];
  onSaveTransactions: (updatedTx: ClinicTransaction[]) => void;
}

export const Reports: React.FC<ReportsProps> = ({
  patients,
  onClearHistory,
  departments,
  inpatientStays = [],
  transactions = [],
  onSaveTransactions,
}) => {
  const DEPARTMENTS = departments;

  // Tabs: Dashboard vs Ambulatory Archive vs Inpatient Archive
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'ambulatory' | 'inpatient'>('dashboard');

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportClinicReportToExcel({
        range: selectedRange,
        patients,
        departments,
        inpatientStays,
        transactions,
      });
    } catch (err) {
      console.error('Excel eksport xatosi:', err);
      alert('Excel faylni yuklab olishda xatolik yuz berdi.');
    } finally {
      setIsExporting(false);
    }
  };

  // ==========================================
  // 1. AMBULATORY ARCHIVE STATES
  // ==========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRange, setSelectedRange] = useState<'Bugun' | 'Haftalik' | 'Oylik' | 'Yillik'>('Bugun');
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);

  const getDeptName = (id: DepartmentId) => {
    return DEPARTMENTS.find((d) => d.id === id)?.name || id;
  };

  // Date filters
  const filterByDate = (patient: Patient) => {
    const patientDate = new Date(patient.createdAt);
    const now = new Date();

    if (selectedRange === 'Bugun') {
      return patientDate.toDateString() === now.toDateString();
    } else if (selectedRange === 'Haftalik') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return patientDate >= sevenDaysAgo;
    } else if (selectedRange === 'Oylik') {
      return (
        patientDate.getMonth() === now.getMonth() &&
        patientDate.getFullYear() === now.getFullYear()
      );
    } else {
      return patientDate.getFullYear() === now.getFullYear();
    }
  };

  const rangePatients = patients.filter(filterByDate);

  // Stats calculation
  const totalPatients = rangePatients.length;
  const completedPatients = rangePatients.filter((p) => p.status === 'Yakunlangan').length;
  const waitingPatients = rangePatients.filter((p) => p.status === 'Kutmoqda' || p.status === 'Qabulda').length;
  const totalIncome = rangePatients
    .filter((p) => p.paymentStatus === 'To\'langan')
    .reduce((sum, p) => sum + p.paymentAmount, 0);

  // Inpatient Stats
  const activeInpatientsCount = inpatientStays.filter((s) => s.status === 'Davolanmoqda').length;
  const completedInpatientsCount = inpatientStays.filter((s) => s.status === 'Yakunlangan').length;
  const totalInpatientIncome = inpatientStays.reduce((sum, s) => sum + s.amountPaid, 0);

  // Dept stats
  const initialDeptStats: Record<string, { count: number; income: number }> = {};
  DEPARTMENTS.forEach((dept) => {
    initialDeptStats[dept.id] = { count: 0, income: 0 };
  });

  const deptStats = rangePatients.reduce((acc, p) => {
    const deptId = p.departmentId;
    if (acc[deptId]) {
      acc[deptId].count += 1;
      if (p.paymentStatus === 'To\'langan') {
        acc[deptId].income += p.paymentAmount;
      }
    } else {
      acc[deptId] = { count: 1, income: p.paymentStatus === 'To\'langan' ? p.paymentAmount : 0 };
    }
    return acc;
  }, { ...initialDeptStats });

  const statsValues = Object.values(deptStats) as { count: number; income: number }[];
  const maxCount = Math.max(...statsValues.map((d) => d.count), 1);
  const maxIncome = Math.max(...statsValues.map((d) => d.income), 1);

  // Ambulatory search results
  const completedHistory = patients.filter((p) => {
    const fullName = `${p.lastName} ${p.firstName} ${p.middleName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.diagnosis && p.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch && p.status === 'Yakunlangan';
  });

  // Print ambulatory checkup card on XPrinter
  const printAmbulatoryHistory = (patient: Patient) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan ruxsat bering.');
      return;
    }

    const prescriptionsHtml =
      patient.prescriptions && patient.prescriptions.length > 0
        ? patient.prescriptions
            .map((m, idx) => `${idx + 1}. ${m.name} - ${m.dosage} (${m.days})`)
            .join('<br>')
        : 'Dori vositalari belgilanmagan';

    printWindow.document.write(`
      <html>
        <head>
          <title>Tashxis va Retsept - ${patient.lastName} ${patient.firstName}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              text-align: center;
              padding: 15px;
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
          <div class="subtitle">BEMOR KO'RIK BAYONNOMASI / RETSEPT</div>
          
          <div class="info">
            <strong>Bemor:</strong> ${patient.lastName.toUpperCase()} ${patient.firstName.toUpperCase()}<br>
            <strong>ID:</strong> ${patient.id}<br>
            <strong>Tel:</strong> ${patient.phone}<br>
            <strong>Sana:</strong> ${new Date(patient.completedAt || patient.createdAt).toLocaleDateString('uz-UZ')}
          </div>

          <div class="section-title">Shifokor va Bo'lim</div>
          <div class="info">
            <strong>Bo'lim:</strong> ${getDeptName(patient.departmentId)}<br>
            <strong>Shifokor:</strong> ${patient.doctorName}
          </div>

          <div class="section-title">Shikoyat va Anamnez</div>
          <div class="info">
            ${patient.complaints || 'Batafsil ma\'lumot kiritilmagan'}
          </div>

          <div class="section-title">Ko'rik va Tahlillar</div>
          <div class="info">
            ${patient.testResults || 'Natijalar kiritilmagan'}
          </div>

          <div class="section-title">Tashxis (Diagnosis)</div>
          <div class="info" style="font-weight: bold;">
            ${patient.diagnosis || 'Tashxis qo\'yilmagan'}
          </div>

          <div class="section-title">Tavsiya etilgan Retsept</div>
          <div class="info" style="font-size: 11px; line-height: 1.3;">
            ${prescriptionsHtml}
          </div>

          <div class="footer">
            Shifokorning ruxsatisiz dori miqdorini o'zgartirmang.<br>
            Sog'ayib ketishingizni tilaymiz!<br>
            DR.Maruf Clinic ERP
          </div>
          
          <button onclick="window.print(); window.close();">XPrinterda Chop Etish</button>
          
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
  // 2. INPATIENT (STATSIONAR) ARCHIVE STATES
  // ==========================================
  const [inpSearchQuery, setInpSearchQuery] = useState('');
  const [selectedStayDetails, setSelectedStayDetails] = useState<InpatientStay | null>(null);

  // Filter inpatient stays
  const filteredStaysHistory = inpatientStays.filter((stay) => {
    const fullName = `${stay.lastName} ${stay.firstName} ${stay.middleName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(inpSearchQuery.toLowerCase()) ||
      stay.phone.includes(inpSearchQuery) ||
      stay.patientId.toLowerCase().includes(inpSearchQuery.toLowerCase()) ||
      stay.roomNumber.toLowerCase().includes(inpSearchQuery.toLowerCase());

    return matchesSearch;
  });

  // Print inpatient case card on XPrinter
  const printInpatientHistory = (stay: InpatientStay) => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Tashqi oyna ochish bloklandi. Iltimos brauzer sozlamalaridan ruxsat bering.');
      return;
    }

    const prescriptionsHtml =
      stay.prescriptions && stay.prescriptions.length > 0
        ? stay.prescriptions.map((m) => `• ${m.name} (${m.dosage}, ${m.days})`).join('<br>')
        : 'Muolaja retseptlari yo\'q';

    printWindow.document.write(`
      <html>
        <head>
          <title>Shifoxona Tarixi - ${stay.lastName} ${stay.firstName}</title>
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
          <div class="subtitle">STATSIONAR DAVOLANISH KARTI</div>
          
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
            <strong>Shifokor:</strong> ${stay.doctorName}
          </div>

          <div class="section-title">Tashxis</div>
          <div class="info">
            ${stay.diagnosis || "Statsionar davolanish ko'rik bayoni"}
          </div>

          <div class="section-title">Muolajalar (Retseptlar)</div>
          <div class="info" style="font-size: 11px; line-height: 1.3;">
            ${prescriptionsHtml}
          </div>

          <div class="section-title">To'lovlar Tafsiloti</div>
          <div class="info">
            <strong>Kelgan sanasi:</strong> ${stay.checkInDate}<br>
            ${stay.checkOutDate ? `<strong>Javob berildi:</strong> ${stay.checkOutDate}<br>` : ''}
            <strong>Turish muddati:</strong> ${stay.plannedDays} kun<br>
            <strong>Kunlik narx:</strong> ${stay.pricePerDay.toLocaleString()} UZS<br>
            <strong>Umumiy hisob:</strong> ${stay.totalCost.toLocaleString()} UZS<br>
            <strong style="color: green;">To'langan:</strong> ${stay.amountPaid.toLocaleString()} UZS<br>
            <strong style="color: red;">Qolgan qarz:</strong> ${stay.remainingDebt.toLocaleString()} UZS<br>
            <strong>Holati:</strong> ${stay.status === 'Davolanmoqda' ? 'DAVOLANMOQDA' : 'ARXIVLANGAN (JAVOB BERILGAN)'}
          </div>

          <div class="footer">
            Sog'ligingiz o'z qo'lingizda!<br>
            DR.Maruf Clinic ERP
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

  // ==========================================
  // 3. DYNAMIC REPORT COMPUTATIONS (BUGUN, HAFTALIK, OYLIK, YILLIK)
  // ==========================================
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const getFilteredData = (range: 'Bugun' | 'Haftalik' | 'Oylik' | 'Yillik') => {
    // For weekly, 7 days ago
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    // For monthly, same month & year
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isWithinRange = (dateString: string) => {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return false;
      const dStr = dateString.split('T')[0];

      if (range === 'Bugun') {
        return dStr === todayStr;
      } else if (range === 'Haftalik') {
        return d >= oneWeekAgo && d <= now;
      } else if (range === 'Oylik') {
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } else if (range === 'Yillik') {
        return d.getFullYear() === currentYear;
      }
      return false;
    };

    // Filter patients
    const filteredPatients = patients.filter(p => isWithinRange(p.createdAt));

    // Filter stays
    const filteredStays = inpatientStays.filter(s => {
      const sDateStr = s.checkInDate;
      const sDate = new Date(`${sDateStr}T12:00:00`);
      if (range === 'Bugun') {
        return sDateStr === todayStr;
      } else if (range === 'Haftalik') {
        return sDate >= oneWeekAgo && sDate <= now;
      } else if (range === 'Oylik') {
        return sDate.getMonth() === currentMonth && sDate.getFullYear() === currentYear;
      } else if (range === 'Yillik') {
        return sDate.getFullYear() === currentYear;
      }
      return false;
    });

    // Filter transactions
    const filteredTx = transactions.filter(tx => {
      const txDateStr = tx.date;
      const txDate = new Date(`${txDateStr}T12:00:00`);
      if (range === 'Bugun') {
        return txDateStr === todayStr;
      } else if (range === 'Haftalik') {
        return txDate >= oneWeekAgo && txDate <= now;
      } else if (range === 'Oylik') {
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      } else if (range === 'Yillik') {
        return txDate.getFullYear() === currentYear;
      }
      return false;
    });

    return {
      patients: filteredPatients,
      stays: filteredStays,
      tx: filteredTx,
    };
  };

  const dashboardData = getFilteredData(selectedRange);

  // 1. Total visitors
  const dTotalPatients = dashboardData.patients.length;

  // 2. New vs Returning patients
  let dNewPatientsCount = 0;
  let dReturningPatientsCount = 0;

  dashboardData.patients.forEach(p => {
    const isReturning = patients.some(allP => {
      if (allP.id === p.id) return false;
      const samePhone = allP.phone === p.phone;
      const sameName = allP.firstName.trim().toLowerCase() === p.firstName.trim().toLowerCase() &&
                       allP.lastName.trim().toLowerCase() === p.lastName.trim().toLowerCase();
      return (samePhone || sameName) && new Date(allP.createdAt).getTime() < new Date(p.createdAt).getTime();
    });
    if (isReturning) {
      dReturningPatientsCount++;
    } else {
      dNewPatientsCount++;
    }
  });

  // 3. Revenues & Expenses & Profits
  const dAmbulatoryIncome = dashboardData.tx
    .filter(tx => tx.type === 'Kirim' && tx.category === "Ambulator ko'rik")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dInpatientIncome = dashboardData.tx
    .filter(tx => tx.type === 'Kirim' && (tx.category === "Statsionar to'lov" || tx.category === "Statsionar"))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dTotalIncome = dashboardData.tx
    .filter(tx => tx.type === 'Kirim')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dTotalExpenses = dashboardData.tx
    .filter(tx => tx.type === 'Chiqim')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const dNetProfit = dTotalIncome - dTotalExpenses;

  // 4. Department visits analysis
  const dDeptStats: Record<string, { count: number; income: number }> = {};
  DEPARTMENTS.forEach(dept => {
    dDeptStats[dept.id] = { count: 0, income: 0 };
  });

  dashboardData.patients.forEach(p => {
    const deptId = p.departmentId;
    if (dDeptStats[deptId]) {
      dDeptStats[deptId].count += 1;
      if (p.paymentStatus === 'To\'langan') {
        dDeptStats[deptId].income += p.paymentAmount;
      }
    } else {
      dDeptStats[deptId] = {
        count: 1,
        income: p.paymentStatus === 'To\'langan' ? p.paymentAmount : 0,
      };
    }
  });

  const dMaxCount = Math.max(...Object.values(dDeptStats).map(d => d.count), 1);

  // New Expense form states
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseCategory, setExpenseCategory] = useState<string>('Klinika xarajati');
  const [expenseDesc, setExpenseDesc] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(todayStr);
  const [expenseTime, setExpenseTime] = useState<string>('');
  const [expenseError, setExpenseError] = useState<string>('');
  const [expenseSuccess, setExpenseSuccess] = useState<boolean>(false);

  const handleAddExpenseDirectly = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError('');
    setExpenseSuccess(false);

    if (expenseAmount <= 0) {
      setExpenseError('Xarajat summasi 0 dan katta bo\'lishi kerak!');
      return;
    }
    if (!expenseDesc.trim()) {
      setExpenseError('Xarajat tavsifini kiriting!');
      return;
    }

    const txTime = expenseTime || new Date().toTimeString().split(' ')[0].substring(0, 5);
    const newTx: ClinicTransaction = {
      id: 'TX-' + Math.floor(Math.random() * 90000 + 10000),
      type: 'Chiqim',
      amount: expenseAmount,
      category: expenseCategory,
      description: expenseDesc.trim(),
      date: expenseDate,
      time: txTime,
      createdAt: new Date(`${expenseDate}T${txTime}:00`).toISOString()
    };

    onSaveTransactions([newTx, ...transactions]);

    setExpenseAmount(0);
    setExpenseDesc('');
    setExpenseSuccess(true);
    setTimeout(() => setExpenseSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper sub-tab switcher */}
      <div className="flex bg-[#e2e8f0]/40 p-1 rounded-2xl max-w-xl border border-slate-200/55 shadow-inner">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          📊 Umumiy Tahliliy Hisobot
        </button>
        <button
          onClick={() => setActiveSubTab('ambulatory')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'ambulatory'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          📈 Ambulator Arxiv
        </button>
        <button
          onClick={() => setActiveSubTab('inpatient')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            activeSubTab === 'inpatient'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          🏥 Statsionar Arxiv
        </button>
      </div>

      {/* ==========================================
          SUB-TAB O: CLINIC ANALYTICS DASHBOARD
          ========================================== */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fade-in text-xs">
          
          {/* Header Controls */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Klinika Faoliyati va Moliya Tahlili</h2>
              <p className="text-slate-500 text-[11px] font-bold mt-0.5">Avtomatik sof foyda, xarajatlar va bemorlar hisob-kitoblari</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50">
                {(['Bugun', 'Haftalik', 'Oylik', 'Yillik'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      selectedRange === range
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                title="Tanlangan davr uchun Excel hisobotini yuklab olish"
              >
                {isExporting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Yuklanmoqda...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Excel yuklab olish ({selectedRange})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* KPI Dashboard Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            
            {/* Visitors summary */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-5 rounded-3xl border border-blue-100 shadow-sm flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-blue-800 tracking-widest uppercase">JAMI BEMORLAR</span>
                <Users className="h-4.5 w-4.5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-blue-950">{dTotalPatients} nafar</h3>
                <div className="flex justify-between text-[10px] text-blue-600 font-bold mt-1 pt-1 border-t border-blue-200/30">
                  <span>Yangi: {dNewPatientsCount}</span>
                  <span>Qayta: {dReturningPatientsCount}</span>
                </div>
              </div>
            </div>

            {/* Ambulatory payments summary */}
            <div className="bg-gradient-to-br from-teal-50 to-teal-100/30 p-5 rounded-3xl border border-teal-100 shadow-sm flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-teal-800 tracking-widest uppercase">AMBULATOR KO'RIK</span>
                <Stethoscope className="h-4.5 w-4.5 text-teal-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-teal-950">{dAmbulatoryIncome.toLocaleString()} UZS</h3>
                <p className="text-[9px] text-teal-600 font-bold mt-1">Navbat va ko'rik to'lovlari</p>
              </div>
            </div>

            {/* Inpatient stays summary */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/30 p-5 rounded-3xl border border-purple-100 shadow-sm flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-purple-800 tracking-widest uppercase">STATSIONAR TO'LOV</span>
                <Bed className="h-4.5 w-4.5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-purple-950">{dInpatientIncome.toLocaleString()} UZS</h3>
                <p className="text-[9px] text-purple-600 font-bold mt-1">Palata va yotish tushumlari</p>
              </div>
            </div>

            {/* Total Income summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 p-5 rounded-3xl border border-indigo-100 shadow-sm flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-indigo-800 tracking-widest uppercase">JAMI TUSHUM (KIRIM)</span>
                <Coins className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-indigo-950">{dTotalIncome.toLocaleString()} UZS</h3>
                <p className="text-[9px] text-indigo-600 font-bold mt-1">Jami kirim qilingan kassa</p>
              </div>
            </div>

            {/* Total Expenses summary */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100/30 p-5 rounded-3xl border border-rose-100 shadow-sm flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black text-rose-800 tracking-widest uppercase">JAMI XARAJAT (CHIQIM)</span>
                <TrendingDown className="h-4.5 w-4.5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-950">{dTotalExpenses.toLocaleString()} UZS</h3>
                <p className="text-[9px] text-rose-600 font-bold mt-1">Klinika chiqim xarajatlari</p>
              </div>
            </div>

            {/* NET PROFIT / SOF FOYDA */}
            <div className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between h-32 transition-colors duration-300 ${
              dNetProfit >= 0 
                ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-150' 
                : 'bg-gradient-to-br from-red-50 to-red-100/30 border-red-150'
            }`}>
              <div className="flex justify-between items-start">
                <span className={`text-[9px] font-black tracking-widest uppercase ${
                  dNetProfit >= 0 ? 'text-emerald-800' : 'text-red-800'
                }`}>SOF FOYDA (NET PROFIT)</span>
                <TrendingUp className={`h-4.5 w-4.5 ${
                  dNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600 animate-bounce'
                }`} />
              </div>
              <div>
                <h3 className={`text-lg font-black ${
                  dNetProfit >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}>{dNetProfit.toLocaleString()} UZS</h3>
                <p className={`text-[9px] font-bold ${
                  dNetProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}>Tushum - Chiqim (Avtomatik)</p>
              </div>
            </div>

          </div>

          {/* Interactive Middle Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Hand: Expense Logger & Expenses list */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Form to log expense */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500"></div>
                <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 mb-4 flex items-center justify-between">
                  <span>🔴 Chiqim (Xarajat) Kiritish</span>
                  <Coins className="h-4 w-4 text-rose-500" />
                </h3>

                <form onSubmit={handleAddExpenseDirectly} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Xarajat summasi (UZS)</label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={expenseAmount || ''}
                      onChange={(e) => setExpenseAmount(Number(e.target.value))}
                      placeholder="Summani kiriting..."
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Kategoriya</label>
                      <select
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-rose-500 transition-colors"
                      >
                        <option value="Klinika xarajati">Klinika xarajati</option>
                        <option value="Kommunal to'lov">Kommunal to'lov</option>
                        <option value="Dori-darmon xaridi">Dori-darmon</option>
                        <option value="Maosh">Shifokor maoshi</option>
                        <option value="Oziq-ovqat">Oziq-ovqat</option>
                        <option value="Boshqa">Boshqa xarajat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Sana</label>
                      <input
                        type="date"
                        required
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-rose-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">Xarajat sababi (Tavsif)</label>
                    <input
                      type="text"
                      required
                      value={expenseDesc}
                      onChange={(e) => setExpenseDesc(e.target.value)}
                      placeholder="Masalan: Kommunal chiroq to'lovi..."
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-rose-500 transition-colors"
                    />
                  </div>

                  {expenseError && (
                    <p className="text-xxs font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-100">
                      ⚠️ {expenseError}
                    </p>
                  )}

                  {expenseSuccess && (
                    <p className="text-xxs font-bold text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
                      🎉 Xarajat muvaffaqiyatli saqlandi!
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow transition-transform hover:scale-101 cursor-pointer flex items-center justify-center space-x-1"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Xarajatni saqlash</span>
                  </button>
                </form>
              </div>

              {/* History list of expenses */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs max-h-[300px] overflow-y-auto">
                <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 mb-3 uppercase tracking-tight">
                  📋 Chiqimlar / Xarajatlar ro'yxati ({selectedRange})
                </h3>
                {dashboardData.tx.filter(t => t.type === 'Chiqim').length === 0 ? (
                  <p className="text-slate-400 font-bold py-6 text-center italic">Ushbu davrda xarajatlar kiritilmagan.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.tx.filter(t => t.type === 'Chiqim').map((tx) => (
                      <div key={tx.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex justify-between items-center font-bold">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-black uppercase text-[8px]">{tx.category}</span>
                            <span className="text-slate-400 font-mono text-[9px]">{tx.date} {tx.time}</span>
                          </div>
                          <p className="text-slate-800 text-xs font-extrabold mt-1">{tx.description}</p>
                        </div>
                        <span className="text-rose-600 font-black text-xs shrink-0">-{tx.amount.toLocaleString()} UZS</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Right Hand: Department Visits Table & New/Returning Patient Ratio */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Department visit analytics */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100 mb-4 uppercase tracking-tight flex justify-between items-center">
                  <span>🏢 Bo'limlar Bo'yicha Bemorlar va Kirimlar ({selectedRange})</span>
                  <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-bold text-slate-600">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest">
                        <th className="py-2.5 pb-2">Bo'lim Nomi</th>
                        <th className="py-2.5 pb-2">Bemorlar</th>
                        <th className="py-2.5 pb-2 text-right">Tushum (UZS)</th>
                        <th className="py-2.5 pb-2">Hajm nisbati</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {DEPARTMENTS.map((dept) => {
                        const stats = dDeptStats[dept.id] || { count: 0, income: 0 };
                        const percentage = Math.round((stats.count / dMaxCount) * 100);

                        return (
                          <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 font-extrabold text-slate-900">
                              {dept.name}
                              <span className="block text-[10px] text-slate-400 font-bold font-sans mt-0.5">{dept.doctorName}</span>
                            </td>
                            <td className="py-2.5 text-slate-800">{stats.count} nafar</td>
                            <td className="py-2.5 text-right font-black text-emerald-700">{stats.income.toLocaleString()}</td>
                            <td className="py-2.5">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div
                                  style={{ width: `${percentage}%` }}
                                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Patient types (New vs Returning details) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">👤 Yangi vs Qayta Kelgan Bemorlar</h3>
                  <p className="text-slate-500 text-[11px] font-bold leading-relaxed">
                    Agar bemorning telefon raqami yoki ismi-familiyasi tizimda ilgari ro'yxatga olingan bo'lsa, u avtomatik ravishda <strong>Qayta kelgan (Returning)</strong> deb qayd etiladi. Aks holda u <strong>Yangi kelgan (New)</strong> hisoblanadi.
                  </p>
                  <div className="flex gap-4 pt-1 text-xs">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 block"></span> Yangi: {dNewPatientsCount}</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 block"></span> Qayta: {dReturningPatientsCount}</span>
                  </div>
                </div>

                {/* Progress Circle Visual */}
                <div className="shrink-0 relative w-24 h-24 flex items-center justify-center bg-slate-50 rounded-full border border-slate-100 shadow-inner">
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-400 font-black">YANGI RATIO</span>
                    <strong className="text-lg text-emerald-600 font-black">
                      {dTotalPatients > 0 ? Math.round((dNewPatientsCount / dTotalPatients) * 100) : 0}%
                    </strong>
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom Wide Card: Inpatient (Statsionar) stays billing and debts audit */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-black text-slate-950 pb-3 border-b border-slate-100 mb-4 uppercase tracking-tight flex justify-between items-center">
              <span>🛌 Palatada Davolangan / Davolanayotgan Bemorlar To'lov Audit Hisoboti ({selectedRange})</span>
              <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded-xl font-black">
                Aktiv yotganlar: {inpatientStays.filter(s => s.status === 'Davolanmoqda').length} ta
              </span>
            </h3>

            {dashboardData.stays.length === 0 ? (
              <p className="text-slate-400 font-bold py-12 text-center italic">Ushbu davrda statsionar bemorlar hisoboti mavjud emas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-bold text-slate-600">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] text-slate-400 uppercase tracking-widest">
                      <th className="py-2.5 pb-2">Bemor F.I.SH</th>
                      <th className="py-2.5 pb-2">Palata / Shifokor</th>
                      <th className="py-2.5 pb-2">Yotish Sanasi</th>
                      <th className="py-2.5 pb-2 text-right">Kunlik / Muddati</th>
                      <th className="py-2.5 pb-2 text-right">Umumiy hisob (UZS)</th>
                      <th className="py-2.5 pb-2 text-right text-emerald-700">To'langan (UZS)</th>
                      <th className="py-2.5 pb-2 text-right text-rose-600">Qolgan Qarz (UZS)</th>
                      <th className="py-2.5 pb-2 text-center">Holati</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {dashboardData.stays.map((stay) => (
                      <tr key={stay.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-extrabold text-slate-900">
                          {stay.lastName} {stay.firstName}
                          <span className="block text-[10px] text-slate-400 font-bold font-mono mt-0.5">ID: {stay.patientId} • {stay.phone}</span>
                        </td>
                        <td className="py-3">
                          <span className="text-indigo-700 font-extrabold">🚪 {stay.roomNumber}</span>
                          <span className="block text-[10px] text-slate-500 font-medium mt-0.5">{stay.doctorName}</span>
                        </td>
                        <td className="py-3 font-mono text-[11px] text-slate-600">{stay.checkInDate}</td>
                        <td className="py-3 text-right">
                          <span className="text-slate-900">{stay.plannedDays} kun</span>
                          <span className="block text-[9px] text-slate-400 font-mono mt-0.5">Kuniga: {stay.pricePerDay.toLocaleString()}</span>
                        </td>
                        <td className="py-3 text-right font-black text-slate-950">{stay.totalCost.toLocaleString()}</td>
                        <td className="py-3 text-right font-black text-emerald-700">{stay.amountPaid.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <span className={`font-black text-sm px-2 py-1 rounded-lg ${
                            stay.remainingDebt > 0 ? 'text-rose-600 bg-rose-50 border border-rose-100/50 animate-pulse' : 'text-emerald-700 bg-emerald-50'
                          }`}>
                            {stay.remainingDebt.toLocaleString()} UZS
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                            stay.status === 'Davolanmoqda' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {stay.status === 'Davolanmoqda' ? 'Aktiv' : 'Chiqdi'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* =====================================================
              OYLIK TAHLIL — sana OY bilan ajratilgan professional hisob
              Har bir oy: bemorlar soni, ambulator tushum, xizmatlar daromadi, jami
              + Har bir bo'lim oylik kesimida alohida ko'rsatilgan
              ===================================================== */}
          <div className="bg-white p-6 rounded-3xl border border-teal-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1 pb-3 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600" />
              <span>📅 Oylik Tahlil — Sana Oy Bilan Ajratilgan ({selectedRange})</span>
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-4">
              Har bir oy bo'yicha: bemorlar soni, ambulator ko'rik daromadi, qo'shimcha xizmatlar tushumi va umumiy daromad
            </p>

            {(() => {
              // Oy bo'yicha guruhlash
              const monthMap = new Map<string, { patients: number; ambIncome: number; svcIncome: number; byDept: Record<string, number> }>();
              const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

              dashboardData.patients.forEach((p) => {
                const d = new Date(p.createdAt);
                if (isNaN(d.getTime())) return;
                const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthMap.has(mk)) monthMap.set(mk, { patients: 0, ambIncome: 0, svcIncome: 0, byDept: {} });
                const m = monthMap.get(mk)!;
                m.patients += 1;
                const svcSum = (p.selectedServices || []).reduce((s: number, svc: any) => s + (svc.price || 0), 0);
                if (p.paymentStatus === 'To\'langan') {
                  m.ambIncome += Math.max(0, (p.paymentAmount || 0) - svcSum);
                  m.svcIncome += svcSum;
                }
                m.byDept[p.departmentId] = (m.byDept[p.departmentId] || 0) + 1;
              });

              const sortedMonths = Array.from(monthMap.keys()).sort();
              const grandPatients = Array.from(monthMap.values()).reduce((s, m) => s + m.patients, 0);
              const grandAmb = Array.from(monthMap.values()).reduce((s, m) => s + m.ambIncome, 0);
              const grandSvc = Array.from(monthMap.values()).reduce((s, m) => s + m.svcIncome, 0);

              if (sortedMonths.length === 0) {
                return <p className="text-slate-400 font-bold py-8 text-center italic">Ushbu davrda ma'lumot topilmadi.</p>;
              }

              return (
                <div className="space-y-3">
                  {/* Oylik jadval */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b-2 border-slate-200 text-[10px] text-slate-500 uppercase tracking-widest">
                          <th className="py-2.5 pb-2">Oy</th>
                          <th className="py-2.5 pb-2 text-center">Bemorlar</th>
                          <th className="py-2.5 pb-2 text-right">Ambulator ko'rik</th>
                          <th className="py-2.5 pb-2 text-right">Qo'shimcha xizmatlar</th>
                          <th className="py-2.5 pb-2 text-right">Jami tushum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedMonths.map((mk, idx) => {
                          const m = monthMap.get(mk)!;
                          const [y, mo] = mk.split('-').map(Number);
                          const total = m.ambIncome + m.svcIncome;
                          return (
                            <tr key={mk} className={`hover:bg-teal-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                              <td className="py-3 font-black text-teal-800 text-xs">
                                {monthNamesUz[mo - 1]} {y}
                              </td>
                              <td className="py-3 text-center">
                                <span className="inline-flex items-center justify-center bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black border border-blue-100">
                                  {m.patients} nafar
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-emerald-700 text-xs">{m.ambIncome.toLocaleString()} UZS</td>
                              <td className="py-3 text-right font-bold text-purple-700 text-xs">{m.svcIncome.toLocaleString()} UZS</td>
                              <td className="py-3 text-right">
                                <span className="font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100 text-xs">
                                  {total.toLocaleString()} UZS
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
                          <td className="py-3 px-2 font-black text-xs uppercase">🏆 Jami</td>
                          <td className="py-3 text-center font-black text-xs">{grandPatients} nafar</td>
                          <td className="py-3 text-right font-black text-xs">{grandAmb.toLocaleString()} UZS</td>
                          <td className="py-3 text-right font-black text-xs">{grandSvc.toLocaleString()} UZS</td>
                          <td className="py-3 text-right font-black text-xs">{(grandAmb + grandSvc).toLocaleString()} UZS</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Oy + Bo'lim kesimida batafsil */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-3">📋 Bo'limlar bo'yicha oylik taqsimot</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {sortedMonths.map((mk) => {
                        const m = monthMap.get(mk)!;
                        const [y, mo] = mk.split('-').map(Number);
                        return (
                          <div key={mk} className="border border-slate-200 rounded-xl p-3 bg-slate-50/40">
                            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                              <span className="text-xs font-black text-teal-800">{monthNamesUz[mo - 1]} {y}</span>
                              <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-black">{m.patients} bemor</span>
                            </div>
                            <div className="space-y-1">
                              {DEPARTMENTS.filter(d => m.byDept[d.id]).map((dept) => (
                                <div key={dept.id} className="flex items-center justify-between text-[10px]">
                                  <span className="text-slate-600 font-bold truncate">{dept.name}</span>
                                  <span className="text-blue-700 font-black ml-2 shrink-0">{m.byDept[dept.id]} ta</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      )}

      {/* ==========================================
          SUB-TAB A: AMBULATORY REPORTS & CHARTS
          ========================================== */}
      {activeSubTab === 'ambulatory' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Controls & Summary */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] neon-glow-emerald flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

            <div className="z-10">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Klinika Tahlili va Hisobotlari</h2>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                Klinika ambulator xizmat ko'rsatishi va moliyaviy o'sish ko'rsatkichlari
              </p>
            </div>

            {/* Range switcher */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 z-10">
              {(['Bugun', 'Haftalik', 'Oylik', 'Yillik'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    selectedRange === range
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/15'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 p-6 rounded-3xl border border-blue-100 shadow-md shadow-blue-500/5 flex items-center space-x-4">
              <div className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg shadow-blue-600/10">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-800 tracking-widest uppercase">JAMI MUROJAATLAR</p>
                <h3 className="text-base sm:text-lg font-black text-blue-950 mt-1">{totalPatients} nafar</h3>
                <p className="text-[10px] text-blue-500 font-bold mt-0.5">{selectedRange}gi bemorlar</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-6 rounded-3xl border border-indigo-100 shadow-md shadow-indigo-500/5 flex items-center space-x-4">
              <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-600/10">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-800 tracking-widest uppercase">KO'RIKdan O'TGANLAR</p>
                <h3 className="text-base sm:text-lg font-black text-indigo-950 mt-1">{completedPatients} nafar</h3>
                <p className="text-[10px] text-indigo-600 font-bold mt-0.5">
                  {totalPatients > 0 ? Math.round((completedPatients / totalPatients) * 100) : 0}% yakunlandi
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 p-6 rounded-3xl border border-amber-100 shadow-md shadow-amber-500/5 flex items-center space-x-4">
              <div className="bg-amber-600 text-white p-3.5 rounded-2xl shadow-lg shadow-amber-600/10 animate-pulse">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-800 tracking-widest uppercase">KUTAYOTGANLAR</p>
                <h3 className="text-base sm:text-lg font-black text-amber-950 mt-1">{waitingPatients} nafar</h3>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">Navbat kutmoqda</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-6 rounded-3xl border border-emerald-100 shadow-md shadow-emerald-500/5 flex items-center space-x-4">
              <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/10">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase">UMUMIY DAROMAD</p>
                <h3 className="text-base sm:text-lg font-black text-emerald-950 mt-1">
                  {totalIncome.toLocaleString()} UZS
                </h3>
                <p className="text-[10px] font-bold text-emerald-700 mt-0.5">Naqd & plastik tushumlar</p>
              </div>
            </div>
          </div>

          {/* Visual charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/95 p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-5 pb-3 border-b border-slate-100 flex justify-between items-center">
                <span>Bo'limlar bo'yicha Bemorlar soni ({selectedRange})</span>
                <BarChart3 className="h-4.5 w-4.5 text-emerald-500" />
              </h3>

              <div className="space-y-4">
                {DEPARTMENTS.map((dept) => {
                  const count = deptStats[dept.id]?.count || 0;
                  const percentage = Math.round((count / maxCount) * 100);

                  return (
                    <div key={dept.id} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">{dept.name}</span>
                        <span className="text-slate-950 font-black">{count} nafar</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/95 p-6 rounded-3xl border border-slate-200/60 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 mb-5 pb-3 border-b border-slate-100 flex justify-between items-center">
                <span>Bo'limlar bo'yicha Moliyaviy Daromad ({selectedRange})</span>
                <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              </h3>

              <div className="space-y-4">
                {DEPARTMENTS.map((dept) => {
                  const income = deptStats[dept.id]?.income || 0;
                  const percentage = Math.round((income / maxIncome) * 100);

                  return (
                    <div key={dept.id} className="space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">{dept.name}</span>
                        <span className="text-emerald-700 font-black">{income.toLocaleString()} UZS</span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${percentage}%` }}
                          className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Qo'shimcha xizmatlar bo'yicha tahlil - har bir bo'lim alohida, professional ko'rinish */}
          <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1 pb-3 border-b border-slate-100">
              💊 Qo'shimcha Xizmatlar Tahlili — Bo'limlar Bo'yicha ({selectedRange})
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-4">
              Har bir bo'lim va uning xizmatlari: birlik narxi, mijozlar soni, daromad va bo'lim kesimidagi jami (subtotal)
            </p>

            <div className="space-y-4">
              {DEPARTMENTS.map((dept) => {
                const deptPatients = rangePatients.filter((p) => p.departmentId === dept.id);
                const deptServices = dept.services || [];
                const baseIncome = deptPatients.filter((p) => p.paymentStatus === 'To\'langan').reduce((s, p) => s + p.paymentAmount, 0);
                const servicesIncome = deptPatients.reduce((s, p) => s + (p.selectedServices || []).reduce((ss, svc) => ss + (svc.price || 0), 0), 0);
                const baseOnly = baseIncome - servicesIncome;

                // Bo'lim subtotal'ini hisoblash
                let deptSubtotalCount = deptPatients.length;
                let deptSubtotalIncome = baseOnly;
                deptServices.forEach((svc) => {
                  const c = deptPatients.filter((p) => p.selectedServices && p.selectedServices.some((s) => s.id === svc.id || s.name === svc.name)).length;
                  deptSubtotalCount += c;
                  deptSubtotalIncome += c * svc.price;
                });

                return (
                  <div key={dept.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Bo'lim sarlavhasi */}
                    <div className="bg-purple-50 px-4 py-2.5 border-b border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-black text-purple-800">{dept.name}</span>
                          <span className="text-[10px] text-slate-500 font-bold ml-2">{dept.doctorName}</span>
                        </div>
                        <span className="text-[10px] font-black text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200">
                          {deptPatients.length} bemor • {baseIncome.toLocaleString()} UZS
                        </span>
                      </div>
                    </div>

                    {/* Xizmatlar ro'yxati */}
                    <div className="p-3">
                      {/* Table header */}
                      <div className="hidden sm:grid grid-cols-12 gap-2 py-1.5 border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                        <div className="col-span-5">Xizmat</div>
                        <div className="col-span-2 text-center">Birlik narxi</div>
                        <div className="col-span-2 text-center">Mijozlar</div>
                        <div className="col-span-3 text-right">Daromad</div>
                      </div>

                      {/* Bazaviy ko'rik */}
                      <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-100 text-xs items-center">
                        <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-black uppercase">Ko'rik</span>
                          <span className="font-bold text-slate-700">Bazaviy narxi</span>
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-center text-slate-600 font-bold">{(dept.price || 0).toLocaleString()} UZS</div>
                        <div className="col-span-4 sm:col-span-2 text-center font-bold text-blue-600">{deptPatients.length} mijoz</div>
                        <div className="col-span-4 sm:col-span-3 text-right font-black text-emerald-600">{baseOnly.toLocaleString()} UZS</div>
                      </div>

                      {/* Har bir xizmat — narxi, soni, daromadi aniq */}
                      {deptServices.length > 0 ? (
                        deptServices.map((svc) => {
                          const svcPatients = deptPatients.filter((p) => p.selectedServices && p.selectedServices.some((s) => s.id === svc.id || s.name === svc.name));
                          const svcCount = svcPatients.length;
                          const svcIncome = svcCount * svc.price;

                          return (
                            <div key={svc.id} className="grid grid-cols-12 gap-2 py-1.5 border-b border-slate-50 text-xs items-center">
                              <div className="col-span-12 sm:col-span-5 flex items-center gap-2 min-w-0">
                                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0">💊 Xizmat</span>
                                <span className="font-bold text-slate-700 truncate">{svc.name}</span>
                              </div>
                              <div className="col-span-4 sm:col-span-2 text-center text-slate-600 font-bold">{svc.price.toLocaleString()} UZS</div>
                              <div className="col-span-4 sm:col-span-2 text-center">
                                <span className={`font-bold ${svcCount > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{svcCount} mijoz</span>
                              </div>
                              <div className="col-span-4 sm:col-span-3 text-right">
                                <span className={`font-black ${svcIncome > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{svcIncome.toLocaleString()} UZS</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-slate-400 italic py-2 text-center">Qo'shimcha xizmatlar kiritilmagan</p>
                      )}

                      {/* Bo'lim subtotal qatori */}
                      <div className="grid grid-cols-12 gap-2 py-2 mt-1 bg-emerald-50/60 rounded-lg text-xs items-center border border-emerald-100">
                        <div className="col-span-12 sm:col-span-5 flex items-center gap-2">
                          <span className="text-[9px] font-black text-emerald-700 uppercase">↳ Subtotal</span>
                          <span className="font-bold text-emerald-800">{dept.name}</span>
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-center text-[10px] text-slate-500 font-bold">—</div>
                        <div className="col-span-4 sm:col-span-2 text-center font-black text-emerald-700">{deptSubtotalCount} ta</div>
                        <div className="col-span-4 sm:col-span-3 text-right font-black text-emerald-700">{deptSubtotalIncome.toLocaleString()} UZS</div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Grand total banner */}
              {(() => {
                let grandCount = 0;
                let grandIncome = 0;
                DEPARTMENTS.forEach((dept) => {
                  const deptPatients = rangePatients.filter((p) => p.departmentId === dept.id);
                  const baseIncome = deptPatients.filter((p) => p.paymentStatus === 'To\'langan').reduce((s, p) => s + p.paymentAmount, 0);
                  const servicesIncome = deptPatients.reduce((s, p) => s + (p.selectedServices || []).reduce((ss, svc) => ss + (svc.price || 0), 0), 0);
                  const baseOnly = baseIncome - servicesIncome;
                  grandCount += deptPatients.length;
                  grandIncome += baseOnly; // faqat bazaviy narx (servicesIncome keyin qo'shiladi)
                  (dept.services || []).forEach((svc) => {
                    const c = deptPatients.filter((p) => p.selectedServices && p.selectedServices.some((s) => s.id === svc.id || s.name === svc.name)).length;
                    grandCount += c;
                    grandIncome += c * svc.price;
                  });
                });
                return (
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-2xl flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🏆</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider opacity-90">Jami (barcha bo'limlar va xizmatlar)</p>
                        <p className="text-sm font-black">{grandCount} ta xizmat ko'rsatilgan</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold opacity-90 uppercase">Umumiy daromad</p>
                      <p className="text-xl font-black">{grandIncome.toLocaleString()} UZS</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Ambulatory search */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Bemorlar Arxiv Tarixi (Ko'rikdan O'tganlar)</h3>
                <p className="text-xs text-slate-500 font-bold">
                  Shifokorlar ko'rigidan o'tib tashxis qo'yilgan barcha bemorlar ro'yxati
                </p>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="F.I.SH, ID yoki tashxis bo'yicha..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none w-full sm:w-56"
                  />
                </div>

                <span className="px-3 py-2.5 text-[10px] bg-slate-50 text-slate-500 border border-slate-150 rounded-xl font-black uppercase tracking-wider flex items-center space-x-1">
                  <span>🔒 ARXIV HIMOYALANGAN</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto bg-slate-50/40">
                {completedHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-xs font-bold">Ko'rikdan o'tgan bemorlar topilmadi.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white">
                    {completedHistory.map((patient) => (
                      <button
                        key={patient.id}
                        onClick={() => setSelectedPatientDetails(patient)}
                        className={`w-full text-left p-3.5 text-xxs transition-all hover:bg-slate-50 cursor-pointer flex flex-col space-y-1 bg-white border-b border-slate-150 ${
                          selectedPatientDetails?.id === patient.id ? 'bg-emerald-50/70 border-l-4 border-l-emerald-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-xs">{patient.lastName} {patient.firstName}</span>
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[9px] font-black">#{patient.queueNumber}</span>
                        </div>
                        <div className="text-[10px] font-bold text-emerald-700">{getDeptName(patient.departmentId)}</div>
                        {patient.diagnosis && (
                          <div className="text-slate-500 truncate italic font-bold">Tashxis: {patient.diagnosis}</div>
                        )}
                        <div className="text-slate-400 font-bold text-[9px] flex justify-between">
                          <span>ID: {patient.id}</span>
                          <span>{new Date(patient.completedAt || patient.createdAt).toLocaleDateString('uz-UZ')}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Detailed Ambulatory Folder with Print option */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                {!selectedPatientDetails ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16 space-y-2">
                    <FileSpreadsheet className="h-10 w-10 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Ko'rik bayonnomasi va retseptlarni ko'rish</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Bemor ismini tanlang</p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fade-in text-xs text-slate-600">
                    <div className="flex justify-between items-start pb-4 border-b border-slate-150">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase">
                          {selectedPatientDetails.lastName} {selectedPatientDetails.firstName} {selectedPatientDetails.middleName || ''}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">
                          ID: <strong className="text-slate-700">{selectedPatientDetails.id}</strong> • Tel: {selectedPatientDetails.phone}
                        </p>
                      </div>

                      {/* Print button on top */}
                      <button
                        onClick={() => printAmbulatoryHistory(selectedPatientDetails)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xxs font-black transition-all cursor-pointer shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>XPrinter Ko'rik Retseptini Chop Etish</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Murojaat bo'limi</span>
                        <span className="font-extrabold text-slate-800">{getDeptName(selectedPatientDetails.departmentId)} ({selectedPatientDetails.doctorName})</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">Ko'rik vaqti</span>
                        <span className="font-bold text-slate-800">{new Date(selectedPatientDetails.createdAt).toLocaleString('uz-UZ')}</span>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Shikoyat va anamnez</h5>
                      <p className="text-slate-700 italic font-bold leading-relaxed">{selectedPatientDetails.complaints || 'Belgilanmagan'}</p>
                    </div>

                    <div>
                      <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Tahlillar va tahlil ko'rsatkichlari</h5>
                      <p className="text-slate-700 font-semibold leading-relaxed">{selectedPatientDetails.testResults || 'Natijalar yo\'q'}</p>
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-500/10">
                      <h5 className="text-emerald-800 uppercase text-[10px] font-black tracking-wider mb-1">Qo'yilgan tashxis (Diagnosis)</h5>
                      <p className="text-slate-900 font-black text-sm">{selectedPatientDetails.diagnosis || 'Sog\'lom'}</p>
                    </div>

                    {selectedPatientDetails.prescriptions && selectedPatientDetails.prescriptions.length > 0 && (
                      <div>
                        <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Tavsiya etilgan dori-darmonlar (Retsept)</h5>
                        <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 font-bold">
                          {selectedPatientDetails.prescriptions.map((med, idx) => (
                            <li key={idx}>
                              <strong className="text-slate-900 font-black">{med.name}</strong> — {med.dosage} ({med.days})
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==========================================
          SUB-TAB B: INPATIENT (STATSIONAR) ARCHIVE
          ========================================== */}
      {activeSubTab === 'inpatient' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Statsionar KPI metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/40 p-6 rounded-3xl border border-purple-100 shadow-md flex items-center space-x-4">
              <div className="bg-purple-600 text-white p-3.5 rounded-2xl shadow-lg shadow-purple-600/10">
                <Bed className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-purple-800 tracking-widest uppercase">AKTIV DAVOLANUVCHILAR</p>
                <h3 className="text-base sm:text-lg font-black text-purple-950 mt-1">{activeInpatientsCount} nafar</h3>
                <p className="text-[10px] text-purple-500 font-bold mt-0.5">Palatada yotgan bemorlar</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-6 rounded-3xl border border-indigo-100 shadow-md flex items-center space-x-4">
              <div className="bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-600/10">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-800 tracking-widest uppercase">JAVOB BERILGANLAR (ARXIV)</p>
                <h3 className="text-base sm:text-lg font-black text-indigo-950 mt-1">{completedInpatientsCount} nafar</h3>
                <p className="text-[10px] text-indigo-500 font-bold mt-0.5">Tugallangan muolajalar</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-6 rounded-3xl border border-emerald-100 shadow-md flex items-center space-x-4">
              <div className="bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg shadow-emerald-600/10">
                <Coins className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-800 tracking-widest uppercase">UMUMIY STATSIONAR TUSHUM</p>
                <h3 className="text-base sm:text-lg font-black text-emerald-950 mt-1">{totalInpatientIncome.toLocaleString()} UZS</h3>
                <p className="text-[10px] text-emerald-700 font-bold mt-0.5">Yotib davolanishlardan to'lovlar</p>
              </div>
            </div>
          </div>

          {/* Search inpatient archive layout */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900">Statsionar Bemorlar Arxiv Tahlili</h3>
                <p className="text-xs text-slate-500 font-bold">
                  Yotib davolanishga olingan, davolanayotgan yoki javob berilgan bemorlar tarixi va to'lov tahlili
                </p>
              </div>

              {/* Search input bar */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Ism, familiya, palata yoki ID qidirish..."
                  value={inpSearchQuery}
                  onChange={(e) => setInpSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none w-full sm:w-64 text-slate-800"
                />
              </div>
            </div>

            {/* Inpatient table & details panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left hand list of inpatients stays */}
              <div className="lg:col-span-1 border border-slate-200 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto bg-slate-50/40">
                {filteredStaysHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-xs font-bold">Hech qanday statsionar bemor topilmadi.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 bg-white">
                    {filteredStaysHistory.map((stay) => (
                      <button
                        key={stay.id}
                        onClick={() => setSelectedStayDetails(stay)}
                        className={`w-full text-left p-3.5 text-xxs transition-all hover:bg-slate-50 cursor-pointer flex flex-col space-y-1 bg-white border-b border-slate-150 ${
                          selectedStayDetails?.id === stay.id ? 'bg-indigo-50/50 border-l-4 border-l-indigo-500' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {stay.lastName} {stay.firstName}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${
                            stay.status === 'Davolanmoqda' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {stay.status === 'Davolanmoqda' ? 'YOTIBDI' : 'CHIQDI'}
                          </span>
                        </div>
                        <div className="text-[10px] font-black text-indigo-700 flex justify-between">
                          <span>🚪 {stay.roomNumber}</span>
                          <span>Kunlar: {stay.plannedDays} kun</span>
                        </div>
                        {stay.diagnosis && (
                          <div className="text-slate-500 truncate italic font-bold">Tashxis: {stay.diagnosis}</div>
                        )}
                        <div className="text-slate-400 font-bold text-[9px] flex justify-between">
                          <span>ID: {stay.patientId}</span>
                          <span>Kelgan: {stay.checkInDate}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right hand details and printer card */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                {!selectedStayDetails ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16 space-y-2">
                    <Bed className="h-10 w-10 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Yotib davolanish tarixi va to'lovlarini ko'rish</p>
                    <p className="text-[11px] text-slate-500 font-semibold">Bemor familiyasi va ismini arxivdan tanlang</p>
                  </div>
                ) : (
                  <div className="space-y-5 animate-fade-in text-xs text-slate-600">
                    <div className="flex justify-between items-start pb-4 border-b border-slate-150">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase">
                          {selectedStayDetails.lastName} {selectedStayDetails.firstName} {selectedStayDetails.middleName || ''}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">
                          ID: <strong className="text-slate-700">{selectedStayDetails.patientId}</strong> • Jinsi: {selectedStayDetails.gender} • Telefon: {selectedStayDetails.phone}
                        </p>
                      </div>

                      <button
                        onClick={() => printInpatientHistory(selectedStayDetails)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xxs font-black transition-all cursor-pointer shadow-xs"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>XPrinter Statsionar Kvitansiyasini Chop Etish</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Palata & Joylashuv</span>
                        <span className="font-extrabold text-indigo-700 text-sm">🚪 {selectedStayDetails.roomNumber}</span>
                        <span className="block text-[9px] font-bold text-slate-500 mt-1">Sana: {selectedStayDetails.checkInDate} dan</span>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Muddati</span>
                        <span className="font-extrabold text-slate-800 text-sm">{selectedStayDetails.plannedDays} kun</span>
                        <span className="block text-[9px] font-bold text-slate-500 mt-1">Kunlik: {selectedStayDetails.pricePerDay.toLocaleString()} UZS</span>
                      </div>

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Muddati o'tish holati</span>
                        <span className={`font-extrabold text-sm uppercase ${
                          selectedStayDetails.status === 'Davolanmoqda' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>{selectedStayDetails.status}</span>
                        {selectedStayDetails.checkOutDate && (
                          <span className="block text-[9px] font-bold text-slate-500 mt-1">Chiqdi: {selectedStayDetails.checkOutDate}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Davolovchi Shifokor</h5>
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
                          <Stethoscope className="h-3.5 w-3.5 text-indigo-600" />
                          {selectedStayDetails.doctorName} ({selectedStayDetails.departmentName})
                        </span>
                      </div>

                      <div>
                        <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Diagnoz / Tashxis</h5>
                        <p className="text-slate-700 italic font-bold leading-relaxed">{selectedStayDetails.diagnosis || 'Kiritilmagan'}</p>
                      </div>
                    </div>

                    {/* Financial details billing calculation */}
                    <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/60 space-y-2">
                      <h5 className="text-slate-800 uppercase text-[10px] font-black tracking-wider border-b border-slate-200/80 pb-2 flex items-center justify-between">
                        <span>Moliyaviy To'lovlar Tahlili (Auto-audit)</span>
                        <Coins className="h-4 w-4 text-emerald-600" />
                      </h5>
                      <div className="grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-600 pt-1">
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Umumiy xarajat</span>
                          <span className="text-slate-900 font-extrabold text-sm">{selectedStayDetails.totalCost.toLocaleString()} UZS</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Kiritilgan to'lov</span>
                          <span className="text-emerald-700 font-black text-sm">{selectedStayDetails.amountPaid.toLocaleString()} UZS</span>
                        </div>
                        <div>
                          <span className="block text-[9px] font-black text-slate-400 uppercase mb-0.5">Qolgan qarz</span>
                          <span className={`font-black text-sm ${
                            selectedStayDetails.remainingDebt > 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'
                          }`}>{selectedStayDetails.remainingDebt.toLocaleString()} UZS</span>
                        </div>
                      </div>
                    </div>

                    {/* Prescriptions medicines list */}
                    <div>
                      <h5 className="font-black text-slate-400 border-b border-slate-100 pb-2 mb-2 uppercase text-[10px] tracking-wider">Statsionar davolanish retseptlari</h5>
                      {!selectedStayDetails.prescriptions || selectedStayDetails.prescriptions.length === 0 ? (
                        <p className="text-slate-400 text-xs italic font-semibold">Dori vositalari belgilanmagan.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {selectedStayDetails.prescriptions.map((med, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center font-bold text-xs">
                              <div>
                                <span className="text-slate-900 block font-black">{med.name}</span>
                                <span className="text-[10px] text-slate-500">{med.dosage}</span>
                              </div>
                              <span className="text-[9px] bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded uppercase">
                                {med.days}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
};
