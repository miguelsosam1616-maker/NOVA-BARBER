import { useState, useEffect, useCallback } from 'react';
import {
  Business,
  ClientProfile,
  Appointment,
  AppNotification,
  AppointmentStatus,
  Service,
  Barber,
  Expense,
  UserRole,
  AuthCode,
  CurrentUser,
  BusinessAccountStatus,
  QueueEntry,
  DailyClosure,
  DailyClosureItem,
  QueueStatus,
} from '../types';
import {
  ADMIN_EMAIL,
  isSuperAdminEmail,
  INITIAL_BUSINESSES,
  INITIAL_CLIENT,
  INITIAL_APPOINTMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUTH_CODES,
  INITIAL_QUEUE,
  INITIAL_DAILY_CLOSURES,
} from '../data/seedData';
import { soundManager } from './sound';

const STORAGE_KEYS = {
  BUSINESSES: 'nova_businesses_clean_v2',
  CLIENT: 'nova_client_clean_v2',
  CLIENTS: 'nova_clients_list_clean_v2',
  APPOINTMENTS: 'nova_appointments_clean_v2',
  NOTIFICATIONS: 'nova_notifications_clean_v2',
  AUTH_CODES: 'nova_auth_codes_clean_v2',
  CURRENT_USER: 'nova_current_user_clean_v2',
  QUEUE: 'nova_queue_clean_v2',
  DAILY_CLOSURES: 'nova_daily_closures_clean_v2',
};

// Safe storage access
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage quota exceeded or error:', e);
  }
}

// Generate code e.g. NOVA-BRB-48291
export function generateBusinessCode(type: 'barberia' | 'salon' | 'spa' = 'barberia'): string {
  const prefix = type === 'salon' ? 'NOVA-SAL' : type === 'spa' ? 'NOVA-SPA' : 'NOVA-BRB';
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
}

// Global broadcast channel for multi-tab synchronization
type SyncEvent =
  | { type: 'APPOINTMENT_REQUESTED'; appointment: Appointment }
  | { type: 'APPOINTMENT_STATUS_CHANGED'; appointmentId: string; status: AppointmentStatus }
  | { type: 'DATA_CHANGED' }
  | { type: 'AUTH_CHANGED' };

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('nova_barber_sync_channel');
  }
} catch {
  // BroadcastChannel unavailable
}

// Event emitter for local in-window updates
const listeners = new Set<() => void>();
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

if (broadcastChannel) {
  broadcastChannel.onmessage = (event: MessageEvent<SyncEvent>) => {
    const data = event.data;
    if (data.type === 'APPOINTMENT_REQUESTED') {
      soundManager.playNewAppointmentAlert();
    } else if (data.type === 'APPOINTMENT_STATUS_CHANGED' && data.status === 'confirmada') {
      soundManager.playSuccessAlert();
    }
    notifyListeners();
  };
}

// Also listen to storage events across tabs if BroadcastChannel is blocked
if (typeof window !== 'undefined') {
  window.addEventListener('storage', () => {
    notifyListeners();
  });
}

// Background sync & real-time SSE listener
let isSyncing = false;
let isRealtimeConnected = false;
let lastSyncTimestamp = new Date().toISOString();
const realtimeListeners = new Set<(connected: boolean) => void>();

export function getRealtimeStatus() {
  return {
    connected: isRealtimeConnected,
    lastSync: lastSyncTimestamp,
  };
}

function syncFromServerPayload(data: any): boolean {
  if (!data) return false;
  const { businesses, appointments, notifications, authCodes, clients, queue, dailyClosures } = data;
  let hasChanges = false;
  lastSyncTimestamp = new Date().toISOString();

  if (Array.isArray(businesses)) {
    const local = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
    if (JSON.stringify(local) !== JSON.stringify(businesses)) {
      setStored(STORAGE_KEYS.BUSINESSES, businesses);
      hasChanges = true;
    }
  }

  if (Array.isArray(appointments)) {
    const local = getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
    if (JSON.stringify(local) !== JSON.stringify(appointments)) {
      setStored(STORAGE_KEYS.APPOINTMENTS, appointments);
      hasChanges = true;
    }
  }

  if (Array.isArray(queue)) {
    const local = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, []);
    if (JSON.stringify(local) !== JSON.stringify(queue)) {
      setStored(STORAGE_KEYS.QUEUE, queue);
      hasChanges = true;
    }
  }

  if (Array.isArray(dailyClosures)) {
    const local = getStored<DailyClosure[]>(STORAGE_KEYS.DAILY_CLOSURES, []);
    if (JSON.stringify(local) !== JSON.stringify(dailyClosures)) {
      setStored(STORAGE_KEYS.DAILY_CLOSURES, dailyClosures);
      hasChanges = true;
    }
  }

  if (Array.isArray(notifications)) {
    const local = getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    if (JSON.stringify(local) !== JSON.stringify(notifications)) {
      setStored(STORAGE_KEYS.NOTIFICATIONS, notifications);
      hasChanges = true;
    }
  }

  if (Array.isArray(authCodes)) {
    const local = getStored<AuthCode[]>(STORAGE_KEYS.AUTH_CODES, []);
    const codeMap = new Map<string, AuthCode>();
    authCodes.forEach((c: AuthCode) => codeMap.set(c.id, c));
    local.forEach((c: AuthCode) => {
      if (!codeMap.has(c.id)) {
        codeMap.set(c.id, c);
      } else {
        const s = codeMap.get(c.id)!;
        if (c.status === 'claimed' && s.status !== 'claimed') {
          codeMap.set(c.id, c);
        }
      }
    });
    const mergedList = Array.from(codeMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    if (JSON.stringify(local) !== JSON.stringify(mergedList)) {
      setStored(STORAGE_KEYS.AUTH_CODES, mergedList);
      hasChanges = true;
    }
  }

  if (Array.isArray(clients)) {
    const localClients = getStored<ClientProfile[]>(STORAGE_KEYS.CLIENTS, []);
    const clientMap = new Map<string, ClientProfile>();
    // Key by ID only to prevent duplicate entries
    clients.forEach((c: ClientProfile) => {
      if (c && c.id) {
        clientMap.set(c.id, c);
      }
    });
    localClients.forEach((c: ClientProfile) => {
      if (!c || !c.id) return;
      const cleanEmail = c.email ? c.email.trim().toLowerCase() : '';
      let existingId: string | null = null;
      for (const [id, srvClient] of clientMap.entries()) {
        if (id === c.id || (cleanEmail && srvClient.email && srvClient.email.trim().toLowerCase() === cleanEmail)) {
          existingId = id;
          break;
        }
      }
      if (!existingId) {
        clientMap.set(c.id, c);
      } else {
        const existing = clientMap.get(existingId)!;
        if (
          c.statusUpdatedAt &&
          existing.statusUpdatedAt &&
          new Date(c.statusUpdatedAt) > new Date(existing.statusUpdatedAt)
        ) {
          clientMap.set(existingId, { ...existing, ...c });
        }
      }
    });
    const mergedClients = Array.from(clientMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
    if (JSON.stringify(localClients) !== JSON.stringify(mergedClients)) {
      setStored(STORAGE_KEYS.CLIENTS, mergedClients);
      hasChanges = true;
    }
  }

  // Check current user accountStatus if business or client
  const currUser = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
  if (currUser && currUser.role === 'business' && Array.isArray(businesses)) {
    const myBiz = businesses.find(
      (b: Business) => b.id === currUser.businessId || b.ownerEmail?.toLowerCase() === currUser.email?.toLowerCase()
    );
    if (myBiz) {
      const bizStatus = myBiz.accountStatus === 'suspendida' ? 'suspendida' : myBiz.accountStatus === 'vencida' ? 'vencida' : 'activa';
      if (currUser.accountStatus !== bizStatus || currUser.statusReason !== myBiz.statusReason) {
        currUser.accountStatus = bizStatus;
        currUser.statusReason = myBiz.statusReason;
        setStored(STORAGE_KEYS.CURRENT_USER, currUser);
        hasChanges = true;
      }
    }
  } else if (currUser && currUser.role === 'client' && Array.isArray(clients)) {
    const myClient = clients.find(
      (c: ClientProfile) => c.id === currUser.clientId || c.email?.toLowerCase() === currUser.email?.toLowerCase()
    );
    if (myClient) {
      const clientStatus = myClient.accountStatus || 'activa';
      if (currUser.accountStatus !== clientStatus || currUser.statusReason !== myClient.statusReason) {
        currUser.accountStatus = clientStatus;
        currUser.statusReason = myClient.statusReason;
        setStored(STORAGE_KEYS.CURRENT_USER, currUser);
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    notifyListeners();
  }
  return hasChanges;
}

async function fetchServerState() {
  if (isSyncing || typeof window === 'undefined') return;
  try {
    isSyncing = true;
    const res = await fetch('/api/sync');
    if (!res.ok) return;
    const json = await res.json();
    if (json.success && json.data) {
      syncFromServerPayload(json.data);
    }
  } catch (e) {
    // offline or backend restarting
  } finally {
    isSyncing = false;
  }
}

// Server-Sent Events (SSE) connection for sub-second real-time push
let eventSource: EventSource | null = null;
function initRealtimeStream() {
  if (typeof window === 'undefined' || !('EventSource' in window)) return;
  if (eventSource) {
    try { eventSource.close(); } catch {}
  }

  try {
    eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      isRealtimeConnected = true;
      lastSyncTimestamp = new Date().toISOString();
      realtimeListeners.forEach((l) => l(true));
      notifyListeners();
      console.log('[Nova Realtime] 🟢 SSE Connection Established');
    };

    eventSource.onerror = () => {
      isRealtimeConnected = false;
      realtimeListeners.forEach((l) => l(false));
      notifyListeners();
    };

    eventSource.addEventListener('connected', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.data) {
          syncFromServerPayload(payload.data);
        }
      } catch {}
    });

    eventSource.addEventListener('SYNC', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        syncFromServerPayload(payload);
      } catch {}
    });

    eventSource.addEventListener('CLIENT_REGISTERED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.clients)) {
          setStored(STORAGE_KEYS.CLIENTS, payload.clients);
        } else if (payload.client) {
          const clients = getStored<ClientProfile[]>(STORAGE_KEYS.CLIENTS, []);
          const idx = clients.findIndex(
            (c) => c.id === payload.client.id || c.email?.toLowerCase() === payload.client.email?.toLowerCase()
          );
          if (idx >= 0) {
            clients[idx] = payload.client;
          } else {
            clients.unshift(payload.client);
          }
          setStored(STORAGE_KEYS.CLIENTS, clients);
        }
        if (Array.isArray(payload.notifications)) {
          setStored(STORAGE_KEYS.NOTIFICATIONS, payload.notifications);
        }
        const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        if (curr && (curr.role === 'admin' || isSuperAdminEmail(curr.email))) {
          soundManager.playSuccessAlert();
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('BUSINESS_REGISTERED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.businesses)) {
          setStored(STORAGE_KEYS.BUSINESSES, payload.businesses);
        } else if (payload.business) {
          const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
          const idx = businesses.findIndex((b) => b.id === payload.business.id);
          if (idx >= 0) {
            businesses[idx] = payload.business;
          } else {
            businesses.unshift(payload.business);
          }
          setStored(STORAGE_KEYS.BUSINESSES, businesses);
        }
        if (Array.isArray(payload.notifications)) {
          setStored(STORAGE_KEYS.NOTIFICATIONS, payload.notifications);
        }
        const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        if (curr && (curr.role === 'admin' || isSuperAdminEmail(curr.email))) {
          soundManager.playSuccessAlert();
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('APPOINTMENT_REQUESTED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.appointment) {
          const apts = getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
          const idx = apts.findIndex((a) => a.id === payload.appointment.id);
          if (idx >= 0) {
            apts[idx] = payload.appointment;
          } else {
            apts.unshift(payload.appointment);
          }
          setStored(STORAGE_KEYS.APPOINTMENTS, apts);
        }
        if (Array.isArray(payload.notifications)) {
          setStored(STORAGE_KEYS.NOTIFICATIONS, payload.notifications);
        }
        const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        if (
          curr &&
          (curr.role === 'admin' ||
            (curr.role === 'business' && curr.businessId === payload.appointment?.businessId))
        ) {
          soundManager.playNewAppointmentAlert();
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('APPOINTMENT_UPDATED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.appointment) {
          const apts = getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []);
          const idx = apts.findIndex((a) => a.id === payload.appointment.id);
          if (idx >= 0) {
            apts[idx] = payload.appointment;
          } else {
            apts.unshift(payload.appointment);
          }
          setStored(STORAGE_KEYS.APPOINTMENTS, apts);
        }
        if (Array.isArray(payload.notifications)) {
          setStored(STORAGE_KEYS.NOTIFICATIONS, payload.notifications);
        }
        if (payload.status === 'confirmada') {
          soundManager.playSuccessAlert();
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('CLIENT_STATUS_UPDATED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const clients = getStored<ClientProfile[]>(STORAGE_KEYS.CLIENTS, []);
        const idx = clients.findIndex(
          (c) => c.id === payload.clientId || c.email?.toLowerCase() === payload.clientEmail?.toLowerCase()
        );
        if (idx >= 0) {
          clients[idx].accountStatus = payload.accountStatus;
          clients[idx].statusReason = payload.statusReason;
          setStored(STORAGE_KEYS.CLIENTS, clients);
        }
        const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        if (
          curr &&
          curr.role === 'client' &&
          (curr.clientId === payload.clientId ||
            curr.email?.toLowerCase() === payload.clientEmail?.toLowerCase())
        ) {
          curr.accountStatus = payload.accountStatus;
          curr.statusReason = payload.statusReason;
          setStored(STORAGE_KEYS.CURRENT_USER, curr);
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('BUSINESS_STATUS_UPDATED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        const businesses = getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []);
        const idx = businesses.findIndex((b) => b.id === payload.businessId);
        if (idx >= 0) {
          businesses[idx].accountStatus = payload.accountStatus;
          businesses[idx].statusReason = payload.statusReason;
          setStored(STORAGE_KEYS.BUSINESSES, businesses);
        }
        const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
        if (curr && curr.role === 'business' && curr.businessId === payload.businessId) {
          curr.accountStatus = payload.accountStatus;
          curr.statusReason = payload.statusReason;
          setStored(STORAGE_KEYS.CURRENT_USER, curr);
        }
        lastSyncTimestamp = new Date().toISOString();
        notifyListeners();
      } catch {}
    });

    eventSource.addEventListener('QUEUE_UPDATED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.queue)) {
          setStored(STORAGE_KEYS.QUEUE, payload.queue);
          lastSyncTimestamp = new Date().toISOString();
          notifyListeners();
        }
      } catch {}
    });

    eventSource.addEventListener('DAILY_CLOSURE_ADDED', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (Array.isArray(payload.dailyClosures)) {
          setStored(STORAGE_KEYS.DAILY_CLOSURES, payload.dailyClosures);
          lastSyncTimestamp = new Date().toISOString();
          notifyListeners();
        }
      } catch {}
    });
  } catch (err) {
    console.warn('[Nova Realtime] EventSource error:', err);
  }
}

async function sendServerState() {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      businesses: getStored<Business[]>(STORAGE_KEYS.BUSINESSES, []),
      appointments: getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, []),
      notifications: getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, []),
      authCodes: getStored<AuthCode[]>(STORAGE_KEYS.AUTH_CODES, []),
      clients: getStored<ClientProfile[]>(STORAGE_KEYS.CLIENTS, []),
      queue: getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, []),
      dailyClosures: getStored<DailyClosure[]>(STORAGE_KEYS.DAILY_CLOSURES, []),
    };
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error('Failed to push state to server:', e);
  }
}

// Start continuous background sync and SSE real-time stream
if (typeof window !== 'undefined') {
  initRealtimeStream();
  fetchServerState();
  // Secondary polling safety net (every 3 seconds)
  setInterval(() => {
    fetchServerState();
  }, 3000);
}

export const db = {
  // Initializer
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.BUSINESSES)) {
      setStored(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENT)) {
      setStored(STORAGE_KEYS.CLIENT, INITIAL_CLIENT);
    }
    if (!localStorage.getItem(STORAGE_KEYS.APPOINTMENTS)) {
      setStored(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      setStored(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUTH_CODES)) {
      setStored(STORAGE_KEYS.AUTH_CODES, INITIAL_AUTH_CODES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUEUE)) {
      setStored(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DAILY_CLOSURES)) {
      setStored(STORAGE_KEYS.DAILY_CLOSURES, INITIAL_DAILY_CLOSURES);
    }

    // Clean up admin role if email is not super admin (miguel is not admin)
    const curr = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (curr) {
      if (curr.role === 'admin' && !isSuperAdminEmail(curr.email)) {
        curr.role = 'business';
        setStored(STORAGE_KEYS.CURRENT_USER, curr);
      }
      if (curr.accountStatus === 'vencida') {
        curr.accountStatus = 'activa';
        curr.statusReason = undefined;
        setStored(STORAGE_KEYS.CURRENT_USER, curr);
      }
    }

    // Auto-clean any businesses stuck in 'vencida' status so accounts are active by default
    const businesses = this.getBusinesses();
    let bizUpdated = false;
    businesses.forEach((b) => {
      if (b.accountStatus === 'vencida' || !b.accountStatus) {
        b.accountStatus = 'activa';
        b.statusReason = undefined;
        bizUpdated = true;
      }
    });
    if (bizUpdated) {
      setStored(STORAGE_KEYS.BUSINESSES, businesses);
      sendServerState();
    }
  },

  // Reset database completely (No dummy data)
  reset() {
    setStored(STORAGE_KEYS.BUSINESSES, []);
    setStored(STORAGE_KEYS.APPOINTMENTS, []);
    setStored(STORAGE_KEYS.NOTIFICATIONS, []);
    setStored(STORAGE_KEYS.AUTH_CODES, INITIAL_AUTH_CODES);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
  },

  broadcast(event: SyncEvent) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(event);
      } catch {
        // Fallback
      }
    }
  },

  // Current User Session
  getCurrentUser(): CurrentUser | null {
    const user = getStored<CurrentUser | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (user) {
      // Ensure only genuine super admin email has admin role
      if (user.role === 'admin' && !isSuperAdminEmail(user.email)) {
        user.role = 'business';
      }
      // Never leave user blocked on default vencida
      if (user.accountStatus === 'vencida') {
        user.accountStatus = 'activa';
        user.statusReason = undefined;
      }
    }
    return user;
  },

  setCurrentUser(user: CurrentUser | null): void {
    if (user) {
      if (user.role === 'admin' && !isSuperAdminEmail(user.email)) {
        user.role = 'business';
      }
      setStored(STORAGE_KEYS.CURRENT_USER, user);
    } else {
      try {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } catch {
        // ignore
      }
    }
    this.broadcast({ type: 'AUTH_CHANGED' });
    notifyListeners();
  },

  logout(): void {
    this.setCurrentUser(null);
  },

  // Auth Codes Management (Admin & Licensing)
  getAuthCodes(): AuthCode[] {
    return getStored<AuthCode[]>(STORAGE_KEYS.AUTH_CODES, INITIAL_AUTH_CODES);
  },

  generateAuthCode(note?: string, assignedEmail?: string): AuthCode {
    const codes = this.getAuthCodes();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newCode: AuthCode = {
      id: `code-${Date.now()}-${randomDigits}`,
      code: `NOVA-AUTH-${randomDigits}`,
      status: 'available',
      assignedEmail: assignedEmail?.trim().toLowerCase() || undefined,
      note: note?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    codes.unshift(newCode);
    setStored(STORAGE_KEYS.AUTH_CODES, codes);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    // Also call dedicated backend endpoint in background for reliability
    if (typeof window !== 'undefined') {
      fetch('/api/auth-codes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode }),
      }).catch((e) => console.error('Error saving code on server:', e));
    }

    return newCode;
  },

  revokeAuthCode(codeId: string): void {
    const codes = this.getAuthCodes();
    const found = codes.find((c) => c.id === codeId);
    if (found) {
      found.status = 'revoked';
      setStored(STORAGE_KEYS.AUTH_CODES, codes);
      this.broadcast({ type: 'DATA_CHANGED' });
      notifyListeners();
      sendServerState();

      if (typeof window !== 'undefined') {
        fetch('/api/auth-codes/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ codeId }),
        }).catch((e) => console.error('Error revoking code on server:', e));
      }
    }
  },

  deleteAuthCode(codeId: string): void {
    const codes = this.getAuthCodes().filter((c) => c.id !== codeId);
    setStored(STORAGE_KEYS.AUTH_CODES, codes);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    if (typeof window !== 'undefined') {
      fetch('/api/auth-codes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId }),
      }).catch((e) => console.error('Error deleting code on server:', e));
    }
  },

  saveAuthCode(codeObj: AuthCode): void {
    const codes = this.getAuthCodes();
    const idx = codes.findIndex(
      (c) =>
        c.id === codeObj.id ||
        c.code.trim().toUpperCase() === codeObj.code.trim().toUpperCase()
    );
    if (idx >= 0) {
      codes[idx] = { ...codes[idx], ...codeObj };
    } else {
      codes.unshift(codeObj);
    }
    setStored(STORAGE_KEYS.AUTH_CODES, codes);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
  },

  async validateAuthCodeOnline(
    codeStr: string,
    email: string
  ): Promise<{ valid: boolean; error?: string; codeObj?: AuthCode }> {
    const cleanRawCode = (codeStr || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (isSuperAdminEmail(cleanEmail)) {
      return { valid: true };
    }

    if (!cleanRawCode) {
      return { valid: false, error: 'Por favor introduce el código de autorización.' };
    }

    try {
      const resp = await fetch('/api/auth-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: cleanRawCode, email: cleanEmail }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.valid && data.codeObj) {
          this.saveAuthCode(data.codeObj);
        }
        return data;
      }
    } catch {
      // offline fallback
    }

    return this.validateAuthCodeForEmail(cleanRawCode, cleanEmail);
  },

  // Verify authorization code for barber registration/login
  validateAuthCodeForEmail(
    codeStr: string,
    email: string
  ): { valid: boolean; error?: string; codeObj?: AuthCode } {
    const cleanRawCode = (codeStr || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Special super admin bypass
    if (isSuperAdminEmail(cleanEmail)) {
      return { valid: true };
    }

    if (!cleanRawCode) {
      return {
        valid: false,
        error: 'Por favor introduce el código de autorización.',
      };
    }

    const codes = this.getAuthCodes();
    
    // 1. Coincidencia exacta
    let found = codes.find((c) => c.code.trim().toUpperCase() === cleanRawCode);

    // 2. Coincidencia sin guiones ni espacios (ej: NOVAAUTH1234 vs NOVA-AUTH-1234)
    if (!found) {
      const strippedInput = cleanRawCode.replace(/[^A-Z0-9]/g, '');
      found = codes.find(
        (c) => c.code.replace(/[^A-Z0-9]/g, '').toUpperCase() === strippedInput
      );
    }

    // 3. Coincidencia si solo ingresó los dígitos finales (ej: "4821" para "NOVA-AUTH-4821")
    if (!found && /^\d{3,6}$/.test(cleanRawCode)) {
      found = codes.find((c) => c.code.endsWith(`-${cleanRawCode}`) || c.code.endsWith(cleanRawCode));
    }

    // 4. Si el código fue asignado específicamente a este correo, verificar si coincide parcialmente
    if (!found) {
      const assignedToThis = codes.find(
        (c) => c.assignedEmail && c.assignedEmail.toLowerCase() === cleanEmail && c.status !== 'revoked'
      );
      if (assignedToThis && (cleanRawCode.includes('NOVA') || assignedToThis.code.includes(cleanRawCode))) {
        found = assignedToThis;
      }
    }

    if (!found) {
      return {
        valid: false,
        error: 'El código de autorización no existe. Verifica que esté bien escrito o solicita uno al Administrador.',
      };
    }

    if (found.status === 'revoked') {
      return {
        valid: false,
        error: 'Este código de autorización ha sido revocado por el Administrador Nova.',
      };
    }

    // Check if code was pre-assigned to a specific email (admin email is considered universal/unlocked)
    const isAssignedToAdmin = found.assignedEmail && isSuperAdminEmail(found.assignedEmail);
    if (found.assignedEmail && !isAssignedToAdmin && found.assignedEmail.toLowerCase() !== cleanEmail) {
      return {
        valid: false,
        error: `Este código de autorización fue asignado exclusivamente al correo (${found.assignedEmail}). No puede usarse con ${cleanEmail}.`,
      };
    }

    // Check if code was already claimed by another email
    const isClaimedByAdmin = found.claimedByEmail && isSuperAdminEmail(found.claimedByEmail);
    if (found.claimedByEmail && !isClaimedByAdmin && found.claimedByEmail.toLowerCase() !== cleanEmail) {
      return {
        valid: false,
        error: `Acceso denegado: Este código ya está vinculado al correo ${found.claimedByEmail}.`,
      };
    }

    return { valid: true, codeObj: found };
  },

  // Businesses
  getBusinesses(): Business[] {
    return getStored<Business[]>(STORAGE_KEYS.BUSINESSES, INITIAL_BUSINESSES);
  },

  getBusinessById(id: string): Business | undefined {
    return this.getBusinesses().find((b) => b.id === id);
  },

  getBusinessByCode(code: string): Business | undefined {
    const cleanCode = code.trim().toUpperCase();
    return this.getBusinesses().find((b) => b.code.toUpperCase() === cleanCode);
  },

  getBusinessByOwnerEmail(email: string): Business | undefined {
    const cleanEmail = email.trim().toLowerCase();
    return this.getBusinesses().find((b) => b.ownerEmail?.toLowerCase() === cleanEmail);
  },

  saveBusiness(business: Business): void {
    const businesses = this.getBusinesses();
    const index = businesses.findIndex((b) => b.id === business.id);
    if (!business.accountStatus) {
      business.accountStatus = 'activa';
    }
    if (index >= 0) {
      businesses[index] = business;
    } else {
      businesses.unshift(business);
    }
    setStored(STORAGE_KEYS.BUSINESSES, businesses);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();
  },

  // Update business account status (Suspender, Vencer, Reactivar)
  updateBusinessAccountStatus(
    businessId: string,
    accountStatus: BusinessAccountStatus,
    statusReason?: string
  ): void {
    const businesses = this.getBusinesses();
    const biz = businesses.find((b) => b.id === businessId);
    if (biz) {
      biz.accountStatus = accountStatus;
      biz.statusReason = statusReason || (
        accountStatus === 'suspendida'
          ? 'Cuenta suspendida temporalmente por la administración de Nova Barber.'
          : accountStatus === 'vencida'
          ? 'La membresía o periodo de servicio de esta cuenta ha vencido.'
          : 'Cuenta activa y en regla.'
      );
      biz.statusUpdatedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.BUSINESSES, businesses);

      // Also update currentUser if this business belongs to the current user
      const curr = this.getCurrentUser();
      if (curr && (curr.businessId === businessId || curr.email?.toLowerCase() === biz.ownerEmail?.toLowerCase())) {
        curr.accountStatus = accountStatus;
        curr.statusReason = biz.statusReason;
        this.setCurrentUser(curr);
      }

      this.addNotification({
        recipientRole: 'business',
        recipientId: biz.id,
        title: accountStatus === 'activa' ? '🟢 Cuenta Reactivada' : accountStatus === 'suspendida' ? '🔴 Cuenta Suspendida' : '🟡 Cuenta Vencida',
        message: `El estado de tu cuenta ha sido actualizado a "${accountStatus.toUpperCase()}". Detalle: ${biz.statusReason}`,
        type: accountStatus === 'activa' ? 'accepted' : 'rejected',
      });

      this.broadcast({ type: 'DATA_CHANGED' });
      notifyListeners();
      sendServerState();

      try {
        fetch('/api/business/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            accountStatus,
            statusReason: biz.statusReason,
          }),
        }).catch(() => {});
      } catch {}
    }
  },

  deleteBusiness(businessId: string): void {
    let businesses = this.getBusinesses();
    businesses = businesses.filter((b) => b.id !== businessId);
    setStored(STORAGE_KEYS.BUSINESSES, businesses);

    let apts = this.getAppointments();
    apts = apts.filter((a) => a.businessId !== businessId);
    setStored(STORAGE_KEYS.APPOINTMENTS, apts);

    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/business/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      }).catch(() => {});
    } catch {}
  },

  // Manual trigger to force cross-device sync immediately
  syncWithServer() {
    fetchServerState();
  },

  // Register a new business directly without requiring authorization code
  registerBusiness(
    businessData: Omit<Business, 'id' | 'code' | 'createdAt'>,
    optionalAuthCode?: string
  ): { success: boolean; business: Business } {
    const cleanEmail = businessData.ownerEmail.trim().toLowerCase();
    const cleanCode = (optionalAuthCode || '').trim().toUpperCase();

    const newBiz: Business = {
      ...businessData,
      id: `biz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: generateBusinessCode(businessData.type),
      accountStatus: 'activa',
      authCodeUsed: cleanCode || undefined,
      createdAt: new Date().toISOString(),
    };

    // Save business locally
    this.saveBusiness(newBiz);

    // If an optional code was supplied, mark it as claimed
    if (cleanCode) {
      const codes = this.getAuthCodes();
      const foundCode = codes.find(
        (c) =>
          c.code.trim().toUpperCase() === cleanCode ||
          c.code.replace(/[^A-Z0-9]/g, '') === cleanCode.replace(/[^A-Z0-9]/g, '')
      );
      if (foundCode) {
        foundCode.status = 'claimed';
        foundCode.claimedByEmail = cleanEmail;
        foundCode.claimedBusinessId = newBiz.id;
        foundCode.claimedBusinessName = newBiz.name;
        foundCode.claimedAt = new Date().toISOString();
        setStored(STORAGE_KEYS.AUTH_CODES, codes);
      }
    }

    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    // Call server to persist and broadcast to Admin in real time
    try {
      fetch('/api/businesses/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business: newBiz, authCode: cleanCode || undefined }),
      })
        .then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.businesses)) {
              setStored(STORAGE_KEYS.BUSINESSES, json.businesses);
              notifyListeners();
            }
          }
        })
        .catch((e) => console.warn('Error registering business on server:', e));
    } catch {}

    return { success: true, business: newBiz };
  },

  // Register a new business (legacy compat: codes are optional, no longer required)
  registerBusinessWithAuthCode(
    authCodeStr: string,
    businessData: Omit<Business, 'id' | 'code' | 'createdAt'>
  ): { success: boolean; business?: Business; error?: string } {
    const res = this.registerBusiness(businessData, authCodeStr);
    return { success: res.success, business: res.business };
  },

  updateBusinessServices(businessId: string, services: Service[]) {
    const biz = this.getBusinessById(businessId);
    if (biz) {
      biz.services = services;
      this.saveBusiness(biz);
    }
  },

  updateBusinessBarbers(businessId: string, barbers: Barber[]) {
    const biz = this.getBusinessById(businessId);
    if (biz) {
      biz.barbers = barbers;
      this.saveBusiness(biz);
    }
  },

  addExpense(businessId: string, expenseData: Omit<Expense, 'id'>) {
    const biz = this.getBusinessById(businessId);
    if (biz) {
      const newExp: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
      };
      biz.expenses = [newExp, ...(biz.expenses || [])];
      this.saveBusiness(biz);
    }
  },

  deleteExpense(businessId: string, expenseId: string) {
    const biz = this.getBusinessById(businessId);
    if (biz && biz.expenses) {
      biz.expenses = biz.expenses.filter((e) => e.id !== expenseId);
      this.saveBusiness(biz);
    }
  },

  // Clients
  getClients(): ClientProfile[] {
    return getStored<ClientProfile[]>(STORAGE_KEYS.CLIENTS, []);
  },

  getClientByEmail(email: string): ClientProfile | undefined {
    if (!email) return undefined;
    const clean = email.trim().toLowerCase();
    const clients = this.getClients();
    return clients.find((c) => c.email && c.email.trim().toLowerCase() === clean);
  },

  getClient(): ClientProfile {
    const user = this.getCurrentUser();
    const stored = getStored<ClientProfile>(STORAGE_KEYS.CLIENT, INITIAL_CLIENT);
    if (user && user.role === 'client') {
      const match = this.getClientByEmail(user.email);
      if (match) {
        return match;
      }
      return {
        ...stored,
        id: user.clientId || user.id,
        name: user.name || stored.name || 'Cliente Nova',
        email: user.email || stored.email,
        phone: user.phone || stored.phone,
        accountStatus: user.accountStatus || 'activa',
      };
    }
    return stored;
  },

  saveClient(client: ClientProfile): void {
    const clients = this.getClients();
    const cleanEmail = client.email ? client.email.trim().toLowerCase() : '';
    const index = clients.findIndex(
      (c) => c.id === client.id || (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail)
    );
    if (index >= 0) {
      clients[index] = { ...clients[index], ...client };
    } else {
      clients.unshift(client);
    }
    setStored(STORAGE_KEYS.CLIENTS, clients);
    setStored(STORAGE_KEYS.CLIENT, client);
    this.broadcast({ type: 'DATA_CHANGED' });
    sendServerState();
    notifyListeners();

    try {
      fetch('/api/clients/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      }).catch(() => {});
    } catch {}
  },

  setClients(clients: ClientProfile[]): void {
    setStored(STORAGE_KEYS.CLIENTS, clients);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
  },

  registerOrLoginClient(email: string, name?: string, phone?: string): { client: ClientProfile; isNew: boolean } {
    const cleanEmail = email.trim().toLowerCase();
    const existing = this.getClientByEmail(cleanEmail);
    if (existing) {
      // 1 email = 1 account. Already registered!
      if (phone && !existing.phone) {
        existing.phone = phone.trim();
        this.saveClient(existing);
      }
      setStored(STORAGE_KEYS.CLIENT, existing);
      this.broadcast({ type: 'DATA_CHANGED' });
      notifyListeners();

      try {
        fetch('/api/clients/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: existing,
            email: cleanEmail,
            name: existing.name,
            phone: existing.phone || phone,
            avatar: existing.avatar,
          }),
        }).catch(() => {});
      } catch {}

      return { client: existing, isNew: false };
    }

    // Create new single account
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const cleanName = name && name.trim() ? name.trim() : `Cliente ${cleanEmail.split('@')[0]}`;
    const cleanPhone = phone && phone.trim() ? phone.trim() : '';
    const newClient: ClientProfile = {
      id: clientId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
      savedBusinessCodes: [],
      createdAt: new Date().toISOString(),
      accountStatus: 'activa',
    };

    this.saveClient(newClient);

    try {
      fetch('/api/clients/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: newClient,
          email: cleanEmail,
          name: cleanName,
          phone: cleanPhone,
          avatar: newClient.avatar,
        }),
      }).catch(() => {});
    } catch {}

    return { client: newClient, isNew: true };
  },

  updateClientAccountStatus(clientId: string, status: BusinessAccountStatus, reason?: string): void {
    const clients = this.getClients();
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx >= 0) {
      clients[idx].accountStatus = status;
      clients[idx].statusReason = reason;
      clients[idx].statusUpdatedAt = new Date().toISOString();
      setStored(STORAGE_KEYS.CLIENTS, clients);

      // If active user is this client, update their session too
      const curr = this.getCurrentUser();
      if (
        curr &&
        curr.role === 'client' &&
        (curr.clientId === clientId || curr.id === clientId || curr.email?.toLowerCase() === clients[idx].email?.toLowerCase())
      ) {
        curr.accountStatus = status;
        curr.statusReason = reason;
        this.setCurrentUser(curr);
      }

      this.broadcast({ type: 'DATA_CHANGED' });
      sendServerState();
      notifyListeners();

      try {
        fetch('/api/clients/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId,
            clientEmail: clients[idx].email,
            accountStatus: status,
            statusReason: reason,
          }),
        }).catch(() => {});
      } catch {}
    }
  },

  deleteClient(clientId: string): void {
    const clients = this.getClients().filter((c) => c.id !== clientId);
    setStored(STORAGE_KEYS.CLIENTS, clients);
    this.broadcast({ type: 'DATA_CHANGED' });
    sendServerState();
    notifyListeners();

    try {
      fetch('/api/clients/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      }).catch(() => {});
    } catch {}
  },

  saveBusinessCodeToClient(code: string): void {
    const client = this.getClient();
    if (!client.savedBusinessCodes) {
      client.savedBusinessCodes = [];
    }
    if (!client.savedBusinessCodes.includes(code)) {
      client.savedBusinessCodes.unshift(code);
      this.saveClient(client);
    }
  },

  // Appointments
  getAppointments(): Appointment[] {
    return getStored<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
  },

  // Anti-double-booking check:
  isSlotBooked(businessId: string, barberId: string, date: string, time: string, excludeAptId?: string): boolean {
    const all = this.getAppointments();
    return all.some((apt) => {
      if (excludeAptId && apt.id === excludeAptId) return false;
      if (apt.businessId !== businessId) return false;
      if (apt.date !== date) return false;
      if (apt.time !== time) return false;
      if (apt.status === 'rechazada' || apt.status === 'cancelada') return false;
      if (apt.barberId === barberId) return true;
      return false;
    });
  },

  // Book an appointment (with real-time verification to prevent double booking)
  requestAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): { success: boolean; appointment?: Appointment; error?: string } {
    if (data.barberId !== 'any' && this.isSlotBooked(data.businessId, data.barberId, data.date, data.time)) {
      return {
        success: false,
        error: `El horario de las ${data.time} con ${data.barberName} ya no está disponible. Por favor selecciona otro horario o barbero.`,
      };
    }

    const newAppointment: Appointment = {
      ...data,
      id: `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointments = this.getAppointments();
    appointments.unshift(newAppointment);
    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    // Create notifications
    // 1. For Business Owner
    this.addNotification({
      recipientRole: 'business',
      recipientId: data.businessId,
      title: '🔔 Nueva solicitud de cita',
      message: `${data.clientName} solicitó ${data.serviceName} con ${data.barberName} para el ${data.date} a las ${data.time}.`,
      type: 'new_request',
      appointmentId: newAppointment.id,
    });

    // 2. For Client
    this.addNotification({
      recipientRole: 'client',
      recipientId: data.clientId,
      title: '🟡 Solicitud de cita enviada',
      message: `Tu solicitud para ${data.serviceName} en ${data.businessName} el ${data.date} a las ${data.time} está pendiente de confirmación.`,
      type: 'new_request',
      appointmentId: newAppointment.id,
    });

    // Save business code to client recent list
    this.saveBusinessCodeToClient(data.businessCode);

    // Audio & Broadcast
    soundManager.playNewAppointmentAlert();
    this.broadcast({ type: 'APPOINTMENT_REQUESTED', appointment: newAppointment });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment),
      }).catch(() => {});
    } catch {}

    return { success: true, appointment: newAppointment };
  },

  updateAppointmentStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    _note?: string
  ): { success: boolean; appointment?: Appointment } {
    const appointments = this.getAppointments();
    const index = appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) return { success: false };

    const apt = appointments[index];
    apt.status = newStatus;
    apt.updatedAt = new Date().toISOString();

    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    if (newStatus === 'confirmada') {
      this.addNotification({
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '✅ ¡Tu cita fue aceptada!',
        message: `Barbería: ${apt.businessName} | Servicio: ${apt.serviceName} | Barbero: ${apt.barberName} | Fecha: ${apt.date} a las ${apt.time}`,
        type: 'accepted',
        appointmentId: apt.id,
      });
      soundManager.playSuccessAlert();
    } else if (newStatus === 'rechazada') {
      this.addNotification({
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '🔴 Cita rechazada',
        message: `Lamentablemente tu solicitud para ${apt.serviceName} en ${apt.businessName} no pudo ser aceptada en ese horario.`,
        type: 'rejected',
        appointmentId: apt.id,
      });
    } else if (newStatus === 'cancelada') {
      this.addNotification({
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '⚫ Cita cancelada',
        message: `La cita de ${apt.clientName} (${apt.serviceName}) para el ${apt.date} a las ${apt.time} fue cancelada.`,
        type: 'cancelled',
        appointmentId: apt.id,
      });
    } else if (newStatus === 'completada') {
      this.addNotification({
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '🔵 Servicio completado',
        message: `¡Gracias por visitarnos en ${apt.businessName}! Esperamos verte pronto.`,
        type: 'completed',
        appointmentId: apt.id,
      });
    }

    this.broadcast({ type: 'APPOINTMENT_STATUS_CHANGED', appointmentId, status: newStatus });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/appointments/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          status: newStatus,
          note: _note,
        }),
      }).catch(() => {});
    } catch {}

    return { success: true, appointment: apt };
  },

  // Rescheduling / Reemplazar horario de cita con solicitud al cliente
  proposeReschedule(
    appointmentId: string,
    newDate: string,
    newTime: string,
    note?: string,
    proposedBy: 'business' | 'client' = 'business'
  ): { success: boolean; appointment?: Appointment } {
    const appointments = this.getAppointments();
    const index = appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) return { success: false };

    const apt = appointments[index];
    apt.status = 'cambio_propuesto';
    apt.proposedDate = newDate;
    apt.proposedTime = newTime;
    apt.rescheduleNote = note;
    apt.rescheduleRequestedBy = proposedBy;
    apt.updatedAt = new Date().toISOString();

    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    if (proposedBy === 'business') {
      this.addNotification({
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '🔄 Propuesta de cambio de horario',
        message: `${apt.businessName} te propone cambiar tu cita de ${apt.serviceName} con ${apt.barberName} para el ${newDate} a las ${newTime}.${note ? ' Nota: ' + note : ''}`,
        type: 'reschedule_proposed',
        appointmentId: apt.id,
      });
      soundManager.playNewAppointmentAlert();
    } else {
      this.addNotification({
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '🔄 Cliente solicita cambio de horario',
        message: `${apt.clientName} propone reagendar su cita de ${apt.serviceName} para el ${newDate} a las ${newTime}.${note ? ' Nota: ' + note : ''}`,
        type: 'reschedule_proposed',
        appointmentId: apt.id,
      });
    }

    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    return { success: true, appointment: apt };
  },

  respondToReschedule(
    appointmentId: string,
    accept: boolean,
    rejectReason?: string
  ): { success: boolean; appointment?: Appointment } {
    const appointments = this.getAppointments();
    const index = appointments.findIndex((a) => a.id === appointmentId);
    if (index === -1) return { success: false };

    const apt = appointments[index];
    if (accept) {
      if (apt.proposedDate) apt.date = apt.proposedDate;
      if (apt.proposedTime) apt.time = apt.proposedTime;
      apt.status = 'confirmada';
      apt.updatedAt = new Date().toISOString();

      this.addNotification({
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '✅ Cambio de horario ACEPTADO',
        message: `${apt.clientName} aceptó la nueva hora para ${apt.serviceName} el ${apt.date} a las ${apt.time}.`,
        type: 'reschedule_accepted',
        appointmentId: apt.id,
      });

      this.addNotification({
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '✅ Cita reprogramada con éxito',
        message: `Tu cita en ${apt.businessName} quedó confirmada para el ${apt.date} a las ${apt.time}.`,
        type: 'reschedule_accepted',
        appointmentId: apt.id,
      });
      soundManager.playSuccessAlert();
    } else {
      apt.status = 'rechazada';
      apt.notes = rejectReason ? `Reagendamiento rechazado: ${rejectReason}` : 'Reagendamiento no aceptado';
      apt.updatedAt = new Date().toISOString();

      this.addNotification({
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '❌ Cambio de horario RECHAZADO',
        message: `${apt.clientName} no pudo aceptar el cambio para el ${apt.proposedDate || apt.date} a las ${apt.proposedTime || apt.time}.`,
        type: 'reschedule_rejected',
        appointmentId: apt.id,
      });
    }

    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    return { success: true, appointment: apt };
  },

  // Agendar cita directamente desde la cuenta de barbería
  bookAppointmentByBusiness(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): { success: boolean; appointment?: Appointment; error?: string } {
    const newAppointment: Appointment = {
      ...data,
      id: `apt-biz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'confirmada', // Auto-confirmada porque la registró el propio barbero
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const appointments = this.getAppointments();
    appointments.unshift(newAppointment);
    setStored(STORAGE_KEYS.APPOINTMENTS, appointments);

    // Notificar si el cliente tiene id
    if (data.clientId) {
      this.addNotification({
        recipientRole: 'client',
        recipientId: data.clientId,
        title: '✂️ Cita agendada por la barbería',
        message: `${data.businessName} agendó tu cita para ${data.serviceName} con ${data.barberName} el ${data.date} a las ${data.time}.`,
        type: 'accepted',
        appointmentId: newAppointment.id,
      });
    }

    soundManager.playSuccessAlert();
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    return { success: true, appointment: newAppointment };
  },

  // ===================== FILA EN VIVO / WALK-INS =====================
  getQueue(businessId?: string): QueueEntry[] {
    const all = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    if (!businessId) return all;
    return all.filter((q) => q.businessId === businessId);
  },

  addToQueue(data: Omit<QueueEntry, 'id' | 'createdAt' | 'status'>): QueueEntry {
    const newEntry: QueueEntry = {
      ...data,
      id: `queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: 'en_espera',
      createdAt: new Date().toISOString(),
    };

    const queue = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    queue.push(newEntry);
    setStored(STORAGE_KEYS.QUEUE, queue);

    soundManager.playNewAppointmentAlert();
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      }).catch(() => {});
    } catch {}

    return newEntry;
  },

  updateQueueStatus(
    id: string,
    status: QueueStatus,
    extra?: {
      paidAmount?: number;
      paymentMethod?: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro';
      notes?: string;
    }
  ): void {
    const queue = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    const item = queue.find((q) => q.id === id);
    if (!item) return;

    item.status = status;
    const nowTime = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (status === 'atendiendo' && !item.startedAt) {
      item.startedAt = nowTime;
    } else if (status === 'completado') {
      item.completedAt = nowTime;
      item.paidAmount = extra?.paidAmount ?? item.paidAmount ?? item.servicePrice;
      item.paymentMethod = extra?.paymentMethod || item.paymentMethod || 'efectivo';
      soundManager.playSuccessAlert();
    }

    if (extra?.notes !== undefined) {
      item.notes = extra.notes;
    }

    setStored(STORAGE_KEYS.QUEUE, queue);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/queue/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          paidAmount: extra?.paidAmount ?? item.paidAmount,
          paymentMethod: extra?.paymentMethod || item.paymentMethod,
          notes: extra?.notes,
        }),
      }).catch(() => {});
    } catch {}
  },

  deleteQueueEntry(id: string): void {
    const queue = getStored<QueueEntry[]>(STORAGE_KEYS.QUEUE, INITIAL_QUEUE);
    const updated = queue.filter((q) => q.id !== id);
    setStored(STORAGE_KEYS.QUEUE, updated);
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();
  },

  // ===================== CIERRE DE VENTAS DIARIO =====================
  getDailyClosures(businessId?: string): DailyClosure[] {
    const all = getStored<DailyClosure[]>(STORAGE_KEYS.DAILY_CLOSURES, INITIAL_DAILY_CLOSURES);
    if (!businessId) return all;
    return all.filter((c) => c.businessId === businessId);
  },

  getTodaySalesSummary(businessId: string, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    // 1. Walk-ins completados hoy (o con cobro)
    const queue = this.getQueue(businessId);
    const todayQueue = queue.filter(
      (q) => q.date === targetDate && (q.status === 'completado' || (q.paidAmount && q.paidAmount > 0))
    );

    // 2. Citas completadas hoy
    const appointments = this.getAppointments().filter(
      (a) => a.businessId === businessId && a.date === targetDate && a.status === 'completada'
    );

    const items: DailyClosureItem[] = [];

    todayQueue.forEach((q) => {
      const amount = q.paidAmount ?? q.servicePrice;
      items.push({
        id: q.id,
        type: 'walk_in',
        origin: 'walk_in',
        clientName: q.clientName,
        serviceName: q.serviceName,
        barberName: q.barberName,
        amountPaid: amount,
        paidAmount: amount,
        time: q.completedAt || q.arrivalTime,
        paymentMethod: q.paymentMethod || 'efectivo',
      });
    });

    appointments.forEach((a) => {
      items.push({
        id: a.id,
        type: 'appointment',
        origin: 'appointment',
        clientName: a.clientName,
        serviceName: a.serviceName,
        barberName: a.barberName,
        amountPaid: a.servicePrice,
        paidAmount: a.servicePrice,
        time: a.time,
        paymentMethod: 'efectivo',
      });
    });

    const totalWalkIns = todayQueue.length;
    const totalAppointments = appointments.length;
    const totalClients = items.length;
    const totalRevenue = items.reduce((sum, item) => sum + (item.amountPaid || 0), 0);

    return {
      targetDate,
      items,
      totalWalkIns,
      totalAppointments,
      totalClients,
      totalCustomers: totalClients,
      totalRevenue,
    };
  },

  closeDay(
    businessId: string,
    dateStr: string,
    closedBy: string,
    notes?: string
  ): { success: boolean; closure?: DailyClosure; error?: string } {
    const biz = this.getBusinessById(businessId);
    if (!biz) return { success: false, error: 'Negocio no encontrado' };

    const summary = this.getTodaySalesSummary(businessId, dateStr);
    const nowIso = new Date().toISOString();

    const newClosure: DailyClosure = {
      id: `closure-${Date.now()}`,
      businessId,
      businessName: biz.name,
      date: dateStr,
      closedAt: nowIso,
      createdAt: nowIso,
      closedBy,
      closedByName: closedBy,
      items: summary.items,
      totalWalkIns: summary.totalWalkIns,
      totalAppointments: summary.totalAppointments,
      totalClients: summary.totalClients,
      totalCustomers: summary.totalClients,
      totalRevenue: summary.totalRevenue,
      notes,
    };

    const closures = getStored<DailyClosure[]>(STORAGE_KEYS.DAILY_CLOSURES, INITIAL_DAILY_CLOSURES);
    // Unshift or replace if already closed today
    const existingIdx = closures.findIndex((c) => c.businessId === businessId && c.date === dateStr);
    if (existingIdx >= 0) {
      closures[existingIdx] = newClosure;
    } else {
      closures.unshift(newClosure);
    }
    setStored(STORAGE_KEYS.DAILY_CLOSURES, closures);

    soundManager.playSuccessAlert();
    this.broadcast({ type: 'DATA_CHANGED' });
    notifyListeners();
    sendServerState();

    try {
      fetch('/api/queue/closure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClosure),
      }).catch(() => {});
    } catch {}

    return { success: true, closure: newClosure };
  },

  // Notifications
  getNotifications(): AppNotification[] {
    return getStored<AppNotification[]>(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  },

  addNotification(notifData: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const notifs = this.getNotifications();
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifs.unshift(newNotif);
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
    notifyListeners();
  },

  markNotificationAsRead(id: string) {
    const notifs = this.getNotifications();
    const item = notifs.find((n) => n.id === id);
    if (item) {
      item.read = true;
      setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
      notifyListeners();
    }
  },

  markAllNotificationsAsRead(role: UserRole, recipientId: string) {
    const notifs = this.getNotifications();
    notifs.forEach((n) => {
      if (n.recipientRole === role && (n.recipientId === recipientId || !n.recipientId)) {
        n.read = true;
      }
    });
    setStored(STORAGE_KEYS.NOTIFICATIONS, notifs);
    notifyListeners();
  },
};

// Initialize DB on import
db.init();

// Hook for reactive updates in React components
export function useNovaDb() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const update = () => setVersion((v) => v + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const currentUser = db.getCurrentUser();

  const getAppointmentsForClient = useCallback((clientId: string) => {
    return db.getAppointments().filter((a) => a.clientId === clientId);
  }, []);

  const getAppointmentsForBusiness = useCallback((businessId: string) => {
    return db.getAppointments().filter((a) => a.businessId === businessId);
  }, []);

  const getQueueForBusiness = useCallback((businessId: string) => {
    return db.getQueue(businessId);
  }, []);

  const getClosuresForBusiness = useCallback((businessId: string) => {
    return db.getDailyClosures(businessId);
  }, []);

  const getNotificationsForRole = useCallback((role: UserRole, id: string) => {
    return db.getNotifications().filter((n) => n.recipientRole === role && n.recipientId === id);
  }, []);

  const syncWithServer = useCallback(() => db.syncWithServer(), []);
  const updateBusinessAccountStatus = useCallback(
    (...args: Parameters<typeof db.updateBusinessAccountStatus>) => db.updateBusinessAccountStatus(...args),
    []
  );
  const deleteBusiness = useCallback((...args: Parameters<typeof db.deleteBusiness>) => db.deleteBusiness(...args), []);
  const updateClientAccountStatus = useCallback(
    (...args: Parameters<typeof db.updateClientAccountStatus>) => db.updateClientAccountStatus(...args),
    []
  );
  const deleteClient = useCallback((...args: Parameters<typeof db.deleteClient>) => db.deleteClient(...args), []);

  return {
    db,
    currentUser,
    isRealtimeConnected,
    lastSyncTimestamp,
    businesses: db.getBusinesses(),
    client: db.getClient(),
    clients: db.getClients(),
    appointments: db.getAppointments(),
    notifications: db.getNotifications(),
    authCodes: db.getAuthCodes(),
    queue: db.getQueue(),
    dailyClosures: db.getDailyClosures(),
    updateBusinessAccountStatus,
    deleteBusiness,
    updateClientAccountStatus,
    deleteClient,
    syncWithServer,
    getAppointmentsForClient,
    getAppointmentsForBusiness,
    getQueueForBusiness,
    getClosuresForBusiness,
    getNotificationsForRole,
  };
}
