import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Scissors,
  MessageSquare,
  ShieldCheck,
  Users,
  Edit3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Business, Service, Barber, Appointment } from '../../types';
import { useNovaDb } from '../../lib/store';
import { TimeWheelPicker } from '../common/TimeWheelPicker';
import {
  formatRD,
  formatDominicanDate,
  formatTime12h,
  generateTimeSlots,
  getWhatsAppLink,
  isTimeWithinBusinessHours,
} from '../../lib/utils';

interface BookingModalProps {
  business: Business;
  preselectedService?: Service | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  business,
  preselectedService,
  isOpen,
  onClose,
  onBookingSuccess,
}) => {
  const { db, client, appointments } = useNovaDb();

  // Booking form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    preselectedService?.id || (business.services[0]?.id ?? '')
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>('any'); // 'any' or barber.id

  // Today's date YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCustomTimeMode, setIsCustomTimeMode] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [clientName, setClientName] = useState<string>(client.name || 'Miguel Sosa');
  const [clientPhone, setClientPhone] = useState<string>(client.phone || '8095550142');
  const [notes, setNotes] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedApt, setConfirmedApt] = useState<Appointment | null>(null);

  // Sync selected service when preselectedService changes
  const preselectedServiceId = preselectedService?.id;
  React.useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
    }
  }, [preselectedServiceId]);

  const selectedService = business.services.find((s) => s.id === selectedServiceId) || business.services[0];
  const activeBarbers = useMemo(() => (business.barbers || []).filter((b) => b.active), [business.barbers]);

  // Barber chosen or fallback to business schedule
  const chosenBarber = useMemo(() => {
    if (selectedBarberId === 'any') return null;
    return activeBarbers.find((b) => b.id === selectedBarberId) || null;
  }, [selectedBarberId, activeBarbers]);

  const effectiveMinTime = chosenBarber?.workHours?.start || business.openingHour || '09:00';
  const effectiveMaxTime = chosenBarber?.workHours?.end || business.closingHour || '20:00';

  // Active queue for the selected date (clients who scheduled and are waiting for their turn)
  const activeQueueForDate = useMemo(() => {
    return appointments.filter(
      (apt) =>
        apt.businessId === business.id &&
        apt.date === selectedDate &&
        (apt.status === 'pendiente' || apt.status === 'confirmada')
    );
  }, [appointments, business.id, selectedDate]);

  // Generate available time slots for the selected date (strictly between opening and closing hours of chosen barber/business)
  const allTimeSlots = useMemo(() => {
    return generateTimeSlots(
      effectiveMinTime,
      effectiveMaxTime,
      business.slotDurationMinutes || 30
    );
  }, [effectiveMinTime, effectiveMaxTime, business.slotDurationMinutes]);

  // Real-time slot availability check
  const availableSlotsWithStatus = useMemo(() => {
    return allTimeSlots.map((time) => {
      let isAvailable = true;
      let bookedBarberNames: string[] = [];

      // Find all bookings for this business, date, and time that are not rejected or cancelled
      const activeBookings = appointments.filter(
        (apt) =>
          apt.businessId === business.id &&
          apt.date === selectedDate &&
          apt.time === time &&
          apt.status !== 'rechazada' &&
          apt.status !== 'cancelada'
      );

      if (selectedBarberId === 'any') {
        // "Cualquier barbero": slot is unavailable only if ALL barbers are booked
        const bookedBarberIds = new Set(activeBookings.map((a) => a.barberId));
        const freeBarbers = activeBarbers.filter((b) => !bookedBarberIds.has(b.id));
        isAvailable = freeBarbers.length > 0;
        bookedBarberNames = activeBookings.map((a) => a.barberName);
      } else {
        // Specific barber
        const isBooked = activeBookings.some((a) => a.barberId === selectedBarberId);
        isAvailable = !isBooked;
        if (isBooked) {
          bookedBarberNames.push(activeBarbers.find((b) => b.id === selectedBarberId)?.name || 'Barbero');
        }
      }

      return {
        time,
        isAvailable,
        bookedBarberNames,
      };
    });
  }, [allTimeSlots, appointments, business.id, selectedDate, selectedBarberId, activeBarbers]);

  // Real-time conflict detection with immediate resolution options
  const conflictInfo = useMemo(() => {
    if (!selectedTime) {
      return { hasConflict: false, barberName: '', message: '', freeBarbers: [], otherSlots: [] };
    }

    // Active bookings at this business, date, and exact time
    const busyBookings = appointments.filter(
      (apt) =>
        apt.businessId === business.id &&
        apt.date === selectedDate &&
        apt.time === selectedTime &&
        apt.status !== 'rechazada' &&
        apt.status !== 'cancelada'
    );

    if (selectedBarberId === 'any') {
      const bookedBarberIds = new Set(busyBookings.map((a) => a.barberId));
      const freeBarbers = activeBarbers.filter((b) => !bookedBarberIds.has(b.id));
      if (freeBarbers.length === 0) {
        return {
          hasConflict: true,
          barberName: 'Todos los peluqueros',
          message: `Todos los peluqueros ya tienen una cita a las ${formatTime12h(selectedTime)} el ${formatDominicanDate(selectedDate)}.`,
          freeBarbers: [],
          otherSlots: allTimeSlots
            .filter((t) => {
              const bookedAtT = new Set(
                appointments
                  .filter(
                    (a) =>
                      a.businessId === business.id &&
                      a.date === selectedDate &&
                      a.time === t &&
                      a.status !== 'rechazada' &&
                      a.status !== 'cancelada'
                  )
                  .map((a) => a.barberId)
              );
              return activeBarbers.some((b) => !bookedAtT.has(b.id));
            })
            .slice(0, 4),
        };
      }
      return { hasConflict: false, barberName: '', message: '', freeBarbers, otherSlots: [] };
    }

    // Specific barber selected
    const chosenBarber = activeBarbers.find((b) => b.id === selectedBarberId);
    const barberBooking = busyBookings.find((a) => a.barberId === selectedBarberId);

    if (barberBooking && chosenBarber) {
      // Find OTHER active barbers in this business who are FREE at this date & time
      const bookedBarberIds = new Set(busyBookings.map((a) => a.barberId));
      const otherAvailableBarbers = activeBarbers.filter(
        (b) => b.id !== selectedBarberId && !bookedBarberIds.has(b.id)
      );

      // Find other available slots for THIS barber on this date
      const otherFreeSlotsForBarber = allTimeSlots
        .filter((t) => {
          if (t === selectedTime) return false;
          return !appointments.some(
            (a) =>
              a.businessId === business.id &&
              a.date === selectedDate &&
              a.time === t &&
              a.barberId === selectedBarberId &&
              a.status !== 'rechazada' &&
              a.status !== 'cancelada'
          );
        })
        .slice(0, 4);

      return {
        hasConflict: true,
        barberName: chosenBarber.name,
        message: `El peluquero ${chosenBarber.name} ya tiene una cita agendada primero a las ${formatTime12h(selectedTime)} para esta fecha.`,
        freeBarbers: otherAvailableBarbers,
        otherSlots: otherFreeSlotsForBarber,
      };
    }

    return { hasConflict: false, barberName: '', message: '', freeBarbers: [], otherSlots: [] };
  }, [selectedTime, selectedBarberId, selectedDate, appointments, business.id, activeBarbers, allTimeSlots]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setSelectedTime('');
    setCustomTimeInput('');
    setErrorMessage('');
  };

  const handleBarberSelect = (barberId: string) => {
    setSelectedBarberId(barberId);
    setErrorMessage('');
  };

  const handleCustomTimeChange = (timeValue: string) => {
    setCustomTimeInput(timeValue);
    setErrorMessage('');

    if (!timeValue) {
      setSelectedTime('');
      return;
    }

    if (!isTimeWithinBusinessHours(timeValue, effectiveMinTime, effectiveMaxTime)) {
      const entityName = chosenBarber ? `El barbero ${chosenBarber.name}` : 'La barbería';
      setErrorMessage(
        `${entityName} solo atiende de ${formatTime12h(effectiveMinTime)} a ${formatTime12h(
          effectiveMaxTime
        )}. Por favor selecciona una hora dentro de su horario laboral configurado.`
      );
      setSelectedTime('');
      return;
    }

    setSelectedTime(timeValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedService) {
      setErrorMessage('Por favor selecciona un servicio.');
      return;
    }
    if (!selectedDate) {
      setErrorMessage('Por favor selecciona una fecha para tu cita.');
      return;
    }
    if (!selectedTime) {
      setErrorMessage('Por favor selecciona un horario disponible.');
      return;
    }
    if (!clientName.trim()) {
      setErrorMessage('Por favor introduce tu nombre completo.');
      return;
    }
    if (!clientPhone.trim() || clientPhone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Por favor introduce un número de teléfono/WhatsApp válido.');
      return;
    }

    setIsSubmitting(true);

    // Resolve barber
    let assignedBarber: Barber | undefined;
    if (selectedBarberId === 'any') {
      // Pick first available barber at this time
      const activeBookings = appointments.filter(
        (apt) =>
          apt.businessId === business.id &&
          apt.date === selectedDate &&
          apt.time === selectedTime &&
          apt.status !== 'rechazada' &&
          apt.status !== 'cancelada'
      );
      const bookedBarberIds = new Set(activeBookings.map((a) => a.barberId));
      assignedBarber = activeBarbers.find((b) => !bookedBarberIds.has(b.id)) || activeBarbers[0];
    } else {
      assignedBarber = activeBarbers.find((b) => b.id === selectedBarberId);
    }

    const barberNameDisplay = assignedBarber
      ? `${assignedBarber.name}${assignedBarber.nickname ? ` (${assignedBarber.nickname})` : ''}`
      : 'Barbero asignado';

    const result = db.requestAppointment({
      businessId: business.id,
      businessCode: business.code,
      businessName: business.name,
      businessPhone: business.phone,
      clientId: client.id,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      clientEmail: client.email || 'cliente@novabarber.do',
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      serviceDuration: selectedService.duration,
      barberId: assignedBarber ? assignedBarber.id : 'barb-default',
      barberName: barberNameDisplay,
      date: selectedDate,
      time: selectedTime,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'No se pudo agendar la cita en este horario.');
      return;
    }

    if (result.appointment) {
      setConfirmedApt(result.appointment);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      onBookingSuccess(result.appointment);
    }
  };

  const handleResetModal = () => {
    setConfirmedApt(null);
    setSelectedTime('');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetModal}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl text-white overflow-hidden z-10 my-4 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-zinc-100">
                  {confirmedApt ? '¡Cita Solicitada con Éxito!' : 'Reservar Cita en Tiempo Real'}
                </h3>
                <p className="text-xs text-zinc-400">{business.name}</p>
              </div>
            </div>
            <button
              onClick={handleResetModal}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {confirmedApt ? (
              /* Success confirmation state */
              <div className="text-center py-4 space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
                    🟡 Estado: Pendiente de Confirmación
                  </span>
                  <h4 className="text-xl font-black text-white">
                    ¡Tu solicitud fue enviada en vivo al negocio!
                  </h4>
                  <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-md mx-auto">
                    El dueño de <strong className="text-zinc-200">{business.name}</strong> acaba de recibir la notificación. Te notificaremos de inmediato cuando sea aceptada.
                  </p>
                </div>

                {/* Appointment Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-3 max-w-md mx-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs text-zinc-400">Servicio solicitado:</span>
                    <span className="text-sm font-bold text-amber-400">
                      {confirmedApt.serviceName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs text-zinc-400">Precio estimado:</span>
                    <span className="text-sm font-bold text-white">
                      {formatRD(confirmedApt.servicePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs text-zinc-400">Barbero:</span>
                    <span className="text-sm font-medium text-zinc-200">
                      {confirmedApt.barberName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                    <span className="text-xs text-zinc-400">Fecha y Hora:</span>
                    <span className="text-sm font-bold text-emerald-400">
                      {formatDominicanDate(confirmedApt.date)} a las {formatTime12h(confirmedApt.time)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Cliente:</span>
                    <span className="text-xs font-medium text-zinc-300">
                      {confirmedApt.clientName} ({confirmedApt.clientPhone})
                    </span>
                  </div>
                </div>

                {/* WhatsApp button */}
                <div className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto pt-2">
                  <a
                    href={getWhatsAppLink(
                      business.phone,
                      `Hola ${business.name}, acabo de solicitar una cita en Nova Barber para ${confirmedApt.serviceName} con ${confirmedApt.barberName} el ${confirmedApt.date} a las ${confirmedApt.time}. Soy ${confirmedApt.clientName}.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Avisar por WhatsApp RD
                  </a>
                  <button
                    onClick={handleResetModal}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm rounded-xl transition-colors"
                  >
                    Cerrar y Ver Mis Citas
                  </button>
                </div>
              </div>
            ) : (
              /* Booking Form */
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Step 1: Select Service */}
                <div>
                  <div className="p-3 mb-4 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          Fila del día ({formatDominicanDate(selectedDate)}): {activeQueueForDate.length}{' '}
                          {activeQueueForDate.length === 1 ? 'cliente' : 'clientes'} en espera
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Horario de atención: {formatTime12h(business.openingHour || '09:00')} a{' '}
                          {formatTime12h(business.closingHour || '20:00')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold rounded-lg shrink-0">
                      #{activeQueueForDate.length + 1} en fila
                    </span>
                  </div>

                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    1. Selecciona el Servicio
                  </label>
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {business.services
                      .filter((s) => s.active)
                      .map((srv) => {
                        const isSelected = srv.id === selectedServiceId;
                        return (
                          <div
                            key={srv.id}
                            onClick={() => setSelectedServiceId(srv.id)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-500/10'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {srv.image ? (
                                <img
                                  src={srv.image}
                                  alt={srv.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-700"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0">
                                  <Scissors className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h5 className="font-semibold text-sm text-zinc-100 truncate">
                                  {srv.name}
                                </h5>
                                <p className="text-[11px] text-zinc-400 line-clamp-1">
                                  {srv.description}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className="font-bold text-sm text-amber-400 block">
                                {formatRD(srv.price)}
                              </span>
                              <span className="text-[10px] text-zinc-400">~{srv.duration} min</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Step 2: Select Barber */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    2. ¿Con quién deseas tu servicio?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Option: Any barber */}
                    <div
                      onClick={() => handleBarberSelect('any')}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        selectedBarberId === 'any'
                          ? 'bg-amber-500/15 border-amber-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shrink-0 text-xs font-bold">
                        ⚡
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate text-zinc-100">
                          Cualquiera
                        </span>
                        <span className="text-[10px] text-zinc-400 block truncate">
                          Primer libre
                        </span>
                      </div>
                    </div>

                    {/* Specific Barbers */}
                    {activeBarbers.map((barber) => {
                      const isSelected = selectedBarberId === barber.id;
                      const barberQueueCount = activeQueueForDate.filter(
                        (a) => a.barberId === barber.id
                      ).length;

                      return (
                        <div
                          key={barber.id}
                          onClick={() => handleBarberSelect(barber.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all relative ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                          }`}
                        >
                          <img
                            src={barber.avatar}
                            alt={barber.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-700"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold block truncate text-zinc-100">
                              {barber.name.split(' ')[0]}
                            </span>
                            <span className="text-[10px] text-amber-400 block truncate">
                              {barberQueueCount > 0 ? `${barberQueueCount} en fila hoy` : 'Libre hoy'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Select Date */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      3. Selecciona la Fecha
                    </label>
                    <span className="text-xs text-amber-400 font-medium">
                      {formatDominicanDate(selectedDate)}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="date"
                      min={todayStr}
                      value={selectedDate}
                      onChange={handleDateChange}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-hidden focus:border-amber-500"
                    />
                    <CalendarIcon className="w-4 h-4 text-zinc-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Step 4: Real-time Available Slots & Personalized Time */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      4. Horario ({formatTime12h(effectiveMinTime)} a {formatTime12h(effectiveMaxTime)})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMode = !isCustomTimeMode;
                        setIsCustomTimeMode(nextMode);
                        setErrorMessage('');
                        if (nextMode && !customTimeInput && !selectedTime) {
                          handleCustomTimeChange(effectiveMinTime);
                        }
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isCustomTimeMode ? 'Ver bloques de 30 min' : 'Personalizar mi hora (Rueda)'}
                    </button>
                  </div>

                  {/* Mode A: Custom time written by client with Alarm Clock Wheel Picker */}
                  {isCustomTimeMode ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-zinc-300 font-bold">
                          Escribe la hora exacta que deseas:
                        </span>
                        <span className="text-[11px] text-amber-400 font-mono">
                          {chosenBarber ? `${chosenBarber.name}: ` : 'Horario: '}
                          {formatTime12h(effectiveMinTime)} a {formatTime12h(effectiveMaxTime)}
                        </span>
                      </div>

                      <TimeWheelPicker
                        value={customTimeInput || selectedTime || effectiveMinTime}
                        minTime={effectiveMinTime}
                        maxTime={effectiveMaxTime}
                        barberName={chosenBarber ? chosenBarber.name : business.name}
                        stepMinutes={30}
                        onChange={(newTime24) => {
                          handleCustomTimeChange(newTime24);
                        }}
                      />
                    </div>
                  ) : (
                    /* Mode B: Pre-generated slots */
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1 bg-zinc-900/40 rounded-xl border border-zinc-900">
                      {availableSlotsWithStatus.map((slot) => {
                        const isSelected = selectedTime === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.isAvailable}
                            onClick={() => {
                              setSelectedTime(slot.time);
                              setCustomTimeInput(slot.time);
                              setErrorMessage('');
                            }}
                            className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all border ${
                              !slot.isAvailable
                                ? 'bg-zinc-900/50 border-zinc-800/40 text-zinc-600 line-through cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-md shadow-amber-500/20'
                                : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600'
                            }`}
                          >
                            {formatTime12h(slot.time)}
                            {!slot.isAvailable && (
                              <span className="block text-[9px] text-zinc-600">Ocupado</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Conflict resolution card when a barber already has an appointment at this exact hour */}
                  {conflictInfo.hasConflict && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <h6 className="text-xs sm:text-sm font-bold text-amber-300">
                            {conflictInfo.message}
                          </h6>
                          <p className="text-[11px] text-zinc-300 mt-0.5">
                            El sistema previene doble cita para el mismo barbero. Puedes resolverlo eligiendo una opción:
                          </p>
                        </div>
                      </div>

                      {/* Option 1: Switch to another barber available at this time */}
                      {conflictInfo.freeBarbers.length > 0 && (
                        <div className="pt-2 border-t border-amber-500/20">
                          <span className="text-[11px] font-bold text-zinc-200 block mb-1.5 flex items-center gap-1">
                            <Scissors className="w-3.5 h-3.5 text-amber-400" />
                            Opción 1: Recortarte a las {formatTime12h(selectedTime)} con otro peluquero disponible:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {conflictInfo.freeBarbers.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBarberId(b.id);
                                  setErrorMessage('');
                                }}
                                className="p-2 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-left flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <img
                                  src={b.avatar}
                                  alt={b.name}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-amber-400/40"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">
                                    {b.name}
                                  </span>
                                  <span className="text-[10px] text-amber-400 block truncate">
                                    {b.nickname ? `"${b.nickname}"` : 'Disponible a esta hora'}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Option 2: Select other free slots for this same barber */}
                      {conflictInfo.otherSlots.length > 0 && (
                        <div className="pt-2 border-t border-amber-500/20">
                          <span className="text-[11px] font-bold text-zinc-200 block mb-1.5 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            Opción 2: Elegir otra hora disponible con {conflictInfo.barberName}:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {conflictInfo.otherSlots.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  setSelectedTime(slot);
                                  setCustomTimeInput(slot);
                                  setErrorMessage('');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:border-amber-400 hover:text-amber-300 transition-all cursor-pointer"
                              >
                                {formatTime12h(slot)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Option 3: Direct WhatsApp link to barber / business */}
                      <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-[11px] text-zinc-400">
                          ¿Prefieres consultar por WhatsApp directamente?
                        </span>
                        <a
                          href={getWhatsAppLink(
                            business.phone,
                            `Hola ${business.name}, vi que ${conflictInfo.barberName} ya tiene cita agendada a las ${formatTime12h(
                              selectedTime
                            )} el ${selectedDate}. Quisiera consultar disponibilidad.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Consultar por WhatsApp
                        </a>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Step 5: Customer Details */}
                <div className="space-y-3 pt-2 border-t border-zinc-800/80">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    5. Datos del Cliente
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Tu Nombre:</span>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder="Ej: Miguel Sosa"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 pl-9 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-500"
                        />
                        <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">WhatsApp / Teléfono (RD):</span>
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          placeholder="Ej: (809) 555-0142"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 pl-9 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-500"
                        />
                        <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-zinc-400 block mb-1">
                      Nota para el barbero (opcional):
                    </span>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Preferencia de corte, degradado bajo o toalla caliente extra..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedTime || conflictInfo.hasConflict}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                      !selectedTime || isSubmitting || conflictInfo.hasConflict
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 hover:from-amber-400 hover:to-amber-300 shadow-amber-500/20 cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      'Enviando solicitud en vivo...'
                    ) : conflictInfo.hasConflict ? (
                      'Horario Ocupado con este Barbero - Elige una opción arriba'
                    ) : selectedTime ? (
                      <>
                        <span>Solicitar Cita para {formatTime12h(selectedTime)}</span>
                        <span className="text-xs font-semibold bg-zinc-950/20 px-2 py-0.5 rounded-full">
                          {formatRD(selectedService.price)}
                        </span>
                      </>
                    ) : (
                      'Elige una hora para continuar'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
