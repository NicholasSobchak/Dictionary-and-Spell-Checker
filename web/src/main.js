import './style.css';

const input = document.getElementById('word');
const result = document.getElementById('result');
const spinner = document.getElementById('spinner');
const statusText = document.getElementById('statusText');
const alternativeSearches = document.getElementById('alternativeSearches');
const button = document.getElementById('go');
const promptButton = document.getElementById('promptGo');
const historyToggle = document.getElementById('historyToggle');
const suggestToggle = document.getElementById('suggestToggle');
const suggestedBox = document.getElementById('suggestedBox');
const suggestedList = document.getElementById('suggestedList');
const mainResultBox = document.getElementById('resultBox');
const SUGGESTED_LIMIT = 1000;
const HISTORY_KEY = 'quickquill-history';
const HISTORY_LIMIT = 1000;
const SUGGESTED_KEY = 'quickquill-suggested-words';
let spinnerTimer = null;
let drawerSuggestedWords = loadSuggestedWords();
let liveSuggestedWords = [];

const DISPLAY_WORD_DISALLOWED_RE = /[^A-Za-z0-9'’ -]+/g;
const MULTISPACE_RE = /\s+/g;
const SEARCH_INPUT_DISALLOWED_RE = /[^A-Za-z0-9'\- .]+/g;
const SEARCH_INPUT_ALLOWED_RE = /^[A-Za-z0-9'\- .]+$/;

// Ghost autofill
const ghostTyped = document.getElementById('ghostTyped');
const ghostSuffix = document.getElementById('ghostSuffix');
const ghostHint = document.getElementById('ghostHint');
let ghostCompletion = '';
let ghostController = null;

function loadHistory() {
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveHistory(words) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(words.slice(0, HISTORY_LIMIT)));
}

function loadSuggestedWords() {
  const stored = localStorage.getItem(SUGGESTED_KEY);
  return stored ? JSON.parse(stored) : [];
}

function saveSuggestedWords(words) {
  localStorage.setItem(SUGGESTED_KEY, JSON.stringify(words.slice(0, SUGGESTED_LIMIT)));
}

function addSearchedSuggestion() {
  // Don't add the actively searched word into the suggested-words drawer.
  // Keep function for compatibility but no-op to ensure the current query isn't suggested.
  return;
}

function mergeDrawerSuggestedWords(words) {
  if (!Array.isArray(words) || !words.length) return;

  const merged = [
    ...words.map((word) => displayWord(word)).filter(Boolean),
    ...drawerSuggestedWords,
  ];
  const unique = [];
  const seen = new Set();

  merged.forEach((item) => {
    const normalized = item.toLowerCase();
    if (seen.has(normalized)) return;
    seen.add(normalized);
    unique.push(item);
  });

  drawerSuggestedWords = unique.slice(0, SUGGESTED_LIMIT);
  saveSuggestedWords(drawerSuggestedWords);
}

async function storeSuggestionsForQuery(word) {
  const cleanedWord = displayWord(word);
  if (!cleanedWord) return;

  try {
    const res = await fetch(`/api/synonym/${encodePathSegment(cleanedWord)}`);
    if (!res.ok) return;

    const words = (await res.json()).map((item) => displayWord(item)).filter(Boolean);
    const filtered = words.filter((w) => w.toLowerCase() !== cleanedWord.toLowerCase());
    mergeDrawerSuggestedWords(filtered);

  } catch (err) {
    console.error('Error storing suggestions:', err);
  }
}

// History rendering moved to history.html

function checkUrlForWord() {
  const params = new URLSearchParams(window.location.search);
  const word = params.get('word');
  if (word) {
    input.value = word;
    lookup();
  }
}

function addToHistory(word) {
  if (!word) return;
  const items = loadHistory();
  const filtered = items.filter((w) => w.toLowerCase() !== word.toLowerCase());
  filtered.unshift(word);
  saveHistory(filtered.slice(0, HISTORY_LIMIT));
}

// Clear history moved to history.html

// Clear suggestions removed - now handled on suggestions.html page

// Layout update functions no longer needed - pages handle their own layout

// Toggle positioning no longer needed - CSS handles fixed positioning

historyToggle.addEventListener('click', () => {
  window.location.href = 'history.html';
});

suggestToggle.addEventListener('click', () => {
  window.location.href = 'suggestions.html';
});

function hideSuggestedBox() {
  if (suggestedBox) {
    suggestedBox.classList.add('hidden');
  }
}

function updateSuggestedBoxSpacing() {
  if (!suggestedBox || !mainResultBox) return;
  const mainResultVisible = !mainResultBox.classList.contains('hidden');
  suggestedBox.classList.toggle('standalone', !mainResultVisible);
}

function showSuggestedBox() {
  if (!suggestedBox) return;
  suggestedBox.classList.remove('hidden');
  updateSuggestedBoxSpacing();
  renderSuggestedSearches();
}

function syncSimilarSearchesForEmptyInput() {
  if (input.value.trim()) return;
  liveSuggestedWords = [];
  renderSuggestedSearches();
}

function clearAlternativeSearches() {
  if (!alternativeSearches) return;
  alternativeSearches.innerHTML = '';
  alternativeSearches.classList.add('hidden');
}

function renderAlternativeSearches(words) {
  if (!alternativeSearches) return;

  const alternatives = Array.isArray(words) ? words.filter(Boolean) : [];
  alternativeSearches.innerHTML = '';

  if (!alternatives.length) {
    alternativeSearches.classList.add('hidden');
    return;
  }

  const label = document.createElement('span');
  label.className = 'alternative-searches-label';
  label.textContent = 'Alternative Searches:';
  alternativeSearches.appendChild(label);

  alternatives.forEach((word, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.className = 'alternative-searches-separator';
      separator.textContent = ',';
      alternativeSearches.appendChild(separator);
    }

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'alternative-search-link';
    link.textContent = word;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      input.value = word;
      lookup();
    });
    alternativeSearches.appendChild(link);
  });

  alternativeSearches.classList.remove('hidden');
}

function renderSuggestedSearches() {
  if (!suggestedList || !suggestedBox) return;
  updateSuggestedBoxSpacing();
  liveSuggestedWords = liveSuggestedWords.slice(0, SUGGESTED_LIMIT);
  const words = liveSuggestedWords.slice(0, 30);
  suggestedList.innerHTML = '';

  if (!words.length) {
    suggestedBox.classList.remove('hidden');
    const empty = document.createElement('div');
    empty.className = 'history-empty';
    empty.textContent = 'No suggestions yet.';
    suggestedList.appendChild(empty);
    return;
  }

  suggestedBox.classList.remove('hidden');

  const COLUMN_SIZE = 10;
  const columns = [];
  for (let i = 0; i < words.length; i += COLUMN_SIZE) {
    columns.push(words.slice(i, i + COLUMN_SIZE));
  }

  columns.forEach((columnWords) => {
    const columnDiv = document.createElement('div');
    columnDiv.className = 'suggested-column';

    columnWords.forEach((word) => {
      const row = document.createElement('div');
      row.className = 'suggested-row';

      const bullet = document.createElement('img');
      bullet.className = 'suggested-bullet';
      bullet.src = '/assets/school_bullet_nobg.png';
      bullet.alt = '';

      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip suggested-chip';
      chip.textContent = word;
      chip.addEventListener('click', () => {
        input.value = word;
        hideSuggestedBox();
        lookup();
      });

      row.appendChild(bullet);
      row.appendChild(chip);
      columnDiv.appendChild(row);
    });

    suggestedList.appendChild(columnDiv);
  });
}

renderSuggestedSearches();
clearResult();
clearAlternativeSearches();
syncSimilarSearchesForEmptyInput();

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.location.href = './';
  }
});

function clearResult() {
  while (result.firstChild) result.removeChild(result.firstChild);
  clearAlternativeSearches();
  if (mainResultBox) {
    mainResultBox.classList.remove('has-results');
    mainResultBox.classList.add('hidden');
  }
  updateSuggestedBoxSpacing();
}

function setStatus(text, isError = false) {
  statusText.innerHTML = text || '';
  statusText.style.color = isError ? '#ff6666' : 'var(--muted)';
}

function setSuggestionStatus(word, label = word) {
  statusText.innerHTML = '';
  statusText.style.color = '#ff6666';

  const message = document.createElement('span');
  message.textContent = 'Did you mean ';

  const link = document.createElement('a');
  link.href = '#';
  link.className = 'suggestion-link';
  link.addEventListener('click', (event) => {
    event.preventDefault();
    input.value = word;
    lookup();
  });

  const emphasis = document.createElement('em');
  emphasis.className = 'corrected-word';
  emphasis.textContent = label;
  link.appendChild(emphasis);

  message.appendChild(link);
  message.append('?');
  statusText.appendChild(message);
}

function addSection(title) {
  const section = document.createElement('div');
  section.className = 'section';
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = title;
  section.appendChild(label);
  result.appendChild(section);
  return section;
}

function appendNumberedList(section, items, visibleCount = 5) {
  const list = document.createElement('ol');
  list.className = 'list';

  items.forEach((text, idx) => {
    const item = document.createElement('li');
    item.textContent = text;
    if (idx >= visibleCount) item.classList.add('extra');
    list.appendChild(item);
  });

  section.appendChild(list);

  if (items.length > visibleCount) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'toggle-btn';
    const label = document.createTextNode('see more ');
    const arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = 'v';
    toggle.appendChild(label);
    toggle.appendChild(arrow);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const expanded = list.classList.toggle('show-all');
      label.textContent = expanded ? 'see less ' : 'see more ';
      arrow.textContent = expanded ? '^' : 'v';
      toggle.setAttribute('aria-expanded', expanded);
    });
    const toggleWrap = document.createElement('div');
    toggleWrap.style.display = 'flex';
    toggleWrap.style.justifyContent = 'center';
    toggleWrap.style.transform = 'translateX(0px)';
    toggleWrap.appendChild(toggle);
    section.appendChild(toggleWrap);
  }
}

function displayWord(text) {
  if (!text) return '';
  return text
    .replace(DISPLAY_WORD_DISALLOWED_RE, ' ')
    .replace(MULTISPACE_RE, ' ')
    .trim();
}

function sanitizeSearchInput(text) {
  if (!text) return '';
  return text.replace(SEARCH_INPUT_DISALLOWED_RE, '');
}

function encodePathSegment(value) {
  // Use '+' for spaces so routes like `/api/word/<string>` stay readable and
  // can be decoded server-side consistently (see WordService::decodeInput).
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function renderWord(data) {
  clearResult();

  if (data.found === false) {
    if (data.suggestion && data.suggestion.toLowerCase() !== data.query.toLowerCase()) {
      setSuggestionStatus(data.suggestion, data.display_lemma || data.suggestion);
    } else {
      setStatus(`Word <em>'${input.value}'</em> not found.`, true);
    }
    return;
  }

  if (data.error) {
    if (data.error === 'Enter a valid word') {
      setStatus('400: Enter a valid word', true);
    } else {
      setStatus(`Error: ${data.error}`, true);
    }
    return;
  }

  if (mainResultBox) {
    mainResultBox.classList.remove('hidden');
    mainResultBox.classList.add('has-results');
  }
  updateSuggestedBoxSpacing();

  renderAlternativeSearches(data.alternative_searches);

  const lemma = document.createElement('h2');
  lemma.className = 'lemma';
  const rawHeading = data.display_lemma || data.query || data.lemma || '';
  let decodedHeading = rawHeading;
  try {
    decodedHeading = decodeURIComponent(rawHeading);
  } catch (_) {
    decodedHeading = rawHeading;
  }
  const heading = displayWord(decodedHeading);
  const capitalizedHeading = heading.charAt(0).toUpperCase() + heading.slice(1);
  const punctuated =
    capitalizedHeading && capitalizedHeading.toLowerCase() === 'lexicon levissimum'
      ? `${capitalizedHeading}!`
      : capitalizedHeading;
  lemma.textContent = punctuated || 'Unknown';
  if (capitalizedHeading && capitalizedHeading.toLowerCase() === 'nevermore') {
    const link = document.createElement('a');
    link.href = 'https://www.nevermoreacademy.com/';
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = ' https://www.nevermoreacademy.com/';
    link.style.color = 'var(--ink)';
    link.style.fontFamily = '"Times New Roman", Times, serif';
    link.style.fontSize = '17px';
    link.style.fontWeight = '400';
    link.style.marginLeft = '8px';
    lemma.appendChild(link);
  }
  result.appendChild(lemma);

  const sensesSection = addSection('Definition');
  if (Array.isArray(data.senses) && data.senses.length) {
    const items = data.senses.map((s) => {
      const pos = s.pos ? `[${s.pos}] ` : '';
      return `${pos}${s.definition || ''}`.trim();
    });
    appendNumberedList(sensesSection, items);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No definitions available.';
    sensesSection.appendChild(empty);
  }

  const synSection = addSection('Synonyms');
  const syns = Array.isArray(data.senses)
    ? data.senses.flatMap((s) => (Array.isArray(s.synonyms) ? s.synonyms : []))
    : [];
  if (syns.length) {
    const wrap = document.createElement('div');
    syns.forEach((w) => {
      const chip = document.createElement('a');
      chip.className = 'chip';
      chip.textContent = w;
      chip.href = '#';
      chip.onclick = (e) => {
        e.preventDefault();
        input.value = w;
        lookup();
      };
      wrap.appendChild(chip);
    });
    synSection.appendChild(wrap);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No synonyms available.';
    synSection.appendChild(empty);
  }

  const antSection = addSection('Antonyms');
  const ants = Array.isArray(data.senses)
    ? data.senses.flatMap((s) => (Array.isArray(s.antonyms) ? s.antonyms : []))
    : [];
  if (ants.length) {
    const wrap = document.createElement('div');
    ants.forEach((w) => {
      const chip = document.createElement('a');
      chip.className = 'chip';
      chip.textContent = w;
      chip.href = '#';
      chip.onclick = (e) => {
        e.preventDefault();
        input.value = w;
        lookup();
      };
      wrap.appendChild(chip);
    });
    antSection.appendChild(wrap);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No antonyms available.';
    antSection.appendChild(empty);
  }

  const exSection = addSection('Examples');
  const examples = Array.isArray(data.senses)
    ? data.senses.flatMap((s) => (Array.isArray(s.examples) ? s.examples : []))
    : [];
  if (examples.length) {
    appendNumberedList(exSection, examples);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No examples available.';
    exSection.appendChild(empty);
  }

  const formsSection = addSection('Forms');
  if (Array.isArray(data.forms) && data.forms.length) {
    const wrap = document.createElement('div');
    data.forms.forEach((f) => {
      const chip = document.createElement('a');
      chip.className = 'chip';
      chip.textContent = f.tag ? `${f.form} (${f.tag})` : f.form;
      chip.href = '#';
      chip.onclick = (e) => {
        e.preventDefault();
        input.value = f.form;
        lookup();
      };
      wrap.appendChild(chip);
    });
    formsSection.appendChild(wrap);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No forms available.';
    formsSection.appendChild(empty);
  }

  const etySection = addSection('Etymology');
  if (Array.isArray(data.etymology) && data.etymology.length) {
    appendNumberedList(etySection, data.etymology, 1);
  } else {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'No etymology available.';
    etySection.appendChild(empty);
  }
}

async function lookup() {
  const raw = input.value || '';
  const word = raw.trim();
  if (!word) {
    clearResult();
    showSuggestedBox();
    renderWord({ error: 'Enter a word' }, '');
    input.focus();
    return;
  }
  if (!SEARCH_INPUT_ALLOWED_RE.test(word)) {
    clearResult();
    setStatus('400: Enter a valid word', true);
    input.focus();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('word') !== word) {
    window.history.pushState({}, '', `/?word=${encodePathSegment(word)}`);
  }

  button.disabled = true;
  spinner.style.display = 'inline-block';
  if (spinnerTimer) clearInterval(spinnerTimer);
  const frames = ['|', '/', '-', ''];
  let idx = 0;
  spinner.textContent = frames[idx];
  spinnerTimer = setInterval(() => {
    idx = (idx + 1) % frames.length;
    spinner.textContent = frames[idx];
  }, 120);
  clearResult();

  try {
    setStatus('Looking up…');
    const res = await fetch(`/api/word/${encodePathSegment(word)}`);
    const data = await res.json();
    if (!res.ok) {
      renderWord(data, word);
      storeSuggestionsForQuery(word);
    } else {
      renderWord(data, word);
      setStatus('');

      // Canonicalize the query to match what the backend returns (display lemma).
      const canonical = displayWord(data.display_lemma || data.query || word);
      if (canonical) {
        input.value = canonical;
        if (canonical !== word)
          window.history.replaceState({}, '', `/?word=${encodePathSegment(canonical)}`);
      }

      addToHistory(canonical || displayWord(word));
      addSearchedSuggestion();
      storeSuggestionsForQuery(canonical || word);
    }
  } catch (err) {
    clearResult();
    const reason = err && err.message ? err.message : 'failed to fetch';
    setStatus(`Network error: ${reason}`, true);
  } finally {
    button.disabled = false;
    spinner.style.display = 'none';
    if (spinnerTimer) {
      clearInterval(spinnerTimer);
      spinnerTimer = null;
    }
  }
}

let suggestTimer;

function debounce(fn, delay) {
  return function debounced(...args) {
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// --- Ghost Autofill ---

function setGhostText(typed, completion) {
  if (!completion || completion.toLowerCase() === typed.toLowerCase()) {
    clearGhostText();
    return;
  }
  // Only show a ghost completion when the completion actually extends what the
  // user typed; otherwise substring math can produce confusing suffixes.
  if (completion.toLowerCase().indexOf(typed.toLowerCase()) !== 0) {
    clearGhostText();
    return;
  }
  ghostCompletion = completion;
  ghostTyped.textContent = typed;
  ghostSuffix.textContent = completion.substring(typed.length);
  if (ghostHint) {
  ghostHint.style.display = 'inline';
  ghostHint.style.cursor = 'pointer';
}
}

function clearGhostText() {
  ghostCompletion = '';
  if (ghostTyped) ghostTyped.textContent = '';
  if (ghostSuffix) ghostSuffix.textContent = '';
  if (ghostHint) {
    ghostHint.style.display = 'none';
    ghostHint.style.cursor = 'default';
  }
}

function acceptGhost() {
  if (ghostCompletion) {
    input.value = ghostCompletion;
    input.setSelectionRange(ghostCompletion.length, ghostCompletion.length);
    clearGhostText();
  }
}

function triggerGhostAutofill() {
  const typed = input.value || '';
  // Autocomplete only the last "word" segment so spaces don't break suffix math.
  const lastSpace = typed.lastIndexOf(' ');
  const base = lastSpace >= 0 ? typed.slice(0, lastSpace + 1) : '';
  const segment = lastSpace >= 0 ? typed.slice(lastSpace + 1) : typed;
  const word = segment.trim();

  if (word.length < 1) {
    clearGhostText();
    return;
  }

  if (ghostController) ghostController.abort();
  ghostController = new AbortController();
  const signal = ghostController.signal;

  const history = loadHistory().slice(0, 20).join(',');
  const suggested = loadSuggestedWords().slice(0, 20).join(',');

  let url = `/api/autofill/${encodePathSegment(word)}`;
  const params = new URLSearchParams();
  if (history) params.set('history', history);
  if (suggested) params.set('suggested', suggested);
  const qs = params.toString();
  if (qs) url += '?' + qs;

  fetch(url, { signal })
    .then((res) => {
      if (!res.ok) { clearGhostText(); return null; }
      return res.json();
    })
    .then((data) => {
      if (!data) return;
      // stale: last segment changed
      const current = input.value || '';
      const currentLastSpace = current.lastIndexOf(' ');
      const currentSegment = currentLastSpace >= 0 ? current.slice(currentLastSpace + 1) : current;
      if (currentSegment.trim() !== word) return;

      const completion = data.completion || '';
      const composed = base + completion;
      setGhostText(current, composed);
    })
    .catch(() => {});
}
// --- end Ghost Autofill ---

async function fetchSuggestions() {
  const sanitizedValue = sanitizeSearchInput(input.value);
  const word = sanitizedValue.trim();
  if (word.length < 1) {
    liveSuggestedWords = [];
    renderSuggestedSearches();
    return;
  }

  try {
  const res = await fetch(`/api/suggest/${encodePathSegment(word)}`);
    if (!res.ok) {
      liveSuggestedWords = [];
    } else {
      const suggestions = await res.json();
      liveSuggestedWords = (Array.isArray(suggestions) ? suggestions : [])
        .map((w) => displayWord(w))
        .filter(Boolean);
    }
  } catch (err) {
    liveSuggestedWords = [];
  }

  renderSuggestedSearches();
}

input.addEventListener('input', triggerGhostAutofill);
input.addEventListener('input', debounce(fetchSuggestions, 300));

button.addEventListener('click', lookup);
promptButton.addEventListener('click', lookup);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    lookup();
  }
  if (e.key === 'Tab' && ghostCompletion) {
    e.preventDefault();
    acceptGhost();
  }
});
ghostHint.addEventListener('click', acceptGhost);

checkUrlForWord();

window.addEventListener('popstate', checkUrlForWord);
