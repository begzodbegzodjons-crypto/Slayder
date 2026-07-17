export type DepartmentId = string;

export interface Department {
  id: DepartmentId;
  name: string;
  doctorName: string;
  room: string;
  price: number;
  login: string; // Shifokor kirish logini
  password: string; // Shifokor kirish paroli
}

export interface Medication {
  name: string;
  dosage: string; // e.g. "1 mahal ovqatdan keyin"
  days: string; // e.g. "10 kun"
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
  totalCost: number; // plannedDays * pricePerDay
  amountPaid: number;
  remainingDebt: number; // totalCost - amountPaid
  status: 'Davolanmoqda' | 'Yakunlangan';
  checkOutDate?: string;
  doctorName: string;
  departmentName: string;
  diagnosis?: string;
  prescriptions?: Medication[];
  dailyTreatments?: DailyTreatment[];
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

