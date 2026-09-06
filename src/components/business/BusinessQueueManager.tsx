import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Users,
  Clock,
  Scissors,
  DollarSign,
  PlusCircle,
  CheckCircle2,
  Lock,
  Printer,
  FileText,
  Trash2,
  Play,
  Check,
  AlertCircle,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  CreditCard,
  Banknote,
  Receipt,
  User,
} from 'lucide-react';
import { Business, QueueEntry, DailyClosure, DailyClosureItem } from '../../types';
import { useNovaDb } from '../../lib/store';
import {
  formatRD,
  formatDominicanDate,
  formatTime12h,
} from '../../lib/utils';

interface BusinessQueueManagerProps {
  business: Business;
}

export const BusinessQueueManager: React.FC<BusinessQueueManagerProps> = ({ business }) => {
  const { db, queue, dailyClosures, appointments } = useNovaDb();

  // Active view tab: 'queue' (Fila en Vivo) | 'closure' (Cierre y Historial)
  const [activeTab, setActiveTab] = useState<'queue' | 'closure'>('queue');

  // Today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Current time string HH:MM
  const currentTimeStr = useMemo(() => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }, []);

  // Form states for registering a new walk-in client
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    business.services[0]?.id || ''
  );
  const [selectedBarberId, setSelectedBarberId] = useState<string>(
    business.barbers[0]?.id || ''
  );
  const [arrivalTime, setArrivalTime] = useState(currentTimeStr);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Payment modal state for completing a queue item
  const [checkoutItem, setCheckoutItem] = useState<QueueEntry | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo');

  // Daily closure confirmation modal
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [closureNotes, setClosureNotes] = useState('');
  const [closedByName, setClosedByName] = useState('Administración / Encargado');

  // Selected closure for printable PDF preview
  const [viewingClosure, setViewingClosure] = useState<DailyClosure | null>(null);

  // Filter today's queue items for this business
  const todayQueue = useMemo(() => {
    return queue.filter((q) => q.businessId === business.id && q.date === todayStr);
  }, [queue, business.id, todayStr]);

  const waitingItems = todayQueue.filter((q) => q.status === 'en_espera');
  const inChairItems = todayQueue.filter((q) => q.status === 'atendiendo');
  const completedQueueItems = todayQueue.filter((q) => q.status === 'completado');

  // Today's summary of sales (combining completed walk-ins + completed web appointments)
  const todaySummary = useMemo(() => {
    return db.getTodaySalesSummary(business.id);
  }, [db, business.id, queue, appointments]);

  // Closures history for this business
  const bizClosures = useMemo(() => {
    return dailyClosures
      .filter((c) => c.businessId === business.id)
      .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  }, [dailyClosures, business.id]);

  // Handle register walk-in client
  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!clientName.trim()) {
      setFormError('Introduce el nombre del cliente');
      return;
    }

    const service = business.services.find((s) => s.id === selectedServiceId);
    if (!service) {
      setFormError('Selecciona un servicio válido');
      return;
    }

    const barber = business.barbers.find((b) => b.id === selectedBarberId);
    if (!barber) {
      setFormError('Selecciona un barbero disponible');
      return;
    }

    db.addToQueue({
      businessId: business.id,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || undefined,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.price,
      serviceDuration: service.duration,
      barberId: barber.id,
      barberName: barber.name,
      arrivalTime: arrivalTime || currentTimeStr,
      date: todayStr,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setClientName('');
    setClientPhone('');
    setNotes('');
    setArrivalTime(currentTimeStr);

    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.6 },
    });
  };

  // Open checkout modal for completing and charging
  const openCheckout = (item: QueueEntry) => {
    setCheckoutItem(item);
    setPaidAmount(item.servicePrice);
    setPaymentMethod('efectivo');
  };

  // Confirm checkout and mark completed
  const handleConfirmCheckout = () => {
    if (!checkoutItem) return;

    db.updateQueueStatus(
      checkoutItem.id,
      'completado',
      {
        paidAmount,
        paymentMethod,
      }
    );

    setCheckoutItem(null);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
    });
  };

  // Handle Close Day
  const handleConfirmCloseDay = () => {
    if (todaySummary.totalRevenue === 0 && todaySummary.items.length === 0) {
      alert('No hay ventas registradas hoy para cerrar.');
      return;
    }

    const closure = db.closeDay(business.id, closedByName.trim() || 'Encargado', closureNotes.trim() || undefined);
    setClosureModalOpen(false);
    setClosureNotes('');
    setViewingClosure(closure); // Show the printed summary immediately!

    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.5 },
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-400" />
              Fila de Espera & Cierre de Ventas
            </h1>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
              En Vivo 🟢
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Registra clientes que llegan sin cita, cuenta ingresos diarios y genera el cierre contable con impresión / PDF.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 shrink-0">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Fila en Vivo ({waitingItems.length + inChairItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('closure')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'closure'
                ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Cierre Diario & Historial</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            En Espera
          </span>
          <span className="text-2xl font-black text-white">
            {waitingItems.length}
          </span>
          <p className="text-[11px] text-zinc-500">Clientes sentados</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 block flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            En la Silla
          </span>
          <span className="text-2xl font-black text-purple-300">
            {inChairItems.length}
          </span>
          <p className="text-[11px] text-zinc-500">Cortándose ahora</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Atendidos Hoy
          </span>
          <span className="text-2xl font-black text-emerald-400">
            {todaySummary.totalCustomers}
          </span>
          <p className="text-[11px] text-zinc-500">Walk-ins + Citas</p>
        </div>

        <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4 space-y-1 bg-gradient-to-br from-zinc-900 to-amber-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Ventas de Hoy
          </span>
          <span className="text-2xl font-black text-amber-400">
            {formatRD(todaySummary.totalRevenue)}
          </span>
          <p className="text-[11px] text-zinc-400">Total acumulado</p>
        </div>
      </div>

      {/* TAB 1: FILA EN VIVO */}
      {activeTab === 'queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Register Walk-in form */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 sticky top-6">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <PlusCircle className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-black text-white">
                    Registrar Cliente que Llega
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Llegó presencialmente y se sentó en la fila
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddToQueue} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Manuel Santos"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Celular (Opcional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ej. 809-555-0123"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-purple-400" />
                    Tipo de Corte / Servicio del Perfil *
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    {business.services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {formatRD(s.price)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Barbero Asignado o Preferido *
                  </label>
                  <select
                    value={selectedBarberId}
                    onChange={(e) => setSelectedBarberId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                  >
                    {business.barbers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.nickname ? `(${b.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      Hora de Llegada
                    </label>
                    <input
                      type="time"
                      value={arrivalTime}
                      onChange={(e) => setArrivalTime(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Nota (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Sin barba"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 hover:from-amber-300 hover:to-amber-400 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Agregar a la Fila de Hoy</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Active Queue List */}
          <div className="lg:col-span-2 space-y-5">
            {/* Being served now */}
            {inChairItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-purple-400" />
                    En la Silla Cortándose Ahora ({inChairItems.length})
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {inChairItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 space-y-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping" />
                            <h4 className="text-sm font-black text-white">
                              {item.clientName}
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-300 mt-0.5">
                            {item.serviceName}
                          </p>
                          <span className="text-xs font-bold text-amber-400 block mt-0.5">
                            {formatRD(item.servicePrice)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md block">
                            Atendiendo
                          </span>
                          <span className="text-[10px] text-zinc-400 block mt-1">
                            Llegó: {item.arrivalTime}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between gap-2">
                        <span className="text-xs text-zinc-300">
                          Barbero: <strong className="text-white">{item.barberName}</strong>
                        </span>

                        <button
                          onClick={() => openCheckout(item)}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Cobrar & Listo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting in line */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Clientes Sentados en Espera ({waitingItems.length})
                </h3>
              </div>

              {waitingItems.length === 0 ? (
                <div className="bg-zinc-900/60 border border-dashed border-zinc-800 rounded-3xl p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-zinc-200">
                    No hay clientes esperando en este momento
                  </p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Cuando un cliente llegue a la barbería, regístralo con el formulario de la izquierda.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {waitingItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-black text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {item.clientName}
                            </h4>
                            {item.clientPhone && (
                              <span className="text-[11px] text-zinc-400">
                                ({item.clientPhone})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300">
                            {item.serviceName} • Barbero: <strong className="text-amber-300">{item.barberName}</strong>
                          </p>
                          {item.notes && (
                            <span className="text-[11px] text-zinc-400 italic block mt-0.5">
                              "{item.notes}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                        <div className="text-left sm:text-right">
                          <span className="text-xs font-black text-amber-400 block">
                            {formatRD(item.servicePrice)}
                          </span>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            Llegó: {item.arrivalTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => db.updateQueueStatus(item.id, 'atendiendo')}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-md shadow-purple-600/20"
                            title="Pasar al cliente a la silla"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>A Silla</span>
                          </button>

                          <button
                            onClick={() => openCheckout(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-md shadow-emerald-600/20"
                            title="Cobrar y marcar listo"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Cobrar</span>
                          </button>

                          <button
                            onClick={() => db.deleteQueueEntry(item.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="El cliente se retiró de la fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completed today from queue */}
            {completedQueueItems.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-zinc-800/80">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                  Clientes de la Fila Atendidos Hoy ({completedQueueItems.length})
                </span>
                <div className="divide-y divide-zinc-800/60 bg-zinc-950/40 rounded-2xl border border-zinc-800/80 overflow-hidden">
                  {completedQueueItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white block">
                          {item.clientName}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {item.serviceName} • {item.barberName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-emerald-400 block">
                          {formatRD(item.paidAmount || item.servicePrice)}
                        </span>
                        <span className="text-[10px] text-zinc-500 uppercase">
                          {item.paymentMethod || 'efectivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CIERRE DIARIO & HISTORIAL */}
      {activeTab === 'closure' && (
        <div className="space-y-6">
          {/* Today's Sales Closure Action Panel */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Receipt className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Cierre de Ventas del Día
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Fecha contable: <strong className="text-zinc-200">{formatDominicanDate(todayStr)}</strong> • Incluye clientes de la fila y citas agendadas completadas.
                </p>
              </div>

              {/* Close Day Button */}
              <button
                onClick={() => setClosureModalOpen(true)}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-zinc-950 font-black text-sm transition-all shadow-xl shadow-amber-500/25 hover:from-amber-300 hover:to-amber-500 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>🔒 Cerrar Día de Ventas</span>
              </button>
            </div>

            {/* Financial Overview of Today */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Total Ingresos de Hoy
                </span>
                <span className="text-3xl font-black text-emerald-400 block">
                  {formatRD(todaySummary.totalRevenue)}
                </span>
                <span className="text-xs text-zinc-500">
                  Dinero total recaudado
                </span>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Total Cortes Realizados
                </span>
                <span className="text-3xl font-black text-white block">
                  {todaySummary.totalCustomers}
                </span>
                <span className="text-xs text-zinc-500">
                  {todaySummary.items.filter((i) => i.origin === 'queue').length} en fila +{' '}
                  {todaySummary.items.filter((i) => i.origin === 'appointment').length} por cita web
                </span>
              </div>

              <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Promedio por Corte
                </span>
                <span className="text-3xl font-black text-amber-400 block">
                  {todaySummary.totalCustomers > 0
                    ? formatRD(Math.round(todaySummary.totalRevenue / todaySummary.totalCustomers))
                    : 'RD$ 0'}
                </span>
                <span className="text-xs text-zinc-500">
                  Ticket promedio
                </span>
              </div>
            </div>

            {/* Itemized List of Today's Sales */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Detalle de Clientes Atendidos Hoy ({todaySummary.items.length})</span>
                <span className="text-emerald-400 font-mono">
                  Suma Total: {formatRD(todaySummary.totalRevenue)}
                </span>
              </h3>

              {todaySummary.items.length === 0 ? (
                <div className="text-center py-8 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                  Aún no se han completado cobros ni citas hoy. Cuando atiendas a un cliente de la fila o marques una cita como lista, aparecerá aquí automáticamente.
                </div>
              ) : (
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead className="bg-zinc-900/90 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">Cliente</th>
                          <th className="py-3 px-4">Tipo de Corte</th>
                          <th className="py-3 px-4">Barbero</th>
                          <th className="py-3 px-4">Hora</th>
                          <th className="py-3 px-4">Origen</th>
                          <th className="py-3 px-4 text-right">Monto Pagado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-medium">
                        {todaySummary.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                            <td className="py-2.5 px-4 text-zinc-500">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-bold text-white">{item.clientName}</td>
                            <td className="py-2.5 px-4 text-amber-300">{item.serviceName}</td>
                            <td className="py-2.5 px-4 text-zinc-300">{item.barberName}</td>
                            <td className="py-2.5 px-4 text-zinc-400">{item.time}</td>
                            <td className="py-2.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                  item.origin === 'queue'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}
                              >
                                {item.origin === 'queue' ? 'Fila Presencial' : 'Cita Web'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-emerald-400">
                              {formatRD(item.paidAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Past Daily Closures History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Historial de Cierres de Ventas
                </h3>
                <p className="text-xs text-zinc-400">
                  Consulta cierres anteriores, reimprime o exporta en formato PDF
                </p>
              </div>
            </div>

            {bizClosures.length === 0 ? (
              <div className="text-center py-12 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 text-zinc-400 text-xs">
                Aún no se han guardado cierres de ventas. Cuando pulses "Cerrar Día de Ventas", el registro completo quedará archivado aquí.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bizClosures.map((closure) => (
                  <div
                    key={closure.id}
                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-xl transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-zinc-800/80 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Lock className="w-4 h-4" />
                          </span>
                          <h4 className="text-base font-black text-white">
                            {formatDominicanDate(closure.date)}
                          </h4>
                        </div>
                        <span className="text-[11px] text-zinc-400 block mt-1">
                          Cerrado por: <strong className="text-zinc-200">{closure.closedByName}</strong>
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-zinc-400 block">Total Recaudado</span>
                        <span className="text-lg font-black text-emerald-400">
                          {formatRD(closure.totalRevenue)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Clientes Atendidos</span>
                        <span className="font-bold text-white text-sm">{closure.totalCustomers} personas</span>
                      </div>
                      <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                        <span className="text-zinc-500 block text-[10px] uppercase font-bold">Hora de Cierre</span>
                        <span className="font-mono text-zinc-300 text-xs">{new Date(closure.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {closure.notes && (
                      <p className="text-xs text-zinc-400 italic bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/60">
                        "{closure.notes}"
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        onClick={() => setViewingClosure(closure)}
                        className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 hover:text-amber-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-zinc-700"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Ver Comprobante / Imprimir / PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CHECKOUT & COBRO DE LA FILA */}
      {checkoutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Banknote className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base">Cobrar & Finalizar Servicio</h3>
              </div>
              <button
                onClick={() => setCheckoutItem(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Cliente:</span>
                <strong className="text-white">{checkoutItem.clientName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Servicio:</span>
                <strong className="text-purple-300">{checkoutItem.serviceName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Barbero:</span>
                <strong className="text-amber-300">{checkoutItem.barberName}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Monto Cobrado (RD$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-base font-black text-amber-400 focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['efectivo', 'transferencia', 'tarjeta'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                        paymentMethod === m
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setCheckoutItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCheckout}
                className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Registrar Cobro</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMAR CIERRE DE DÍA */}
      {closureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-5 sm:p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base">Confirmar Cierre Diario de Ventas</h3>
              </div>
              <button
                onClick={() => setClosureModalOpen(false)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Fecha del Cierre:</span>
                <strong className="text-white">{formatDominicanDate(todayStr)}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Total de Clientes Atendidos:</span>
                <strong className="text-amber-400 font-bold">{todaySummary.totalCustomers} clientes</strong>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Total a Cerrar:</span>
                <strong className="text-base font-black text-emerald-400">
                  {formatRD(todaySummary.totalRevenue)}
                </strong>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Nombre del Responsable que Cierra *
                </label>
                <input
                  type="text"
                  value={closedByName}
                  onChange={(e) => setClosedByName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Notas u Observaciones del Cierre (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Todo cuadrado con caja chica, se cobró 80% en efectivo..."
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setClosureModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseDay}
                className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Confirmar y Guardar Cierre</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: COMPROBANTE DE CIERRE PARA IMPRIMIR O EXPORTAR PDF */}
      {viewingClosure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-6 text-white shadow-2xl space-y-6 my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Action Bar (hidden when printing) */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">Comprobante Oficial de Cierre</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar en PDF</span>
                </button>
                <button
                  onClick={() => setViewingClosure(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PRINTABLE COMPROBANTE CONTENT */}
            <div className="space-y-6 bg-zinc-950 p-6 rounded-2xl border border-zinc-800 print:bg-white print:text-black print:p-0 print:border-none">
              {/* Business Header */}
              <div className="text-center space-y-1 border-b border-zinc-800 pb-4 print:border-zinc-300">
                <h2 className="text-xl sm:text-2xl font-black text-white print:text-black uppercase tracking-tight">
                  {business.name}
                </h2>
                <p className="text-xs text-zinc-400 print:text-zinc-600">
                  {business.address}, {business.city} • Tel: {business.phone}
                </p>
                <p className="text-xs font-mono text-amber-400 print:text-black">
                  Código de Barbería: #{business.code}
                </p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-zinc-900 print:bg-zinc-100 rounded-full text-xs font-bold text-zinc-300 print:text-black uppercase">
                    Comprobante de Cierre Diario de Ventas
                  </span>
                </div>
              </div>

              {/* Metadata row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-b border-zinc-800 pb-4 print:border-zinc-300">
                <div>
                  <span className="text-zinc-500 block">Fecha Contable:</span>
                  <strong className="text-white print:text-black">{formatDominicanDate(viewingClosure.date)}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Hora de Cierre:</span>
                  <strong className="text-white print:text-black font-mono">
                    {new Date(viewingClosure.createdAt).toLocaleTimeString()}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Responsable:</span>
                  <strong className="text-white print:text-black">{viewingClosure.closedByName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Folio Cierre:</span>
                  <strong className="text-amber-400 print:text-black font-mono">#{viewingClosure.id.slice(-8).toUpperCase()}</strong>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 block">
                  Desglose Detallado de Clientes y Pagos
                </span>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 print:border-zinc-300 text-[11px] font-bold text-zinc-400 print:text-zinc-700 uppercase">
                      <th className="py-2">Cliente</th>
                      <th className="py-2">Corte / Servicio</th>
                      <th className="py-2">Barbero</th>
                      <th className="py-2">Hora</th>
                      <th className="py-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 print:divide-zinc-200">
                    {viewingClosure.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-bold text-white print:text-black">{item.clientName}</td>
                        <td className="py-2 text-zinc-300 print:text-zinc-800">{item.serviceName}</td>
                        <td className="py-2 text-zinc-400 print:text-zinc-700">{item.barberName}</td>
                        <td className="py-2 text-zinc-400 print:text-zinc-700 font-mono">{item.time}</td>
                        <td className="py-2 text-right font-bold text-emerald-400 print:text-black">
                          {formatRD(item.paidAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Card */}
              <div className="bg-zinc-900 print:bg-zinc-100 p-4 rounded-xl border border-zinc-800 print:border-zinc-300 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-zinc-700">Total de Clientes Atendidos:</span>
                  <strong className="text-white print:text-black">{viewingClosure.totalCustomers} clientes</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-zinc-700">Clientes de la Fila:</span>
                  <span className="text-zinc-300 print:text-zinc-800">
                    {viewingClosure.items.filter((i) => i.origin === 'queue').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 print:text-zinc-700">Clientes por Cita Web:</span>
                  <span className="text-zinc-300 print:text-zinc-800">
                    {viewingClosure.items.filter((i) => i.origin === 'appointment').length}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-zinc-800 print:border-zinc-300 text-base">
                  <span className="font-bold text-white print:text-black">TOTAL RECAUDADO (RD$):</span>
                  <span className="font-black text-emerald-400 print:text-black">
                    {formatRD(viewingClosure.totalRevenue)}
                  </span>
                </div>
              </div>

              {viewingClosure.notes && (
                <div className="text-xs text-zinc-400 print:text-zinc-600 bg-zinc-900/50 print:bg-zinc-50 p-3 rounded-lg border border-zinc-800 print:border-zinc-200">
                  <strong className="block text-zinc-300 print:text-black mb-0.5">Observaciones:</strong>
                  {viewingClosure.notes}
                </div>
              )}

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-zinc-500 print:text-zinc-700">
                <div className="border-t border-zinc-800 print:border-zinc-400 pt-2">
                  <p className="font-bold text-zinc-300 print:text-black">{viewingClosure.closedByName}</p>
                  <p className="text-[10px]">Firma del Administrador / Encargado</p>
                </div>
                <div className="border-t border-zinc-800 print:border-zinc-400 pt-2">
                  <p className="font-bold text-zinc-300 print:text-black">Dirección General</p>
                  <p className="text-[10px]">Firma de Auditoría</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
