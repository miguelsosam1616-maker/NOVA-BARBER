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

// Full state synchronization (Cross-device real-time sync)
app.get('/api/sync', (req, res) => {
  res.json({
    success: true,
    data: dbState,
  });
});

// Save / sync full or partial state from client
app.post('/api/sync', (req, res) => {
  try {
    const { businesses, appointments, notifications, authCodes, clients, queue, dailyClosures } = req.body;
    if (Array.isArray(businesses)) {
      businesses.forEach((b: any) => {
        if (!b.accountStatus) {
          b.accountStatus = 'activa';
        }
      });
      dbState.businesses = businesses;
    }
    if (Array.isArray(appointments)) dbState.appointments = appointments;
    if (Array.isArray(notifications)) dbState.notifications = notifications;
    if (Array.isArray(queue)) dbState.queue = queue;
    if (Array.isArray(dailyClosures)) dbState.dailyClosures = dailyClosures;
    if (Array.isArray(authCodes)) {
      // Smart merge: do not lose codes generated on either client or server
      const codeMap = new Map<string, any>();
      dbState.authCodes.forEach((c) => codeMap.set(c.id, c));
      authCodes.forEach((c) => {
        const existing = codeMap.get(c.id);
        if (!existing) {
          codeMap.set(c.id, c);
        } else {
          codeMap.set(c.id, { ...existing, ...c });
        }
      });
      dbState.authCodes = Array.from(codeMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    }
    if (Array.isArray(clients)) {
      const clientMap = new Map<string, any>();
      dbState.clients.forEach((c) => clientMap.set(c.id, c));
      clients.forEach((c) => {
        const existing = clientMap.get(c.id);
        if (!existing) {
          clientMap.set(c.id, c);
        } else {
          clientMap.set(c.id, { ...existing, ...c });
        }
      });
      dbState.clients = Array.from(clientMap.values());
    }

    saveDbToDisk();
    res.json({ success: true, data: dbState });
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
    res.json({ success: true, authCodes: dbState.authCodes });
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
