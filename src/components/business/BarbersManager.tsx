import React, { useState } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  Phone,
  Scissors,
  CheckCircle2,
  X,
  AlertCircle,
  TrendingUp,
  Upload,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { Business, Barber } from '../../types';
import { useNovaDb } from '../../lib/store';
import { formatRD, formatDominicanPhone, formatDominicanDate, formatTime12h } from '../../lib/utils';

interface BarbersManagerProps {
  business: Business;
}

export const BarbersManager: React.FC<BarbersManagerProps> = ({ business }) => {
  const { db, appointments } = useNovaDb();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [viewScheduleBarber, setViewScheduleBarber] = useState<Barber | null>(null);

  // Form
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('');
  const [phone, setPhone] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('20:00');
  const [commissionRate, setCommissionRate] = useState('50');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('La imagen no debe superar los 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAvatar(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 8 * 1024 * 1024) {
        setErrorMsg('La imagen no debe superar los 8MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAvatar(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80',
  ];

  const handleOpenCreate = () => {
    setEditingBarber(null);
    setName('');
    setNickname('');
    setAvatar('');
    setPhone('');
    setSpecialties('Degradados, Barba, Navaja');
    setWorkStart('09:00');
    setWorkEnd('20:00');
    setCommissionRate('50');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setName(barber.name);
    setNickname(barber.nickname || '');
    setAvatar(barber.avatar);
    setPhone(barber.phone);
    setSpecialties(barber.specialties.join(', '));
    setWorkStart(barber.workHours.start);
    setWorkEnd(barber.workHours.end);
    setCommissionRate(String(barber.commissionRate || 50));
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleDeleteBarber = (barberId: string) => {
    if (confirm('¿Seguro que deseas eliminar este barbero?')) {
      const updated = business.barbers.filter((b) => b.id !== barberId);
      db.updateBusinessBarbers(business.id, updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Por favor introduce el nombre del barbero.');
      return;
    }

    const specsArray = specialties
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let updatedBarbers: Barber[] = [];

    if (editingBarber) {
      updatedBarbers = business.barbers.map((b) => {
        if (b.id === editingBarber.id) {
          return {
            ...b,
            name: name.trim(),
            nickname: nickname.trim() || undefined,
            avatar: avatar || b.avatar,
            phone: phone.trim() || b.phone,
            specialties: specsArray.length > 0 ? specsArray : b.specialties,
            workHours: { start: workStart, end: workEnd },
            commissionRate: parseFloat(commissionRate) || 50,
          };
        }
        return b;
      });
    } else {
      const newBarber: Barber = {
        id: `barb-${Date.now()}`,
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        avatar: avatar || sampleAvatars[0],
        phone: phone.trim() || business.phone,
        specialties: specsArray.length > 0 ? specsArray : ['Degradados', 'Barba'],
        workDays: [1, 2, 3, 4, 5, 6],
        workHours: { start: workStart, end: workEnd },
        active: true,
        commissionRate: parseFloat(commissionRate) || 50,
      };
      updatedBarbers = [...business.barbers, newBarber];
    }

    db.updateBusinessBarbers(business.id, updatedBarbers);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Equipo de Barberos y Estilistas
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Cada barbero cuenta con su propia agenda independiente, horarios de atención y cálculo de comisiones.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Barbero</span>
        </button>
      </div>

      {/* Grid of Barbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {business.barbers.map((barber) => {
          // Appointments for this barber
          const barberApts = appointments.filter(
            (a) => a.barberId === barber.id || a.barberName.includes(barber.name)
          );
          const completedCount = barberApts.filter((a) => a.status === 'completada').length;
          const pendingCount = barberApts.filter((a) => a.status === 'pendiente').length;
          const totalSales = barberApts
            .filter((a) => a.status === 'completada')
            .reduce((sum, a) => sum + (a.servicePrice || 0), 0);

          return (
            <div
              key={barber.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <img
                  src={barber.avatar}
                  alt={barber.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md shrink-0 bg-zinc-800"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-white leading-snug">
                        {barber.name}
                      </h3>
                      {barber.nickname && (
                        <span className="text-xs font-semibold text-amber-400 block">
                          "{barber.nickname}"
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-emerald-400 border border-zinc-700">
                      {barber.commissionRate}% Com.
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {barber.specialties.map((spec, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {barber.workHours.start} - {barber.workHours.end}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      {formatDominicanPhone(barber.phone)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 text-center text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Cortes Hechos</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">{completedCount}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Pendientes</span>
                  <span className="font-bold text-amber-400 text-sm mt-0.5 block">{pendingCount}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Producción</span>
                  <span className="font-black text-emerald-400 text-xs sm:text-sm mt-0.5 block truncate">
                    {formatRD(totalSales)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <button
                  onClick={() => setViewScheduleBarber(barber)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ver Agenda de {barber.name.split(' ')[0]}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEdit(barber)}
                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBarber(barber.id)}
                    className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Individual Barber Schedule Modal */}
      {viewScheduleBarber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={viewScheduleBarber.avatar}
                  alt={viewScheduleBarber.name}
                  className="w-10 h-10 rounded-full object-cover border border-amber-400"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-bold text-base text-white">
                    Agenda de {viewScheduleBarber.name}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    Horario diario: {viewScheduleBarber.workHours.start} a {viewScheduleBarber.workHours.end}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewScheduleBarber(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Citas asignadas a este barbero:
              </span>
              {appointments.filter(
                (a) => a.barberId === viewScheduleBarber.id || a.barberName.includes(viewScheduleBarber.name)
              ).length === 0 ? (
                <p className="text-xs text-zinc-500 py-6 text-center">
                  No hay citas asignadas actualmente para este barbero.
                </p>
              ) : (
                appointments
                  .filter(
                    (a) => a.barberId === viewScheduleBarber.id || a.barberName.includes(viewScheduleBarber.name)
                  )
                  .map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-zinc-200 block text-sm">{apt.serviceName}</span>
                        <span className="text-zinc-400">
                          Cliente: {apt.clientName} • {formatDominicanDate(apt.date)} a las {formatTime12h(apt.time)}
                        </span>
                      </div>
                      <span className="font-semibold text-amber-400">{formatRD(apt.servicePrice)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Barber Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-5 text-white space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-base sm:text-lg text-white">
                {editingBarber ? 'Editar Barbero' : 'Nuevo Barbero / Estilista'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Manuel Méndez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Apodo / Nombre Artístico (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: El Maestro, Flow RD..."
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  placeholder="Ej: 8095551234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Especialidades (Separadas por comas)</label>
                <input
                  type="text"
                  placeholder="Degradados, Navaja, Barbas, Faciales..."
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Hora Inicio</label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={(e) => setWorkStart(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Hora Fin</label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={(e) => setWorkEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Porcentaje de Comisión (%)</label>
                <input
                  type="number"
                  placeholder="50"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              {/* Profile Photo Upload matching ServicesManager */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    Foto de Perfil del Barbero
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Subir archivo
                  </span>
                </div>

                <div className="space-y-2">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      {avatar ? (
                        <div className="relative group">
                          <img
                            src={avatar}
                            alt="Foto del Barbero"
                            className="w-20 h-20 rounded-full object-cover border-2 border-amber-400 shadow-lg shadow-amber-500/10"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={() => setAvatar('')}
                            className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white p-1 rounded-full text-xs shadow-md transition-colors"
                            title="Quitar foto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400">
                          <Camera className="w-7 h-7" />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-center gap-2">
                          <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold cursor-pointer transition-all shadow-md shadow-amber-500/20 active:scale-95">
                            <Upload className="w-4 h-4" />
                            <span>Subir archivo de imagen</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                          {avatar && (
                            <button
                              type="button"
                              onClick={() => setAvatar('')}
                              className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                            >
                              Quitar foto
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          Arrastra y suelta tu foto aquí, o haz clic en el botón para seleccionarla
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Suggestion presets */}
                  <div className="pt-1">
                    <span className="text-[10px] text-zinc-500 block mb-1">
                      O elige un estilo sugerido de muestra:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {sampleAvatars.map((sUrl, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setAvatar(sUrl)}
                          className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-all ${
                            avatar === sUrl
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
                          }`}
                        >
                          <img
                            src={sUrl}
                            alt={`Avatar ${i + 1}`}
                            className="w-4 h-4 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span>Estilo {i + 1}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image preview status */}
                  {avatar && (
                    <div className="pt-1 flex items-center gap-3 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                      <img
                        src={avatar}
                        alt="Vista previa"
                        className="w-10 h-10 rounded-full object-cover border border-amber-400"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1">
                        <span className="text-xs text-emerald-400 font-medium block">
                          ✓ Foto de perfil cargada correctamente
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Se guardará en la tarjeta del barbero al guardar
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingBarber ? 'Actualizar Barbero' : 'Agregar Barbero'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
