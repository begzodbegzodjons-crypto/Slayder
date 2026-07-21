// Excel Export Utility - DR.Maruf Clinic ERP
import ExcelJS from 'exceljs';
import { Patient, Department, InpatientStay, ClinicTransaction } from '../types';

const COLORS = {
  primary: { argb: 'FF0F766E' },
  primaryDark: { argb: 'FF134E4A' },
  primaryLight: { argb: 'FFCCFBF1' },
  primaryLighter: { argb: 'FFF0FDFA' },
  amber: { argb: 'FFF59E0B' },
  amberLight: { argb: 'FFFEF3C7' },
  rose: { argb: 'FFE11D48' },
  roseLight: { argb: 'FFFECDD3' },
  blue: { argb: 'FF2563EB' },
  blueLight: { argb: 'FFDBEAFE' },
  purple: { argb: 'FF7C3AED' },
  purpleLight: { argb: 'FFEDE9FE' },
  white: { argb: 'FFFFFFFF' },
  slate900: { argb: 'FF0F172A' },
  slate700: { argb: 'FF334155' },
  slate500: { argb: 'FF64748B' },
  slate300: { argb: 'FFCBD5E1' },
  slate200: { argb: 'FFE2E8F0' },
  slate100: { argb: 'FFF1F5F9' },
  slate50: { argb: 'FFF8FAFC' },
  income: { argb: 'FF059669' },
  expense: { argb: 'FFDC2626' },
};

const FONT = { family: 'Calibri' };

const formatMoney = (n: number): string => (n || 0).toLocaleString('ru-RU').replace(/\u00A0/g, ' ');
const formatDate = (iso: string): string => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('ru-RU'); } catch { return iso; }
};
const formatDateTime = (iso: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
};
const getDeptName = (deptId: string, departments: Department[]): string => departments.find((d) => d.id === deptId)?.name || deptId;

type DateRange = 'Bugun' | 'Haftalik' | 'Oylik' | 'Yillik' | 'Barchasi';

const filterByDateRange = <T extends Record<string, any>>(items: T[], range: DateRange): T[] => {
  if (range === 'Barchasi') return items;
  const now = new Date();
  return items.filter((item) => {
    const dateStr = item.createdAt || item.date || item.checkInDate;
    if (!dateStr) return false;
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return false;
    if (range === 'Bugun') return itemDate.toDateString() === now.toDateString();
    if (range === 'Haftalik') { const w = new Date(); w.setDate(now.getDate() - 7); return itemDate >= w; }
    if (range === 'Oylik') return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
    if (range === 'Yillik') return itemDate.getFullYear() === now.getFullYear();
    return true;
  });
};

export interface ExportOptions {
  range: DateRange;
  patients: Patient[];
  departments: Department[];
  inpatientStays: InpatientStay[];
  transactions: ClinicTransaction[];
}

export async function exportClinicReportToExcel(opts: ExportOptions): Promise<void> {
  const { range, patients, departments, inpatientStays, transactions } = opts;
  const rangePatients = filterByDateRange(patients, range);
  const rangeStays = filterByDateRange(inpatientStays, range);
  const rangeTx = filterByDateRange(transactions, range);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'DR.Maruf Clinic ERP';
  wb.created = new Date();

  // Sheet 1: Dashboard
  const ws = wb.addWorksheet('📊 Dashboard', { properties: { tabColor: { argb: COLORS.primary.argb } }, views: [{ showGridLines: false }] });
  ws.columns = [{ width: 4 }, { width: 32 }, { width: 22 }, { width: 4 }, { width: 32 }, { width: 22 }, { width: 4 }];

  ws.mergeCells('B2:F2');
  const titleCell = ws.getCell('B2');
  titleCell.value = 'DR.MARUF CLINIC — HISOBOT';
  titleCell.font = { name: FONT.family, size: 22, bold: true, color: { argb: COLORS.white.argb } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ws.getRow(2).height = 42;

  const totalIncome = rangeTx.filter((t) => t.type === 'Kirim').reduce((s, t) => s + t.amount, 0);
  const totalExpense = rangeTx.filter((t) => t.type === 'Chiqim').reduce((s, t) => s + t.amount, 0);
  const netProfit = totalIncome - totalExpense;

  ws.mergeCells('B5:C7');
  const kpi1 = ws.getCell('B5');
  kpi1.value = '💰 UMUMIY TUSHUM';
  kpi1.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
  kpi1.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi1.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.income };

  ws.mergeCells('E5:F7');
  const kpi2 = ws.getCell('E5');
  kpi2.value = '💸 UMUMIY XARAJAT';
  kpi2.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
  kpi2.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi2.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.expense };

  ws.mergeCells('B8:C10');
  const kpi1Val = ws.getCell('B8');
  kpi1Val.value = totalIncome;
  kpi1Val.font = { name: FONT.family, size: 18, bold: true, color: { argb: COLORS.income.argb } };
  kpi1Val.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi1Val.numFmt = '#,##0" UZS"';
  kpi1Val.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.slate50 };

  ws.mergeCells('E8:F10');
  const kpi2Val = ws.getCell('E8');
  kpi2Val.value = totalExpense;
  kpi2Val.font = { name: FONT.family, size: 18, bold: true, color: { argb: COLORS.expense.argb } };
  kpi2Val.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi2Val.numFmt = '#,##0" UZS"';
  kpi2Val.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.slate50 };

  ws.mergeCells('B11:F11');
  const kpi3Label = ws.getCell('B11');
  kpi3Label.value = '📈 SOF FOYDA (Tushum - Xarajat)';
  kpi3Label.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
  kpi3Label.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi3Label.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primary };

  ws.mergeCells('B12:F14');
  const kpi3Val = ws.getCell('B12');
  kpi3Val.value = netProfit;
  kpi3Val.font = { name: FONT.family, size: 22, bold: true, color: { argb: netProfit >= 0 ? COLORS.income.argb : COLORS.expense.argb } };
  kpi3Val.alignment = { horizontal: 'center', vertical: 'middle' };
  kpi3Val.numFmt = '#,##0" UZS";[Red]-#,##0" UZS"';
  kpi3Val.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.slate50 };

  // Stats section
  const statsStartRow = 16;
  ws.mergeCells(`B${statsStartRow}:F${statsStartRow}`);
  const statsHeader = ws.getCell(`B${statsStartRow}`);
  statsHeader.value = '📋 KLINIKA STATISTIKASI';
  statsHeader.font = { name: FONT.family, size: 13, bold: true, color: { argb: COLORS.white.argb } };
  statsHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ws.getRow(statsStartRow).height = 32;

  const activeInpatients = rangeStays.filter((s) => s.status === 'Davolanmoqda').length;
  const stats: Array<[string, string, any, any]> = [
    ['👥 Ambulator bemorlar (jami)', `${rangePatients.length} nafar`, COLORS.blue, COLORS.blueLight],
    ['✅ Yakunlangan ko\'riklar', `${rangePatients.filter((p) => p.status === 'Yakunlangan').length} nafar`, COLORS.income, COLORS.primaryLight],
    ['⏳ Kutayotgan bemorlar', `${rangePatients.filter((p) => p.status === 'Kutmoqda').length} nafar`, COLORS.amber, COLORS.amberLight],
    ['🏥 Statsionarda davolanayotgan', `${activeInpatients} nafar`, COLORS.purple, COLORS.purpleLight],
    ['💵 To\'langan summa (ambulator)', `${formatMoney(rangePatients.filter((p) => p.paymentStatus === 'To\'langan').reduce((s, p) => s + p.paymentAmount, 0))} UZS`, COLORS.income, COLORS.primaryLight],
    ['🏥 Statsionar tushum', `${formatMoney(rangeStays.reduce((s, st) => s + st.amountPaid, 0))} UZS`, COLORS.purple, COLORS.purpleLight],
    ['📝 Tranzaksiyalar soni', `${rangeTx.length} ta`, COLORS.slate700, COLORS.slate100],
  ];

  stats.forEach((row, idx) => {
    const r = statsStartRow + 1 + idx;
    ws.mergeCells(`B${r}:D${r}`);
    const labelCell = ws.getCell(`B${r}`);
    labelCell.value = row[0];
    labelCell.font = { name: FONT.family, size: 11, bold: true, color: { argb: (row[2] as any).argb } };
    labelCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: row[3] as any };
    ws.mergeCells(`E${r}:F${r}`);
    const valCell = ws.getCell(`E${r}`);
    valCell.value = row[1];
    valCell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.slate900.argb } };
    valCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.white };
    ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const cell = ws.getCell(`${col}${r}`);
      cell.border = { top: { style: 'thin', color: COLORS.slate200 }, bottom: { style: 'thin', color: COLORS.slate200 }, left: { style: 'thin', color: COLORS.slate200 }, right: { style: 'thin', color: COLORS.slate200 } };
    });
    ws.getRow(r).height = 24;
  });

  // Sheet 2: Ambulatory Patients
  const ws2 = wb.addWorksheet('👥 Ambulator Bemorlar', { properties: { tabColor: { argb: COLORS.blue.argb } }, views: [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 0 }] });
  const ambColumns = [
    { header: '№', key: 'num', width: 5 }, { header: 'ID', key: 'id', width: 10 }, { header: 'Navbat', key: 'queue', width: 8 },
    { header: 'Familiyasi', key: 'lastName', width: 18 }, { header: 'Ismi', key: 'firstName', width: 16 },
    { header: 'Telefon', key: 'phone', width: 15 }, { header: 'Bo\'lim', key: 'dept', width: 22 }, { header: 'Shifokor', key: 'doctor', width: 22 },
    { header: 'Ko\'rik narxi', key: 'amount', width: 14 }, { header: 'To\'lov holati', key: 'payment', width: 13 },
    { header: 'Holati', key: 'status', width: 14 }, { header: 'Qabul vaqti', key: 'createdAt', width: 17 }, { header: 'Tashxis', key: 'diagnosis', width: 30 },
  ];
  ws2.columns = ambColumns;

  ws2.mergeCells('A1:M1');
  const t2 = ws2.getCell('A1');
  t2.value = '👥 AMBULATOR BEMORLAR RO\'YXATI';
  t2.font = { name: FONT.family, size: 16, bold: true, color: { argb: COLORS.white.argb } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.blue };
  ws2.getRow(1).height = 36;

  ws2.mergeCells('A2:M2');
  const s2 = ws2.getCell('A2');
  s2.value = `Jami: ${rangePatients.length} nafar bemor • Sana: ${new Date().toLocaleString('ru-RU')}`;
  s2.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  s2.alignment = { horizontal: 'center', vertical: 'middle' };
  s2.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.blueLight };
  ws2.getRow(2).height = 22;
  ws2.getRow(3).height = 8;

  const hr2 = ws2.getRow(4);
  ambColumns.forEach((col, idx) => {
    const cell = hr2.getCell(idx + 1);
    cell.value = col.header; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws2.getRow(4).height = 38;

  rangePatients.forEach((p, idx) => {
    const r = idx + 5;
    const row = ws2.getRow(r);
    const isPaid = p.paymentStatus === 'To\'langan';
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [idx + 1, p.id, `#${p.queueNumber}`, p.lastName, p.firstName, p.phone, getDeptName(p.departmentId, departments), p.doctorName, p.paymentAmount, p.paymentStatus, p.status, formatDateTime(p.createdAt), p.diagnosis || '-'];
    vals.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: [0, 2, 9, 10].includes(ci) ? 'center' : 'left', wrapText: ci === 12, indent: [0, 2, 9, 10].includes(ci) ? 0 : 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if (ci === 8) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } }; }
      if (ci === 9) { cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: isPaid ? COLORS.income.argb : COLORS.amber.argb } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: isPaid ? COLORS.primaryLight : COLORS.amberLight }; }
    });
    ws2.getRow(r).height = 30;
  });

  // Sheet 3: Inpatient
  const ws3 = wb.addWorksheet('🏥 Statsionar Bemorlar', { properties: { tabColor: { argb: COLORS.purple.argb } }, views: [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 0 }] });
  const inpColumns = [
    { header: '№', key: 'num', width: 5 }, { header: 'ID', key: 'patientId', width: 10 }, { header: 'Familiyasi', key: 'lastName', width: 18 },
    { header: 'Ismi', key: 'firstName', width: 16 }, { header: 'Palata', key: 'room', width: 10 }, { header: 'Bo\'lim', key: 'dept', width: 20 },
    { header: 'Shifokor', key: 'doctor', width: 20 }, { header: 'Kelgan sana', key: 'checkIn', width: 13 }, { header: 'Chiqqan', key: 'checkOut', width: 13 },
    { header: 'Kunlar', key: 'days', width: 8 }, { header: 'Umumiy summa', key: 'total', width: 15 }, { header: 'To\'langan', key: 'paid', width: 14 },
    { header: 'Qarz', key: 'debt', width: 14 }, { header: 'Holati', key: 'status', width: 14 }, { header: 'Tashxis', key: 'diagnosis', width: 32 },
  ];
  ws3.columns = inpColumns;

  ws3.mergeCells('A1:O1');
  const t3 = ws3.getCell('A1');
  t3.value = '🏥 STATSIONAR BEMORLAR (Yotib davolanish)';
  t3.font = { name: FONT.family, size: 16, bold: true, color: { argb: COLORS.white.argb } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purple };
  ws3.getRow(1).height = 36;

  ws3.mergeCells('A2:O2');
  const s3 = ws3.getCell('A2');
  s3.value = `Jami: ${rangeStays.length} nafar • Sana: ${new Date().toLocaleString('ru-RU')}`;
  s3.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  s3.alignment = { horizontal: 'center', vertical: 'middle' };
  s3.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purpleLight };
  ws3.getRow(2).height = 22;
  ws3.getRow(3).height = 8;

  const hr3 = ws3.getRow(4);
  inpColumns.forEach((col, idx) => {
    const cell = hr3.getCell(idx + 1);
    cell.value = col.header; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws3.getRow(4).height = 38;

  rangeStays.forEach((s, idx) => {
    const r = idx + 5;
    const row = ws3.getRow(r);
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [idx + 1, s.patientId, s.lastName, s.firstName, s.roomNumber, s.departmentName, s.doctorName, formatDate(s.checkInDate), s.checkOutDate ? formatDate(s.checkOutDate) : '-', s.plannedDays, s.totalCost, s.amountPaid, s.remainingDebt, s.status, s.diagnosis || '-'];
    vals.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: [0, 4, 9, 13].includes(ci) ? 'center' : 'left', wrapText: ci === 14, indent: [0, 4, 9, 13].includes(ci) ? 0 : 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if ([10, 11, 12].includes(ci)) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: ci === 12 && s.remainingDebt > 0 ? COLORS.rose.argb : COLORS.slate900.argb } }; }
    });
    ws3.getRow(r).height = 28;
  });

  // Sheet 4: Transactions
  const ws4 = wb.addWorksheet('💰 Kassa & Tranzaksiyalar', { properties: { tabColor: { argb: COLORS.income.argb } }, views: [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 0 }] });
  const txColumns = [
    { header: '№', key: 'num', width: 5 }, { header: 'Sana', key: 'date', width: 13 }, { header: 'Vaqt', key: 'time', width: 9 },
    { header: 'Turi', key: 'type', width: 10 }, { header: 'Kategoriya', key: 'category', width: 22 }, { header: 'Tafsilot', key: 'desc', width: 50 },
    { header: 'Summa', key: 'amount', width: 16 }, { header: 'Bemor', key: 'patientName', width: 22 },
  ];
  ws4.columns = txColumns;

  ws4.mergeCells('A1:H1');
  const t4 = ws4.getCell('A1');
  t4.value = '💰 KASSA VA TRANZAKSIYALAR HISOBI';
  t4.font = { name: FONT.family, size: 16, bold: true, color: { argb: COLORS.white.argb } };
  t4.alignment = { horizontal: 'center', vertical: 'middle' };
  t4.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.income };
  ws4.getRow(1).height = 36;

  ws4.mergeCells('A2:H2');
  const s4 = ws4.getCell('A2');
  s4.value = `Jami: ${rangeTx.length} ta • Tushum: ${formatMoney(totalIncome)} UZS • Xarajat: ${formatMoney(totalExpense)} UZS • Sof: ${formatMoney(totalIncome - totalExpense)} UZS`;
  s4.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  s4.alignment = { horizontal: 'center', vertical: 'middle' };
  s4.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryLighter };
  ws4.getRow(2).height = 22;
  ws4.getRow(3).height = 8;

  const hr4 = ws4.getRow(4);
  txColumns.forEach((col, idx) => {
    const cell = hr4.getCell(idx + 1);
    cell.value = col.header; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws4.getRow(4).height = 36;

  const sortedTx = [...rangeTx].sort((a, b) => {
    const da = new Date(a.createdAt || `${a.date}T${a.time}`).getTime();
    const db = new Date(b.createdAt || `${b.date}T${b.time}`).getTime();
    return db - da;
  });

  sortedTx.forEach((t, idx) => {
    const r = idx + 5;
    const row = ws4.getRow(r);
    const isIncome = t.type === 'Kirim';
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [idx + 1, formatDate(t.date), t.time, t.type, t.category, t.description, t.amount, t.patientName || '-'];
    vals.forEach((val, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: [0, 1, 2, 3].includes(ci) ? 'center' : 'left', wrapText: ci === 5, indent: [0, 1, 2, 3].includes(ci) ? 0 : 1 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if (ci === 6) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: isIncome ? COLORS.income.argb : COLORS.expense.argb } }; }
      if (ci === 3) { cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: isIncome ? COLORS.income.argb : COLORS.expense.argb } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: isIncome ? COLORS.primaryLight : COLORS.roseLight }; }
    });
    ws4.getRow(r).height = 26;
  });

  // Sheet 5: Department Analysis
  const ws5 = wb.addWorksheet('🏢 Bo\'limlar Tahlili', { properties: { tabColor: { argb: COLORS.amber.argb } }, views: [{ showGridLines: false }] });
  ws5.columns = [{ width: 4 }, { width: 28 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 4 }];
  ws5.mergeCells('B2:G2');
  const t5 = ws5.getCell('B2');
  t5.value = '🏢 BO\'LIMLAR BO\'YICHA TAHLIL';
  t5.font = { name: FONT.family, size: 18, bold: true, color: { argb: COLORS.white.argb } };
  t5.alignment = { horizontal: 'center', vertical: 'middle' };
  t5.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ws5.getRow(2).height = 38;
  ws5.getRow(3).height = 12;

  const headers5 = ['Bo\'lim nomi', 'Shifokor', 'Bemorlar', 'Yakunlangan', 'Ambulator tushum', 'Statsionar tushum'];
  headers5.forEach((h, idx) => {
    const cell = ws5.getCell(String.fromCharCode(66 + idx) + '4');
    cell.value = h; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primary };
    cell.border = { top: { style: 'medium', color: COLORS.primary }, bottom: { style: 'medium', color: COLORS.primary }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws5.getRow(4).height = 36;

  departments.forEach((dept, idx) => {
    const r = 5 + idx;
    const deptPatients = rangePatients.filter((p) => p.departmentId === dept.id);
    const deptCompleted = deptPatients.filter((p) => p.status === 'Yakunlangan');
    const deptAmbIncome = deptPatients.filter((p) => p.paymentStatus === 'To\'langan').reduce((s, p) => s + p.paymentAmount, 0);
    const deptInpIncome = rangeStays.filter((s) => s.departmentName === dept.name).reduce((s, st) => s + st.amountPaid, 0);
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [dept.name, dept.doctorName, deptPatients.length, deptCompleted.length, deptAmbIncome, deptInpIncome];
    vals.forEach((val, ci) => {
      const cell = ws5.getCell(String.fromCharCode(66 + ci) + r);
      cell.value = val; cell.font = { name: FONT.family, size: 11, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: ci < 2 ? 'left' : 'center', indent: ci < 2 ? 1 : 0 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if (ci === 2) cell.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.blue.argb } };
      if (ci === 4 || ci === 5) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: val > 0 ? COLORS.income.argb : COLORS.slate500.argb } }; }
    });
    ws5.getRow(r).height = 28;
  });

  // Sheet 6: Department Services Breakdown (qo'shimcha xizmatlar bo'yicha alohida)
  // PROFESSIONAL: har bir bo'lim alohida, har bir xizmat narxi/soni/daromadi aniq
  const ws6 = wb.addWorksheet('💊 Xizmatlar Tahlili', { properties: { tabColor: { argb: COLORS.purple.argb } }, views: [{ showGridLines: false }] });
  ws6.columns = [
    { width: 4 }, { width: 26 }, { width: 32 }, { width: 16 }, { width: 12 }, { width: 18 }, { width: 4 },
  ];

  ws6.mergeCells('B2:F2');
  const t6 = ws6.getCell('B2');
  t6.value = `💊 BO\'LIMLAR BO\'YICHA QO\'SHIMCHA XIZMATLAR TAHLILI — ${range.toUpperCase()}`;
  t6.font = { name: FONT.family, size: 15, bold: true, color: { argb: COLORS.white.argb } };
  t6.alignment = { horizontal: 'center', vertical: 'middle' };
  t6.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purple };
  ws6.getRow(2).height = 36;

  ws6.mergeCells('B3:F3');
  const sub6 = ws6.getCell('B3');
  sub6.value = `Sana: ${new Date().toLocaleString('ru-RU')} • Bo'limlar soni: ${departments.length}`;
  sub6.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  sub6.alignment = { horizontal: 'center', vertical: 'middle' };
  sub6.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purpleLight };
  ws6.getRow(3).height = 20;
  ws6.getRow(4).height = 8;

  // Headers — Birlik narxi (unit price) qo'shildi
  const h6 = ['Bo\'lim', 'Xizmat nomi', 'Birlik narxi', 'Mijozlar soni', 'Daromad (UZS)'];
  h6.forEach((h, idx) => {
    const cell = ws6.getCell(String.fromCharCode(66 + idx) + '5');
    cell.value = h; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws6.getRow(5).height = 38;

  // Har bir bo'lim va uning xizmatlari bo'yicha ma'lumotlar
  let row6 = 6;
  let grandTotalCount = 0;
  let grandTotalIncome = 0;

  departments.forEach((dept, deptIdx) => {
    const deptPatients = rangePatients.filter((p) => p.departmentId === dept.id);
    const deptServices = dept.services || [];

    // Bo'lim sarlavhasi
    ws6.mergeCells(`B${row6}:F${row6}`);
    const deptCell = ws6.getCell(`B${row6}`);
    deptCell.value = `📋 ${dept.name} — Shifokor: ${dept.doctorName} — Jami ${deptPatients.length} bemor`;
    deptCell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    deptCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    deptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purple };
    ws6.getRow(row6).height = 28;
    row6++;

    // Bo'lim bazaviy narxi (ko'rik)
    const baseCount = deptPatients.length;
    const baseIncome = deptPatients.filter((p) => p.paymentStatus === 'To\'langan').reduce((s, p) => s + p.paymentAmount, 0);
    const servicesIncome = deptPatients.reduce((s, p) => {
      return s + (p.selectedServices || []).reduce((ss, svc) => ss + (svc.price || 0), 0);
    }, 0);
    const baseOnly = baseIncome - servicesIncome;
    const basePrice = dept.price || 0;

    const rowBg = (deptIdx % 2 === 0) ? COLORS.slate50 : COLORS.white;
    let deptSubtotalCount = 0;
    let deptSubtotalIncome = 0;

    // Bo'lim bazaviy ko'rik
    const baseVals: any[] = [dept.name, '📋 Ko\'rik (bazaviy narxi)', basePrice, baseCount, baseOnly];
    baseVals.forEach((val, ci) => {
      const cell = ws6.getCell(String.fromCharCode(66 + ci) + row6);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: ci >= 2 ? 'center' : 'left', indent: ci < 2 ? 1 : 0 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if (ci === 2) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate700.argb } }; }
      if (ci === 3) { cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } }; }
      if (ci === 4) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } }; }
    });
    deptSubtotalCount += baseCount;
    deptSubtotalIncome += baseOnly;
    grandTotalCount += baseCount;
    grandTotalIncome += baseOnly;
    ws6.getRow(row6).height = 26;
    row6++;

    // Har bir xizmat bo'yicha — narxi, soni, daromadi aniq
    if (deptServices.length > 0) {
      deptServices.forEach((svc) => {
        // Shu xizmat tanlangan bemorlar soni
        const svcPatients = deptPatients.filter((p) => p.selectedServices && p.selectedServices.some((s) => s.id === svc.id || s.name === svc.name));
        const svcCount = svcPatients.length;
        const svcIncome = svcCount * svc.price;

        const svcVals: any[] = ['', `  💊 ${svc.name}`, svc.price, svcCount, svcIncome];
        svcVals.forEach((val, ci) => {
          const cell = ws6.getCell(String.fromCharCode(66 + ci) + row6);
          cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate700.argb } };
          cell.alignment = { vertical: 'middle', horizontal: ci >= 2 ? 'center' : 'left', indent: ci < 2 ? 1 : 0 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
          cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
          if (ci === 2) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate700.argb } }; }
          if (ci === 3 && svcCount > 0) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } };
          if (ci === 4 && svcIncome > 0) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } }; }
        });
        deptSubtotalCount += svcCount;
        deptSubtotalIncome += svcIncome;
        grandTotalCount += svcCount;
        grandTotalIncome += svcIncome;
        ws6.getRow(row6).height = 24;
        row6++;
      });
    } else {
      // Xizmatlar yo'q
      ws6.mergeCells(`C${row6}:F${row6}`);
      const noSvc = ws6.getCell(`C${row6}`);
      noSvc.value = '  (Qo\'shimcha xizmatlar kiritilmagan)';
      noSvc.font = { name: FONT.family, size: 9, italic: true, color: { argb: COLORS.slate500.argb } };
      noSvc.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      ws6.getRow(row6).height = 22;
      row6++;
    }

    // Bo'lim subtotal qatori
    ws6.mergeCells(`B${row6}:D${row6}`);
    const subLabel = ws6.getCell(`B${row6}`);
    subLabel.value = `  ↳ ${dept.name} — JAMI:`;
    subLabel.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.primaryDark.argb } };
    subLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    subLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryLighter };

    const subCountCell = ws6.getCell(`E${row6}`);
    subCountCell.value = deptSubtotalCount;
    subCountCell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.primaryDark.argb } };
    subCountCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subCountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryLighter };

    const subIncomeCell = ws6.getCell(`F${row6}`);
    subIncomeCell.value = deptSubtotalIncome;
    subIncomeCell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.primaryDark.argb } };
    subIncomeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    subIncomeCell.numFmt = '#,##0" UZS"';
    subIncomeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryLighter };

    ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
      const c = ws6.getCell(`${col}${row6}`);
      c.border = { top: { style: 'thin', color: COLORS.primary }, bottom: { style: 'thin', color: COLORS.primary }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
    });
    ws6.getRow(row6).height = 26;
    row6++;

    // Bo'sh ajratuvchi qator
    ws6.getRow(row6).height = 6;
    row6++;
  });

  // Jami qator — GRAND TOTAL
  ws6.mergeCells(`B${row6}:D${row6}`);
  const totalLabel = ws6.getCell(`B${row6}`);
  totalLabel.value = '🏆 JAMI (barcha bo\'limlar va xizmatlar):';
  totalLabel.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  totalLabel.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };

  const totalCountCell = ws6.getCell(`E${row6}`);
  totalCountCell.value = grandTotalCount;
  totalCountCell.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  totalCountCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalCountCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };

  const totalIncomeCell = ws6.getCell(`F${row6}`);
  totalIncomeCell.value = grandTotalIncome;
  totalIncomeCell.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  totalIncomeCell.alignment = { horizontal: 'center', vertical: 'middle' };
  totalIncomeCell.numFmt = '#,##0" UZS"';
  totalIncomeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
    const c = ws6.getCell(`${col}${row6}`);
    c.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws6.getRow(row6).height = 34;

  // =========================================================
  // Sheet 7: Kunlik Daromad Tahlili (Daily Income Breakdown)
  // Har bir kun bo'yicha: bemorlar soni, tushum, sana bilan
  // =========================================================
  const ws7 = wb.addWorksheet('📅 Kunlik Tahlil', { properties: { tabColor: { argb: COLORS.amber.argb } }, views: [{ showGridLines: false }] });
  ws7.columns = [
    { width: 4 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 4 },
  ];

  ws7.mergeCells('B2:G2');
  const t7 = ws7.getCell('B2');
  t7.value = `📅 KUNLIK DAROMAD TAHLILI — ${range.toUpperCase()}`;
  t7.font = { name: FONT.family, size: 15, bold: true, color: { argb: COLORS.white.argb } };
  t7.alignment = { horizontal: 'center', vertical: 'middle' };
  t7.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.amber };
  ws7.getRow(2).height = 36;

  ws7.mergeCells('B3:G3');
  const sub7 = ws7.getCell('B3');
  sub7.value = `Sana: ${new Date().toLocaleString('ru-RU')}`;
  sub7.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  sub7.alignment = { horizontal: 'center', vertical: 'middle' };
  sub7.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.amberLight };
  ws7.getRow(3).height = 20;
  ws7.getRow(4).height = 8;

  const h7 = ['Sana', 'Hafta kuni', 'Ambulator bemorlar', 'Ambulator tushum', 'Statsionar tushum', 'Umumiy tushum'];
  h7.forEach((h, idx) => {
    const cell = ws7.getCell(String.fromCharCode(66 + idx) + '5');
    cell.value = h; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws7.getRow(5).height = 38;

  // Group by date
  const dayMap = new Map<string, { patients: number; ambIncome: number; inpIncome: number }>();
  rangePatients.forEach((p) => {
    const dateStr = (p.createdAt || '').split('T')[0];
    if (!dateStr) return;
    if (!dayMap.has(dateStr)) dayMap.set(dateStr, { patients: 0, ambIncome: 0, inpIncome: 0 });
    const d = dayMap.get(dateStr)!;
    d.patients += 1;
    if (p.paymentStatus === 'To\'langan') d.ambIncome += p.paymentAmount || 0;
  });
  rangeStays.forEach((s) => {
    const dateStr = (s.checkInDate || '').split('T')[0];
    if (!dateStr) return;
    if (!dayMap.has(dateStr)) dayMap.set(dateStr, { patients: 0, ambIncome: 0, inpIncome: 0 });
    const d = dayMap.get(dateStr)!;
    d.inpIncome += s.amountPaid || 0;
  });

  const dayNames = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
  const sortedDays = Array.from(dayMap.keys()).sort();
  let grandDayPatients = 0;
  let grandDayAmb = 0;
  let grandDayInp = 0;

  sortedDays.forEach((dateStr, idx) => {
    const r = 6 + idx;
    const d = dayMap.get(dateStr)!;
    const dayObj = new Date(dateStr);
    const dayName = isNaN(dayObj.getTime()) ? '-' : dayNames[dayObj.getDay()];
    const total = d.ambIncome + d.inpIncome;
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [formatDate(dateStr), dayName, d.patients, d.ambIncome, d.inpIncome, total];
    vals.forEach((val, ci) => {
      const cell = ws7.getCell(String.fromCharCode(66 + ci) + r);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: ci >= 2 ? 'center' : 'left', indent: ci < 2 ? 1 : 0 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if ([3, 4, 5].includes(ci)) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: ci === 5, color: { argb: ci === 5 ? COLORS.income.argb : COLORS.slate900.argb } }; }
      if (ci === 2) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } };
    });
    grandDayPatients += d.patients;
    grandDayAmb += d.ambIncome;
    grandDayInp += d.inpIncome;
    ws7.getRow(r).height = 26;
  });

  // Total row for daily
  if (sortedDays.length > 0) {
    const tr = 6 + sortedDays.length;
    ws7.mergeCells(`B${tr}:C${tr}`);
    const tl = ws7.getCell(`B${tr}`);
    tl.value = 'JAMI:';
    tl.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tl.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    tl.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    const tdp = ws7.getCell(`D${tr}`);
    tdp.value = grandDayPatients; tdp.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tdp.alignment = { horizontal: 'center', vertical: 'middle' }; tdp.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    const tda = ws7.getCell(`E${tr}`);
    tda.value = grandDayAmb; tda.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tda.alignment = { horizontal: 'center', vertical: 'middle' }; tda.numFmt = '#,##0" UZS"'; tda.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    const tdi = ws7.getCell(`F${tr}`);
    tdi.value = grandDayInp; tdi.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tdi.alignment = { horizontal: 'center', vertical: 'middle' }; tdi.numFmt = '#,##0" UZS"'; tdi.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    const tdt = ws7.getCell(`G${tr}`);
    tdt.value = grandDayAmb + grandDayInp; tdt.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tdt.alignment = { horizontal: 'center', vertical: 'middle' }; tdt.numFmt = '#,##0" UZS"'; tdt.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws7.getCell(`${col}${tr}`);
      c.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
    });
    ws7.getRow(tr).height = 32;
  }

  // =========================================================
  // Sheet 8: Oylik Tahlil (Monthly Breakdown) — sana OY bilan ajratilgan
  // Har bir oy bo'yicha: bemorlar soni, bo'limlar kesimida tushum,
  // qo'shimcha xizmatlar daromadi, umumiy tushum
  // =========================================================
  const ws8 = wb.addWorksheet('📅 Oylik Tahlil', { properties: { tabColor: { argb: COLORS.primaryDark.argb } }, views: [{ showGridLines: false }] });
  // Columns: B=Oy, C=Bemorlar, D=Ambulator, E=Xizmatlar, F=Statsionar, G=Jami
  ws8.columns = [
    { width: 4 }, { width: 22 }, { width: 14 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 4 },
  ];

  ws8.mergeCells('B2:G2');
  const t8 = ws8.getCell('B2');
  t8.value = `📅 OYLIK DAROMAD TAHLILI — ${range.toUpperCase()}`;
  t8.font = { name: FONT.family, size: 15, bold: true, color: { argb: COLORS.white.argb } };
  t8.alignment = { horizontal: 'center', vertical: 'middle' };
  t8.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ws8.getRow(2).height = 36;

  ws8.mergeCells('B3:G3');
  const sub8 = ws8.getCell('B3');
  sub8.value = `Sana: ${new Date().toLocaleString('ru-RU')} • Oylar bo'yicha batafsil tahlil`;
  sub8.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  sub8.alignment = { horizontal: 'center', vertical: 'middle' };
  sub8.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryLighter };
  ws8.getRow(3).height = 20;
  ws8.getRow(4).height = 8;

  const h8 = ['Oy (Yil-Oy)', 'Bemorlar soni', 'Ambulator ko\'rik', 'Qo\'shimcha xizmatlar', 'Statsionar tushum', 'Umumiy tushum'];
  h8.forEach((h, idx) => {
    const cell = ws8.getCell(String.fromCharCode(66 + idx) + '5');
    cell.value = h; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws8.getRow(5).height = 40;

  // Group by month (YYYY-MM)
  const monthMap = new Map<string, { patients: number; ambIncome: number; svcIncome: number; inpIncome: number }>();
  const monthNamesUz = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

  rangePatients.forEach((p) => {
    const d = new Date(p.createdAt);
    if (isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, { patients: 0, ambIncome: 0, svcIncome: 0, inpIncome: 0 });
    const m = monthMap.get(monthKey)!;
    m.patients += 1;
    // Ambulator base income = paymentAmount minus services
    const svcSum = (p.selectedServices || []).reduce((s, svc) => s + (svc.price || 0), 0);
    if (p.paymentStatus === 'To\'langan') {
      m.ambIncome += Math.max(0, (p.paymentAmount || 0) - svcSum);
      m.svcIncome += svcSum;
    }
  });

  rangeStays.forEach((s) => {
    const d = new Date(s.checkInDate);
    if (isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, { patients: 0, ambIncome: 0, svcIncome: 0, inpIncome: 0 });
    const m = monthMap.get(monthKey)!;
    m.inpIncome += s.amountPaid || 0;
  });

  const sortedMonths = Array.from(monthMap.keys()).sort();
  let grandMonthPatients = 0;
  let grandMonthAmb = 0;
  let grandMonthSvc = 0;
  let grandMonthInp = 0;

  sortedMonths.forEach((monthKey, idx) => {
    const r = 6 + idx;
    const m = monthMap.get(monthKey)!;
    const [y, mo] = monthKey.split('-').map(Number);
    const monthLabel = `${monthNamesUz[mo - 1]} ${y}`;
    const total = m.ambIncome + m.svcIncome + m.inpIncome;
    const rowBg = idx % 2 === 0 ? COLORS.white : COLORS.slate50;
    const vals: any[] = [monthLabel, m.patients, m.ambIncome, m.svcIncome, m.inpIncome, total];
    vals.forEach((val, ci) => {
      const cell = ws8.getCell(String.fromCharCode(66 + ci) + r);
      cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate900.argb } };
      cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'left' : 'center', indent: ci === 0 ? 1 : 0 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: rowBg };
      cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
      if ([2, 3, 4, 5].includes(ci)) { cell.numFmt = '#,##0" UZS"'; }
      if (ci === 0) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.primaryDark.argb } };
      if (ci === 1) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } };
      if (ci === 5) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } };
    });
    grandMonthPatients += m.patients;
    grandMonthAmb += m.ambIncome;
    grandMonthSvc += m.svcIncome;
    grandMonthInp += m.inpIncome;
    ws8.getRow(r).height = 28;
  });

  // Total row for monthly
  if (sortedMonths.length > 0) {
    const tr = 6 + sortedMonths.length;
    ws8.mergeCells(`B${tr}:B${tr}`);
    const tl = ws8.getCell(`B${tr}`);
    tl.value = '🏆 JAMI (barcha oylar):';
    tl.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tl.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    tl.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    const tdp = ws8.getCell(`C${tr}`);
    tdp.value = grandMonthPatients; tdp.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    tdp.alignment = { horizontal: 'center', vertical: 'middle' }; tdp.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    [4, 5, 6, 7].forEach((colNum, i) => {
      const col = String.fromCharCode(64 + colNum);
      const cell = ws8.getCell(`${col}${tr}`);
      const val = [grandMonthAmb, grandMonthSvc, grandMonthInp, grandMonthAmb + grandMonthSvc + grandMonthInp][i];
      cell.value = val; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' }; cell.numFmt = '#,##0" UZS"'; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    });
    ['B', 'C', 'D', 'E', 'F', 'G'].forEach((col) => {
      const c = ws8.getCell(`${col}${tr}`);
      c.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
    });
    ws8.getRow(tr).height = 34;
  }

  // =========================================================
  // Sheet 9: Bo'lim + Xizmat + Oy kesimidagi to'liq hisob kitob
  // Har bir bo'lim, har bir xizmat, qaysi oyda nechta bemor, qancha daromad
  // =========================================================
  const ws9 = wb.addWorksheet('📊 Bo\'lim-Xizmat-Oy', { properties: { tabColor: { argb: COLORS.purple.argb } }, views: [{ showGridLines: false }] });
  ws9.columns = [
    { width: 4 }, { width: 22 }, { width: 30 }, { width: 16 }, { width: 14 }, { width: 18 }, { width: 4 },
  ];

  ws9.mergeCells('B2:F2');
  const t9 = ws9.getCell('B2');
  t9.value = `📊 BO'LIM VA XIZMATLAR BO'YICHA OYLIK HISOB-KITOB — ${range.toUpperCase()}`;
  t9.font = { name: FONT.family, size: 14, bold: true, color: { argb: COLORS.white.argb } };
  t9.alignment = { horizontal: 'center', vertical: 'middle' };
  t9.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purple };
  ws9.getRow(2).height = 36;

  ws9.mergeCells('B3:F3');
  const sub9 = ws9.getCell('B3');
  sub9.value = `Har bir bo'lim va xizmat, qaysi oyda nechta bemor qabul qilingan va qancha to'lov tushgan`;
  sub9.font = { name: FONT.family, size: 10, italic: true, color: { argb: COLORS.slate700.argb } };
  sub9.alignment = { horizontal: 'center', vertical: 'middle' };
  sub9.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purpleLight };
  ws9.getRow(3).height = 20;
  ws9.getRow(4).height = 8;

  const h9 = ['Bo\'lim', 'Xizmat nomi', 'Birlik narxi', 'Mijozlar soni', 'Daromad (UZS)'];
  h9.forEach((h, idx) => {
    const cell = ws9.getCell(String.fromCharCode(66 + idx) + '5');
    cell.value = h; cell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
    cell.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws9.getRow(5).height = 38;

  let row9 = 6;
  let grand9Count = 0;
  let grand9Income = 0;

  departments.forEach((dept) => {
    const deptPatients = rangePatients.filter((p) => p.departmentId === dept.id);
    const deptServices = dept.services || [];

    // Bo'lim sarlavhasi
    ws9.mergeCells(`B${row9}:F${row9}`);
    const deptCell = ws9.getCell(`B${row9}`);
    deptCell.value = `📋 ${dept.name} — Shifokor: ${dept.doctorName} — Jami ${deptPatients.length} bemor`;
    deptCell.font = { name: FONT.family, size: 11, bold: true, color: { argb: COLORS.white.argb } };
    deptCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    deptCell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.purple };
    ws9.getRow(row9).height = 26;
    row9++;

    // Bazaviy ko'rik — oy bo'yicha guruhlangan
    const baseByMonth = new Map<string, number>();
    deptPatients.forEach((p) => {
      const d = new Date(p.createdAt);
      if (isNaN(d.getTime())) return;
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      baseByMonth.set(mk, (baseByMonth.get(mk) || 0) + 1);
    });
    let deptBaseCount = 0;
    let deptBaseIncome = 0;
    Array.from(baseByMonth.keys()).sort().forEach((mk) => {
      const [y, mo] = mk.split('-').map(Number);
      const cnt = baseByMonth.get(mk)!;
      const inc = cnt * (dept.price || 0);
      deptBaseCount += cnt;
      deptBaseIncome += inc;
      const vals: any[] = [dept.name, `📋 Ko'rik — ${monthNamesUz[mo - 1]} ${y}`, dept.price || 0, cnt, inc];
      vals.forEach((val, ci) => {
        const cell = ws9.getCell(String.fromCharCode(66 + ci) + row9);
        cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate700.argb } };
        cell.alignment = { vertical: 'middle', horizontal: ci >= 2 ? 'center' : 'left', indent: ci < 2 ? 1 : 0 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.slate50 };
        cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
        if (ci === 2) cell.numFmt = '#,##0" UZS"';
        if (ci === 3) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } };
        if (ci === 4) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } }; }
      });
      row9++;
    });

    // Har bir xizmat — oy bo'yicha guruhlangan
    deptServices.forEach((svc) => {
      const svcByMonth = new Map<string, number>();
      deptPatients.forEach((p) => {
        if (p.selectedServices && p.selectedServices.some((s) => s.id === svc.id || s.name === svc.name)) {
          const d = new Date(p.createdAt);
          if (isNaN(d.getTime())) return;
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          svcByMonth.set(mk, (svcByMonth.get(mk) || 0) + 1);
        }
      });
      Array.from(svcByMonth.keys()).sort().forEach((mk) => {
        const [y, mo] = mk.split('-').map(Number);
        const cnt = svcByMonth.get(mk)!;
        const inc = cnt * svc.price;
        grand9Count += cnt;
        grand9Income += inc;
        const vals: any[] = ['', `  💊 ${svc.name} — ${monthNamesUz[mo - 1]} ${y}`, svc.price, cnt, inc];
        vals.forEach((val, ci) => {
          const cell = ws9.getCell(String.fromCharCode(66 + ci) + row9);
          cell.value = val; cell.font = { name: FONT.family, size: 10, color: { argb: COLORS.slate700.argb } };
          cell.alignment = { vertical: 'middle', horizontal: ci >= 2 ? 'center' : 'left', indent: ci < 2 ? 1 : 0 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.white };
          cell.border = { top: { style: 'hair', color: COLORS.slate200 }, bottom: { style: 'hair', color: COLORS.slate200 }, left: { style: 'hair', color: COLORS.slate200 }, right: { style: 'hair', color: COLORS.slate200 } };
          if (ci === 2) cell.numFmt = '#,##0" UZS"';
          if (ci === 3) cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.blue.argb } };
          if (ci === 4) { cell.numFmt = '#,##0" UZS"'; cell.font = { name: FONT.family, size: 10, bold: true, color: { argb: COLORS.income.argb } }; }
        });
        row9++;
      });
    });
    grand9Count += deptBaseCount;
    grand9Income += deptBaseIncome;

    // Bo'sh ajratuvchi
    ws9.getRow(row9).height = 6;
    row9++;
  });

  // Grand total
  ws9.mergeCells(`B${row9}:D${row9}`);
  const t9l = ws9.getCell(`B${row9}`);
  t9l.value = '🏆 JAMI (barcha bo\'limlar, xizmatlar va oylar):';
  t9l.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  t9l.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
  t9l.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  const t9c = ws9.getCell(`E${row9}`);
  t9c.value = grand9Count; t9c.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  t9c.alignment = { horizontal: 'center', vertical: 'middle' }; t9c.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  const t9i = ws9.getCell(`F${row9}`);
  t9i.value = grand9Income; t9i.font = { name: FONT.family, size: 12, bold: true, color: { argb: COLORS.white.argb } };
  t9i.alignment = { horizontal: 'center', vertical: 'middle' }; t9i.numFmt = '#,##0" UZS"'; t9i.fill = { type: 'pattern', pattern: 'solid', fgColor: COLORS.primaryDark };
  ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
    const c = ws9.getCell(`${col}${row9}`);
    c.border = { top: { style: 'medium', color: COLORS.primaryDark }, bottom: { style: 'medium', color: COLORS.primaryDark }, left: { style: 'thin', color: COLORS.slate300 }, right: { style: 'thin', color: COLORS.slate300 } };
  });
  ws9.getRow(row9).height = 34;

  // Download
  const today = new Date().toISOString().split('T')[0];
  const fileName = `DR_Maruf_Hisobot_${range}_${today}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
