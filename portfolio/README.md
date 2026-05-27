# Jesús Olguín — Portfolio

Portfolio personal de Jesús Olguín, Full-Stack Developer & IoT Solutions.

## Deploy en Railway

1. En Railway → **New Project → Deploy from GitHub repo**
2. Seleccioná `jesus1942/PoolCalculator`
3. En **Settings → Root Directory** poné: `portfolio`
4. Railway detecta el `package.json` y ejecuta `npm start`
5. El sitio queda en línea en el dominio que Railway asigne

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
