# Pool Calculator

Sistema completo de cálculo de materiales para montaje de piscinas de fibra de vidrio.

## 🏊‍♂️ Descripción

Pool Calculator es una aplicación web profesional diseñada para instaladores de piscinas de fibra de vidrio. Permite calcular materiales exactos, presupuestar proyectos, y gestionar todo el ciclo de vida de la instalación de piscinas.

### Características Principales

- ✅ **24 Modelos ACQUAM**: Catálogo completo de piscinas de fibra con especificaciones técnicas
- ✅ **Cálculos Precisos**: Automáticos de materiales, excavación, plomería y electricidad
- ✅ **Gestión de Costos**: Control total de presupuestos y mano de obra en tiempo real
- ✅ **Reportes Profesionales**: Genera presupuestos detallados para clientes
- ✅ **Portal del Cliente**: Los clientes pueden ver el progreso de su proyecto
- ✅ **Sistema de Backup**: Backups automáticos de base de datos
- ✅ **Multi-usuario**: Sistema de roles (SUPERADMIN, ADMIN, USER)

## 🛠️ Stack Tecnológico

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- Axios

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication

## 🚀 Instalación

### Requisitos Previos

- Node.js 18+ 
- PostgreSQL 14+
- npm o yarn

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Configurar DATABASE_URL en .env
npx prisma generate
npx prisma db push
npm run seed  # Poblar base de datos
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📦 Scripts Disponibles

### Backend
- `npm run dev` - Modo desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor producción
- `npm run seed` - Poblar base de datos con datos iniciales

### Frontend
- `npm run dev` - Servidor desarrollo
- `npm run build` - Build para producción
- `npm run preview` - Preview del build

### Control Script
```bash
./control.sh start   # Iniciar ambos servicios
./control.sh stop    # Detener servicios
./control.sh restart # Reiniciar servicios
./control.sh status  # Ver estado
```

## 🔧 Configuración

### Variables de Entorno (Backend)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pool_calculator"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV=development
```

## 🗄️ Backups

Sistema automático de backups incluido:

```bash
# Backup manual
./backend/scripts/backup-database.sh

# Restaurar backup
./backend/scripts/restore-database.sh backups/pool_calculator_backup_YYYYMMDD_HHMMSS.sql.gz

# Configurar backup automático (cron)
crontab -e
# Agregar: 0 2 * * * cd /path/to/pool-calculator/backend && ./scripts/backup-database.sh
```

Ver documentación completa en `backend/scripts/README_BACKUPS.md`

## 📱 Uso

1. Acceder a http://localhost:5173
2. Registrarse o iniciar sesión
3. Explorar modelos de piscinas
4. Crear nuevo proyecto
5. Configurar losetas y materiales
6. Generar presupuesto
7. Compartir con cliente (opcional)

## 👥 Roles de Usuario

- **SUPERADMIN**: Acceso total, gestión de usuarios y configuración global
- **ADMIN**: Gestión de su organización, proyectos y configuraciones
- **USER**: Crear y gestionar sus propios proyectos
- **VIEWER**: Solo lectura (para clientes)

## 🔐 Seguridad

- Autenticación JWT
- Contraseñas hasheadas con bcrypt
- Rate limiting en endpoints críticos
- Validación de datos con Prisma
- CORS configurado

## 📄 Licencia

© 2025 Domotics & IoT Solutions - Jesús Olguín
Todos los derechos reservados.

## 🤝 Soporte

Para soporte técnico o consultas:
- Email: [tu-email]
- Web: [tu-website]

---

**Desarrollado por Jesús Olguín - Domotics & IoT Solutions**
Professional Developer
