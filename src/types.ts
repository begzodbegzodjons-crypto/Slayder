export type DepartmentId = string;

export interface DepartmentService {
  id: string;
  name: string;
  price: number;
}

export interface Department {
  id: DepartmentId;
  name: string;
  doctorName: string;
  room: string;
  price: number;
  login: string; // Shifokor kirish logini
  password: string; // Shifokor kirish paroli
  services?: DepartmentService[]; // Bo'limga oid qo'shimcha xizmat turlari
}

export interface Medication {
  name: string;
  dosage: string; // e.g. "1 mahal ovqatdan keyin"
  days: string; // e.g. "10 kun"
}

// Bemorning oldingi tashrifi haqida qisqacha ma'lumot
export interface PatientVisit {
  visitId: string; // Patient ID of that visit
  visitDate: string; // Tashrif sanasi (ISO)
  departmentId: string;
  departmentName: string;
  doctorName: string;
  diagnosis?: string;
  prescriptions?: Medication[];
  paymentAmount: number;
  status: string;
}

export interface Patient {
  id: string;
  queueNumber: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  phone: string;
  gender: 'Erkak' | 'Ayol';
  departmentId: DepartmentId;
  doctorName: string;
  paymentStatus: 'Kutilmoqda' | 'To\'langan';
  paymentAmount: number;
  status: 'Kutmoqda' | 'Qabulda' | 'Yakunlangan' | 'Bekor qilingan';
  createdAt: string; // ISO string
  calledAt?: string; // When the doctor called the patient
  completedAt?: string; // When checkup finished
  // Doctor records
  diagnosis?: string;
  complaints?: string;
  testResults?: string;
  prescriptions?: Medication[];
  // Qabulxonada tanlangan qo'shimcha xizmatlar (bo'lim xizmatlari)
  selectedServices?: DepartmentService[];
  // To'lov qaytarish (refund) ma'lumotlari
  refundStatus?: 'Qaytarilmagan' | 'Qaytarildi' | 'Qisman';
  refundedAmount?: number;
  refundedAt?: string;
  refundedReason?: string;
  // Bemorning qayta tashrifi (returning visit) ma'lumotlari
  isReturning?: boolean; // Qayta kelgan bemor (avval ko'rilgan)
  previousVisitId?: string; // Avvalgi tashrif ID si
  visitCount?: number; // Tashriflar soni (1 = birinchi marta, 2+ = qayta kelgan)
  patientHistory?: PatientVisit[]; // Bemorning barcha tashriflari tarixi
}

export type UserRole = 'admin' | 'reception' | 'doctor';

export interface UserSession {
  role: UserRole;
  doctorId?: string; // If role is 'doctor'
  name: string;
}

export interface HospitalRoom {
  id: string;
  roomNumber: string;
  capacity: number; // Max patients
  pricePerDay: number; // Price in UZS
  occupiedBeds: number; // Current active patient count in this room
  genderType: 'Erkak' | 'Ayol' | 'Aralash'; // General room classification
}

export interface InpatientStay {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  gender: 'Erkak' | 'Ayol';
  roomId: string;
  roomNumber: string;
  checkInDate: string; // ISO or YYYY-MM-DD
  plannedDays: number;
  pricePerDay: number;
  totalCost: number; // plannedDays * pricePerDay + extraServices
  amountPaid: number;
  remainingDebt: number; // totalCost - amountPaid
  status: 'Davolanmoqda' | 'Yakunlangan';
  checkOutDate?: string;
  doctorName: string;
  departmentName: string;
  diagnosis?: string;
  prescriptions?: Medication[];
  dailyTreatments?: DailyTreatment[];
  extraServices?: ExtraService[];
}

export interface ExtraService {
  id: string;
  name: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface DailyTreatment {
  id: string;
  date: string; // YYYY-MM-DD
  prescriptions: Medication[];
  procedures?: string; // Muolajalar
  doctorNotes?: string; // Shifokor ko'rsatmalari / eslatmalari
}

export interface ClinicTransaction {
  id: string;
  type: 'Kirim' | 'Chiqim'; // Kirim = Income, Chiqim = Expense (Harajat)
  amount: number;
  category: string; // e.g. "Ambulator ko'rik", "Statsionar to'lov", "Klinika xarajati", etc.
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: string; // ISO string
  patientId?: string;
  patientName?: string;
}

export interface ReceptionStaff {
  id: string;
  name: string;
  login: string;
  password: string;
}
