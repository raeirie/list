/* list — reads links.json, renders grouped cards, resolves shortlinks.
   No dependencies, no build step. Paths are relative so the site works both
   at the domain root locally and under /list/ on GitHub Pages. */
(function () {
  'use strict';

  var KIND_ORDER = ['link', 'page', 'pdf', 'image', 'file'];

  var KIND_LABELS = {
    link: 'Links',
    page: 'Pages',
    pdf: 'PDFs',
    image: 'Images',
    file: 'Files'
  };

  var params = new URLSearchParams(window.location.search);
  var groupsEl = document.getElementById('groups');
  var statusEl = document.getElementById('status');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- helpers ---------------------------------------------------------- */

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.classList.toggle('is-error', Boolean(isError));
  }

  function loadConfig() {
    return fetch('links.json', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('links.json responded with ' + res.status);
      return res.json();
    });
  }

  function normaliseKind(kind) {
    return KIND_ORDER.indexOf(kind) !== -1 ? kind : 'file';
  }

  /* --- share ------------------------------------------------------------ */

  /* The anchor is the shareable form of an item: it opens the listing with the
     card highlighted. Built from the current URL so it works at the domain
     root and under /list/ on Pages alike. */
  function shareUrl(slug) {
    return window.location.href.replace(/[?#].*$/, '') + '#' + slug;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    /* Older browsers: a hidden textarea plus the deprecated execCommand. */
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }

  function shareItem(slug, btn) {
    var url = shareUrl(slug);
    copyText(url).then(function () {
      btn.setAttribute('data-copied', 'true');
      btn.title = 'Link copied';
      setTimeout(function () {
        btn.removeAttribute('data-copied');
        btn.title = 'Copy link';
      }, 1400);
    }).catch(function () {
      btn.title = 'Copy failed — ' + url;
    });
  }

  /* --- rendering -------------------------------------------------------- */

  function buildCard(item) {
    var card = document.createElement('div');
    card.className = 'card';
    card.id = item.slug;

    /* The card is a row: the link owns the text, the share button sits at the
       right. They are siblings, not nested, so the button stays a real
       button and clicking it does not follow the link. */
    var link = document.createElement('a');
    link.className = 'card__link';
    link.href = item.target;

    /* Links leave the page entirely; hosted files/pages open in place so the
       browser handles them natively (PDF viewer, rendered HTML, image). */
    if (normaliseKind(item.kind) === 'link') {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }

    var title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = item.title;

    link.appendChild(title);

    if (item.note) {
      var note = document.createElement('p');
      note.className = 'card__note';
      note.textContent = item.note;
      link.appendChild(note);
    }

    card.appendChild(link);

    var share = document.createElement('button');
    share.className = 'card__share';
    share.type = 'button';
    share.title = 'Copy link';
    share.setAttribute('aria-label', 'Copy link to ' + item.title);
    share.innerHTML =
      '<svg class="icon-link" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>' +
      '<svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    share.addEventListener('click', function () { shareItem(item.slug, share); });

    card.appendChild(share);

    return card;
  }

  function render(data) {
    var site = (data && data.site) || {};
    var items = (data && Array.isArray(data.items)) ? data.items : [];

    document.title = site.title || 'list';

    var titleEl = document.getElementById('site-title');
    if (site.title) titleEl.textContent = site.title;

    var taglineEl = document.getElementById('site-tagline');
    if (site.tagline) {
      taglineEl.textContent = site.tagline;
      taglineEl.hidden = false;
    } else {
      taglineEl.hidden = true;
    }

    groupsEl.innerHTML = '';

    if (!items.length) {
      setStatus('Nothing listed yet.', false);
      return;
    }

    var buckets = {};
    KIND_ORDER.forEach(function (kind) { buckets[kind] = []; });
    items.forEach(function (item) {
      buckets[normaliseKind(item.kind)].push(item);
    });

    KIND_ORDER.forEach(function (kind) {
      var bucket = buckets[kind];
      if (!bucket.length) return;

      var section = document.createElement('section');
      section.className = 'group';

      var heading = document.createElement('h2');
      heading.className = 'group__title';
      heading.textContent = KIND_LABELS[kind];

      var grid = document.createElement('div');
      grid.className = 'cards';

      bucket.forEach(function (item) { grid.appendChild(buildCard(item)); });

      section.appendChild(heading);
      section.appendChild(grid);
      groupsEl.appendChild(section);
    });
  }

  /* --- shortlinks and anchors ------------------------------------------- */

  function revealHash() {
    if (!window.location.hash) return;
    var id = decodeURIComponent(window.location.hash.slice(1));
    var target = document.getElementById(id);
    if (!target) return;
    target.classList.add('is-active');
    target.scrollIntoView(reducedMotion ? {} : { behavior: 'smooth', block: 'start' });
  }

  /* --- boot ------------------------------------------------------------- */

  function boot() {
    var slug = params.get('go');
    if (slug) {
      setStatus('Redirecting…', false);
      loadConfig().then(function (data) {
        var items = (data && Array.isArray(data.items)) ? data.items : [];
        for (var i = 0; i < items.length; i++) {
          if (items[i].slug === slug) {
            window.location.replace(items[i].target);
            return;
          }
        }
        setStatus('Shortlink "' + slug + '" was not found.', true);
        render(data);
      }).catch(function (err) {
        setStatus('Could not load links.json: ' + err.message, true);
      });
      return;
    }

    loadConfig().then(function (data) {
      render(data);
      revealHash();
    }).catch(function (err) {
      setStatus('Could not load links.json: ' + err.message, true);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
