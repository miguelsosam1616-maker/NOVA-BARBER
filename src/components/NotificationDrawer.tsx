import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Bell, Check, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { UserRole } from '../types';
import { useNovaDb } from '../lib/store';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  currentId: string;
  onSelectAppointment?: (aptId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  role,
  currentId,
  onSelectAppointment,
}) => {
  const { db, notifications } = useNovaDb();

  const roleNotifs = notifications.filter(
    (n) => n.recipientRole === role && (n.recipientId === currentId || !n.recipientId)
  );
  const unreadCount = roleNotifs.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    db.markAllNotificationsAsRead(role, currentId);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      case 'new_request':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'completed':
        return <Check className="w-5 h-5 text-blue-400" />;
      default:
        return <Clock className="w-5 h-5 text-zinc-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="relative w-full max-w-md bg-zinc-950 border-l border-zinc-800 text-white flex flex-col h-full z-10 shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-100">Notificaciones</h3>
                  <p className="text-xs text-zinc-400">
                    {unreadCount > 0 ? `${unreadCount} sin leer` : 'Al día'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-amber-400 hover:text-amber-300 px-2.5 py-1 rounded-md hover:bg-zinc-900 border border-amber-500/20 transition-colors"
                  >
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 p-3 space-y-2">
              {roleNotifs.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                    <Bell className="w-6 h-6" />
                  </div>
                  <p className="text-zinc-300 font-medium text-sm">No tienes notificaciones</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Aquí aparecerán las actualizaciones de tus citas en tiempo real.
                  </p>
                </div>
              ) : (
                roleNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      db.markNotificationAsRead(notif.id);
                      if (notif.appointmentId && onSelectAppointment) {
                        onSelectAppointment(notif.appointmentId);
                        onClose();
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      notif.read
                        ? 'bg-zinc-900/40 border-zinc-800/60 opacity-80 hover:opacity-100 hover:bg-zinc-900'
                        : 'bg-zinc-900 border-amber-500/30 hover:border-amber-500/50 shadow-md shadow-black/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-1.5 rounded-lg bg-zinc-800 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-zinc-100 truncate">
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-zinc-500 mt-2 block">
                          {new Date(notif.timestamp).toLocaleTimeString('es-DO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50 text-center text-xs text-zinc-500">
              Sincronización en vivo activada 🟢
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
