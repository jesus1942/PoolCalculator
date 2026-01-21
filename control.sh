#!/bin/bash

DB_PORT="5433"
DB_NAME="poolcalculator"
PROJECT_DIR=$(pwd)
USE_DOCKER=true  # true = usar Docker, false = usar PostgreSQL local

case "$1" in
  start)
    echo "========================================="
    echo "  Iniciando Pool Calculator"
    echo "========================================="
    echo ""

    # Verificar puertos ocupados
    echo "🔍 Verificando puertos..."

    # Puerto 3000 (Backend)
    PID_3000=$(lsof -ti:3000)
    if [ ! -z "$PID_3000" ]; then
      echo "⚠️  Puerto 3000 ocupado. Liberando..."
      kill -9 $PID_3000 2>/dev/null || true
    fi

    # Puerto 5173 (Frontend)
    PID_5173=$(lsof -ti:5173)
    if [ ! -z "$PID_5173" ]; then
      echo "⚠️  Puerto 5173 ocupado. Liberando..."
      kill -9 $PID_5173 2>/dev/null || true
    fi

    echo "✅ Puertos liberados"
    echo ""

    # Verificar PostgreSQL
    if [ "$USE_DOCKER" = true ]; then
      echo "🐘 Verificando PostgreSQL Docker..."
      if ! docker ps | grep -q pool-calculator-db; then
        if docker ps -a | grep -q pool-calculator-db; then
          echo "⚠️  Contenedor detenido. Iniciando..."
          docker start pool-calculator-db
          sleep 3
        else
          echo "📦 Creando contenedor PostgreSQL..."
          docker run --name pool-calculator-db \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_USER=usuario \
            -e POSTGRES_DB=poolcalculator \
            -p 5433:5432 \
            --restart=unless-stopped \
            -d postgres:15
          sleep 5
        fi
      fi
      echo "✅ PostgreSQL Docker listo en puerto $DB_PORT"
    else
      echo "🐘 Verificando PostgreSQL local..."
      if ! systemctl is-active --quiet postgresql; then
        echo "⚠️  PostgreSQL no está corriendo. Iniciando..."
        sudo systemctl start postgresql
        sleep 2
      fi
      if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo "📦 Creando base de datos $DB_NAME..."
        sudo -u postgres createdb $DB_NAME
      fi
      echo "✅ PostgreSQL local listo en puerto $DB_PORT"
    fi
    echo ""

    # Ejecutar migraciones
    echo "📦 Ejecutando migraciones..."
    cd backend
    npx prisma migrate deploy > /dev/null 2>&1
    cd ..

    echo "✅ Base de datos lista"
    echo ""

    # Abrir terminal para PostgreSQL Logs (solo si es local)
    if [ "$USE_DOCKER" = false ]; then
      echo "📊 Abriendo terminal de logs PostgreSQL..."
      gnome-terminal --title="PostgreSQL Logs" -- bash -c "
        echo '========================================='
        echo '  PostgreSQL Logs'
        echo '  Monitoreando: $DB_NAME'
        echo '========================================='
        echo ''
        sudo tail -f /var/log/postgresql/postgresql-*.log
        exec bash
      " &
      sleep 1
    fi

    # Abrir terminal para Backend
    echo "🚀 Abriendo terminal Backend..."
    gnome-terminal --title="Backend - Pool Calculator" -- bash -c "
      echo '========================================='
      echo '  Backend Server'
      echo '  http://localhost:3000'
      echo '========================================='
      echo ''
      cd $PROJECT_DIR/backend
      trap 'echo; echo \"⚠️  Backend detenido. Cerrando...\"; sleep 2; exit' INT TERM
      npm run dev
      exec bash
    " &

    sleep 1

    # Abrir terminal para Frontend
    echo "🎨 Abriendo terminal Frontend..."
    gnome-terminal --title="Frontend - Pool Calculator" -- bash -c "
      echo '========================================='
      echo '  Frontend Server'
      echo '  http://localhost:5173'
      echo '========================================='
      echo ''
      cd $PROJECT_DIR/frontend
      trap 'echo; echo \"⚠️  Frontend detenido. Cerrando...\"; sleep 2; exit' INT TERM
      npm run dev
      exec bash
    " &

    sleep 2

    echo ""
    echo "========================================="
    echo "  ✅ Pool Calculator Iniciado"
    echo "========================================="
    echo ""
    echo "📍 Servicios disponibles:"
    echo "   • PostgreSQL: localhost:$DB_PORT"
    echo "   • Backend API: http://localhost:3000"
    echo "   • Frontend: http://localhost:5173"
    echo ""
    echo "📋 Comandos útiles:"
    echo "   • Ver logs: Ventanas abiertas automáticamente"
    echo "   • Detener todo: ./control.sh stop"
    echo ""
    echo "💡 Nota: Los servicios seguirán activos aunque"
    echo "   cierres el navegador. Al cerrar una terminal,"
    echo "   se detendrá ese servicio específico."
    echo ""
    ;;

  stop)
    echo "========================================="
    echo "  Deteniendo Pool Calculator"
    echo "========================================="
    echo ""

    # Parar Backend
    echo "🛑 Deteniendo Backend..."
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true

    # Parar Frontend
    echo "🛑 Deteniendo Frontend..."
    pkill -f "vite" 2>/dev/null || true

    # Limpiar puertos
    PID_3000=$(lsof -ti:3000)
    if [ ! -z "$PID_3000" ]; then
      kill -9 $PID_3000 2>/dev/null || true
    fi

    PID_5173=$(lsof -ti:5173)
    if [ ! -z "$PID_5173" ]; then
      kill -9 $PID_5173 2>/dev/null || true
    fi

    echo ""
    echo "✅ Pool Calculator detenido correctamente"
    echo "💾 PostgreSQL sigue corriendo con todos los datos"
    echo ""
    ;;

  restart)
    echo "========================================="
    echo "  Reiniciando Pool Calculator"
    echo "========================================="
    echo ""
    $0 stop
    sleep 2
    echo "🔄 Regenerando Prisma Client..."
    cd backend && npx prisma generate > /dev/null 2>&1 && cd ..
    echo ""
    $0 start
    ;;

  logs)
    case "$2" in
      postgres|db)
        if [ "$USE_DOCKER" = true ]; then
          echo "📊 Logs de PostgreSQL Docker:"
          docker logs -f pool-calculator-db
        else
          sudo tail -f /var/log/postgresql/postgresql-*.log
        fi
        ;;
      *)
        echo "Uso: $0 logs {postgres|db}"
        echo ""
        echo "Los logs de Backend y Frontend están en sus"
        echo "respectivas ventanas de terminal abiertas."
        ;;
    esac
    ;;

  *)
    echo "========================================="
    echo "  Pool Calculator - Control Script"
    echo "========================================="
    echo ""
    echo "Uso: $0 {start|stop|restart|logs}"
    echo ""
    echo "Comandos:"
    echo "  start    - Inicia todos los servicios"
    echo "  stop     - Detiene todos los servicios"
    echo "  restart  - Reinicia todos los servicios"
    echo "  logs     - Ver logs (postgres|db)"
    echo ""
    exit 1
    ;;
esac
