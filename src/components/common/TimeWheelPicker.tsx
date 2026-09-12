import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Clock, CheckCircle2, AlertCircle, Check, X } from 'lucide-react';
import { formatTime12h, isTimeWithinBusinessHours } from '../../lib/utils';

export interface TimeWheelPickerProps {
  value: string; // 24h format: "HH:MM" e.g. "10:00" or "14:30"
  onChange: (time24: string) => void;
  minTime?: string; // e.g. "08:00"
  maxTime?: string; // e.g. "20:00"
  barberName?: string;
  stepMinutes?: number; // 15 or 30 (default 30)
  title?: string;
  showRangeInfo?: boolean;
}

// Convert 24h "HH:MM" into { hour12: 1-12, minute: 0-59, period: 'AM' | 'PM' }
export function parse24to12(time24: string) {
  if (!time24 || !time24.includes(':')) {
    return { hour12: 10, minute: 0, period: 'AM' as const };
  }
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) h = 10;

  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  // Round minute to nearest valid step
  let roundedM = 0;
  if (m >= 45) roundedM = 45;
  else if (m >= 30) roundedM = 30;
  else if (m >= 15) roundedM = 15;
  else roundedM = 0;

  return { hour12, minute: roundedM, period };
}

// Convert 12h into 24h "HH:MM"
export function format12to24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let h24 = hour12;
  if (period === 'AM') {
    if (h24 === 12) h24 = 0;
  } else {
    if (h24 !== 12) h24 += 12;
  }
  const hStr = String(h24).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

export const TimeWheelPicker: React.FC<TimeWheelPickerProps> = ({
  value,
  onChange,
  minTime = '08:00',
  maxTime = '20:00',
  barberName,
  stepMinutes = 30,
  title = 'Configurar hora (rodar tipo alarma celular)',
  showRangeInfo = true,
}) => {
  const initial = parse24to12(value || minTime);
  const [hour12, setHour12] = useState<number>(initial.hour12);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  // Touch drag state refs
  const hourTouchY = useRef<number | null>(null);
  const minTouchY = useRef<number | null>(null);
  const periodTouchY = useRef<number | null>(null);

  // Sync state when value changes externally with guard against redundant renders
  useEffect(() => {
    if (value) {
      const parsed = parse24to12(value);
      setHour12((prev) => (prev !== parsed.hour12 ? parsed.hour12 : prev));
      setMinute((prev) => (prev !== parsed.minute ? parsed.minute : prev));
      setPeriod((prev) => (prev !== parsed.period ? parsed.period : prev));
    }
  }, [value]);

  const minutesList = stepMinutes === 15 ? [0, 15, 30, 45] : [0, 30];

  const emitChange = (newH: number, newM: number, newP: 'AM' | 'PM') => {
    const time24 = format12to24(newH, newM, newP);
    onChange(time24);
  };

  // Hour Stepper
  const handleHourStep = (delta: number) => {
    let next = hour12 + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour12(next);
    emitChange(next, minute, period);
  };

  // Minute Stepper
  const handleMinuteStep = (delta: number) => {
    const idx = minutesList.indexOf(minute);
    const validIdx = idx >= 0 ? idx : 0;
    let nextIdx = (validIdx + delta + minutesList.length) % minutesList.length;
    const nextM = minutesList[nextIdx];
    setMinute(nextM);
    emitChange(hour12, nextM, period);
  };

  // Toggle Period AM/PM
  const togglePeriod = (newP: 'AM' | 'PM') => {
    if (period !== newP) {
      setPeriod(newP);
      emitChange(hour12, minute, newP);
    }
  };

  // Previous & Next items for visual cylindrical roll effect
  const prevHour = hour12 - 1 < 1 ? 12 : hour12 - 1;
  const nextHour = hour12 + 1 > 12 ? 1 : hour12 + 1;

  const minIdx = minutesList.indexOf(minute) >= 0 ? minutesList.indexOf(minute) : 0;
  const prevMin = minutesList[(minIdx - 1 + minutesList.length) % minutesList.length];
  const nextMin = minutesList[(minIdx + 1) % minutesList.length];

  const currentTime24 = format12to24(hour12, minute, period);
  const isWithinHours = isTimeWithinBusinessHours(currentTime24, minTime, maxTime);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3 select-none">
      {/* Header Info */}
      {showRangeInfo && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{title}</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            Rango: <strong className="text-amber-300">{formatTime12h(minTime)}</strong> a{' '}
            <strong className="text-amber-300">{formatTime12h(maxTime)}</strong>
          </div>
        </div>
      )}

      {/* Main Clock Wheel Container */}
      <div className="relative py-3 px-3 sm:px-6 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col items-center overflow-hidden">
        {/* Horizontal Alarm Beam Highlight */}
        <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-16 bg-amber-500/10 rounded-xl border border-amber-500/30 pointer-events-none shadow-lg shadow-amber-500/5 z-0" />

        <div className="grid grid-cols-3 gap-2 sm:gap-6 w-full max-w-xs relative z-10 items-center text-center">
          {/* COLUMN 1: HORA (1 - 12) CON RUEDA GIRATORIA */}
          <div
            className="flex flex-col items-center touch-none"
            onWheel={(e) => {
              e.preventDefault();
              handleHourStep(e.deltaY > 0 ? 1 : -1);
            }}
            onTouchStart={(e) => {
              hourTouchY.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (hourTouchY.current !== null) {
                const diff = e.touches[0].clientY - hourTouchY.current;
                if (Math.abs(diff) > 22) {
                  handleHourStep(diff > 0 ? -1 : 1);
                  hourTouchY.current = e.touches[0].clientY;
                }
              }
            }}
            onTouchEnd={() => {
              hourTouchY.current = null;
            }}
          >
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">
              Hora
            </span>

            {/* Up Step Button */}
            <button
              type="button"
              onClick={() => handleHourStep(-1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Hora anterior"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Wheel Stack: Prev, Active, Next */}
            <div className="flex flex-col items-center justify-center py-1 cursor-ns-resize">
              {/* Previous Hour (Faded) */}
              <button
                type="button"
                onClick={() => handleHourStep(-1)}
                className="text-xs sm:text-sm font-semibold text-zinc-500 font-mono opacity-40 hover:opacity-80 transition-opacity"
              >
                {String(prevHour).padStart(2, '0')}
              </button>

              {/* Active Hour (Center) */}
              <div className="h-14 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-md text-amber-300">
                  {String(hour12).padStart(2, '0')}
                </span>
              </div>

              {/* Next Hour (Faded) */}
              <button
                type="button"
                onClick={() => handleHourStep(1)}
                className="text-xs sm:text-sm font-semibold text-zinc-500 font-mono opacity-40 hover:opacity-80 transition-opacity"
              >
                {String(nextHour).padStart(2, '0')}
              </button>
            </div>

            {/* Down Step Button */}
            <button
              type="button"
              onClick={() => handleHourStep(1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Siguiente hora"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* COLUMN 2: MINUTOS (:00 / :15 / :30 / :45) CON RUEDA GIRATORIA */}
          <div
            className="flex flex-col items-center touch-none"
            onWheel={(e) => {
              e.preventDefault();
              handleMinuteStep(e.deltaY > 0 ? 1 : -1);
            }}
            onTouchStart={(e) => {
              minTouchY.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (minTouchY.current !== null) {
                const diff = e.touches[0].clientY - minTouchY.current;
                if (Math.abs(diff) > 22) {
                  handleMinuteStep(diff > 0 ? -1 : 1);
                  minTouchY.current = e.touches[0].clientY;
                }
              }
            }}
            onTouchEnd={() => {
              minTouchY.current = null;
            }}
          >
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">
              Minutos
            </span>

            {/* Up Step Button */}
            <button
              type="button"
              onClick={() => handleMinuteStep(-1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Minutos anteriores"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Wheel Stack: Prev, Active, Next */}
            <div className="flex flex-col items-center justify-center py-1 cursor-ns-resize">
              {/* Previous Minute (Faded) */}
              <button
                type="button"
                onClick={() => handleMinuteStep(-1)}
                className="text-xs sm:text-sm font-semibold text-zinc-500 font-mono opacity-40 hover:opacity-80 transition-opacity"
              >
                :{String(prevMin).padStart(2, '0')}
              </button>

              {/* Active Minute (Center) */}
              <div className="h-14 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-md text-amber-300">
                  :{String(minute).padStart(2, '0')}
                </span>
              </div>

              {/* Next Minute (Faded) */}
              <button
                type="button"
                onClick={() => handleMinuteStep(1)}
                className="text-xs sm:text-sm font-semibold text-zinc-500 font-mono opacity-40 hover:opacity-80 transition-opacity"
              >
                :{String(nextMin).padStart(2, '0')}
              </button>
            </div>

            {/* Down Step Button */}
            <button
              type="button"
              onClick={() => handleMinuteStep(1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/80 rounded-lg transition-colors cursor-pointer"
              title="Siguientes minutos"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* COLUMN 3: AM / PM SELECTOR RODANTE */}
          <div
            className="flex flex-col items-center touch-none"
            onWheel={(e) => {
              e.preventDefault();
              togglePeriod(period === 'AM' ? 'PM' : 'AM');
            }}
            onTouchStart={(e) => {
              periodTouchY.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (periodTouchY.current !== null) {
                const diff = e.touches[0].clientY - periodTouchY.current;
                if (Math.abs(diff) > 22) {
                  togglePeriod(period === 'AM' ? 'PM' : 'AM');
                  periodTouchY.current = e.touches[0].clientY;
                }
              }
            }}
            onTouchEnd={() => {
              periodTouchY.current = null;
            }}
          >
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 mb-1">
              AM / PM
            </span>

            <div className="h-32 flex flex-col justify-center gap-2">
              <button
                type="button"
                onClick={() => togglePeriod('AM')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50'
                    : 'bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                AM
              </button>

              <button
                type="button"
                onClick={() => togglePeriod('PM')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 scale-105 ring-2 ring-amber-400/50'
                    : 'bg-zinc-800/90 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1">
          <span>💡 Rueda con el mouse o desliza con el dedo para cambiar</span>
        </div>
      </div>

      {/* Selected Time Display & Working Hours Validation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Hora seleccionada:</span>
          <span className="text-sm font-black text-amber-300 font-mono px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 shadow-inner">
            {formatTime12h(currentTime24)}
          </span>
        </div>

        <div>
          {isWithinHours ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Dentro del horario de {barberName || 'atención'}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                onChange(minTime);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full hover:bg-rose-500/20 transition-colors cursor-pointer"
              title="Ajustar automáticamente al horario de apertura"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Fuera de horario • Ajustar a {formatTime12h(minTime)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact Interactive Input with Popover Alarm Wheel
interface TimeWheelInputProps {
  value: string; // 24h format
  onChange: (time24: string) => void;
  label?: string;
  minTime?: string;
  maxTime?: string;
  barberName?: string;
  stepMinutes?: number;
  className?: string;
}

export const TimeWheelInput: React.FC<TimeWheelInputProps> = ({
  value,
  onChange,
  label,
  minTime = '08:00',
  maxTime = '22:00',
  barberName,
  stepMinutes = 30,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-amber-500/60 rounded-xl px-3 py-2 text-xs sm:text-sm text-white transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-2 font-mono">
          <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-amber-300">{formatTime12h(value || '10:00')}</span>
          <span className="text-[10px] text-zinc-500">({value || '10:00'})</span>
        </div>
        <span className="text-[11px] text-zinc-400 group-hover:text-amber-400 transition-colors">
          {isOpen ? 'Cerrar' : 'Rodar hora ▼'}
        </span>
      </button>

      {/* Popover Alarm Wheel Modal */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 p-1 bg-zinc-950 border border-zinc-700 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Seleccionar Hora (Tipo Alarma)
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2">
            <TimeWheelPicker
              value={value}
              onChange={onChange}
              minTime={minTime}
              maxTime={maxTime}
              barberName={barberName}
              stepMinutes={stepMinutes}
              showRangeInfo={false}
            />
          </div>

          <div className="p-2 pt-0 flex justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              Confirmar {formatTime12h(value)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
