import { AppointmentStatus } from '../types';

// Format currency as Dominican Pesos (RD$)
export function formatRD(amount?: number | string | null): string {
  try {
    const num = Number(amount || 0);
    const valid = isNaN(num) ? 0 : num;
    try {
      return `RD$ ${valid.toLocaleString('es-DO')}`;
    } catch {
      return `RD$ ${valid.toLocaleString()}`;
    }
  } catch {
    return `RD$ ${amount || 0}`;
  }
}

// Format phone number to (809) 555-1234 (null-safe)
export function formatDominicanPhone(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return 'Sin teléfono';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// Clean phone for WhatsApp URL (standard Dominican format is +1 809/829/849)
export function getWhatsAppCleanNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) {
    digits = `1${digits}`;
  }
  return digits;
}

// Generate direct WhatsApp chat URL with prefilled greeting in RD style
export function getWhatsAppLink(phone?: string | null, message: string = ''): string {
  if (!phone) return '#';
  const cleanPhone = getWhatsAppCleanNumber(phone);
  if (!cleanPhone) return '#';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

// Format date into Spanish friendly: "Viernes 4 de Septiembre, 2026"
export function formatDominicanDate(dateStr?: string | null, includeDayOfWeek: boolean = true): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  try {
    const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDateStr.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const months = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const dayName = days[date.getDay()] || '';
        const monthName = months[date.getMonth()] || '';
        if (includeDayOfWeek) {
          return `${dayName}, ${day} de ${monthName}`;
        }
        return `${day} de ${monthName}, ${year}`;
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-DO', { dateStyle: 'medium' });
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

// Time formatter (e.g. "15:00" -> "3:00 PM")
export function formatTime12h(time24?: string | null): string {
  if (!time24 || typeof time24 !== 'string') return '';
  try {
    const parts = time24.split(':');
    if (parts.length === 0) return time24;
    let h = parseInt(parts[0], 10);
    if (isNaN(h)) return time24;
    const m = parts[1] ? parts[1].slice(0, 2) : '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // 0 => 12
    return `${h}:${m} ${ampm}`;
  } catch {
    return time24 || '';
  }
}

// Status helpers
export function getStatusBadgeInfo(status: AppointmentStatus): {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (status) {
    case 'pendiente':
      return {
        label: '🟡 Pendiente',
        dotColor: 'bg-amber-400',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
      };
    case 'confirmada':
      return {
        label: '🟢 Confirmada',
        dotColor: 'bg-emerald-400',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
      };
    case 'rechazada':
      return {
        label: '🔴 Rechazada',
        dotColor: 'bg-rose-400',
        bgColor: 'bg-rose-500/10',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-500/30',
      };
    case 'cancelada':
      return {
        label: '⚫ Cancelada',
        dotColor: 'bg-zinc-400',
        bgColor: 'bg-zinc-500/10',
        textColor: 'text-zinc-400',
        borderColor: 'border-zinc-500/30',
      };
    case 'completada':
      return {
        label: '🔵 Completada',
        dotColor: 'bg-blue-400',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
      };
    case 'cambio_propuesto':
      return {
        label: '🔄 Cambio de Hora Propuesto',
        dotColor: 'bg-cyan-400',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-400',
        borderColor: 'border-cyan-500/30',
      };
    default:
      return {
        label: status,
        dotColor: 'bg-zinc-400',
        bgColor: 'bg-zinc-500/10',
        textColor: 'text-zinc-400',
        borderColor: 'border-zinc-500/30',
      };
  }
}

// Generate schedule time slots between start and end hour (e.g. 09:00 to 20:00 every 30 mins)
export function generateTimeSlots(startHourStr: string, endHourStr: string, stepMinutes: number = 30): string[] {
  const slots: string[] = [];
  const [sH, sM] = (startHourStr || '09:00').split(':').map(Number);
  const [eH, eM] = (endHourStr || '20:00').split(':').map(Number);

  let currentMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;

  while (currentMin < endMin) {
    const h = Math.floor(currentMin / 60);
    const m = currentMin % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(timeStr);
    currentMin += stepMinutes;
  }

  return slots;
}

// Check if a given time is within business operating hours
export function isTimeWithinBusinessHours(timeStr: string, openStr: string, closeStr: string): boolean {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  const [sH, sM] = (openStr || '09:00').split(':').map(Number);
  const [eH, eM] = (closeStr || '20:00').split(':').map(Number);
  const totalMin = h * 60 + (m || 0);
  const startMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  return totalMin >= startMin && totalMin <= endMin;
}

// Generate unique business code (e.g., IMPERIO-2026, BARBER-8841)
export function generateUniqueBusinessCode(name: string): string {
  const cleanName = name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 8);
  const prefix = cleanName.length >= 3 ? cleanName : 'BARBER';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomSuffix}`;
}
