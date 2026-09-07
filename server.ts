import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Persistence file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nova_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

interface NovaDatabaseState {
  businesses: any[];
  appointments: any[];
  notifications: any[];
  authCodes: any[];
  clients: any[];
  queue: any[];
  dailyClosures: any[];
}

const DEFAULT_STATE: NovaDatabaseState = {
  businesses: [],
  appointments: [],
  notifications: [],
  authCodes: [],
  clients: [],
  queue: [],
  dailyClosures: [],
};

// In-memory cache + disk persistence
let dbState: NovaDatabaseState = { ...DEFAULT_STATE };

// Active SSE client connections for sub-second real-time push
const sseClients = new Set<express.Response>();

function broadcastSse(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const clientRes of sseClients) {
    try {
      clientRes.write(message);
    } catch {
      sseClients.delete(clientRes);
    }
  }
}

// Keep-alive heartbeat every 15 seconds to keep connections open through proxies
setInterval(() => {
  for (const clientRes of sseClients) {
    try {
      clientRes.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(clientRes);
    }
  }
}, 15000);

function loadDbFromDisk(): void {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const loadedBusinesses = Array.isArray(parsed.businesses) ? parsed.businesses : [];
      // Normalize businesses: accounts without status default to 'activa'
      loadedBusinesses.forEach((b: any) => {
        if (!b.accountStatus) {
          b.accountStatus = 'activa';
        }
      });

      dbState = {
        businesses: loadedBusinesses,
        appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        authCodes: Array.isArray(parsed.authCodes) ? parsed.authCodes : DEFAULT_STATE.authCodes,
        clients: Array.isArray(parsed.clients) ? parsed.clients : [],
        queue: Array.isArray(parsed.queue) ? parsed.queue : [],
        dailyClosures: Array.isArray(parsed.dailyClosures) ? parsed.dailyClosures : [],
      };
      console.log(`[Nova DB] Loaded from disk: ${dbState.businesses.length} businesses, ${dbState.appointments.length} appointments, ${dbState.queue.length} in queue, ${dbState.dailyClosures.length} closures`);
    } else {
      saveDbToDisk();
    }
  } catch (e) {
    console.error('[Nova DB] Error reading database from disk:', e);
  }
}

function saveDbToDisk(): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Nova DB] Error saving database to disk:', e);
  }
}

loadDbFromDisk();

// ==========================================
// API ENDPOINTS
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Server-Sent Events (SSE) for instant sub-second push to all clients
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  sseClients.add(res);
  console.log(`[Nova SSE] Client connected. Total active listeners: ${sseClients.size}`);

  // Send initial connected ping with current full state snapshot
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), data: dbState })}\n\n`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[Nova SSE] Client disconnected. Total active listeners: ${sseClients.size}`);
  });
});

// Full state synchronization (Cross-device real-time sync)
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: dbState,
  });
});

// Save / sync full or partial state from client with SMART NON-DESTRUCTIVE MERGE
app.post('/api/sync', (req, res) => {
  try {
    const { businesses, appointments, notifications, authCodes, clients, queue, dailyClosures } = req.body;
    let modified = false;

    // Smart merge businesses
    if (Array.isArray(businesses) && businesses.length > 0) {
      const bizMap = new Map<string, any>();
      dbState.businesses.forEach((b) => bizMap.set(b.id, b));
      businesses.forEach((b: any) => {
        if (!b.accountStatus) b.accountStatus = 'activa';
        const existing = bizMap.get(b.id);
        if (!existing) {
          bizMap.set(b.id, b);
          modified = true;
        } else {
          // Keep existing accountStatus unless explicitly changed
          bizMap.set(b.id, { ...existing, ...b, accountStatus: b.accountStatus || existing.accountStatus });
          modified = true;
        }
      });
      dbState.businesses = Array.from(bizMap.values());
    }

    // Smart merge appointments (by id, keeping most recent status)
    if (Array.isArray(appointments) && appointments.length > 0) {
      const aptMap = new Map<string, any>();
      dbState.appointments.forEach((a) => aptMap.set(a.id, a));
      appointments.forEach((a: any) => {
        const existing = aptMap.get(a.id);
        if (!existing) {
          aptMap.set(a.id, a);
          modified = true;
        } else {
          const incomingTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          if (incomingTime >= existingTime) {
            aptMap.set(a.id, { ...existing, ...a });
            modified = true;
          }
        }
      });
      dbState.appointments = Array.from(aptMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    // Smart merge notifications
    if (Array.isArray(notifications) && notifications.length > 0) {
      const notifMap = new Map<string, any>();
      dbState.notifications.forEach((n) => notifMap.set(n.id, n));
      notifications.forEach((n: any) => {
        if (!notifMap.has(n.id)) {
          notifMap.set(n.id, n);
          modified = true;
        }
      });
      dbState.notifications = Array.from(notifMap.values()).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );
    }

    // Smart merge queue
    if (Array.isArray(queue) && queue.length > 0) {
      const qMap = new Map<string, any>();
      dbState.queue.forEach((q) => qMap.set(q.id, q));
      queue.forEach((q: any) => {
        const existing = qMap.get(q.id);
        if (!existing) {
          qMap.set(q.id, q);
          modified = true;
        } else {
          qMap.set(q.id, { ...existing, ...q });
        }
      });
      dbState.queue = Array.from(qMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    // Smart merge daily closures
    if (Array.isArray(dailyClosures) && dailyClosures.length > 0) {
      const cMap = new Map<string, any>();
      dbState.dailyClosures.forEach((c) => cMap.set(c.id, c));
      dailyClosures.forEach((c: any) => {
        if (!cMap.has(c.id)) {
          cMap.set(c.id, c);
          modified = true;
        }
      });
      dbState.dailyClosures = Array.from(cMap.values()).sort(
        (a, b) => new Date(b.closedAt || 0).getTime() - new Date(a.closedAt || 0).getTime()
      );
    }

    // Smart merge authCodes
    if (Array.isArray(authCodes) && authCodes.length > 0) {
      const codeMap = new Map<string, any>();
      dbState.authCodes.forEach((c) => codeMap.set(c.id, c));
      authCodes.forEach((c) => {
        const existing = codeMap.get(c.id);
        if (!existing) {
          codeMap.set(c.id, c);
          modified = true;
        } else {
          codeMap.set(c.id, { ...existing, ...c });
        }
      });
      dbState.authCodes = Array.from(codeMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    // Smart merge clients
    if (Array.isArray(clients) && clients.length > 0) {
      const clientMap = new Map<string, any>();
      dbState.clients.forEach((c) => {
        clientMap.set(c.id, c);
        if (c.email) clientMap.set(c.email.toLowerCase(), c);
      });
      clients.forEach((c) => {
        const key = c.email ? c.email.toLowerCase() : c.id;
        const existing = clientMap.get(key) || clientMap.get(c.id);
        if (!existing) {
          clientMap.set(c.id, c);
          modified = true;
        } else {
          clientMap.set(existing.id, { ...existing, ...c });
        }
      });
      const uniqueList: any[] = [];
      const seenIds = new Set<string>();
      clientMap.forEach((val) => {
        if (!seenIds.has(val.id)) {
          seenIds.add(val.id);
          uniqueList.push(val);
        }
      });
      dbState.clients = uniqueList.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }

    if (modified) {
      saveDbToDisk();
      broadcastSse('SYNC', dbState);
    }

    res.json({ success: true, data: dbState });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DEDICATED REAL-TIME CLIENT ENDPOINTS
// ==========================================

// Direct client registration / login with instant server persistence and SSE broadcast
app.post('/api/clients/register', (req, res) => {
  try {
    const { email, name, phone, avatar } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requerido' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = dbState.clients.find(
      (c) => c.email && c.email.trim().toLowerCase() === cleanEmail
    );

    let clientRecord = existing;
    let isNew = false;

    if (existing) {
      // Update info if provided
      if (name && name.trim()) existing.name = name.trim();
      if (phone && phone.trim()) existing.phone = phone.trim();
      if (avatar) existing.avatar = avatar;
      existing.lastLoginAt = new Date().toISOString();
      clientRecord = existing;
    } else {
      isNew = true;
      const cleanName = name && name.trim() ? name.trim() : `Cliente ${cleanEmail.split('@')[0]}`;
      clientRecord = {
        id: `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cleanName,
        email: cleanEmail,
        phone: phone?.trim() || undefined,
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
        savedBusinessCodes: [],
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        accountStatus: 'activa',
      };
      dbState.clients.unshift(clientRecord);

      // Create Admin Notification for live visibility in Admin Panel
      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientRole: 'admin',
        title: '👤 Nuevo Cliente Registrado',
        message: `${clientRecord.name} (${clientRecord.email}) se registró oficialmente en Nova Barber.`,
        type: 'accepted',
        timestamp: new Date().toISOString(),
        read: false,
      });

      console.log(`[Nova DB] New client registered: ${clientRecord.email} (${clientRecord.name})`);
    }

    saveDbToDisk();

    // Broadcast instant real-time event to Admin and other connected users
    broadcastSse('CLIENT_REGISTERED', {
      client: clientRecord,
      isNew,
      clients: dbState.clients,
      notifications: dbState.notifications,
    });
    broadcastSse('SYNC', dbState);

    res.json({
      success: true,
      client: clientRecord,
      isNew,
      clients: dbState.clients,
    });
  } catch (err: any) {
    console.error('Error in /api/clients/register:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save/Update full client profile
app.post('/api/clients/save', (req, res) => {
  try {
    const { client } = req.body;
    if (!client || !client.id) {
      return res.status(400).json({ success: false, error: 'Datos de cliente inválidos' });
    }

    const cleanEmail = client.email ? client.email.trim().toLowerCase() : '';
    const idx = dbState.clients.findIndex(
      (c) => c.id === client.id || (cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail)
    );

    if (idx >= 0) {
      dbState.clients[idx] = { ...dbState.clients[idx], ...client };
    } else {
      dbState.clients.unshift(client);
    }

    saveDbToDisk();
    broadcastSse('CLIENT_REGISTERED', { client, clients: dbState.clients });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, client, clients: dbState.clients });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DEDICATED REAL-TIME APPOINTMENTS ENDPOINTS
// ==========================================

// Book new appointment with instant notification for business & admin
app.post('/api/appointments/book', (req, res) => {
  try {
    const { appointment } = req.body;
    if (!appointment || !appointment.businessId || !appointment.date || !appointment.time) {
      return res.status(400).json({ success: false, error: 'Datos de cita incompletos' });
    }

    const newApt = {
      ...appointment,
      id: appointment.id || `apt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: appointment.status || 'pendiente',
      createdAt: appointment.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Prevent duplicate ID
    const exists = dbState.appointments.find((a) => a.id === newApt.id);
    if (!exists) {
      dbState.appointments.unshift(newApt);
    } else {
      Object.assign(exists, newApt);
    }

    // Notification for Business
    const bizNotif = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientRole: 'business',
      recipientId: newApt.businessId,
      title: '🔔 Nueva solicitud de cita',
      message: `${newApt.clientName} solicitó ${newApt.serviceName} con ${newApt.barberName} para el ${newApt.date} a las ${newApt.time}.`,
      type: 'new_request',
      appointmentId: newApt.id,
      timestamp: new Date().toISOString(),
      read: false,
    };
    dbState.notifications.unshift(bizNotif);

    // Notification for Client
    if (newApt.clientId) {
      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000) + 1}`,
        recipientRole: 'client',
        recipientId: newApt.clientId,
        title: '🟡 Solicitud de cita enviada',
        message: `Tu solicitud para ${newApt.serviceName} en ${newApt.businessName} el ${newApt.date} a las ${newApt.time} está pendiente de confirmación.`,
        type: 'new_request',
        appointmentId: newApt.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // Notification for Super Admin
    dbState.notifications.unshift({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000) + 2}`,
      recipientRole: 'admin',
      title: '✂️ Nueva Cita Solicitada',
      message: `${newApt.clientName} solicitó cita en ${newApt.businessName} (${newApt.serviceName} - RD$ ${newApt.servicePrice}).`,
      type: 'new_request',
      appointmentId: newApt.id,
      timestamp: new Date().toISOString(),
      read: false,
    });

    saveDbToDisk();
    console.log(`[Nova DB] Appointment booked: ${newApt.id} for ${newApt.businessName}`);

    // Broadcast instant real-time event to business, client and admin
    broadcastSse('APPOINTMENT_REQUESTED', {
      appointment: newApt,
      appointments: dbState.appointments,
      notifications: dbState.notifications,
    });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, appointment: newApt, appointments: dbState.appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update appointment status (confirmada, rechazada, completada, cancelada)
app.post('/api/appointments/update-status', (req, res) => {
  try {
    const { appointmentId, status, notes } = req.body;
    const apt = dbState.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    apt.status = status;
    if (notes) apt.notes = notes;
    apt.updatedAt = new Date().toISOString();

    // Create notifications based on status
    if (status === 'confirmada') {
      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '✅ ¡Cita Confirmada!',
        message: `Tu cita para ${apt.serviceName} en ${apt.businessName} el ${apt.date} a las ${apt.time} ha sido confirmada.`,
        type: 'accepted',
        appointmentId: apt.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } else if (status === 'rechazada') {
      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientRole: 'client',
        recipientId: apt.clientId,
        title: '❌ Cita no disponible',
        message: `Tu solicitud para ${apt.serviceName} en ${apt.businessName} el ${apt.date} a las ${apt.time} no pudo ser aceptada. ${notes ? `Motivo: ${notes}` : ''}`,
        type: 'rejected',
        appointmentId: apt.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    saveDbToDisk();

    broadcastSse('APPOINTMENT_UPDATED', {
      appointment: apt,
      status,
      appointments: dbState.appointments,
      notifications: dbState.notifications,
    });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, appointment: apt, appointments: dbState.appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Propose reschedule
app.post('/api/appointments/reschedule', (req, res) => {
  try {
    const { appointmentId, proposedDate, proposedTime, rescheduleReason } = req.body;
    const apt = dbState.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    apt.status = 'pendiente_reagendamiento';
    apt.proposedDate = proposedDate;
    apt.proposedTime = proposedTime;
    apt.rescheduleReason = rescheduleReason;
    apt.updatedAt = new Date().toISOString();

    dbState.notifications.unshift({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientRole: 'client',
      recipientId: apt.clientId,
      title: '🔄 Propuesta de cambio de horario',
      message: `${apt.businessName} propone mover tu cita a: ${proposedDate} a las ${proposedTime}. ${rescheduleReason ? `Motivo: ${rescheduleReason}` : ''}`,
      type: 'reschedule_proposed',
      appointmentId: apt.id,
      timestamp: new Date().toISOString(),
      read: false,
    });

    saveDbToDisk();

    broadcastSse('APPOINTMENT_UPDATED', {
      appointment: apt,
      appointments: dbState.appointments,
      notifications: dbState.notifications,
    });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, appointment: apt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Respond to reschedule (Accept or Reject)
app.post('/api/appointments/respond-reschedule', (req, res) => {
  try {
    const { appointmentId, accept, rejectReason } = req.body;
    const apt = dbState.appointments.find((a) => a.id === appointmentId);
    if (!apt) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    if (accept) {
      if (apt.proposedDate) apt.date = apt.proposedDate;
      if (apt.proposedTime) apt.time = apt.proposedTime;
      apt.status = 'confirmada';
      apt.updatedAt = new Date().toISOString();

      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '✅ Cambio de horario ACEPTADO',
        message: `${apt.clientName} aceptó la nueva hora para ${apt.serviceName} el ${apt.date} a las ${apt.time}.`,
        type: 'reschedule_accepted',
        appointmentId: apt.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
    } else {
      apt.status = 'rechazada';
      apt.notes = rejectReason ? `Reagendamiento rechazado: ${rejectReason}` : 'Reagendamiento no aceptado';
      apt.updatedAt = new Date().toISOString();

      dbState.notifications.unshift({
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipientRole: 'business',
        recipientId: apt.businessId,
        title: '❌ Cambio de horario RECHAZADO',
        message: `${apt.clientName} no pudo aceptar el cambio para el ${apt.proposedDate || apt.date} a las ${apt.proposedTime || apt.time}.`,
        type: 'reschedule_rejected',
        appointmentId: apt.id,
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    saveDbToDisk();

    broadcastSse('APPOINTMENT_UPDATED', {
      appointment: apt,
      appointments: dbState.appointments,
      notifications: dbState.notifications,
    });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, appointment: apt });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// DEDICATED REAL-TIME LIVE QUEUE ENDPOINTS
// ==========================================

// Add client to live queue (Walk-in)
app.post('/api/queue/add', (req, res) => {
  try {
    const { entry } = req.body;
    if (!entry || !entry.businessId || !entry.clientName) {
      return res.status(400).json({ success: false, error: 'Datos de turno incompletos' });
    }

    const newEntry = {
      ...entry,
      id: entry.id || `queue-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      status: entry.status || 'esperando',
      createdAt: entry.createdAt || new Date().toISOString(),
    };

    dbState.queue.unshift(newEntry);
    saveDbToDisk();

    broadcastSse('QUEUE_UPDATED', { entry: newEntry, queue: dbState.queue });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, entry: newEntry, queue: dbState.queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update queue status (atendiendo, completado, cancelado)
app.post('/api/queue/update-status', (req, res) => {
  try {
    const { queueId, status, paidAmount, paymentMethod } = req.body;
    const item = dbState.queue.find((q) => q.id === queueId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Turno no encontrado' });
    }

    item.status = status;
    if (status === 'atendiendo' && !item.serviceStartTime) {
      item.serviceStartTime = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (status === 'completado') {
      item.completedTime = new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (paidAmount !== undefined) item.paidAmount = paidAmount;
      if (paymentMethod) item.paymentMethod = paymentMethod;
    }

    saveDbToDisk();

    broadcastSse('QUEUE_UPDATED', { entry: item, queue: dbState.queue });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, entry: item, queue: dbState.queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add daily closure
app.post('/api/queue/closure', (req, res) => {
  try {
    const { closure } = req.body;
    if (!closure || !closure.businessId) {
      return res.status(400).json({ success: false, error: 'Datos de cierre incompletos' });
    }

    const newClosure = {
      ...closure,
      id: closure.id || `closure-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      closedAt: closure.closedAt || new Date().toISOString(),
    };

    dbState.dailyClosures.unshift(newClosure);
    saveDbToDisk();

    broadcastSse('DAILY_CLOSURE_ADDED', { closure: newClosure, dailyClosures: dbState.dailyClosures });
    broadcastSse('SYNC', dbState);

    res.json({ success: true, closure: newClosure, dailyClosures: dbState.dailyClosures });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Auth Code Generation/Save endpoint
app.post('/api/auth-codes/save', (req, res) => {
  try {
    const { code } = req.body;
    if (code && code.id) {
      const idx = dbState.authCodes.findIndex((c) => c.id === code.id);
      if (idx >= 0) {
        dbState.authCodes[idx] = code;
      } else {
        dbState.authCodes.unshift(code);
      }
      saveDbToDisk();
      console.log(`[Nova DB] Saved auth code: ${code.code}`);
    }
    res.json({ success: true, authCodes: dbState.authCodes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Auth Code Generation endpoint
app.post('/api/auth-codes/generate', (req, res) => {
  try {
    const { note, assignedEmail, code: providedCode } = req.body;
    let newCode = providedCode;
    if (!newCode || !newCode.id) {
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      newCode = {
        id: `code-${Date.now()}-${randomDigits}`,
        code: `NOVA-AUTH-${randomDigits}`,
        status: 'available',
        assignedEmail: assignedEmail?.trim().toLowerCase() || undefined,
        note: note?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
    }

    const idx = dbState.authCodes.findIndex((c) => c.id === newCode.id);
    if (idx >= 0) {
      dbState.authCodes[idx] = newCode;
    } else {
      dbState.authCodes.unshift(newCode);
    }
    saveDbToDisk();
    console.log(`[Nova DB] Generated/Saved auth code: ${newCode.code} for ${newCode.assignedEmail || 'any'}`);
    broadcastSse('SYNC', dbState);
    res.json({ success: true, code: newCode, authCodes: dbState.authCodes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Auth Code Revocation endpoint
app.post('/api/auth-codes/revoke', (req, res) => {
  try {
    const { codeId } = req.body;
    const found = dbState.authCodes.find((c) => c.id === codeId);
    if (found) {
      found.status = 'revoked';
      saveDbToDisk();
      broadcastSse('SYNC', dbState);
      return res.json({ success: true, authCodes: dbState.authCodes });
    }
    res.status(404).json({ success: false, error: 'Código no encontrado' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Auth Code Delete endpoint
app.post('/api/auth-codes/delete', (req, res) => {
  try {
    const { codeId } = req.body;
    dbState.authCodes = dbState.authCodes.filter((c) => c.id !== codeId);
    saveDbToDisk();
    broadcastSse('SYNC', dbState);
    res.json({ success: true, authCodes: dbState.authCodes });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated Auth Code Validation endpoint (instant server-side verification)
app.post('/api/auth-codes/validate', (req, res) => {
  try {
    const { code, email } = req.body;
    if (!code) {
      return res.status(400).json({ valid: false, error: 'Código requerido' });
    }
    const cleanRawCode = (code || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check super admin bypass
    if (cleanEmail === 'miguelsosam1616@gmail.com' || cleanEmail === 'financieranova0@gmail.com') {
      return res.json({ valid: true });
    }

    // 1. Exact match
    let found = dbState.authCodes.find((c) => c.code.trim().toUpperCase() === cleanRawCode);

    // 2. Alphanumeric match (ignoring dashes/spaces)
    if (!found) {
      const strippedInput = cleanRawCode.replace(/[^A-Z0-9]/g, '');
      found = dbState.authCodes.find(
        (c) => c.code.replace(/[^A-Z0-9]/g, '').toUpperCase() === strippedInput
      );
    }

    // 3. Digits match (e.g. "3511")
    if (!found && /^\d{3,6}$/.test(cleanRawCode)) {
      found = dbState.authCodes.find((c) => c.code.endsWith(`-${cleanRawCode}`) || c.code.endsWith(cleanRawCode));
    }

    if (!found) {
      return res.json({
        valid: false,
        error: 'El código de autorización no existe. Verifica que esté bien escrito o solicita uno al Administrador.',
      });
    }

    if (found.status === 'revoked') {
      return res.json({
        valid: false,
        error: 'Este código de autorización ha sido revocado por el Administrador Nova.',
      });
    }

    const isAssignedToAdmin = found.assignedEmail && (found.assignedEmail.toLowerCase() === 'miguelsosam1616@gmail.com' || found.assignedEmail.toLowerCase() === 'financieranova0@gmail.com');
    if (found.assignedEmail && !isAssignedToAdmin && found.assignedEmail.toLowerCase() !== cleanEmail) {
      return res.json({
        valid: false,
        error: `Este código de autorización fue asignado exclusivamente al correo (${found.assignedEmail}). No puede usarse con ${cleanEmail}.`,
      });
    }

    const isClaimedByAdmin = found.claimedByEmail && (found.claimedByEmail.toLowerCase() === 'miguelsosam1616@gmail.com' || found.claimedByEmail.toLowerCase() === 'financieranova0@gmail.com');
    if (found.claimedByEmail && !isClaimedByAdmin && found.claimedByEmail.toLowerCase() !== cleanEmail) {
      return res.json({
        valid: false,
        error: `Acceso denegado: Este código ya está vinculado al correo ${found.claimedByEmail}.`,
      });
    }

    return res.json({ valid: true, codeObj: found });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// Dedicated Business Registration endpoint
app.post('/api/businesses/register', (req, res) => {
  try {
    const { business, authCode } = req.body;
    if (!business || !business.ownerEmail) {
      return res.status(400).json({ success: false, error: 'Datos de barbería incompletos' });
    }

    const cleanEmail = business.ownerEmail.trim().toLowerCase();
    const existingIdx = dbState.businesses.findIndex(
      (b) => b.id === business.id || (b.ownerEmail && b.ownerEmail.trim().toLowerCase() === cleanEmail)
    );

    if (existingIdx >= 0) {
      dbState.businesses[existingIdx] = { ...dbState.businesses[existingIdx], ...business };
    } else {
      dbState.businesses.unshift(business);
    }

    // Mark auth code as claimed
    if (authCode) {
      const cleanCode = authCode.trim().toUpperCase();
      const codeObj = dbState.authCodes.find(
        (c) => c.code.trim().toUpperCase() === cleanCode || c.code.replace(/[^A-Z0-9]/g, '') === cleanCode.replace(/[^A-Z0-9]/g, '')
      );
      if (codeObj) {
        codeObj.status = 'claimed';
        codeObj.claimedByEmail = cleanEmail;
        codeObj.claimedBusinessId = business.id;
        codeObj.claimedBusinessName = business.name;
        codeObj.claimedAt = new Date().toISOString();
      }
    }

    // Create Admin notification
    dbState.notifications.unshift({
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipientRole: 'admin',
      title: '💈 Nueva Barbería Registrada',
      message: `${business.name} (${cleanEmail}) se registró con el código ${authCode || 'N/A'}.`,
      type: 'accepted',
      timestamp: new Date().toISOString(),
      read: false,
    });

    saveDbToDisk();
    broadcastSse('SYNC', dbState);
    console.log(`[Nova DB] Business registered: ${business.name} (${cleanEmail})`);

    res.json({ success: true, business, businesses: dbState.businesses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check account status by email
app.get('/api/business/status-check', (req, res) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email requerido' });
  }

  const biz = dbState.businesses.find((b) => b.ownerEmail?.toLowerCase() === email);
  if (!biz) {
    return res.json({ success: true, exists: false });
  }

  res.json({
    success: true,
    exists: true,
    businessId: biz.id,
    businessName: biz.name,
    accountStatus: biz.accountStatus || 'activa',
    statusReason: biz.statusReason || '',
    statusUpdatedAt: biz.statusUpdatedAt,
  });
});

// Admin update business account status (Suspender, Vencer, Reactivar)
app.post('/api/business/update-status', (req, res) => {
  try {
    const { businessId, accountStatus, statusReason } = req.body;
    if (!businessId || !accountStatus) {
      return res.status(400).json({ success: false, error: 'businessId y accountStatus son requeridos' });
    }

    const biz = dbState.businesses.find((b) => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ success: false, error: 'Barbería no encontrada' });
    }

    const previousStatus = biz.accountStatus || 'activa';
    biz.accountStatus = accountStatus;
    biz.statusReason = statusReason || (
      accountStatus === 'suspendida'
        ? 'Cuenta suspendida temporalmente por la administración de Nova Barber.'
        : accountStatus === 'vencida'
        ? 'La membresía o periodo de servicio de esta cuenta ha vencido.'
        : 'Cuenta activa y en regla.'
    );
    biz.statusUpdatedAt = new Date().toISOString();

    // Create notification for the business
    dbState.notifications.unshift({
      id: `notif-${Date.now()}`,
      recipientRole: 'business',
      recipientId: biz.id,
      title: accountStatus === 'activa' ? '🟢 Cuenta Reactivada' : accountStatus === 'suspendida' ? '🔴 Cuenta Suspendida' : '🟡 Cuenta Vencida',
      message: `El estado de tu cuenta fue cambiado a "${accountStatus.toUpperCase()}". Motivo: ${biz.statusReason}`,
      type: accountStatus === 'activa' ? 'accepted' : 'rejected',
      timestamp: new Date().toISOString(),
      read: false,
    });

    saveDbToDisk();
    console.log(`[Nova DB] Business ${biz.name} status updated: ${previousStatus} -> ${accountStatus}`);

    broadcastSse('BUSINESS_STATUS_UPDATED', {
      businessId: biz.id,
      accountStatus: biz.accountStatus,
      statusReason: biz.statusReason,
      business: biz,
    });
    broadcastSse('SYNC', dbState);

    res.json({
      success: true,
      business: biz,
      accountStatus: biz.accountStatus,
      statusReason: biz.statusReason,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a business (Admin only)
app.post('/api/business/delete', (req, res) => {
  try {
    const { businessId } = req.body;
    if (!businessId) return res.status(400).json({ success: false, error: 'businessId requerido' });

    dbState.businesses = dbState.businesses.filter((b) => b.id !== businessId);
    // Also remove appointments for this business
    dbState.appointments = dbState.appointments.filter((a) => a.businessId !== businessId);

    saveDbToDisk();
    broadcastSse('SYNC', dbState);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check client account status by email
app.get('/api/client/status-check', (req, res) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email requerido' });
  }

  const client = dbState.clients.find((c) => c.email?.toLowerCase() === email);
  if (!client) {
    return res.json({ success: true, exists: false });
  }

  res.json({
    success: true,
    exists: true,
    clientId: client.id,
    clientName: client.name,
    accountStatus: client.accountStatus || 'activa',
    statusReason: client.statusReason || '',
    statusUpdatedAt: client.statusUpdatedAt,
  });
});

// Admin update client account status (Suspender, Vencer, Reactivar)
app.post('/api/clients/update-status', (req, res) => {
  try {
    const { clientId, accountStatus, statusReason } = req.body;
    if (!clientId || !accountStatus) {
      return res.status(400).json({ success: false, error: 'clientId y accountStatus son requeridos' });
    }

    const client = dbState.clients.find((c) => c.id === clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    }

    const previousStatus = client.accountStatus || 'activa';
    client.accountStatus = accountStatus;
    client.statusReason = statusReason || (
      accountStatus === 'suspendida'
        ? 'Cuenta de cliente suspendida temporalmente por la administración de Nova Barber.'
        : accountStatus === 'vencida'
        ? 'Periodo de servicio o cuenta vencida.'
        : 'Cuenta activa.'
    );
    client.statusUpdatedAt = new Date().toISOString();

    saveDbToDisk();
    console.log(`[Nova DB] Client ${client.email} status updated: ${previousStatus} -> ${accountStatus}`);

    broadcastSse('CLIENT_STATUS_UPDATED', {
      clientId: client.id,
      clientEmail: client.email,
      accountStatus: client.accountStatus,
      statusReason: client.statusReason,
      client,
    });
    broadcastSse('SYNC', dbState);

    res.json({
      success: true,
      client,
      accountStatus: client.accountStatus,
      statusReason: client.statusReason,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete a client (Admin only)
app.post('/api/clients/delete', (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ success: false, error: 'clientId requerido' });

    dbState.clients = dbState.clients.filter((c) => c.id !== clientId);
    saveDbToDisk();
    broadcastSse('SYNC', dbState);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Reset database (Admin only)
app.post('/api/admin/reset', (req, res) => {
  try {
    dbState = {
      businesses: [],
      appointments: [],
      notifications: [],
      authCodes: DEFAULT_STATE.authCodes,
      clients: [],
      queue: [],
      dailyClosures: [],
    };
    saveDbToDisk();
    res.json({ success: true, data: dbState });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server with Vite Middleware
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nova Barber Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
