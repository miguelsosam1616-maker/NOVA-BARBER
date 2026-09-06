import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  PlusCircle,
  Copy,
  Check,
  Trash2,
  Ban,
  Building2,
  RefreshCw,
  Users,
  Search,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
} from 'lucide-react';
import { useNovaDb } from '../../lib/store';
import { AuthCode, Business, BusinessAccountStatus, ClientProfile } from '../../types';
import { ADMIN_EMAIL } from '../../data/seedData';

interface AdminPanelProps {
  onSelectBusiness?: (biz: Business) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onSelectBusiness }) => {
  const {
    db,
    authCodes,
    businesses,
    updateBusinessAccountStatus,
    deleteBusiness,
    clients,
    updateClientAccountStatus,
    deleteClient,
  } = useNovaDb();

  // Active Admin View Tab
  const [adminViewTab, setAdminViewTab] = useState<'businesses' | 'clients' | 'codes'>('businesses');

  // Local codes state to ensure instant reactive reflection upon generation/deletion
  const [localCodes, setLocalCodes] = useState<AuthCode[]>(authCodes);
  useEffect(() => {
    setLocalCodes(authCodes);
  }, [authCodes]);

  // Generator inputs
  const [newNote, setNewNote] = useState('');
  const [newAssignedEmail, setNewAssignedEmail] = useState('');
  const [generatedSuccessCode, setGeneratedSuccessCode] = useState<string | null>(null);
  const [generatedSuccessEmail, setGeneratedSuccessEmail] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filters for Codes
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'claimed' | 'revoked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filters for Businesses
  const [bizStatusFilter, setBizStatusFilter] = useState<'all' | 'activa' | 'suspendida' | 'vencida'>('all');
  const [bizSearchQuery, setBizSearchQuery] = useState('');

  // Suspension Modal State for Business
  const [suspendingBiz, setSuspendingBiz] = useState<Business | null>(null);
  const [suspendType, setSuspendType] = useState<'suspendida' | 'vencida'>('suspendida');
  const [suspendPreset, setSuspendPreset] = useState<string>('Falta de pago de cuota mensual');
  const [customReasonText, setCustomReasonText] = useState('');

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [deletingBizId, setDeletingBizId] = useState<string | null>(null);

  // Filters for Clients
  const [clientStatusFilter, setClientStatusFilter] = useState<'all' | 'activa' | 'suspendida' | 'vencida'>('all');
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Client Suspension Modal State
  const [suspendingClient, setSuspendingClient] = useState<ClientProfile | null>(null);
  const [clientSuspendType, setClientSuspendType] = useState<'suspendida' | 'vencida'>('suspendida');
  const [clientSuspendPreset, setClientSuspendPreset] = useState<string>('Incumplimiento de términos o normas de la comunidad');
  const [clientCustomReasonText, setClientCustomReasonText] = useState('');
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);

  // Handle Code Generation
  const handleGenerateCode = (e: React.FormEvent) => {
    e.preventDefault();
    const created = db.generateAuthCode(newNote, newAssignedEmail);
    // Instant local state update for zero-latency feedback
    setLocalCodes((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
    setGeneratedSuccessCode(created.code);
    setGeneratedSuccessEmail(created.assignedEmail || null);
    setNewNote('');
    setNewAssignedEmail('');
    // Automatically reset filters so the newly generated code is visible right away at the top
    setStatusFilter('all');
    setSearchQuery('');
  };

  const handleRevokeCode = (codeId: string) => {
    db.revokeAuthCode(codeId);
    setLocalCodes((prev) => prev.map((c) => (c.id === codeId ? { ...c, status: 'revoked' as const } : c)));
  };

  const handleDeleteCode = (codeId: string) => {
    db.deleteAuthCode(codeId);
    setLocalCodes((prev) => prev.filter((c) => c.id !== codeId));
  };

  const handleCopy = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const handleCopyWhatsAppMessage = (code: AuthCode) => {
    const message = `¡Hola! Aquí tienes tu código de autorización oficial para registrar tu barbería en la plataforma NOVA BARBER:

🔑 Código: *${code.code}*
📧 Correo que debes usar: ${code.assignedEmail || 'Tu correo personal'}

Ingresa a la aplicación y colócalo junto a tu correo y teléfono para activar tu perfil de barbería.`;
    navigator.clipboard.writeText(message);
    setCopiedCode(`msg-${code.id}`);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  // Open suspension modal for a business
  const handleOpenSuspendModal = (biz: Business, type: 'suspendida' | 'vencida' = 'suspendida') => {
    setSuspendingBiz(biz);
    setSuspendType(type);
    setSuspendPreset(type === 'suspendida' ? 'Falta de pago de cuota mensual' : 'Membresía mensual vencida');
    setCustomReasonText('');
  };

  // Execute Suspension or Expiration
  const handleConfirmStatusChange = () => {
    if (!suspendingBiz) return;

    const finalReason =
      suspendPreset === 'Otro motivo personalizado' && customReasonText.trim()
        ? customReasonText.trim()
        : customReasonText.trim() || suspendPreset;

    updateBusinessAccountStatus(suspendingBiz.id, suspendType, finalReason);
    setSuspendingBiz(null);
  };

  // Reactivate Account directly
  const handleReactivate = (biz: Business) => {
    updateBusinessAccountStatus(biz.id, 'activa', 'Cuenta reactivada por el Administrador Nova.');
  };

  // Open suspension modal for a client
  const handleOpenSuspendClientModal = (client: ClientProfile, type: 'suspendida' | 'vencida' = 'suspendida') => {
    setSuspendingClient(client);
    setClientSuspendType(type);
    setClientSuspendPreset(
      type === 'suspendida'
        ? 'Incumplimiento de términos o normas de la comunidad'
        : 'Periodo de servicio o cuenta vencida'
    );
    setClientCustomReasonText('');
  };

  // Execute Suspension or Expiration for a client
  const handleConfirmClientStatusChange = () => {
    if (!suspendingClient) return;

    const finalReason =
      clientSuspendPreset === 'Otro motivo personalizado' && clientCustomReasonText.trim()
        ? clientCustomReasonText.trim()
        : clientCustomReasonText.trim() || clientSuspendPreset;

    updateClientAccountStatus(suspendingClient.id, clientSuspendType, finalReason);
    setSuspendingClient(null);
  };

  // Reactivate Client Account directly
  const handleReactivateClient = (client: ClientProfile) => {
    updateClientAccountStatus(client.id, 'activa', 'Cuenta de cliente reactivada por el Administrador.');
  };

  // Delete Client Account
  const handleDeleteClient = (clientId: string) => {
    deleteClient(clientId);
    setDeletingClientId(null);
  };

  const filteredCodes = localCodes.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.code.toLowerCase().includes(q) ||
        (c.assignedEmail && c.assignedEmail.toLowerCase().includes(q)) ||
        (c.claimedByEmail && c.claimedByEmail.toLowerCase().includes(q)) ||
        (c.claimedBusinessName && c.claimedBusinessName.toLowerCase().includes(q)) ||
        (c.note && c.note.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const availableCount = localCodes.filter((c) => c.status === 'available').length;
  const claimedCount = localCodes.filter((c) => c.status === 'claimed').length;

  // Business stats
  const activeBizCount = businesses.filter((b) => (b.accountStatus || 'activa') === 'activa').length;
  const suspendedBizCount = businesses.filter((b) => b.accountStatus === 'suspendida').length;
  const expiredBizCount = businesses.filter((b) => b.accountStatus === 'vencida').length;

  const filteredBusinesses = businesses.filter((b) => {
    const status = b.accountStatus || 'activa';
    if (bizStatusFilter !== 'all' && status !== bizStatusFilter) return false;
    if (bizSearchQuery.trim()) {
      const q = bizSearchQuery.toLowerCase();
      return (
        b.name.toLowerCase().includes(q) ||
        b.ownerName.toLowerCase().includes(q) ||
        b.ownerEmail.toLowerCase().includes(q) ||
        b.phone.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Client stats
  const activeClientsCount = clients.filter((c) => (c.accountStatus || 'activa') === 'activa').length;
  const suspendedClientsCount = clients.filter((c) => c.accountStatus === 'suspendida').length;
  const expiredClientsCount = clients.filter((c) => c.accountStatus === 'vencida').length;

  const filteredClients = clients.filter((c) => {
    const status = c.accountStatus || 'activa';
    if (clientStatusFilter !== 'all' && status !== clientStatusFilter) return false;
    if (clientSearchQuery.trim()) {
      const q = clientSearchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/40 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-black tracking-widest uppercase bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                Super Administrador Nova
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Control Maestro de Barberías, Clientes & Licencias
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Supervisa barberías y clientes registrados en tiempo real, gestiona suspensiones con bloqueo
              inmediato en pantalla y crea códigos oficiales de acceso.
            </p>
          </div>

          {/* Top Live Counters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-zinc-950/90 border border-emerald-500/30 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-black text-emerald-400">{activeBizCount + activeClientsCount}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Activas 🟢</div>
            </div>
            <div className="bg-zinc-950/90 border border-rose-500/30 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-black text-rose-400">{suspendedBizCount + suspendedClientsCount}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Suspendidas 🔴</div>
            </div>
            <div className="bg-zinc-950/90 border border-amber-500/30 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-black text-amber-400">{clients.length}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Clientes RD 👤</div>
            </div>
            <div className="bg-zinc-950/90 border border-zinc-800 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px]">
              <div className="text-xl font-black text-zinc-200">{availableCount}</div>
              <div className="text-[10px] font-bold text-zinc-400 uppercase">Códigos Libres</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Admin Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setAdminViewTab('businesses')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminViewTab === 'businesses'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Barberías ({businesses.length})</span>
          {suspendedBizCount > 0 && (
            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {suspendedBizCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminViewTab('clients')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminViewTab === 'clients'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Clientes Registrados ({clients.length})</span>
          {suspendedClientsCount > 0 && (
            <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {suspendedClientsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminViewTab('codes')}
          className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            adminViewTab === 'codes'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Generar Códigos ({authCodes.length})</span>
        </button>
      </div>

      {/* SECTION 1: REGISTERED BUSINESSES IN REAL TIME (HERO SECTION REQUESTED BY USER) */}
      {adminViewTab === 'businesses' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>Cuentas de Barberías Registradas (En Vivo)</span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Aquí aparecen en tiempo real las barberías que se registran con tu código. Puedes suspenderlas,
              vencerlas o reactivarlas; el bloqueo toma efecto de inmediato en cualquier dispositivo.
            </p>
          </div>

          {/* Quick status filter pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
            <button
              onClick={() => setBizStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                bizStatusFilter === 'all'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Todas ({businesses.length})
            </button>
            <button
              onClick={() => setBizStatusFilter('activa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                bizStatusFilter === 'activa'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              Activas ({activeBizCount})
            </button>
            <button
              onClick={() => setBizStatusFilter('suspendida')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                bizStatusFilter === 'suspendida'
                  ? 'bg-rose-500 text-white'
                  : 'text-rose-400 hover:bg-rose-500/10'
              }`}
            >
              Suspendidas ({suspendedBizCount})
            </button>
            <button
              onClick={() => setBizStatusFilter('vencida')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                bizStatusFilter === 'vencida'
                  ? 'bg-amber-400 text-zinc-950'
                  : 'text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              Vencidas ({expiredBizCount})
            </button>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre de barbería, dueño, correo, teléfono o código..."
            value={bizSearchQuery}
            onChange={(e) => setBizSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="text-center py-12 bg-zinc-950/50 rounded-2xl border border-dashed border-zinc-800">
            <Building2 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-zinc-300">
              {businesses.length === 0
                ? 'No hay barberías registradas aún'
                : 'No se encontraron barberías con este filtro'}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {businesses.length === 0
                ? 'Genera un código abajo y compártelo a un barbero. Al registrarse, su cuenta aparecerá aquí al instante.'
                : 'Prueba cambiando los filtros o el término de búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBusinesses.map((biz) => {
              const currentStatus: BusinessAccountStatus = biz.accountStatus || 'activa';
              const isActiva = currentStatus === 'activa';
              const isSuspended = currentStatus === 'suspendida';
              const isExpired = currentStatus === 'vencida';

              const cleanPhone = biz.phone.replace(/[^0-9]/g, '');

              return (
                <div
                  key={biz.id}
                  className={`bg-zinc-950 rounded-2xl p-5 space-y-3.5 transition-all relative border ${
                    isSuspended
                      ? 'border-rose-600/70 bg-gradient-to-b from-rose-950/30 to-zinc-950 shadow-rose-950/20 shadow-lg'
                      : isExpired
                      ? 'border-amber-600/70 bg-gradient-to-b from-amber-950/30 to-zinc-950 shadow-amber-950/20 shadow-lg'
                      : 'border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Card Header & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[11px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {biz.code}
                      </span>
                      <h3 className="text-base font-black text-white mt-1.5">{biz.name}</h3>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">
                        {biz.type} • {biz.city}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      {isActiva && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACTIVA
                        </span>
                      )}
                      {isSuspended && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <Ban className="w-3 h-3 text-rose-400" />
                          SUSPENDIDA
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <Clock className="w-3 h-3 text-amber-400" />
                          VENCIDA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner and Contact details */}
                  <div className="text-xs space-y-1.5 text-zinc-300 bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/80">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-500 font-medium">Dueño:</span>
                      <span className="font-bold text-white">{biz.ownerName}</span>
                    </div>
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-500 font-medium flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Correo:
                      </span>
                      <span className="font-mono text-zinc-200 truncate max-w-[170px]" title={biz.ownerEmail}>
                        {biz.ownerEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                      <span className="text-zinc-500 font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" /> Tel / WhatsApp:
                      </span>
                      <a
                        href={`https://wa.me/1${cleanPhone}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                      >
                        {biz.phone}
                      </a>
                    </div>
                    {biz.authCodeUsed && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">Código usado:</span>
                        <span className="font-mono text-zinc-300 text-[11px] bg-zinc-800 px-1.5 py-0.5 rounded">
                          {biz.authCodeUsed}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Suspended or Expired Alert Note */}
                  {(isSuspended || isExpired) && (
                    <div
                      className={`p-3 rounded-xl text-xs space-y-1 border ${
                        isSuspended
                          ? 'bg-rose-950/40 border-rose-800/50 text-rose-200'
                          : 'bg-amber-950/40 border-amber-800/50 text-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Motivo de {isSuspended ? 'Suspensión' : 'Vencimiento'}:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        {biz.statusReason || (isSuspended ? 'Suspensión administrativa' : 'Membresía vencida')}
                      </p>
                      <div className="text-[10px] opacity-70 pt-0.5">
                        {biz.statusUpdatedAt &&
                          `Actualizado el ${new Date(biz.statusUpdatedAt).toLocaleDateString('es-DO')}`}
                      </div>
                    </div>
                  )}

                  {/* Management Action Buttons */}
                  <div className="pt-2 border-t border-zinc-800 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {isActiva ? (
                        <>
                          <button
                            id={`btn-suspend-${biz.id}`}
                            onClick={() => handleOpenSuspendModal(biz, 'suspendida')}
                            className="flex-1 px-3 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Suspender
                          </button>
                          <button
                            id={`btn-expire-${biz.id}`}
                            onClick={() => handleOpenSuspendModal(biz, 'vencida')}
                            className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            Marcar Vencida
                          </button>
                        </>
                      ) : (
                        <button
                          id={`btn-reactivate-${biz.id}`}
                          onClick={() => handleReactivate(biz)}
                          className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/30 cursor-pointer"
                        >
                          <Unlock className="w-4 h-4" />
                          Reactivar Cuenta Ahora
                        </button>
                      )}
                    </div>

                    {/* Secondary actions */}
                    <div className="flex items-center justify-between text-xs pt-1 text-zinc-400">
                      {onSelectBusiness && (
                        <button
                          onClick={() => onSelectBusiness(biz)}
                          className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Auditar Citas</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      {deletingBizId === biz.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              deleteBusiness(biz.id);
                              setDeletingBizId(null);
                            }}
                            className="text-rose-400 hover:text-rose-300 font-bold text-[11px] underline cursor-pointer"
                          >
                            Confirmar Borrar
                          </button>
                          <button
                            onClick={() => setDeletingBizId(null)}
                            className="text-zinc-500 hover:text-zinc-300 text-[11px] cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingBizId(biz.id)}
                          className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                          title="Eliminar Negocio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* SECTION CLIENTS: REGISTERED CLIENTS IN REAL TIME */}
      {adminViewTab === 'clients' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Clientes Registrados en la App (En Vivo)</span>
                </h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Monitorea todos los usuarios que han creado cuenta con su correo electrónico. Puedes suspender o
                vencer cualquier cliente con un clic para bloquear su acceso o reservas de forma inmediata.
              </p>
            </div>

            {/* Quick status filter pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800">
              <button
                onClick={() => setClientStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  clientStatusFilter === 'all'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos ({clients.length})
              </button>
              <button
                onClick={() => setClientStatusFilter('activa')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  clientStatusFilter === 'activa'
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                Activos ({activeClientsCount})
              </button>
              <button
                onClick={() => setClientStatusFilter('suspendida')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  clientStatusFilter === 'suspendida'
                    ? 'bg-rose-500 text-white'
                    : 'text-rose-400 hover:bg-rose-500/10'
                }`}
              >
                Suspendidos ({suspendedClientsCount})
              </button>
              <button
                onClick={() => setClientStatusFilter('vencida')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  clientStatusFilter === 'vencida'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                Vencidos ({expiredClientsCount})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={clientSearchQuery}
              onChange={(e) => setClientSearchQuery(e.target.value)}
              placeholder="Buscar por correo electrónico, nombre o teléfono..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
            {clientSearchQuery && (
              <button
                onClick={() => setClientSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Client Grid */}
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
              <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-400 font-bold text-sm">No se encontraron clientes registrados</p>
              <p className="text-zinc-600 text-xs mt-1">
                Tan pronto un cliente ingrese con su correo electrónico a la app aparecerá aquí al instante.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client) => {
                const status = client.accountStatus || 'activa';
                const isActiva = status === 'activa';
                const isSuspended = status === 'suspendida';
                const isExpired = status === 'vencida';

                return (
                  <div
                    key={client.id}
                    className={`bg-zinc-950 border rounded-2xl p-5 space-y-4 transition-all hover:border-zinc-700 shadow-md ${
                      isSuspended
                        ? 'border-rose-800/60 bg-rose-950/10'
                        : isExpired
                        ? 'border-amber-800/60 bg-amber-950/10'
                        : 'border-zinc-800'
                    }`}
                  >
                    {/* Header: Name and Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            client.avatar ||
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                          }
                          alt={client.name}
                          className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                        />
                        <div>
                          <h3 className="font-extrabold text-white text-sm leading-snug">
                            {client.name}
                          </h3>
                          <span className="text-[11px] text-zinc-500">
                            Registrado:{' '}
                            {client.createdAt
                              ? new Date(client.createdAt).toLocaleDateString('es-DO')
                              : 'Reciente'}
                          </span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                          isActiva
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isSuspended
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {isActiva ? '🟢 Activa' : isSuspended ? '🔴 Suspendida' : '🟡 Vencida'}
                      </span>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1.5 text-xs text-zinc-300 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300 truncate">
                        <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                        <span>ID de Cuenta:</span>
                        <span className="font-mono">{client.id}</span>
                      </div>
                    </div>

                    {/* Suspension/Expired reason alert if applicable */}
                    {!isActiva && (
                      <div
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          isSuspended
                            ? 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                            : 'bg-amber-950/40 border border-amber-800/60 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Motivo de {isSuspended ? 'Suspensión' : 'Vencimiento'}:</span>
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-90">
                          {client.statusReason || (isSuspended ? 'Suspensión administrativa' : 'Cuenta vencida')}
                        </p>
                        <div className="text-[10px] opacity-70 pt-0.5">
                          {client.statusUpdatedAt &&
                            `Actualizado el ${new Date(client.statusUpdatedAt).toLocaleDateString('es-DO')}`}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-zinc-800 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {isActiva ? (
                          <>
                            <button
                              id={`btn-suspend-client-${client.id}`}
                              onClick={() => handleOpenSuspendClientModal(client, 'suspendida')}
                              className="flex-1 px-3 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Suspender
                            </button>
                            <button
                              id={`btn-expire-client-${client.id}`}
                              onClick={() => handleOpenSuspendClientModal(client, 'vencida')}
                              className="flex-1 px-3 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-zinc-950 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              Vencer
                            </button>
                          </>
                        ) : (
                          <button
                            id={`btn-reactivate-client-${client.id}`}
                            onClick={() => handleReactivateClient(client)}
                            className="w-full px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/30 cursor-pointer"
                          >
                            <Unlock className="w-4 h-4" />
                            Reactivar Cliente Ahora
                          </button>
                        )}
                      </div>

                      {/* Delete Client Action */}
                      <div className="flex items-center justify-end text-xs pt-1 text-zinc-400">
                        {deletingClientId === client.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-rose-400">¿Eliminar cliente?</span>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
                              className="text-rose-400 hover:text-rose-300 font-bold text-[11px] underline cursor-pointer"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => setDeletingClientId(null)}
                              className="text-zinc-500 hover:text-zinc-300 text-[11px] cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingClientId(client.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                            title="Eliminar Cuenta de Cliente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: CODE GENERATOR & AUTH CODES */}
      {adminViewTab === 'codes' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
        <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <KeyRound className="w-5 h-5" />
            <h2 className="text-lg font-black text-white">Generar Nuevo Código</h2>
          </div>
          <p className="text-xs text-zinc-400">
            Crea un nuevo pase de acceso para entregárselo al dueño de la barbería.
          </p>

          <form onSubmit={handleGenerateCode} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Nota / Nombre de Barbería (Opcional):
              </label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ej: Barbería Don Flow Santiago"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Asignar exclusivamente a un correo (Opcional):
              </label>
              <input
                type="email"
                value={newAssignedEmail}
                onChange={(e) => setNewAssignedEmail(e.target.value)}
                placeholder="barber@ejemplo.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Si lo dejas en blanco, cualquier barbero al que le des el código podrá usarlo.
              </span>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Generar Código de Autorización</span>
            </button>
          </form>

          {generatedSuccessCode && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 text-center space-y-2.5 animate-in zoom-in-95 duration-200">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                ¡Código Generado Exitosamente!
              </span>
              <div className="font-mono text-lg font-black text-white bg-zinc-950 py-2 rounded-xl border border-emerald-500/30 tracking-wider">
                {generatedSuccessCode}
              </div>
              {generatedSuccessEmail && (
                <div className="text-xs text-zinc-300 bg-zinc-900/90 py-1.5 px-2.5 rounded-lg border border-zinc-800 text-left">
                  <span className="text-zinc-500 text-[10px] block uppercase font-bold">Asignado a:</span>
                  <span className="text-amber-400 font-mono font-bold break-all">{generatedSuccessEmail}</span>
                </div>
              )}
              <p className="text-[11px] text-zinc-400 leading-snug">
                El usuario ya puede iniciar sesión con este correo y código. Entrará de inmediato a su panel de barbería.
              </p>
              <button
                type="button"
                onClick={() => handleCopy(generatedSuccessCode)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                {copiedCode === generatedSuccessCode ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* SECTION 2.2: CODES LIST */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Historial de Códigos Generados</span>
                <span className="text-xs bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full font-bold">
                  {localCodes.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Supervisa qué códigos están disponibles y cuáles ya fueron vinculados a una cuenta.
              </p>
            </div>

            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'available' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Libres
              </button>
              <button
                onClick={() => setStatusFilter('claimed')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'claimed' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Vinculados
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, correo, barbería..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredCodes.length === 0 ? (
              <div className="text-center py-10 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-800">
                <KeyRound className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No se encontraron códigos con los filtros seleccionados.</p>
              </div>
            ) : (
              filteredCodes.map((item) => {
                const isClaimed = item.status === 'claimed';
                const isAvailable = item.status === 'available';
                const isRevoked = item.status === 'revoked';

                return (
                  <div
                    key={item.id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-black text-amber-400 tracking-wider">
                          {item.code}
                        </span>
                        {isAvailable && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Disponible
                          </span>
                        )}
                        {isClaimed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Vinculado
                          </span>
                        )}
                        {isRevoked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Revocado
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {item.note && <span className="text-zinc-300 font-semibold">{item.note}</span>}
                        {item.claimedByEmail && (
                          <span className="text-amber-300 font-medium">
                            Usado por: <strong>{item.claimedByEmail}</strong>
                          </span>
                        )}
                        {item.claimedBusinessName && (
                          <span className="text-zinc-300">({item.claimedBusinessName})</span>
                        )}
                        {item.assignedEmail && !item.claimedByEmail && (
                          <span className="text-zinc-500">Reservado para: {item.assignedEmail}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleCopy(item.code)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedCode === item.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyWhatsAppMessage(item)}
                        title="Copiar plantilla para WhatsApp"
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-emerald-400 border border-zinc-700 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedCode === `msg-${item.id}` ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Listo</span>
                          </>
                        ) : (
                          <>
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WhatsApp</span>
                          </>
                        )}
                      </button>

                      {isAvailable && (
                        <button
                          onClick={() => handleRevokeCode(item.id)}
                          title="Revocar Código"
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteCode(item.id)}
                        title="Eliminar Código"
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      )}

      {/* CLIENT SUSPENSION & EXPIRATION MODAL */}
      {suspendingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    clientSuspendType === 'suspendida'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {clientSuspendType === 'suspendida'
                    ? 'Suspender Cuenta de Cliente'
                    : 'Marcar Cuenta Vencida'}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {suspendingClient.name}
                </h3>
                <span className="text-xs text-amber-400 font-mono">{suspendingClient.email}</span>
              </div>
              <button
                onClick={() => setSuspendingClient(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-zinc-300 block">
                Selecciona el motivo de la sanción:
              </label>

              <div className="space-y-2">
                {[
                  clientSuspendType === 'suspendida'
                    ? 'Comportamiento inapropiado o falta de respeto'
                    : 'Periodo de servicio o cuenta vencida',
                  'Inasistencias reiteradas a citas confirmadas',
                  'Uso indebido de la plataforma o cuenta duplicada',
                  'Cuenta temporalmente restringida por administración',
                  'Otro motivo personalizado',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      clientSuspendPreset === reason
                        ? clientSuspendType === 'suspendida'
                          ? 'bg-rose-950/40 border-rose-600/60 text-white'
                          : 'bg-amber-950/40 border-amber-600/60 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clientSuspendReason"
                      checked={clientSuspendPreset === reason}
                      onChange={() => setClientSuspendPreset(reason)}
                      className="accent-amber-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {(clientSuspendPreset === 'Otro motivo personalizado' || clientSuspendPreset) && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Detalle o mensaje para mostrarle al cliente en su pantalla:
                  </label>
                  <textarea
                    rows={3}
                    value={clientCustomReasonText}
                    onChange={(e) => setClientCustomReasonText(e.target.value)}
                    placeholder="Ej: Tu cuenta ha sido temporalmente restringida. Comunícate al +1 829 294 9355 para soporte."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Al aplicar este estado, el cliente verá de inmediato la ventana emergente de bloqueo en
                  cualquier dispositivo donde intente usar la aplicación y no podrá reservar citas.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingClient(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClientStatusChange}
                className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg cursor-pointer ${
                  clientSuspendType === 'suspendida'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                }`}
              >
                Confirmar y Bloquear Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BUSINESS SUSPENSION & EXPIRATION MODAL */}
      {suspendingBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    suspendType === 'suspendida'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {suspendType === 'suspendida' ? 'Suspender Cuenta' : 'Marcar Membresía Vencida'}
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {suspendingBiz.name}
                </h3>
                <span className="text-xs text-zinc-400">{suspendingBiz.ownerEmail}</span>
              </div>
              <button
                onClick={() => setSuspendingBiz(null)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-zinc-300 block">
                Selecciona el motivo oficial:
              </label>

              <div className="space-y-2">
                {[
                  suspendType === 'suspendida'
                    ? 'Falta de pago de cuota mensual'
                    : 'Membresía mensual vencida',
                  'Incumplimiento de términos y condiciones',
                  'Periodo de prueba de 30 días finalizado',
                  'Uso indebido o reporte de clientes',
                  'Otro motivo personalizado',
                ].map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      suspendPreset === reason
                        ? suspendType === 'suspendida'
                          ? 'bg-rose-950/40 border-rose-600/60 text-white'
                          : 'bg-amber-950/40 border-amber-600/60 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="suspendReason"
                      checked={suspendPreset === reason}
                      onChange={() => setSuspendPreset(reason)}
                      className="accent-amber-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {(suspendPreset === 'Otro motivo personalizado' || suspendPreset) && (
                <div className="pt-2">
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                    Detalle o mensaje adicional para el barbero:
                  </label>
                  <textarea
                    rows={3}
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Ej: Favor de comunicarse con la administración al +1 829 294 9355 para reactivar su servicio."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Al aplicar este estado, el barbero será expulsado o bloqueado en cualquier dispositivo
                  donde intente entrar, y verá una ventana emergente explicándole el motivo.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSuspendingBiz(null)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                className={`flex-1 py-2.5 text-white font-extrabold rounded-xl text-xs transition-all shadow-lg cursor-pointer ${
                  suspendType === 'suspendida'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                }`}
              >
                Confirmar y Bloquear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: SYSTEM MAINTENANCE / CLEAN SLATE */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            <span>Mantenimiento & Reinicio de Datos</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Borra todos los registros y comienza desde cero con el sistema completamente limpio.
          </p>
        </div>

        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                db.reset();
                setShowResetConfirm(false);
              }}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Sí, Borrar Todo
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Limpiar y Restablecer a Cero
          </button>
        )}
      </div>
    </div>
  );
};
