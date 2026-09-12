import React, { useState } from 'react';
import {
  Building2,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Save,
  Edit3,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Scissors,
  Users,
  Eye,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Business } from '../../types';
import { useNovaDb } from '../../lib/store';
import {
  formatDominicanPhone,
  getWhatsAppLink,
  formatTime12h,
} from '../../lib/utils';
import { QRCodeCardModal } from './QRCodeCardModal';
import { TimeWheelInput } from '../common/TimeWheelPicker';

interface BarbershopProfileViewProps {
  business: Business;
  onPreviewPublicProfile?: () => void;
}

export const BarbershopProfileView: React.FC<BarbershopProfileViewProps> = ({
  business,
  onPreviewPublicProfile,
}) => {
  const { db, businesses } = useNovaDb();

  // Find latest business data from store
  const currentBiz = businesses.find((b) => b.id === business.id) || business;

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentBiz.name || '');
  const [ownerName, setOwnerName] = useState(currentBiz.ownerName || '');
  const [phone, setPhone] = useState(currentBiz.phone || '');
  const [address, setAddress] = useState(currentBiz.address || '');
  const [city, setCity] = useState(currentBiz.city || 'Santo Domingo');
  const [description, setDescription] = useState(currentBiz.description || '');
  const [openingHour, setOpeningHour] = useState(currentBiz.openingHour || '08:00');
  const [closingHour, setClosingHour] = useState(currentBiz.closingHour || '20:00');
  const [logo, setLogo] = useState(currentBiz.logo || '');
  const [coverImage, setCoverImage] = useState(currentBiz.coverImage || '');

  const [copiedCode, setCopiedCode] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentBiz.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Business = {
      ...currentBiz,
      name: name.trim() || currentBiz.name,
      ownerName: ownerName.trim() || currentBiz.ownerName,
      phone: phone.trim() || currentBiz.phone,
      address: address.trim() || currentBiz.address,
      city: city.trim() || currentBiz.city,
      description: description.trim() || currentBiz.description,
      openingHour: openingHour || currentBiz.openingHour,
      closingHour: closingHour || currentBiz.closingHour,
      logo: logo.trim() || currentBiz.logo,
      coverImage: coverImage.trim() || currentBiz.coverImage,
    };

    db.saveBusiness(updated);
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Banner with cover and logo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-64 w-full bg-zinc-950">
          <img
            src={
              currentBiz.coverImage ||
              'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80'
            }
            alt={currentBiz.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => setQrModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Ver QR & Cartel</span>
            </button>

            {onPreviewPublicProfile && (
              <button
                onClick={onPreviewPublicProfile}
                className="px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Vista Pública</span>
              </button>
            )}
          </div>
        </div>

        {/* Profile Card Body */}
        <div className="p-6 sm:p-8 -mt-16 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <img
                src={
                  currentBiz.logo ||
                  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&auto=format&fit=crop&q=80'
                }
                alt={currentBiz.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-zinc-900 bg-zinc-950 shadow-2xl shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/10 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                    Barbería Oficial RD
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    🟢 {currentBiz.accountStatus === 'suspendida' ? 'Suspendida' : currentBiz.accountStatus === 'vencida' ? 'Vencida' : 'Activa'}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">{currentBiz.name}</h1>
                <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentBiz.address}, {currentBiz.city}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-zinc-950 border border-amber-500/30 text-amber-400 hover:bg-zinc-800 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Copiar código de barbería"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{currentBiz.code}</span>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              </button>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'Cancelar Edición' : 'Editar Perfil'}</span>
              </button>
            </div>
          </div>

          {/* Details Overview */}
          <div className="mt-6 pt-6 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2 space-y-3">
              <div>
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px] mb-1">
                  Descripción del Negocio:
                </span>
                <p className="text-zinc-300 leading-relaxed">
                  {currentBiz.description || 'Sin descripción registrada.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Propietario / Encargado:</span>
                  <span className="text-zinc-200 font-bold">{currentBiz.ownerName || 'No especificado'}</span>
                  <span className="text-zinc-500 text-[11px] block">{currentBiz.ownerEmail}</span>
                </div>

                <div className="bg-zinc-950/70 border border-zinc-800 p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase block">Teléfono / WhatsApp RD:</span>
                  <span className="text-emerald-400 font-bold">{formatDominicanPhone(currentBiz.phone)}</span>
                  {currentBiz.phone && (
                    <a
                      href={getWhatsAppLink(currentBiz.phone, `Hola, me comunico desde la app Nova Barber.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 pt-0.5"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Abrir chat de WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Operating info box */}
            <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                Horario de Atención RD
              </span>

              <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Horas:
                </span>
                <span className="font-bold text-zinc-200">
                  {formatTime12h(currentBiz.openingHour || '08:00')} - {formatTime12h(currentBiz.closingHour || '20:00')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  Servicios Activos:
                </span>
                <span className="font-bold text-zinc-200">
                  {currentBiz.services?.filter((s) => s.active).length || 0} disponibles
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  Barberos en Equipo:
                </span>
                <span className="font-bold text-zinc-200">
                  {currentBiz.barbers?.length || 0} barberos
                </span>
              </div>
            </div>
          </div>

          {/* EDIT FORM */}
          {isEditing && (
            <form onSubmit={handleSave} className="mt-6 pt-6 border-t border-zinc-800 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" />
                  <span>Editar Datos de la Barbería</span>
                </h3>
                <span className="text-[11px] text-zinc-400">Los cambios se aplican de inmediato en tiempo real</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Nombre de la Barbería *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Nombre del Dueño / Encargado *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Teléfono / WhatsApp Dominicano (809 / 829 / 849) *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="809-555-1234"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Ciudad / Provincia RD *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Santo Domingo, Santiago, etc."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Dirección Física *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Av. Winston Churchill #123, Piantini"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <TimeWheelInput
                    label="Hora Apertura"
                    value={openingHour}
                    onChange={(val) => setOpeningHour(val)}
                  />
                </div>

                <div>
                  <TimeWheelInput
                    label="Hora Cierre"
                    value={closingHour}
                    onChange={(val) => setClosingHour(val)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    URL Logo Cuadrado
                  </label>
                  <input
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    URL Portada Panorámica
                  </label>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Descripción / Presentación para Clientes
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe los estilos, ambiente y ventajas de tu barbería..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Datos de Barbería</span>
                </button>
              </div>
            </form>
          )}

          {savedSuccess && (
            <div className="mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="font-bold">¡Datos de la barbería guardados y sincronizados exitosamente!</span>
            </div>
          )}
        </div>
      </div>

      {/* QR Code and Poster Modal */}
      {qrModalOpen && (
        <QRCodeCardModal
          isOpen={qrModalOpen}
          business={currentBiz}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
};
