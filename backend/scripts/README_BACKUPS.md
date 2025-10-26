# Sistema de Backup Automático de Base de Datos

Este directorio contiene scripts para realizar backups automáticos de la base de datos PostgreSQL del proyecto Pool Calculator.

## 📋 Scripts Disponibles

### 1. `backup-database.sh`
Crea un backup completo de la base de datos PostgreSQL.

**Características:**
- ✅ Backup automático con timestamp
- ✅ Compresión con gzip para ahorrar espacio
- ✅ Rotación automática (mantiene últimos 30 backups)
- ✅ Log de operaciones
- ✅ Lee credenciales desde .env automáticamente

**Uso manual:**
```bash
cd /home/jesusolguin/Projects/pool-calculator/backend
./scripts/backup-database.sh
```

### 2. `restore-database.sh`
Restaura la base de datos desde un backup.

**⚠️ ADVERTENCIA:** Este script ELIMINARÁ todos los datos actuales de la base de datos.

**Uso:**
```bash
cd /home/jesusolguin/Projects/pool-calculator/backend
./scripts/restore-database.sh backups/pool_calculator_backup_YYYYMMDD_HHMMSS.sql.gz
```

## ⚙️ Configuración de Backups Automáticos

### Opción 1: Cron Job (Linux/Mac) - RECOMENDADO

Para ejecutar backups automáticos todos los días a las 2:00 AM:

1. Editar el crontab:
```bash
crontab -e
```

2. Agregar esta línea:
```bash
0 2 * * * cd /home/jesusolguin/Projects/pool-calculator/backend && ./scripts/backup-database.sh >> /home/jesusolguin/Projects/pool-calculator/backend/backups/cron.log 2>&1
```

3. Guardar y salir. El backup se ejecutará automáticamente cada día.

**Otras frecuencias de ejemplo:**
```bash
# Cada 6 horas
0 */6 * * * cd /home/jesusolguin/Projects/pool-calculator/backend && ./scripts/backup-database.sh

# Cada hora
0 * * * * cd /home/jesusolguin/Projects/pool-calculator/backend && ./scripts/backup-database.sh

# Cada domingo a las 3:00 AM
0 3 * * 0 cd /home/jesusolguin/Projects/pool-calculator/backend && ./scripts/backup-database.sh
```

### Opción 2: Systemd Timer (Linux) - ALTERNATIVA

Para sistemas con systemd, puedes crear un timer:

1. Crear archivo de servicio `/etc/systemd/system/pool-backup.service`:
```ini
[Unit]
Description=Pool Calculator Database Backup
Wants=pool-backup.timer

[Service]
Type=oneshot
User=jesusolguin
WorkingDirectory=/home/jesusolguin/Projects/pool-calculator/backend
ExecStart=/home/jesusolguin/Projects/pool-calculator/backend/scripts/backup-database.sh

[Install]
WantedBy=multi-user.target
```

2. Crear archivo de timer `/etc/systemd/system/pool-backup.timer`:
```ini
[Unit]
Description=Run Pool Calculator backup daily
Requires=pool-backup.service

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. Habilitar y iniciar el timer:
```bash
sudo systemctl daemon-reload
sudo systemctl enable pool-backup.timer
sudo systemctl start pool-backup.timer
sudo systemctl status pool-backup.timer
```

## 📁 Ubicación de Backups

Los backups se guardan en:
```
/home/jesusolguin/Projects/pool-calculator/backend/backups/
```

Cada backup tiene el formato:
```
pool_calculator_backup_YYYYMMDD_HHMMSS.sql.gz
```

## 🔧 Verificar Backups

Para listar los backups disponibles:
```bash
ls -lh backups/pool_calculator_backup_*.sql.gz
```

Para ver el log de backups:
```bash
cat backups/backup.log
```

## 🚨 Recuperación de Desastres

En caso de pérdida de datos, sigue estos pasos:

1. **Detener la aplicación:**
```bash
# Detener el servidor backend
pkill -f "node.*index.js"
```

2. **Restaurar desde el backup más reciente:**
```bash
cd /home/jesusolguin/Projects/pool-calculator/backend
./scripts/restore-database.sh backups/pool_calculator_backup_YYYYMMDD_HHMMSS.sql.gz
```

3. **Ejecutar migraciones de Prisma (si es necesario):**
```bash
npx prisma migrate deploy
npx prisma generate
```

4. **Reiniciar la aplicación:**
```bash
npm start
```

## 📝 Notas Importantes

1. **Espacio en Disco:** Los backups ocupan espacio. El script mantiene automáticamente los últimos 30 backups y elimina los más antiguos.

2. **Seguridad:** Los backups contienen datos sensibles. Considera:
   - Cifrar los backups si contienen información sensible
   - Almacenar backups en una ubicación externa (otro servidor, nube)
   - Restringir permisos del directorio de backups

3. **Pruebas:** Prueba el proceso de restauración periódicamente para asegurar que los backups funcionan correctamente.

4. **Monitoreo:** Revisa el log regularmente para asegurar que los backups se están ejecutando sin errores:
```bash
tail -f backups/backup.log
```

## 🔗 Backup Remoto (Opcional)

Para mayor seguridad, puedes agregar sincronización remota al script de backup:

### Usando rsync a otro servidor:
```bash
# Al final del script backup-database.sh, agregar:
rsync -avz backups/ usuario@servidor-remoto:/ruta/backups/pool-calculator/
```

### Usando rclone a la nube (Google Drive, Dropbox, etc):
```bash
# Instalar rclone: https://rclone.org/install/
# Configurar: rclone config
# Al final del script backup-database.sh, agregar:
rclone copy backups/ mi-nube:pool-calculator-backups/
```

## 📞 Soporte

Para problemas con los backups, contactar a:
- Jesús Olguín - Domotics & IoT Solutions
- Email: [tu-email]

---

**Última actualización:** 2025-10-26
**Versión:** 1.0.0
