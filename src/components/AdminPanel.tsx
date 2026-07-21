import React, { useState, useEffect } from 'react';
import { Department, Patient, HospitalRoom, ClinicTransaction, InpatientStay, ReceptionStaff, DepartmentService, DiagnosisTemplate, Medication, ClinicSettings } from '../types';
import { Plus, Edit2, Trash2, Shield, DollarSign, Users, CheckCircle, Clock, Key, RotateCcw, Save, X, Bed, ShieldAlert, Stethoscope, ListChecks, Pill, Settings, Database, Download, Archive, AlertTriangle } from 'lucide-react';
import { Reports } from './Reports';

// API base URL — dev'da local serverga (relative), prod'da Cloudflare Worker'ga
const API_BASE = import.meta.env.DEV ? '' : 'https://medical-pro-api.norinkomp.workers.dev';

interface AdminPanelProps {
  departments: Department[];
  setDepartments: (depts: Department[]) => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  hospitalRooms: HospitalRoom[];
  setHospitalRooms: (rooms: HospitalRoom[]) => void;
  transactions: ClinicTransaction[];
  onSaveTransactions: (updatedTx: ClinicTransaction[]) => void;
  inpatientStays: InpatientStay[];
  receptionStaff: ReceptionStaff[];
  setReceptionStaff: (staff: ReceptionStaff[]) => void;
  diagnosisTemplates?: DiagnosisTemplate[];
  setDiagnosisTemplates?: (templates: DiagnosisTemplate[]) => void;
  clinicSettings?: ClinicSettings;
  setClinicSettings?: (settings: ClinicSettings) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  departments,
  setDepartments,
  patients,
  setPatients,
  hospitalRooms = [],
  setHospitalRooms,
  transactions = [],
  onSaveTransactions,
  inpatientStays = [],
  receptionStaff = [],
  setReceptionStaff,
  diagnosisTemplates = [],
  setDiagnosisTemplates,
  clinicSettings,
  setClinicSettings,
}) => {
  const [adminTab, setAdminTab] = useState<'tahlil' | 'departments' | 'rooms' | 'diagnoses' | 'settings' | 'backups'>('tahlil');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [room, setRoom] = useState('');
  const [price, setPrice] = useState(100000);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const [formError, setFormError] = useState('');

  // Reception staff form states
  const [showReceptionForm, setShowReceptionForm] = useState(false);
  const [editingReceptionId, setEditingReceptionId] = useState<string | null>(null);
  const [repName, setRepName] = useState('');
  const [repLogin, setRepLogin] = useState('');
  const [repPassword, setRepPassword] = useState('');
  const [repError, setRepError] = useState('');

  // Room management states
  const [roomNumber, setRoomNumber] = useState('');
  const [roomCapacity, setRoomCapacity] = useState<number>(2);
  const [roomPrice, setRoomPrice] = useState<number>(150000);
  const [roomGender, setRoomGender] = useState<'Erkak' | 'Ayol' | 'Aralash'>('Aralash');
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [roomError, setRoomError] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  // Department Services management states
  const [servicesDeptId, setServicesDeptId] = useState<string | null>(null);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(0);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState('');

  // Add or update a department service
  const handleSaveService = (deptId: string) => {
    setServiceError('');
    if (!newServiceName.trim()) {
      setServiceError('Xizmat nomini kiriting!');
      return;
    }
    if (newServicePrice <= 0) {
      setServiceError('Xizmat narxi 0 dan katta bo\'lishi kerak!');
      return;
    }

    const updatedDepts = departments.map((d) => {
      if (d.id === deptId) {
        const currentServices = d.services || [];
        if (editingServiceId) {
          const updatedServices = currentServices.map((s) =>
            s.id === editingServiceId
              ? { ...s, name: newServiceName.trim(), price: Number(newServicePrice) }
              : s
          );
          return { ...d, services: updatedServices };
        } else {
          const newService: DepartmentService = {
            id: 'SVC-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            name: newServiceName.trim(),
            price: Number(newServicePrice),
          };
          return { ...d, services: [...currentServices, newService] };
        }
      }
      return d;
    });
    setDepartments(updatedDepts);

    setNewServiceName('');
    setNewServicePrice(0);
    setEditingServiceId(null);
    setServiceError('');
  };

  const handleEditService = (deptId: string, service: DepartmentService) => {
    setServicesDeptId(deptId);
    setNewServiceName(service.name);
    setNewServicePrice(service.price);
    setEditingServiceId(service.id);
    setServiceError('');
  };

  const handleDeleteService = (deptId: string, serviceId: string) => {
    if (!window.confirm('Haqiqatdan ham ushbu xizmat turini o\'chirmoqchisiz?')) return;
    const updatedDepts = departments.map((d) => {
      if (d.id === deptId) {
        const currentServices = d.services || [];
        return { ...d, services: currentServices.filter((s) => s.id !== serviceId) };
      }
      return d;
    });
    setDepartments(updatedDepts);
  };

  const cancelServiceForm = () => {
    setNewServiceName('');
    setNewServicePrice(0);
    setEditingServiceId(null);
    setServiceError('');
  };

  const handleAddRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setRoomError('');

    if (!roomNumber.trim() || !roomCapacity || !roomPrice) {
      setRoomError('Barcha maydonlarni to\'ldirish shart!');
      return;
    }

    const roomExists = hospitalRooms.some(
      (r) => r.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase() && r.id !== editingRoomId
    );
    if (roomExists) {
      setRoomError('Ushbu xona/palata allaqachon ro\'yxatga olingan!');
      return;
    }

    if (editingRoomId) {
      // Edit existing room
      const targetRoom = hospitalRooms.find((r) => r.id === editingRoomId);
      if (targetRoom && targetRoom.occupiedBeds > Number(roomCapacity)) {
        setRoomError(`Ushbu xonada hozirda ${targetRoom.occupiedBeds} ta bemor bor. Sig'imni ${targetRoom.occupiedBeds} dan kamaytirib bo'lmaydi!`);
        return;
      }

      const updated = hospitalRooms.map((r) => {
        if (r.id === editingRoomId) {
          return {
            ...r,
            roomNumber: roomNumber.trim(),
            capacity: Number(roomCapacity),
            pricePerDay: Number(roomPrice),
            genderType: roomGender,
          };
        }
        return r;
      });
      setHospitalRooms(updated);
      setEditingRoomId(null);
    } else {
      // Add new room
      const newRoom: HospitalRoom = {
        id: 'R-' + Date.now(),
        roomNumber: roomNumber.trim(),
        capacity: Number(roomCapacity),
        pricePerDay: Number(roomPrice),
        occupiedBeds: 0,
        genderType: roomGender,
      };
      setHospitalRooms([...hospitalRooms, newRoom]);
    }

    setRoomNumber('');
    setRoomCapacity(2);
    setRoomPrice(150000);
    setRoomGender('Aralash');
    setShowAddRoomForm(false);
  };

  const handleDeleteRoom = (roomId: string) => {
    const targetRoom = hospitalRooms.find((r) => r.id === roomId);
    if (targetRoom && targetRoom.occupiedBeds > 0) {
      alert(`Ushbu xonada hozirda ${targetRoom.occupiedBeds} nafar bemor davolanmoqda! Oldin ularni palatadan chiqarishingiz kerak.`);
      return;
    }
    if (window.confirm('Haqiqatdan ham ushbu yotib davolanish xonasini o\'chirmoqchisiz?')) {
      setHospitalRooms(hospitalRooms.filter((r) => r.id !== roomId));
    }
  };


  // Stats calculation
  const totalIncome = patients
    .filter((p) => p.paymentStatus === 'To\'langan')
    .reduce((sum, p) => sum + p.paymentAmount, 0);

  const totalPatients = patients.length;
  const completedPatients = patients.filter((p) => p.status === 'Yakunlangan').length;
  const waitingPatients = patients.filter((p) => p.status === 'Kutmoqda').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name || !doctorName || !room || !price || !login || !password) {
      setFormError('Barcha maydonlarni to\'ldirish shart!');
      return;
    }

    // Check login uniqueness
    const loginExists = departments.some(
      (d) => d.login.toLowerCase() === login.toLowerCase() && d.id !== editingDeptId
    );
    if (loginExists || login.toLowerCase() === 'admin' || login.toLowerCase() === 'qabul') {
      setFormError('Ushbu login band! Iltimos, boshqa login tanlang.');
      return;
    }

    if (editingDeptId) {
      // Edit existing
      const updated = departments.map((d) => {
        if (d.id === editingDeptId) {
          return {
            ...d,
            name,
            doctorName,
            room,
            price: Number(price),
            login,
            password,
          };
        }
        return d;
      });
      setDepartments(updated);
      setEditingDeptId(null);
    } else {
      // Add new
      const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 1000);
      const newDept: Department = {
        id: newId,
        name,
        doctorName,
        room,
        price: Number(price),
        login,
        password,
      };
      setDepartments([...departments, newDept]);
    }

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setDoctorName('');
    setRoom('');
    setPrice(100000);
    setLogin('');
    setPassword('');
    setShowAddForm(false);
    setEditingDeptId(null);
    setFormError('');
  };

  const handleEdit = (dept: Department) => {
    setName(dept.name);
    setDoctorName(dept.doctorName);
    setRoom(dept.room);
    setPrice(dept.price);
    setLogin(dept.login);
    setPassword(dept.password);
    setEditingDeptId(dept.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Haqiqatdan ham ushbu bo\'lim va shifokor ma\'lumotlarini o\'chirmoqchisiz?')) {
      setDepartments(departments.filter((d) => d.id !== id));
    }
  };

  const handleAddReceptionStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setRepError('');

    const trimmedName = repName.trim();
    const trimmedLogin = repLogin.trim();
    const trimmedPassword = repPassword.trim();

    if (!trimmedName || !trimmedLogin || !trimmedPassword) {
      setRepError('Barcha maydonlarni to\'ldirish shart!');
      return;
    }

    // Check login uniqueness
    const loginExistsInDepts = departments.some(
      (d) => d.login.toLowerCase() === trimmedLogin.toLowerCase()
    );
    const loginExistsInStaff = receptionStaff.some(
      (s) => s.login.toLowerCase() === trimmedLogin.toLowerCase() && s.id !== editingReceptionId
    );

    if (trimmedLogin.toLowerCase() === 'admin' || loginExistsInDepts || loginExistsInStaff) {
      setRepError('Ushbu login band! Iltimos, boshqa login tanlang.');
      return;
    }

    if (editingReceptionId) {
      // Edit
      const updated = receptionStaff.map((s) => {
        if (s.id === editingReceptionId) {
          return {
            ...s,
            name: trimmedName,
            login: trimmedLogin,
            password: trimmedPassword,
          };
        }
        return s;
      });
      setReceptionStaff(updated);
      setEditingReceptionId(null);
    } else {
      // Add
      const newStaff: ReceptionStaff = {
        id: 'rep-' + Date.now(),
        name: trimmedName,
        login: trimmedLogin,
        password: trimmedPassword,
      };
      setReceptionStaff([...receptionStaff, newStaff]);
    }

    // Reset Form
    resetReceptionForm();
  };

  const resetReceptionForm = () => {
    setRepName('');
    setRepLogin('');
    setRepPassword('');
    setShowReceptionForm(false);
    setEditingReceptionId(null);
    setRepError('');
  };

  const handleEditReception = (staff: ReceptionStaff) => {
    setRepName(staff.name);
    setRepLogin(staff.login);
    setRepPassword(staff.password);
    setEditingReceptionId(staff.id);
    setShowReceptionForm(true);
    // Hide department form to avoid overlaps
    setShowAddForm(false);
  };

  const handleDeleteReception = (id: string) => {
    if (window.confirm('Haqiqatdan ham ushbu qabulxona xodimini o\'chirmoqchisiz?')) {
      setReceptionStaff(receptionStaff.filter((s) => s.id !== id));
    }
  };

  const handleResetSystem = () => {
    alert("Tizim xavfsizlik va audit talablariga muvofiq, klinika tarixi va bemorlar ma'lumotlarini o'chirish butunlay taqiqlangan!");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] neon-glow-emerald relative overflow-hidden">
        {/* Top aesthetic accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        <div className="flex items-center space-x-3 z-10">
          <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-2xl flex items-center justify-center">
            <Shield className="h-6 w-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Klinika Tizim Ma'muri (Admin)</h2>
            <p className="text-slate-500 text-xs font-bold">Bo'limlar, shifokorlar, kirish parollari va umumiy statistika nazorati</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 px-4 py-2.5 bg-slate-50 text-slate-500 border border-slate-200/50 rounded-xl text-xs font-bold z-10 select-none">
          <span>🔒 Tizim himoyalangan (Ma'lumotlar o'chirilmaydi)</span>
        </div>
      </div>

      {/* Tab Swapper */}
      <div className="flex bg-[#e2e8f0]/40 p-1.5 rounded-2xl max-w-xl border border-slate-200/55 shadow-inner">
        <button
          onClick={() => setAdminTab('tahlil')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'tahlil'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          📊 Professional Tahlillar
        </button>
        <button
          onClick={() => setAdminTab('departments')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'departments'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          👥 Xodimlar & Bo'limlar
        </button>
        <button
          onClick={() => setAdminTab('rooms')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'rooms'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          🛏️ Palata & O'rinlar
        </button>
        <button
          onClick={() => setAdminTab('diagnoses')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'diagnoses'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          💊 Kasallik & Dori
        </button>
        <button
          onClick={() => setAdminTab('settings')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          ⚙️ Sozlamalar
        </button>
        <button
          onClick={() => setAdminTab('backups')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
            adminTab === 'backups'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
          }`}
        >
          💾 Zaxira (Backup)
        </button>
      </div>

      {adminTab === 'tahlil' && (
        <div className="animate-fade-in">
          <Reports
            patients={patients}
            onClearHistory={handleResetSystem}
            departments={departments}
            inpatientStays={inpatientStays}
            transactions={transactions}
            onSaveTransactions={onSaveTransactions}
          />
        </div>
      )}

      {adminTab === 'departments' && (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-5 rounded-3xl border border-emerald-100 shadow-md shadow-emerald-500/5 neon-glow-emerald flex items-center space-x-4 hover:scale-102 transition-transform duration-300">
          <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-600/10 animate-pulse">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-widest">Umumiy Tushum</p>
            <h3 className="text-base sm:text-lg font-black text-emerald-950">{totalIncome.toLocaleString()} UZS</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 p-5 rounded-3xl border border-blue-100 shadow-md shadow-blue-500/5 neon-glow-blue flex items-center space-x-4 hover:scale-102 transition-transform duration-300">
          <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/10">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-blue-800 font-extrabold uppercase tracking-widest">Bemorlar Soni</p>
            <h3 className="text-base sm:text-lg font-black text-blue-950">{totalPatients} nafar</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-5 rounded-3xl border border-indigo-100 shadow-md shadow-indigo-500/5 flex items-center space-x-4 hover:scale-102 transition-transform duration-300">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/10">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-indigo-800 font-extrabold uppercase tracking-widest">Tugallangan</p>
            <h3 className="text-base sm:text-lg font-black text-indigo-950">{completedPatients} nafar</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 p-5 rounded-3xl border border-amber-100 shadow-md shadow-amber-500/5 flex items-center space-x-4 hover:scale-102 transition-transform duration-300">
          <div className="p-3.5 bg-amber-600 text-white rounded-2xl shadow-lg shadow-amber-600/10">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] text-amber-800 font-extrabold uppercase tracking-widest">Kutayotganlar</p>
            <h3 className="text-base sm:text-lg font-black text-amber-950">{waitingPatients} nafar</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doctors & Departments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/65 shadow-[0_20px_50px_rgba(0,0,0,0.015)]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Mavjud Bo'limlar va Shifokorlar</h3>
              {!showAddForm && (
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddForm(true);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 hover:scale-102 transition duration-200 cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Yangi Bo'lim Qo'shish</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg uppercase tracking-wider">
                        🚪 {dept.room}
                      </span>
                      <h4 className="text-sm font-black text-slate-950 mt-2">{dept.name}</h4>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEdit(dept)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shifokor:</span>
                      <span className="font-extrabold text-slate-900">{dept.doctorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Qabul Narxi:</span>
                      <span className="font-black text-slate-900">{dept.price.toLocaleString()} UZS</span>
                    </div>
                  </div>

                  <div className="text-[11px] flex items-center justify-between text-emerald-800 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-500/10 font-bold">
                    <div className="flex items-center space-x-1">
                      <Key className="h-3 w-3 text-emerald-600" />
                      <span className="font-mono text-slate-500">Login: <strong className="text-emerald-700 font-extrabold">{dept.login}</strong></span>
                    </div>
                    <span className="font-mono text-slate-500">Parol: <strong className="text-emerald-700 font-extrabold">{dept.password}</strong></span>
                  </div>

                  {/* Department Services Management Section */}
                  <div className="border-t border-slate-200 pt-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <Stethoscope className="h-3 w-3 text-emerald-600" />
                        Xizmat Turlari ({(dept.services || []).length})
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          if (servicesDeptId === dept.id) {
                            cancelServiceForm();
                            setServicesDeptId(null);
                          } else {
                            cancelServiceForm();
                            setServicesDeptId(dept.id);
                          }
                        }}
                        className="text-[10px] font-black px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        {servicesDeptId === dept.id ? 'Yopish' : 'Xizmat Qo\'shish'}
                      </button>
                    </div>

                    {/* Existing services list */}
                    {(dept.services || []).length > 0 && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {(dept.services || []).map((svc) => (
                          <div
                            key={svc.id}
                            className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <ListChecks className="h-3 w-3 text-emerald-600 shrink-0" />
                              <span className="text-slate-800 truncate">{svc.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-emerald-700 font-black bg-emerald-50 px-1.5 py-0.5 rounded">
                                {svc.price.toLocaleString()} UZS
                              </span>
                              <button
                                type="button"
                                onClick={() => handleEditService(dept.id, svc)}
                                className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                title="Tahrirlash"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteService(dept.id, svc.id)}
                                className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add/Edit service form */}
                    {servicesDeptId === dept.id && (
                      <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-3 space-y-2">
                        <div className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                          {editingServiceId ? 'Xizmatni Tahrirlash' : 'Yangi Xizmat Qo\'shish'}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Xizmat Nomi *</label>
                            <input
                              type="text"
                              value={newServiceName}
                              onChange={(e) => setNewServiceName(e.target.value)}
                              placeholder="Masalan: Burun yuvish"
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 mb-1 uppercase">Narxi (UZS) *</label>
                            <input
                              type="number"
                              value={newServicePrice}
                              onChange={(e) => setNewServicePrice(Number(e.target.value) || 0)}
                              placeholder="25000"
                              min={0}
                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        {serviceError && (
                          <p className="text-[9px] font-bold text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-100">
                            ⚠️ {serviceError}
                          </p>
                        )}

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSaveService(dept.id)}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Save className="h-3 w-3" />
                            {editingServiceId ? 'Saqlash' : 'Qo\'shish'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              cancelServiceForm();
                              setServicesDeptId(null);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            Bekor
                          </button>
                        </div>
                      </div>
                    )}

                    {(!dept.services || dept.services.length === 0) && servicesDeptId !== dept.id && (
                      <p className="text-[9px] text-slate-400 italic font-bold text-center py-1.5 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        Hozircha xizmat turlari kiritilmagan
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qabulxona Xodimlari (Reception Staff) List */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/65 shadow-[0_20px_50px_rgba(0,0,0,0.015)]">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">Qabulxona Xodimlari</h3>
              {!showReceptionForm && (
                <button
                  onClick={() => {
                    resetReceptionForm();
                    setShowReceptionForm(true);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/10 hover:scale-102 transition duration-200 cursor-pointer"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Yangi Xodim Qo'shish</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receptionStaff.map((staff) => (
                <div
                  key={staff.id}
                  className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg uppercase tracking-wider">
                        📋 Qabulxona Xodimi
                      </span>
                      <h4 className="text-sm font-black text-slate-950 mt-2">{staff.name}</h4>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleEditReception(staff)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                        title="Tahrirlash"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteReception(staff.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] flex items-center justify-between text-blue-800 bg-blue-50/50 p-2.5 rounded-xl border border-blue-500/10 font-bold">
                    <div className="flex items-center space-x-1">
                      <Key className="h-3 w-3 text-blue-600" />
                      <span className="font-mono text-slate-500">Login: <strong className="text-blue-700 font-extrabold">{staff.login}</strong></span>
                    </div>
                    <span className="font-mono text-slate-500">Parol: <strong className="text-blue-700 font-extrabold">{staff.password}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        <div>
          {showReceptionForm ? (
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-blue-100 shadow-[0_20px_50px_rgba(59,130,246,0.05)] space-y-4 sticky top-24 relative overflow-hidden">
              {/* Form header strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100 z-10">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
                  {editingReceptionId ? "Xodimni Tahrirlash" : "Yangi Qabulxona Xodimi"}
                </h3>
                <button
                  onClick={resetReceptionForm}
                  className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddReceptionStaff} className="space-y-4 z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Xodim Ismi Sharifi</label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="Masalan: Dilnoza Karimova"
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tizimga Kirish Ma'lumotlari</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Kirish Logini</label>
                      <input
                        type="text"
                        required
                        value={repLogin}
                        onChange={(e) => setRepLogin(e.target.value)}
                        placeholder="qabul1"
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Kirish Paroli</label>
                      <input
                        type="text"
                        required
                        value={repPassword}
                        onChange={(e) => setRepPassword(e.target.value)}
                        placeholder="parol123"
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {repError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold animate-pulse">
                    ⚠️ {repError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 hover:scale-102 transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>{editingReceptionId ? "O'zgarishlarni saqlash" : "Xodimni saqlash"}</span>
                </button>
              </form>
            </div>
          ) : showAddForm ? (
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] neon-glow-emerald space-y-4 sticky top-24 relative overflow-hidden">
              {/* Form header strip */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

              <div className="flex justify-between items-center pb-3 border-b border-slate-100 z-10">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
                  {editingDeptId ? "Bo'limni Tahrirlash" : "Yangi Bo'lim Kiritish"}
                </h3>
                <button
                  onClick={resetForm}
                  className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 z-10">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Bo'lim Nomi</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Masalan: Oftalmologiya"
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Shifokor Ismi Sharifi</label>
                  <input
                    type="text"
                    required
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Masalan: Dr. Karimov A.B."
                    className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Xona raqami</label>
                    <input
                      type="text"
                      required
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="305-Xona"
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Qabul Narxi (UZS)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kabinetga Kirish Ma'lumotlari</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Kirish Logini</label>
                      <input
                        type="text"
                        required
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        placeholder="oftalmo"
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Kirish Paroli</label>
                      <input
                        type="text"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="parol123"
                        className="w-full px-3.5 py-3 border border-slate-200 rounded-xl text-xs bg-[#f8fafc] text-slate-800 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold animate-pulse">
                    ⚠️ {formError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:scale-102 transition duration-200 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>{editingDeptId ? "O'zgarishlarni saqlash" : "Bo'limni saqlash"}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.015)] space-y-4">
              <h3 className="text-base font-extrabold text-slate-900">Tezkor Yordam</h3>
              <p className="text-slate-500 text-xs font-bold leading-relaxed">
                Ushbu panel orqali siz shifokorlarning barcha bo'limlarini va qabulxona xodimlarini boshqara olasiz. Tizimga yangi kiritilgan xodimlar va shifokorlar o'zlarining shaxsiy logini va parollari orqali ERPga kirib ishlashlari mumkin.
              </p>
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddForm(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black transition duration-200 cursor-pointer shadow-md shadow-emerald-500/10"
                >
                  Yangi Shifokor / Bo'lim Qo'shish
                </button>
                <button
                  onClick={() => {
                    resetReceptionForm();
                    setShowReceptionForm(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition duration-200 cursor-pointer shadow-md shadow-blue-500/10"
                >
                  Yangi Qabulxona Xodimi Qo'shish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {adminTab === 'rooms' && (
        <>
          {/* HOSPITAL INPATIENT ROOMS MANAGEMENT CONTAINER */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-slate-200/65 shadow-[0_20px_50px_rgba(0,0,0,0.015)] space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bed className="h-5 w-5 text-emerald-600" />
              🏥 Shifoxona Yotib Davolanish Palatalari Nazorati
            </h3>
            <p className="text-slate-500 text-xs font-bold mt-1">
              Yotib davolanuvchilar uchun xonalar qo'shish, o'chirish va ularning sig'imlarini nazorat qilish
            </p>
          </div>
          {!showAddRoomForm && (
            <button
              onClick={() => {
                setRoomError('');
                setShowAddRoomForm(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/10 hover:scale-102 transition duration-200 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Yangi Palata Qo'shish</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List of Rooms */}
          <div className="lg:col-span-2 space-y-4">
            {hospitalRooms.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                <Bed className="h-10 w-10 text-slate-300 mx-auto animate-pulse mb-2" />
                <p className="text-sm font-bold text-slate-500">Hozircha yotib davolanish xonalari qo'shilmagan.</p>
                <p className="text-xs text-slate-400 mt-1">Yangi palata qo'shish tugmasi orqali xonalar kiriting.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hospitalRooms.map((room) => {
                  const isFull = room.occupiedBeds >= room.capacity;
                  const availableBeds = room.capacity - room.occupiedBeds;

                  return (
                    <div
                      key={room.id}
                      className="p-5 border border-slate-200 rounded-2xl bg-white space-y-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                            🛏️ {room.roomNumber}
                          </h4>
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                              👥 {room.capacity} kishilik xona
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                              room.genderType === 'Erkak' 
                                ? 'bg-blue-50 text-blue-700' 
                                : room.genderType === 'Ayol' 
                                ? 'bg-pink-50 text-pink-700' 
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {room.genderType}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setRoomNumber(room.roomNumber);
                              setRoomCapacity(room.capacity);
                              setRoomPrice(room.pricePerDay);
                              setRoomGender(room.genderType);
                              setEditingRoomId(room.id);
                              setShowAddRoomForm(true);
                              setRoomError('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer"
                            title="Palatani tahrirlash"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                            title="Palatani o'chirish"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-bold text-slate-600">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kunlik turish narxi:</span>
                          <span className="font-extrabold text-slate-900">{room.pricePerDay.toLocaleString()} UZS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Band o'rinlar:</span>
                          <span className="font-extrabold text-slate-900">
                            {room.occupiedBeds} / {room.capacity} ta o'rin
                          </span>
                        </div>
                      </div>

                      {/* Room Occupancy status indicator */}
                      <div className={`text-[11px] font-bold py-2 px-3 rounded-xl border text-center ${
                        isFull 
                          ? 'bg-rose-50 border-rose-100 text-rose-700' 
                          : room.occupiedBeds > 0 
                          ? 'bg-amber-50 border-amber-100 text-amber-700' 
                          : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      }`}>
                        {isFull 
                          ? '🔴 PALATA BUTUNLAY BAND (JOYLAR YO\'Q)' 
                          : `🟢 BO'SH JOY BOR (${availableBeds} ta o'rin bo'sh)`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form to Add Room */}
          <div>
            {showAddRoomForm ? (
              <form
                onSubmit={handleAddRoom}
                className="bg-white/95 border border-emerald-100 p-5 rounded-2xl shadow-md space-y-4 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-black text-slate-900 uppercase">
                    {editingRoomId ? "Palatani Tahrirlash" : "Yangi Palata Qo'shish"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRoomForm(false);
                      setEditingRoomId(null);
                      setRoomNumber('');
                      setRoomCapacity(2);
                      setRoomPrice(150000);
                      setRoomGender('Aralash');
                      setRoomError('');
                    }}
                    className="text-slate-400 hover:text-rose-600 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>Bekor qilish</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wide">
                    Xona / Palata Nomi yoki Raqami
                  </label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Masalan: 301-Palata (Luks)"
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wide">
                      O'rinlar soni (Kishilik)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      value={roomCapacity}
                      onChange={(e) => setRoomCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wide">
                      Kunlik to'lov (UZS)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={roomPrice}
                      onChange={(e) => setRoomPrice(Number(e.target.value))}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">
                    Palata jinsi mosligi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Aralash', 'Erkak', 'Ayol'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setRoomGender(type)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black text-center transition-all cursor-pointer border ${
                          roomGender === type
                            ? 'bg-emerald-600 border-transparent text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {roomError && (
                  <p className="text-xxs font-bold text-rose-600 bg-rose-50 p-2 rounded border border-rose-100 font-bold">
                    ⚠️ {roomError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-750 text-white rounded-xl text-xs font-black shadow transition duration-200 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Save className="h-4 w-4" />
                  <span>{editingRoomId ? "O'zgarishlarni Saqlash" : "Palatani Saqlash"}</span>
                </button>
              </form>
            ) : (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Palata Ma'lumotlari</h4>
                <p className="text-slate-500 text-xxs font-bold leading-relaxed">
                  Har bir palata uchun jins turini (Erkak, Ayol, yoki Aralash), kunlik turish to'lovi hamda maksimal yotoq o'rni (necha kishilik) belgilanishi lozim. Qabulxonada navbatdagi bemorlarni yotqizishda shu xonalar avtomatik tarzda band qilinadi.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>

      )}

      {/* DIAGNOSIS TEMPLATES TAB */}
      {adminTab === 'diagnoses' && setDiagnosisTemplates && (
        <DiagnosisTemplatesManager templates={diagnosisTemplates} onSave={setDiagnosisTemplates} departments={departments} />
      )}

      {/* CLINIC SETTINGS TAB */}
      {adminTab === 'settings' && clinicSettings && setClinicSettings && (
        <ClinicSettingsForm settings={clinicSettings} onSave={setClinicSettings} />
      )}

      {/* BACKUP & RESTORE TAB */}
      {adminTab === 'backups' && (
        <BackupManager />
      )}
    </div>
  );
};

// ============================================
// DIAGNOSIS TEMPLATES MANAGER
// ============================================
const DiagnosisTemplatesManager: React.FC<{
  templates: DiagnosisTemplate[];
  onSave: (templates: DiagnosisTemplate[]) => void;
  departments: Department[];
}> = ({ templates, onSave, departments }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [diagName, setDiagName] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [filterDeptId, setFilterDeptId] = useState<string>('all');
  const [meds, setMeds] = useState<Medication[]>([{ name: '', dosage: '', days: '' }]);
  const [error, setError] = useState('');

  const handleAddMed = () => setMeds([...meds, { name: '', dosage: '', days: '' }]);
  const handleRemoveMed = (idx: number) => { const n = meds.filter((_, i) => i !== idx); setMeds(n.length > 0 ? n : [{ name: '', dosage: '', days: '' }]); };
  const handleMedChange = (idx: number, field: keyof Medication, value: string) => { const n = [...meds]; n[idx][field] = value; setMeds(n); };
  const resetForm = () => { setDiagName(''); setSelectedDeptId(''); setMeds([{ name: '', dosage: '', days: '' }]); setEditingId(null); setShowForm(false); setError(''); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!diagName.trim()) { setError('Kasallik nomini kiriting!'); return; }
    if (!selectedDeptId) { setError('Bo\'limni tanlang!'); return; }
    const cleanMeds = meds.filter((m) => m.name.trim() !== '');
    if (cleanMeds.length === 0) { setError('Kamida bitta dori kiriting!'); return; }
    if (editingId) {
      onSave(templates.map((t) => t.id === editingId ? { ...t, name: diagName.trim(), departmentId: selectedDeptId, medications: cleanMeds } : t));
    } else {
      onSave([...templates, { id: 'DIAG-' + Date.now(), name: diagName.trim(), departmentId: selectedDeptId, medications: cleanMeds }]);
    }
    resetForm();
  };

  const handleEdit = (t: DiagnosisTemplate) => { setDiagName(t.name); setSelectedDeptId(t.departmentId || ''); setMeds(t.medications.length > 0 ? t.medications : [{ name: '', dosage: '', days: '' }]); setEditingId(t.id); setShowForm(true); setError(''); };
  const handleDelete = (id: string) => { if (window.confirm('Haqiqatdan ham o\'chirmoqchisiz?')) onSave(templates.filter((t) => t.id !== id)); };
  const getDeptName = (deptId: string) => departments.find((d) => d.id === deptId)?.name || 'Noma\'lum';
  const filteredTemplates = filterDeptId === 'all' ? templates : templates.filter((t) => t.departmentId === filterDeptId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-100 shadow-[0_20px_50px_rgba(16,185,129,0.05)] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-2xl"><Pill className="h-6 w-6" /></div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Kasallik & Dori Shablonlari</h2>
              <p className="text-slate-500 text-xs font-bold mt-0.5">Kasallik nomi va dorilar ro'yxatini bo'lim bo'yicha kiriting</p>
            </div>
          </div>
          {!showForm && (
            <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
              <Plus className="h-4 w-4" /><span>Yangi Kasallik Qo'shish</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white/95 p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[10px] font-black text-slate-500 uppercase">Bo'lim bo'yicha:</span>
          <select value={filterDeptId} onChange={(e) => setFilterDeptId(e.target.value)} className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-[#f8fafc] text-slate-800 font-bold cursor-pointer">
            <option value="all">Barcha bo'limlar ({templates.length})</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({templates.filter((t) => t.departmentId === d.id).length})</option>)}
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white/95 p-6 rounded-3xl border border-emerald-100 shadow-md space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-base font-extrabold text-slate-900">{editingId ? 'Tahrirlash' : 'Yangi Kasallik'}</h3>
            <button onClick={resetForm} className="p-1 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">Bo'lim Tanlash *</label>
              <select required value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="w-full px-3.5 py-3 text-sm border-2 border-emerald-200 rounded-xl bg-emerald-50/30 text-slate-800 font-bold cursor-pointer">
                <option value="">-- Bo'limni tanlang --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.doctorName})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">Kasallik / Tashxis Nomi *</label>
              <input type="text" required value={diagName} onChange={(e) => setDiagName(e.target.value)} placeholder="Masalan: O'tkir bronxit" className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl bg-[#f8fafc] text-slate-800 font-bold" />
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5"><Pill className="h-4 w-4 text-emerald-600" />DORILAR RO'YXATI</span>
                <button type="button" onClick={handleAddMed} className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer"><Plus className="h-3.5 w-3.5" />Dori qo'shish</button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {meds.map((med, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                    <div className="sm:col-span-5"><input type="text" value={med.name} onChange={(e) => handleMedChange(idx, 'name', e.target.value)} placeholder="Dori nomi (Amoksitsillin 500mg)" className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold" /></div>
                    <div className="sm:col-span-4"><input type="text" value={med.dosage} onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)} placeholder="Qabul (3 mahal ovqatdan so'ng)" className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold" /></div>
                    <div className="sm:col-span-2"><input type="text" value={med.days} onChange={(e) => handleMedChange(idx, 'days', e.target.value)} placeholder="Muddat (7 kun)" className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white font-bold" /></div>
                    <div className="sm:col-span-1 flex justify-center"><button type="button" onClick={() => handleRemoveMed(idx)} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </div>
                ))}
              </div>
            </div>
            {error && <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 font-bold">⚠️ {error}</p>}
            <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"><Save className="h-4 w-4" />{editingId ? 'Saqlash' : 'Shablonni saqlash'}</button>
          </form>
        </div>
      )}

      {/* Templates list */}
      <div className="bg-white/95 p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 pb-3 border-b border-slate-100">Mavjud Kasallik Shablonlari ({filteredTemplates.length})</h3>
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl"><Pill className="h-10 w-10 text-slate-300 mx-auto mb-2" /><p className="text-sm font-bold text-slate-500">Hozircha shablonlar yo'q.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((t) => (
              <div key={t.id} className="p-4 border border-slate-200 rounded-2xl bg-white hover:border-emerald-300 hover:shadow-lg transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl border border-emerald-200"><Pill className="h-4 w-4" /></div>
                    <div>
                      <h4 className="text-sm font-black text-slate-950">{t.name}</h4>
                      <span className="inline-block text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded uppercase mt-0.5">{getDeptName(t.departmentId)}</span>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleEdit(t)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl cursor-pointer"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {t.medications.map((m, i) => (
                    <div key={i} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                      <span className="font-black text-emerald-600 shrink-0">{i + 1}.</span>
                      <div><span className="font-extrabold text-slate-900 block">{m.name}</span><span className="text-[10px] text-slate-500">{m.dosage} — {m.days}</span></div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-bold">💊 {t.medications.length} ta dori</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CLINIC SETTINGS FORM
// ============================================
const ClinicSettingsForm: React.FC<{ settings: ClinicSettings; onSave: (s: ClinicSettings) => void }> = ({ settings, onSave }) => {
  const [form, setForm] = useState<ClinicSettings>(settings);
  const [saved, setSaved] = useState(false);
  const handleSave = (e: React.FormEvent) => { e.preventDefault(); onSave(form); setSaved(true); setTimeout(() => setSaved(false), 3000); };
  const fields: Array<{ key: keyof ClinicSettings; label: string; placeholder: string; multiline?: boolean }> = [
    { key: 'clinicName', label: 'Klinika Nomi', placeholder: 'DR.Maruf Clinic' },
    { key: 'clinicPhone', label: 'Telefon Raqam', placeholder: '+998 71 123-45-67' },
    { key: 'clinicAddress', label: 'Manzil', placeholder: 'Toshkent, O\'zbekiston' },
    { key: 'recipeHeader', label: 'Retsept Sarlavhasi', placeholder: 'SHIFOKOR RETSEPTi (RECIPE)' },
    { key: 'recipeFooter', label: 'Retsept Pastki Yozuvi', placeholder: 'Sog\'ayib keting!', multiline: true },
    { key: 'ticketHeader', label: 'Chipta Sarlavhasi', placeholder: 'Tashrifingiz uchun rahmat!' },
    { key: 'ticketFooter', label: 'Chipta Pastki Yozuvi', placeholder: 'Monitorni kuzating.', multiline: true },
  ];
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/95 p-6 rounded-3xl border border-emerald-100 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>
        <div className="flex items-center space-x-3"><div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-2xl"><Settings className="h-6 w-6" /></div><div><h2 className="text-base font-extrabold text-slate-900">Klinika Sozlamalari</h2><p className="text-slate-500 text-xs font-bold mt-0.5">Retsept va chiptalarda chiqadigan ma'lumotlar</p></div></div>
      </div>
      <div className="bg-white/95 p-6 rounded-3xl border border-slate-200 shadow-sm">
        {saved && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-600" /><p className="text-xs font-bold text-emerald-800">✅ Saqlandi!</p></div>}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.multiline ? 'md:col-span-2' : ''}>
                <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase">{f.label}</label>
                {f.multiline ? <textarea value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} rows={2} className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl bg-[#f8fafc] font-bold" /> : <input type="text" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder} className="w-full px-3.5 py-3 text-sm border border-slate-200 rounded-xl bg-[#f8fafc] font-bold" />}
              </div>
            ))}
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200"><h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">📋 Retsept Preview</h4><div className="bg-white p-4 rounded-xl border border-slate-200 text-center"><div className="text-base font-bold text-slate-900">{form.clinicName}</div><div className="text-[10px] text-slate-500 mt-1">Tel: {form.clinicPhone}</div><div className="text-[11px] font-bold text-slate-700 mt-2">{form.recipeHeader}</div></div></div>
          <button type="submit" className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-black shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"><Save className="h-4 w-4" />Sozlamalarni Saqlash</button>
        </form>
      </div>
    </div>
  );
};

// ============================================
// BACKUP MANAGER — Zaxira nusxa va tiklash boshqaruvi
// Ma'lumotlarni hech qachon yo'qotmaslik uchun professional tizim
// ============================================
interface BackupFile {
  type: string;
  file: string;
  name: string;
  mtime: string;
  size: number;
  meta?: any;
}

const BackupManager: React.FC = () => {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'daily' | 'hourly' | 'on-save'>('all');

  const loadBackups = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/backups`);
      const j = await r.json();
      if (j.success) setBackups(j.backups);
    } catch (e) {
      console.error('Backup list error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    setMessage(null);
    try {
      const r = await fetch(`${API_BASE}/api/backup/create`, { method: 'POST' });
      const j = await r.json();
      if (j.success) {
        setMessage({ type: 'success', text: `Zaxira yaratildi: ${j.meta.patientCount} bemor, ${j.meta.transactionCount} tranzaksiya (${j.size} KB)` });
        await loadBackups();
      } else {
        setMessage({ type: 'error', text: `Xato: ${j.error}` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Tarmoq xatosi: ${e.message}` });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (file: string, name: string) => {
    if (!confirm(`DIQQAT!\n\n"${name}" zaxirasidan tiklashni xohlaysizmi?\n\nBu amal joriy TiDB dagi ma'lumotni ALMASHTIRADI (o'chirmaydi - ustidan yozadi).\n\nDavom etish uchun OK bosing.`)) return;
    setRestoring(file);
    setMessage(null);
    try {
      const r = await fetch(`${API_BASE}/api/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file }),
      });
      const j = await r.json();
      if (j.success) {
        setMessage({ type: 'success', text: `${j.restored} ta kalit tiklandi: ${j.keys.join(', ')}` });
      } else {
        setMessage({ type: 'error', text: `Tiklash xatosi: ${j.error}` });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: `Tarmoq xatosi: ${e.message}` });
    } finally {
      setRestoring(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return iso; }
  };

  const filteredBackups = filter === 'all' ? backups : backups.filter(b => b.type === filter);
  const typeColors: Record<string, string> = {
    'daily': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'hourly': 'bg-blue-100 text-blue-700 border-blue-200',
    'on-save': 'bg-purple-100 text-purple-700 border-purple-200',
  };
  const typeLabels: Record<string, string> = {
    'daily': 'Kunlik',
    'hourly': 'Soatlik',
    'on-save': 'Saqlashda',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white/95 p-6 rounded-3xl border border-emerald-100 shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>
        <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-2xl"><Database className="h-6 w-6" /></div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Zaxira Nusxa va Tiklash Tizimi</h2>
              <p className="text-slate-500 text-xs font-bold mt-0.5">Barcha ma&apos;lumot avtomatik zaxira qilinadi — hech qachon yo&apos;qolmaydi</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {creating ? <><RotateCcw className="h-4 w-4 animate-spin" />Yaratilmoqda...</> : <><Archive className="h-4 w-4" />Yangi Zaxira Yaratish</>}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-blue-800 font-bold leading-relaxed">
          <p className="mb-1"><strong>Avtomatik zaxira tizimi ishlayapti:</strong></p>
          <p>• <strong>Saqlashda (on-save):</strong> Har bemor qo&apos;shilganda avtomatik zaxira (oxirgi 200 ta)</p>
          <p>• <strong>Soatlik (hourly):</strong> Backup service har 5 daqiqada (oxirgi 48 soat saqlanadi)</p>
          <p>• <strong>Kunlik (daily):</strong> Har kuni to&apos;liq zaxira — <strong>hech qachon o&apos;chirilmaydi</strong></p>
          <p className="mt-1.5 text-emerald-700">✅ Ma&apos;lumot yo&apos;qolsa har qanday zaxiradan tiklash mumkin</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : message.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white/95 p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Archive className="h-4 w-4 text-emerald-600" />
            Zaxira Fayllari ({filteredBackups.length})
          </h3>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {(['all', 'daily', 'hourly', 'on-save'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all cursor-pointer ${filter === f ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                {f === 'all' ? 'Barchasi' : typeLabels[f]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center py-8 text-slate-400 font-bold text-xs">Yuklanmoqda...</p>
        ) : filteredBackups.length === 0 ? (
          <p className="text-center py-8 text-slate-400 font-bold text-xs">Zaxira fayllar topilmadi.</p>
        ) : (
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
            {filteredBackups.slice(0, 100).map((b) => (
              <div key={b.file} className="border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${typeColors[b.type] || 'bg-slate-100 text-slate-700'}`}>
                      {typeLabels[b.type] || b.type}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">{b.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-3 flex-wrap">
                    <span>{formatDate(b.mtime)}</span>
                    <span>{formatSize(b.size)}</span>
                    {b.meta && (
                      <>
                        {b.meta.patientCount !== undefined && <span className="text-emerald-700">{b.meta.patientCount} bemor</span>}
                        {b.meta.transactionCount !== undefined && <span className="text-blue-700">{b.meta.transactionCount} tranzaksiya</span>}
                        {b.meta.key && <span className="text-purple-700">{b.meta.key}</span>}
                        {b.meta.recordCount !== undefined && <span className="text-slate-600">{b.meta.recordCount} yozuv</span>}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(b.file, b.name)}
                  disabled={restoring === b.file}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {restoring === b.file ? <RotateCcw className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Tiklash
                </button>
              </div>
            ))}
            {filteredBackups.length > 100 && (
              <p className="text-center text-[10px] text-slate-400 font-bold py-2">... va yana {filteredBackups.length - 100} ta (eng so&apos;nggi 100 tasi ko&apos;rsatilgan)</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
