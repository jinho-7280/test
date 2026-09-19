/**
 * Multi-layer Management System
 */

class LayerManager {
  constructor(width = 1200, height = 800) {
    this.width = width;
    this.height = height;
    this.layers = [];
    this.activeLayerId = null;
    this.nextLayerNumber = 1;
    this.onLayersChange = null; // UI update callback
  }

  /**
   * Initialize default first layer
   */
  init() {
    this.layers = [];
    this.nextLayerNumber = 1;
    const baseLayer = this.addLayer('배경 레이어', false);
    // Fill first background layer with white
    const ctx = baseLayer.ctx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, this.width, this.height);

    // Add working drawing layer
    const drawLayer = this.addLayer('레이어 1');
    this.setActiveLayer(drawLayer.id);
  }

  /**
   * Set overall canvas resolution and resize all existing layer canvases
   */
  resize(newWidth, newHeight) {
    this.width = newWidth;
    this.height = newHeight;

    this.layers.forEach(layer => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = layer.canvas.width;
      tempCanvas.height = layer.canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(layer.canvas, 0, 0);

      layer.canvas.width = newWidth;
      layer.canvas.height = newHeight;
      layer.ctx.drawImage(tempCanvas, 0, 0);
    });

    this._notifyChange();
  }

  /**
   * Create and add a new layer
   */
  addLayer(name = null, insertAboveActive = true, imageElement = null) {
    const id = 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const layerName = name || `레이어 ${this.nextLayerNumber++}`;

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');

    if (imageElement) {
      // Draw image scaled or centered to fit
      ctx.drawImage(imageElement, 0, 0, this.width, this.height);
    }

    const newLayer = {
      id,
      name: layerName,
      canvas,
      ctx,
      visible: true,
      opacity: 1.0,
      locked: false
    };

    if (insertAboveActive && this.activeLayerId) {
      const activeIdx = this.layers.findIndex(l => l.id === this.activeLayerId);
      if (activeIdx !== -1) {
        this.layers.splice(activeIdx + 1, 0, newLayer);
      } else {
        this.layers.push(newLayer);
      }
    } else {
      this.layers.push(newLayer);
    }

    this.activeLayerId = id;
    this._notifyChange();
    return newLayer;
  }

  /**
   * Duplicate specified layer
   */
  duplicateLayer(id) {
    const sourceIdx = this.layers.findIndex(l => l.id === id);
    if (sourceIdx === -1) return null;

    const source = this.layers[sourceIdx];
    const newId = 'layer_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source.canvas, 0, 0);

    const duplicated = {
      id: newId,
      name: `${source.name} (복사본)`,
      canvas,
      ctx,
      visible: source.visible,
      opacity: source.opacity,
      locked: false
    };

    this.layers.splice(sourceIdx + 1, 0, duplicated);
    this.activeLayerId = newId;
    this._notifyChange();
    return duplicated;
  }

  /**
   * Delete layer
   */
  removeLayer(id) {
    if (this.layers.length <= 1) {
      alert('최소 1개의 레이어가 필요합니다.');
      return false;
    }

    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return false;

    this.layers.splice(idx, 1);

    // If active layer was deleted, select adjacent layer
    if (this.activeLayerId === id) {
      const newActive = this.layers[Math.max(0, idx - 1)];
      this.activeLayerId = newActive ? newActive.id : null;
    }

    this._notifyChange();
    return true;
  }

  /**
   * Merge active layer down into the layer below it
   */
  mergeDown(id) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx <= 0) {
      alert('아래로 병합할 수 있는 레이어가 없습니다.');
      return false;
    }

    const topLayer = this.layers[idx];
    const bottomLayer = this.layers[idx - 1];

    bottomLayer.ctx.save();
    bottomLayer.ctx.globalAlpha = topLayer.opacity;
    bottomLayer.ctx.drawImage(topLayer.canvas, 0, 0);
    bottomLayer.ctx.restore();

    // Remove top layer
    this.layers.splice(idx, 1);
    this.activeLayerId = bottomLayer.id;
    this._notifyChange();
    return true;
  }

  /**
   * Move layer up or down in the stack
   * @param {string} id 
   * @param {number} delta (+1 for up, -1 for down)
   */
  moveLayer(id, delta) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx === -1) return false;

    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= this.layers.length) return false;

    const [layer] = this.layers.splice(idx, 1);
    this.layers.splice(targetIdx, 0, layer);
    this._notifyChange();
    return true;
  }

  /**
   * Set active layer
   */
  setActiveLayer(id) {
    this.activeLayerId = id;
    this._notifyChange();
  }

  /**
   * Get currently active layer object
   */
  getActiveLayer() {
    return this.layers.find(l => l.id === this.activeLayerId) || this.layers[this.layers.length - 1] || null;
  }

  /**
   * Toggle visibility of a layer
   */
  toggleVisibility(id) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = !layer.visible;
      this._notifyChange();
    }
  }

  /**
   * Toggle lock status
   */
  toggleLock(id) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.locked = !layer.locked;
      this._notifyChange();
    }
  }

  /**
   * Set layer opacity
   */
  setOpacity(id, opacity) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1.0, opacity));
      this._notifyChange();
    }
  }

  /**
   * Clear active or specified layer pixels
   */
  clearLayer(id = null) {
    const targetId = id || this.activeLayerId;
    const layer = this.layers.find(l => l.id === targetId);
    if (layer) {
      layer.ctx.clearRect(0, 0, this.width, this.height);
      this._notifyChange();
    }
  }

  /**
   * Composite all visible layers onto target main canvas
   */
  compositeTo(targetCanvas, showBackground = true, bgColor = '#ffffff') {
    const ctx = targetCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.width, this.height);

    if (showBackground) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Render layers from bottom (index 0) to top
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      if (!layer.visible) continue;

      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  }

  /**
   * Export final flattened composite image as base64 DataURL
   */
  toDataURL(mimeType = 'image/png', quality = 1.0, showBackground = true, bgColor = '#ffffff') {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = this.width;
    exportCanvas.height = this.height;
    this.compositeTo(exportCanvas, showBackground, bgColor);
    return exportCanvas.toDataURL(mimeType, quality);
  }

  /**
   * Generate thumbnail data url for layer UI
   */
  getThumbnail(id, thumbWidth = 56, thumbHeight = 40) {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return '';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const ctx = thumbCanvas.getContext('2d');

    // Draw checkerboard background for transparency preview
    this._drawCheckerboard(ctx, thumbWidth, thumbHeight);

    ctx.drawImage(layer.canvas, 0, 0, thumbWidth, thumbHeight);
    return thumbCanvas.toDataURL('image/png');
  }

  _drawCheckerboard(ctx, w, h, size = 6) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cbd5e1';
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < w; x += size) {
        if ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 1) {
          ctx.fillRect(x, y, size, size);
        }
      }
    }
  }

  _notifyChange() {
    if (typeof this.onLayersChange === 'function') {
      this.onLayersChange(this.layers, this.activeLayerId);
    }
  }
}

window.layerManager = new LayerManager();
