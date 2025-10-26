#!/bin/bash

# Script de restauración de base de datos PostgreSQL
# Uso: ./restore-database.sh <archivo_backup.sql.gz>

# Cargar variables de entorno
set -a
source "$(dirname "$0")/../.env"
set +a

if [ -z "$1" ]; then
    echo "❌ ERROR: Debes especificar el archivo de backup a restaurar"
    echo "Uso: $0 <archivo_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh "$(dirname "$0")/../backups/"pool_calculator_backup_*.sql.gz 2>/dev/null || echo "  No hay backups disponibles"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERROR: El archivo $BACKUP_FILE no existe"
    exit 1
fi

echo "================================================"
echo "⚠️  ADVERTENCIA: RESTAURACIÓN DE BASE DE DATOS"
echo "================================================"
echo ""
echo "Esto ELIMINARÁ todos los datos actuales de la base de datos"
echo "y los reemplazará con los datos del backup:"
echo ""
echo "📁 Archivo: $(basename $BACKUP_FILE)"
echo "📅 Fecha del archivo: $(stat -c %y "$BACKUP_FILE" | cut -d' ' -f1,2)"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'SI' para confirmar): " CONFIRM

if [ "$CONFIRM" != "SI" ]; then
    echo "❌ Restauración cancelada"
    exit 0
fi

# Extraer información de conexión desde DATABASE_URL
DB_URL=$DATABASE_URL

if [ -z "$DB_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está definida en .env"
    exit 1
fi

# Parsear DATABASE_URL
DB_USER=$(echo $DB_URL | sed -e 's/.*:\/\/\([^:]*\):.*/\1/')
DB_PASS=$(echo $DB_URL | sed -e 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/')
DB_HOST=$(echo $DB_URL | sed -e 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DB_URL | sed -e 's/.*:\([0-9]*\)\/.*/\1/')
DB_NAME=$(echo $DB_URL | sed -e 's/.*\/\([^?]*\).*/\1/')

echo ""
echo "🔄 Descomprimiendo backup..."
TEMP_SQL="/tmp/restore_temp_$(date +%s).sql"
gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"

echo "🗑️  Eliminando base de datos actual..."
export PGPASSWORD="$DB_PASS"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudo eliminar la base de datos actual"
    rm "$TEMP_SQL"
    exit 1
fi

echo "🆕 Creando base de datos nueva..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"

if [ $? -ne 0 ]; then
    echo "❌ ERROR: No se pudo crear la base de datos"
    rm "$TEMP_SQL"
    exit 1
fi

echo "📥 Restaurando datos desde backup..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$TEMP_SQL"

if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "✅ Base de datos restaurada exitosamente!"
    echo "================================================"
    echo ""
    echo "🔧 Recuerda ejecutar las migraciones de Prisma si es necesario:"
    echo "   npx prisma migrate deploy"
    echo "   npx prisma generate"
else
    echo "❌ ERROR: Falló la restauración de la base de datos"
    rm "$TEMP_SQL"
    exit 1
fi

# Limpiar archivo temporal
rm "$TEMP_SQL"
unset PGPASSWORD

echo ""
echo "✅ Proceso de restauración completado"
