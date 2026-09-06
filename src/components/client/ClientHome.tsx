import React, { useState, useEffect } from 'react';
import {
  Search,
  QrCode,
  Sparkles,
  MapPin,
  Clock,
  Phone,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Scissors,
  CheckCircle2,
} from 'lucide-react';
import { Business } from '../../types';
import { useNovaDb } from '../../lib/store';
import { formatRD, formatDominicanPhone } from '../../lib/utils';

interface ClientHomeProps {
  onSelectBusiness: (business: Business) => void;
  initialCode?: string;
}

export const ClientHome: React.FC<ClientHomeProps> = ({ onSelectBusiness, initialCode }) => {
  const { db, client, businesses } = useNovaDb();
  const [codeInput, setCodeInput] = useState(initialCode || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showQRScannerSim, setShowQRScannerSim] = useState(false);

  useEffect(() => {
    if (initialCode) {
      handleSearchCode(initialCode);
    }
  }, [initialCode]);

  const handleSearchCode = (codeToSearch: string) => {
    setErrorMsg('');
    const clean = codeToSearch.trim();
    if (!clean) {
      setErrorMsg('Por favor introduce un código de barbería (ej. NOVA-BRB-48291)');
      return;
    }

    setIsSearching(true);
    setTimeout(() => {
      const biz = db.getBusinessByCode(clean);
      setIsSearching(false);
      if (biz) {
        db.saveBusinessCodeToClient(biz.code);
        onSelectBusiness(biz);
      } else {
        setErrorMsg(`No encontramos ningún negocio registrado con el código "${clean}". Revisa que esté bien escrito.`);
      }
    }, 200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearchCode(codeInput);
  };

  // Saved/Favorite businesses for this client
  const savedBusinesses = businesses.filter((b) =>
    client.savedBusinessCodes.includes(b.code)
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Hero Welcome Dominican Barbershop Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-amber-950/40 border border-amber-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Nova Barber República Dominicana 🇩🇴
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Reserva tu corte con tu barbero favorito{' '}
            <span className="text-amber-400 underline decoration-amber-500/50 underline-offset-8">
              en tiempo real
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
            Ingresa el código único proporcionado por tu barbería o escanea su código QR de mostrador para ver sus servicios, precios en RD$ y horarios disponibles al instante.
          </p>

          {/* Quick Search Box */}
          <form onSubmit={handleFormSubmit} className="pt-2">
            <div className="bg-zinc-900/90 border-2 border-amber-500/40 focus-within:border-amber-400 rounded-2xl p-1.5 sm:p-2 flex flex-col sm:flex-row gap-2 shadow-xl">
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-amber-400 absolute left-3.5" />
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => {
                    setCodeInput(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  placeholder="Introduce el código (Ej: NOVA-BRB-48291)"
                  className="w-full bg-transparent pl-11 pr-4 py-2.5 text-sm sm:text-base text-white placeholder-zinc-500 font-mono tracking-wide focus:outline-hidden uppercase"
                />
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQRScannerSim(true)}
                  className="px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700"
                  title="Escanear QR de mostrador"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Escanear</span> QR
                </button>

                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  {isSearching ? (
                    'Buscando...'
                  ) : (
                    <>
                      <span>Acceder</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-rose-300 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </form>

          {/* Quick Demo Code helper chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-400">
            <span>Códigos de prueba en RD:</span>
            {businesses.slice(0, 2).map((biz) => (
              <button
                key={biz.id}
                type="button"
                onClick={() => {
                  setCodeInput(biz.code);
                  handleSearchCode(biz.code);
                }}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-amber-500/20 text-amber-300 border border-zinc-700 hover:border-amber-500/40 font-mono transition-colors cursor-pointer"
              >
                {biz.code} ({biz.name.split(' ')[0]})
              </button>
            ))}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 to-transparent pointer-events-none" />
      </div>

      {/* QR Scanner Simulation Modal */}
      {showQRScannerSim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 text-white space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-base">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span>Escanear QR de Mostrador</span>
              </div>
              <button
                onClick={() => setShowQRScannerSim(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              En tu celular, simplemente apunta con tu cámara normal al QR impreso en el mostrador de la barbería.
              Para probarlo aquí en la demo, selecciona la barbería escaneada:
            </p>

            <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 text-center relative overflow-hidden">
              <div className="w-48 h-48 border-2 border-amber-400/80 rounded-2xl mx-auto flex flex-col items-center justify-center relative p-3 bg-zinc-900/50">
                <div className="absolute inset-x-2 top-2 h-0.5 bg-amber-400 animate-pulse shadow-sm shadow-amber-400" />
                <Scissors className="w-10 h-10 text-amber-400 mb-2 opacity-80" />
                <span className="text-[11px] text-zinc-400 font-mono">
                  Enfoque listo para escanear
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-zinc-400 block">
                Simular escaneo de QR:
              </span>
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => {
                    setShowQRScannerSim(false);
                    db.saveBusinessCodeToClient(biz.code);
                    onSelectBusiness(biz);
                  }}
                  className="w-full p-3 rounded-xl bg-zinc-800 hover:bg-amber-500/20 border border-zinc-700 hover:border-amber-500/40 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-sm text-zinc-100 block">{biz.name}</span>
                    <span className="text-xs text-zinc-400 font-mono">{biz.code} • {biz.city}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Saved / Recent Barbershops for this customer */}
      {savedBusinesses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Tus Barberías Guardadas
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              Acceso directo por código
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedBusinesses.map((biz) => (
              <div
                key={biz.id}
                onClick={() => onSelectBusiness(biz)}
                className="group bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-amber-500/40 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-amber-500/5 flex items-start gap-4"
              >
                <img
                  src={biz.logo || biz.coverImage}
                  alt={biz.name}
                  className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shrink-0 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      {biz.code}
                    </span>
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Abierto hoy
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-zinc-100 mt-1.5 truncate group-hover:text-amber-300 transition-colors">
                    {biz.name}
                  </h3>

                  <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                    {biz.address}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800 text-xs">
                    <span className="text-zinc-400">
                      {biz.services.length} servicios disponibles
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      Ver Servicios <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular Dominican Barbershops Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Scissors className="w-4 h-4 text-amber-400" />
            Barberías y Salones Disponibles en República Dominicana
          </h2>
          <span className="text-xs text-zinc-400 font-medium">
            Precios en RD$
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businesses.length === 0 ? (
            <div className="col-span-full text-center py-12 px-4 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Scissors className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white">Aún no hay barberías registradas</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                Tan pronto una barbería o salón se registre con su código oficial en República Dominicana,
                su perfil, servicios en RD$ y barberos aparecerán aquí automáticamente en tiempo real.
              </p>
            </div>
          ) : (
            businesses.map((biz) => (
            <div
              key={biz.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-700 transition-all flex flex-col"
            >
              {/* Cover Image banner */}
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={biz.coverImage}
                  alt={biz.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                {/* Code badge overlay */}
                <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-500/40 text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                  {biz.code}
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={biz.logo}
                      alt={biz.name}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400 shadow-md shrink-0 bg-zinc-800"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white leading-snug drop-shadow-md">
                        {biz.name}
                      </h3>
                      <span className="text-xs text-zinc-300 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        {biz.city}, RD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                  {biz.description}
                </p>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-zinc-800/80">
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{biz.openingHour} - {biz.closingHour}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-300">
                    <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{formatDominicanPhone(biz.phone)}</span>
                  </div>
                </div>

                {/* Services preview snippets */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                    Servicios destacados:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {biz.services.slice(0, 3).map((srv) => (
                      <span
                        key={srv.id}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                      >
                        {srv.name.split('(')[0].trim()} • <strong className="text-amber-400">{formatRD(srv.price)}</strong>
                      </span>
                    ))}
                    {biz.services.length > 3 && (
                      <span className="text-[11px] px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500">
                        +{biz.services.length - 3} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Action CTA */}
                <button
                  onClick={() => onSelectBusiness(biz)}
                  className="w-full mt-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <span>Ver Perfil y Reservar Cita</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )))}
        </div>
      </div>

      {/* How it works simple Dominican steps */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 text-center mb-6">
          ¿Cómo funciona Nova Barber?
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mx-auto">
              1
            </div>
            <h4 className="font-bold text-sm text-zinc-100">Introduce el Código o QR</h4>
            <p className="text-xs text-zinc-400">
              Pídele el código único a tu barbería o escanea su QR con tu celular.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mx-auto">
              2
            </div>
            <h4 className="font-bold text-sm text-zinc-100">Elige tu Barbero y Hora</h4>
            <p className="text-xs text-zinc-400">
              Visualiza en vivo qué horas están disponibles sin riesgo de doble reserva.
            </p>
          </div>
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm mx-auto">
              3
            </div>
            <h4 className="font-bold text-sm text-zinc-100">Confirmación Inmediata</h4>
            <p className="text-xs text-zinc-400">
              El dueño acepta tu cita y recibes la confirmación al instante con aviso de WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
