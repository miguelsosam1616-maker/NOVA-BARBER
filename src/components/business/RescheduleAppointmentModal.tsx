import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, Send, AlertCircle, RefreshCw, User, Scissors } from 'lucide-react';
import { Appointment, Business } from '../../types';
import { useNovaDb } from '../../lib/store';
import { formatRD, formatDominicanDate, formatTime12h, generateTimeSlots } from '../../lib/utils';

interface RescheduleAppointmentModalProps {
  business: Business;
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RescheduleAppointmentModal: React.FC<RescheduleAppointmentModalProps> = ({
  business,
  appointment,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { db } = useNovaDb();

  // Today string
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [proposedDate, setProposedDate] = useState<string>(
    appointment?.date || todayStr
  );
  const [proposedTime, setProposedTime] = useState<string>(
    appointment?.time || '14:00'
  );
  const [rescheduleNote, setRescheduleNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Time slots based on business working hours
  const timeSlots = useMemo(() => {
    return generateTimeSlots(
      business.openingHour || '09:00',
      business.closingHour || '20:00',
      30
    );
  }, [business.openingHour, business.closingHour]);

  if (!isOpen || !appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!proposedDate) {
      setErrorMsg('Selecciona la nueva fecha para la cita');
      return;
    }
    if (!proposedTime) {
      setErrorMsg('Selecciona el nuevo horario disponible');
      return;
    }

    if (proposedDate === appointment.date && proposedTime === appointment.time) {
      setErrorMsg('Debes seleccionar una fecha u hora diferente a la actual');
      return;
    }

    setSubmitting(true);
    try {
      const defaultNote =
        rescheduleNote.trim() ||
        `Hola ${appointment.clientName}, no disponemos de ese horario exacto. Te proponemos mover tu cita para el ${formatDominicanDate(proposedDate)} a las ${formatTime12h(proposedTime)}. ¿Nos confirmas si te queda bien?`;

      db.proposeReschedule(
        appointment.id,
        proposedDate,
        proposedTime,
        defaultNote
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar la solicitud de cambio de horario');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-white shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <RefreshCw className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Proponer Nuevo Horario / Reemplazar Cita
              </h3>
              <p className="text-xs text-zinc-400">
                Envía una solicitud al cliente para que acepte o rechace la nueva hora
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current Appointment Snapshot */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
            Cita Actual Programada
          </span>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-zinc-400 block">Cliente:</span>
              <strong className="text-white flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                {appointment.clientName}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Servicio:</span>
              <strong className="text-white flex items-center gap-1">
                <Scissors className="w-3.5 h-3.5 text-purple-400" />
                {appointment.serviceName} ({formatRD(appointment.servicePrice)})
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Fecha actual:</span>
              <strong className="text-emerald-400">
                {formatDominicanDate(appointment.date)}
              </strong>
            </div>
            <div>
              <span className="text-zinc-400 block">Hora actual:</span>
              <strong className="text-amber-400">
                {formatTime12h(appointment.time)}
              </strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Proposed Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Nueva Fecha Propuesta *
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Nueva Hora Disponible *
              </label>
              <select
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-cyan-400"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {formatTime12h(slot)} ({slot})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason / Note to Client */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Motivo o Mensaje para el Cliente
            </label>
            <textarea
              rows={3}
              placeholder="Ej. A esa hora estaremos ocupados con un corte largo, ¿te parece bien venir a las 4:30 PM?"
              value={rescheduleNote}
              onChange={(e) => setRescheduleNote(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-cyan-400 resize-none"
            />
            <span className="text-[11px] text-zinc-500 block mt-1">
              El cliente recibirá esta solicitud en tiempo real en su panel y podrá aceptarla con un solo toque.
            </span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-black rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-600/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Enviando...' : 'Enviar Solicitud al Cliente'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
