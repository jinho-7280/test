/**
 * AI Chatbot Controller (Bottom-right floating widget)
 * Bridges user conversational requests with Gemini image generation/editing & canvas layers.
 */

class ChatbotController {
  constructor() {
    this.widget = null;
    this.chatBody = null;
    this.inputField = null;
    this.sendBtn = null;
    this.floatingBtn = null;
    this.includeCanvasToggle = null;
    this.canvasThumbPreview = null;
    this.currentMode = 'chat'; // 'new-image', 'edit-image', 'critique', 'chat'

    this.messages = [];
  }

  init() {
    this.widget = document.getElementById('ai-chatbot-widget');
    this.chatBody = document.getElementById('chatbot-messages');
    this.inputField = document.getElementById('chatbot-input');
    this.sendBtn = document.getElementById('chatbot-send-btn');
    this.floatingBtn = document.getElementById('chatbot-floating-toggle');
    this.includeCanvasToggle = document.getElementById('chatbot-include-canvas');
    this.canvasThumbPreview = document.getElementById('chatbot-canvas-thumb');

    this._bindEvents();
    this._addWelcomeMessage();
  }

  _bindEvents() {
    // Toggle floating widget
    if (this.floatingBtn) {
      this.floatingBtn.addEventListener('click', () => {
        this.toggleWidget();
      });
    }

    const closeBtn = document.getElementById('chatbot-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closeWidget();
      });
    }

    // Send button & Enter key
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.handleSendMessage());
    }

    if (this.inputField) {
      this.inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }

    // Quick action chips
    const chipNewImage = document.getElementById('chip-new-image');
    const chipEditImage = document.getElementById('chip-edit-image');
    const chipCritique = document.getElementById('chip-critique');

    if (chipNewImage) {
      chipNewImage.addEventListener('click', () => {
        this.setMode('new-image', '새 그림을 그리고 싶어: ');
      });
    }

    if (chipEditImage) {
      chipEditImage.addEventListener('click', () => {
        this.setMode('edit-image', '현재 그린 그림을 수채화 일러스트 느낌으로 수정해줘');
      });
    }

    if (chipCritique) {
      chipCritique.addEventListener('click', () => {
        this.setMode('critique', '현재 그림의 색감과 구도에 대해 피드백해줘');
      });
    }

    // Canvas attachment toggle
    if (this.includeCanvasToggle) {
      this.includeCanvasToggle.addEventListener('change', () => {
        this._updateCanvasThumb();
      });
    }
  }

  toggleWidget() {
    if (this.widget.classList.contains('active')) {
      this.closeWidget();
    } else {
      this.openWidget();
    }
  }

  openWidget() {
    this.widget.classList.add('active');
    this.floatingBtn.classList.add('hidden');
    this._updateCanvasThumb();
    this.inputField.focus();
  }

  closeWidget() {
    this.widget.classList.remove('active');
    this.floatingBtn.classList.remove('hidden');
  }

  setMode(mode, placeholderText = '') {
    this.currentMode = mode;
    if (placeholderText && this.inputField) {
      this.inputField.value = placeholderText;
      this.inputField.focus();
    }

    if (mode === 'edit-image' || mode === 'critique') {
      if (this.includeCanvasToggle) {
        this.includeCanvasToggle.checked = true;
        this._updateCanvasThumb();
      }
    }
  }

  _updateCanvasThumb() {
    if (!this.canvasThumbPreview || !this.includeCanvasToggle) return;

    if (this.includeCanvasToggle.checked) {
      const dataUrl = window.layerManager.toDataURL('image/png', 0.8, true, '#ffffff');
      this.canvasThumbPreview.src = dataUrl;
      this.canvasThumbPreview.style.display = 'block';
    } else {
      this.canvasThumbPreview.style.display = 'none';
    }
  }

  _addWelcomeMessage() {
    this.addSystemMessage(`👋 안녕하세요! **OpenAI GPT-4o & DALL-E 3 기반 AI 아트 조수**입니다.<br>
그림을 그리다가 필요한 것을 자유롭게 요청하세요.
- <b>✨ 새 그림 그리기</b>: DALL-E 3 고화질 이미지 생성
- <b>🎨 현재 그림 수정</b>: 그린 스케치를 바탕으로 화풍 변환 및 재창작
- <b>💡 그림 피드백</b>: GPT-4o Vision의 미술적 조언
- <b>🎮 상단 탭에서 'AI 그림 맞추기(캐치마인드)' 게임</b>도 즐겨보세요!
<br><small style="color: #94a3b8;">※ OpenAI API 키(sk-...)가 상단 설정에 등록되어 있어야 합니다.</small>`);
  }

  /**
   * Main send message handler
   */
  async handleSendMessage() {
    const text = (this.inputField.value || '').trim();
    if (!text) return;

    // Check API key first
    const apiKey = window.geminiService.getApiKey();
    if (!apiKey) {
      this.addSystemMessage(`⚠️ <b>API 키가 필요합니다.</b><br>
우측 상단 <b>[OpenAI API 설정]</b> 버튼을 누르거나 <button class="btn-text-action" onclick="document.getElementById('api-key-modal').classList.add('active')">여기</button>를 클릭하여 OpenAI API 키(sk-...)를 먼저 입력해주세요.`);
      return;
    }

    const includeCanvas = this.includeCanvasToggle ? this.includeCanvasToggle.checked : false;
    let canvasDataUrl = null;
    if (includeCanvas) {
      canvasDataUrl = window.layerManager.toDataURL('image/png', 0.95, true, '#ffffff');
    }

    // Add user message to UI
    this.addUserMessage(text, canvasDataUrl);
    this.inputField.value = '';

    // Determine intent:
    // 1) Explicit or implied edit request (if canvas attached and prompt implies modification)
    // 2) Explicit image generation (starts with "새 그림", "그려줘", "생성", "make image", etc.)
    // 3) General critique or text question
    const isEditIntent = includeCanvas && (
      this.currentMode === 'edit-image' ||
      /수정|변형|바꿔|채색|색칠|바탕|배경|스타일|화풍|enhance|edit|redraw|transform/i.test(text)
    );

    const isGenerateIntent = !isEditIntent && (
      this.currentMode === 'new-image' ||
      /그려|생성|그림|만들어|일러스트|draw|generate|paint/i.test(text)
    );

    // Show typing / loading indicator
    const loadingId = this.addLoadingMessage(isEditIntent ? '🎨 현재 그림을 AI가 수정 중입니다...' : (isGenerateIntent ? '✨ 새로운 그림을 생성 중입니다...' : '💭 답변을 생각하고 있습니다...'));

    try {
      if (isEditIntent) {
        const result = await window.geminiService.editImage(text, canvasDataUrl);
        this.removeLoadingMessage(loadingId);
        this.addAiImageMessage(result.imageUrl, result.description || '요청하신 대로 그림을 수정했습니다!', true);
      } else if (isGenerateIntent) {
        const result = await window.geminiService.generateImage(text);
        this.removeLoadingMessage(loadingId);
        this.addAiImageMessage(result.imageUrl, result.description || '새로운 그림을 생성했습니다!', false);
      } else {
        // Chat or Critique
        const responseText = await window.geminiService.chatOrCritique(text, canvasDataUrl);
        this.removeLoadingMessage(loadingId);
        this.addAiTextMessage(responseText);
      }
    } catch (err) {
      this.removeLoadingMessage(loadingId);
      this.addSystemMessage(`❌ <b>오류 발생:</b> ${this._escapeHtml(err.message)}<br><small>API 키 유효성 또는 사용 모델 설정을 확인해주세요.</small>`);
    } finally {
      // Reset mode back to general chat
      this.currentMode = 'chat';
    }
  }

  addUserMessage(text, attachedImage = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble user-bubble';

    let contentHtml = `<div class="bubble-text">${this._escapeHtml(text)}</div>`;
    if (attachedImage) {
      contentHtml = `<div class="attached-img-wrapper"><img src="${attachedImage}" alt="첨부된 캔버스"><span>캔버스 첨부됨</span></div>` + contentHtml;
    }

    msgDiv.innerHTML = contentHtml;
    this.chatBody.appendChild(msgDiv);
    this._scrollToBottom();
  }

  addAiTextMessage(markdownText) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble ai-bubble';
    
    // Parse basic markdown (bold, lists, code)
    const formatted = this._formatMarkdown(markdownText);
    msgDiv.innerHTML = `<div class="bubble-sender">AI 아트 조수</div><div class="bubble-text">${formatted}</div>`;
    this.chatBody.appendChild(msgDiv);
    this._scrollToBottom();
  }

  addAiImageMessage(imageUrl, description, isEdited = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble ai-bubble ai-image-result';

    const cardId = 'img_res_' + Date.now();

    msgDiv.innerHTML = `
      <div class="bubble-sender">AI 아트 조수 ${isEdited ? '(그림 수정 완료)' : '(새 그림 생성)'}</div>
      <div class="bubble-text">${this._formatMarkdown(description)}</div>
      <div class="generated-image-card">
        <img src="${imageUrl}" id="${cardId}" alt="AI 생성 이미지" class="result-img" />
        <div class="card-actions">
          <button class="btn-card-action primary" onclick="window.chatbotController.applyToCanvas('${cardId}', 'new-layer')">
            ➕ 새 레이어로 추가
          </button>
          <button class="btn-card-action" onclick="window.chatbotController.applyToCanvas('${cardId}', 'replace')">
            🔄 현재 레이어 덮어쓰기
          </button>
          <a class="btn-card-action download" href="${imageUrl}" download="ai-drawing-${Date.now()}.png">
            💾 저장
          </a>
        </div>
      </div>
    `;

    this.chatBody.appendChild(msgDiv);
    this._scrollToBottom();
  }

  addSystemMessage(htmlContent) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble system-bubble';
    msgDiv.innerHTML = `<div class="bubble-text">${htmlContent}</div>`;
    this.chatBody.appendChild(msgDiv);
    this._scrollToBottom();
  }

  addLoadingMessage(text) {
    const id = 'loading_' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = 'chat-bubble ai-bubble loading-bubble';
    msgDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">${this._escapeHtml(text)}</div>
    `;
    this.chatBody.appendChild(msgDiv);
    this._scrollToBottom();
    return id;
  }

  removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  /**
   * Apply generated image directly to canvas
   * @param {string} imgElementId 
   * @param {'new-layer'|'replace'} mode 
   */
  applyToCanvas(imgElementId, mode = 'new-layer') {
    const img = document.getElementById(imgElementId);
    if (!img) return;

    window.canvasController.saveState();

    if (mode === 'new-layer') {
      const layer = window.layerManager.addLayer('AI 이미지 레이어', true, img);
      window.canvasController.render();
      this.addSystemMessage(`✅ AI 이미지가 <b>'${layer.name}'</b>로 캔버스에 추가되었습니다!`);
    } else if (mode === 'replace') {
      const activeLayer = window.layerManager.getActiveLayer();
      if (activeLayer) {
        activeLayer.ctx.clearRect(0, 0, window.layerManager.width, window.layerManager.height);
        activeLayer.ctx.drawImage(img, 0, 0, window.layerManager.width, window.layerManager.height);
        window.canvasController.render();
        this.addSystemMessage(`✅ AI 이미지가 현재 활성 레이어 <b>'${activeLayer.name}'</b>에 반영되었습니다!`);
      }
    }
  }

  _scrollToBottom() {
    if (this.chatBody) {
      this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }
  }

  _escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _formatMarkdown(text) {
    if (!text) return '';
    let formatted = this._escapeHtml(text);
    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }
}

window.chatbotController = new ChatbotController();
