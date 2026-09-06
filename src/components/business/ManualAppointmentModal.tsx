import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, User, Phone, Scissors, Check, AlertCircle } from 'lucide-react';
import { Business, Service, Barber } from '../../types';
import { useNovaDb } from '../../lib/store';
import { formatRD, generateTimeSlots, formatDominicanDate } from '../../lib/utils';

interface ManualAppointmentModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManualAppointmentModal: React.FC<ManualAppointmentModalProps> = ({
  business,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { db, appointments } = useNovaDb();

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    business.services[0]?.id || ''
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    business.barbers[0]?.id || ''
  );
  const [date, setDate] = useState<string>(todayStr);
  const [time, setTime] = useState<string>('10:00');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available time slots based on business hours
  const timeSlots = useMemo(() => {
    return generateTimeSlots(
      business.openingHour || '09:00',
      business.closingHour || '20:00',
      30
    );
  }, [business.openingHour, business.closingHour]);

  // Selected entities
  const selectedService = business.services.find((s) => s.id === selectedServiceId);
  const selectedBarber = business.barbers.find((b) => b.id === selectedBarberId);

  // Check conflicts for this barber at this date/time
  const isConflict = useMemo(() => {
    if (!selectedBarberId || !date || !time) return false;
    return appointments.some(
      (a) =>
        a.businessId === business.id &&
        a.barberId === selectedBarberId &&
        a.date === date &&
        a.time === time &&
        (a.status === 'confirmada' || a.status === 'pendiente')
    );
  }, [appointments, business.id, selectedBarberId, date, time]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!clientName.trim()) {
      setErrorMsg('Por favor introduce el nombre del cliente');
      return;
    }
    if (!clientPhone.trim()) {
      setErrorMsg('Por favor introduce el teléfono del cliente');
      return;
    }
    if (!selectedService) {
      setErrorMsg('Selecciona un servicio válido');
      return;
    }
    if (!selectedBarber) {
      setErrorMsg('Selecciona un barbero disponible');
      return;
    }
    if (!date) {
      setErrorMsg('Selecciona la fecha de la cita');
      return;
    }
    if (!time) {
      setErrorMsg('Selecciona la hora de la cita');
      return;
    }

    if (isConflict) {
      setErrorMsg(
        `El barbero ${selectedBarber.name} ya tiene una cita reservada el ${date} a las ${time}. Por favor selecciona otro horario.`
      );
      return;
    }

    setSubmitting(true);
    try {
      db.bookAppointmentByBusiness({
        businessId: business.id,
        businessName: business.name,
        businessCode: business.code,
        businessPhone: business.phone,
        clientId: 'manual-walkin',
        clientName: clientName.trim(),
        clientEmail: '',
        clientPhone: clientPhone.trim(),
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        serviceDuration: selectedService.duration,
        barberId: selectedBarber.id,
        barberName: selectedBarber.name,
        date,
        time,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setClientName('');
      setClientPhone('');
      setNotes('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al registrar la cita.');
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
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Agendar Cita Manual
              </h3>
              <p className="text-xs text-zinc-400">
                Registra la cita directamente para clientes que llamen o no usen la app
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Nombre del Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Juan Pérez"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                Celular / WhatsApp *
              </label>
              <input
                type="tel"
                required
                placeholder="Ej. 809-555-0123"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          {/* Service selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              Seleccionar Corte / Servicio del Perfil *
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              {business.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {formatRD(s.price)} (~{s.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Barber selection */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Barbero Asignado *
            </label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            >
              {business.barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.nickname ? `(${b.nickname})` : ''} — {b.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Fecha *
              </label>
              <input
                type="date"
                required
                value={date}
                min={todayStr}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Hora *
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
              >
                {timeSlots.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isConflict && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                ¡Atención! Ya existe una cita agendada para {selectedBarber?.name} a las {time}.
              </span>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1.5">
              Notas Adicionales (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Viene por recomendación, diseño especial en la ceja..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
            />
          </div>

          {/* Summary */}
          {selectedService && (
            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-zinc-400 block">Total a facturar:</span>
                <span className="font-bold text-white">{selectedService.name}</span>
              </div>
              <span className="text-base font-black text-amber-400">
                {formatRD(selectedService.price)}
              </span>
            </div>
          )}

          {/* Submit buttons */}
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
              className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Agendando...' : 'Confirmar y Agendar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
