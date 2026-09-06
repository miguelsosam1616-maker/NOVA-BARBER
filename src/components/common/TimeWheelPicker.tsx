import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatTime12h, isTimeWithinBusinessHours } from '../../lib/utils';

interface TimeWheelPickerProps {
  value: string; // 24h format: "HH:MM" e.g. "10:00" or "22:00"
  onChange: (time24: string) => void;
  minTime?: string; // e.g. "08:00" from barber workHours.start
  maxTime?: string; // e.g. "20:00" from barber workHours.end
  barberName?: string;
  stepMinutes?: number; // default 30
}

// Helper to convert 24h "HH:MM" into { hour12: number, minute: number, period: 'AM' | 'PM' }
function parse24to12(time24: string) {
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

  // Round minute to nearest 30 or 15
  const roundedM = m >= 45 ? 30 : m >= 15 ? 30 : 0;

  return { hour12, minute: roundedM, period };
}

// Helper to convert 12h into 24h "HH:MM"
function format12to24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
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
}) => {
  const initial = parse24to12(value || minTime);
  const [hour12, setHour12] = useState<number>(initial.hour12);
  const [minute, setMinute] = useState<number>(initial.minute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initial.period);

  // Sync internal state when external value changes
  useEffect(() => {
    if (value) {
      const parsed = parse24to12(value);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setPeriod(parsed.period);
    }
  }, [value]);

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = stepMinutes === 15 ? [0, 15, 30, 45] : [0, 30];

  const emitChange = (newH: number, newM: number, newP: 'AM' | 'PM') => {
    const time24 = format12to24(newH, newM, newP);
    onChange(time24);
  };

  // Up/Down adjustments
  const handleHourStep = (delta: number) => {
    let next = hour12 + delta;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    setHour12(next);
    emitChange(next, minute, period);
  };

  const handleMinuteStep = (delta: number) => {
    const idx = minutesList.indexOf(minute);
    let nextIdx = (idx + delta + minutesList.length) % minutesList.length;
    const nextM = minutesList[nextIdx];
    setMinute(nextM);
    emitChange(hour12, nextM, period);
  };

  const togglePeriod = (newPeriod: 'AM' | 'PM') => {
    if (period !== newPeriod) {
      setPeriod(newPeriod);
      emitChange(hour12, minute, newPeriod);
    }
  };

  const currentTime24 = format12to24(hour12, minute, period);
  const isWithinHours = isTimeWithinBusinessHours(currentTime24, minTime, maxTime);

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-xl space-y-3.5 select-none">
      {/* Schedule Info Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs text-zinc-300 font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Configurar hora como en alarma del celular</span>
        </div>
        <div className="text-[11px] text-zinc-400 font-mono">
          Horario: <strong className="text-amber-300">{formatTime12h(minTime)}</strong> a{' '}
          <strong className="text-amber-300">{formatTime12h(maxTime)}</strong>
        </div>
      </div>

      {/* Main Clock Wheel Container */}
      <div className="relative py-2 px-3 bg-zinc-900/90 rounded-2xl border border-zinc-800 flex flex-col items-center">
        {/* Glow behind the active selection */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-14 bg-amber-500/10 rounded-xl border border-amber-500/30 pointer-events-none shadow-lg shadow-amber-500/5" />

        <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-xs relative z-10 items-center text-center">
          {/* COLUMN 1: HORA (1 - 12) */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">
              Hora
            </span>
            <button
              type="button"
              onClick={() => handleHourStep(1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Avanzar hora"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Wheel roller viewport */}
            <div className="h-14 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
                {String(hour12).padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleHourStep(-1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Retroceder hora"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* COLUMN 2: MINUTO (:00 / :30) */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">
              Minutos
            </span>
            <button
              type="button"
              onClick={() => handleMinuteStep(1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Cambiar minutos"
            >
              <ChevronUp className="w-5 h-5" />
            </button>

            {/* Wheel roller viewport */}
            <div className="h-14 flex items-center justify-center">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
                :{String(minute).padStart(2, '0')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleMinuteStep(-1)}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              title="Cambiar minutos"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* COLUMN 3: AM / PM RUEDA */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">
              AM / PM
            </span>

            <div className="h-24 flex flex-col justify-center gap-1.5">
              <button
                type="button"
                onClick={() => togglePeriod('AM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  period === 'AM'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 scale-105'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                AM
              </button>

              <button
                type="button"
                onClick={() => togglePeriod('PM')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  period === 'PM'
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/30 scale-105'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                }`}
              >
                PM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Time Display & Barber Working Hours Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Hora seleccionada:</span>
          <span className="text-sm font-black text-amber-400 font-mono px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
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
              title="Haz clic para ajustar automáticamente"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Fuera de horario laboral • Ajustar a {formatTime12h(minTime)}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
