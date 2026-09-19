/**
 * Main Application Orchestrator
 * Connects UI elements to Canvas, Layers, Tools, Chatbot, and Game modules.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Subsystems
  window.layerManager.init();
  window.canvasController.init('canvas-viewport', 'display-canvas', 'preview-canvas', 'grid-canvas');
  window.chatbotController.init();
  window.gameController.init();

  // 2. Setup Widget Tabs (Chatbot vs Game)
  setupWidgetTabs();

  // 3. Setup Tool Selection
  setupToolSelection();

  // 4. Setup Color Controls
  setupColorControls();

  // 5. Setup Brush Size and Opacity Controls
  setupBrushSettings();

  // 6. Setup Viewport Controls (Zoom, Pan, Fit, Grid)
  setupViewportControls();

  // 7. Setup Layer Management UI
  setupLayerPanel();

  // 8. Setup Action Buttons (Undo, Redo, Clear, Export)
  setupActionButtons();

  // 9. Setup API Key & Model Management (Gemini + OpenAI)
  setupApiKeyManagement();
});

/**
 * Widget tab navigation (Chatbot vs Catchmind Game)
 */
function setupWidgetTabs() {
  const tabChat = document.getElementById('btn-tab-chat');
  const tabGame = document.getElementById('btn-tab-game');
  const paneChat = document.getElementById('view-chat-pane');
  const paneGame = document.getElementById('view-game-pane');

  if (tabChat && tabGame && paneChat && paneGame) {
    tabChat.addEventListener('click', () => {
      tabChat.classList.add('active');
      tabGame.classList.remove('active');
      paneChat.classList.remove('hidden');
      paneGame.classList.add('hidden');
    });

    tabGame.addEventListener('click', () => {
      tabGame.classList.add('active');
      tabChat.classList.remove('active');
      paneGame.classList.remove('hidden');
      paneChat.classList.add('hidden');
    });
  }
}

/**
 * Tool selection buttons
 */
function setupToolSelection() {
  const toolButtons = document.querySelectorAll('.tool-btn');
  const shapeFillCheckbox = document.getElementById('shape-fill-checkbox');

  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const toolName = btn.dataset.tool;
      window.toolManager.setTool(toolName);

      const shapeOptions = document.getElementById('shape-options');
      if (shapeOptions) {
        shapeOptions.style.display = ['rect', 'circle'].includes(toolName) ? 'flex' : 'none';
      }
    });
  });

  if (shapeFillCheckbox) {
    shapeFillCheckbox.addEventListener('change', (e) => {
      window.toolManager.isFillShape = e.target.checked;
    });
  }
}

/**
 * Color picker and palette
 */
function setupColorControls() {
  const mainColorInput = document.getElementById('main-color-picker');
  const colorHexText = document.getElementById('color-hex-text');
  const paletteSwatches = document.querySelectorAll('.palette-color');

  if (mainColorInput) {
    mainColorInput.addEventListener('input', (e) => {
      const color = e.target.value;
      window.toolManager.setColor(color);
      if (colorHexText) colorHexText.textContent = color.toUpperCase();
      updateBrushPreview();
    });
  }

  paletteSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      window.toolManager.setColor(color);
      if (mainColorInput) mainColorInput.value = color;
      if (colorHexText) colorHexText.textContent = color.toUpperCase();
      updateBrushPreview();
    });
  });

  window.addEventListener('color-picked', (e) => {
    const color = e.detail.color;
    if (mainColorInput) mainColorInput.value = color;
    if (colorHexText) colorHexText.textContent = color.toUpperCase();
    
    document.querySelectorAll('.tool-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === 'pen');
    });
    updateBrushPreview();
  });
}

/**
 * Brush size and opacity sliders
 */
function setupBrushSettings() {
  const sizeSlider = document.getElementById('brush-size-slider');
  const sizeVal = document.getElementById('brush-size-val');
  const opacitySlider = document.getElementById('brush-opacity-slider');
  const opacityVal = document.getElementById('brush-opacity-val');

  if (sizeSlider) {
    sizeSlider.addEventListener('input', (e) => {
      const size = parseInt(e.target.value, 10);
      window.toolManager.setSize(size);
      if (sizeVal) sizeVal.textContent = `${size}px`;
      updateBrushPreview();
    });
  }

  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => {
      const opacity = parseInt(e.target.value, 10) / 100;
      window.toolManager.setOpacity(opacity);
      if (opacityVal) opacityVal.textContent = `${Math.round(opacity * 100)}%`;
      updateBrushPreview();
    });
  }

  updateBrushPreview();
}

function updateBrushPreview() {
  const previewDot = document.getElementById('brush-preview-dot');
  if (!previewDot) return;

  const size = Math.min(50, Math.max(4, window.toolManager.size));
  previewDot.style.width = `${size}px`;
  previewDot.style.height = `${size}px`;
  previewDot.style.backgroundColor = window.toolManager.color;
  previewDot.style.opacity = window.toolManager.opacity;
}

/**
 * Viewport controls (Zoom, Pan, Fit, Grid)
 */
function setupViewportControls() {
  const zoomInBtn = document.getElementById('btn-zoom-in');
  const zoomOutBtn = document.getElementById('btn-zoom-out');
  const zoomResetBtn = document.getElementById('btn-zoom-reset');
  const gridToggleBtn = document.getElementById('btn-grid-toggle');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => window.canvasController.zoomBy(1.2));
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => window.canvasController.zoomBy(0.8));
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', () => window.canvasController.centerView());
  }
  if (gridToggleBtn) {
    gridToggleBtn.addEventListener('click', () => {
      const active = window.canvasController.toggleGrid();
      gridToggleBtn.classList.toggle('active', active);
    });
  }
}

/**
 * Layer Management UI and Panel List rendering
 */
function setupLayerPanel() {
  const layerListContainer = document.getElementById('layers-list');
  const addLayerBtn = document.getElementById('btn-add-layer');
  const dupLayerBtn = document.getElementById('btn-duplicate-layer');
  const mergeLayerBtn = document.getElementById('btn-merge-layer');
  const deleteLayerBtn = document.getElementById('btn-delete-layer');
  const clearLayerBtn = document.getElementById('btn-clear-layer');

  const renderLayerList = () => {
    if (!layerListContainer) return;
    layerListContainer.innerHTML = '';

    const layers = window.layerManager.layers;
    const activeId = window.layerManager.activeLayerId;

    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const isActive = layer.id === activeId;

      const item = document.createElement('div');
      item.className = `layer-item ${isActive ? 'active' : ''} ${!layer.visible ? 'hidden-layer' : ''}`;
      item.dataset.id = layer.id;

      const thumbUrl = window.layerManager.getThumbnail(layer.id);

      item.innerHTML = `
        <div class="layer-item-main">
          <button class="layer-vis-btn" title="${layer.visible ? '숨기기' : '보이기'}">
            ${layer.visible ? '👁️' : '🕶️'}
          </button>
          <div class="layer-thumb-wrap">
            <img src="${thumbUrl}" class="layer-thumb" alt="미리보기">
          </div>
          <div class="layer-info">
            <input type="text" class="layer-name-input" value="${layer.name}" />
            <div class="layer-opacity-row">
              <span class="opacity-label">불투명도:</span>
              <input type="range" class="layer-opacity-slider" min="0" max="100" value="${Math.round(layer.opacity * 100)}" />
              <span class="opacity-num">${Math.round(layer.opacity * 100)}%</span>
            </div>
          </div>
          <button class="layer-lock-btn ${layer.locked ? 'locked' : ''}" title="${layer.locked ? '잠금 해제' : '잠금'}">
            ${layer.locked ? '🔒' : '🔓'}
          </button>
        </div>
        <div class="layer-item-actions">
          <button class="layer-order-btn up" title="위로 이동" ${i === layers.length - 1 ? 'disabled' : ''}>▲</button>
          <button class="layer-order-btn down" title="아래로 이동" ${i === 0 ? 'disabled' : ''}>▼</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (['BUTTON', 'INPUT'].includes(e.target.tagName)) return;
        window.layerManager.setActiveLayer(layer.id);
      });

      const visBtn = item.querySelector('.layer-vis-btn');
      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.layerManager.toggleVisibility(layer.id);
      });

      const lockBtn = item.querySelector('.layer-lock-btn');
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.layerManager.toggleLock(layer.id);
      });

      const nameInput = item.querySelector('.layer-name-input');
      nameInput.addEventListener('change', (e) => {
        layer.name = e.target.value.trim() || layer.name;
      });

      const opacitySlider = item.querySelector('.layer-opacity-slider');
      const opacityNum = item.querySelector('.opacity-num');
      opacitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        opacityNum.textContent = `${val}%`;
        window.layerManager.setOpacity(layer.id, val / 100);
      });

      const upBtn = item.querySelector('.layer-order-btn.up');
      const downBtn = item.querySelector('.layer-order-btn.down');
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.layerManager.moveLayer(layer.id, 1);
      });
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.layerManager.moveLayer(layer.id, -1);
      });

      layerListContainer.appendChild(item);
    }
  };

  window.layerManager.onLayersChange = () => {
    renderLayerList();
    window.canvasController.render();
  };

  renderLayerList();

  if (addLayerBtn) {
    addLayerBtn.addEventListener('click', () => {
      window.canvasController.saveState();
      window.layerManager.addLayer();
    });
  }

  if (dupLayerBtn) {
    dupLayerBtn.addEventListener('click', () => {
      const active = window.layerManager.getActiveLayer();
      if (active) {
        window.canvasController.saveState();
        window.layerManager.duplicateLayer(active.id);
      }
    });
  }

  if (mergeLayerBtn) {
    mergeLayerBtn.addEventListener('click', () => {
      const active = window.layerManager.getActiveLayer();
      if (active) {
        window.canvasController.saveState();
        window.layerManager.mergeDown(active.id);
      }
    });
  }

  if (deleteLayerBtn) {
    deleteLayerBtn.addEventListener('click', () => {
      const active = window.layerManager.getActiveLayer();
      if (active) {
        if (confirm(`'${active.name}' 레이어를 삭제하시겠습니까?`)) {
          window.canvasController.saveState();
          window.layerManager.removeLayer(active.id);
        }
      }
    });
  }

  if (clearLayerBtn) {
    clearLayerBtn.addEventListener('click', () => {
      const active = window.layerManager.getActiveLayer();
      if (active) {
        if (confirm(`'${active.name}' 레이어의 내용을 모두 지우시겠습니까?`)) {
          window.canvasController.saveState();
          window.layerManager.clearLayer(active.id);
        }
      }
    });
  }
}

/**
 * Top Action buttons (Undo, Redo, Clear All, Export)
 */
function setupActionButtons() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  const clearAllBtn = document.getElementById('btn-clear-all');
  const exportBtn = document.getElementById('btn-export');

  if (undoBtn) {
    undoBtn.addEventListener('click', () => window.canvasController.undo());
  }

  if (redoBtn) {
    redoBtn.addEventListener('click', () => window.canvasController.redo());
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (confirm('캔버스를 전체 초기화하시겠습니까? (새 도화지가 열립니다)')) {
        window.canvasController.saveState();
        window.layerManager.init();
        window.canvasController.render();
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const dataUrl = window.layerManager.toDataURL('image/png', 1.0, true, '#ffffff');
      const link = document.createElement('a');
      link.download = `my-drawing-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    });
  }
}

/**
 * API Key & Model Settings (OpenAI GPT & DALL-E)
 */
function setupApiKeyManagement() {
  const modal = document.getElementById('api-key-modal');
  const openBtn = document.getElementById('btn-open-api-settings');
  const closeBtn = document.getElementById('btn-close-api-modal');
  const saveBtn = document.getElementById('btn-save-api-key');
  const clearBtn = document.getElementById('btn-clear-api-key');
  const testBtn = document.getElementById('btn-test-api-key');

  const openaiInput = document.getElementById('input-openai-api-key');
  const rememberCheckbox = document.getElementById('checkbox-remember-key');
  const modelSelect = document.getElementById('select-image-model');
  const testStatus = document.getElementById('api-test-status');
  const topKeyBadge = document.getElementById('top-api-key-status');

  const updateStatusBadge = () => {
    const key = window.aiService.getApiKey();
    if (key) {
      topKeyBadge.innerHTML = `<span class="status-dot green"></span> OpenAI 키 연결됨`;
      topKeyBadge.classList.add('configured');
    } else {
      topKeyBadge.innerHTML = `<span class="status-dot orange"></span> OpenAI 키 필요`;
      topKeyBadge.classList.remove('configured');
    }
  };

  const openModal = () => {
    openaiInput.value = window.aiService.getApiKey();
    if (modelSelect) modelSelect.value = window.aiService.getImageModel();
    testStatus.textContent = '';
    testStatus.className = 'test-status';
    modal.classList.add('active');
  };

  const closeModal = () => {
    modal.classList.remove('active');
  };

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Save key
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const openaiKey = openaiInput.value.trim();
      const remember = rememberCheckbox ? rememberCheckbox.checked : true;
      const model = modelSelect ? modelSelect.value : 'gpt-4o';

      window.aiService.setApiKey(openaiKey, remember);
      window.aiService.setImageModel(model);

      updateStatusBadge();
      testStatus.textContent = '✅ OpenAI API 키가 안전하게 저장되었습니다!';
      testStatus.className = 'test-status success';

      setTimeout(() => closeModal(), 700);
    });
  }

  // Clear key
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('저장된 OpenAI API 키를 삭제하시겠습니까?')) {
        window.aiService.clearApiKey();
        openaiInput.value = '';
        updateStatusBadge();
        testStatus.textContent = 'API 키가 삭제되었습니다.';
        testStatus.className = 'test-status';
      }
    });
  }

  // Test connection
  if (testBtn) {
    testBtn.addEventListener('click', async () => {
      testStatus.textContent = '⏳ OpenAI 연결 확인 중...';
      testStatus.className = 'test-status loading';

      try {
        const key = openaiInput.value.trim();
        await window.aiService.testApiKey(key);
        testStatus.textContent = '✅ 성공! OpenAI API에 정상적으로 연결되었습니다.';
        testStatus.className = 'test-status success';
      } catch (err) {
        testStatus.textContent = `❌ ${err.message}`;
        testStatus.className = 'test-status error';
      }
    });
  }

  updateStatusBadge();

  // Initial welcome modal if no key exists
  if (!window.aiService.getApiKey()) {
    setTimeout(() => {
      openModal();
    }, 600);
  }
}
