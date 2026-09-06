import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  User,
  Scissors,
  CheckCircle2,
  XCircle,
  Check,
  Phone,
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Users,
  Sparkles,
  PlusCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { Business, Appointment, AppointmentStatus } from '../../types';
import { useNovaDb } from '../../lib/store';
import {
  formatRD,
  formatDominicanDate,
  formatTime12h,
  formatDominicanPhone,
  getStatusBadgeInfo,
  getWhatsAppLink,
} from '../../lib/utils';
import { ManualAppointmentModal } from './ManualAppointmentModal';
import { RescheduleAppointmentModal } from './RescheduleAppointmentModal';

interface BusinessAppointmentsProps {
  business: Business;
}

export const BusinessAppointments: React.FC<BusinessAppointmentsProps> = ({ business }) => {
  const { db, appointments } = useNovaDb();

  // Modals
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('todas');
  const [selectedBarberId, setSelectedBarberId] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<string>(''); // YYYY-MM-DD or empty
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Today string
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Appointments for this business
  const bizApts = appointments.filter((a) => a.businessId === business.id);

  // Today's live queue & earnings
  const todayApts = bizApts.filter((a) => a.date === todayStr);
  const todayQueue = todayApts.filter((a) => a.status === 'pendiente' || a.status === 'confirmada');
  const todayCompleted = todayApts.filter((a) => a.status === 'completada');
  const todaySalesRD = todayCompleted.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  const filteredApts = useMemo(() => {
    return bizApts.filter((apt) => {
      // Status filter
      if (selectedStatus === 'en_fila') {
        if (apt.status !== 'pendiente' && apt.status !== 'confirmada') return false;
      } else if (selectedStatus !== 'todas' && apt.status !== selectedStatus) {
        return false;
      }

      // Barber filter
      if (selectedBarberId !== 'todos' && apt.barberId !== selectedBarberId) return false;

      // Date filter
      if (dateFilter && apt.date !== dateFilter) return false;

      // Search query (client name, service name, phone)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClient = apt.clientName.toLowerCase().includes(query);
        const matchesService = apt.serviceName.toLowerCase().includes(query);
        const matchesPhone = apt.clientPhone.includes(query);
        if (!matchesClient && !matchesService && !matchesPhone) return false;
      }

      return true;
    });
  }, [bizApts, selectedStatus, selectedBarberId, dateFilter, searchQuery]);

  const handleUpdateStatus = (aptId: string, newStatus: AppointmentStatus) => {
    db.updateAppointmentStatus(aptId, newStatus);
    if (newStatus === 'completada') {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.65 },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-amber-400" />
              Agenda y Citas del Negocio
            </h1>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
              En Vivo 🟢
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Administra solicitudes en tiempo real, bloquea horarios y atiende a tus clientes sin riesgo de doble reserva.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>➕ Agendar Cita Manual</span>
          </button>

          <button
            onClick={() => setDateFilter(todayStr)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              dateFilter === todayStr
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            Ver Solo Hoy
          </button>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Mostrar Todas
            </button>
          )}
        </div>
      </div>

      {/* Quick Live Queue & Daily Sales Status Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase block">Fila de Hoy</span>
              <span className="text-base font-black text-white">{todayQueue.length} clientes en espera</span>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </span>
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase block">Facturado Hoy</span>
              <span className="text-base font-black text-emerald-400">{formatRD(todaySalesRD)} ({todayCompleted.length} cortes)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDateFilter(todayStr);
              setSelectedStatus('en_fila');
            }}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ver Solo Fila de Hoy</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar cliente, corte o celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              <option value="todas">Todos los estados</option>
              <option value="en_fila">💈 Clientes en Fila ({todayQueue.length} hoy)</option>
              <option value="pendiente">🟡 Pendientes de Aceptar</option>
              <option value="confirmada">🟢 Confirmadas</option>
              <option value="completada">🔵 Completadas</option>
              <option value="cancelada">⚫ Canceladas</option>
              <option value="rechazada">🔴 Rechazadas</option>
            </select>
          </div>

          {/* Barber Filter */}
          <div>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              <option value="todos">Todos los barberos</option>
              {business.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.nickname ? `(${b.nickname})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Date Picker */}
          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
          </div>
        </div>

        {/* Counter chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80 text-xs">
          <span className="text-zinc-500">Filtrando: {filteredApts.length} citas</span>
          <span className="text-amber-400 font-semibold">
            • {bizApts.filter((a) => a.status === 'pendiente').length} pendientes
          </span>
          <span className="text-emerald-400 font-semibold">
            • {bizApts.filter((a) => a.status === 'confirmada').length} confirmadas
          </span>
          <span className="text-blue-400 font-semibold">
            • {bizApts.filter((a) => a.status === 'completada').length} completadas
          </span>
        </div>
      </div>

      {/* Appointments Cards */}
      <div className="space-y-3.5">
        {filteredApts.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
            <p className="text-sm font-semibold text-zinc-300">No se encontraron citas con estos filtros.</p>
            <p className="text-xs text-zinc-500 mt-1">Prueba cambiando la fecha o el estado de búsqueda.</p>
          </div>
        ) : (
          filteredApts.map((apt) => {
            const badge = getStatusBadgeInfo(apt.status);
            const isPending = apt.status === 'pendiente';
            const isConfirmed = apt.status === 'confirmada';

            return (
              <div
                key={apt.id}
                className={`bg-zinc-900 rounded-2xl p-4 sm:p-5 shadow-xl transition-all border ${
                  isPending
                    ? 'border-amber-500/60 bg-zinc-900/90 ring-1 ring-amber-500/20 shadow-amber-500/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                      {badge.label}
                    </span>

                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDominicanDate(apt.date)}
                    </span>

                    <span className="text-xs font-black text-white flex items-center gap-1 bg-zinc-950 px-2.5 py-0.5 rounded-md border border-zinc-800">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {formatTime12h(apt.time)}
                    </span>
                  </div>

                  <span className="text-sm font-black text-amber-400">
                    {formatRD(apt.servicePrice)}
                  </span>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                  {/* Client Info */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Cliente
                    </span>
                    <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-400 shrink-0" />
                      {apt.clientName}
                    </h4>
                    <p className="text-xs text-zinc-300 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      {formatDominicanPhone(apt.clientPhone)}
                    </p>
                    {apt.notes && (
                      <p className="text-xs text-zinc-400 italic bg-zinc-950/60 p-2 rounded-lg border border-zinc-800 mt-1">
                        Nota: "{apt.notes}"
                      </p>
                    )}
                  </div>

                  {/* Service & Barber */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Servicio y Barbero
                    </span>
                    <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      {apt.serviceName}
                    </h4>
                    <p className="text-xs text-zinc-300">
                      Barbero asignado: <strong className="text-amber-300">{apt.barberName}</strong>
                    </p>
                    <span className="text-[11px] text-zinc-400 block">
                      ⏱️ Duración: ~{apt.serviceDuration} mins
                    </span>
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col justify-between space-y-2 md:items-end">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
                      Acciones en Tiempo Real
                    </span>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'confirmada')}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>ACEPTAR</span>
                          </button>
                          <button
                            onClick={() => setRescheduleApt(apt)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-cyan-950/70 text-cyan-300 font-semibold text-xs rounded-xl border border-zinc-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            title="Proponer otro horario disponible al cliente"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Cambiar Hora</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'completada')}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                            title="Marcar como listo y atendido directamente"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>LISTO</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'rechazada')}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-rose-900/50 text-rose-300 font-semibold text-xs rounded-xl border border-zinc-700 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>RECHAZAR</span>
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'completada')}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>✅ LISTO (Atendido)</span>
                          </button>
                          <button
                            onClick={() => setRescheduleApt(apt)}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-cyan-950/70 text-cyan-300 font-semibold text-xs rounded-xl border border-zinc-700 hover:border-cyan-500/50 transition-colors cursor-pointer"
                            title="Reemplazar horario y enviar propuesta al cliente"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Cambiar Hora</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(apt.id, 'cancelada')}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </>
                      )}

                      {apt.status === 'cambio_propuesto' && (
                        <div className="w-full space-y-1.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                            <span className="font-bold flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Propuesta de nuevo horario enviada:
                            </span>
                            <p className="text-white font-bold mt-1">
                              {formatDominicanDate(apt.proposedDate || apt.date)} a las {formatTime12h(apt.proposedTime || apt.time)}
                            </p>
                            {apt.rescheduleNote && (
                              <p className="text-[11px] text-zinc-400 italic mt-0.5">
                                "{apt.rescheduleNote}"
                              </p>
                            )}
                            <span className="text-[10px] text-cyan-400 block mt-1">
                              Esperando respuesta del cliente...
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRescheduleApt(apt)}
                              className="text-xs text-cyan-300 hover:underline cursor-pointer"
                            >
                              Modificar propuesta
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(apt.id, 'cancelada')}
                              className="text-xs text-rose-400 hover:underline cursor-pointer"
                            >
                              Cancelar Cita
                            </button>
                          </div>
                        </div>
                      )}

                      {apt.status === 'completada' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Atendido & Facturado</span>
                        </span>
                      )}

                      {/* WhatsApp contact */}
                      <a
                        href={getWhatsAppLink(
                          apt.clientPhone,
                          `Hola ${apt.clientName}, te escribimos de ${business.name}. Tu cita para ${apt.serviceName} está programada para el ${apt.date} a las ${apt.time}. ¡Te esperamos!`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-xl border border-zinc-700 transition-colors"
                        title="Enviar recordatorio por WhatsApp RD"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Manual Booking Modal */}
      <ManualAppointmentModal
        business={business}
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />

      {/* Reschedule Proposal Modal */}
      <RescheduleAppointmentModal
        business={business}
        appointment={rescheduleApt}
        isOpen={!!rescheduleApt}
        onClose={() => setRescheduleApt(null)}
      />
    </div>
  );
};
