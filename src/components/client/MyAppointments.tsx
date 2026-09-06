import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  AlertCircle,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Scissors,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { useNovaDb } from '../../lib/store';
import {
  formatRD,
  formatDominicanDate,
  formatTime12h,
  getStatusBadgeInfo,
  getWhatsAppLink,
} from '../../lib/utils';
import { Appointment } from '../../types';

interface MyAppointmentsProps {
  onExploreBusinesses: () => void;
}

export const MyAppointments: React.FC<MyAppointmentsProps> = ({ onExploreBusinesses }) => {
  const { db, client, appointments } = useNovaDb();
  const [filter, setFilter] = useState<'todas' | 'activas' | 'historial'>('todas');
  const [cancelModalApt, setCancelModalApt] = useState<Appointment | null>(null);

  // Client's appointments
  const clientApts = appointments.filter((a) => a.clientId === client.id);

  const filteredApts = clientApts.filter((apt) => {
    if (filter === 'activas') {
      return apt.status === 'pendiente' || apt.status === 'confirmada' || apt.status === 'cambio_propuesto';
    }
    if (filter === 'historial') {
      return apt.status === 'completada' || apt.status === 'cancelada' || apt.status === 'rechazada';
    }
    return true;
  });

  const handleCancelAppointment = (aptId: string) => {
    db.updateAppointmentStatus(aptId, 'cancelada', 'Cancelada por el cliente');
    setCancelModalApt(null);
  };

  const handleRespondReschedule = (aptId: string, accept: boolean) => {
    db.respondToReschedule(aptId, accept);
    if (accept) {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-amber-400" />
            Mis Citas y Reservas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Estados actualizados en vivo • Sincronización instantánea con la barbería
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFilter('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'todas'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({clientApts.length})
          </button>
          <button
            onClick={() => setFilter('activas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'activas'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Próximas (
            {clientApts.filter((a) => a.status === 'pendiente' || a.status === 'confirmada').length}
            )
          </button>
          <button
            onClick={() => setFilter('historial')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'historial'
                ? 'bg-amber-500 text-zinc-950 font-bold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3.5">
        {filteredApts.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-500">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-200">
                No tienes citas en esta sección
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Introduce el código de tu barbería o busca una para agendar tu próximo corte.
              </p>
            </div>
            <button
              onClick={onExploreBusinesses}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Buscar una Barbería
            </button>
          </div>
        ) : (
          filteredApts.map((apt) => {
            const badge = getStatusBadgeInfo(apt.status);
            const isActionable = apt.status === 'pendiente' || apt.status === 'confirmada' || apt.status === 'cambio_propuesto';

            return (
              <div
                key={apt.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/90 rounded-2xl p-4 sm:p-5 shadow-xl transition-all space-y-3.5"
              >
                {/* Top status & date row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                      {badge.label}
                    </span>

                    {apt.status === 'pendiente' && (
                      <span className="text-[11px] text-amber-400/80 animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Esperando confirmación del barbero
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-medium text-zinc-400">
                    Cita #{apt.id.slice(-6).toUpperCase()}
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-zinc-400 text-xs">
                      <Scissors className="w-3.5 h-3.5 text-amber-400" />
                      <span>{apt.businessName}</span>
                      <span className="font-mono text-[10px] text-zinc-500">({apt.businessCode})</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white">
                      {apt.serviceName}
                    </h3>

                    <p className="text-xs text-zinc-300">
                      Barbero:{' '}
                      <strong className="text-amber-300">{apt.barberName}</strong>
                    </p>

                    {apt.notes && (
                      <p className="text-xs text-zinc-400 italic bg-zinc-950/60 p-2 rounded-lg border border-zinc-800">
                        "{apt.notes}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:text-right flex flex-col justify-between">
                    <div>
                      <div className="flex sm:justify-end items-center gap-1.5 text-xs text-emerald-400 font-bold">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDominicanDate(apt.date)}</span>
                      </div>
                      <div className="flex sm:justify-end items-center gap-1.5 text-sm sm:text-base text-zinc-100 font-black mt-0.5">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>{formatTime12h(apt.time)}</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs text-zinc-400 block">Total del servicio:</span>
                      <span className="text-base sm:text-lg font-black text-amber-400">
                        {formatRD(apt.servicePrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reschedule Proposal Alert Banner */}
                {apt.status === 'cambio_propuesto' && (
                  <div className="bg-gradient-to-r from-cyan-950/50 via-cyan-950/30 to-zinc-950 border border-cyan-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          La Barbería te Propone un Nuevo Horario
                        </span>
                        <p className="text-xs text-zinc-300">
                          El horario solicitado originalmente no estaba disponible. Te ofrecen el siguiente turno:
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>Nueva Fecha: {formatDominicanDate(apt.proposedDate || apt.date)}</span>
                      </div>
                      <div className="h-4 w-px bg-zinc-700 hidden sm:block" />
                      <div className="flex items-center gap-1.5 text-xs text-amber-400 font-black">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span>Nueva Hora: {formatTime12h(apt.proposedTime || apt.time)}</span>
                      </div>
                    </div>

                    {apt.rescheduleNote && (
                      <div className="text-xs text-zinc-300 bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-500/20">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Mensaje de la Barbería:</span>
                        "{apt.rescheduleNote}"
                      </div>
                    )}

                    {/* Buttons to accept or reject */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        onClick={() => handleRespondReschedule(apt.id, true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Aceptar Nuevo Horario</span>
                      </button>

                      <button
                        onClick={() => handleRespondReschedule(apt.id, false)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-rose-950/60 text-rose-300 hover:text-white font-semibold text-xs rounded-xl border border-zinc-700 hover:border-rose-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <X className="w-4 h-4" />
                        <span>Rechazar Propuesta</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Actions bottom bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
                  <a
                    href={getWhatsAppLink(
                      apt.businessPhone,
                      `Hola ${apt.businessName}, te escribo respecto a mi cita de ${apt.serviceName} para el ${apt.date} a las ${apt.time}. Soy ${apt.clientName}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp con la Barbería</span>
                  </a>

                  {isActionable && (
                    <button
                      onClick={() => setCancelModalApt(apt)}
                      className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancelar Cita</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 text-white space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-base">¿Cancelar esta cita?</h3>
            </div>

            <p className="text-xs text-zinc-300">
              ¿Estás seguro de cancelar tu cita de <strong className="text-white">{cancelModalApt.serviceName}</strong> con <strong className="text-white">{cancelModalApt.barberName}</strong> para el {formatDominicanDate(cancelModalApt.date)}?
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalApt(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                No, mantenerla
              </button>
              <button
                onClick={() => handleCancelAppointment(cancelModalApt.id)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
