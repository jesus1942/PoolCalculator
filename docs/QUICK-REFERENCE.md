# Pool Calculator - Referencia Rápida

## 🚀 Comandos de Inicio

```bash
# Iniciar toda la aplicación (Backend + Frontend + PostgreSQL)
./control.sh start

# Detener todo
./control.sh stop

# Reiniciar todo
./control.sh restart

# Ver logs de PostgreSQL
./control.sh logs postgres
```

## 🔧 Desarrollo

### Backend

```bash
cd backend

# Modo desarrollo (hot reload)
npm run dev

# Compilar TypeScript
npm run build

# Ejecutar producción
npm start

# Migraciones Prisma
npm run prisma:migrate

# Prisma Studio (GUI de BD)
npm run prisma:studio

# Poblar productos
npm run seed:products
```

### Frontend

```bash
cd frontend

# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 📊 Sistema de Contexto (NUEVO)

```bash
# Ver resumen del proyecto
python3 context-manager.py summary

# Ver historial de cambios
python3 context-manager.py history

# Agregar cambio rápido
python3 context-manager.py add "Descripción del cambio"

# Agregar múltiples cambios
python3 context-manager.py add "Cambio 1" "Cambio 2" "Cambio 3"

# Modo interactivo (recomendado)
python3 context-manager.py interactive
```

## 🗄️ Base de Datos

```bash
# Conectar a PostgreSQL
docker exec -it pool-calculator-db psql -U postgres -d poolcalculator

# Ver contenedores Docker
docker ps

# Ver logs de PostgreSQL
docker logs -f pool-calculator-db

# Backup de base de datos
docker exec pool-calculator-db pg_dump -U postgres poolcalculator > backup.sql

# Restaurar backup
cat backup.sql | docker exec -i pool-calculator-db psql -U postgres poolcalculator
```

## 📍 URLs Importantes

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **PostgreSQL**: localhost:5433

## 📁 Estructura del Proyecto

```
pool-calculator/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuraciones (DB, JWT)
│   │   ├── controllers/     # Controladores de rutas
│   │   ├── middleware/      # Middleware (auth)
│   │   ├── routes/          # Definición de rutas
│   │   ├── services/        # Lógica de negocio
│   │   ├── utils/           # Utilidades (cálculos)
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Schema de BD
│   │   ├── seedProducts.ts  # Seed de productos
│   │   └── migrations/      # Migraciones
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   │   ├── ui/          # Componentes UI básicos
│   │   │   └── layout/      # Layout components
│   │   ├── pages/           # Páginas principales
│   │   ├── services/        # API calls
│   │   ├── context/         # React Context
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
│
├── .claude-context.json     # Contexto de Claude (NUEVO)
├── context-manager.py       # Script de contexto (NUEVO)
├── docs/CONTEXT-SYSTEM.md        # Docs del sistema de contexto (NUEVO)
├── control.sh               # Script de control principal
├── docs/NUEVAS_FUNCIONALIDADES.md
└── README.md (si existe)
```

## 🎯 Funcionalidades Principales

1. **Autenticación**: JWT + bcrypt
2. **Proyectos**: CRUD completo de proyectos de piscinas
3. **Presets**: Presets reutilizables (piscinas, losetas, accesorios, equipamiento)
4. **Instalación Eléctrica**: Cálculos automáticos (AEA 90364, IRAM 2178)
5. **Gestión de Tareas**: Categorías, horas, costos
6. **Adicionales**: Sistema de dependencias automáticas
7. **Roles/Oficios**: Gestión de profesionales con tarifas
8. **Exportación**: 5 plantillas (Cliente, Profesional, Materiales, Presupuesto, Reporte)

## 🔑 Variables de Entorno

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:poolcalculator123@localhost:5433/poolcalculator"
JWT_SECRET="tu-secret-key-aqui"
PORT=3000
```

## 📦 Productos en BD

- **64 productos** con precios argentinos (Oct 2025)
- **Categorías**: Construcción, Plomería, Accesorios, Equipamiento, Losetas
- **Marcas**: AstralPool, Loma Negra, Tigre, Awaduct, Vulcano, Peabody, etc.

## 🐛 Troubleshooting

### Puerto ocupado

```bash
# Liberar puerto 3000 (backend)
sudo lsof -ti:3000 | xargs kill -9

# Liberar puerto 5173 (frontend)
sudo lsof -ti:5173 | xargs kill -9

# Liberar puerto 5433 (postgres)
sudo lsof -ti:5433 | xargs kill -9
```

### PostgreSQL no inicia

```bash
# Verificar que Docker está corriendo
sudo systemctl start docker

# Limpiar contenedores viejos
docker stop pool-calculator-db
docker rm pool-calculator-db

# Iniciar de nuevo
./control.sh start
```

### Error de migraciones Prisma

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### Dependencias desactualizadas

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

## 📝 Workflows Comunes

### Agregar un nuevo producto

```bash
# Editar el seed
vim backend/prisma/seedProducts.ts

# Ejecutar seed
cd backend
npm run seed:products
```

### Agregar una nueva ruta API

1. Crear controlador en `backend/src/controllers/`
2. Crear ruta en `backend/src/routes/`
3. Registrar en `backend/src/index.ts`
4. Reiniciar backend

### Agregar una nueva página frontend

1. Crear componente en `frontend/src/pages/`
2. Agregar ruta en `frontend/src/App.tsx`
3. Crear servicio si necesita API en `frontend/src/services/`

### Actualizar el contexto después de cambios

```bash
python3 context-manager.py interactive
# O rápido:
python3 context-manager.py add "Descripción del cambio"
```

## 📞 Ayuda

- **Documentación completa de funcionalidades**: `docs/NUEVAS_FUNCIONALIDADES.md`
- **Sistema de contexto**: `docs/CONTEXT-SYSTEM.md`
- **Estructura detallada**: `estructura_proyecto_20251007_203143.txt`

---

**Última actualización**: 2025-10-10
**Versión**: 2.0.0
