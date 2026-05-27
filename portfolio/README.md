# Jesús Olguín — Portfolio

Portfolio personal de Jesús Olguín, Full-Stack Developer & IoT Solutions.

## Deploy en Railway

El servicio Railway está conectado a este repo (`jesus1942/PoolCalculator`, branch `main`, root `portfolio`).
Cualquier push que toque archivos dentro de `portfolio/` redespliega automáticamente.

## Setup inicial (ya hecho)

1. En Railway → **New Project → Deploy from GitHub repo**
2. Seleccioná `jesus1942/PoolCalculator`
3. En **Settings → Root Directory** poné: `portfolio`
4. En **Settings → Watch Paths** agregá: `/portfolio/**`
5. Habilitá **Auto Deploy**

## Desarrollo local

```bash
cd portfolio
npm install
npm start
# → http://localhost:3000
```

## Estructura

```
portfolio/
├── index.html   # Single-page portfolio
├── server.js    # Express server para Railway
├── package.json
└── README.md
```
