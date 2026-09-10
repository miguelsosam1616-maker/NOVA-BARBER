import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  Scissors,
  Save,
  Edit3,
  History,
  TrendingUp,
} from 'lucide-react';
import { useNovaDb } from '../../lib/store';
import { formatRD, formatDominicanDate, formatDominicanPhone, formatTime12h, getStatusBadgeInfo } from '../../lib/utils';
import { ClientProfile } from '../../types';

export const ClientProfileView: React.FC = () => {
  const { db, client, currentUser, appointments } = useNovaDb();

  // Resolve effective client profile from client object or currentUser
  const effectiveClient: ClientProfile = client || {
    id: currentUser?.id || 'client-temp',
    name: currentUser?.name || 'Cliente Nova',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    savedBusinessCodes: [],
    createdAt: new Date().toISOString(),
    accountStatus: currentUser?.accountStatus || 'activa',
  };

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(effectiveClient.name || '');
  const [phone, setPhone] = useState(effectiveClient.phone || '');
  const [email, setEmail] = useState(effectiveClient.email || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Appointments for this client (matched by ID or clean email)
  const clientApts = appointments.filter(
    (a) =>
      a.clientId === effectiveClient.id ||
      (effectiveClient.email && a.clientEmail?.toLowerCase() === effectiveClient.email.toLowerCase())
  );

  // Completed history
  const completedApts = clientApts.filter((a) => a.status === 'completada');

  // Upcoming appointments
  const upcomingApts = clientApts.filter(
    (a) => a.status === 'pendiente' || a.status === 'confirmada'
  );

  // Last visit
  const lastVisit = completedApts.length > 0 ? completedApts[0].date : null;

  // Total spent in Dominican Pesos
  const totalSpentRD = completedApts.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...effectiveClient,
      name: name.trim() || effectiveClient.name,
      phone: phone ? phone.trim() : '',
      email: email.trim() || effectiveClient.email,
    };
    db.saveClient(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Profile Overview Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src={
                effectiveClient.avatar ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'
              }
              alt={effectiveClient.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Cliente Nova Barber RD
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{effectiveClient.name}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  {formatDominicanPhone(effectiveClient.phone)}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  {effectiveClient.email || 'Sin correo registrado'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs sm:text-sm font-semibold border border-zinc-700 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>{isEditing ? 'Cancelar Edición' : 'Editar Datos'}</span>
          </button>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form
            onSubmit={handleSaveProfile}
            className="mt-6 pt-6 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">WhatsApp (RD)</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Correo Electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>
        )}

        {savedSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Perfil actualizado exitosamente.</span>
          </div>
        )}

        {/* Quick KPI stats for the customer */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 block font-medium">Última Visita</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {lastVisit ? formatDominicanDate(lastVisit, false) : 'Sin visitas aún'}
            </span>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 block font-medium">Servicios Realizados</span>
            <span className="text-sm font-bold text-amber-400 mt-1 block">
              {completedApts.length} cortes
            </span>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 block font-medium">Inversión Total</span>
            <span className="text-sm font-bold text-emerald-400 mt-1 block">
              {formatRD(totalSpentRD)}
            </span>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/80">
            <span className="text-[11px] text-zinc-400 block font-medium">Citas Próximas</span>
            <span className="text-sm font-bold text-zinc-100 mt-1 block">
              {upcomingApts.length} programada{upcomingApts.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments section */}
      {upcomingApts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-400" />
            Próximas Citas Programadas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {upcomingApts.map((apt) => {
              const badge = getStatusBadgeInfo(apt.status);
              return (
                <div
                  key={apt.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 shadow-lg"
                >
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs font-black text-amber-400">
                      {formatRD(apt.servicePrice)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{apt.serviceName}</h4>
                  <div className="text-xs text-zinc-400 space-y-0.5">
                    <p>Barbero: <strong className="text-zinc-200">{apt.barberName}</strong></p>
                    <p className="text-emerald-400 font-semibold">
                      📅 {formatDominicanDate(apt.date)} • {formatTime12h(apt.time)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visit History Section matching prompt explicitly */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-amber-400" />
          Historial de Visitas y Servicios
        </h2>
        <p className="text-xs text-zinc-400">
          Registro histórico de todos los cortes y atenciones recibidas en negocios de Nova Barber.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
          {completedApts.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No tienes visitas registradas aún.
            </div>
          ) : (
            completedApts.map((apt) => (
              <div
                key={apt.id}
                className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-100">{apt.serviceName}</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {apt.businessName} • Barbero: <span className="text-zinc-300">{apt.barberName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
                  <span className="text-sm font-black text-amber-400">
                    {formatRD(apt.servicePrice)}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {formatDominicanDate(apt.date, false)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
