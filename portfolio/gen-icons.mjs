import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load logo and embed it as base64 in the SVG
const logoBuffer = readFileSync(path.join(__dirname, 'logo-isotipo.png'));
const logoB64 = logoBuffer.toString('base64');

function makeSvg(size) {
  const half = size / 2;

  // Logo: 512x401 ratio → fit inside a circle, center it
  const logoW = size * 0.42;
  const logoH = logoW * (401 / 512);
  const logoX = half - logoW / 2;
  const logoY = half - logoH / 2;

  // Orbital ring radii (outer and inner, slightly elliptical tilted)
  const r1x = size * 0.42;
  const r1y = size * 0.42;
  const r2x = size * 0.32;
  const r2y = size * 0.32;

  // Dash pattern scales with size
  const d = size / 512;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <style>
      @keyframes spin1 { to { transform: rotate(360deg); } }
      @keyframes spin2 { to { transform: rotate(-360deg); } }
      .orb1 { transform-origin: ${half}px ${half}px; animation: spin1 60s linear infinite; }
      .orb2 { transform-origin: ${half}px ${half}px; animation: spin2 40s linear infinite; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#18181b"/>

  <!-- Subtle glow behind logo -->
  <ellipse cx="${half}" cy="${half}" rx="${size * 0.28}" ry="${size * 0.22}"
    fill="rgba(6,182,212,0.07)"/>

  <!-- Outer orbital ring -->
  <g class="orb1">
    <ellipse cx="${half}" cy="${half}" rx="${r1x}" ry="${r1y * 0.55}"
      fill="none" stroke="rgba(6,182,212,0.35)" stroke-width="${1.6 * d}"
      stroke-dasharray="${14 * d} ${8 * d}"
      transform="rotate(-18 ${half} ${half})"/>
    <!-- Nodes on outer ring -->
    <circle cx="${half + r1x * Math.cos(-0.31)}" cy="${half + r1y * 0.55 * Math.sin(-0.31) * Math.cos(-18 * Math.PI / 180)}"
      r="${3.5 * d}" fill="rgba(6,182,212,0.7)"/>
    <circle cx="${half - r1x * 0.7}" cy="${half - r1y * 0.25}"
      r="${2.5 * d}" fill="rgba(6,182,212,0.45)"/>
  </g>

  <!-- Inner orbital ring -->
  <g class="orb2">
    <ellipse cx="${half}" cy="${half}" rx="${r2x}" ry="${r2y * 0.5}"
      fill="none" stroke="rgba(103,232,249,0.25)" stroke-width="${1.3 * d}"
      stroke-dasharray="${9 * d} ${6 * d}"
      transform="rotate(22 ${half} ${half})"/>
    <!-- Node on inner ring -->
    <circle cx="${half + r2x * 0.82}" cy="${half - r2y * 0.2}"
      r="${2.8 * d}" fill="rgba(103,232,249,0.6)"/>
  </g>

  <!-- Crosshair center mark -->
  <line x1="${half - 6 * d}" y1="${half}" x2="${half + 6 * d}" y2="${half}"
    stroke="rgba(6,182,212,0.3)" stroke-width="${1.2 * d}" stroke-linecap="round"/>
  <line x1="${half}" y1="${half - 6 * d}" x2="${half}" y2="${half + 6 * d}"
    stroke="rgba(6,182,212,0.3)" stroke-width="${1.2 * d}" stroke-linecap="round"/>

  <!-- Logo -->
  <image href="data:image/png;base64,${logoB64}"
    x="${logoX}" y="${logoY}" width="${logoW}" height="${logoH}"
    preserveAspectRatio="xMidYMid meet"/>
</svg>`;
}

async function gen(size, filename) {
  const svg = makeSvg(size);
  const buf = Buffer.from(svg, 'utf8');
  await sharp(buf)
    .png()
    .toFile(path.join(__dirname, filename));
  console.log(`Generated ${filename} (${size}x${size})`);
}

await gen(512, 'icon-512.png');
await gen(192, 'icon-192.png');
await gen(180, 'apple-touch-icon.png');

console.log('Done');
