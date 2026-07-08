# Pool Calculator — Reglas de trabajo para Claude Code

## Despliegue y rama de producción (LEER ANTES DE COMMITEAR)

- **Rama de producción: `main`.**
- **Frontend** → GitHub Pages: https://jesus1942.github.io/PoolCalculator/
  Se publica con el workflow `.github/workflows/deploy-pages.yml` en cada push a `main`.
- **Backend** → Railway (config en `nixpacks.toml`), también desde `main`.
  API: https://poolcalculator-production.up.railway.app/api

## Flujo de trabajo obligatorio

1. **Antes de commitear**: verificar dónde se despliega el proyecto (GitHub Pages,
   Railway, u otro) y cuál es la rama que está en producción.
2. **Trabajar y commitear directamente sobre la rama de producción (`main`)**.
   NO crear ramas de feature, NO abrir pull requests, NO hacer merges, salvo que
   Jesús lo pida explícitamente.
3. **Después de cada push a `main`**: verificar que el workflow "Deploy to GitHub
   Pages" termine en éxito (a veces falla de forma transitoria en el paso de
   publicación — en ese caso relanzarlo o pushear de nuevo) y recién entonces
   confirmar que el cambio está publicado.
4. El frontend de Pages es un bundle cacheado: para validar cambios en el
   navegador hace falta refresco forzado (Ctrl+Shift+R) o ventana de incógnito.

## Créditos

- Los commits deben llevar la autoría de Jesús:
  `git commit --author="jesus1942 <chucky9425@gmail.com>"`.
- Si excepcionalmente hay que mergear a `main` (solo cuando Jesús lo pida),
  el merge también va a su nombre: mismo `--author` en el commit de merge
  (`git merge --no-ff <rama> && git commit --amend --no-edit
  --author="jesus1942 <chucky9425@gmail.com>"`, o `-m` con `--author` directo).
