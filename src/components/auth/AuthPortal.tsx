import React, { useState } from 'react';
import {
  Scissors,
  Building2,
  User,
  KeyRound,
  Phone,
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  PlusCircle,
  HelpCircle,
  MapPin,
} from 'lucide-react';
import { useNovaDb } from '../../lib/store';
import { ADMIN_EMAIL, isSuperAdminEmail } from '../../data/seedData';
import { BusinessRegisterModal } from '../business/BusinessRegisterModal';
import { AccountBlockedModal } from '../common/AccountBlockedModal';
import { Business, BusinessAccountStatus, ClientProfile } from '../../types';

interface AuthPortalProps {
  onLoginSuccess: () => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess }) => {
  const { db, businesses } = useNovaDb();

  // Mode: 'business' (barbers/admin) or 'client' (regular customers)
  const [activePortalTab, setActivePortalTab] = useState<'business' | 'client'>('business');

  // Business / Barber Form State
  const [bizEmail, setBizEmail] = useState('');
  const [bizName, setBizName] = useState('');
  const [bizOwnerName, setBizOwnerName] = useState('');
  const [bizPhone, setBizPhone] = useState('');
  const [bizCity, setBizCity] = useState('Santo Domingo');
  const [bizCode, setBizCode] = useState('');
  const [bizError, setBizError] = useState('');
  const [isRegisteringBiz, setIsRegisteringBiz] = useState(false);
  const [blockedAccountData, setBlockedAccountData] = useState<{
    businessName: string;
    ownerEmail: string;
    ownerPhone?: string;
    accountStatus: BusinessAccountStatus;
    statusReason?: string;
    statusUpdatedAt?: string;
  } | null>(null);

  // Client Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientError, setClientError] = useState('');
  const [bizLoading, setBizLoading] = useState(false);
  const [clientLoading, setClientLoading] = useState(false);
  const [blockedClientData, setBlockedClientData] = useState<{
    clientName: string;
    clientEmail: string;
    accountStatus: BusinessAccountStatus;
    statusReason?: string;
    statusUpdatedAt?: string;
  } | null>(null);

  const cleanBizEmail = bizEmail.trim().toLowerCase();
  const isAdminEmail = isSuperAdminEmail(cleanBizEmail);
  const existingBiz = cleanBizEmail
    ? businesses.find((b) => b.ownerEmail.toLowerCase() === cleanBizEmail) || db.getBusinessByOwnerEmail(cleanBizEmail)
    : null;

  // Handle Business / Barber / Admin Login
  const handleBusinessAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBizError('');
    setBizLoading(true);

    const cleanEmail = bizEmail.trim().toLowerCase();
    const cleanPhone = bizPhone.trim();
    const finalPhone = cleanPhone && cleanPhone.length >= 7 ? cleanPhone : '809-555-0000';

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setBizError('Por favor introduce un correo electrónico válido.');
      setBizLoading(false);
      return;
    }

    // 1. SUPER ADMIN CHECK: Instant access for admin email without needing auth codes or phone
    if (isSuperAdminEmail(cleanEmail)) {
      const adminBiz = businesses.find((b) => b.ownerEmail.toLowerCase() === cleanEmail);
      db.setCurrentUser({
        id: 'user-admin-nova',
        email: cleanEmail,
        name: 'Super Administrador Nova',
        phone: finalPhone,
        role: 'admin',
        businessId: adminBiz?.id,
        authCode: 'NOVA-SUPER-ADMIN',
      });
      setBizLoading(false);
      onLoginSuccess();
      return;
    }

    // 2. EXISTING BUSINESS: Verify account status (active vs suspended/vencida)
    const currentExistingBiz =
      db.getBusinessByOwnerEmail(cleanEmail) ||
      businesses.find((b) => b.ownerEmail.toLowerCase() === cleanEmail);

    if (currentExistingBiz) {
      if (currentExistingBiz.accountStatus === 'suspendida' || currentExistingBiz.accountStatus === 'vencida') {
        setBlockedAccountData({
          businessName: currentExistingBiz.name,
          ownerEmail: currentExistingBiz.ownerEmail,
          ownerPhone: currentExistingBiz.phone,
          accountStatus: currentExistingBiz.accountStatus,
          statusReason: currentExistingBiz.statusReason,
          statusUpdatedAt: currentExistingBiz.statusUpdatedAt,
        });
        setBizLoading(false);
        return;
      }

      db.setCurrentUser({
        id: `user-${Date.now()}`,
        email: cleanEmail,
        name: currentExistingBiz.ownerName || currentExistingBiz.name,
        phone: currentExistingBiz.phone || finalPhone,
        role: 'business',
        businessId: currentExistingBiz.id,
        authCode: currentExistingBiz.authCodeUsed || currentExistingBiz.code,
        accountStatus: 'activa',
        statusReason: undefined,
      });
      setBizLoading(false);
      onLoginSuccess();
      return;
    }

    // 3. NEW BARBER / BUSINESS OWNER: Direct registration without requiring codes!
    const cleanBizName = bizName.trim();
    if (!cleanBizName) {
      setBizError('Por favor ingresa el nombre de tu barbería o salón.');
      setBizLoading(false);
      return;
    }

    const cleanOwnerName = bizOwnerName.trim() || cleanBizName;
    const finalCity = bizCity.trim() || 'Santo Domingo';
    const optionalCode = bizCode.trim().toUpperCase();

    const newBizData: Omit<Business, 'id' | 'code' | 'createdAt'> = {
      name: cleanBizName,
      type: 'barberia',
      ownerName: cleanOwnerName,
      ownerEmail: cleanEmail,
      phone: finalPhone,
      address: `${finalCity}, República Dominicana`,
      city: finalCity,
      description: `Barbería oficial en Nova Barber RD. Servicios de barbería y estilismo en ${finalCity}.`,
      openingHour: '08:00',
      closingHour: '20:00',
      workDays: [1, 2, 3, 4, 5, 6],
      slotDurationMinutes: 30,
      logo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&auto=format&fit=crop&q=80',
      coverImage:
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80',
      services: [
        {
          id: `srv-${Date.now()}-1`,
          name: 'Corte Clásico Degradado (Fade)',
          description: 'Servicio estándar con cerquillo milimétrico y peinado final.',
          price: 500,
          duration: 30,
          category: 'cortes',
          active: true,
        },
        {
          id: `srv-${Date.now()}-2`,
          name: 'Corte + Barba y Toalla Caliente',
          description: 'Combo completo para el máximo cuidado.',
          price: 800,
          duration: 45,
          category: 'combos',
          active: true,
        },
      ],
      barbers: [
        {
          id: `barb-${Date.now()}-1`,
          name: cleanOwnerName,
          nickname: 'El Barbero',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          phone: finalPhone,
          specialties: ['Degradados', 'Barba', 'Navaja'],
          workDays: [1, 2, 3, 4, 5, 6],
          workHours: { start: '08:00', end: '20:00' },
          active: true,
          commissionRate: 50,
        },
      ],
      expenses: [],
    };

    const registration = await db.registerBusinessAsync(newBizData, optionalCode);
    const registeredBiz = registration.business;

    db.setCurrentUser({
      id: `user-${Date.now()}`,
      email: cleanEmail,
      name: registeredBiz.ownerName || registeredBiz.name,
      phone: registeredBiz.phone,
      role: 'business',
      businessId: registeredBiz.id,
      authCode: registeredBiz.code,
      accountStatus: 'activa',
    });

    setBizLoading(false);
    onLoginSuccess();
  };

  // Handle Client Login / Register
  const handleClientAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    setClientLoading(true);

    const cleanEmail = clientEmail.trim().toLowerCase();
    const cleanName = clientName.trim();
    const cleanPhone = clientPhone.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setClientError('Por favor introduce un correo electrónico válido (ejemplo: usuario@gmail.com).');
      setClientLoading(false);
      return;
    }

    // Direct super admin login if admin email is entered
    if (isSuperAdminEmail(cleanEmail)) {
      const adminBiz = businesses.find((b) => b.ownerEmail.toLowerCase() === cleanEmail);
      db.setCurrentUser({
        id: 'user-admin-nova',
        email: cleanEmail,
        name: cleanName || 'Super Administrador Nova',
        phone: cleanPhone || '809-555-0000',
        role: 'admin',
        businessId: adminBiz?.id,
        authCode: 'NOVA-SUPER-ADMIN',
      });
      setClientLoading(false);
      onLoginSuccess();
      return;
    }

    const existing = db.getClientByEmail(cleanEmail);
    const finalName = cleanName || (existing ? existing.name : `Cliente ${cleanEmail.split('@')[0]}`);
    const finalPhone = cleanPhone || existing?.phone || undefined;

    // Call server to ensure real-time persistence and immediate admin broadcast
    let serverClient: ClientProfile | null = null;
    try {
      const regResp = await fetch('/api/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: finalName,
          phone: finalPhone,
          avatar: existing?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        }),
      });
      if (regResp.ok) {
        const regData = await regResp.json();
        if (regData.success && regData.client) {
          serverClient = regData.client;
          if (Array.isArray(regData.clients)) {
            db.setClients(regData.clients);
          }
        }
      }
    } catch (err) {
      console.warn('Server registration error:', err);
    }

    const clientRecord: ClientProfile =
      serverClient || existing || db.registerOrLoginClient(cleanEmail, finalName, finalPhone).client;

    if (clientRecord.accountStatus === 'suspendida' || clientRecord.accountStatus === 'vencida') {
      setBlockedClientData({
        clientName: clientRecord.name,
        clientEmail: clientRecord.email,
        accountStatus: clientRecord.accountStatus,
        statusReason: clientRecord.statusReason,
        statusUpdatedAt: clientRecord.statusUpdatedAt,
      });
      setClientLoading(false);
      return;
    }

    db.saveClient(clientRecord);
    db.setCurrentUser({
      id: clientRecord.id,
      clientId: clientRecord.id,
      email: clientRecord.email,
      name: clientRecord.name,
      phone: clientRecord.phone,
      role: 'client',
      accountStatus: clientRecord.accountStatus || 'activa',
    });
    setClientLoading(false);
    onLoginSuccess();
  };

  const handleRegisteredNewBusiness = (newBiz: Business) => {
    setIsRegisteringBiz(false);
    db.setCurrentUser({
      id: `user-${Date.now()}`,
      email: newBiz.ownerEmail,
      name: newBiz.ownerName,
      phone: newBiz.phone,
      role: isSuperAdminEmail(newBiz.ownerEmail) ? 'admin' : 'business',
      businessId: newBiz.id,
      authCode: bizCode.trim().toUpperCase(),
    });
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-black text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-xl shadow-amber-500/20 mb-4 ring-4 ring-amber-400/20">
            <Scissors className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center justify-center gap-2">
            NOVA <span className="text-amber-400">BARBER</span>
            <span className="text-xs font-black bg-zinc-800 text-amber-300 px-2 py-0.5 rounded border border-zinc-700">
              🇩🇴 RD
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Plataforma Privada & Gestión en Tiempo Real
          </p>
        </div>

        {/* Portal Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Main Mode Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-zinc-950 rounded-2xl border border-zinc-800/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setActivePortalTab('business');
                setBizError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activePortalTab === 'business'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Barbería / Dueño</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePortalTab('client');
                setClientError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activePortalTab === 'client'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Cuenta Cliente</span>
            </button>
          </div>

          {/* PORTAL SECTION 1: BUSINESS & ADMIN */}
          {activePortalTab === 'business' && (
            <div>
              <div className="mb-5">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Acceso Profesional con Código
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">Portal de Barberos & Negocios</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Inicia sesión en tu barbería o crea tu cuenta de barbero al instante sin códigos.
                </p>
              </div>

              {bizError && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{bizError}</span>
                </div>
              )}

              {isAdminEmail && (
                <div className="mb-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-amber-400" />
                  <div>
                    <strong className="text-white text-sm block">Cuenta de Administrador General</strong>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      Correo reconocido como Super Admin. Presiona el botón para entrar a tu Panel de Control.
                    </div>
                  </div>
                </div>
              )}

              {existingBiz && !isAdminEmail && (
                <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                  <div>
                    <strong className="text-white text-sm block">Barbería Registrada: {existingBiz.name}</strong>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      {existingBiz.ownerName} • {existingBiz.city} • Estado:{' '}
                      <span className="font-bold text-emerald-400 uppercase">{existingBiz.accountStatus || 'activa'}</span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleBusinessAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={bizEmail}
                    onChange={(e) => setBizEmail(e.target.value)}
                    placeholder="ejemplo@barberia.do o tu_correo@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  {isAdminEmail && (
                    <span className="text-[11px] text-amber-400 font-semibold mt-1 block">
                      ✓ Acceso exclusivo de Super Administrador Nova
                    </span>
                  )}
                </div>

                {!isAdminEmail && !existingBiz && (
                  <>
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        ¡Registro libre y gratuito! Completa estos datos para crear tu barbería y aparecer en el catálogo.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Scissors className="w-3.5 h-3.5 text-amber-400" />
                          Nombre de tu Barbería o Salón
                        </span>
                        <span className="text-[10px] text-amber-400 font-medium">Requerido</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bizName}
                        onChange={(e) => setBizName(e.target.value)}
                        placeholder="Ej: Barbería Flow Urbano RD"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          Tu Nombre (Dueño/Barbero)
                        </label>
                        <input
                          type="text"
                          value={bizOwnerName}
                          onChange={(e) => setBizOwnerName(e.target.value)}
                          placeholder="Ej: Carlos Ramírez"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-400" />
                          Teléfono / WhatsApp RD
                        </label>
                        <input
                          type="tel"
                          value={bizPhone}
                          onChange={(e) => setBizPhone(e.target.value)}
                          placeholder="809-555-0142"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        Ciudad en República Dominicana
                      </label>
                      <select
                        value={bizCity}
                        onChange={(e) => setBizCity(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors cursor-pointer"
                      >
                        <option value="Santo Domingo">Santo Domingo (DN / Este / Oeste / Norte)</option>
                        <option value="Santiago">Santiago de los Caballeros</option>
                        <option value="La Vega">La Vega</option>
                        <option value="Puerto Plata">Puerto Plata</option>
                        <option value="San Cristóbal">San Cristóbal</option>
                        <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                        <option value="La Romana">La Romana</option>
                        <option value="Higüey / Bávaro / Punta Cana">Higüey / Bávaro / Punta Cana</option>
                        <option value="Bonao">Bonao</option>
                        <option value="Moca">Moca</option>
                        <option value="San Francisco de Macorís">San Francisco de Macorís</option>
                        <option value="Barahona">Barahona</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                          Código Promocional / Autorización
                        </span>
                        <span className="text-[10px] text-zinc-500 font-normal">Opcional</span>
                      </label>
                      <input
                        type="text"
                        value={bizCode}
                        onChange={(e) => setBizCode(e.target.value.toUpperCase())}
                        placeholder="NOVA-AUTH (Opcional)"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400 transition-colors uppercase tracking-wider"
                      />
                    </div>
                  </>
                )}

                {!isAdminEmail && existingBiz && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      Número de Teléfono (WhatsApp RD)
                    </label>
                    <input
                      type="tel"
                      value={bizPhone || existingBiz.phone || ''}
                      onChange={(e) => setBizPhone(e.target.value)}
                      placeholder="809-555-0142"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={bizLoading}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {bizLoading
                      ? 'Conectando con el servidor...'
                      : isAdminEmail
                      ? 'Acceder como Administrador General'
                      : existingBiz
                      ? `Entrar a ${existingBiz.name}`
                      : 'Crear Cuenta de Barbero y Entrar'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* PORTAL SECTION 2: CLIENT ACCOUNT */}
          {activePortalTab === 'client' && (
            <div>
              <div className="mb-5">
                <div className="flex items-center gap-2 text-amber-400 mb-1">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Portal de Clientes RD
                  </span>
                </div>
                <h2 className="text-xl font-black text-white">Cuenta de Cliente</h2>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Inicia sesión o regístrate para explorar barberías y salones en República Dominicana
                  y agendar tus citas en tiempo real.
                </p>
              </div>

              {clientError && (
                <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{clientError}</span>
                </div>
              )}

              <form onSubmit={handleClientAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      Correo Electrónico (Tu cuenta única)
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      1 cuenta por correo
                    </span>
                  </label>
                  <input
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="tu_correo@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Solo necesitas tu correo para entrar o crear tu cuenta al instante.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Nombre Completo (Para tus reservas)
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Miguel Sosa (Opcional si ya estás registrado)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      Teléfono / WhatsApp RD
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">Opcional</span>
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="809-555-0142"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>

                {/* Single-account anti-multicuentas explanation badge */}
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-start gap-2 text-zinc-400 text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-zinc-200">Sistema Anti-Multicuentas:</strong> Si ya usaste este correo anteriormente, ingresarás directamente a tu cuenta registrada con tu historial protegido. Si es nuevo, se creará tu cuenta exclusiva.
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={clientLoading}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{clientLoading ? 'Conectando en tiempo real...' : 'Entrar a Nova Barber'}</span>
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
                <p className="text-xs text-zinc-400">
                  Los clientes tienen acceso exclusivo al catálogo de barberías, reservas y su
                  historial personal de citas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Switcher Note ("apartado abajo que dira cuenta de cliente inicar secion") */}
        <div className="mt-6 text-center">
          {activePortalTab === 'business' ? (
            <button
              type="button"
              onClick={() => setActivePortalTab('client')}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer bg-zinc-900/60 border border-zinc-800 px-4 py-2 rounded-full"
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>¿No eres barbero? <strong>Cuenta de cliente - Iniciar sesión aquí</strong></span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActivePortalTab('business')}
              className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer bg-zinc-900/60 border border-zinc-800 px-4 py-2 rounded-full"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>¿Eres dueño de barbería o salón? <strong>Acceso con Código aquí</strong></span>
            </button>
          )}
        </div>
      </div>

      {/* Modal for Initial Business Registration (When valid code is provided for new shop) */}
      {isRegisteringBiz && (
        <BusinessRegisterModal
          isOpen={isRegisteringBiz}
          onClose={() => setIsRegisteringBiz(false)}
          onRegistered={handleRegisteredNewBusiness}
          initialAuthCode={bizCode.trim().toUpperCase()}
          initialOwnerEmail={bizEmail.trim().toLowerCase()}
          initialOwnerPhone={bizPhone.trim()}
        />
      )}

      {/* Modal for Suspended or Expired Account Popup */}
      {blockedAccountData && (
        <AccountBlockedModal
          businessName={blockedAccountData.businessName}
          ownerEmail={blockedAccountData.ownerEmail}
          ownerPhone={blockedAccountData.ownerPhone}
          accountStatus={blockedAccountData.accountStatus}
          statusReason={blockedAccountData.statusReason}
          statusUpdatedAt={blockedAccountData.statusUpdatedAt}
          isInlineModal={true}
          onRefreshStatus={() => {
            db.syncWithServer();
            const recheck = db.getBusinessByOwnerEmail(blockedAccountData.ownerEmail);
            if (recheck && recheck.accountStatus === 'activa') {
              setBlockedAccountData(null);
            }
          }}
          onLogout={() => {
            setBlockedAccountData(null);
            setBizCode('');
          }}
          onClose={() => setBlockedAccountData(null)}
        />
      )}

      {/* Modal for Suspended or Expired Client Account Popup */}
      {blockedClientData && (
        <AccountBlockedModal
          accountType="client"
          clientName={blockedClientData.clientName}
          ownerEmail={blockedClientData.clientEmail}
          accountStatus={blockedClientData.accountStatus}
          statusReason={blockedClientData.statusReason}
          statusUpdatedAt={blockedClientData.statusUpdatedAt}
          isInlineModal={true}
          onRefreshStatus={() => {
            db.syncWithServer();
            const recheck = db.getClientByEmail(blockedClientData.clientEmail);
            if (recheck && recheck.accountStatus !== 'suspendida' && recheck.accountStatus !== 'vencida') {
              setBlockedClientData(null);
            }
          }}
          onLogout={() => {
            setBlockedClientData(null);
          }}
          onClose={() => setBlockedClientData(null)}
        />
      )}
    </div>
  );
};
