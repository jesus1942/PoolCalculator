#!/bin/bash

# Script para procesar catálogos PDF de piscinas
# - Detecta PDFs nuevos en assets
# - Los convierte a PNG usando pdftoppm
# - Los guarda en pool-images
# - Actualiza el mapping en update-pool-images.js

ASSETS_DIR="/home/jesusolguin/Projects/pool-calculator/assets"
POOL_IMAGES_DIR="/home/jesusolguin/Projects/pool-calculator/backend/public/pool-images"
SCRIPT_DIR="/home/jesusolguin/Projects/pool-calculator/backend/scripts"

echo "🔍 Buscando catálogos PDF en: $ASSETS_DIR"
echo "================================================"

# Buscar todos los PDFs en el directorio assets (excepto el catálogo principal)
cd "$ASSETS_DIR"

NEW_POOLS=()

for pdf in *.pdf; do
    # Saltar si no hay PDFs
    if [ ! -f "$pdf" ]; then
        echo "⚠️  No se encontraron PDFs nuevos"
        exit 0
    fi

    # Obtener nombre base sin extensión
    basename="${pdf%.pdf}"

    # Saltar el catálogo principal
    if [ "$basename" == "catalogo-piletas-acquam" ]; then
        echo "⏭️  Saltando catálogo principal: $pdf"
        continue
    fi

    # Verificar si ya existe PNG con ese nombre en pool-images
    if [ -f "$POOL_IMAGES_DIR/${basename}.png" ]; then
        echo "⏭️  Ya existe: ${basename}.png"
        continue
    fi

    echo ""
    echo "📄 Procesando: $pdf"
    echo "   Convirtiendo a PNG..."

    # Convertir PDF a PNG con alta calidad
    # -png: formato PNG
    # -r 300: resolución 300 DPI
    # -singlefile: una sola imagen si es una página
    pdftoppm -png -r 300 -singlefile "$pdf" "${basename}" 2>&1

    if [ $? -eq 0 ]; then
        # Renombrar si pdftoppm agregó sufijo y mover a pool-images
        if [ -f "${basename}-1.png" ]; then
            mv "${basename}-1.png" "$POOL_IMAGES_DIR/${basename}.png"
        elif [ -f "${basename}.png" ]; then
            mv "${basename}.png" "$POOL_IMAGES_DIR/${basename}.png"
        fi

        if [ -f "$POOL_IMAGES_DIR/${basename}.png" ]; then
            # Obtener tamaño de la imagen
            size=$(ls -lh "$POOL_IMAGES_DIR/${basename}.png" | awk '{print $5}')
            echo "   ✅ Creado: ${basename}.png (${size})"

            # Agregar al array de nuevas piscinas para el mapeo
            NEW_POOLS+=("$basename")
        else
            echo "   ❌ Error: No se pudo crear ${basename}.png"
        fi
    else
        echo "   ❌ Error al convertir $pdf"
    fi
done

echo ""
echo "================================================"
echo "✅ Procesamiento completado"
echo ""

# Si hay nuevas piscinas, mostrar instrucciones
if [ ${#NEW_POOLS[@]} -gt 0 ]; then
    echo "📝 NUEVAS PISCINAS DETECTADAS:"
    echo ""
    for pool in "${NEW_POOLS[@]}"; do
        echo "   - $pool"
    done
    echo ""
    echo "📋 PRÓXIMOS PASOS:"
    echo ""
    echo "1. Editar el archivo mapping:"
    echo "   nano $SCRIPT_DIR/update-pool-images.js"
    echo ""
    echo "2. Agregar las nuevas piscinas al objeto 'modelImageMapping':"
    for pool in "${NEW_POOLS[@]}"; do
        echo "   '${pool}': '${pool}.png',"
    done
    echo ""
    echo "3. Asegurarse que la piscina existe en la base de datos:"
    echo "   - Nombre exacto: '${NEW_POOLS[0]}'"
    echo ""
    echo "4. Ejecutar actualización:"
    echo "   cd $SCRIPT_DIR && node update-pool-images.js"
    echo ""
else
    echo "ℹ️  No se encontraron PDFs nuevos para procesar"
fi
