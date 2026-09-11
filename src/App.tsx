import React, { useState } from 'react';
import {
  Scissors,
  Calendar,
  Building2,
  User,
  Bell,
  Search,
  Sparkles,
  Users,
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  LogOut,
  KeyRound,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useNovaDb } from './lib/store';
import { Business } from './types';
import { ADMIN_EMAIL, isSuperAdminEmail } from './data/seedData';
import { AuthPortal } from './components/auth/AuthPortal';
import { AdminPanel } from './components/admin/AdminPanel';
import { ClientHome } from './components/client/ClientHome';
import { BusinessProfile } from './components/client/BusinessProfile';
import { MyAppointments } from './components/client/MyAppointments';
import { ClientProfileView } from './components/client/ClientProfileView';
import { BusinessDashboard } from './components/business/BusinessDashboard';
import { BusinessAppointments } from './components/business/BusinessAppointments';
import { ServicesManager } from './components/business/ServicesManager';
import { BarbersManager } from './components/business/BarbersManager';
import { BusinessRegisterModal } from './components/business/BusinessRegisterModal';
import { AccountBlockedModal } from './components/common/AccountBlockedModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { RealtimeToast } from './components/RealtimeToast';

export default function App() {
  const { db, businesses, appointments, notifications, client, clients, currentUser } = useNovaDb();

  // Client view navigation: 'explore' | 'profile' | 'appointments' | 'business-profile'
  const [clientTab, setClientTab] = useState<'explore' | 'profile' | 'appointments' | 'business-profile'>('explore');
  const [viewedBusiness, setViewedBusiness] = useState<Business | null>(null);

  // Business Owner / Admin navigation: 'dashboard' | 'appointments' | 'services' | 'barbers' | 'admin'
  const [businessTab, setBusinessTab] = useState<'dashboard' | 'appointments' | 'services' | 'barbers' | 'admin'>('dashboard');
  const [currentBusinessId, setCurrentBusinessId] = useState<string>(
    businesses[0]?.id || ''
  );

  // Modals & Drawers
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const [registerBizModalOpen, setRegisterBizModalOpen] = useState(false);

  // If user is not logged in, STRICTLY show Auth Portal gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
        <RealtimeToast />
        <AuthPortal
          onLoginSuccess={() => {
            const user = db.getCurrentUser();
            if (user?.role === 'business' || user?.role === 'admin') {
              if (user.businessId) {
                setCurrentBusinessId(user.businessId);
              }
              // If Super Admin, default to 'admin' tab for convenience
              if (isSuperAdminEmail(user.email)) {
                setBusinessTab('admin');
              } else {
                setBusinessTab('dashboard');
              }
            } else {
              setClientTab('explore');
            }
          }}
        />
      </div>
    );
  }

  const isSuperAdmin = isSuperAdminEmail(currentUser.email);
  const isClient = currentUser.role === 'client';

  // Determine active business for business view
  const userOwnedBusiness = businesses.find(
    (b) => b.id === currentUser.businessId || b.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  // Check if current logged in business has been explicitly suspended by Super Admin
  const isBusinessBlocked =
    !isSuperAdmin &&
    !isClient &&
    userOwnedBusiness &&
    (userOwnedBusiness.accountStatus === 'suspendida' || userOwnedBusiness.accountStatus === 'vencida');

  if (isBusinessBlocked && userOwnedBusiness) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
        <RealtimeToast />
        <AccountBlockedModal
          accountType="business"
          businessName={userOwnedBusiness.name}
          ownerEmail={userOwnedBusiness.ownerEmail}
          ownerPhone={userOwnedBusiness.phone}
          accountStatus={userOwnedBusiness.accountStatus!}
          statusReason={userOwnedBusiness.statusReason}
          statusUpdatedAt={userOwnedBusiness.statusUpdatedAt}
          onRefreshStatus={() => {
            db.syncWithServer();
          }}
          onLogout={() => {
            db.logout();
          }}
        />
      </div>
    );
  }

  // Check if current logged in client has been suspended or expired by Super Admin
  const userClientRecord = isClient
    ? clients.find(
        (c) =>
          c.id === currentUser.clientId ||
          c.email?.toLowerCase() === currentUser.email?.toLowerCase()
      )
    : null;

  const isClientBlocked =
    !isSuperAdmin &&
    isClient &&
    userClientRecord &&
    (userClientRecord.accountStatus === 'suspendida' || userClientRecord.accountStatus === 'vencida');

  if (isClientBlocked && userClientRecord) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
        <RealtimeToast />
        <AccountBlockedModal
          accountType="client"
          clientName={userClientRecord.name}
          ownerEmail={userClientRecord.email}
          accountStatus={userClientRecord.accountStatus!}
          statusReason={userClientRecord.statusReason}
          statusUpdatedAt={userClientRecord.statusUpdatedAt}
          onRefreshStatus={() => {
            db.syncWithServer();
          }}
          onLogout={() => {
            db.logout();
          }}
        />
      </div>
    );
  }

  const activeBusiness =
    businesses.find((b) => b.id === currentBusinessId) || userOwnedBusiness || businesses[0];

  // Unread notifications count
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Pending appointments count for active business
  const pendingAppointmentsCount = activeBusiness
    ? appointments.filter((a) => a.businessId === activeBusiness.id && a.status === 'pendiente').length
    : 0;

  // Client upcoming appointments count
  const clientUpcomingCount = appointments.filter(
    (a) => a.clientId === client.id && (a.status === 'pendiente' || a.status === 'confirmada')
  ).length;

  const handleSelectBusinessForClient = (biz: Business) => {
    setViewedBusiness(biz);
    setClientTab('business-profile');
  };

  const handleBusinessRegistered = (newBiz: Business) => {
    setCurrentBusinessId(newBiz.id);
    setBusinessTab('dashboard');
  };

  const handleLogout = () => {
    db.logout();
    setViewedBusiness(null);
    setClientTab('explore');
    setBusinessTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-amber-500 selection:text-zinc-950">
      {/* Audio & Real-time Broadcast Toast */}
      <RealtimeToast />

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isClient) {
                    setClientTab('explore');
                  } else {
                    setBusinessTab(isSuperAdmin ? 'admin' : 'dashboard');
                  }
                }}
                className="flex items-center gap-2.5 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                  <Scissors className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg sm:text-xl tracking-tight text-white uppercase">
                      NOVA <span className="text-amber-400">BARBER</span>
                    </span>
                    <span className="text-[10px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-amber-300 border border-zinc-700">
                      🇩🇴 RD
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 hidden sm:block">
                    Gestión & Citas en Tiempo Real
                  </span>
                </div>
              </button>
            </div>

            {/* Middle: User Identity Badge (Strictly isolated by role) */}
            <div className="flex items-center gap-2">
              {isClient ? (
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center text-xs font-black">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-zinc-200">{currentUser.name}</div>
                    <div className="text-[10px] text-amber-400 font-medium">Cliente Verificado</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-2xl">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center text-xs font-black">
                    {isSuperAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                  </div>
                  <div className="text-left hidden sm:block">
                    <div className="text-xs font-bold text-zinc-200">
                      {isSuperAdmin ? 'Super Administrador' : currentUser.name}
                    </div>
                    <div className="text-[10px] text-amber-400 font-mono truncate max-w-[150px]">
                      {currentUser.email}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right side: Notifications bell & Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotificationDrawerOpen(true)}
                className="relative p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Notificaciones en tiempo real"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-black text-white flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/30 text-zinc-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Navigation Sub-bar (STRICTLY ROLE-ISOLATED) */}
        <div className="bg-zinc-900/60 border-t border-zinc-800/80 px-4 sm:px-6 lg:px-8 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            {isClient ? (
              /* CLIENT-ONLY NAVIGATION */
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  onClick={() => setClientTab('explore')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    clientTab === 'explore'
                      ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explorar Barberías RD</span>
                </button>

                <button
                  onClick={() => setClientTab('appointments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    clientTab === 'appointments'
                      ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Mis Citas</span>
                  {clientUpcomingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950">
                      {clientUpcomingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setClientTab('profile')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    clientTab === 'profile'
                      ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Mi Perfil</span>
                </button>
              </div>
            ) : (
              /* BUSINESS & SUPER ADMIN NAVIGATION */
              <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                {/* Active Business Selector (only if businesses exist) */}
                <div className="flex items-center gap-2">
                  {businesses.length > 0 ? (
                    <>
                      <span className="text-[11px] text-zinc-400 font-semibold hidden md:inline">
                        Negocio:
                      </span>
                      <select
                        value={activeBusiness?.id || ''}
                        onChange={(e) => setCurrentBusinessId(e.target.value)}
                        className="bg-zinc-950 border border-zinc-700 text-amber-400 font-bold text-xs rounded-xl px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      >
                        {businesses.map((biz) => (
                          <option key={biz.id} value={biz.id}>
                            {biz.name} ({biz.code})
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span className="text-xs text-zinc-500 font-medium">
                      Sin negocio activo
                    </span>
                  )}

                  <button
                    onClick={() => setRegisterBizModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Registrar Barbería</span>
                  </button>
                </div>

                {/* Owner & Admin Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {/* ADMIN TAB: Exclusively for Super Admin financieranova0@gmail.com */}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setBusinessTab('admin')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                        businessTab === 'admin'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black shadow-amber-500/25'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Admin (Generador Códigos)</span>
                    </button>
                  )}

                  <button
                    onClick={() => setBusinessTab('dashboard')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      businessTab === 'dashboard'
                        ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Métricas & Dashboard</span>
                  </button>

                  <button
                    onClick={() => setBusinessTab('appointments')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      businessTab === 'appointments'
                        ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Agenda & Citas</span>
                    {pendingAppointmentsCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    onClick={() => setBusinessTab('services')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      businessTab === 'services'
                        ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Servicios RD$</span>
                  </button>

                  <button
                    onClick={() => setBusinessTab('barbers')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                      businessTab === 'barbers'
                        ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Barberos</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isClient ? (
          /* CLIENT VIEWS */
          <>
            {clientTab === 'explore' && (
              <ClientHome
                onSelectBusiness={handleSelectBusinessForClient}
              />
            )}

            {clientTab === 'business-profile' && viewedBusiness && (
              <BusinessProfile
                business={viewedBusiness}
                onBack={() => setClientTab('explore')}
                onViewMyAppointments={() => setClientTab('appointments')}
              />
            )}

            {clientTab === 'appointments' && (
              <MyAppointments
                onExploreBusinesses={() => setClientTab('explore')}
              />
            )}

            {clientTab === 'profile' && <ClientProfileView />}
          </>
        ) : (
          /* BUSINESS OWNER & SUPER ADMIN VIEWS */
          <>
            {businessTab === 'admin' && isSuperAdmin && (
              <AdminPanel
                onSelectBusiness={(biz) => {
                  setCurrentBusinessId(biz.id);
                  setBusinessTab('dashboard');
                }}
              />
            )}

            {businessTab === 'dashboard' && (
              activeBusiness ? (
                <BusinessDashboard
                  business={activeBusiness}
                  onNavigateToTab={(tab) => setBusinessTab(tab as any)}
                />
              ) : (
                <div className="text-center py-20 bg-zinc-900/60 border border-dashed border-zinc-800 rounded-3xl max-w-lg mx-auto p-8 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-white">No tienes una barbería registrada aún</h3>
                  <p className="text-xs text-zinc-400">
                    {isSuperAdmin
                      ? 'Como Super Administrador, puedes generar códigos en la pestaña Admin o registrar tu propia barbería.'
                      : 'Para comenzar a recibir citas de clientes en República Dominicana, registra tu barbería con tu código de autorización.'}
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    {isSuperAdmin && (
                      <button
                        onClick={() => setBusinessTab('admin')}
                        className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Ir al Panel Admin
                      </button>
                    )}
                    <button
                      onClick={() => setRegisterBizModalOpen(true)}
                      className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
                    >
                      Registrar Barbería
                    </button>
                  </div>
                </div>
              )
            )}

            {businessTab === 'appointments' && (
              activeBusiness ? (
                <BusinessAppointments business={activeBusiness} />
              ) : (
                <div className="text-center py-16 text-zinc-500 text-xs">
                  Registra un negocio primero para ver la agenda de citas.
                </div>
              )
            )}

            {businessTab === 'services' && (
              activeBusiness ? (
                <ServicesManager business={activeBusiness} />
              ) : (
                <div className="text-center py-16 text-zinc-500 text-xs">
                  Registra un negocio primero para gestionar los servicios.
                </div>
              )
            )}

            {businessTab === 'barbers' && (
              activeBusiness ? (
                <BarbersManager business={activeBusiness} />
              ) : (
                <div className="text-center py-16 text-zinc-500 text-xs">
                  Registra un negocio primero para gestionar los barberos.
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* Notification Drawer Component */}
      <NotificationDrawer
        isOpen={notificationDrawerOpen}
        onClose={() => setNotificationDrawerOpen(false)}
        onSelectAppointment={() => {
          if (isClient) {
            setClientTab('appointments');
          } else {
            setBusinessTab('appointments');
          }
        }}
      />

      {/* Business Registration Modal */}
      <BusinessRegisterModal
        isOpen={registerBizModalOpen}
        onClose={() => setRegisterBizModalOpen(false)}
        onRegistered={handleBusinessRegistered}
        initialOwnerEmail={currentUser.email}
        initialOwnerPhone={currentUser.phone}
      />

      {/* Clean Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-black text-zinc-300">NOVA BARBER</span>
            <span>• Plataforma Profesional para Barberías, Salones y Spas</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sincronización en Tiempo Real Activa
            </span>
            <span>• Precios en RD$</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
