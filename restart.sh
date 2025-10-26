#!/bin/bash

echo "Reiniciando Pool Calculator..."

# Matar procesos anteriores
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "tsx watch" 2>/dev/null

sleep 2

# Verificar PostgreSQL
if ! docker ps | grep -q pool-calculator-db; then
    echo "Iniciando PostgreSQL..."
    docker start pool-calculator-db 2>/dev/null || echo "PostgreSQL ya está corriendo"
fi

echo ""
echo "Backend: http://localhost:3000"
echo "Frontend: http://localhost:5173"
echo ""

# Iniciar backend
cd backend
gnome-terminal --tab --title="Backend" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
xterm -T "Backend" -e "npm run dev" 2>/dev/null || \
(echo "Iniciando backend en background..." && npm run dev > ../backend.log 2>&1 &)

cd ..
sleep 3

# Iniciar frontend
cd frontend
gnome-terminal --tab --title="Frontend" -- bash -c "npm run dev; exec bash" 2>/dev/null || \
xterm -T "Frontend" -e "npm run dev" 2>/dev/null || \
(echo "Iniciando frontend en background..." && npm run dev > ../frontend.log 2>&1 &)

cd ..

echo ""
echo "Servicios reiniciados!"
echo ""

# Abrir navegador
sleep 3
xdg-open http://localhost:5173 2>/dev/null || open http://localhost:5173 2>/dev/null || echo "Abrí manualmente: http://localhost:5173"
