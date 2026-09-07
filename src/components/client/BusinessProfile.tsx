import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  MessageSquare,
  QrCode,
  Sparkles,
  Scissors,
  CheckCircle2,
  Calendar,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { Business, Service, Appointment } from '../../types';
import { formatRD, formatDominicanPhone, getWhatsAppLink } from '../../lib/utils';
import { BookingModal } from './BookingModal';
import { LiveQueueWidget } from './LiveQueueWidget';

interface BusinessProfileProps {
  business: Business;
  onBack: () => void;
  onViewMyAppointments: () => void;
}

export const BusinessProfile: React.FC<BusinessProfileProps> = ({
  business,
  onBack,
  onViewMyAppointments,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [serviceToBook, setServiceToBook] = useState<Service | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const categories = [
    { id: 'todos', label: 'Todos' },
    { id: 'cortes', label: 'Cortes y Fade' },
    { id: 'barba', label: 'Barba' },
    { id: 'combos', label: 'Combos Especiales' },
    { id: 'faciales', label: 'Faciales y Spa' },
    { id: 'color', label: 'Colorimetría' },
  ];

  const servicesList = business.services || [];
  const barbersList = business.barbers || [];

  const filteredServices = servicesList
    .filter((s) => s.active)
    .filter((s) => (selectedCategory === 'todos' ? true : s.category === selectedCategory));

  const handleStartBooking = (service?: Service) => {
    setServiceToBook(service || servicesList[0] || null);
    setBookingModalOpen(true);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(business.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleBookingSuccess = (_apt: Appointment) => {
    // Booking modal displays confirmation, and user can view their appointments
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a buscar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-500/30 text-amber-300 hover:bg-zinc-800 text-xs font-mono font-bold transition-colors cursor-pointer"
            title="Copiar código único"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>{business.code}</span>
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Header Banner & Profile Card */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
        {/* Cover Photo */}
        <div className="relative h-48 sm:h-64 lg:h-72 w-full">
          <img
            src={
              business.coverImage ||
              'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80'
            }
            alt={business.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />

          {/* Type Badge */}
          <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-zinc-700 text-xs font-bold text-amber-400 uppercase tracking-wider">
            💈 {business.type === 'salon' ? 'Salón de Belleza' : business.type === 'spa' ? 'Centro Spa' : 'Barbería Profesional'} • RD
          </div>
        </div>

        {/* Business details container */}
        <div className="relative px-5 sm:px-8 pb-6 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <img
                src={
                  business.logo ||
                  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&auto=format&fit=crop&q=80'
                }
                alt={business.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-zinc-950 bg-zinc-800 shadow-2xl shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    {business.name}
                  </h1>
                  <span className="p-0.5 rounded-full bg-amber-400 text-zinc-950" title="Negocio Verificado en RD">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{business.address}, {business.city}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 w-full sm:w-auto pt-2 sm:pt-0">
              <a
                href={getWhatsAppLink(business.phone, `Hola ${business.name}, vi su perfil en Nova Barber y me gustaría información.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/20"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp RD</span>
              </a>

              <button
                onClick={() => handleStartBooking()}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs sm:text-sm font-black rounded-xl transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Reservar Cita Ahora</span>
              </button>
            </div>
          </div>

          {/* Description & Operating Info */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Sobre Nosotros
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {business.description}
              </p>
            </div>

            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Horario de atención:
                </span>
                <span className="font-bold text-zinc-200">
                  {business.openingHour} - {business.closingHour}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Contacto:
                </span>
                <span className="font-medium text-zinc-200">
                  {formatDominicanPhone(business.phone)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Días de servicio:</span>
                <span className="font-semibold text-emerald-400">Lunes a Sábado</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Walk-in Queue Tracker for Clients */}
      <LiveQueueWidget business={business} />

      {/* Barbers Team Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400" />
            Nuestro Equipo de Barberos y Estilistas
          </h2>
          <span className="text-xs text-zinc-400">
            {barbersList.filter((b) => b.active).length} profesionales disponibles
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {barbersList
            .filter((b) => b.active)
            .map((barber) => (
              <div
                key={barber.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-center flex flex-col items-center hover:border-zinc-700 transition-colors"
              >
                <img
                  src={
                    barber.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={barber.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/40 shadow-md mb-2.5"
                  referrerPolicy="no-referrer"
                />
                <h4 className="font-bold text-sm text-zinc-100">{barber.name}</h4>
                {barber.nickname && (
                  <span className="text-xs font-semibold text-amber-400 mt-0.5">
                    "{barber.nickname}"
                  </span>
                )}
                <div className="flex flex-wrap justify-center gap-1 mt-2">
                  {barber.specialties.slice(0, 2).map((spec, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Services Menu Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Menú de Cortes y Servicios
            </h2>
            <p className="text-xs text-zinc-400">
              Precios transparentes en moneda dominicana (RD$)
            </p>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid: respects optional image requirement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-zinc-900 border border-zinc-800 hover:border-amber-500/30 rounded-2xl p-4 transition-all duration-200 shadow-lg flex flex-col justify-between"
            >
              <div className="flex items-start gap-3.5">
                {/* Image (optional): if present, displays beautifully; if not, renders elegant vector badge */}
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border border-zinc-700 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex flex-col items-center justify-center text-amber-400 shrink-0 p-2 text-center">
                    <Scissors className="w-6 h-6 mb-1" />
                    <span className="text-[10px] text-zinc-400 leading-tight">Sin foto</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-zinc-100 leading-snug">
                      {service.name}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                    {service.description}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-amber-400 font-black text-base">
                      {formatRD(service.price)}
                    </span>
                    <span className="text-zinc-500 font-medium">
                      ⏱️ {service.duration} mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[11px] text-emerald-400 font-medium">
                  🟢 Disponibilidad en vivo
                </span>
                <button
                  onClick={() => handleStartBooking(service)}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  Agendar este Corte
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <p className="text-zinc-400 text-sm">No hay servicios disponibles en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      <BookingModal
        business={business}
        preselectedService={serviceToBook}
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
};
