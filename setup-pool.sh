#!/bin/bash

echo "=================================="
echo "Pool Calculator - Setup & Start"
echo "=================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor instalá Docker primero."
    exit 1
fi

# Verificar si Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado. Por favor instalá Node.js primero."
    exit 1
fi

print_success "Docker y Node.js detectados"
echo ""

# Paso 1: Levantar PostgreSQL con Docker
echo "Paso 1: Configurando PostgreSQL..."
if ! docker ps | grep -q pool-calculator-db; then
    if docker ps -a | grep -q pool-calculator-db; then
        print_warning "Contenedor de PostgreSQL existe pero está detenido. Iniciando..."
        docker start pool-calculator-db
    else
        print_warning "Levantando PostgreSQL en Docker..."
        docker run --name pool-calculator-db \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_USER=usuario \
            -e POSTGRES_DB=pool_calculator \
            -p 5432:5432 \
            -d postgres:15
        
        print_success "PostgreSQL levantado en puerto 5432"
        sleep 3
    fi
else
    print_success "PostgreSQL ya está corriendo"
fi
echo ""

# Paso 2: Configurar Backend
echo "Paso 2: Configurando Backend..."
cd backend

if [ ! -f ".env" ]; then
    print_warning "Creando archivo .env del backend..."
    cat > .env << 'ENVFILE'
DATABASE_URL="postgresql://usuario:password@localhost:5432/pool_calculator?schema=public"
JWT_SECRET="pool_calculator_secret_key_change_in_production_2024"
PORT=3000
NODE_ENV=development
UPLOAD_DIR=uploads
ENVFILE
    print_success "Archivo .env creado"
fi

if [ ! -d "node_modules" ]; then
    print_warning "Instalando dependencias del backend..."
    npm install
    print_success "Dependencias del backend instaladas"
else
    print_success "Dependencias del backend ya instaladas"
fi

if [ ! -d "node_modules/.prisma" ]; then
    print_warning "Generando Prisma Client..."
    npm run prisma:generate
    print_success "Prisma Client generado"
fi

print_warning "Ejecutando migraciones de base de datos..."
npm run prisma:migrate -- --name init || true
print_success "Base de datos configurada"

cd ..
echo ""

# Paso 3: Configurar Frontend
echo "Paso 3: Configurando Frontend..."
cd frontend

if [ ! -f ".env" ]; then
    print_warning "Creando archivo .env del frontend..."
    cat > .env << 'ENVFILE'
VITE_API_URL=http://localhost:3000/api
ENVFILE
    print_success "Archivo .env creado"
fi

if [ ! -d "node_modules" ]; then
    print_warning "Instalando dependencias del frontend..."
    npm install
    print_success "Dependencias del frontend instaladas"
else
    print_success "Dependencias del frontend ya instaladas"
fi

cd ..
echo ""

# Paso 4: Crear script para iniciar servicios
echo "Paso 4: Creando scripts de inicio..."

cat > start-backend.sh << 'STARTBACK'
#!/bin/bash
cd backend
echo "Iniciando Backend en http://localhost:3000..."
npm run dev
STARTBACK

cat > start-frontend.sh << 'STARTFRONT'
#!/bin/bash
cd frontend
echo "Iniciando Frontend en http://localhost:5173..."
npm run dev
STARTFRONT

chmod +x start-backend.sh
chmod +x start-frontend.sh

print_success "Scripts de inicio creados"
echo ""

# Paso 5: Iniciar servicios
echo "=================================="
print_success "Configuración completada!"
echo "=================================="
echo ""
echo "Iniciando servicios..."
echo ""

# Iniciar backend en background
gnome-terminal --tab --title="Backend" -- bash -c "./start-backend.sh; exec bash" 2>/dev/null || \
xterm -T "Backend" -e "./start-backend.sh" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && ./start-backend.sh"' 2>/dev/null || \
(print_warning "No se pudo abrir terminal automáticamente para backend" && \
 echo "Ejecutá manualmente: ./start-backend.sh" &)

sleep 3

# Iniciar frontend en background
gnome-terminal --tab --title="Frontend" -- bash -c "./start-frontend.sh; exec bash" 2>/dev/null || \
xterm -T "Frontend" -e "./start-frontend.sh" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd '"$(pwd)"' && ./start-frontend.sh"' 2>/dev/null || \
(print_warning "No se pudo abrir terminal automáticamente para frontend" && \
 echo "Ejecutá manualmente: ./start-frontend.sh" &)

echo ""
echo "=================================="
print_success "Pool Calculator está iniciando!"
echo "=================================="
echo ""
echo "Backend:  http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Esperando que los servicios inicien..."
sleep 5
echo ""
print_success "Abriendo navegador..."
echo ""

# Abrir navegador
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
elif command -v start &> /dev/null; then
    start http://localhost:5173
else
    echo "Abrí manualmente: http://localhost:5173"
fi

echo ""
echo "Para detener los servicios:"
echo "  docker stop pool-calculator-db"
echo "  Ctrl+C en las terminales de backend y frontend"
echo ""
print_success "Todo listo! Disfrutá Pool Calculator"
echo ""
