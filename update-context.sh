#!/bin/bash

# Script para actualizar el archivo de contexto de Claude
# Uso: ./update-context.sh "Descripción de los cambios realizados"

if [ -z "$1" ]; then
  echo "❌ Error: Debes proporcionar una descripción de los cambios"
  echo ""
  echo "Uso: ./update-context.sh \"Descripción de los cambios\""
  echo ""
  echo "Ejemplo:"
  echo "  ./update-context.sh \"Agregado sistema de notificaciones\""
  exit 1
fi

CHANGES_DESCRIPTION="$1"
CONTEXT_FILE=".claude-context.json"
BACKUP_FILE=".claude-context.backup.json"
DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y-%m-%d\ %H:%M:%S)

# Verificar que existe el archivo de contexto
if [ ! -f "$CONTEXT_FILE" ]; then
  echo "❌ Error: No existe el archivo $CONTEXT_FILE"
  echo "Por favor ejecuta primero el setup inicial"
  exit 1
fi

# Crear backup
echo "📦 Creando backup..."
cp "$CONTEXT_FILE" "$BACKUP_FILE"

# Leer el contexto actual usando node
node -e "
const fs = require('fs');
const context = JSON.parse(fs.readFileSync('$CONTEXT_FILE', 'utf8'));

// Actualizar fecha
context.lastUpdate = '$DATE';

// Agregar nuevo cambio al changelog
const newChange = {
  date: '$DATE',
  timestamp: '$TIMESTAMP',
  author: 'Jesus Olguin',
  changes: ['$CHANGES_DESCRIPTION']
};

// Agregar al inicio del changelog
context.changelog.unshift(newChange);

// Guardar
fs.writeFileSync('$CONTEXT_FILE', JSON.stringify(context, null, 2));
console.log('✅ Contexto actualizado exitosamente');
console.log('');
console.log('📝 Cambio registrado:');
console.log('   Fecha: $DATE');
console.log('   Cambio: $CHANGES_DESCRIPTION');
"

echo ""
echo "💾 Backup guardado en: $BACKUP_FILE"
echo ""
echo "📋 Para ver el historial completo:"
echo "   cat .claude-context.json | grep -A 5 changelog"
echo ""
