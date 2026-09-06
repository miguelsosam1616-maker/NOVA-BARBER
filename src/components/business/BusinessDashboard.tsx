import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  DollarSign,
  Calendar,
  Users,
  Scissors,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  QrCode,
  Sparkles,
  ArrowUpRight,
  UserCheck,
  Building2,
  Receipt,
  MessageSquare,
  Check,
} from 'lucide-react';
import { Business, Appointment, Expense } from '../../types';
import { useNovaDb } from '../../lib/store';
import {
  formatRD,
  formatDominicanDate,
  formatTime12h,
  formatDominicanPhone,
  getStatusBadgeInfo,
  getWhatsAppLink,
} from '../../lib/utils';
import { QRCodeCardModal } from './QRCodeCardModal';

interface BusinessDashboardProps {
  business: Business;
  onNavigateToTab: (tab: string) => void;
}

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
  business,
  onNavigateToTab,
}) => {
  const { db, appointments, queue } = useNovaDb();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'insumos' | 'alquiler' | 'servicios' | 'mantenimiento' | 'otro'>('insumos');

  // Waiting in queue
  const waitingQueueCount = useMemo(() => {
    return queue.filter((q) => q.businessId === business.id && q.status === 'en_espera').length;
  }, [queue, business.id]);

  // Today's string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Appointments for this business
  const bizApts = appointments.filter((a) => a.businessId === business.id);

  // Pending requests requiring immediate action
  const pendingApts = bizApts.filter((a) => a.status === 'pendiente');

  // Today's appointments
  const todayApts = bizApts.filter((a) => a.date === todayStr);
  const todayCompleted = todayApts.filter((a) => a.status === 'completada');

  // Today's appointments in queue (waiting for their turn)
  const todayQueueApts = useMemo(() => {
    return todayApts
      .filter((a) => a.status === 'pendiente' || a.status === 'confirmada')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [todayApts]);

  // Daily revenue (completadas hoy)
  const todaySalesRD = todayCompleted.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  // Today's daily revenue and cuts breakdown per barber (updated in real time)
  const todayBarberProduction = useMemo(() => {
    return business.barbers.map((barber) => {
      const barberDoneToday = todayCompleted.filter(
        (a) => a.barberId === barber.id || a.barberName.includes(barber.name)
      );
      const grossToday = barberDoneToday.reduce((sum, a) => sum + (a.servicePrice || 0), 0);
      const commissionRate = barber.commissionRate || 50;
      const commissionToday = (grossToday * commissionRate) / 100;
      const shopEarnedToday = grossToday - commissionToday;

      const barberInQueueToday = todayQueueApts.filter(
        (a) => a.barberId === barber.id || a.barberName.includes(barber.name)
      );

      return {
        ...barber,
        cutsDoneToday: barberDoneToday.length,
        inQueueToday: barberInQueueToday.length,
        grossToday,
        commissionToday,
        shopEarnedToday,
      };
    });
  }, [business.barbers, todayCompleted, todayQueueApts]);

  // Total gross revenue (todas las completadas)
  const totalCompleted = bizApts.filter((a) => a.status === 'completada');
  const totalRevenueRD = totalCompleted.reduce((sum, a) => sum + (a.servicePrice || 0), 0);

  // Total expenses
  const expensesList = business.expenses || [];
  const totalExpensesRD = expensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfitRD = totalRevenueRD - totalExpensesRD;

  // Production by employee (barbers)
  const barberProduction = useMemo(() => {
    return business.barbers.map((barber) => {
      const barberDoneApts = totalCompleted.filter(
        (a) => a.barberId === barber.id || a.barberName.includes(barber.name)
      );
      const grossSales = barberDoneApts.reduce((sum, a) => sum + (a.servicePrice || 0), 0);
      const commission = (grossSales * (barber.commissionRate || 50)) / 100;
      return {
        ...barber,
        cutsCount: barberDoneApts.length,
        grossSales,
        commission,
      };
    });
  }, [business.barbers, totalCompleted]);

  // Frequent customers
  const frequentClients = useMemo(() => {
    const clientMap = new Map<string, { name: string; phone: string; count: number; totalSpent: number; lastVisit: string }>();
    totalCompleted.forEach((a) => {
      const key = a.clientPhone || a.clientName;
      const prev = clientMap.get(key) || {
        name: a.clientName,
        phone: a.clientPhone,
        count: 0,
        totalSpent: 0,
        lastVisit: a.date,
      };
      prev.count += 1;
      prev.totalSpent += a.servicePrice;
      if (a.date > prev.lastVisit) prev.lastVisit = a.date;
      clientMap.set(key, prev);
    });
    return Array.from(clientMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [totalCompleted]);

  // Most requested services
  const popularServices = useMemo(() => {
    const serviceMap = new Map<string, { name: string; count: number; totalRevenue: number }>();
    totalCompleted.forEach((a) => {
      const prev = serviceMap.get(a.serviceName) || {
        name: a.serviceName,
        count: 0,
        totalRevenue: 0,
      };
      prev.count += 1;
      prev.totalRevenue += a.servicePrice;
      serviceMap.set(a.serviceName, prev);
    });
    return Array.from(serviceMap.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [totalCompleted]);

  // Peak demand hours
  const peakHours = useMemo(() => {
    const hourMap = new Map<string, number>();
    bizApts.forEach((a) => {
      if (a.time) {
        hourMap.set(a.time, (hourMap.get(a.time) || 0) + 1);
      }
    });
    return Array.from(hourMap.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  }, [bizApts]);

  const handleAcceptAppointment = (aptId: string) => {
    db.updateAppointmentStatus(aptId, 'confirmada');
  };

  const handleRejectAppointment = (aptId: string) => {
    db.updateAppointmentStatus(aptId, 'rechazada');
  };

  const handleMarkAsReady = (aptId: string) => {
    db.updateAppointmentStatus(aptId, 'completada');
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount) return;
    db.addExpense(business.id, {
      title: expenseTitle.trim(),
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      date: todayStr,
    });
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseModalOpen(false);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Top Banner with Business ID & QR action */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border border-amber-500/20 rounded-3xl p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={business.logo}
            alt={business.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0 bg-zinc-800"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                Panel del Propietario
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                Cód: <strong className="text-zinc-200">{business.code}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              {business.name}
            </h1>
            <p className="text-xs text-zinc-400">
              {business.address}, {business.city}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigateToTab('fila')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Fila & Cierre ({waitingQueueCount})</span>
          </button>

          <button
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>QR Mostrador</span>
          </button>

          <button
            onClick={() => onNavigateToTab('appointments')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs sm:text-sm rounded-xl border border-zinc-700 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* Real-time Pending Requests Alert Banner (High priority as requested by user) */}
      {pendingApts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-zinc-900 to-amber-500/10 border-2 border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-3 animate-pulse-subtle">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500 text-zinc-950 font-bold">
                <AlertCircle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  🔔 Solicitudes de Citas en Tiempo Real ({pendingApts.length})
                </h3>
                <p className="text-xs text-amber-300/90">
                  Clientes esperando tu confirmación inmediata para bloquear el horario.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-amber-500/30">
              En vivo 🟢
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {pendingApts.map((apt) => (
              <div
                key={apt.id}
                className="bg-zinc-950/90 border border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-semibold text-amber-400 block">
                        👤 {apt.clientName}
                      </span>
                      <h4 className="text-base font-bold text-white mt-0.5">
                        ✂️ {apt.serviceName}
                      </h4>
                    </div>
                    <span className="text-sm font-black text-amber-400">
                      {formatRD(apt.servicePrice)}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 space-y-1 mt-2 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                    <p>👨💼 Barbero solicitado: <strong className="text-zinc-100">{apt.barberName}</strong></p>
                    <p className="text-emerald-400 font-semibold">
                      📅 {formatDominicanDate(apt.date)} • 🕒 {formatTime12h(apt.time)}
                    </p>
                    <p className="text-zinc-400">
                      📱 Teléfono: {formatDominicanPhone(apt.clientPhone)}
                    </p>
                    {apt.notes && (
                      <p className="text-zinc-400 italic">"{apt.notes}"</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleAcceptAppointment(apt.id)}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>[ACEPTAR]</span>
                  </button>

                  <button
                    onClick={() => handleRejectAppointment(apt.id)}
                    className="flex-1 py-2 px-3 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-700/60 text-rose-300 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>[RECHAZAR]</span>
                  </button>

                  <a
                    href={getWhatsAppLink(
                      apt.clientPhone,
                      `Hola ${apt.clientName}, te escribimos de ${business.name} respecto a tu solicitud de cita.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-xl border border-zinc-700 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary KPI Metrics: Hoy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Rendimiento de Hoy
          </h2>
          <span className="text-xs text-zinc-400">
            {formatDominicanDate(todayStr)}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
              <span>💰 Ventas Hoy</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-2">
              {formatRD(todaySalesRD)}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              De cortes completados hoy
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
              <span>📅 Citas Hoy</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2">
              {todayApts.length}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block font-medium">
              {todayCompleted.length} completadas
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
              <span>👥 Clientes Atendidos</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-2">
              {todayCompleted.length}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              En silla hoy
            </span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold uppercase">
              <span>✂️ Fila de Espera</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 mt-2">
              {todayQueueApts.length} en fila
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Pendientes de corte
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Queue Section (La Fila de Espera de Hoy) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  💈 Fila de Clientes de Hoy en Espera
                </h2>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {todayQueueApts.length} clientes en turno
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                A medida que el barbero termine con un cliente, dale a <strong className="text-emerald-400 font-bold">[✅ LISTO]</strong> para que la fila baje y los ingresos del día se registren al instante.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800">
              🕒 Horario: {formatTime12h(business.openingHour || '09:00')} - {formatTime12h(business.closingHour || '20:00')}
            </span>
          </div>
        </div>

        {todayQueueApts.length === 0 ? (
          <div className="py-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800/80 p-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
            <h4 className="text-sm font-bold text-zinc-200">¡Fila al día! No hay clientes esperando turno</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              Todos los clientes agendados para hoy ya fueron atendidos o aún no hay citas en espera para esta fecha.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {todayQueueApts.map((apt, index) => {
              const isPending = apt.status === 'pendiente';
              return (
                <div
                  key={apt.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isPending
                      ? 'bg-zinc-950/90 border-amber-500/50 ring-1 ring-amber-500/20'
                      : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center justify-center shrink-0">
                      #{index + 1}
                    </span>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-white">{apt.clientName}</span>
                        <span className="text-xs font-bold text-amber-400 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                          🕒 {formatTime12h(apt.time)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPending
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {isPending ? '🟡 Pendiente' : '🟢 En espera de turno'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400 mt-1">
                        <span>
                          ✂️ <strong className="text-zinc-200">{apt.serviceName}</strong> ({formatRD(apt.servicePrice)})
                        </span>
                        <span>
                          💈 Peluquero: <strong className="text-amber-300">{apt.barberName}</strong>
                        </span>
                        <span>
                          📱 {formatDominicanPhone(apt.clientPhone)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isPending && (
                      <button
                        onClick={() => handleAcceptAppointment(apt.id)}
                        className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Aceptar
                      </button>
                    )}

                    <button
                      onClick={() => handleMarkAsReady(apt.id)}
                      className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>LISTO (Atendido)</span>
                    </button>

                    <a
                      href={getWhatsAppLink(
                        apt.clientPhone,
                        `Hola ${apt.clientName}, ya casi es tu turno para ${apt.serviceName} en ${business.name}. ¡Estamos listos!`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-emerald-400 rounded-xl border border-zinc-700 transition-colors"
                      title="Avisar por WhatsApp que es su turno"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-time Barber Daily Revenue Breakdown */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              💵 Ingresos Ganados Hoy por Peluquero (Total: {formatRD(todaySalesRD)})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              A medida que cada barbero atiende y da listo a sus clientes, se suman automáticamente sus cortes e ingresos.
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1 rounded-lg border border-zinc-800">
            {formatDominicanDate(todayStr)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {todayBarberProduction.map((barber) => (
            <div
              key={barber.id}
              className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-10 h-10 rounded-full object-cover border border-zinc-700 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{barber.name}</h4>
                  <span className="text-[11px] text-amber-400 font-medium block truncate">
                    {barber.nickname || 'Barbero'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Cortes listos hoy:</span>
                  <span className="font-bold text-white">{barber.cutsDoneToday}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Clientes aún en fila:</span>
                  <span className={`font-bold ${barber.inQueueToday > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                    {barber.inQueueToday}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Facturado hoy:</span>
                  <span className="font-bold text-emerald-400">{formatRD(barber.grossToday)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Ganancia barbero ({barber.commissionRate}%):</span>
                  <span className="font-bold text-amber-400">{formatRD(barber.commissionToday)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800/60">
                  <span>Para negocio:</span>
                  <span className="font-semibold text-zinc-300">{formatRD(barber.shopEarnedToday)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Health: Ingresos, Gastos, Ganancias */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Finanzas del Negocio (RD$)
            </h2>
            <p className="text-xs text-zinc-400">
              Control de ingresos por citas, gastos operativos y ganancia neta.
            </p>
          </div>

          <button
            onClick={() => setExpenseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl border border-zinc-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Registrar Gasto</span>
          </button>
        </div>

        {/* 3 Financial metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4">
            <span className="text-xs text-zinc-400 uppercase font-semibold block">
              Ingresos Totales (Cortes)
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block">
              {formatRD(totalRevenueRD)}
            </span>
            <span className="text-[11px] text-zinc-500">
              {totalCompleted.length} servicios cobrados
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4">
            <span className="text-xs text-zinc-400 uppercase font-semibold block">
              Gastos Operativos
            </span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 mt-1 block">
              {formatRD(totalExpensesRD)}
            </span>
            <span className="text-[11px] text-zinc-500">
              {expensesList.length} egresos registrados
            </span>
          </div>

          <div className="bg-zinc-950/70 border border-amber-500/30 rounded-2xl p-4">
            <span className="text-xs text-amber-400 uppercase font-semibold block">
              Ganancia Neta
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
              {formatRD(netProfitRD)}
            </span>
            <span className="text-[11px] text-zinc-400">
              Rentabilidad estimada
            </span>
          </div>
        </div>

        {/* Expenses recent table */}
        {expensesList.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
              Últimos Gastos Registrados
            </span>
            <div className="divide-y divide-zinc-800/80 bg-zinc-950/40 rounded-xl border border-zinc-800/80 overflow-hidden">
              {expensesList.slice(0, 3).map((exp) => (
                <div key={exp.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-zinc-200 block">{exp.title}</span>
                    <span className="text-[10px] text-zinc-500 capitalize">{exp.category} • {exp.date}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-400">-{formatRD(exp.amount)}</span>
                    <button
                      onClick={() => db.deleteExpense(business.id, exp.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Production by Barber / Stylist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400" />
            👨💼 Producción por Barbero / Empleado
          </h2>
          <button
            onClick={() => onNavigateToTab('barbers')}
            className="text-xs text-amber-400 hover:underline font-semibold"
          >
            Gestionar Equipo
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {barberProduction.map((barber) => (
            <div
              key={barber.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center gap-3">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-zinc-100 truncate">{barber.name}</h4>
                  <span className="text-xs text-amber-400 font-semibold block truncate">
                    {barber.nickname || 'Barbero'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Cortes realizados:</span>
                  <span className="font-bold text-white">{barber.cutsCount}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Facturado bruto:</span>
                  <span className="font-bold text-emerald-400">{formatRD(barber.grossSales)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Comisión ({barber.commissionRate}%):</span>
                  <span className="font-bold text-amber-400">{formatRD(barber.commission)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2 Columns: Frequent Clients & Services / Peak Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Frequent Clients */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            Clientes Frecuentes
          </h3>

          <div className="divide-y divide-zinc-800/80">
            {frequentClients.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Sin clientes registrados aún.</p>
            ) : (
              frequentClients.map((cl, i) => (
                <div key={i} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-zinc-200 block text-sm">{cl.name}</span>
                    <span className="text-zinc-500">{formatDominicanPhone(cl.phone)} • Última: {cl.lastVisit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-400 font-black block text-sm">{formatRD(cl.totalSpent)}</span>
                    <span className="text-zinc-400 text-[11px]">{cl.count} visitas</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Requested Services & Peak Demand */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Scissors className="w-4 h-4 text-amber-400" />
              Servicios Más Solicitados
            </h3>
            <div className="space-y-2">
              {popularServices.map((srv, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/70">
                  <span className="font-medium text-zinc-200">{srv.name}</span>
                  <div className="text-right">
                    <span className="font-bold text-amber-400 mr-2">{srv.count} citas</span>
                    <span className="text-zinc-400">({formatRD(srv.totalRevenue)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Horarios con Mayor Demanda
            </h4>
            <div className="flex flex-wrap gap-2">
              {peakHours.map((slot, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center gap-1.5"
                >
                  <span className="text-amber-400">🕒 {formatTime12h(slot.time)}</span>
                  <span className="text-[10px] text-zinc-400">({slot.count} citas)</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 text-white space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                Registrar Gasto del Negocio
              </h3>
              <button
                onClick={() => setExpenseModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Descripción del Gasto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cuchillas de afeitar y toallas"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Monto en Pesos (RD$)</label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 2500"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Categoría</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="insumos">Insumos (Cuchillas, Gel, Toallas)</option>
                  <option value="alquiler">Alquiler del Local</option>
                  <option value="servicios">Servicios (Luz EDEESTE, Agua, Internet)</option>
                  <option value="mantenimiento">Mantenimiento y Máquinas</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Stand Modal */}
      <QRCodeCardModal
        business={business}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
      />
    </div>
  );
};
