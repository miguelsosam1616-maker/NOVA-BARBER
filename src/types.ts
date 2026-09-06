export type UserRole = 'client' | 'business';

export type AuthRole = 'client' | 'business' | 'admin';

export type BusinessAccountStatus = 'activa' | 'suspendida' | 'vencida';

export interface AuthCode {
  id: string;
  code: string; // e.g. "NOVA-9281-AUTH"
  status: 'available' | 'claimed' | 'revoked';
  assignedEmail?: string; // Pre-assigned or bound upon registration
  claimedByEmail?: string;
  claimedBusinessId?: string;
  claimedBusinessName?: string;
  note?: string; // e.g. "Barbería Santiago Centro"
  createdAt: string;
  claimedAt?: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: AuthRole;
  businessId?: string;
  clientId?: string;
  authCode?: string;
  accountStatus?: BusinessAccountStatus;
  statusReason?: string;
}

export type AppointmentStatus = 'pendiente' | 'confirmada' | 'rechazada' | 'cancelada' | 'completada' | 'cambio_propuesto';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number; // in RD$
  duration: number; // in minutes (e.g. 30, 45, 60)
  image?: string; // Optional image URL or base64
  category: 'cortes' | 'barba' | 'combos' | 'faciales' | 'color' | 'otros';
  active: boolean;
}

export interface Barber {
  id: string;
  name: string;
  nickname?: string; // e.g. "El Maestro", "Flow"
  avatar: string;
  phone: string;
  specialties: string[];
  workDays: number[]; // 0=Domingo, 1=Lunes, ... 6=Sabado
  workHours: {
    start: string; // "09:00"
    end: string;   // "20:00"
  };
  active: boolean;
  commissionRate: number; // Percentage, e.g. 50%
}

export interface Expense {
  id: string;
  title: string;
  amount: number; // RD$
  category: 'insumos' | 'alquiler' | 'servicios' | 'mantenimiento' | 'otro';
  date: string; // YYYY-MM-DD
}

export interface Business {
  id: string;
  code: string; // e.g. "NOVA-BRB-48291"
  name: string;
  type: 'barberia' | 'salon' | 'spa';
  ownerName: string;
  ownerEmail: string;
  phone: string; // Dominican WhatsApp (809/829/849)
  address: string;
  city: string;
  description: string;
  logo: string;
  coverImage: string;
  openingHour: string; // "09:00"
  closingHour: string; // "20:00"
  workDays: number[]; // e.g. [1, 2, 3, 4, 5, 6] (Lun - Sab)
  slotDurationMinutes: number; // default 30
  services: Service[];
  barbers: Barber[];
  expenses: Expense[];
  createdAt: string;
  authCodeUsed?: string;
  accountStatus?: BusinessAccountStatus; // 'activa' | 'suspendida' | 'vencida' (defaults to 'activa')
  statusReason?: string;
  statusUpdatedAt?: string;
}

export interface Appointment {
  id: string;
  businessId: string;
  businessCode: string;
  businessName: string;
  businessPhone: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number; // RD$
  serviceDuration: number;
  barberId: string;
  barberName: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (e.g. "15:00")
  status: AppointmentStatus;
  notes?: string;
  proposedDate?: string; // For rescheduling
  proposedTime?: string; // For rescheduling
  rescheduleNote?: string;
  rescheduleRequestedBy?: 'business' | 'client';
  createdAt: string;
  updatedAt: string;
}

export type QueueStatus = 'en_espera' | 'atendiendo' | 'completado' | 'cancelado';

export interface QueueEntry {
  id: string;
  businessId: string;
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number; // RD$
  serviceDuration: number; // minutes
  barberId: string;
  barberName: string;
  arrivalTime: string; // HH:MM
  date: string; // YYYY-MM-DD
  status: QueueStatus;
  startedAt?: string;
  completedAt?: string;
  paidAmount?: number;
  paymentMethod?: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
  notes?: string;
  createdAt: string;
}

export interface DailyClosureItem {
  id: string;
  type: 'walk_in' | 'appointment';
  clientName: string;
  serviceName: string;
  barberName: string;
  amountPaid: number;
  time: string;
  paymentMethod?: string;
}

export interface DailyClosure {
  id: string;
  businessId: string;
  businessName: string;
  date: string; // YYYY-MM-DD
  closedAt: string; // ISO string
  closedBy: string;
  items: DailyClosureItem[];
  totalWalkIns: number;
  totalAppointments: number;
  totalClients: number;
  totalRevenue: number; // RD$
  notes?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  savedBusinessCodes: string[];
  createdAt: string;
  accountStatus?: BusinessAccountStatus; // 'activa' | 'suspendida' | 'vencida' (defaults to 'activa')
  statusReason?: string;
  statusUpdatedAt?: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole;
  recipientId: string; // clientId or businessId
  title: string;
  message: string;
  type: 'new_request' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'reminder' | 'reschedule_proposed' | 'reschedule_accepted' | 'reschedule_rejected';
  appointmentId?: string;
  timestamp: string;
  read: boolean;
}
