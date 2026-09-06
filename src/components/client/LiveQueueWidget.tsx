import React from 'react';
import { Clock, Users, Scissors, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNovaDb } from '../../lib/store';
import { formatDominicanDate, formatTime12h } from '../../lib/utils';
import { Business } from '../../types';

interface LiveQueueWidgetProps {
  business: Business;
}

export const LiveQueueWidget: React.FC<LiveQueueWidgetProps> = ({ business }) => {
  const { queue } = useNovaDb();

  // Today string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Active queue entries for this business today
  const bizQueue = queue.filter(
    (q) => q.businessId === business.id && q.date === todayStr && (q.status === 'en_espera' || q.status === 'atendiendo')
  );

  const waitingEntries = bizQueue.filter((q) => q.status === 'en_espera');
  const inChairEntries = bizQueue.filter((q) => q.status === 'atendiendo');

  // Estimate wait time: average service duration ~ 25-30 mins per person / active barbers
  const activeBarbersCount = Math.max(1, business.barbers.filter((b) => b.active).length);
  const estimatedWaitMins = Math.ceil((waitingEntries.length * 25) / activeBarbersCount);

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Users className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Fila de Espera en Vivo
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Tiempo Real
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Consulta cuántas personas han llegado y están esperando antes de salir de casa
              </p>
            </div>
          </div>
        </div>

        {/* Live Wait Counter Indicator */}
        <div className="flex items-center gap-3 bg-zinc-950/80 border border-zinc-800 px-4 py-2.5 rounded-2xl shrink-0">
          <div className="text-center sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Tiempo estimado
            </span>
            <span className="text-sm font-black text-amber-400">
              {waitingEntries.length === 0 ? 'Sin espera' : `~${estimatedWaitMins} mins`}
            </span>
          </div>
          <div className="h-7 w-px bg-zinc-800" />
          <div className="text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              En espera ahora
            </span>
            <span className="text-base font-black text-white">
              {waitingEntries.length} {waitingEntries.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {bizQueue.length === 0 ? (
        <div className="text-center py-6 px-4 bg-zinc-950/50 border border-dashed border-zinc-800 rounded-2xl space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-white">¡No hay fila en este momento!</p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Todos los asientos están despejados. Si llegas ahora serás atendido de inmediato por uno de nuestros barberos disponibles.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active in chair currently */}
          {inChairEntries.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5" />
                Siendo Atendidos en la Silla ({inChairEntries.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {inChairEntries.map((item) => (
                  <div
                    key={item.id}
                    className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-xs font-bold text-white">
                          {item.clientName}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        {item.serviceName} • Con <strong className="text-zinc-200">{item.barberName}</strong>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-md block">
                        En corte
                      </span>
                      {item.startedAt && (
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          Inicio: {item.startedAt}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Waiting in line */}
          {waitingEntries.length > 0 && (
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Personas Esperando su Turno ({waitingEntries.length})
              </span>
              <div className="divide-y divide-zinc-800/80 bg-zinc-950/60 border border-zinc-800/80 rounded-2xl overflow-hidden">
                {waitingEntries.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center text-xs font-black shrink-0">
                        #{idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {item.clientName}
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          {item.serviceName} • Preferencia: <strong className="text-zinc-300">{item.barberName}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        Llegó: {item.arrivalTime}
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Turno #{idx + 1} en espera
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
