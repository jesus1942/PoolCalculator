#!/bin/bash
cd backend
npm run prisma:generate
npx prisma migrate dev --name add_complete_presets
echo "Migración completada!"
