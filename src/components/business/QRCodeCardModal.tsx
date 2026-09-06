import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Copy, Check, QrCode, Sparkles, Smartphone } from 'lucide-react';
import { Business } from '../../types';

interface QRCodeCardModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeCardModal: React.FC<QRCodeCardModalProps> = ({ business, isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Deep link or code payload for the QR
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://novabarber.do';
  const bookingUrl = `${baseUrl}?code=${encodeURIComponent(business.code)}`;

  useEffect(() => {
    if (isOpen && business.code) {
      QRCode.toDataURL(bookingUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR:', err));
    }
  }, [isOpen, business.code, bookingUrl]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(business.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `QR-${business.code}-${business.name.replace(/\s+/g, '_')}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl text-white overflow-hidden z-10 my-6"
          >
            {/* Top Bar */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm sm:text-base text-zinc-100">
                  Código y QR de Mostrador
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Counter Stand Preview */}
            <div className="p-5 max-h-[80vh] overflow-y-auto">
              <div
                id="counter-card-print-area"
                className="bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-500/40 rounded-2xl p-6 text-center relative shadow-2xl overflow-hidden"
              >
                {/* Decorative header badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nova Barber RD • Reserva en Línea
                </div>

                {/* Business Logo & Name */}
                <div className="flex flex-col items-center justify-center mb-4">
                  {business.logo ? (
                    <img
                      src={business.logo}
                      alt={business.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-md mb-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 text-xl font-bold mb-2">
                      ✂️
                    </div>
                  )}
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-50 tracking-tight">
                    {business.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{business.address}</p>
                </div>

                {/* Counter Catchphrase */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 my-4">
                  <div className="flex items-center justify-center gap-1.5 text-amber-300 font-bold text-sm sm:text-base">
                    <Smartphone className="w-4 h-4 shrink-0" />
                    ¿Quieres reservar tu próxima cita?
                  </div>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    Apunta la cámara de tu celular a este código QR
                  </p>
                </div>

                {/* QR Code Canvas Render */}
                <div className="flex justify-center my-3">
                  <div className="p-3.5 bg-white rounded-2xl shadow-xl inline-block border-4 border-amber-400/80">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt={`QR de ${business.name}`}
                        className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                        Generando QR...
                      </div>
                    )}
                  </div>
                </div>

                {/* Unique Business Code Display */}
                <div className="mt-3">
                  <span className="text-[11px] text-zinc-400 font-medium tracking-wide block uppercase">
                    O introduce este Código Único:
                  </span>
                  <div className="inline-flex items-center gap-2 mt-1 px-4 py-2 bg-zinc-800/90 border border-amber-500/40 rounded-xl">
                    <span className="font-mono text-base sm:text-lg font-black tracking-wider text-amber-300">
                      {business.code}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-700 transition-colors"
                      title="Copiar código"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-emerald-400 mt-1 font-medium">¡Código copiado!</p>
                  )}
                </div>

                {/* Simple 3-step Instructions */}
                <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-zinc-800 text-[11px] text-zinc-300">
                  <div className="bg-zinc-800/50 p-2 rounded-lg">
                    <span className="text-amber-400 font-bold block text-xs">1. Escanea</span>
                    con la cámara de tu móvil
                  </div>
                  <div className="bg-zinc-800/50 p-2 rounded-lg">
                    <span className="text-amber-400 font-bold block text-xs">2. Elige</span>
                    servicio, barbero y fecha
                  </div>
                  <div className="bg-zinc-800/50 p-2 rounded-lg">
                    <span className="text-amber-400 font-bold block text-xs">3. ¡Listo!</span>
                    cita confirmada en vivo
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 mt-5">
                <button
                  onClick={handlePrint}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm rounded-xl transition-colors shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir para Mostrador
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-xl border border-zinc-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Descargar QR
                </button>
              </div>

              <p className="text-center text-xs text-zinc-400 mt-3">
                💡 Imprime este diseño y colócalo en un portarretratos o base acrílica sobre tu mostrador.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
