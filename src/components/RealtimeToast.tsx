import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { AppNotification } from '../types';
import { useNovaDb } from '../lib/store';

interface RealtimeToastProps {
  currentRole?: 'client' | 'business' | 'admin';
  currentId?: string;
  onOpenNotifications?: () => void;
  onOpenAppointment?: (aptId: string) => void;
}

export const RealtimeToast: React.FC<RealtimeToastProps> = ({
  currentRole = 'client',
  currentId = '',
  onOpenNotifications = () => {},
  onOpenAppointment,
}) => {
  const { notifications } = useNovaDb();
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
  const [lastSeenId, setLastSeenId] = useState<string>('');

  // Find the latest unread notification for the current active role & id
  const relevant = notifications.filter(
    (n) => n.recipientRole === currentRole && (n.recipientId === currentId || !n.recipientId) && !n.read
  );
  const latestNotification = relevant.length > 0 ? relevant[0] : null;
  const latestId = latestNotification?.id || '';

  useEffect(() => {
    if (latestId && latestId !== lastSeenId && latestNotification) {
      setLastSeenId(latestId);
      setActiveToast(latestNotification);

      // Auto dismiss after 6 seconds
      const timer = setTimeout(() => {
        setActiveToast((prev) => (prev?.id === latestId ? null : prev));
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [latestId, lastSeenId, latestNotification]);

  if (!activeToast) return null;

  const getIcon = () => {
    switch (activeToast.type) {
      case 'accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'new_request':
        return <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <Bell className="w-5 h-5 text-amber-400 shrink-0" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 pointer-events-auto"
      >
        <div className="bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 rounded-xl p-4 shadow-2xl shadow-black/80 flex items-start gap-3 text-white">
          <div className="mt-0.5 p-2 bg-zinc-800 rounded-lg border border-zinc-700">
            {getIcon()}
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => {
              if (activeToast.appointmentId && onOpenAppointment) {
                onOpenAppointment(activeToast.appointmentId);
              } else {
                onOpenNotifications();
              }
              setActiveToast(null);
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                En tiempo real
              </span>
              <span className="text-[10px] text-zinc-400">Ahora</span>
            </div>
            <h4 className="text-sm font-bold text-zinc-100 mt-0.5">{activeToast.title}</h4>
            <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
              {activeToast.message}
            </p>
          </div>

          <button
            onClick={() => setActiveToast(null)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
