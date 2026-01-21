# Timeline de prueba: Tenants y Accesos

> Guia rapida para SUPERADMIN para probar multitenant y permisos.

## 1) Crear un tenant (organizacion)
- Ir a `Admin > Tenants`.
- Crear tenant con nombre y **Owner Email** (puede ser tu email).
- Si queres probar con otro usuario admin, usa su email y define password.

## 2) Ver el tenant en el selector
- Cerrar sesion y volver a entrar (o borrar `localStorage`).
- En el header aparece el selector de Organizacion.
- Seleccionar el tenant nuevo.

## 3) Probar aislamiento de datos
- En el tenant nuevo, crear un proyecto.
- Cambiar a tu organizacion original.
- El proyecto **no debe aparecer** (aislamiento OK).

## 4) Probar permisos de un ADMIN (no SUPERADMIN)
- Crear un usuario ADMIN en el tenant nuevo (`Admin > Usuarios`).
- Cerrar sesion e ingresar con ese usuario.
- Debe **bloquear**:
  - `/admin/tenants`
  - `/admin/ops`
  - `/admin/docs`
- Debe **permitir**:
  - Gestionar usuarios de su organizacion.
  - Ver/editar recursos del tenant donde pertenece.

## 5) Probar permisos de INSTALLER
- Crear usuario INSTALLER en el tenant.
- Ingresar como INSTALLER.
- Debe ver solo:
  - Panel de instalador (agenda + clima).
- Debe **bloquear**:
  - Dashboard
  - Proyectos
  - Configuracion
  - Admin

## 6) Problemas comunes
- **No aparece el tenant en el selector**: el usuario no es miembro del tenant.
  - Solucion: asignar miembro u owner al crear el tenant.
- **Sigue viendo algo bloqueado**: cerrar sesion y volver a entrar para refrescar token.

