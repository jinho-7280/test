/**
 * Drawing Tools and Brush Algorithms
 */

class ToolManager {
  constructor() {
    this.currentTool = 'pen'; // pen, pencil, marker, airbrush, eraser, fill, line, rect, circle, eyedropper
    this.color = '#1e293b';
    this.size = 8;
    this.opacity = 1.0;
    this.isFillShape = false; // for rect and circle

    // Points buffer for smooth Bézier spline drawing
    this.points = [];
  }

  setTool(toolName) {
    this.currentTool = toolName;
  }

  setColor(hexOrRgba) {
    this.color = hexOrRgba;
  }

  setSize(size) {
    this.size = Math.max(1, Math.min(200, size));
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0.01, Math.min(1.0, opacity));
  }

  /**
   * Start stroke
   */
  startStroke(ctx, x, y) {
    this.points = [{ x, y }];

    ctx.save();
    this._configureContext(ctx);

    if (this.currentTool === 'pen' || this.currentTool === 'pencil' || this.currentTool === 'marker' || this.currentTool === 'eraser') {
      ctx.beginPath();
      ctx.arc(x, y, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.currentTool === 'airbrush') {
      this._drawAirbrushStamp(ctx, x, y);
    }
  }

  /**
   * Draw stroke during pointer move
   */
  drawStroke(ctx, x, y) {
    this.points.push({ x, y });

    if (this.currentTool === 'airbrush') {
      this._drawAirbrushStamp(ctx, x, y);
      return;
    }

    if (['pen', 'pencil', 'marker', 'eraser'].includes(this.currentTool)) {
      if (this.points.length < 3) {
        const b = this.points[0];
        ctx.beginPath();
        ctx.arc(b.x, b.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Smooth curve using quadratic Bézier curves between midpoints
      const i = this.points.length - 1;
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };

      ctx.beginPath();
      const prevMid = {
        x: (this.points[i - 2].x + p1.x) / 2,
        y: (this.points[i - 2].y + p1.y) / 2
      };

      ctx.moveTo(prevMid.x, prevMid.y);
      ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
      ctx.stroke();

      // For pencil, add subtle graphite grain texture
      if (this.currentTool === 'pencil') {
        this._addPencilGrain(ctx, p1.x, p1.y);
      }
    }
  }

  /**
   * End stroke
   */
  endStroke(ctx) {
    this.points = [];
    ctx.restore();
  }

  /**
   * Draw preview or final shape (Line, Rect, Circle)
   */
  drawShape(ctx, startX, startY, currentX, currentY, isFinal = false) {
    ctx.save();
    this._configureContext(ctx);

    ctx.beginPath();
    if (this.currentTool === 'line') {
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
    } else if (this.currentTool === 'rect') {
      const width = currentX - startX;
      const height = currentY - startY;
      if (this.isFillShape) {
        ctx.fillRect(startX, startY, width, height);
      } else {
        ctx.strokeRect(startX, startY, width, height);
      }
    } else if (this.currentTool === 'circle') {
      const radiusX = Math.abs(currentX - startX) / 2;
      const radiusY = Math.abs(currentY - startY) / 2;
      const centerX = startX + (currentX >= startX ? radiusX : -radiusX);
      const centerY = startY + (currentY >= startY ? radiusY : -radiusY);

      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      if (this.isFillShape) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  /**
   * Configure canvas context according to current tool
   */
  _configureContext(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = this.size;

    if (this.currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.globalAlpha = this.opacity;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.color;
      ctx.fillStyle = this.color;

      if (this.currentTool === 'marker') {
        // Semi-transparent overlay marker
        ctx.globalAlpha = Math.min(this.opacity * 0.4, 0.5);
        ctx.lineCap = 'square';
      } else if (this.currentTool === 'pencil') {
        ctx.globalAlpha = Math.min(this.opacity * 0.75, 0.85);
      } else {
        ctx.globalAlpha = this.opacity;
      }
    }
  }

  /**
   * Soft radial gradient airbrush stamp
   */
  _drawAirbrushStamp(ctx, x, y) {
    const radius = this.size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    
    // Parse color to rgba for gradient fade
    const rgb = this._hexToRgb(this.color) || { r: 0, g: 0, b: 0 };
    const alpha = this.opacity * 0.15;
    
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`);
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Subtle graphite grain for pencil
   */
  _addPencilGrain(ctx, x, y) {
    const particles = Math.min(10, Math.floor(this.size / 2));
    const rgb = this._hexToRgb(this.color) || { r: 50, g: 50, b: 50 };
    ctx.save();
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${this.opacity * 0.3})`;
    for (let i = 0; i < particles; i++) {
      const offsetX = (Math.random() - 0.5) * this.size;
      const offsetY = (Math.random() - 0.5) * this.size;
      ctx.fillRect(x + offsetX, y + offsetY, 1.2, 1.2);
    }
    ctx.restore();
  }

  /**
   * Flood fill (bucket tool) implementation using scanline BFS
   */
  floodFill(canvas, startX, startY, fillColorHex, tolerance = 32) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    startX = Math.floor(startX);
    startY = Math.floor(startY);

    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    const fillRgb = this._hexToRgb(fillColorHex) || { r: 0, g: 0, b: 0 };
    const fillAlpha = Math.round(this.opacity * 255);

    // If target color is same as fill color, do nothing
    if (
      Math.abs(startR - fillRgb.r) < 3 &&
      Math.abs(startG - fillRgb.g) < 3 &&
      Math.abs(startB - fillRgb.b) < 3 &&
      Math.abs(startA - fillAlpha) < 3
    ) {
      return;
    }

    const colorMatch = (idx) => {
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      return (
        Math.abs(r - startR) <= tolerance &&
        Math.abs(g - startG) <= tolerance &&
        Math.abs(b - startB) <= tolerance &&
        Math.abs(a - startA) <= tolerance
      );
    };

    const visited = new Uint8Array(width * height);
    const queue = [startX, startY];
    visited[startY * width + startX] = 1;

    while (queue.length > 0) {
      const cy = queue.pop();
      const cx = queue.pop();
      const idx = (cy * width + cx) * 4;

      data[idx] = fillRgb.r;
      data[idx + 1] = fillRgb.g;
      data[idx + 2] = fillRgb.b;
      data[idx + 3] = fillAlpha;

      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];

        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = ny * width + nx;
          if (!visited[nIndex]) {
            visited[nIndex] = 1;
            if (colorMatch(nIndex * 4)) {
              queue.push(nx, ny);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Helper: Hex to RGB object
   */
  _hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    if (isNaN(num)) return { r: 0, g: 0, b: 0 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }
}

window.toolManager = new ToolManager();
