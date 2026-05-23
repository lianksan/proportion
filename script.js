const cells = [
  document.getElementById('cellR'),
  document.getElementById('cellF'),
  document.getElementById('cellU'),
  document.getElementById('cellJ'),
];
const wrappers = [
  document.getElementById('wrapR'),
  document.getElementById('wrapF'),
  document.getElementById('wrapU'),
  document.getElementById('wrapJ'),
];
const names = ['A', 'B', 'C', 'D'];
const cellResults = [
  document.getElementById('resultR'),
  document.getElementById('resultF'),
  document.getElementById('resultU'),
  document.getElementById('resultJ'),
];
const resultPositions = ['pos-top-left', 'pos-bottom-left', 'pos-top-right', 'pos-bottom-right'];
const goodValuesEl = document.getElementById('goodValues');
const equalsWrap = document.getElementById('equalsWrap');

const navMap = {
  ArrowRight: [2, 3, 0, 1],
  ArrowLeft:  [2, 3, 0, 1],
  ArrowDown:  [1, 0, 3, 2],
  ArrowUp:    [1, 0, 3, 2],
};

const tabOrder = [0, 1, 2, 3];
const codeToIndex = { KeyR: 0, KeyF: 1, KeyU: 2, KeyJ: 3, KeyA: 0, KeyB: 1, KeyC: 2, KeyD: 3 };

function sanitizeInput(input) {
  let val = input.value;
  val = val.replace(/[^\d.,]/g, '');
  val = val.replace(/,/g, '.');
  const parts = val.split('.');
  if (parts.length > 2) {
    val = parts[0] + '.' + parts.slice(1).join('');
  }
  if (input.value !== val) {
    const pos = input.selectionStart - (input.value.length - val.length);
    input.value = val;
    input.setSelectionRange(pos, pos);
  }
}

const _measure = document.createElement('span');
_measure.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:Caveat,cursive;font-weight:600;';
document.body.appendChild(_measure);

function getBaseSize() {
  const w = window.innerWidth;
  if (w <= 480) return Math.round(w * 0.13);
  if (w <= 700) return 80;
  if (w <= 960) return 110;
  return 160;
}

function autoSizeFont(input) {
  const maxWidth = input.closest('.cell-wrapper').offsetWidth - 16;
  const text = input.value || '';
  const base = getBaseSize();
  if (!text) { input.style.fontSize = base + 'px'; return; }
  let size = base;
  _measure.style.fontSize = size + 'px';
  _measure.textContent = text;
  while (_measure.offsetWidth > maxWidth && size > 20) {
    size -= 2;
    _measure.style.fontSize = size + 'px';
  }
  input.style.fontSize = size + 'px';
}

function updateWrapperStates() {
  cells.forEach((c, i) => {
    wrappers[i].classList.toggle('has-value', c.value.trim() !== '');
  });
}

function getFocusedIndex() {
  return cells.indexOf(document.activeElement);
}

function getValues() {
  return cells.map(c => {
    const v = c.value.replace(/,/g, '.').trim();
    return v === '' ? null : parseFloat(v);
  });
}

function findEmpty(vals) {
  const empties = [];
  for (let i = 0; i < 4; i++) {
    if (vals[i] === null || isNaN(vals[i])) empties.push(i);
  }
  return empties;
}

function solve(vals) {
  const empty = findEmpty(vals);
  if (empty.length !== 1) return null;

  const idx = empty[0];
  const [a, b, c, d] = vals;

  let result;
  switch (idx) {
    case 0: result = (b * c) / d; break;
    case 1: result = (a * d) / c; break;
    case 2: result = (a * d) / b; break;
    case 3: result = (b * c) / a; break;
    default: return null;
  }

  if (!isFinite(result)) return null;
  return { index: idx, value: result };
}

function formatNum(n) {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

const siblingMap = { 0: 1, 1: 0, 2: 3, 3: 2 };

function findGoodThirdValues(vals, solvedIdx) {
  const varIdx = siblingMap[solvedIdx];
  const originalVal = vals[varIdx];

  const results = [];
  const seen = new Set();

  for (let delta = -10; delta <= 10; delta++) {
    if (delta === 0) continue;
    const candidate = Math.round(originalVal) + delta;
    if (candidate <= 0) continue;

    const test = [...vals];
    test[varIdx] = candidate;
    test[solvedIdx] = null;

    const sol = solve(test);
    if (!sol) continue;
    if (!Number.isInteger(sol.value) || sol.value <= 0) continue;

    const full = [...test];
    full[solvedIdx] = sol.value;

    const key = full.join(',');
    if (seen.has(key)) continue;
    seen.add(key);

    const dist = Math.abs(candidate - originalVal);
    results.push({ values: full, changedIdx: varIdx, newThird: candidate, solvedVal: sol.value, distance: dist });
  }

  results.sort((a, b) => a.distance - b.distance);
  return results.slice(0, 2);
}

function clearCellResults() {
  cellResults.forEach(r => {
    r.className = 'cell-result';
    r.innerHTML = '';
  });
  goodValuesEl.className = 'good-values';
  goodValuesEl.innerHTML = '';
  goodValuesEl.style.transform = '';
}

function calculate() {
  const vals = getValues();
  const empty = findEmpty(vals);

  cells.forEach(c => c.classList.remove('is-result'));
  equalsWrap.classList.remove('not-equal');
  clearCellResults();

  if (empty.length > 1) return;

  if (empty.length === 0) {
    const [a, b, c, d] = vals;
    const left = a / b;
    const right = c / d;
    if (Math.abs(left - right) < 0.0001) return;
    equalsWrap.classList.add('not-equal');
    return;
  }

  const sol = solve(vals);
  if (!sol) return;

  cells[sol.index].classList.add('is-result');

  const fullVals = [...vals];
  fullVals[sol.index] = sol.value;

  const resultEl = cellResults[sol.index];
  const posClass = resultPositions[sol.index];
  resultEl.className = 'cell-result visible ' + posClass;
  const resultText = formatNum(sol.value);
  resultEl.innerHTML = resultText;

  const maxResultWidth = wrappers[sol.index].offsetWidth + 40;
  let resultSize = getBaseSize();
  _measure.style.fontSize = resultSize + 'px';
  _measure.textContent = resultText;
  while (_measure.offsetWidth > maxResultWidth && resultSize > 20) {
    resultSize -= 2;
    _measure.style.fontSize = resultSize + 'px';
  }
  resultEl.style.fontSize = resultSize + 'px';

  if (!Number.isInteger(sol.value)) {
    const good = findGoodThirdValues(fullVals, sol.index);
    if (good.length > 0) {
      const isTop = posClass.includes('top');
      goodValuesEl.className = 'good-values visible ' + (isTop ? 'gv-top' : 'gv-bottom');

      let html = '';
      for (const g of good) {
        const changedName = names[g.changedIdx];
        const solvedVal = g.values[sol.index];
        html += `<span class="good-chip" data-values='${JSON.stringify(g.values)}'><span class="good-val">${solvedVal}</span> if ${changedName} = ${g.newThird}</span>`;
      }
      goodValuesEl.innerHTML = html;

      const mainRect = document.querySelector('main').getBoundingClientRect();
      const resultRect = resultEl.getBoundingClientRect();
      const resultCenterX = resultRect.left + resultRect.width / 2 - mainRect.left;
      goodValuesEl.style.left = resultCenterX + 'px';
      goodValuesEl.style.transform = 'translateX(-50%)';

      if (isTop) {
        goodValuesEl.style.top = (resultRect.top - mainRect.top - goodValuesEl.offsetHeight - 4) + 'px';
        goodValuesEl.style.bottom = '';
      } else {
        goodValuesEl.style.top = (resultRect.bottom - mainRect.top + 4) + 'px';
        goodValuesEl.style.bottom = '';
      }

      goodValuesEl.querySelectorAll('.good-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const v = JSON.parse(chip.dataset.values);
          cells.forEach((c, i) => {
            c.value = formatNum(v[i]);
          });
          updateWrapperStates();
          cells.forEach(c => autoSizeFont(c));
          calculate();
        });
      });
    }
  }
}

cells.forEach(c => {
  c.addEventListener('input', () => {
    sanitizeInput(c);
    autoSizeFont(c);
    updateWrapperStates();
    calculate();
  });
});

document.addEventListener('keydown', (e) => {
  const focused = getFocusedIndex();

  if (e.code in codeToIndex) {
    const target = codeToIndex[e.code];
    if (focused === -1 || (target !== focused && !e.metaKey && !e.ctrlKey)) {
      e.preventDefault();
      cells[target].focus();
      cells[target].select();
      return;
    }
  }

  if (focused === -1) return;

  if (e.key in navMap) {
    e.preventDefault();
    const target = navMap[e.key][focused];
    cells[target].focus();
    cells[target].select();
    return;
  }

  if (e.key === 'Tab') {
    e.preventDefault();
    const curTabIdx = tabOrder.indexOf(focused);
    const nextTabIdx = e.shiftKey
      ? (curTabIdx - 1 + tabOrder.length) % tabOrder.length
      : (curTabIdx + 1) % tabOrder.length;
    cells[tabOrder[nextTabIdx]].focus();
    cells[tabOrder[nextTabIdx]].select();
    return;
  }
});

window.addEventListener('resize', () => {
  cells.forEach(c => autoSizeFont(c));
  calculate();
});

cells[0].focus();
calculate();
