#!/usr/bin/env python3
"""
Context Manager para Pool Calculator
Gestiona el archivo .claude-context.json con historial de cambios por fecha
"""

import json
import sys
from datetime import datetime
from pathlib import Path

CONTEXT_FILE = Path(".claude-context.json")
BACKUP_FILE = Path(".claude-context.backup.json")


def load_context():
    """Carga el archivo de contexto"""
    if not CONTEXT_FILE.exists():
        print("❌ Error: No existe el archivo .claude-context.json")
        sys.exit(1)

    with open(CONTEXT_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_context(context):
    """Guarda el contexto con formato"""
    # Crear backup primero
    if CONTEXT_FILE.exists():
        with open(BACKUP_FILE, 'w', encoding='utf-8') as f:
            json.dump(context, f, indent=2, ensure_ascii=False)

    with open(CONTEXT_FILE, 'w', encoding='utf-8') as f:
        json.dump(context, f, indent=2, ensure_ascii=False)


def add_change(author, changes_list):
    """Agrega un cambio al historial"""
    context = load_context()

    today = datetime.now().strftime("%Y-%m-%d")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Actualizar lastUpdate
    context['lastUpdate'] = today

    # Buscar si ya existe una entrada para hoy
    existing_entry = None
    for entry in context['changelog']:
        if entry['date'] == today and entry.get('author') == author:
            existing_entry = entry
            break

    if existing_entry:
        # Agregar a la entrada existente
        existing_entry['changes'].extend(changes_list)
        existing_entry['timestamp'] = timestamp
        print(f"✅ Cambios agregados a la entrada existente de {today}")
    else:
        # Crear nueva entrada
        new_entry = {
            "date": today,
            "timestamp": timestamp,
            "author": author,
            "changes": changes_list
        }
        context['changelog'].insert(0, new_entry)
        print(f"✅ Nueva entrada creada para {today}")

    save_context(context)
    print(f"📝 {len(changes_list)} cambio(s) registrado(s)")
    print("")
    for i, change in enumerate(changes_list, 1):
        print(f"   {i}. {change}")


def show_history(limit=10):
    """Muestra el historial de cambios"""
    context = load_context()

    print("📋 Historial de Cambios")
    print("=" * 80)
    print("")

    changelog = context['changelog'][:limit]

    for entry in changelog:
        print(f"📅 {entry['date']} - {entry.get('timestamp', 'N/A')}")
        print(f"👤 {entry['author']}")
        print("")
        for i, change in enumerate(entry['changes'], 1):
            print(f"   {i}. {change}")
        print("")
        print("-" * 80)
        print("")


def show_summary():
    """Muestra un resumen del proyecto"""
    context = load_context()

    print("📊 Resumen del Proyecto")
    print("=" * 80)
    print(f"Nombre: {context['projectName']}")
    print(f"Versión: {context['version']}")
    print(f"Última actualización: {context['lastUpdate']}")
    print(f"Total de cambios registrados: {len(context['changelog'])}")
    print("")
    print(f"Descripción:")
    print(f"  {context['description']}")
    print("")


def interactive_add():
    """Modo interactivo para agregar cambios"""
    print("📝 Agregar Cambios (modo interactivo)")
    print("=" * 80)
    print("")

    author = input("Autor (por defecto: Jesus Olguin): ").strip()
    if not author:
        author = "Jesus Olguin"

    print("")
    print("Ingresa los cambios realizados (uno por línea)")
    print("Presiona Enter en una línea vacía para terminar")
    print("")

    changes = []
    while True:
        change = input(f"Cambio {len(changes) + 1}: ").strip()
        if not change:
            break
        changes.append(change)

    if not changes:
        print("❌ No se ingresaron cambios")
        sys.exit(1)

    print("")
    print("Vista previa:")
    print("-" * 40)
    for i, change in enumerate(changes, 1):
        print(f"{i}. {change}")
    print("")

    confirm = input("¿Confirmar? (s/n): ").strip().lower()
    if confirm == 's':
        add_change(author, changes)
    else:
        print("❌ Cancelado")


def main():
    if len(sys.argv) < 2:
        print("Context Manager - Pool Calculator")
        print("=" * 80)
        print("")
        print("Uso:")
        print("  python3 context-manager.py add \"Cambio realizado\"")
        print("  python3 context-manager.py add \"Cambio 1\" \"Cambio 2\" \"Cambio 3\"")
        print("  python3 context-manager.py interactive")
        print("  python3 context-manager.py history [limite]")
        print("  python3 context-manager.py summary")
        print("")
        print("Ejemplos:")
        print("  python3 context-manager.py add \"Corregido bug en cálculo de losetas\"")
        print("  python3 context-manager.py interactive")
        print("  python3 context-manager.py history 5")
        print("")
        sys.exit(1)

    command = sys.argv[1]

    if command == "add":
        if len(sys.argv) < 3:
            print("❌ Error: Debes proporcionar al menos un cambio")
            print("Uso: python3 context-manager.py add \"Cambio 1\" \"Cambio 2\"")
            sys.exit(1)

        changes = sys.argv[2:]
        author = "Jesus Olguin"
        add_change(author, changes)

    elif command == "interactive":
        interactive_add()

    elif command == "history":
        limit = 10
        if len(sys.argv) > 2:
            try:
                limit = int(sys.argv[2])
            except ValueError:
                print("❌ Error: El límite debe ser un número")
                sys.exit(1)

        show_history(limit)

    elif command == "summary":
        show_summary()

    else:
        print(f"❌ Comando desconocido: {command}")
        print("Comandos válidos: add, interactive, history, summary")
        sys.exit(1)


if __name__ == "__main__":
    main()
