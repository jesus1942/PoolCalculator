#!/bin/bash

DB_PORT="5433"
DB_NAME="poolcalculator"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
LOG_DIR="$PROJECT_DIR/logs"
USE_DOCKER=true  # true = usar Docker, false = usar PostgreSQL local
AUTO_INIT_DATA=true  # Si la DB está vacía, cargar datos automáticamente
INIT_MODE="backup_or_seed"  # backup_or_seed | seed_only | backup_only

mkdir -p "$LOG_DIR"

wait_for_http() {
  local url="$1"
  local timeout="${2:-20}"
  local elapsed=0

  while [ "$elapsed" -lt "$timeout" ]; do
    if curl -fsS "$url" > /dev/null 2>&1; then
      return 0
    fi

    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 1
}

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
          if ! docker start pool-calculator-db > /dev/null 2>&1; then
            echo "❌ No se pudo iniciar Docker/postgres. Verificá permisos de Docker."
            exit 1
          fi
          sleep 3
        else
          echo "📦 Creando contenedor PostgreSQL..."
          if ! docker run --name pool-calculator-db \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_USER=usuario \
            -e POSTGRES_DB=poolcalculator \
            -p 5433:5432 \
            --restart=unless-stopped \
            -d postgres:15 > /dev/null 2>&1; then
            echo "❌ No se pudo crear el contenedor Docker de PostgreSQL."
            exit 1
          fi
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
    if ! npx prisma generate > /dev/null 2>&1; then
      echo "❌ Falló prisma generate"
      exit 1
    fi
    if ! npx prisma migrate deploy > /dev/null 2>&1; then
      echo "❌ Falló prisma migrate deploy"
      exit 1
    fi
    cd ..

    echo "✅ Base de datos lista"
    echo ""

    # Inicializar datos si la DB está vacía
    if [ "$AUTO_INIT_DATA" = true ]; then
      echo "🧪 Verificando si la base tiene datos..."
      DB_URL=$(grep '^DATABASE_URL=' "$PROJECT_DIR/backend/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

      if [ -n "$DB_URL" ]; then
        DB_USER=$(echo "$DB_URL" | sed -e 's#.*://\([^:]*\):.*#\1#')
        DB_PASS=$(echo "$DB_URL" | sed -e 's#.*://[^:]*:\([^@]*\)@.*#\1#')
        DB_HOST=$(echo "$DB_URL" | sed -e 's#.*@\([^:/]*\).*#\1#')
        DB_PORT_URL=$(echo "$DB_URL" | sed -n -e 's#.*:\([0-9][0-9]*\)/.*#\1#p')
        DB_NAME_URL=$(echo "$DB_URL" | sed -e 's#.*/\([^?]*\).*#\1#')

        if [ -z "$DB_PORT_URL" ]; then
          DB_PORT_URL="5432"
        fi

        USER_COUNT=$(PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT_URL" -U "$DB_USER" -d "$DB_NAME_URL" -tAc 'SELECT COUNT(*) FROM "User";' 2>/dev/null | tr -d '[:space:]')

        if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
          echo "⚠️  Base vacía detectada. Inicializando datos..."

          LATEST_BACKUP=$(ls -t "$PROJECT_DIR/backend/backups"/pool_calculator_backup_*.sql.gz 2>/dev/null | head -n 1)
          RESTORED_FROM_BACKUP=false

          if [ "$INIT_MODE" = "backup_or_seed" ] || [ "$INIT_MODE" = "backup_only" ]; then
            if [ -n "$LATEST_BACKUP" ]; then
              echo "📥 Restaurando desde backup: $(basename "$LATEST_BACKUP")"
              if (cd "$PROJECT_DIR/backend" && printf "SI\n" | ./scripts/restore-database.sh "$LATEST_BACKUP" > /dev/null 2>&1); then
                RESTORED_FROM_BACKUP=true
                echo "✅ Backup restaurado correctamente"
                cd "$PROJECT_DIR/backend" && npx prisma migrate deploy > /dev/null 2>&1 && cd "$PROJECT_DIR"
              else
                echo "⚠️  Falló restauración desde backup. Continuando con seeds..."
              fi
            elif [ "$INIT_MODE" = "backup_only" ]; then
              echo "❌ INIT_MODE=backup_only y no hay backups en backend/backups"
              exit 1
            fi
          fi

          if [ "$RESTORED_FROM_BACKUP" != true ] && { [ "$INIT_MODE" = "backup_or_seed" ] || [ "$INIT_MODE" = "seed_only" ]; }; then
            echo "🌱 Cargando datos base (seeds)..."
            cd "$PROJECT_DIR/backend" || exit 1
            if ! npm run seed:products > /dev/null 2>&1; then
              echo "❌ Falló seed:products"
              exit 1
            fi
            if ! npm run seed:equipment > /dev/null 2>&1; then
              echo "❌ Falló seed:equipment"
              exit 1
            fi
            cd "$PROJECT_DIR" || exit 1
            echo "✅ Seeds ejecutados"
          fi
        else
          echo "✅ Base con datos existentes (users: $USER_COUNT)"
        fi
      else
        echo "⚠️  No se pudo leer DATABASE_URL desde backend/.env"
      fi
      echo ""
    fi

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

    # Iniciar backend en background
    echo "🚀 Iniciando Backend..."
    (
      cd "$PROJECT_DIR/backend" &&
      nohup npm run dev:daemon > "$LOG_DIR/backend.log" 2>&1 &
      echo $! > "$LOG_DIR/backend.pid"
    )

    if ! wait_for_http "http://localhost:3000/health" 25; then
      echo "❌ Backend no inició en puerto 3000"
      echo "📄 Últimas líneas de log:"
      tail -n 20 "$LOG_DIR/backend.log" 2>/dev/null || true
      exit 1
    fi
    echo "✅ Backend iniciado (log: $LOG_DIR/backend.log)"

    # Iniciar frontend en background
    echo "🎨 Iniciando Frontend..."
    (
      cd "$PROJECT_DIR/frontend" &&
      nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
      echo $! > "$LOG_DIR/frontend.pid"
    )

    sleep 2
    if ! lsof -ti:5173 > /dev/null 2>&1; then
      echo "❌ Frontend no inició en puerto 5173"
      echo "📄 Últimas líneas de log:"
      tail -n 20 "$LOG_DIR/frontend.log" 2>/dev/null || true
      exit 1
    fi
    echo "✅ Frontend iniciado (log: $LOG_DIR/frontend.log)"

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
    echo "   • Ver logs backend: tail -f $LOG_DIR/backend.log"
    echo "   • Ver logs frontend: tail -f $LOG_DIR/frontend.log"
    echo "   • Detener todo: ./control.sh stop"
    echo ""
    echo "💡 Nota: Los servicios corren en background."
    echo ""
    ;;

  stop)
    echo "========================================="
    echo "  Deteniendo Pool Calculator"
    echo "========================================="
    echo ""

    # Parar Backend (PID file)
    echo "🛑 Deteniendo Backend..."
    if [ -f "$LOG_DIR/backend.pid" ]; then
      kill "$(cat "$LOG_DIR/backend.pid")" 2>/dev/null || true
      rm -f "$LOG_DIR/backend.pid"
    fi
    pkill -f "tsx src/index.ts" 2>/dev/null || true
    pkill -f "tsx watch src/index.ts" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm run dev:daemon" 2>/dev/null || true

    # Parar Frontend (PID file)
    echo "🛑 Deteniendo Frontend..."
    if [ -f "$LOG_DIR/frontend.pid" ]; then
      kill "$(cat "$LOG_DIR/frontend.pid")" 2>/dev/null || true
      rm -f "$LOG_DIR/frontend.pid"
    fi
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
