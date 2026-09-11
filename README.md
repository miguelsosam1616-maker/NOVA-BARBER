# Nova Barber RD 💈🇩🇴

Plataforma integral de gestión de barberías, reservas en tiempo real y turnos en República Dominicana.

---

## 🚀 Características Principales

- **Portal de Clientes**:
  - Reserva de citas con selección de barbero, servicio, fecha y hora.
  - Turno digital en vivo (cola virtual) con tiempo estimado de espera.
  - Historial de citas con opción de cancelación y notificaciones.
  - Registro sin fricción (únicamente con correo electrónico o WhatsApp RD).

- **Portal de Barberías**:
  - Registro inmediato para barberos y negocios en República Dominicana (Santo Domingo, Santiago, La Vega, etc.).
  - Gestión de equipo de barberos (activar/desactivar, fotos, especialidades).
  - Catálogo de servicios y precios en Pesos Dominicanos (DOP).
  - Agenda interactiva con filtros de estado (Pendiente, Confirmada, En Proceso, Completada, Cancelada).
  - Cola virtual en tiempo real (llamado de clientes, asignación de turnos).
  - Arqueo y Cierre Diario de Caja con balance de ingresos en efectivo y transferencias.
  - Código QR personalizado y descargable para que los clientes escaneen y reserven al instante.

- **Panel de Super Administrador (Acceso Exclusivo)**:
  - Reservado para `financieranova0@gmail.com`.
  - Monitoreo en tiempo real de todas las barberías y clientes registrados.
  - Control de estados de cuenta (Activa, Suspendida con motivo personalizado o predeterminado).
  - Generador de códigos de autorización y soporte WhatsApp RD directo (+1 829 294 9355).

---

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Lucide Icons + Motion
- **Backend / API**: Node.js + Express
- **Persistencia**: Base de datos JSON reactiva con respaldo automático en disco (`data/nova_db.json`)
- **Comunicación en Vivo**: Server-Sent Events (SSE) en tiempo real
- **Empaquetado**: Vite + esbuild

---

## 📦 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd nova-barber
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el entorno de desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 4. Compilar para producción
```bash
npm run build
```

### 5. Iniciar en producción
```bash
npm start
```

---

## 📤 Cómo Subir este Proyecto a GitHub

Si descargaste el código en un archivo ZIP a tu computadora y quieres subirlo a un nuevo repositorio de GitHub, ejecuta los siguientes comandos en tu terminal dentro de la carpeta del proyecto:

```bash
# 1. Iniciar Git si no está iniciado
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear el primer commit
git commit -m "feat: Nova Barber RD - Versión Completa"

# 4. Cambiar a la rama principal (main)
git branch -M main

# 5. Conectar con tu repositorio en GitHub (crea un repositorio vacío en GitHub primero)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 6. Subir tus cambios
git push -u origin main
```

---

## 🔑 Credenciales y Cuentas

- **Super Administrador**: `financieranova0@gmail.com`
- **Barbería de Ejemplo**: `BARBERIA NOVA RD` (Dueño: `miguelsosam1616@gmail.com`)
- **Soporte Oficial**: WhatsApp RD `+1 829 294 9355`
