/**
 * Main Canvas Controller
 * Coordinates viewport, rendering, input handling, shape preview, and undo/redo history.
 */

class CanvasController {
  constructor() {
    // DOM elements
    this.container = null;
    this.displayCanvas = null;
    this.displayCtx = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.gridCanvas = null;
    this.gridCtx = null;

    // Viewport transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.isSpacePressed = false;

    // Drawing state
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;

    // History stack (Undo / Redo)
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 20;

    // Grid toggle
    this.showGrid = false;
  }

  init(containerId, displayCanvasId, previewCanvasId, gridCanvasId) {
    this.container = document.getElementById(containerId);
    this.displayCanvas = document.getElementById(displayCanvasId);
    this.displayCtx = this.displayCanvas.getContext('2d');
    this.previewCanvas = document.getElementById(previewCanvasId);
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.gridCanvas = document.getElementById(gridCanvasId);
    this.gridCtx = this.gridCanvas.getContext('2d');

    const width = 1200;
    const height = 800;
    this.setSize(width, height);

    // Center viewport initially
    this.centerView();

    // Attach event listeners
    this._initEvents();

    // Hook layer change notification
    window.layerManager.onLayersChange = () => {
      this.render();
    };

    // Initial render
    this.render();
    this.saveState();
  }

  setSize(width, height) {
    this.displayCanvas.width = width;
    this.displayCanvas.height = height;
    this.previewCanvas.width = width;
    this.previewCanvas.height = height;
    this.gridCanvas.width = width;
    this.gridCanvas.height = height;

    this.renderGrid();
  }

  /**
   * Center and fit canvas within container
   */
  centerView() {
    if (!this.container) return;
    const rect = this.container.getBoundingClientRect();
    const padding = 40;

    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    const scaleX = availableWidth / this.displayCanvas.width;
    const scaleY = availableHeight / this.displayCanvas.height;
    this.scale = Math.min(1.0, Math.min(scaleX, scaleY));

    this.panX = Math.round((rect.width - this.displayCanvas.width * this.scale) / 2);
    this.panY = Math.round((rect.height - this.displayCanvas.height * this.scale) / 2);

    this._applyTransform();
  }

  /**
   * Reset zoom to 100% and center
   */
  resetZoom() {
    const rect = this.container.getBoundingClientRect();
    this.scale = 1.0;
    this.panX = Math.round((rect.width - this.displayCanvas.width) / 2);
    this.panY = Math.round((rect.height - this.displayCanvas.height) / 2);
    this._applyTransform();
  }

  zoomBy(factor, clientX = null, clientY = null) {
    const prevScale = this.scale;
    let newScale = Math.max(0.1, Math.min(5.0, prevScale * factor));

    if (clientX !== null && clientY !== null) {
      const rect = this.container.getBoundingClientRect();
      const mouseX = clientX - rect.left;
      const mouseY = clientY - rect.top;

      this.panX = mouseX - (mouseX - this.panX) * (newScale / prevScale);
      this.panY = mouseY - (mouseY - this.panY) * (newScale / prevScale);
    } else {
      const rect = this.container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      this.panX = centerX - (centerX - this.panX) * (newScale / prevScale);
      this.panY = centerY - (centerY - this.panY) * (newScale / prevScale);
    }

    this.scale = newScale;
    this._applyTransform();
  }

  _applyTransform() {
    const transformStr = `translate(${this.panX}px, ${this.panY}px) scale(${this.scale})`;
    this.displayCanvas.style.transform = transformStr;
    this.previewCanvas.style.transform = transformStr;
    this.gridCanvas.style.transform = transformStr;

    // Update zoom label if exists
    const zoomLabel = document.getElementById('zoom-percentage');
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(this.scale * 100)}%`;
    }
  }

  /**
   * Screen coordinates to canvas coordinates
   */
  screenToCanvas(clientX, clientY) {
    const rect = this.container.getBoundingClientRect();
    const xInContainer = clientX - rect.left;
    const yInContainer = clientY - rect.top;

    const canvasX = (xInContainer - this.panX) / this.scale;
    const canvasY = (yInContainer - this.panY) / this.scale;

    return { x: canvasX, y: canvasY };
  }

  /**
   * Main render method: composites all layers to displayCanvas
   */
  render() {
    window.layerManager.compositeTo(this.displayCanvas, true, '#ffffff');
  }

  /**
   * Render grid pattern
   */
  renderGrid() {
    const ctx = this.gridCtx;
    const w = this.gridCanvas.width;
    const h = this.gridCanvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!this.showGrid) {
      this.gridCanvas.style.display = 'none';
      return;
    }

    this.gridCanvas.style.display = 'block';
    const gridSize = 40;
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= w; x += gridSize) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
    }
    ctx.stroke();
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.renderGrid();
    return this.showGrid;
  }

  /**
   * Event bindings for pointer & keyboard
   */
  _initEvents() {
    const preview = this.previewCanvas;

    // Pointer events on overlay canvas
    preview.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    window.addEventListener('pointermove', (e) => this._onPointerMove(e));
    window.addEventListener('pointerup', (e) => this._onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this._onPointerUp(e));

    // Mouse wheel for zoom / pan
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoomBy(factor, e.clientX, e.clientY);
      } else {
        // Pan
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this._applyTransform();
      }
    }, { passive: false });

    // Keyboard shortcuts for space-drag pan and undo/redo
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' && !this.isSpacePressed) {
        this.isSpacePressed = true;
        this.container.style.cursor = 'grab';
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.redo();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        this.container.style.cursor = 'crosshair';
      }
    });

    // Window resize
    window.addEventListener('resize', () => {
      // Keep view in bounds
    });
  }

  _onPointerDown(e) {
    // Check if space is pressed or middle mouse button -> pan
    if (this.isSpacePressed || e.button === 1) {
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.container.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return; // Only left click for drawing

    const activeLayer = window.layerManager.getActiveLayer();
    if (!activeLayer) return;

    if (activeLayer.locked) {
      alert('현재 레이어가 잠겨 있습니다. 레이어 잠금을 해제한 후 그려주세요.');
      return;
    }

    if (!activeLayer.visible) {
      alert('현재 레이어가 숨겨져 있습니다. 레이어를 보이게 설정한 후 그려주세요.');
      return;
    }

    const pos = this.screenToCanvas(e.clientX, e.clientY);
    this.startX = pos.x;
    this.startY = pos.y;
    this.isDrawing = true;

    const tool = window.toolManager.currentTool;

    if (tool === 'eyedropper') {
      this._sampleColor(pos.x, pos.y);
      this.isDrawing = false;
      return;
    }

    if (tool === 'fill') {
      this.saveState();
      window.toolManager.floodFill(activeLayer.canvas, pos.x, pos.y, window.toolManager.color);
      this.render();
      this.isDrawing = false;
      return;
    }

    // Brush strokes
    if (['pen', 'pencil', 'marker', 'airbrush', 'eraser'].includes(tool)) {
      window.toolManager.startStroke(activeLayer.ctx, pos.x, pos.y);
      this.render();
    }
  }

  _onPointerMove(e) {
    if (this.isPanning) {
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this._applyTransform();
      return;
    }

    if (!this.isDrawing) return;

    const activeLayer = window.layerManager.getActiveLayer();
    if (!activeLayer) return;

    const pos = this.screenToCanvas(e.clientX, e.clientY);
    const tool = window.toolManager.currentTool;

    if (['pen', 'pencil', 'marker', 'airbrush', 'eraser'].includes(tool)) {
      window.toolManager.drawStroke(activeLayer.ctx, pos.x, pos.y);
      this.render();
    } else if (['line', 'rect', 'circle'].includes(tool)) {
      // Draw live shape on previewCanvas overlay
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      window.toolManager.drawShape(this.previewCtx, this.startX, this.startY, pos.x, pos.y, false);
    }
  }

  _onPointerUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.container.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
      return;
    }

    if (!this.isDrawing) return;
    this.isDrawing = false;

    const activeLayer = window.layerManager.getActiveLayer();
    const tool = window.toolManager.currentTool;

    if (['line', 'rect', 'circle'].includes(tool)) {
      const pos = this.screenToCanvas(e.clientX, e.clientY);
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      // Commit shape to active layer
      window.toolManager.drawShape(activeLayer.ctx, this.startX, this.startY, pos.x, pos.y, true);
    } else if (['pen', 'pencil', 'marker', 'airbrush', 'eraser'].includes(tool)) {
      window.toolManager.endStroke(activeLayer.ctx);
    }

    this.render();
    this.saveState();
  }

  /**
   * Eyedropper sample color at coordinates
   */
  _sampleColor(x, y) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.displayCanvas.width || y < 0 || y >= this.displayCanvas.height) return;

    const pixel = this.displayCtx.getImageData(x, y, 1, 1).data;
    const hex = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1);
    
    window.toolManager.setColor(hex);

    // Switch back to pen
    window.toolManager.setTool('pen');
    
    // Dispatch custom event to update color UI
    const event = new CustomEvent('color-picked', { detail: { color: hex } });
    window.dispatchEvent(event);
  }

  /**
   * Save canvas snapshot for Undo
   */
  saveState() {
    // Clone all layers data
    const layersSnapshot = window.layerManager.layers.map(layer => {
      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = layer.canvas.width;
      copyCanvas.height = layer.canvas.height;
      const copyCtx = copyCanvas.getContext('2d');
      copyCtx.drawImage(layer.canvas, 0, 0);

      return {
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        opacity: layer.opacity,
        locked: layer.locked,
        canvas: copyCanvas
      };
    });

    this.undoStack.push({
      layers: layersSnapshot,
      activeLayerId: window.layerManager.activeLayerId
    });

    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Clear redo stack on new action
    this.redoStack = [];
    this._updateUndoRedoButtons();
  }

  undo() {
    if (this.undoStack.length <= 1) return;

    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);

    const prevState = this.undoStack[this.undoStack.length - 1];
    this._restoreState(prevState);
    this._updateUndoRedoButtons();
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const nextState = this.redoStack.pop();
    this.undoStack.push(nextState);

    this._restoreState(nextState);
    this._updateUndoRedoButtons();
  }

  _restoreState(state) {
    if (!state) return;

    window.layerManager.layers = state.layers.map(item => {
      const restoredCanvas = document.createElement('canvas');
      restoredCanvas.width = item.canvas.width;
      restoredCanvas.height = item.canvas.height;
      const ctx = restoredCanvas.getContext('2d');
      ctx.drawImage(item.canvas, 0, 0);

      return {
        id: item.id,
        name: item.name,
        visible: item.visible,
        opacity: item.opacity,
        locked: item.locked,
        canvas: restoredCanvas,
        ctx: ctx
      };
    });

    window.layerManager.activeLayerId = state.activeLayerId;
    window.layerManager._notifyChange();
    this.render();
  }

  _updateUndoRedoButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = this.undoStack.length <= 1;
    if (redoBtn) redoBtn.disabled = this.redoStack.length === 0;
  }
}

window.canvasController = new CanvasController();
