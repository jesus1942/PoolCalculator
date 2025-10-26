#!/bin/bash

echo "========================================="
echo "  Pool Calculator - Estado del Sistema"
echo "========================================="
echo ""

# Verificar servicios
echo "🔍 Verificando servicios..."
echo ""

# PostgreSQL
if docker ps | grep -q pool-calculator-db; then
  echo "✅ PostgreSQL: ACTIVO (puerto 5433)"
else
  echo "❌ PostgreSQL: INACTIVO"
fi

# Backend
if lsof -ti:3000 > /dev/null 2>&1; then
  BACKEND_PID=$(lsof -ti:3000)
  echo "✅ Backend: ACTIVO (puerto 3000, PID: $BACKEND_PID)"
  # Verificar health
  HEALTH=$(curl -s http://localhost:3000/health 2>/dev/null)
  if [ ! -z "$HEALTH" ]; then
    echo "   Health check: OK"
  fi
else
  echo "❌ Backend: INACTIVO"
fi

# Frontend
if lsof -ti:5173 > /dev/null 2>&1; then
  FRONTEND_PID=$(lsof -ti:5173)
  echo "✅ Frontend: ACTIVO (puerto 5173, PID: $FRONTEND_PID)"
else
  echo "❌ Frontend: INACTIVO"
fi

echo ""
echo "========================================="
echo ""

# Información del proyecto
echo "📊 Información del Proyecto:"
echo ""

if [ -f ".claude-context.json" ]; then
  VERSION=$(grep -o '"version": "[^"]*"' .claude-context.json | cut -d'"' -f4)
  LAST_UPDATE=$(grep -o '"lastUpdate": "[^"]*"' .claude-context.json | cut -d'"' -f4)
  echo "   Versión: $VERSION"
  echo "   Última actualización: $LAST_UPDATE"
  echo ""
  echo "📝 Últimos cambios (context-manager.py history 3):"
  python3 context-manager.py history 3 2>/dev/null | tail -n +4 | head -20
else
  echo "   ⚠️  No se encontró .claude-context.json"
fi

echo ""
echo "========================================="
echo ""

# Estadísticas
echo "📈 Estadísticas:"
echo ""

if [ -d "backend" ]; then
  BACKEND_FILES=$(find backend/src -type f -name "*.ts" | wc -l)
  echo "   Backend: $BACKEND_FILES archivos TypeScript"
fi

if [ -d "frontend" ]; then
  FRONTEND_FILES=$(find frontend/src -type f \( -name "*.tsx" -o -name "*.ts" \) | wc -l)
  echo "   Frontend: $FRONTEND_FILES archivos TypeScript/React"
fi

if [ -d "logs" ]; then
  LOG_FILES=$(ls -1 logs/ 2>/dev/null | wc -l)
  echo "   Logs: $LOG_FILES archivos"
fi

echo ""
echo "========================================="
echo ""

# URLs
echo "📍 URLs:"
echo "   • Frontend:  http://localhost:5173"
echo "   • Backend:   http://localhost:3000"
echo "   • Health:    http://localhost:3000/health"
echo "   • DB:        localhost:5433"
echo ""

# Comandos útiles
echo "💡 Comandos útiles:"
echo "   • Iniciar:   ./control.sh start"
echo "   • Detener:   ./control.sh stop"
echo "   • Contexto:  python3 context-manager.py summary"
echo "   • Logs DB:   ./control.sh logs postgres"
echo ""
