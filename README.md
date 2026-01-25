# Pool Calculator

Sistema completo de calculo de materiales para montaje de piscinas de fibra de vidrio.

## Descripcion

Pool Calculator es una aplicacion web profesional disenada para instaladores de piscinas de fibra de vidrio. Permite calcular materiales exactos, presupuestar proyectos, y gestionar todo el ciclo de vida de la instalacion de piscinas.

### Caracteristicas Principales

- **24 Modelos ACQUAM**: Catalogo completo de piscinas de fibra con especificaciones tecnicas
- **Calculos Precisos**: Automaticos de materiales, excavacion, plomeria y electricidad
- **Gestion de Costos**: Control total de presupuestos y mano de obra en tiempo real
- **Reportes Profesionales**: Genera presupuestos detallados para clientes
- **Portal del Cliente**: Los clientes pueden ver el progreso de su proyecto
- **Sistema de Backup**: Backups automaticos de base de datos
- **Multi-usuario**: Sistema de roles (SUPERADMIN, ADMIN, USER)

## Stack Tecnologico

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

## Estado Actual y Tecnologias Usadas

- Deploy unificado en Railway (frontend servido desde backend con BrowserRouter)
- Base de datos en Railway (PostgreSQL)
- Almacenamiento de imagenes en Cloudinary
- Migracion inicial de datos desde base local
- Ajustes de layout mobile (sidebar y grillas)

Tecnologias usadas en produccion: React, Vite, TailwindCSS, Node.js, Express, Prisma, PostgreSQL, Cloudinary, Railway.

## Instalacion

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

## Scripts Disponibles

### Backend
- `npm run dev` - Modo desarrollo con hot reload
- `npm run build` - Compilar TypeScript
- `npm start` - Iniciar servidor produccion
- `npm run seed` - Poblar base de datos con datos iniciales

### Frontend
- `npm run dev` - Servidor desarrollo
- `npm run build` - Build para produccion
- `npm run preview` - Preview del build

### Control Script
```bash
./control.sh start   # Iniciar ambos servicios
./control.sh stop    # Detener servicios
./control.sh restart # Reiniciar servicios
./control.sh status  # Ver estado
```

## Configuracion

### Variables de Entorno (Backend)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/pool_calculator"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV=development
```

## Backups

Sistema automatico de backups incluido:

```bash
# Backup manual
./backend/scripts/backup-database.sh

# Restaurar backup
./backend/scripts/restore-database.sh backups/pool_calculator_backup_YYYYMMDD_HHMMSS.sql.gz

# Configurar backup automatico (cron)
crontab -e
# Agregar: 0 2 * * * cd /path/to/pool-calculator/backend && ./scripts/backup-database.sh
```

Ver documentacion completa en `backend/scripts/README_BACKUPS.md`

## Uso

1. Acceder a http://localhost:5173
2. Registrarse o iniciar sesion
3. Explorar modelos de piscinas
4. Crear nuevo proyecto
5. Configurar losetas y materiales
6. Generar presupuesto
7. Compartir con cliente (opcional)

## Roles de Usuario

- **SUPERADMIN**: Acceso total, gestion de usuarios y configuracion global
- **ADMIN**: Gestion de su organizacion, proyectos y configuraciones
- **USER**: Crear y gestionar sus propios proyectos
- **VIEWER**: Solo lectura (para clientes)

## Seguridad

- Autenticacion JWT
- Contrasenas hasheadas con bcrypt
- Rate limiting en endpoints criticos
- Validacion de datos con Prisma
- CORS configurado

## Licencia

(c) 2025 Domotics & IoT Solutions - Jesus Olguin
Todos los derechos reservados.

## Soporte

Para soporte tecnico o consultas:
- Email: [tu-email]
- Web: [tu-website]

---

**Desarrollado por Jesus Olguin - Domotics & IoT Solutions**
Professional Developer
