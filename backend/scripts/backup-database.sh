#!/bin/bash

# Script de backup automático para PostgreSQL
# Este script crea backups diarios de la base de datos pool_calculator

# Cargar variables de entorno
set -a
source "$(dirname "$0")/../.env"
set +a

# Configuración
BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="pool_calculator_backup_${TIMESTAMP}.sql"
MAX_BACKUPS=30  # Mantener últimos 30 backups

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo "================================================"
echo "Iniciando backup de base de datos..."
echo "Fecha: $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# Extraer información de conexión desde DATABASE_URL
# Formato: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
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

# Realizar backup usando pg_dump
export PGPASSWORD="$DB_PASS"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Comprimir el backup
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)

    echo "✅ Backup completado exitosamente!"
    echo "📁 Archivo: $BACKUP_FILE.gz"
    echo "💾 Tamaño: $BACKUP_SIZE"
    echo ""

    # Limpiar backups antiguos (mantener solo los últimos MAX_BACKUPS)
    echo "🧹 Limpiando backups antiguos..."
    cd "$BACKUP_DIR"
    ls -t pool_calculator_backup_*.sql.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

    REMAINING=$(ls -1 pool_calculator_backup_*.sql.gz 2>/dev/null | wc -l)
    echo "📊 Backups actuales: $REMAINING"
    echo ""

    # Logging
    LOG_FILE="$BACKUP_DIR/backup.log"
    touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/pool_backup.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup exitoso: $BACKUP_FILE.gz ($BACKUP_SIZE)" >> "$LOG_FILE"

    echo "================================================"
    echo "✅ Proceso de backup finalizado correctamente"
    echo "================================================"
else
    echo "❌ ERROR: Falló el backup de la base de datos"
    LOG_FILE="$BACKUP_DIR/backup.log"
    touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/pool_backup.log"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup FALLIDO" >> "$LOG_FILE"
    exit 1
fi

unset PGPASSWORD
