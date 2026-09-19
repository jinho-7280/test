/**
 * OpenAI GPT & DALL-E AI Service Module
 * Supports GPT-4o (Smart Vector Art & Vision), GPT-4o-mini, and DALL-E models with automatic fallbacks.
 */

class AIService {
  constructor() {
    this.keyStorage = 'ai_drawing_studio_openai_api_key';
    this.sessionKeyStorage = 'ai_drawing_studio_session_openai_key';
    this.modelStorage = 'ai_drawing_studio_image_model';

    // Default to GPT-4o so all OpenAI accounts work out-of-the-box without DALL-E permission issues
    this.defaultImageModel = 'gpt-4o';
    this.defaultChatModel = 'gpt-4o';
  }

  getApiKey() {
    return sessionStorage.getItem(this.sessionKeyStorage) || 
           localStorage.getItem(this.keyStorage) || 
           '';
  }

  setApiKey(key, remember = true) {
    const cleanKey = (key || '').trim();
    if (remember) {
      localStorage.setItem(this.keyStorage, cleanKey);
      sessionStorage.removeItem(this.sessionKeyStorage);
    } else {
      sessionStorage.setItem(this.sessionKeyStorage, cleanKey);
      localStorage.removeItem(this.keyStorage);
    }
  }

  clearApiKey() {
    localStorage.removeItem(this.keyStorage);
    sessionStorage.removeItem(this.sessionKeyStorage);
  }

  getImageModel() {
    return localStorage.getItem(this.modelStorage) || this.defaultImageModel;
  }

  setImageModel(model) {
    localStorage.setItem(this.modelStorage, model);
  }

  /**
   * Test OpenAI API key validity
   */
  async testApiKey(key = null) {
    const apiKey = key || this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API 키를 입력해주세요.');

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI 검증 실패 (HTTP ${response.status})`);
    }
    return true;
  }

  /**
   * Generate an image:
   * Supports GPT-4o (Direct Smart Vector/Canvas Art Generation) as well as DALL-E models.
   */
  async generateImage(prompt, model = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다. 상단 설정에서 API 키를 입력해주세요.');
    }

    const selectedModel = model || this.getImageModel();

    // If DALL-E 2 or DALL-E 3 requested
    if (selectedModel.startsWith('dall-e')) {
      try {
        return await this._generateWithDalle(prompt, selectedModel, apiKey);
      } catch (err) {
        console.warn(`${selectedModel} 실패, GPT-4o 드로잉으로 자동 대체합니다:`, err);
        // Fallback to GPT-4o vector drawing if DALL-E fails/unsupported
        return await this._generateWithGptArt(prompt, 'gpt-4o', apiKey);
      }
    }

    // Default: GPT-4o / GPT-4o-mini rich artwork generator
    return this._generateWithGptArt(prompt, selectedModel, apiKey);
  }

  /**
   * Generates high-quality illustrations using GPT-4o (Outputs SVG converted to high-res PNG)
   * Works on 100% of OpenAI API keys that have GPT-4 access!
   */
  async _generateWithGptArt(prompt, model, apiKey) {
    const targetModel = model || 'gpt-4o';

    const systemPrompt = `You are a world-class digital vector artist and master illustrator.
The user wants you to create an original, visually stunning artwork for: "${prompt}".
Create a complete, beautiful, production-ready SVG drawing with:
- viewBox="0 0 1024 1024" width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"
- Rich vibrant color palettes, radial/linear gradients (<defs><linearGradient>...</defs>)
- Deep shadows, highlights, fine contours, expressive shapes, and layered elements
- Background that matches the mood
Output ONLY the raw <svg> ... </svg> code. Do not include markdown code fences, backticks, or any conversational text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please illustrate: ${prompt}` }
        ],
        max_tokens: 3500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `GPT-4o 드로잉 생성 실패 (HTTP ${response.status})`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    const svgMatch = rawContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      throw new Error('그림 데이터를 생성하지 못했습니다. 다시 시도해주세요.');
    }

    const svgString = svgMatch[0];
    const pngDataUrl = await this._svgToPngDataUrl(svgString, 1024, 1024);

    return {
      imageUrl: pngDataUrl,
      mimeType: 'image/png',
      description: prompt
    };
  }

  /**
   * Helper: DALL-E image generation
   */
  async _generateWithDalle(prompt, model, apiKey) {
    const isDalle3 = model === 'dall-e-3';
    const payload = {
      model: isDalle3 ? 'dall-e-3' : 'dall-e-2',
      prompt: prompt,
      n: 1,
      size: isDalle3 ? '1024x1024' : '1024x1024'
    };

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `DALL-E 생성 오류 (HTTP ${response.status})`);
    }

    const data = await response.json();
    const imgObj = data.data?.[0];
    let imageUrl = imgObj?.url || (imgObj?.b64_json ? `data:image/png;base64,${imgObj.b64_json}` : null);

    if (!imageUrl) {
      throw new Error('DALL-E 이미지 데이터를 수신하지 못했습니다.');
    }

    // Convert temporary remote URL to base64 DataURL
    if (imageUrl.startsWith('http')) {
      try {
        const fetchRes = await fetch(imageUrl);
        const blob = await fetchRes.blob();
        imageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.warn('Image blob conversion skipped:', e);
      }
    }

    return {
      imageUrl,
      mimeType: 'image/png',
      description: imgObj.revised_prompt || prompt
    };
  }

  /**
   * Helper: Convert SVG string to high-res PNG DataURL via canvas
   */
  async _svgToPngDataUrl(svgString, width = 1024, height = 1024) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobUrl = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(blobUrl);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(blobUrl);
        // Fallback: return as svg data url
        resolve('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString));
      };
      img.src = blobUrl;
    });
  }

  /**
   * Image-to-Image editing: GPT-4o Vision analyzes the sketch and redraws it with requested enhancements
   */
  async editImage(prompt, base64DataUri) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    const selectedModel = this.getImageModel();

    // If DALL-E model selected, try prompt refinement then DALL-E with fallback to GPT-4o
    if (selectedModel.startsWith('dall-e')) {
      try {
        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'system',
                content: 'You are an art director. Analyze the user drawing and instruction, then write a detailed prompt for DALL-E to faithfully recreate and stylize this drawing according to the user request. Output ONLY the prompt text, no intro.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Instruction: ${prompt}` },
                  { type: 'image_url', image_url: { url: base64DataUri } }
                ]
              }
            ],
            max_tokens: 350
          })
        });

        if (visionResponse.ok) {
          const visionData = await visionResponse.json();
          const refinedPrompt = visionData.choices?.[0]?.message?.content || prompt;
          return await this._generateWithDalle(refinedPrompt, selectedModel, apiKey);
        }
      } catch (err) {
        console.warn('DALL-E 수정 실패, GPT-4o 비전 리드로잉으로 전환합니다:', err);
      }
    }

    // Default & Direct: GPT-4o Vision sees the sketch, creates enhanced SVG artwork
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a master digital illustrator. 
The user provides a sketch drawing and instructions on how to modify/enhance/colorize it.
Analyze the user's sketch and requested changes ("${prompt}"), then produce a complete, stunning, high-resolution SVG artwork.
Requirements:
- viewBox="0 0 1024 1024" width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"
- Keep the core composition and character/subject from the sketch, but render it beautifully with rich colors, shading, and details according to the instruction.
- Output ONLY the raw <svg>...</svg> code with no backticks, no explanations.`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Instruction: ${prompt}` },
              { type: 'image_url', image_url: { url: base64DataUri } }
            ]
          }
        ],
        max_tokens: 3500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`그림 수정 실패: ${err.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    const svgMatch = rawContent.match(/<svg[\s\S]*?<\/svg>/i);
    if (!svgMatch) {
      throw new Error('수정된 그림을 생성하지 못했습니다. 다시 시도해주세요.');
    }

    const pngDataUrl = await this._svgToPngDataUrl(svgMatch[0], 1024, 1024);
    return {
      imageUrl: pngDataUrl,
      mimeType: 'image/png',
      description: prompt
    };
  }

  /**
   * Artistic chat / critique with GPT-4o
   */
  async chatOrCritique(userMessage, base64DataUri = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.');

    const messages = [
      {
        role: 'system',
        content: `당신은 친절하고 전문적인 디지털 아트 전문 AI 조수 '아트봇'입니다. 
사용자가 질문하거나 피드백을 요청하면, 미술적 관점(형태, 비례, 색감, 명암, 구도 등)에서 실용적이고 따뜻한 격려가 담긴 조언을 한국어로 제공하세요.`
      }
    ];

    if (base64DataUri) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: base64DataUri } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `GPT 채팅 실패 (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '답변을 생성하지 못했습니다.';
  }

  /**
   * Guess Drawing for Catchmind Game using GPT-4o Vision
   * Strictly blind guessing - AI is NOT told the target word!
   */
  async guessDrawing(base64DataUri, targetWord = null) {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('OpenAI API 키를 먼저 입력해주세요.');

    const promptText = `
당신은 '캐치마인드 / Quick, Draw!' 게임에서 스케치 그림을 보고 무엇을 그렸는지 알아맞히는 예리한 AI 참가자입니다.
첨부된 캔버스 스케치 이미지를 정밀하게 관찰하고, 그림이 무엇을 나타내는지 추측하세요.

[규칙]:
1. 그림의 형태가 구체적인 사물/동물/음식 등의 형태를 갖추지 않았거나, 단순한 선/낙서/선 몇 개에 불과하다면 억지로 끼워 맞추지 말고 '낙서', '선', '알 수 없음'으로 솔직하게 답하세요.
2. 실제로 대상의 고유 특징(예: 귀, 꼬리, 바퀴, 날개, 줄기 등)이 묘사된 경우에만 그에 해당하는 1위, 2위, 3위 단어(명사)를 추측하세요.

반드시 다음 JSON 형식으로만 응답하세요(코드 블록 마크다운 없이 순수 JSON만):
{
  "topGuesses": ["1순위 추측 단어", "2순위 추측 단어", "3순위 추측 단어"],
  "confidence": 0부터 100 사이 숫자 (1순위 추측에 대한 확신도),
  "features": "그림에서 실제로 눈으로 확인되는 시각적 요소들 (예: '뾰족한 귀와 수염', '원 2개와 꼬챙이', '불규칙한 검은 선들')",
  "comment": "그림을 보고 느낀 솔직하고 재치 있는 감상평 (한국어 한 문장)"
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              { type: 'image_url', image_url: { url: base64DataUri } }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `GPT 그림 판정 실패 (HTTP ${response.status})`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;
    return this._parseBlindGuessResult(rawText, targetWord);
  }

  /**
   * Helper: Parse AI blind guess and match against targetWord fairly
   */
  _parseBlindGuessResult(rawText, targetWord = null) {
    let parsed = {
      topGuesses: ['알 수 없음'],
      confidence: 30,
      features: '',
      comment: '그림의 형태를 살펴보고 있습니다.'
    };

    try {
      const jsonMatch = (rawText || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const obj = JSON.parse(jsonMatch[0]);
        if (Array.isArray(obj.topGuesses) && obj.topGuesses.length > 0) {
          parsed.topGuesses = obj.topGuesses.map(g => String(g).trim()).filter(Boolean);
        }
        parsed.confidence = Math.max(0, Math.min(100, parseInt(obj.confidence || 50, 10)));
        parsed.features = obj.features || '';
        parsed.comment = obj.comment || '';
      }
    } catch (e) {
      console.warn('JSON parse error:', e, rawText);
    }

    // Free Quiz Mode
    if (!targetWord) {
      return {
        isCorrect: false,
        similarity: parsed.confidence,
        topGuesses: parsed.topGuesses,
        comment: parsed.comment || `제가 보기엔 '${parsed.topGuesses[0]}' 같아요!`,
        features: parsed.features
      };
    }

    // Target Word Match Evaluation
    const normalize = (str) => (str || '').replace(/[\s\-_,.]/g, '').toLowerCase();
    const normTarget = normalize(targetWord);

    let matchRank = -1;
    for (let i = 0; i < parsed.topGuesses.length; i++) {
      const normGuess = normalize(parsed.topGuesses[i]);
      if (normGuess === normTarget || normGuess.includes(normTarget) || normTarget.includes(normGuess)) {
        matchRank = i;
        break;
      }
    }

    if (matchRank === 0) {
      const similarity = Math.max(80, Math.min(100, parsed.confidence));
      return {
        isCorrect: true,
        similarity,
        topGuesses: parsed.topGuesses,
        comment: `🎉 와! 정확히 '${targetWord}' 맞죠? ${parsed.features ? `[${parsed.features}]을(를) 보고 단번에 알아챘어요!` : '특징을 아주 잘 그리셨네요!'}`,
        features: parsed.features
      };
    } else if (matchRank > 0) {
      const similarity = Math.max(70, Math.min(85, parsed.confidence - 10));
      return {
        isCorrect: true,
        similarity,
        topGuesses: parsed.topGuesses,
        comment: `👏 오! 처음엔 '${parsed.topGuesses[0]}'인 줄 알았는데, 다시 보니 '${targetWord}' 맞네요! 정답 인정!`,
        features: parsed.features
      };
    } else {
      const topGuess = parsed.topGuesses[0] || '알 수 없는 형체';
      const isScribble = /낙서|선|알 수 없음|모름|도형/i.test(topGuess);
      const similarity = isScribble 
        ? Math.min(20, Math.max(5, Math.round(parsed.confidence * 0.3))) 
        : Math.min(45, Math.max(10, Math.round(100 - parsed.confidence * 0.7)));

      return {
        isCorrect: false,
        similarity,
        topGuesses: parsed.topGuesses,
        comment: isScribble 
          ? `🤔 음... 아직은 무엇인지 형태를 알아보기 어려워요 (${parsed.features || '단순한 선/낙서'}). '${targetWord}'의 구체적인 특징을 더 그려보세요!`
          : `🤔 으음... 제가 보기엔 '${topGuess}' (또는 '${parsed.topGuesses[1] || ''}') 같아요! 제시어 '${targetWord}'의 특징을 더 추가해보세요!`,
        features: parsed.features
      };
    }
  }
}

// Global Singleton
window.aiService = new AIService();
window.geminiService = window.aiService;
