/**
 * AI Catchmind Game Controller (그림 맞추기 미니게임)
 * Real-time vision-based drawing recognition and guessing game.
 */

class GameController {
  constructor() {
    this.container = null;
    this.mode = 'catchmind'; // 'catchmind' (제시어 맞추기) | 'free' (자유 퀴즈)
    this.score = 0;
    this.round = 1;
    this.streak = 0;
    this.currentWord = null;
    this.currentCategory = null;
    this.isGuessing = false;

    // Rich Word Library
    this.wordDatabase = [
      // 동물
      { word: '고양이', category: '동물', hint: '뾰족한 귀와 수염, 긴 꼬리를 그려보세요!' },
      { word: '강아지', category: '동물', hint: '쳐진 귀나 펄럭이는 꼬리, 둥근 코가 특징이에요!' },
      { word: '토끼', category: '동물', hint: '길쭉한 귀 두 개와 둥근 꼬리를 그려보세요!' },
      { word: '사자', category: '동물', hint: '멋진 갈기와 용맹한 얼굴을 표현해보세요!' },
      { word: '코끼리', category: '동물', hint: '긴 코와 큰 부채꼴 귀가 포인트예요!' },
      { word: '기린', category: '동물', hint: '아주 긴 목과 몸의 얼룩무늬를 그려보세요!' },
      { word: '펭귄', category: '동물', hint: '통통한 몸과 작은 날개, 부리를 그려보세요!' },
      { word: '판다', category: '동물', hint: '눈 주위 검은 무늬와 귀가 특징이에요!' },
      { word: '돌고래', category: '동물', hint: '매끄러운 유선형 몸과 등지느러미를 표현해보세요!' },
      { word: '나비', category: '동물', hint: '화려한 양쪽 날개와 더듬이를 그려보세요!' },
      { word: '거북이', category: '동물', hint: '단단한 등껍질과 짧은 다리가 포인트예요!' },

      // 사물
      { word: '비행기', category: '사물', hint: '양쪽 긴 날개와 꼬리날개, 창문을 그려보세요!' },
      { word: '자동차', category: '사물', hint: '바퀴 두 개와 차체, 헤드라이트를 표현해보세요!' },
      { word: '자전거', category: '사물', hint: '두 개의 바퀴와 핸들, 안장, 체인을 그려보세요!' },
      { word: '우산', category: '사물', hint: '둥근 곡선 우산살과 손잡이 갈고리를 그려보세요!' },
      { word: '시계', category: '사물', hint: '원형 숫자판과 시침, 분침을 그려보세요!' },
      { word: '안경', category: '사물', hint: '두 개의 렌즈와 안경다리를 표현해보세요!' },
      { word: '피아노', category: '사물', hint: '흑백 건반이 나란히 늘어선 모습을 그려보세요!' },
      { word: '스마트폰', category: '사물', hint: '직사각형 디스플레이와 카메라 렌즈를 그려보세요!' },
      { word: '가위', category: '사물', hint: 'X자로 교차하는 두 날과 손잡이 구멍을 그려보세요!' },

      // 음식
      { word: '사과', category: '음식', hint: '빨간 둥근 열매 위에 작은 꼭지와 잎사귀를 달아보세요!' },
      { word: '바나나', category: '음식', hint: '노랗고 길쭉하게 휘어진 곡선을 그려보세요!' },
      { word: '피자', category: '음식', hint: '부채꼴 조각 위에 페퍼로니와 치즈를 얹어보세요!' },
      { word: '햄버거', category: '음식', hint: '빵 사이에 패티, 양상추, 치즈를 층층이 그려보세요!' },
      { word: '아이스크림', category: '음식', hint: '콘 위에 올려진 둥근 스쿱을 표현해보세요!' },
      { word: '생일 케이크', category: '음식', hint: '원통형 케이크 위에 촛불을 꽂아보세요!' },
      { word: '수박', category: '음식', hint: '초록 바탕에 검은 줄무늬, 또는 빨간 속살과 씨앗!' },

      // 자연 & 랜드마크
      { word: '해바라기', category: '자연', hint: '가운데 큰 갈색 씨앗 원과 주변을 둘러싼 노란 꽃잎!' },
      { word: '눈사람', category: '자연', hint: '둥근 눈덩이 두 개를 쌓고 당근 코와 모자를 씌워보세요!' },
      { word: '에펠탑', category: '랜드마크', hint: '하늘로 솟은 격자 철골 구조 탑을 그려보세요!' },
      { word: '무지개', category: '자연', hint: '하늘에 뜬 알록달록한 여러 겹의 활 모양 곡선!' },
      { word: '화산', category: '자연', hint: '산 꼭대기 분화구에서 연기와 용암이 뿜어져 나오는 모습!' }
    ];
  }

  init() {
    this.container = document.getElementById('game-panel');
    if (!this.container) return;

    this._bindEvents();
    this.newRound();
  }

  _bindEvents() {
    // Mode Switch buttons
    const btnModeCatchmind = document.getElementById('btn-game-mode-catchmind');
    const btnModeFree = document.getElementById('btn-game-mode-free');

    if (btnModeCatchmind) {
      btnModeCatchmind.addEventListener('click', () => this.setMode('catchmind'));
    }
    if (btnModeFree) {
      btnModeFree.addEventListener('click', () => this.setMode('free'));
    }

    // Action buttons
    const btnGuess = document.getElementById('btn-game-guess');
    const btnSkip = document.getElementById('btn-game-skip');
    const btnClearCanvas = document.getElementById('btn-game-clear');

    if (btnGuess) {
      btnGuess.addEventListener('click', () => this.handleGuess());
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        this.streak = 0;
        this._updateStats();
        this.newRound();
      });
    }

    if (btnClearCanvas) {
      btnClearCanvas.addEventListener('click', () => {
        window.canvasController.saveState();
        window.layerManager.clearLayer();
        window.canvasController.render();
      });
    }
  }

  setMode(mode) {
    this.mode = mode;
    const btnCatchmind = document.getElementById('btn-game-mode-catchmind');
    const btnFree = document.getElementById('btn-game-mode-free');
    const targetWordBox = document.getElementById('game-target-word-box');
    const guessBtnText = document.getElementById('game-guess-btn-text');

    if (mode === 'catchmind') {
      if (btnCatchmind) btnCatchmind.classList.add('active');
      if (btnFree) btnFree.classList.remove('active');
      if (targetWordBox) targetWordBox.style.display = 'block';
      if (guessBtnText) guessBtnText.textContent = '🔍 AI에게 맞혀보라고 하기!';
      this.newRound();
    } else {
      if (btnCatchmind) btnCatchmind.classList.remove('active');
      if (btnFree) btnFree.classList.add('active');
      if (targetWordBox) targetWordBox.style.display = 'none';
      if (guessBtnText) guessBtnText.textContent = '🔮 AI야, 내가 뭘 그렸게? 맞혀봐!';
      this._resetResultBox('자유 그리기 모드입니다. 캔버스에 원하는 그림을 자유롭게 그리고 아래 맞추기 버튼을 눌러보세요!');
    }
  }

  newRound() {
    // Pick random word
    const item = this.wordDatabase[Math.floor(Math.random() * this.wordDatabase.length)];
    this.currentWord = item.word;
    this.currentCategory = item.category;

    const wordEl = document.getElementById('game-target-word');
    const catEl = document.getElementById('game-target-category');
    const hintEl = document.getElementById('game-target-hint');

    if (wordEl) wordEl.textContent = this.currentWord;
    if (catEl) catEl.textContent = this.currentCategory;
    if (hintEl) hintEl.textContent = `💡 힌트: ${item.hint}`;

    this._resetResultBox('캔버스에 위 제시어를 그리고 [AI에게 맞혀보라고 하기]를 눌러보세요!');
  }

  /**
   * Submit drawing to AI Vision for evaluation
   */
  async handleGuess() {
    if (this.isGuessing) return;

    // Check API Key
    const apiKey = window.aiService.getApiKey();
    if (!apiKey) {
      alert('게임을 진행하려면 상단 설정에서 OpenAI API 키(sk-...)를 등록해주세요.');
      document.getElementById('api-key-modal')?.classList.add('active');
      return;
    }

    // Capture current composite canvas
    const canvasDataUrl = window.layerManager.toDataURL('image/png', 0.9, true, '#ffffff');

    this.isGuessing = true;
    this._setLoading(true);

    try {
      const targetWord = this.mode === 'catchmind' ? this.currentWord : null;
      const result = await window.aiService.guessDrawing(canvasDataUrl, targetWord);
      this._renderResult(result);
    } catch (err) {
      this._renderError(err.message);
    } finally {
      this.isGuessing = false;
      this._setLoading(false);
    }
  }

  _renderResult(result) {
    const resultBox = document.getElementById('game-result-container');
    if (!resultBox) return;

    const isCatchmind = this.mode === 'catchmind';

    if (isCatchmind) {
      if (result.isCorrect || result.similarity >= 70) {
        // Correct!
        this.score += 100 + (this.streak * 20);
        this.streak += 1;
        this.round += 1;
        this._updateStats();
        this._triggerCelebration();

        resultBox.innerHTML = `
          <div class="game-result-card correct">
            <div class="result-badge success">🎉 정답입니다! (${result.similarity}%)</div>
            <div class="result-comment">"${this._escape(result.comment)}"</div>
            ${result.features ? `<div class="result-features">👁️ <b>포착된 특징:</b> ${this._escape(result.features)}</div>` : ''}
            <div class="result-actions">
              <button class="btn-game-next" onclick="window.gameController.newRound()">다음 제시어 도전 ➔</button>
            </div>
          </div>
        `;
      } else {
        // Incorrect / Not yet
        this.streak = 0;
        const guessesList = (result.topGuesses || []).slice(0, 3).join(', ');

        resultBox.innerHTML = `
          <div class="game-result-card wrong">
            <div class="result-badge warning">🤔 정답이 아닙니다 (${result.similarity}%)</div>
            <div class="result-guess-text">AI가 유추한 후보: <b>${this._escape(guessesList)}</b></div>
            <div class="result-comment">"${this._escape(result.comment)}"</div>
            ${result.features ? `<div class="result-features">🔍 <b>AI 눈에 포착된 형태:</b> ${this._escape(result.features)}</div>` : ''}
            <div class="result-hint">💡 힌트를 참고해서 <b>'${this.currentWord}'</b>의 핵심 특징을 더 뚜렷하게 그려보세요!</div>
          </div>
        `;
      }
    } else {
      // Free Quiz Mode Result
      const guessesHtml = (result.topGuesses || []).map((guess, idx) => `
        <div class="guess-rank-item">
          <span class="rank-num">${idx + 1}위</span>
          <span class="rank-word">${this._escape(guess)}</span>
        </div>
      `).join('');

      resultBox.innerHTML = `
        <div class="game-result-card free-result">
          <div class="result-badge info">🔮 AI의 예측 결과</div>
          <div class="guesses-list">${guessesHtml}</div>
          <div class="result-comment">"${this._escape(result.comment)}"</div>
          ${result.features ? `<div class="result-features">🎨 <b>관찰된 특징:</b> ${this._escape(result.features)}</div>` : ''}
        </div>
      `;
    }
  }

  _renderError(errMsg) {
    const resultBox = document.getElementById('game-result-container');
    if (!resultBox) return;

    resultBox.innerHTML = `
      <div class="game-result-card error">
        <div class="result-badge error">⚠️ 판정 오류</div>
        <div class="result-comment">${this._escape(errMsg)}</div>
      </div>
    `;
  }

  _resetResultBox(text) {
    const resultBox = document.getElementById('game-result-container');
    if (resultBox) {
      resultBox.innerHTML = `
        <div class="game-result-placeholder">
          <span>${text}</span>
        </div>
      `;
    }
  }

  _setLoading(isLoading) {
    const btn = document.getElementById('btn-game-guess');
    const textEl = document.getElementById('game-guess-btn-text');
    if (!btn || !textEl) return;

    if (isLoading) {
      btn.disabled = true;
      textEl.innerHTML = '<span class="loading-spin">⏳</span> AI가 그림을 자세히 분석하는 중...';
    } else {
      btn.disabled = false;
      textEl.textContent = this.mode === 'catchmind' ? '🔍 AI에게 맞혀보라고 하기!' : '🔮 AI야, 내가 뭘 그렸게? 맞혀봐!';
    }
  }

  _updateStats() {
    const scoreEl = document.getElementById('game-stat-score');
    const roundEl = document.getElementById('game-stat-round');
    const streakEl = document.getElementById('game-stat-streak');

    if (scoreEl) scoreEl.textContent = `${this.score}점`;
    if (roundEl) roundEl.textContent = `${this.round}R`;
    if (streakEl) streakEl.textContent = `${this.streak}연속`;
  }

  _triggerCelebration() {
    // Quick burst confetti or sound effect celebration
    const badge = document.querySelector('.result-badge.success');
    if (badge) {
      badge.classList.add('pop-anim');
    }
  }

  _escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

window.gameController = new GameController();
