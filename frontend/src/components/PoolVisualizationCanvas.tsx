import React, { useRef, useEffect } from 'react';
import { Project } from '@/types';

type ViewMode = 'planta' | 'cad';

interface PoolVisualizationCanvasProps {
  project: Project;
  tileConfig?: any;
  width?: number;
  height?: number;
  showMeasurements?: boolean;
  viewMode?: ViewMode;
}

export const PoolVisualizationCanvas = React.forwardRef<HTMLCanvasElement, PoolVisualizationCanvasProps>(
  ({ project, tileConfig, width = 800, height = 600, showMeasurements = true, viewMode = 'planta' }, ref) => {
    const internalRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = (ref as React.RefObject<HTMLCanvasElement>) || internalRef;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Setup HD Canvas
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      ctx.translate(0.5, 0.5); // Líneas más nítidas

      try {
        if (viewMode === 'cad') {
          drawCadView(ctx, width, height);
        } else {
          drawPlantaView(ctx, width, height);
        }
      } catch (error) {
        console.error('Error al dibujar canvas:', error);
      }
    }, [project, tileConfig, width, height, showMeasurements, viewMode]);

    // ============================================
    // CÁLCULO DE LOSETAS CON CENTRO AJUSTABLE
    // ============================================
    const calculateTiles = (totalLength: number, tileSize: number = 0.5, minPercent: number = 0.7): {
      tiles: number[];
      mode: 'exacto' | 'centro' | 'uniforme';
      centerSize?: number;
      adjustedSize?: number;
    } => {
      const minCenterSize = tileSize * minPercent; // 35cm mínimo (70%)

      const numComplete = Math.floor(totalLength / tileSize);
      const remainder = totalLength - (numComplete * tileSize);

      // Si es casi exacto
      if (remainder < 0.01) {
        const tiles: number[] = [];
        for (let i = 0; i < numComplete; i++) tiles.push(tileSize);
        return { tiles, mode: 'exacto' };
      }

      // Calcular distribución con loseta central
      const sidesTotal = numComplete;
      const leftCount = Math.floor(sidesTotal / 2);
      const rightCount = sidesTotal - leftCount;
      const centerSize = totalLength - (leftCount + rightCount) * tileSize;

      // Si el centro está en rango aceptable (70% a 130%)
      if (centerSize >= minCenterSize && centerSize <= tileSize * 1.3) {
        const tiles: number[] = [];
        for (let i = 0; i < leftCount; i++) tiles.push(tileSize);
        tiles.push(centerSize);
        for (let i = 0; i < rightCount; i++) tiles.push(tileSize);
        return { tiles, mode: 'centro', centerSize };
      }

      // Si el centro es muy chico, ajustar todas uniformemente
      const numAdjusted = Math.round(totalLength / tileSize);
      const adjustedSize = totalLength / numAdjusted;
      const tiles: number[] = [];
      for (let i = 0; i < numAdjusted; i++) tiles.push(adjustedSize);
      return { tiles, mode: 'uniforme', adjustedSize };
    };

    const calculateExtension = (sideConfig: any): number => {
      if (!sideConfig || !sideConfig.rows || sideConfig.rows === 0) return 0;
      return sideConfig.rows * 0.5;
    };

    const getPoolDimensions = () => {
      const poolPreset = project.poolPreset;
      const config = tileConfig || project.tileCalculation || {};

      const largo = poolPreset?.length || 8;
      const ancho = poolPreset?.width || 4;

      const extSkimmer = calculateExtension(config.west);
      const extEscalera = calculateExtension(config.east);
      const extIzquierdo = calculateExtension(config.north);
      const extDerecho = calculateExtension(config.south);

      return { largo, ancho, extSkimmer, extEscalera, extIzquierdo, extDerecho, config };
    };

    // ============================================
    // VISTA PLANTA HD
    // ============================================
    const drawPlantaView = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Fondo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -1, w + 2, h + 2);

      const { largo, ancho, extSkimmer, extEscalera, extIzquierdo, extDerecho, config } = getPoolDimensions();

      const totalW = largo + extSkimmer + extEscalera;
      const totalH = ancho + extIzquierdo + extDerecho;

      const margin = 50;
      const scale = Math.min((w - margin * 2) / totalW, (h - margin * 2) / totalH) * 0.85;

      const x0 = (w - totalW * scale) / 2;
      const y0 = (h - totalH * scale) / 2;

      const poolLeft = x0 + extSkimmer * scale;
      const poolTop = y0 + extIzquierdo * scale;
      const poolRight = poolLeft + largo * scale;
      const poolBottom = poolTop + ancho * scale;

      const rectPool = { left: poolLeft, top: poolTop, right: poolRight, bottom: poolBottom };

      const distH = calculateTiles(largo);
      const distV = calculateTiles(ancho);
      const tilesH = distH.tiles;
      const tilesV = distV.tiles;
      const baseTile = 0.5 * scale;
      const joint = 2;

      // Sombra general
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      // Fondo de veredas
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x0, y0, totalW * scale, totalH * scale);
      ctx.shadowColor = 'transparent';

      const hasLomoBalena = ['north', 'south', 'east', 'west'].some(
        side => config[side]?.firstRingType === 'LOMO_BALLENA'
      );

      // Función para dibujar loseta
      const drawTile = (x: number, y: number, tw: number, th: number, isCorner: boolean = false) => {
        const grad = ctx.createLinearGradient(x, y, x + tw, y + th);
        if (isCorner) {
          grad.addColorStop(0, hasLomoBalena ? '#fef3c7' : '#f8fafc');
          grad.addColorStop(1, hasLomoBalena ? '#fde68a' : '#e2e8f0');
        } else {
          grad.addColorStop(0, '#f8fafc');
          grad.addColorStop(1, '#e2e8f0');
        }

        ctx.fillStyle = grad;
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(tw - joint), Math.round(th - joint));

        ctx.strokeStyle = isCorner && hasLomoBalena ? '#d97706' : '#94a3b8';
        ctx.lineWidth = 0.75;
        ctx.strokeRect(Math.round(x), Math.round(y), Math.round(tw - joint), Math.round(th - joint));
      };

      // Dibujar losetas Norte
      for (let row = 0; row < Math.floor(extIzquierdo / 0.5); row++) {
        const y = poolTop - (row + 1) * baseTile;
        let x = poolLeft;
        for (const t of tilesH) {
          drawTile(x, y, t * scale, baseTile);
          x += t * scale;
        }
      }

      // Dibujar losetas Sur
      for (let row = 0; row < Math.floor(extDerecho / 0.5); row++) {
        const y = poolBottom + row * baseTile;
        let x = poolLeft;
        for (const t of tilesH) {
          drawTile(x, y, t * scale, baseTile);
          x += t * scale;
        }
      }

      // Dibujar losetas Oeste (Skimmer)
      for (let col = 0; col < Math.floor(extSkimmer / 0.5); col++) {
        const x = poolLeft - (col + 1) * baseTile;
        let y = poolTop;
        for (const t of tilesV) {
          drawTile(x, y, baseTile, t * scale);
          y += t * scale;
        }
      }

      // Dibujar losetas Este (Escalera)
      for (let col = 0; col < Math.floor(extEscalera / 0.5); col++) {
        const x = poolRight + col * baseTile;
        let y = poolTop;
        for (const t of tilesV) {
          drawTile(x, y, baseTile, t * scale);
          y += t * scale;
        }
      }

      // Esquinas
      const numColsW = Math.floor(extSkimmer / 0.5);
      const numColsE = Math.floor(extEscalera / 0.5);
      const numRowsN = Math.floor(extIzquierdo / 0.5);
      const numRowsS = Math.floor(extDerecho / 0.5);

      // Esquina NO
      for (let col = 0; col < numColsW; col++) {
        for (let row = 0; row < numRowsN; row++) {
          drawTile(poolLeft - (col + 1) * baseTile, poolTop - (row + 1) * baseTile, baseTile, baseTile, true);
        }
      }
      // Esquina NE
      for (let col = 0; col < numColsE; col++) {
        for (let row = 0; row < numRowsN; row++) {
          drawTile(poolRight + col * baseTile, poolTop - (row + 1) * baseTile, baseTile, baseTile, true);
        }
      }
      // Esquina SO
      for (let col = 0; col < numColsW; col++) {
        for (let row = 0; row < numRowsS; row++) {
          drawTile(poolLeft - (col + 1) * baseTile, poolBottom + row * baseTile, baseTile, baseTile, true);
        }
      }
      // Esquina SE
      for (let col = 0; col < numColsE; col++) {
        for (let row = 0; row < numRowsS; row++) {
          drawTile(poolRight + col * baseTile, poolBottom + row * baseTile, baseTile, baseTile, true);
        }
      }

      // Pileta con gradiente
      const poolGrad = ctx.createLinearGradient(poolLeft, poolTop, poolRight, poolBottom);
      poolGrad.addColorStop(0, '#67e8f9');
      poolGrad.addColorStop(0.5, '#22d3ee');
      poolGrad.addColorStop(1, '#0891b2');

      ctx.fillStyle = poolGrad;
      ctx.fillRect(Math.round(poolLeft), Math.round(poolTop), Math.round(largo * scale), Math.round(ancho * scale));

      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(Math.round(poolLeft), Math.round(poolTop), Math.round(largo * scale), Math.round(ancho * scale));

      // Reflejo
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(poolLeft + 40, poolTop + 30, 28, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Dimensiones
      if (showMeasurements) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`${largo} × ${ancho} m`, (poolLeft + poolRight) / 2, (poolTop + poolBottom) / 2);
        ctx.shadowColor = 'transparent';
      }

      // Etiquetas de lados
      ctx.fillStyle = '#64748b';
      ctx.font = '10px system-ui, sans-serif';

      if (extSkimmer > 0) {
        ctx.save();
        ctx.translate(poolLeft - (numColsW * baseTile) / 2, (poolTop + poolBottom) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('SKIMMER', 0, 0);
        ctx.restore();
      }

      if (extEscalera > 0) {
        ctx.save();
        ctx.translate(poolRight + (numColsE * baseTile) / 2, (poolTop + poolBottom) / 2);
        ctx.rotate(Math.PI / 2);
        ctx.fillText('ESCALERA', 0, 0);
        ctx.restore();
      }

      // Título
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VISTA EN PLANTA', 10, 16);
    };

    // ============================================
    // VISTA CAD HD
    // ============================================
    const drawCadView = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Fondo oscuro
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-1, -1, w + 2, h + 2);

      // Grilla
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < w; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const { largo, ancho, extSkimmer, extEscalera, extIzquierdo, extDerecho, config } = getPoolDimensions();

      const totalW = largo + extSkimmer + extEscalera;
      const totalH = ancho + extIzquierdo + extDerecho;

      const margin = 70;
      const scale = Math.min((w - margin * 2) / totalW, (h - margin * 2) / totalH) * 0.7;

      const x0 = (w - totalW * scale) / 2;
      const y0 = (h - totalH * scale) / 2;

      const poolLeft = x0 + extSkimmer * scale;
      const poolTop = y0 + extIzquierdo * scale;
      const poolRight = poolLeft + largo * scale;
      const poolBottom = poolTop + ancho * scale;

      const distH = calculateTiles(largo);
      const distV = calculateTiles(ancho);
      const tilesH = distH.tiles;
      const tilesV = distV.tiles;
      const baseTile = 0.5 * scale;

      const hasLomoBalena = ['north', 'south', 'east', 'west'].some(
        side => config[side]?.firstRingType === 'LOMO_BALLENA'
      );

      // Función para dibujar rectángulo wireframe
      const drawRect = (x: number, y: number, rw: number, rh: number, color: string, lineW: number = 0.75) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineW;
        ctx.strokeRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));
      };

      // Losetas Norte
      for (let row = 0; row < Math.floor(extIzquierdo / 0.5); row++) {
        const y = poolTop - (row + 1) * baseTile;
        let x = poolLeft;
        const centerIdx = Math.floor(tilesH.length / 2);
        for (let i = 0; i < tilesH.length; i++) {
          const tw = tilesH[i] * scale;
          const isCenter = (i === centerIdx && distH.mode === 'centro');
          drawRect(x, y, tw, baseTile, isCenter ? '#67e8f9' : '#38bdf8', isCenter ? 1.5 : 0.75);
          x += tw;
        }
      }

      // Losetas Sur
      for (let row = 0; row < Math.floor(extDerecho / 0.5); row++) {
        const y = poolBottom + row * baseTile;
        let x = poolLeft;
        const centerIdx = Math.floor(tilesH.length / 2);
        for (let i = 0; i < tilesH.length; i++) {
          const tw = tilesH[i] * scale;
          const isCenter = (i === centerIdx && distH.mode === 'centro');
          drawRect(x, y, tw, baseTile, isCenter ? '#67e8f9' : '#38bdf8', isCenter ? 1.5 : 0.75);
          x += tw;
        }
      }

      // Losetas Oeste
      for (let col = 0; col < Math.floor(extSkimmer / 0.5); col++) {
        const x = poolLeft - (col + 1) * baseTile;
        let y = poolTop;
        const centerIdx = Math.floor(tilesV.length / 2);
        for (let i = 0; i < tilesV.length; i++) {
          const th = tilesV[i] * scale;
          const isCenter = (i === centerIdx && distV.mode === 'centro');
          drawRect(x, y, baseTile, th, isCenter ? '#67e8f9' : '#38bdf8', isCenter ? 1.5 : 0.75);
          y += th;
        }
      }

      // Losetas Este
      for (let col = 0; col < Math.floor(extEscalera / 0.5); col++) {
        const x = poolRight + col * baseTile;
        let y = poolTop;
        const centerIdx = Math.floor(tilesV.length / 2);
        for (let i = 0; i < tilesV.length; i++) {
          const th = tilesV[i] * scale;
          const isCenter = (i === centerIdx && distV.mode === 'centro');
          drawRect(x, y, baseTile, th, isCenter ? '#67e8f9' : '#38bdf8', isCenter ? 1.5 : 0.75);
          y += th;
        }
      }

      // Esquinas
      const cornerColor = hasLomoBalena ? '#fbbf24' : '#38bdf8';
      const numColsW = Math.floor(extSkimmer / 0.5);
      const numColsE = Math.floor(extEscalera / 0.5);
      const numRowsN = Math.floor(extIzquierdo / 0.5);
      const numRowsS = Math.floor(extDerecho / 0.5);

      for (let col = 0; col < numColsW; col++) {
        for (let row = 0; row < numRowsN; row++)
          drawRect(poolLeft - (col + 1) * baseTile, poolTop - (row + 1) * baseTile, baseTile, baseTile, cornerColor);
        for (let row = 0; row < numRowsS; row++)
          drawRect(poolLeft - (col + 1) * baseTile, poolBottom + row * baseTile, baseTile, baseTile, cornerColor);
      }
      for (let col = 0; col < numColsE; col++) {
        for (let row = 0; row < numRowsN; row++)
          drawRect(poolRight + col * baseTile, poolTop - (row + 1) * baseTile, baseTile, baseTile, cornerColor);
        for (let row = 0; row < numRowsS; row++)
          drawRect(poolRight + col * baseTile, poolBottom + row * baseTile, baseTile, baseTile, cornerColor);
      }

      // Pileta
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(Math.round(poolLeft), Math.round(poolTop), Math.round(largo * scale), Math.round(ancho * scale));

      // Cruz central
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#0e7490';
      ctx.lineWidth = 0.75;
      const cx = (poolLeft + poolRight) / 2;
      const cy = (poolTop + poolBottom) / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 12);
      ctx.stroke();
      ctx.setLineDash([]);

      // ===== COTAS =====
      const drawCota = (x1: number, y1: number, x2: number, y2: number, text: string, offset: number = 25, side: 'bottom' | 'top' | 'right' | 'left' = 'bottom') => {
        const isHorizontal = Math.abs(y2 - y1) < 2;

        ctx.lineWidth = 0.75;
        ctx.strokeStyle = '#64748b';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isHorizontal) {
          const y = side === 'bottom' ? Math.max(y1, y2) + offset : Math.min(y1, y2) - offset;

          ctx.beginPath();
          ctx.moveTo(x1, Math.min(y1, y) + 3);
          ctx.lineTo(x1, Math.max(y1, y) - 3);
          ctx.moveTo(x2, Math.min(y2, y) + 3);
          ctx.lineTo(x2, Math.max(y2, y) - 3);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x1 + 6, y);
          ctx.lineTo(x2 - 6, y);
          ctx.stroke();

          drawArrow(ctx, x1, y, 'right');
          drawArrow(ctx, x2, y, 'left');

          const textW = ctx.measureText(text).width + 8;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect((x1 + x2) / 2 - textW / 2, y - 7, textW, 14);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(text, (x1 + x2) / 2, y);
        } else {
          const x = side === 'right' ? Math.max(x1, x2) + offset : Math.min(x1, x2) - offset;

          ctx.beginPath();
          ctx.moveTo(Math.min(x1, x) + 3, y1);
          ctx.lineTo(Math.max(x1, x) - 3, y1);
          ctx.moveTo(Math.min(x2, x) + 3, y2);
          ctx.lineTo(Math.max(x2, x) - 3, y2);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(x, y1 + 6);
          ctx.lineTo(x, y2 - 6);
          ctx.stroke();

          drawArrow(ctx, x, y1, 'down');
          drawArrow(ctx, x, y2, 'up');

          ctx.save();
          ctx.translate(x, (y1 + y2) / 2);
          ctx.rotate(-Math.PI / 2);
          const textW = ctx.measureText(text).width + 8;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-textW / 2, -7, textW, 14);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      };

      const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, dir: string) => {
        const s = 5;
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        switch (dir) {
          case 'right': ctx.moveTo(x, y); ctx.lineTo(x + s, y - s / 2); ctx.lineTo(x + s, y + s / 2); break;
          case 'left': ctx.moveTo(x, y); ctx.lineTo(x - s, y - s / 2); ctx.lineTo(x - s, y + s / 2); break;
          case 'up': ctx.moveTo(x, y); ctx.lineTo(x - s / 2, y + s); ctx.lineTo(x + s / 2, y + s); break;
          case 'down': ctx.moveTo(x, y); ctx.lineTo(x - s / 2, y - s); ctx.lineTo(x + s / 2, y - s); break;
        }
        ctx.closePath();
        ctx.fill();
      };

      // Cotas principales
      if (showMeasurements) {
        drawCota(poolLeft, poolBottom, poolRight, poolBottom, `${largo} m`, 28, 'bottom');
        drawCota(poolRight, poolTop, poolRight, poolBottom, `${ancho} m`, 28, 'right');

        // Cotas totales
        const totalLeft = x0;
        const totalRight = x0 + totalW * scale;
        const totalTop = y0;
        const totalBottom = y0 + totalH * scale;

        if (extSkimmer > 0 || extEscalera > 0) {
          drawCota(totalLeft, totalBottom, totalRight, totalBottom, `${totalW.toFixed(2)} m`, 52, 'bottom');
        }
        if (extIzquierdo > 0 || extDerecho > 0) {
          drawCota(totalRight, totalTop, totalRight, totalBottom, `${totalH.toFixed(2)} m`, 52, 'right');
        }

        // Cotas de veredas
        if (extSkimmer > 0) {
          drawCota(totalLeft, poolTop, poolLeft, poolTop, `${(extSkimmer * 100).toFixed(0)}cm`, 16, 'top');
        }
        if (extEscalera > 0) {
          drawCota(poolRight, poolTop, totalRight, poolTop, `${(extEscalera * 100).toFixed(0)}cm`, 16, 'top');
        }
      }

      // Título
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PLANO TÉCNICO', 10, 18);

      ctx.font = '9px monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`ESC 1:${Math.round(100 / scale)}`, 10, 32);

      // Info de distribución
      const hInfo = distH.mode === 'centro'
        ? `${tilesH.length} losetas (centro: ${((distH.centerSize || 0) * 100).toFixed(0)}cm)`
        : distH.mode === 'uniforme'
          ? `${tilesH.length} × ${((distH.adjustedSize || 0) * 100).toFixed(1)}cm`
          : `${tilesH.length} × 50cm`;

      const vInfo = distV.mode === 'centro'
        ? `${tilesV.length} losetas (centro: ${((distV.centerSize || 0) * 100).toFixed(0)}cm)`
        : distV.mode === 'uniforme'
          ? `${tilesV.length} × ${((distV.adjustedSize || 0) * 100).toFixed(1)}cm`
          : `${tilesV.length} × 50cm`;

      ctx.fillStyle = '#475569';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Largo: ${hInfo}`, w - 10, h - 20);
      ctx.fillText(`Ancho: ${vInfo}`, w - 10, h - 8);
    };

    return (
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-lg shadow-sm mx-auto"
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    );
  }
);

PoolVisualizationCanvas.displayName = 'PoolVisualizationCanvas';

export const exportCanvasToImage = (canvas: HTMLCanvasElement, filename: string = 'pool-visualization.png') => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
};
