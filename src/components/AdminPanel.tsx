import React, { useState } from 'react';
import { Department, Patient, HospitalRoom, ClinicTransaction, InpatientStay, ReceptionStaff } from '../types';
import { Plus, Edit2, Trash2, Shield, DollarSign, Users, CheckCircle, Clock, Key, RotateCcw, Save, X, Bed, ShieldAlert } from 'lucide-react';
import { Reports } from './Reports';

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
}) => {
  const [adminTab, setAdminTab] = useState<'tahlil' | 'departments' | 'rooms'>('tahlil');
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
    </div>
  );
};
