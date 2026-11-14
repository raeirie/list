/* list — live tuning panel.
   Dev only: loaded by app.js when the URL carries ?tune=1.
   Sliders drive CSS custom properties on :root, so the real page re-renders live.
   "Copy config" emits the locked values as JSON for baking back into styles.css. */
(function () {
  'use strict';

  var GROUPS = [
    {
      name: 'Colour',
      items: [
        { key: '--bg', label: 'Background', type: 'color' },
        { key: '--surface', label: 'Surface', type: 'color' },
        { key: '--surface-hover', label: 'Surface hover', type: 'color' },
        { key: '--text', label: 'Text', type: 'color' },
        { key: '--muted', label: 'Muted text', type: 'color' },
        { key: '--accent', label: 'Accent', type: 'color' },
        { key: '--hairline', label: 'Hairline', type: 'color' }
      ]
    },
    {
      name: 'Type',
      items: [
        { key: '--base-size', label: 'Base size', type: 'range', min: 13, max: 20, step: 0.5, unit: 'px' },
        { key: '--heading-scale', label: 'Heading scale', type: 'range', min: 1, max: 1.6, step: 0.01, unit: '' },
        { key: '--line-height', label: 'Line height', type: 'range', min: 1.2, max: 2, step: 0.01, unit: '' }
      ]
    },
    {
      name: 'Space',
      items: [
        { key: '--gap', label: 'Grid gap', type: 'range', min: 4, max: 40, step: 1, unit: 'px' },
        { key: '--section-gap', label: 'Section gap', type: 'range', min: 16, max: 96, step: 1, unit: 'px' },
        { key: '--card-padding', label: 'Card padding', type: 'range', min: 8, max: 40, step: 1, unit: 'px' },
        { key: '--container-max', label: 'Container max', type: 'range', min: 640, max: 1600, step: 10, unit: 'px' }
      ]
    },
    {
      name: 'Shape & grid',
      items: [
        { key: '--radius', label: 'Corner radius', type: 'range', min: 0, max: 32, step: 1, unit: 'px' },
        { key: '--grid-cols', label: 'Columns (>= 1024px)', type: 'range', min: 1, max: 6, step: 1, unit: '' },
        { key: '--card-min', label: 'Card min width', type: 'range', min: 160, max: 420, step: 5, unit: 'px' }
      ]
    }
  ];

  /* Fallbacks so a colour/number we cannot parse still renders a usable control
     instead of silently corrupting the value. */
  var FALLBACKS = {
    '--bg': '#0d0f12', '--surface': '#15181d', '--surface-hover': '#1c2027',
    '--text': '#eceef1', '--muted': '#9aa3af', '--accent': '#8ab4ff',
    '--hairline': '#262b33',
    '--base-size': '16px', '--heading-scale': '1.18', '--line-height': '1.55',
    '--gap': '14px', '--section-gap': '40px', '--card-padding': '18px',
    '--container-max': '1080px', '--radius': '14px', '--grid-cols': '3',
    '--card-min': '240px'
  };

  var rootStyle = document.documentElement.style;
  var computed = getComputedStyle(document.documentElement);

  /* --- value parsing (never trust a lossy parse) ------------------------- */

  function parseColor(raw) {
    if (!raw) return null;
    var value = String(raw).trim();
    var match;

    if ((match = value.match(/^#([0-9a-f]{3})$/i))) {
      return ('#' + match[1][0] + match[1][0] + match[1][1] + match[1][1] + match[1][2] + match[1][2]).toLowerCase();
    }
    if ((match = value.match(/^#([0-9a-f]{6})$/i))) return match[0].toLowerCase();

    if ((match = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i))) {
      return '#' + [1, 2, 3].map(function (index) {
        var channel = Math.round(parseFloat(match[index]));
        channel = Math.max(0, Math.min(255, channel));
        return channel.toString(16).padStart(2, '0');
      }).join('');
    }

    return null; /* unrepresentable -> caller falls back to a text input */
  }

  function parseNumber(raw) {
    var match = String(raw == null ? '' : raw).trim().match(/^-?[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  }

  function readCurrent(item) {
    var raw = computed.getPropertyValue(item.key).trim();
    if (!raw) raw = FALLBACKS[item.key];

    if (item.type === 'color') {
      var hex = parseColor(raw);
      return { kind: hex ? 'color' : 'text', value: hex || raw };
    }

    var numeric = parseNumber(raw);
    return { kind: numeric == null ? 'text' : 'range', value: numeric == null ? raw : numeric, raw: raw };
  }

  /* --- state ------------------------------------------------------------ */

  var state = {};

  function snapshot() {
    var out = {};
    GROUPS.forEach(function (group) {
      group.items.forEach(function (item) {
        out[item.key] = (state[item.key] && state[item.key].applied) || FALLBACKS[item.key];
      });
    });
    return out;
  }

  function apply(key, cssValue) {
    rootStyle.setProperty(key, cssValue);
    if (state[key]) state[key].applied = cssValue;
  }

  /* --- panel ------------------------------------------------------------ */

  var panel = document.createElement('aside');
  panel.className = 'tuner';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Visual tuning panel');

  var head = document.createElement('div');
  head.className = 'tuner__head';

  var title = document.createElement('span');
  title.className = 'tuner__title';
  title.textContent = 'Tuning';

  var tag = document.createElement('span');
  tag.className = 'tuner__tag';
  tag.textContent = 'Dev only';

  head.appendChild(title);
  head.appendChild(tag);

  var body = document.createElement('div');
  body.className = 'tuner__body';

  GROUPS.forEach(function (group) {
    var section = document.createElement('div');
    section.className = 'tuner__group';

    var heading = document.createElement('h3');
    heading.className = 'tuner__group-title';
    heading.textContent = group.name;
    section.appendChild(heading);

    group.items.forEach(function (item) { section.appendChild(buildRow(item)); });

    body.appendChild(section);
  });

  var actions = document.createElement('div');
  actions.className = 'tuner__actions';

  var resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'tuner__btn';
  resetBtn.textContent = 'Reset';

  var copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'tuner__btn tuner__btn--primary';
  copyBtn.textContent = 'Copy config';

  actions.appendChild(resetBtn);
  actions.appendChild(copyBtn);

  var copied = document.createElement('p');
  copied.className = 'tuner__copied';
  copied.hidden = true;

  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(actions);
  panel.appendChild(copied);
  document.body.appendChild(panel);

  /* --- controls --------------------------------------------------------- */

  function buildRow(item) {
    var row = document.createElement('div');
    row.className = 'tuner__row';

    var label = document.createElement('label');
    label.textContent = item.label;
    label.setAttribute('for', 'tuner-' + item.key.replace(/^--/, ''));

    var readout = document.createElement('span');
    readout.className = 'tuner__value';

    var current = readCurrent(item);
    state[item.key] = { kind: current.kind, value: current.value, applied: null };

    if (current.kind === 'color') {
      var colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.id = label.getAttribute('for');
      colorInput.value = current.value;
      colorInput.addEventListener('input', function () {
        state[item.key].applied = colorInput.value;
        rootStyle.setProperty(item.key, colorInput.value);
        readout.textContent = colorInput.value;
      });
      readout.textContent = current.value;
      row.appendChild(label);
      row.appendChild(readout);
      row.appendChild(colorInput);
      return row;
    }

    if (current.kind === 'range') {
      var slider = document.createElement('input');
      slider.type = 'range';
      slider.min = item.min;
      slider.max = item.max;
      slider.step = item.step;
      slider.value = current.value;

      var textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.setAttribute('aria-label', item.label + ' value');

      function commit(number) {
        var clamped = Math.max(item.min, Math.min(item.max, number));
        var cssValue = item.unit ? clamped + item.unit : String(clamped);
        state[item.key].applied = cssValue;
        rootStyle.setProperty(item.key, cssValue);
        readout.textContent = cssValue;
        slider.value = clamped;
        textInput.value = cssValue;
      }

      slider.addEventListener('input', function () { commit(parseFloat(slider.value)); });
      textInput.addEventListener('change', function () {
        var numeric = parseNumber(textInput.value);
        if (numeric != null) commit(numeric);
        else textInput.value = readout.textContent;
      });

      commit(current.value);

      row.appendChild(label);
      row.appendChild(readout);
      row.appendChild(slider);
      row.appendChild(textInput);
      return row;
    }

    /* Unparseable value: a plain text input so the control cannot corrupt it. */
    var freeInput = document.createElement('input');
    freeInput.type = 'text';
    freeInput.id = label.getAttribute('for');
    freeInput.value = current.value;
    freeInput.addEventListener('input', function () {
      state[item.key].applied = freeInput.value;
      rootStyle.setProperty(item.key, freeInput.value);
      readout.textContent = freeInput.value;
    });
    readout.textContent = current.value;
    row.appendChild(label);
    row.appendChild(readout);
    row.appendChild(freeInput);
    return row;
  }

  /* --- actions ---------------------------------------------------------- */

  resetBtn.addEventListener('click', function () {
    GROUPS.forEach(function (group) {
      group.items.forEach(function (item) {
        rootStyle.removeProperty(item.key);
        state[item.key].applied = null;
      });
    });
    panel.remove();
    delete window.__tuner;
    window.__tunerLoaded = false;
    location.reload();
  });

  copyBtn.addEventListener('click', function () {
    var config = snapshot();
    var json = JSON.stringify(config, null, 2);

    function done() {
      copied.textContent = 'Config copied — paste it back to bake the values in.';
      copied.hidden = false;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(done, function () { console.log(json); done(); });
    } else {
      console.log(json);
      done();
    }
    console.log('[tuner] config:\n' + json);
  });
})();
