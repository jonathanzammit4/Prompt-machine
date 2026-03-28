/* ============================================
   PromptCraft — JavaScript Logic
   promptm-script.js
   ============================================ */

let selectedTone = 'balanced';
let lastImproved = '';

const input = document.getElementById('prompt-input');
const charCount = document.getElementById('char-count');

/* ── CHARACTER COUNTER ── */
input.addEventListener('input', () => {
  const n = input.value.length;
  charCount.textContent = n + ' character' + (n !== 1 ? 's' : '');
});

/* ── EXAMPLE CHIPS ── */
function setExample(text) {
  input.value = text;
  charCount.textContent = text.length + ' characters';
  input.focus();
}

/* ── TONE SELECTOR ── */
function setTone(btn) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedTone = btn.dataset.tone;
}

/* ── SCORE HELPERS ── */
function getVerdict(score) {
  if (score >= 85) return 'Excellent — highly structured and specific';
  if (score >= 70) return 'Good — clear improvements applied';
  if (score >= 50) return 'Fair — several key elements added';
  return 'Weak start — significant improvement made';
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--green)';
  if (score >= 60) return 'var(--amber)';
  return 'var(--accent)';
}

/* ── RENDER SUGGESTIONS ── */
function renderSuggestions(suggestions) {
  const list = document.getElementById('suggestion-list');

  if (!suggestions || suggestions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">✓</div>Prompt looks great already!</div>';
    return;
  }

  list.innerHTML = suggestions.map((s, i) => `
    <div class="suggestion-item ${(s.category || 'clarity').toLowerCase()}" style="animation-delay:${i * 0.07}s">
      <div class="suggestion-tag">${s.category || 'Tip'}</div>
      <div class="suggestion-before">❌ ${s.before || 'Original issue'}</div>
      <div class="suggestion-after">✅ ${s.after || s.fix || 'Improvement applied'}</div>
      ${s.explanation ? `<div class="suggestion-text">${s.explanation}</div>` : ''}
    </div>
  `).join('');
}

/* ── MAIN ANALYZE FUNCTION ── */
async function analyzePrompt() {
  const promptText = input.value.trim();
  if (!promptText) {
    showError('Please enter a prompt first.');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const btnText = document.getElementById('btn-text');
  const outputCard = document.getElementById('output-card');
  const errorMsg = document.getElementById('error-msg');
  const loadingBar = document.getElementById('loading-bar');

  // Reset UI state
  errorMsg.classList.remove('visible');
  btn.disabled = true;
  btnText.textContent = 'Analyzing…';
  outputCard.classList.remove('visible');
  loadingBar.style.display = 'block';

  // Build tone instruction for the system prompt
  const toneInstruction = {
    'balanced':          'clear and well-structured',
    'technical':         'technical and precise, using domain terminology',
    'beginner-friendly': 'simple and approachable for complete beginners',
    'creative':          'imaginative and open-ended, encouraging creative output',
    'academic':          'formal and academically rigorous',
  }[selectedTone] || 'clear and well-structured';

  const systemPrompt = `You are an expert AI prompt engineer. Your job is to take a rough, vague, or weak prompt and transform it into a highly structured, specific, and powerful prompt.

Always respond with ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "improved_prompt": "The full improved prompt text here",
  "score": 82,
  "suggestions": [
    {
      "category": "Specificity",
      "before": "Too vague — no target audience",
      "after": "Added 'for a beginner' to set the right level",
      "explanation": "Specifying the audience helps the AI calibrate complexity and vocabulary."
    },
    {
      "category": "Structure",
      "before": "No output format defined",
      "after": "Added clear sections: definition, types, examples",
      "explanation": "Asking for structured sections produces more organized, scannable answers."
    }
  ]
}

Rules:
- The score (0-100) represents the ORIGINAL prompt's quality BEFORE improvement (so weak prompts score 20-40, decent ones 50-70)
- Always add a role ("You are a...") at the start of the improved prompt
- Make the improved prompt ${toneInstruction}
- Provide 3-4 specific suggestions showing exactly what was wrong and what was fixed
- Valid categories: Clarity, Specificity, Structure, Context, Depth, Tone
- Return ONLY the JSON object. No preamble, no code blocks, no explanation.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Improve this prompt: "${promptText}"` }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API request failed');
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || '';

    // Parse JSON — strip any accidental markdown fences
    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (e) {
      throw new Error('Could not parse AI response. Please try again.');
    }

    // Render improved prompt
    lastImproved = parsed.improved_prompt || '';
    document.getElementById('improved-prompt-text').textContent = lastImproved;
    outputCard.classList.add('visible');

    // Update score UI
    const score = Math.min(100, Math.max(0, Math.round(parsed.score || 50)));
    const scoreEl      = document.getElementById('score-number');
    const scoreMax     = document.getElementById('score-max');
    const scoreBar     = document.getElementById('score-bar');
    const scoreVerdict = document.getElementById('score-verdict');
    const scoreBadge   = document.getElementById('output-score-badge');

    scoreEl.textContent = score;
    scoreEl.style.color = getScoreColor(score);
    scoreMax.textContent = '/ 100';
    scoreVerdict.textContent = getVerdict(score);
    scoreBadge.textContent = `Score: ${score}/100`;

    // Animate the score bar (slight delay for visual effect)
    setTimeout(() => { scoreBar.style.width = score + '%'; }, 100);

    // Render suggestion cards
    renderSuggestions(parsed.suggestions);

  } catch (err) {
    showError('Error: ' + err.message);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Improve My Prompt';
    loadingBar.style.display = 'none';
  }
}

/* ── ERROR DISPLAY ── */
function showError(msg) {
  const errorMsg = document.getElementById('error-msg');
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
}

/* ── COPY BUTTON ── */
function copyImproved() {
  if (!lastImproved) return;
  navigator.clipboard.writeText(lastImproved).then(() => {
    const btn = event.target;
    btn.textContent = 'Copied! ✓';
    setTimeout(() => { btn.textContent = 'Copy prompt'; }, 1800);
  });
}

/* ── USE AS INPUT (feed improved prompt back) ── */
function useImproved() {
  if (!lastImproved) return;
  input.value = lastImproved;
  charCount.textContent = lastImproved.length + ' characters';
  document.getElementById('output-card').classList.remove('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── CLEAR ALL ── */
function clearAll() {
  input.value = '';
  charCount.textContent = '0 characters';
  document.getElementById('output-card').classList.remove('visible');
  document.getElementById('score-number').textContent = '—';
  document.getElementById('score-max').textContent = '';
  document.getElementById('score-bar').style.width = '0%';
  document.getElementById('score-verdict').textContent = 'Analyze a prompt to see your score';
  document.getElementById('output-score-badge').textContent = '';
  document.getElementById('suggestion-list').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">💡</div>
      Suggestions will appear here after analysis
    </div>`;
  document.getElementById('error-msg').classList.remove('visible');
  lastImproved = '';
}

/* ── KEYBOARD SHORTCUT: Ctrl/Cmd + Enter to analyze ── */
input.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyzePrompt();
});
