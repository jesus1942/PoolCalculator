# Modulo de conversaciones reutilizable

## Objetivo

Separar la mensajeria de la agenda para que la comunicacion entre vendedor, cliente, instalador y mantenimiento no dependa de un evento puntual y pueda reutilizarse en futuras apps o modulos.

## Base agregada al esquema

Se agregaron estas entidades en [`backend/prisma/schema.prisma`](./../prisma/schema.prisma):

- `Conversation`
- `ConversationParticipant`
- `ConversationMessage`

Tambien se agrego la migracion:

- [`20260326120000_add_conversations_module`](./../prisma/migrations/20260326120000_add_conversations_module/migration.sql)

## Ideas de modelado

- Una conversacion puede vivir sola o vincularse a un `Project` o a un `AgendaEvent`.
- Los participantes no tienen por que ser solo usuarios internos.
- La audiencia se modela explicitamente para soportar:
  - vendedor
  - cliente
  - instalador
  - mantenimiento
  - administracion interna
- Los mensajes tienen visibilidad propia para soportar capas como:
  - interno solamente
  - todos los participantes
  - visible para cliente

## Casos que habilita

- chat privado vendedor-cliente
- chat vendedor-instalador
- chat mantenimiento-cliente
- conversacion de proyecto
- conversacion de evento
- portal cliente con mensajes filtrados
- despacho tecnico y mantenimiento con historial por caso

## Encaje con lo actual

- `AgendaMessage` sigue siendo el chat activo hoy.
- `ProjectShare` y timeline publico siguen funcionando igual.
- El siguiente paso es montar endpoints y luego migrar agenda/proyecto para que creen o usen una `Conversation`.

## Siguiente fase recomendada

1. Crear endpoints `/api/conversations` y `/api/conversations/:id/messages`.
2. Al crear un `AgendaEvent`, generar una conversacion asociada si no existe.
3. Agregar selector de audiencia en UI para mensajes visibles al cliente.
4. Agregar geolocalizacion a `Project`, `AgendaEvent` y base operativa.
5. Crear modulo de dispatch para asignacion por cercania y ruta sugerida.
