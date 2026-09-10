import React, { useState } from 'react';
import {
  Building2,
  Scissors,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  QrCode,
  KeyRound,
  User,
  Mail,
} from 'lucide-react';
import { Business } from '../../types';
import { useNovaDb } from '../../lib/store';
import { generateUniqueBusinessCode } from '../../lib/utils';
import { ADMIN_EMAIL, isSuperAdminEmail } from '../../data/seedData';

interface BusinessRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegistered: (newBiz: Business) => void;
  initialAuthCode?: string;
  initialOwnerEmail?: string;
  initialOwnerPhone?: string;
}

export const BusinessRegisterModal: React.FC<BusinessRegisterModalProps> = ({
  isOpen,
  onClose,
  onRegistered,
  initialAuthCode = '',
  initialOwnerEmail = '',
  initialOwnerPhone = '809-',
}) => {
  const { db } = useNovaDb();

  const [authCode, setAuthCode] = useState(initialAuthCode);
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState(initialOwnerEmail);
  const [name, setName] = useState('');
  const [type, setType] = useState<'barberia' | 'salon' | 'spa'>('barberia');
  const [city, setCity] = useState('Santo Domingo');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(initialOwnerPhone);
  const [openingHour, setOpeningHour] = useState('09:00');
  const [closingHour, setClosingHour] = useState('20:00');
  const [description, setDescription] = useState('');
  const [firstBarberName, setFirstBarberName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin = isSuperAdminEmail(ownerEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = authCode.trim().toUpperCase();
    const cleanEmail = ownerEmail.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanOwner = ownerName.trim();
    const cleanAddress = address.trim();

    if (!cleanOwner) {
      setErrorMsg('Por favor ingresa tu nombre completo como dueño o encargado.');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido.');
      return;
    }

    if (!cleanName) {
      setErrorMsg('Ingresa el nombre comercial de la barbería o salón.');
      return;
    }

    if (!cleanAddress) {
      setErrorMsg('Ingresa la dirección exacta en República Dominicana.');
      return;
    }

    const uniqueCode = generateUniqueBusinessCode(cleanName);

    const businessData: Omit<Business, 'id' | 'code' | 'createdAt'> = {
      name: cleanName,
      type,
      ownerName: cleanOwner,
      ownerEmail: cleanEmail,
      phone: phone.trim() || '8095550000',
      address: cleanAddress,
      city,
      description:
        description.trim() ||
        `Servicios profesionales de ${
          type === 'barberia' ? 'barbería y cortes' : type === 'salon' ? 'estilismo y belleza' : 'relajación y spa'
        } de alta calidad en ${city}, RD.`,
      openingHour,
      closingHour,
      workDays: [1, 2, 3, 4, 5, 6],
      slotDurationMinutes: 30,
      logo: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=200&auto=format&fit=crop&q=80',
      coverImage:
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&auto=format&fit=crop&q=80',
      services: [
        {
          id: `srv-${Date.now()}-1`,
          name: type === 'barberia' ? 'Corte Clásico Degradado (Fade)' : 'Lavado y Secado Profesional',
          description: 'Servicio estándar con cerquillo milimétrico y peinado final.',
          price: 500,
          duration: 30,
          category: 'cortes',
          active: true,
        },
        {
          id: `srv-${Date.now()}-2`,
          name: type === 'barberia' ? 'Corte + Barba y Toalla Caliente' : 'Tratamiento Capilar Profundo',
          description: 'Combo completo para el máximo cuidado.',
          price: 800,
          duration: 45,
          category: 'combos',
          active: true,
        },
      ],
      barbers: [
        {
          id: `barb-${Date.now()}-1`,
          name: firstBarberName.trim() || cleanOwner,
          nickname: 'El Barbero',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
          phone: phone.trim() || '8095550000',
          specialties: ['Degradados', 'Barba', 'Navaja'],
          workDays: [1, 2, 3, 4, 5, 6],
          workHours: { start: openingHour, end: closingHour },
          active: true,
          commissionRate: 50,
        },
      ],
      expenses: [],
    };

    const registration = db.registerBusiness(businessData, cleanCode);

    if (!registration.success || !registration.business) {
      setErrorMsg('No se pudo registrar la barbería. Por favor revisa los datos.');
      return;
    }

    onRegistered(registration.business);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-lg w-full p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              Registro Oficial • República Dominicana
            </span>
            <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Registrar Barbería o Salón
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Authorization Code Input */}
          <div className="bg-zinc-950/60 border border-zinc-800 p-3 rounded-2xl space-y-2">
            <label className="block font-bold text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Código Promocional / Autorización
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">
                Opcional (No requerido)
              </span>
            </label>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
              placeholder="NOVA-AUTH (Opcional)"
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-zinc-500">
              Puedes crear tu cuenta directamente sin necesidad de ningún código.
            </p>
          </div>

          {/* Owner Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-400" />
                Nombre del Propietario / Encargado
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Ej: Manuel Santos"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                Correo de Acceso
              </label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="correo@barberia.do"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Business Details */}
          <div>
            <label className="block font-bold text-zinc-300 mb-1">
              Nombre de la Barbería o Salón
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Imperio Barber Club RD"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-300 mb-1">Tipo de Negocio</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="barberia">Barbería</option>
                <option value="salon">Salón de Belleza</option>
                <option value="spa">Centro de Estética / Spa</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">Provincia / Ciudad (RD)</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="Santo Domingo">Santo Domingo (DN)</option>
                <option value="Santo Domingo Este">Santo Domingo Este</option>
                <option value="Santo Domingo Norte">Santo Domingo Norte</option>
                <option value="Santo Domingo Oeste">Santo Domingo Oeste</option>
                <option value="Santiago de los Caballeros">Santiago</option>
                <option value="La Vega">La Vega</option>
                <option value="San Cristóbal">San Cristóbal</option>
                <option value="Puerto Plata">Puerto Plata</option>
                <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                <option value="La Romana">La Romana</option>
                <option value="Higüey / Punta Cana">Higüey / Punta Cana</option>
                <option value="Bani">Baní</option>
                <option value="Bonao">Bonao</option>
                <option value="San Francisco de Macorís">San Francisco de Macorís</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                Dirección / Sector
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Av. Winston Churchill #105, Piantini"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                WhatsApp Dominicano
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="809-555-0000"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Apertura
              </label>
              <input
                type="time"
                value={openingHour}
                onChange={(e) => setOpeningHour(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block font-bold text-zinc-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Cierre
              </label>
              <input
                type="time"
                value={closingHour}
                onChange={(e) => setClosingHour(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-300 mb-1">
              Nombre de tu Primer Barbero o Estilista
            </label>
            <input
              type="text"
              value={firstBarberName}
              onChange={(e) => setFirstBarberName(e.target.value)}
              placeholder="Ej: Carlos (El Maestro) o tu propio nombre"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Activar Barbería y Comenzar a Recibir Citas</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
