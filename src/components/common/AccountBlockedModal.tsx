import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Phone,
  Mail,
  RefreshCw,
  LogOut,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { BusinessAccountStatus } from '../../types';
import { ADMIN_EMAIL, ADMIN_WHATSAPP, ADMIN_WHATSAPP_DISPLAY } from '../../data/seedData';

interface AccountBlockedModalProps {
  businessName?: string;
  clientName?: string;
  accountType?: 'business' | 'client';
  ownerEmail?: string;
  ownerPhone?: string;
  accountStatus: BusinessAccountStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
  onRefreshStatus: () => void;
  onLogout: () => void;
  isInlineModal?: boolean; // If opened from login modal or global blocker
  onClose?: () => void;
}

export const AccountBlockedModal: React.FC<AccountBlockedModalProps> = ({
  businessName = 'Tu Barbería / Salón',
  clientName,
  accountType = 'business',
  ownerEmail = '',
  ownerPhone = '',
  accountStatus,
  statusReason,
  statusUpdatedAt,
  onRefreshStatus,
  onLogout,
  isInlineModal = false,
  onClose,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const isSuspended = accountStatus === 'suspendida';
  const isClient = accountType === 'client';

  const defaultReason = isSuspended
    ? isClient
      ? 'Tu cuenta de cliente ha sido suspendida por la administración central de Nova Barber debido a faltas o restricciones de uso.'
      : 'Tu cuenta ha sido suspendida por la administración central de Nova Barber. No es posible acceder al sistema hasta regularizar el estatus.'
    : isClient
    ? 'Tu cuenta de cliente se encuentra temporalmente inactiva o vencida.'
    : 'Tu periodo de servicio o membresía mensual con Nova Barber ha vencido. Renueva tu suscripción para reactivar el acceso completo.';

  const displayReason = statusReason?.trim() || defaultReason;

  const handleRecheck = () => {
    setIsChecking(true);
    setCheckMessage(null);
    onRefreshStatus();
    setTimeout(() => {
      setIsChecking(false);
      setCheckMessage('Estatus consultado con el servidor. Si el Administrador ya te reactivó, la pantalla se desbloqueará.');
    }, 1200);
  };

  const formattedDate = statusUpdatedAt
    ? new Date(statusUpdatedAt).toLocaleDateString('es-DO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleDateString('es-DO');

  const whatsappMessage = encodeURIComponent(
    `Hola Administración Nova Barber, me comunico respecto a mi cuenta ${isClient ? 'de cliente' : 'de barbería'}:\n\n` +
    `${isClient ? `👤 Cliente: ${clientName || 'Usuario'}` : `💈 Negocio: ${businessName}`}\n` +
    `📧 Correo: ${ownerEmail}\n` +
    `⚠️ Estado: ${accountStatus.toUpperCase()}\n\n` +
    `Solicito información para regularizar y reactivar mi cuenta en la plataforma.`
  );

  return (
    <div
      id="account-blocked-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
    >
      <div
        id="account-blocked-dialog"
        className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Banner Alert */}
        <div
          className={`p-6 text-center text-white ${
            isSuspended
              ? 'bg-gradient-to-b from-rose-950/80 via-rose-900/40 to-transparent border-b border-rose-800/40'
              : 'bg-gradient-to-b from-amber-950/80 via-amber-900/40 to-transparent border-b border-amber-800/40'
          }`}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 shadow-lg ring-4 ring-black/40">
            {isSuspended ? (
              <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
            )}
          </div>

          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-black/40 border border-white/10">
            {isSuspended ? (
              <span className="text-rose-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                Cuenta Suspendida
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Membresía / Periodo Vencido
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isSuspended
              ? isClient
                ? 'Cuenta de Cliente Suspendida'
                : 'Acceso a Barbería Bloqueado'
              : isClient
              ? 'Cuenta de Cliente Vencida'
              : 'Tu Cuenta Ha Vencido'}
          </h2>
          <p className="text-sm text-zinc-300 mt-1 max-w-sm mx-auto">
            {isSuspended
              ? isClient
                ? 'Esta cuenta ha sido suspendida por la administración. No es posible agendar nuevas citas ni acceder a los servicios.'
                : 'Esta cuenta ha sido suspendida y no puede gestionar citas ni recibir clientes en este momento.'
              : isClient
              ? 'El periodo de servicio o membresía ha concluido. Contacta al administrador para reactivar tu cuenta.'
              : 'El plan o servicio contratado ha concluido. Renueva para continuar utilizando Nova Barber.'}
          </p>
        </div>

        {/* Info & Reason Details */}
        <div className="p-6 space-y-4">
          <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-700/60">
              <span className="text-zinc-400 font-medium">
                {isClient ? 'Nombre del Cliente:' : 'Barbería / Negocio:'}
              </span>
              <span className="text-white font-bold">{isClient ? clientName || 'Cliente Nova' : businessName}</span>
            </div>
            {ownerEmail && (
              <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-700/60">
                <span className="text-zinc-400 font-medium">Correo Vinculado:</span>
                <span className="text-zinc-200 font-mono">{ownerEmail}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-700/60">
              <span className="text-zinc-400 font-medium">Fecha de Estado:</span>
              <span className="text-zinc-300">{formattedDate}</span>
            </div>

            <div className="pt-1">
              <span className="text-xs text-zinc-400 font-medium block mb-1">
                Motivo especificado por Administración:
              </span>
              <div
                className={`p-3 rounded-lg text-xs leading-relaxed border font-medium ${
                  isSuspended
                    ? 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                    : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                }`}
              >
                {displayReason}
              </div>
            </div>
          </div>

          {checkMessage && (
            <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-lg text-xs text-blue-200 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>{checkMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <a
              id="btn-contact-support-whatsapp"
              href={`https://wa.me/${ADMIN_WHATSAPP}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-lg shadow-emerald-950/40"
            >
              <Phone className="w-4 h-4" />
              <span>Contactar al Administrador ({ADMIN_WHATSAPP_DISPLAY})</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              id="btn-contact-support-email"
              href={`mailto:${ADMIN_EMAIL}?subject=Reactivación de Cuenta Nova Barber: ${encodeURIComponent(businessName)}`}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors border border-zinc-700"
            >
              <Mail className="w-4 h-4 text-amber-400" />
              Enviar Correo a {ADMIN_EMAIL}
            </a>

            <div className="flex gap-2 pt-1">
              <button
                id="btn-recheck-account-status"
                type="button"
                onClick={handleRecheck}
                disabled={isChecking}
                className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 font-medium py-2.5 px-3 rounded-xl text-xs transition-colors border border-zinc-700/80 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : ''}`} />
                {isChecking ? 'Verificando...' : 'Comprobar si ya fue reactivada'}
              </button>

              <button
                id="btn-logout-blocked-account"
                type="button"
                onClick={onLogout}
                className="flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700/80 text-rose-400 font-medium py-2.5 px-4 rounded-xl text-xs transition-colors border border-zinc-700/80"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </div>

            {isInlineModal && onClose && (
              <button
                id="btn-close-blocked-modal"
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-zinc-400 hover:text-zinc-200 pt-2 transition-colors"
              >
                Volver al inicio de sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
