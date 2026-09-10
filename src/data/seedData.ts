import { Business, ClientProfile, Appointment, AppNotification, AuthCode, QueueEntry, DailyClosure } from '../types';

export const ADMIN_EMAIL = 'financieranova0@gmail.com';
export const ADMIN_EMAILS = [
  'financieranova0@gmail.com',
  'miguelsosam1616@gmail.com',
];

export const isSuperAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === clean);
};
export const ADMIN_WHATSAPP = '18292949355';
export const ADMIN_WHATSAPP_DISPLAY = '+1 829 294 9355';

// 100% clean initial state - No dummy examples or mock records
export const INITIAL_BUSINESSES: Business[] = [];

export const INITIAL_CLIENT: ClientProfile = {
  id: '',
  name: '',
  email: '',
  phone: '',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  savedBusinessCodes: [],
  createdAt: new Date().toISOString(),
};

export const INITIAL_APPOINTMENTS: Appointment[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Clean initial state: No default authorization codes
export const INITIAL_AUTH_CODES: AuthCode[] = [];

export const INITIAL_QUEUE: QueueEntry[] = [];

export const INITIAL_DAILY_CLOSURES: DailyClosure[] = [];
