/* Data Package – Receiver View prototype.
   Vanilla JS: a small view stack (push/pop with slide transitions), overlays for sheets,
   and one render function per screen. Figma screen numbers are noted next to each state. */
(function () {
  const { PACKAGE, assets, docs } = window.DATA;
  const app = document.getElementById('app');
  const isDesktopFrame = () => window.matchMedia('(min-width: 601px)').matches;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ic = (name, w = 16, h = w, cls = '') => `<img src="assets/icons/${name}.svg" width="${w}" height="${h}" alt=""${cls ? ` class="${cls}"` : ''}>`;
  // Line icon (Google Material Symbols, outlined) drawn in the element's text colour.
  const lineIc = (name, size = 16) => `<span class="mi" aria-hidden="true" style="width:${size}px;height:${size}px;-webkit-mask-image:url(assets/icons/${name}.svg);mask-image:url(assets/icons/${name}.svg)"></span>`;
  const html = (str) => { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; };
  const assetById = (id) => assets.find((a) => a.id === id);
  const docsForAsset = (id) => docs.filter((d) => d.assetId === id);
  // Document rows (105 / 403): title is the document type; second line is the linked part.
  const docTitle = (d) => esc(d.type);
  const assetLine = (a, boldDot) => `${esc(a.partNo)} ${boldDot ? '<b>•</b>' : '•'} ${esc(a.serialNo)}`;
  // Documents are searched by type/number and by the Serial No. or Part No. of their asset.
  const docMatches = (d, q) => {
    const a = assetById(d.assetId);
    return [d.type, d.number, a.serialNo, a.partNo].some((v) => v.toLowerCase().includes(q));
  };
  const PAGE = 20;
  // "Select all" checkbox: empty → indeterminate (some selected) → checked (all selected).
  const selectAllIcon = (n, total) => ic(n && n === total ? 'checkbox' : n ? 'checkboxIndeterminate' : 'checkboxBlank');
  const selectAllAria = (n, total) => (n && n === total ? 'true' : n ? 'mixed' : 'false');

  const state = { docsShared: PACKAGE.documentsShared };

  /* ---------- chrome: status bar + toast ---------- */
  app.insertAdjacentHTML('beforeend', '<img class="statusbar" src="assets/img/statusbar.svg" width="393" height="47" alt="">');
  const toastEl = html('<div class="toast" role="status"></div>');
  app.appendChild(toastEl);
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- view stack ---------- */
  const stack = [];
  const top = () => stack[stack.length - 1];
  function mount(view) { app.insertBefore(view.el, app.querySelector('.statusbar')); }
  // Views marked `instant` (the document viewer) appear/disappear in place – no slide, no shift of the screen behind.
  const withoutTransition = (el, fn) => { el.style.transition = 'none'; fn(); el.getBoundingClientRect(); el.style.transition = ''; };
  function push(view, animate = true) {
    const prev = top();
    stack.push(view);
    mount(view);
    if (prev && animate && !view.instant) {
      view.el.classList.add('enter');
      view.el.getBoundingClientRect();
      view.el.classList.remove('enter');
      prev.el.classList.add('behind');
    } else if (prev) withoutTransition(prev.el, () => prev.el.classList.add('behind'));
    history.pushState({ depth: stack.length }, '');
    view.onShow && view.onShow();
  }
  function pop() {
    if (stack.length < 2) return;
    const v = stack.pop();
    const prev = top();
    if (v.instant) {
      withoutTransition(prev.el, () => prev.el.classList.remove('behind'));
      v.el.remove();
    } else {
      prev.el.classList.remove('behind');
      v.el.classList.add('leave');
      setTimeout(() => v.el.remove(), 330);
    }
    v.onDestroy && v.onDestroy();
    syncNav();
  }
  function reset(views) {
    stack.splice(0).forEach((v) => { v.el.remove(); v.onDestroy && v.onDestroy(); });
    views.forEach((v, i) => { stack.push(v); mount(v); if (i < views.length - 1) v.el.classList.add('behind'); });
    history.replaceState({ depth: stack.length }, '');
    views.forEach((v) => v.onShow && v.onShow());
  }
  window.addEventListener('popstate', () => { if (stack.length > 1) pop(); });

  /* ---------- shared fragments ---------- */
  const brandHeader = () => `
    <header class="header">
      <img class="logo" src="assets/img/logo.svg" width="120" height="24" alt="Block.Aero">
      <a class="learn-more" href="https://block.aero" target="_blank" rel="noopener">Learn more ${ic('openTab')}</a>
    </header>`;

  const illustration = () => `
    <div class="illus" aria-hidden="true">
      <img class="woman" src="assets/img/illus-woman.svg" width="47.5" height="99.4" alt="">
      <div class="scr"><img src="assets/img/illus-screen.svg" alt=""></div>
      <div class="floor"></div>
    </div>`;
  // 974:22138 – search with no results: illustration + "No Results Found for “query”" (no count in the header).
  const noResultsBlock = (q) => `<div class="illus-nr" aria-hidden="true"><img src="assets/img/illus-no-results.svg" alt=""></div><p class="ttl">No Results Found for “${esc(q)}”</p>`;
  const notIncludedBlock = () => `${ic('hide32', 32)}<p class="ttl">Not Included</p><p class="msg">This data wasn’t shared in this package.</p>`;
  const noRecordsBlock = (what) => `${illustration()}<p class="ttl">No ${what} Records</p>`;
  const niValue = (big) => `<span class="ni${big ? ' v' : ''}">${ic('hide16')}Not Included</span>`;

  function tabsHtml(tabs, active) {
    return `<div class="tabs" role="tablist">${tabs.map((t) =>
      `<button class="tab${t.key === active ? ' active' : ''}" role="tab" style="width:${t.w}px" data-act="tab" data-tab="${t.key}">${esc(t.label)}</button>`).join('')}</div>`;
  }

  function stickyShadow(scroller, sticky) {
    const update = () => sticky.classList.toggle('stuck', sticky.getBoundingClientRect().top <= scroller.getBoundingClientRect().top + (parseFloat(getComputedStyle(sticky).top) || 0) + 0.5 && scroller.scrollTop > 0);
    scroller.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* =========================================================
     LOGIN  (100 · 102 · 103 · 200)
     ========================================================= */
  function LoginView(opts = {}) {
    const s = { value: opts.value || '', focus: false, show: false, error: !!opts.error, loading: false };
    const el = html(`
      <section class="view" data-screen="login">
        ${brandHeader()}
        <div class="scroll">
          <div class="login">
            <img class="lock" src="assets/icons/lock48.svg" width="48" height="48" alt="">
            <h2>Access Data Package</h2>
            <p class="sub">Please enter password to view the data package</p>
            <form novalidate>
              <div class="field">
                <input type="password" placeholder="Password" autocomplete="current-password" aria-label="Password" enterkeyhint="go">
                <div class="icons">
                  <button type="button" data-act="eye" aria-label="Show password">${ic('show')}</button>
                </div>
              </div>
              <p class="field-error" hidden>Password is incorrect or link has expired</p>
              <button class="btn-primary" type="submit">View Package</button>
            </form>
          </div>
        </div>
      </section>`);
    const field = el.querySelector('.field');
    const input = el.querySelector('input');
    const eyeBtn = el.querySelector('[data-act=eye]');
    const err = el.querySelector('.field-error');
    const submit = el.querySelector('.btn-primary');
    input.value = s.value;

    function paint() {
      field.classList.toggle('focus', s.focus && !s.value && !s.error && !s.loading); // 102 – focused, empty
      field.classList.toggle('error', s.error && !s.loading);                         // 200
      field.classList.toggle('disabled', s.loading);                                  // 103
      input.disabled = s.loading;
      input.type = s.show ? 'text' : 'password';
      eyeBtn.innerHTML = ic(s.show ? 'hide16' : 'show');
      err.hidden = !s.error || s.loading;
      submit.classList.toggle('loading', s.loading);
      submit.innerHTML = s.loading ? `<img class="spin" src="assets/icons/loading.svg" width="24" height="24" alt="Loading">` : 'View Package';
    }
    field.addEventListener('click', (e) => { if (!e.target.closest('button')) input.focus(); });
    input.addEventListener('focus', () => { s.focus = true; paint(); });
    input.addEventListener('blur', () => { s.focus = false; paint(); });
    input.addEventListener('input', () => { s.value = input.value; s.error = false; paint(); });
    eyeBtn.addEventListener('click', () => { s.show = !s.show; paint(); input.focus(); });
    el.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (s.loading) return;
      if (!s.value) { input.focus(); return; }
      input.blur();
      s.loading = true; paint();
      if (opts.hold) return;
      setTimeout(() => {
        if (s.value.trim().toLowerCase() === PACKAGE.password) {
          reset([PackageView()]);
          syncNav('104');
        } else { s.loading = false; s.error = true; paint(); syncNav('200'); }
      }, 1400);
    });
    paint();
    return {
      el, type: 'login',
      onShow() {
        if (opts.loading) { s.loading = true; paint(); }
        if (opts.focus && !isTouch()) setTimeout(() => input.focus(), 50);
        else if (opts.focus) { s.focus = true; paint(); }
      },
    };
  }
  const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

  /* =========================================================
     DATA PACKAGE  (104 · 105 · 106 · 300 · 301 · 500 · 600 · 700 · 701)
     ========================================================= */
  function PackageView(opts = {}) {
    const s = {
      tab: opts.tab || 'assets',
      expanded: !!opts.expanded,
      q: { assets: opts.query || '', documents: '' },
      applied: { assets: opts.query && !opts.typing ? opts.query : '', documents: '' },
      loading: !!opts.searchLoading,
      selected: new Set(opts.selectAll ? docs.map((d) => d.id) : []),
      selAssets: new Set(opts.selectAllAssets ? assets.map((a) => a.id) : []), // selecting an asset downloads all its documents
      limit: PAGE,
    };
    const el = html(`
      <section class="view" data-screen="package">
        ${brandHeader()}
        <div class="scroll">
          <div class="pkg-top"></div>
          <div class="sticky"></div>
          <div class="list pad-bottom"></div>
        </div>
        <div class="footer" hidden></div>
      </section>`);
    const scroller = el.querySelector('.scroll');
    const topEl = el.querySelector('.pkg-top');
    const stickyEl = el.querySelector('.sticky');
    const listEl = el.querySelector('.list');
    const footer = el.querySelector('.footer');
    let searchTimer;

    const assetResults = () => {
      const q = s.applied.assets.trim().toLowerCase();
      return q ? assets.filter((a) => a.serialNo.toLowerCase().includes(q) || a.partNo.toLowerCase().includes(q)) : assets;
    };
    const docResults = () => {
      const q = s.applied.documents.trim().toLowerCase();
      return q ? docs.filter((d) => docMatches(d, q)) : docs;
    };

    function renderTop() {
      topEl.innerHTML = `
        <button class="pkg-title" data-act="toggle-desc" aria-expanded="${s.expanded}">${esc(PACKAGE.name)} ${ic(s.expanded ? 'arrowUp' : 'chevronDown')}</button>
        ${s.expanded ? `<p class="pkg-desc"><span>Created On: ${esc(PACKAGE.createdOn)}</span><span>Valid Until: ${esc(PACKAGE.validUntil)}</span></p>` : ''}`;
    }

    function renderSticky() {
      const isDocs = s.tab === 'documents';
      const notShared = isDocs && !state.docsShared;
      const q = s.q[s.tab];
      const applied = s.applied[s.tab];
      let head;
      if (isDocs) {
        head = notShared
          ? `<div class="list-head bordered"><span class="label">Document List</span></div>`
          : `<div class="list-head"><button class="cb" data-act="select-all" role="checkbox" aria-checked="${selectAllAria(s.selected.size, docs.length)}" aria-label="Select all">${selectAllIcon(s.selected.size, docs.length)}</button><span class="label">Document List</span><span class="count">${countText(docResults().length, 'Documents', applied)}</span></div>`;
      } else {
        head = `<div class="list-head">${state.docsShared ? `<button class="cb" data-act="select-all" role="checkbox" aria-checked="${selectAllAria(s.selAssets.size, assets.length)}" aria-label="Select all">${selectAllIcon(s.selAssets.size, assets.length)}</button>` : ''}<span class="label">Asset List</span><span class="count">${s.loading ? '' : countText(assetResults().length, 'Assets', applied)}</span></div>`;
      }
      stickyEl.innerHTML = `
        ${tabsHtml([{ key: 'assets', label: 'Assets (100)', w: 85 }, { key: 'documents', label: 'Documents (1100)', w: 129 }], s.tab)}
        ${notShared ? '' : `<label class="search">
          ${ic('search')}
          <input type="search" value="${esc(q)}" placeholder="Search by Serial No. or Part No." aria-label="Search" enterkeyhint="search">
          <button class="clear" type="button" data-act="clear-search" aria-label="Clear search"${q ? '' : ' hidden'}>${ic('close')}</button>
        </label>`}
        ${head}`;
      if (notShared) stickyEl.lastElementChild.style.marginTop = '16px';
      const input = stickyEl.querySelector('input');
      if (input) {
        const bar = input.closest('.search');
        input.addEventListener('focus', () => bar.classList.add('focus'));
        input.addEventListener('blur', () => bar.classList.remove('focus'));
        input.addEventListener('input', () => onQuery(input.value));
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); runSearch(true); } });
      }
    }
    function countText(n, noun, applied) {
      if (applied && !n) return '';
      if (applied) return `${n} result${n === 1 ? '' : 's'} for “${esc(applied)}”`;
      return `${n} ${noun}`;
    }

    function onQuery(v) {
      s.q[s.tab] = v;
      stickyEl.querySelector('.clear').hidden = !v;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => runSearch(), 450); // 700 → 701
    }
    function runSearch(now) {
      clearTimeout(searchTimer);
      if (s.applied[s.tab] === s.q[s.tab]) return;
      s.loading = true; // 701 – skeleton
      s.limit = PAGE;
      renderList(); updateCount();
      setTimeout(() => {
        s.applied[s.tab] = s.q[s.tab];
        s.loading = false;
        renderList(); updateCount();
      }, now ? 500 : 800);
    }
    function updateCount() {
      const c = stickyEl.querySelector('.count');
      if (!c) return;
      if (s.tab === 'documents') c.innerHTML = countText(docResults().length, 'Documents', s.applied.documents);
      else c.innerHTML = s.loading ? '' : countText(assetResults().length, 'Assets', s.applied.assets);
    }

    const assetRow = (a) => `
      <div class="row asset-row${state.docsShared ? ' selectable' : ''}" role="button" tabindex="0" data-act="open-asset" data-id="${a.id}">
        ${state.docsShared ? `<button class="cb" data-act="select" data-id="${a.id}" aria-label="Select asset">${ic(s.selAssets.has(a.id) ? 'checkbox' : 'checkboxBlank')}</button>` : ''}
        <span class="line1">${ic('part20', 20)}<span>${esc(a.title)}</span></span>
        <span class="docs">${ic('file')}${a.docs}</span>
        <span class="desc">${esc(a.description)}</span>
        ${ic('chevronRight', 16, 16, 'chev')}
      </div>`;
    const docRow = (d) => {
      const a = assetById(d.assetId);
      return `
      <div class="row doc-row" role="button" tabindex="0" data-act="open-doc" data-id="${d.id}">
        <button class="cb" data-act="select" data-id="${d.id}" aria-label="Select document">${ic(s.selected.has(d.id) ? 'checkbox' : 'checkboxBlank')}</button>
        <span class="t">${docTitle(d)}</span>
        <span class="a">${ic('part20', 16)}<span>${assetLine(a)}</span></span>
        ${ic('chevronRight', 16, 16, 'chev')}
      </div>`;
    };
    const skeleton = () => Array.from({ length: 3 }, () => `<div class="row skel shimmer"><i></i><i></i></div>`).join('');

    function renderList() {
      const isDocs = s.tab === 'documents';
      listEl.classList.remove('fill');
      if (isDocs && !state.docsShared) { // 500
        listEl.classList.add('fill');
        listEl.innerHTML = `<div class="empty-card">${notIncludedBlock()}</div>`;
        footer.hidden = true;
        return;
      }
      if (s.loading) { markEmptyHead(stickyEl, false); refreshSelectAll(); listEl.innerHTML = `<div class="rows">${skeleton()}</div>`; renderFooter(); return; }
      const items = isDocs ? docResults() : assetResults();
      markEmptyHead(stickyEl, !items.length);
      if (items.length) refreshSelectAll(); // restore empty / indeterminate / checked
      if (!items.length) {
        listEl.classList.add('fill');
        listEl.innerHTML = `<div class="empty-card">${noResultsBlock(s.applied[s.tab])}</div>`;
      } else {
        const shown = items.slice(0, s.limit);
        listEl.innerHTML = `<div class="rows">${shown.map(isDocs ? docRow : assetRow).join('')}</div>${items.length > s.limit ? '<div class="list-loader" hidden></div>' : ''}`;
      }
      renderFooter();
    }
    function appendMore() {
      const isDocs = s.tab === 'documents';
      const items = isDocs ? docResults() : assetResults();
      const loader = listEl.querySelector('.list-loader');
      if (!loader || s.appending) return;
      s.appending = true;
      loader.hidden = false;
      loader.innerHTML = Array.from({ length: 2 }, () => '<div class="row skel shimmer" aria-hidden="true"><i></i><i></i></div>').join(''); // skeleton, same as search loading
      setTimeout(() => {
        const from = s.limit;
        s.limit += PAGE;
        listEl.querySelector('.rows').insertAdjacentHTML('beforeend', items.slice(from, s.limit).map(isDocs ? docRow : assetRow).join(''));
        if (items.length <= s.limit) loader.remove(); else loader.hidden = true;
        s.appending = false;
      }, 450);
    }
    // The current tab's selection; the asset list selects assets, the document list documents.
    const sel = () => (s.tab === 'documents' ? s.selected : s.selAssets);
    const selTotal = () => (s.tab === 'documents' ? docs.length : assets.length);
    // Documents a download would include: the selected documents, or every document of the selected assets.
    const docCount = () => (s.tab === 'documents' ? s.selected.size : [...s.selAssets].reduce((n, id) => n + assetById(id).docs, 0));
    // The download bar only appears once at least one document or asset is selected.
    function renderFooter() {
      const n = sel().size, d = docCount();
      footer.hidden = !(state.docsShared && n > 0);
      footer.innerHTML = `<span class="txt">${s.tab === 'documents' ? '' : `${n} Asset${n === 1 ? '' : 's'} · `}${d} Document${d === 1 ? '' : 's'}</span>
        <button class="btn-primary" data-act="download">${lineIc('downloadMaterial')}Download</button>`;
    }
    function renderAll() { renderTop(); renderSticky(); renderList(); }

    scroller.addEventListener('scroll', () => {
      if (scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 280) appendMore();
    }, { passive: true });

    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;
      if (act === 'toggle-desc') { s.expanded = !s.expanded; renderTop(); syncNav(s.expanded ? '301' : '300'); }
      else if (act === 'tab') {
        if (s.tab === t.dataset.tab) return;
        s.tab = t.dataset.tab; s.limit = PAGE; s.loading = false;
        renderSticky(); renderList();
        const sticky = stickyEl.offsetTop;
        if (scroller.scrollTop > sticky) scroller.scrollTop = sticky;
        syncNav(s.tab === 'documents' ? (state.docsShared ? '105' : '500') : '104');
      } else if (act === 'clear-search') {
        e.preventDefault();
        s.q[s.tab] = ''; s.applied[s.tab] = ''; s.loading = false; s.limit = PAGE;
        renderSticky(); renderList();
        stickyEl.querySelector('input').focus();
      } else if (act === 'open-asset') {
        push(AssetView(assetById(t.dataset.id)));
        syncNav(assetById(t.dataset.id).profile === 'full' ? '401' : assetById(t.dataset.id).profile === 'notIncluded' ? '501' : '506');
      } else if (act === 'select') {
        e.stopPropagation();
        const id = t.dataset.id, set = sel();
        set.has(id) ? set.delete(id) : set.add(id);
        t.innerHTML = ic(set.has(id) ? 'checkbox' : 'checkboxBlank');
        refreshSelectAll(); renderFooter();
      } else if (act === 'select-all') {
        const isDocs = s.tab === 'documents';
        const all = sel().size === selTotal();
        const next = new Set(all ? [] : (isDocs ? docs : assets).map((x) => x.id));
        if (isDocs) s.selected = next; else s.selAssets = next;
        listEl.querySelectorAll('[data-act=select]').forEach((b) => { b.innerHTML = ic(next.has(b.dataset.id) ? 'checkbox' : 'checkboxBlank'); });
        refreshSelectAll(); renderFooter();
        syncNav(isDocs ? (all ? '105' : '106') : (all ? '104' : '104b'));
      } else if (act === 'open-doc') {
        push(ViewerView(docs.find((d) => d.id === t.dataset.id)));
        syncNav('601');
      } else if (act === 'download') { download(t, docCount()); }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('.doc-row, .asset-row')) e.target.click(); });
    function refreshSelectAll() {
      const b = stickyEl.querySelector('[data-act=select-all]');
      if (b) { b.innerHTML = selectAllIcon(sel().size, selTotal()); b.setAttribute('aria-checked', selectAllAria(sel().size, selTotal())); }
    }

    renderAll();
    return {
      el, type: 'package',
      onShow() {
        stickyShadow(scroller, stickyEl);
        if (opts.typing) {
          const i = stickyEl.querySelector('input');
          if (i) { i.closest('.search').classList.add('focus'); if (!isTouch()) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
        }
        if (opts.searchLoading) { s.loading = true; renderList(); updateCount(); }
      },
      refresh() { renderAll(); },
    };
  }

  // No results: the select-all checkbox is disabled and the header keeps its bottom divider.
  function markEmptyHead(scope, empty) {
    const head = scope.querySelector('.list-head');
    if (!head) return;
    head.classList.toggle('no-results', empty);
    const cb = head.querySelector('[data-act=select-all]');
    if (cb) {
      cb.disabled = empty; cb.setAttribute('aria-disabled', String(empty));
      if (empty) cb.innerHTML = ic('checkboxDisabled'); // 974:22600 – Icon/16px/Check-Box-Disable
      else if (cb.querySelector('img[src*=checkboxDisabled]')) cb.innerHTML = selectAllIcon(0, 1);
    }
  }

  function download(btn, n) {
    if (btn.classList.contains('loading')) return;
    const label = btn.innerHTML;
    btn.classList.add('loading');
    btn.style.minWidth = btn.offsetWidth + 'px';
    btn.innerHTML = `<img class="spin" src="assets/icons/loading.svg" width="24" height="24" alt="Preparing">`;
    setTimeout(() => {
      btn.classList.remove('loading'); btn.innerHTML = label;
      toast(`Downloading ${n} document${n === 1 ? '' : 's'} as ZIP`);
    }, 1300);
  }

  /* =========================================================
     ASSET PROFILE  (401–405 · 501–508)
     ========================================================= */
  const ASSET_TABS = [
    { key: 'overview', label: 'Overview', w: 85 },
    { key: 'b2b', label: 'Back-to-Birth', w: 90 },
    { key: 'documents', label: 'Documents', w: 85 },
    { key: 'logistics', label: 'Logistics', w: 85 },
  ];

  function AssetView(asset, opts = {}) {
    const full = asset.profile === 'full';
    const ni = asset.profile === 'notIncluded';
    const s = { tab: opts.tab || 'overview', logLimit: PAGE, mapView: false, selected: new Set(), q: '', applied: '', loading: false };
    const assetDocs = docsForAsset(asset.id);
    // Same header for every asset, whether or not its data was shared (501–508 updated in Figma).
    const header = `<header class="header asset">
          <button class="back" data-act="back" aria-label="Back">${ic('back24', 24)}</button>
          <div class="title">${ic('part24', 24)}<span>Part - ${esc(asset.serialNo)}</span></div>
          <button class="icon-btn info" data-act="info" aria-label="Asset information">${lineIc('listAlt', 20)}</button>
        </header>`;
    const el = html(`
      <section class="view" data-screen="asset">
        ${header}
        <div class="scroll">
          <div class="sticky asset-tabs-wrap"></div>
          <div class="tab-body"></div>
        </div>
        <div class="footer" hidden></div>
      </section>`);
    const scroller = el.querySelector('.scroll');
    const tabsEl = el.querySelector('.sticky');
    const body = el.querySelector('.tab-body');
    const footer = el.querySelector('.footer');

    const kv = (k, v, raw) => `<div class="kv"><span class="k">${esc(k)}</span>${ni ? niValue() : `<span class="v">${raw ? v : esc(v)}</span>`}${asset.updatedOn && !ni ? `<span class="d">${esc(asset.updatedOn)}</span>` : ''}</div>`;

    function overview() {
      const r = asset.overviewRoles;
      let logistic;
      if (ni) logistic = `<div class="empty-card" style="min-height:0;border:0;padding:20px 16px 36px">${notIncludedBlock()}</div>`;           // 501
      else if (asset.profile === 'noRecords') logistic = `<div class="empty-card" style="min-height:308px;border:0">${noRecordsBlock('Logistics')}</div>`; // 506
      else logistic = `${mapHtml()}
        <div class="t-foot map-foot"><button data-act="view-all">View All</button><span>Last Updated on ${esc(asset.logisticsUpdated)}</span></div>`;
      const dated = asset.updatedOn && !ni ? ' dated' : '';
      return `<div class="content">
        <div class="card"><div class="card-head">Time &amp; Cycle</div><div class="card-body"><div class="kv-grid${dated}">${kv('TSN', asset.time.tsn)}${kv('CSN', asset.time.csn)}</div></div></div>
        <div class="card"><div class="card-head">Roles</div><div class="card-body"><div class="kv-grid${ni ? ' rg12' : ''}${dated}">
          ${kv('OEM', r.oem)}${kv('Digital Asset Manager', r.dam)}${kv('Owner', r.owner)}${kv('Operator', r.operator)}${kv('Asset Manager', r.assetManager)}${kv('CAMO', r.camo)}
        </div></div></div>
        <div class="card"><div class="card-head">Logistic Status</div>${logistic}</div>
      </div>`;
    }
    const mapHtml = () => `
      <div class="map" data-zoom="1">
        <img class="mapimg" src="assets/img/map.png" alt="Map showing the asset location around Bangkok, Thailand">
        <div class="map-ctrl">
          <img src="assets/img/map-controller.svg" width="40" height="124" alt="">
          <button class="hit" style="top:0;height:40px" data-act="map-locate" aria-label="Re-center map"></button>
          <button class="hit" style="top:48px;height:38px" data-act="map-zoom" data-d="1" aria-label="Zoom in"></button>
          <button class="hit" style="top:86px;height:38px" data-act="map-zoom" data-d="-1" aria-label="Zoom out"></button>
        </div>
      </div>`;

    function b2b() {
      if (!full) {
        return `<div class="content fill"><div class="fill-col">
          <div class="list-head bordered"><span class="label">Events</span></div>
          <div class="empty-card">${ni ? notIncludedBlock() : noRecordsBlock('Back-to-Birth')}</div></div></div>`; // 502 / 507
      }
      // Like Logistics: every event is listed (no pagination); the page scrolls vertically, the table horizontally.
      const ev = asset.events;
      const cols = '<colgroup><col style="width:109px"><col style="width:100px"><col style="width:100px"><col style="width:120px"><col style="width:150px"></colgroup>';
      return `<div class="content"><div class="table-card">
        <div class="t-sticky">
          <div class="card-head tight">Events<span class="count">${ev.length} Events</span></div>
          <div class="thead-scroll"><table class="dt" style="width:579px">${cols}
            <thead><tr><th>Event Date</th><th>Event Type</th><th>Description</th><th>Ref. Document</th><th>Performed By</th></tr></thead>
          </table></div>
        </div>
        <div class="hscroll"><table class="dt" style="width:579px">${cols}
          <tbody>${ev.map((e) => `<tr><td>${esc(e.date)}</td><td>${esc(e.type)}</td><td>${esc(e.description)}</td><td class="link">${esc(e.ref)}</td><td>${esc(e.by)}</td></tr>`).join('')}</tbody>
        </table></div>
        <div class="hbar"><i></i></div>
        <div class="t-foot right">Last Updated on ${esc(asset.logisticsUpdated)}</div>
      </div></div>`;
    }

    function documentsTab() {
      if (ni) return `<div class="content fill"><div class="fill-col"><div class="list-head bordered"><span class="label">Document List</span></div><div class="empty-card">${notIncludedBlock()}</div></div></div>`; // 503
      const q = s.applied.trim().toLowerCase();
      const list = q ? assetDocs.filter((d) => docMatches(d, q)) : assetDocs;
      const noResults = !s.loading && s.applied && !list.length;
      return `<div class="content${noResults ? ' fill' : ''}" style="gap:0">
        <div class="t-sticky docs-sticky">
        <label class="search" style="margin-top:0">${ic('search')}<input type="search" value="${esc(s.q)}" placeholder="Search by Serial No. or Part No." aria-label="Search documents" enterkeyhint="search"><button class="clear" type="button" data-act="clear-search"${s.q ? '' : ' hidden'}>${ic('close')}</button></label>
        <div class="list-head${noResults ? ' no-results' : ''}"><button class="cb" data-act="select-all" role="checkbox" aria-checked="${selectAllAria(s.selected.size, assetDocs.length)}" aria-label="Select all"${noResults ? ' disabled aria-disabled="true"' : ''}>${noResults ? ic('checkboxDisabled') : selectAllIcon(s.selected.size, assetDocs.length)}</button><span class="label">Document List</span><span class="count">${s.applied ? (list.length ? `${list.length} result${list.length === 1 ? '' : 's'} for “${esc(s.applied)}”` : '') : `${assetDocs.length} Documents`}</span></div>
        </div>
        <div class="rows"${noResults ? ' hidden' : ''}>${s.loading ? Array.from({ length: 3 }, () => '<div class="row skel shimmer"><i></i><i></i></div>').join('') : list.map((d) => `
          <div class="row doc-row in-asset" role="button" tabindex="0" data-act="open-doc" data-id="${d.id}">
            <button class="cb" data-act="select" data-id="${d.id}" aria-label="Select document">${ic(s.selected.has(d.id) ? 'checkbox' : 'checkboxBlank')}</button>
            <span class="t">${docTitle(d)}</span>
            <span class="a">${ic('part20', 16)}<span>${assetLine(asset, true)}</span></span>
            ${ic('chevronRight', 16, 16, 'chev')}
          </div>`).join('')}</div>
        ${noResults ? `<div class="empty-card">${noResultsBlock(s.applied)}</div>` : ''}
      </div>`;
    }

    const logRow = (l) => `<tr><td>${esc(l.date)}</td><td class="lg">${esc(l.humidity)}</td><td class="lg">${esc(l.temperature)}</td></tr>`;
    // Same loading pattern as the package lists: 20 records, then 20 more each time you reach the bottom.
    function appendLogistics() {
      const loader = body.querySelector('.t-loader');
      if (!loader || s.appending) return;
      s.appending = true;
      loader.hidden = false;
      loader.innerHTML = Array.from({ length: 3 }, () => '<div class="t-skel shimmer" aria-hidden="true"><i></i><i></i><i></i></div>').join(''); // skeleton rows in the table's columns
      setTimeout(() => {
        const from = s.logLimit;
        s.logLimit += PAGE;
        body.querySelector('tbody').insertAdjacentHTML('beforeend', asset.logistics.slice(from, s.logLimit).map(logRow).join(''));
        if (asset.logistics.length <= s.logLimit) loader.remove(); else loader.hidden = true;
        s.appending = false;
      }, 450);
    }
    scroller.addEventListener('scroll', () => {
      if (s.tab === 'logistics' && !s.mapView && scroller.scrollTop + scroller.clientHeight > scroller.scrollHeight - 280) appendLogistics();
    }, { passive: true });

    function logisticsTab() {
      if (!full) return `<div class="content fill"><div class="fill-col"><div class="list-head bordered"><span class="label">Logistics Records</span></div><div class="empty-card">${ni ? notIncludedBlock() : noRecordsBlock('Logistics')}</div></div></div>`; // 505 / 508
      const cols = '<colgroup><col style="width:109px"><col style="width:100px"><col></colgroup>';
      return `<div class="content${s.mapView ? ' fill' : ''}"><div class="table-card${s.mapView ? ' map-fill' : ''}">
        <div class="t-sticky">
          <div class="card-head tight" style="padding-right:0">Logistics Records
            <button class="mapview-btn" data-act="mapview">${ic('map')}${s.mapView ? 'List View' : 'Map View'}</button></div>
          ${s.mapView ? '' : `<div class="thead-scroll"><table class="dt" style="width:100%">${cols}
            <thead><tr><th>Date</th><th>Humidity</th><th>Temperature</th></tr></thead>
          </table></div>`}
        </div>
        ${s.mapView ? mapHtml() : `<div class="hscroll"><table class="dt" style="width:100%">${cols}
          <tbody>${asset.logistics.slice(0, s.logLimit).map(logRow).join('')}</tbody>
        </table></div>
        ${asset.logistics.length > s.logLimit ? '<div class="t-loader" hidden></div>' : ''}`}
        <div class="t-foot right">Last Updated on ${esc(asset.logisticsUpdated)}</div>
      </div></div>`;
    }

    function renderFooter() {
      const show = s.tab === 'documents' && !ni && s.selected.size > 0;
      footer.hidden = !show;
      if (show) footer.innerHTML = `<span class="txt">${s.selected.size} Document${s.selected.size === 1 ? '' : 's'}</span><button class="btn-primary" data-act="download">${lineIc('downloadMaterial')}Download</button>`;
    }

    function render() {
      const typing = document.activeElement && document.activeElement.matches('.tab-body .search input');
      tabsEl.innerHTML = tabsHtml(ASSET_TABS, s.tab);
      body.innerHTML = { overview, b2b, documents: documentsTab, logistics: logisticsTab }[s.tab]();
      renderFooter();
      wireTable();
      const input = body.querySelector('.search input');
      if (input && typing) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); input.closest('.search').classList.add('focus'); } // keep the keyboard open while results refresh
      if (input) {
        const bar = input.closest('.search');
        let t;
        input.addEventListener('focus', () => bar.classList.add('focus'));
        input.addEventListener('blur', () => bar.classList.remove('focus'));
        input.addEventListener('input', () => {
          s.q = input.value; bar.querySelector('.clear').hidden = !s.q;
          clearTimeout(t);
          t = setTimeout(() => { s.loading = true; render(); setTimeout(() => { s.applied = s.q; s.loading = false; render(); }, 600); }, 450);
        });
      }
    }
    function wireTable() {
      // Table headers stick right under the tab bar, like the list headers on the package screen.
      const head = body.querySelector('.t-sticky');
      if (head) {
        if (scroller._tableStuck) scroller.removeEventListener('scroll', scroller._tableStuck);
        scroller._tableStuck = () => head.classList.toggle('stuck', head.getBoundingClientRect().top <= tabsEl.getBoundingClientRect().bottom + 0.5 && scroller.scrollTop > 0);
        scroller.addEventListener('scroll', scroller._tableStuck, { passive: true });
        scroller._tableStuck();
      }
      const hs = body.querySelector('.hscroll');
      const hh = body.querySelector('.thead-scroll');
      if (hs && hh) {
        // Column headers follow the rows when the table is swiped sideways (from either part).
        let lock = false;
        const sync = (from, to) => () => { if (lock) return; lock = true; to.scrollLeft = from.scrollLeft; requestAnimationFrame(() => (lock = false)); };
        hs.addEventListener('scroll', sync(hs, hh), { passive: true });
        hh.addEventListener('scroll', sync(hh, hs), { passive: true });
      }
      const bar = body.querySelector('.hbar');
      if (!hs || !bar) return;
      const thumb = bar.querySelector('i');
      const update = () => {
        const track = bar.clientWidth;
        const ratio = hs.clientWidth / hs.scrollWidth;
        if (ratio >= 1) { bar.style.visibility = 'hidden'; return; }
        const w = Math.max(40, track * ratio);
        thumb.style.width = w + 'px';
        thumb.style.transform = `translateX(${(hs.scrollLeft / (hs.scrollWidth - hs.clientWidth)) * (track - w)}px)`;
      };
      hs.addEventListener('scroll', update, { passive: true });
      requestAnimationFrame(update);
    }

    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;
      if (act === 'back') history.back();
      else if (act === 'tab') {
        s.tab = t.dataset.tab; render();
        if (scroller.scrollTop > tabsEl.offsetTop) scroller.scrollTop = tabsEl.offsetTop;
        const map = { overview: ['401', '501', '506'], b2b: ['402', '502', '507'], documents: ['403', '503', '403'], logistics: ['404', '505', '508'] };
        syncNav(map[s.tab][full ? 0 : ni ? 1 : 2]);
      } else if (act === 'info') { openAssetInfo(el, asset); syncNav(ni ? '504' : '405'); }
      else if (act === 'mapview') { s.mapView = !s.mapView; render(); }
      else if (act === 'view-all') { el.querySelector('[data-tab=logistics]').click(); }
      else if (act === 'map-zoom' || act === 'map-locate') {
        const m = t.closest('.map');
        let z = +m.dataset.zoom;
        z = act === 'map-locate' ? 1 : Math.min(2.5, Math.max(0.6, z + (+t.dataset.d) * 0.3));
        m.dataset.zoom = z;
        m.querySelector('.mapimg').style.transform = `scale(${z})`;
      } else if (act === 'clear-search') { e.preventDefault(); s.q = ''; s.applied = ''; render(); }
      else if (act === 'select') {
        e.stopPropagation();
        const id = t.dataset.id;
        s.selected.has(id) ? s.selected.delete(id) : s.selected.add(id);
        render();
      } else if (act === 'select-all') {
        s.selected = new Set(s.selected.size === assetDocs.length ? [] : assetDocs.map((d) => d.id));
        render();
      } else if (act === 'open-doc') { push(ViewerView(docs.find((d) => d.id === t.dataset.id))); syncNav('601'); }
      else if (act === 'download') download(t, s.selected.size);
    });

    render();
    return {
      el, type: 'asset',
      onShow() { stickyShadow(scroller, tabsEl); if (opts.info) openAssetInfo(el, asset, false); },
    };
  }

  /* Asset information panel – 405 / 504 (same full-screen panel; unshared values show "Not Included") */
  function openAssetInfo(viewEl, a, animate = true) {
    const ni = a.profile === 'notIncluded';
    // Every field that has a value shows when it was last updated (same caption as the Overview tab).
    const has = (val) => !ni && val != null && val !== '' && val !== 'N/A';
    const dt = (val) => (has(val) && a.updatedOn ? `<span class="d">${esc(a.updatedOn)}</span>` : '');
    const v = (val) => (ni ? niValue(true) : `<span class="v">${esc(val)}</span>${dt(val)}`);
    const f = (k, val, cls = '') => `<div class="f ${cls}"><span class="k">${esc(k)}</span>${v(val)}</div>`;
    const yes = (val) => (ni ? niValue(true) : `<span class="v dot${val === 'Yes' ? '' : ' no'}">${esc(val)}</span>${dt(val)}`);
    const role = (k, org) => `<div class="f"><span class="k">${esc(k)}</span>${ni ? niValue(true) : `<span class="pill-row"><span class="pill">${esc(org.code)}</span><span class="v">${esc(org.name)}</span></span>${dt(org.name)}`}</div>`;
    const sec = (title, inner) => `<section class="sec"><button class="sec-toggle" data-act="sec" aria-expanded="true">${ic('caretDown')}${esc(title)}</button><div class="sec-body">${inner}</div></section>`;
    const ov = html(`
      <div class="overlay full" role="dialog" aria-modal="true" aria-label="Asset Information">
        <div class="dim" data-act="close-sheet"></div>
        <div class="sheet">
          <div class="sheet-head">Asset Information<button class="icon-btn" data-act="close-sheet" aria-label="Close">${ic('close20', 20)}</button></div>
          <div class="scroll">
            ${sec('Details', `
              <div class="img-ph">${ic('partWhite32', 32)}</div>
              <div class="f-grid">
                <div class="f"><span class="k">Part No.</span><span class="v">${esc(a.partNo)}</span>${a.updatedOn ? `<span class="d">${esc(a.updatedOn)}</span>` : ''}</div>
                <div class="f"><span class="k">Serial No.</span><span class="v">${esc(a.serialNo)}</span>${a.updatedOn ? `<span class="d">${esc(a.updatedOn)}</span>` : ''}</div>
                ${f('Batch/Lot No.', a.batch, 'full')}${f('Description', a.description, 'full')}
                ${f('LLP', a.llp)}${f('Data Plate', a.dataPlate)}
                ${f('Manufacturer CAGE Code', a.cage)}${f('Country of Origin', a.country)}
                ${f('Date of Manufacture', a.manufactured)}${f('Gross Weight', a.weight)}
                ${f('Condition Status', a.condition, 'full')}
              </div>`)}
            ${sec('Installation Details', `
              <div class="f-grid rg12">
                <div class="f"><span class="k">Installed On</span>${ni ? niValue(true) : `<button class="v link" data-act="msn">${ic('part24', 24)}${esc(a.installedOn)}</button>${dt(a.installedOn)}`}</div>
                ${f('A/C Reg. No.', a.acReg)}${f('Position', a.position)}${f('ATA', a.ata)}
                ${f('Ex MSN', a.exMsn)}${f('Ex MSN Model', a.exMsnModel)}${f('Ex ESN', a.exEsn)}${f('Ex ESN Model', a.exEsnModel)}
              </div>`)}
            ${sec('Time & Cycle', `
              <div class="f-grid rg12">
                ${f('TSN', a.time.tsn)}${f('CSN', a.time.csn)}${f('TSR', a.time.tsr)}${f('CSR', a.time.csr)}
                ${f('TSO', a.time.tso)}${f('CSO', a.time.cso)}${f('TS-INSP', a.time.tsInsp)}${f('CS-INSP', a.time.csInsp)}
              </div>`)}
            ${sec('Availability', `
              <div class="f-grid rg12">
                <div class="f"><span class="k">Available for Sale</span>${yes(a.availability.sale)}</div>
                <div class="f"><span class="k">Available for Lease</span>${yes(a.availability.lease)}</div>
                <div class="f full"><span class="k">Available for Exchange</span>${yes(a.availability.exchange)}</div>
              </div>`)}
            ${sec('Roles', `
              <div class="f-grid one rg12">
                ${role('OEM', a.roles.oem)}${role('Digital Asset Manager', a.roles.dam)}${role('Owner', a.roles.owner)}
                ${role('Operator', a.roles.operator)}${role('Asset Manager', a.roles.assetManager)}${role('CAMO', a.roles.camo)}
              </div>`)}
          </div>
        </div>
      </div>`);
    ov.querySelector('.dim').style.display = 'none';
    viewEl.appendChild(ov);
    if (animate) { ov.getBoundingClientRect(); ov.classList.add('open'); }
    else { ov.querySelectorAll('.sheet,.dim').forEach((n) => (n.style.transition = 'none')); ov.classList.add('open'); requestAnimationFrame(() => ov.querySelectorAll('.sheet,.dim').forEach((n) => (n.style.transition = ''))); }
    ov.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      if (t.dataset.act === 'close-sheet') {
        ov.classList.remove('open');
        setTimeout(() => ov.remove(), 320);
        syncNav(ni ? '501' : '401');
      } else if (t.dataset.act === 'sec') {
        const sc = t.closest('.sec');
        sc.classList.toggle('collapsed');
        t.setAttribute('aria-expanded', String(!sc.classList.contains('collapsed')));
      } else if (t.dataset.act === 'msn') toast(`${a.installedOn} (${a.acReg}) isn’t part of this data package`);
    });
  }

  /* =========================================================
     DOCUMENT VIEWER  (601 · thumbnails · details)
     ========================================================= */
  function ViewerView(doc, opts = {}) {
    const s = { page: 1, rot: 0, zoom: 1, sidebar: !!opts.sidebar, details: !!opts.details };
    const asset = assetById(doc.assetId);
    const el = html(`
      <section class="view dark" data-screen="viewer">
        <div class="viewer-top">
          <div class="toolbar">
            <button class="tb" data-act="sidebar" aria-label="Pages" aria-pressed="false"><span class="tint" style="-webkit-mask-image:url(assets/icons/sidebar.svg);mask-image:url(assets/icons/sidebar.svg)"></span>${ic('sidebar', 20)}</button>
            <span class="vsep"></span>
            <div class="rot">
              <button data-act="rotate" data-d="-90" aria-label="Rotate left">${ic('rotateLeft', 20)}</button>
              <button data-act="rotate" data-d="90" aria-label="Rotate right">${ic('rotateRight', 20)}</button>
            </div>
            <div class="right">
              <button class="tb" data-act="download" aria-label="Download">${ic('downloadDark', 20)}</button>
              <button class="tb" data-act="details" aria-label="Document details">${lineIc('listAlt', 20)}</button>
              <span class="vsep"></span>
              <button class="tb" data-act="close" aria-label="Close viewer">${ic('close20', 20)}</button>
            </div>
          </div>
        </div>
        <div style="position:relative;flex:1;min-height:0;display:flex">
          <div class="stage-doc"><div class="doc-canvas"><div class="doc-page"><img src="assets/img/document.png" alt="${esc(doc.type)} page"></div></div></div>
          <span class="more-btn">${ic('more')}</span>
          <div class="paginator">
            <button data-act="pg" data-d="-1" aria-label="Previous page"></button>
            <span class="pg-label" aria-live="polite"></span>
            <button data-act="pg" data-d="1" aria-label="Next page"></button>
          </div>
          <div class="thumbs-scrim" data-act="sidebar"></div>
          <nav class="thumbs" aria-label="Pages">${Array.from({ length: doc.pages }, (_, i) => `
            <button data-act="goto" data-p="${i + 1}"><div class="th"><img src="assets/img/document.png" alt="" loading="lazy"></div><div class="n">${i + 1}</div></button>`).join('')}
          </nav>
        </div>
        <div class="details" style="top:var(--sb)">
          <div class="sheet-head">Document Details<button class="icon-btn" data-act="details" aria-label="Close details">${ic('close20', 20)}</button></div>
          <div class="body">
            <div class="f"><span class="k">Document ID</span><div class="copy"><span>${esc(doc.docId)}</span><button data-act="copy" aria-label="Copy document ID"><img src="assets/img/copy-link.png" width="16" height="16" alt=""></button></div></div>
            <div class="f"><span class="k">Document Type</span><span class="v">${esc(doc.type)}</span></div>
            <div class="f"><span class="k">Assigned Assets&nbsp;&nbsp;&nbsp;1 Asset</span>
              <button class="asset-link" data-act="asset">${ic('part24', 24)}PART ${esc(asset.partNo)} ${esc(asset.serialNo)}</button></div>
            <div class="kv-grid" style="row-gap:16px">
              <div class="f"><span class="k">Document No.</span><span class="v">${esc(doc.docNo)}</span></div>
              <div class="f"><span class="k">Revision No.</span><span class="v">${esc(doc.revision)}</span></div>
              <div class="f"><span class="k">Revision Date</span><span class="v">${esc(doc.revisionDate)}</span></div>
              <div class="f"><span class="k">CAGE Code</span><span class="v">${esc(doc.cage)}</span></div>
            </div>
            <div class="f"><span class="k">Issuer Organization</span><span class="v">${esc(doc.issuer)}</span></div>
          </div>
        </div>
      </section>`);
    const page = el.querySelector('.doc-page');
    const stage = el.querySelector('.stage-doc');
    function paint() {
      el.querySelector('.pg-label').textContent = `${s.page} / ${doc.pages}`;
      const [prev, next] = el.querySelectorAll('.paginator button');
      prev.innerHTML = ic('arrowLeft', 20); prev.disabled = s.page === 1;
      next.innerHTML = ic('arrowRight', 20); next.disabled = s.page === doc.pages;
      page.style.transform = `rotate(${s.rot}deg)`;
      page.style.width = s.zoom === 1 ? '' : `${100 * s.zoom}%`; // fills the width (24px margins); double-tap zooms in
      el.querySelector('.thumbs').classList.toggle('open', s.sidebar);
      el.querySelector('.thumbs-scrim').classList.toggle('open', s.sidebar);
      const sideBtn = el.querySelector('[data-act=sidebar].tb');
      sideBtn.classList.toggle('active', s.sidebar);
      sideBtn.setAttribute('aria-pressed', String(s.sidebar));
      el.querySelector('.details').classList.toggle('open', s.details);
      el.querySelectorAll('.thumbs button').forEach((b) => b.classList.toggle('active', +b.dataset.p === s.page));
    }
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;
      if (act === 'close') history.back();
      else if (act === 'sidebar') { s.sidebar = !s.sidebar; syncNav(s.sidebar ? '601b' : '601'); }
      else if (act === 'details') { s.details = !s.details; syncNav(s.details ? '601c' : '601'); }
      else if (act === 'rotate') s.rot += +t.dataset.d;
      else if (act === 'pg') { goPage(s.page + +t.dataset.d); return; }
      else if (act === 'goto') { goPage(+t.dataset.p); return; }
      else if (act === 'download') toast(`Downloading ${doc.number}.pdf`);
      else if (act === 'copy') { navigator.clipboard && navigator.clipboard.writeText(doc.docId).catch(() => {}); toast('Document ID copied'); }
      else if (act === 'asset') { push(AssetView(asset)); syncNav(asset.profile === 'full' ? '401' : '501'); return; }
      paint();
    });
    // Change page with a short slide in the direction of travel.
    function goPage(n) {
      n = Math.min(doc.pages, Math.max(1, n));
      if (n === s.page) { page.animate([{ translate: '0 0' }, { translate: `${n === 1 ? 12 : -12}px 0` }, { translate: '0 0' }], { duration: 220 }); return; } // nudge at the ends
      const dir = n > s.page ? 1 : -1;
      s.page = n; paint();
      page.animate([{ translate: `${dir * 60}px 0`, opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' });
      stage.scrollTo({ top: 0, left: 0 });
    }
    // Swipe left / right on the page to turn it (only when not zoomed in, so panning still works).
    let touch = null;
    stage.addEventListener('touchstart', (e) => { if (s.zoom === 1 && e.touches.length === 1) touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (!touch) return;
      const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goPage(s.page + (dx < 0 ? 1 : -1));
    }, { passive: true });
    // Double-tap / double-click to zoom the page.
    stage.addEventListener('dblclick', () => { s.zoom = s.zoom === 1 ? 2 : 1; paint(); });
    paint();
    return { el, type: 'viewer', instant: true }; // opens in place, no slide
  }

  /* =========================================================
     Prototype navigator (desktop only)
     ========================================================= */
  const SCREENS = [
    ['Login', [
      ['100', 'Enter password', () => reset([LoginView()])],
      ['102', 'Field focused', () => reset([LoginView({ focus: true })])],
      ['102b', 'Password typed', () => reset([LoginView({ value: 'blockaero1', focus: true })])],
      ['103', 'Verifying (loading)', () => reset([LoginView({ value: 'blockaero', loading: true, hold: true })])],
      ['200', 'Access denied', () => reset([LoginView({ value: 'expired1', error: true })])],
    ]],
    ['Data package', [
      ['104', 'Asset list', () => reset([PackageView()])],
      ['104b', 'Assets selected', () => reset([PackageView({ selectAllAssets: true })])],
      ['105', 'Document list', () => reset([PackageView({ tab: 'documents' })])],
      ['106', 'Documents selected', () => reset([PackageView({ tab: 'documents', selectAll: true })])],
      ['300', 'Package details collapsed', () => reset([PackageView()])],
      ['301', 'Package details expanded', () => reset([PackageView({ expanded: true })])],
    ]],
    ['Asset profile', [
      ['400', 'Asset list → open asset', () => reset([PackageView()])],
      ['401', 'Overview', () => reset([PackageView(), AssetView(assets[0])])],
      ['402', 'Back-to-Birth', () => reset([PackageView(), AssetView(assets[0], { tab: 'b2b' })])],
      ['403', 'Documents', () => reset([PackageView(), AssetView(assets[0], { tab: 'documents' })])],
      ['404', 'Logistics', () => reset([PackageView(), AssetView(assets[0], { tab: 'logistics' })])],
      ['405', 'Asset information', () => reset([PackageView(), AssetView(assets[0], { info: true })])],
    ]],
    ['Empty states', [
      ['500', 'Documents not included', () => { state.docsShared = false; reset([PackageView({ tab: 'documents' })]); }],
      ['501', 'Overview not included', () => reset([PackageView(), AssetView(assets[1])])],
      ['502', 'Back-to-Birth not included', () => reset([PackageView(), AssetView(assets[1], { tab: 'b2b' })])],
      ['503', 'Documents not included', () => reset([PackageView(), AssetView(assets[1], { tab: 'documents' })])],
      ['504', 'Asset info not included', () => reset([PackageView(), AssetView(assets[1], { info: true })])],
      ['505', 'Logistics not included', () => reset([PackageView(), AssetView(assets[1], { tab: 'logistics' })])],
      ['506', 'Overview, no logistics', () => reset([PackageView(), AssetView(assets[2])])],
      ['507', 'No Back-to-Birth records', () => reset([PackageView(), AssetView(assets[2], { tab: 'b2b' })])],
      ['508', 'No logistics records', () => reset([PackageView(), AssetView(assets[2], { tab: 'logistics' })])],
    ]],
    ['Document viewer', [
      ['600', 'Document list', () => reset([PackageView({ tab: 'documents' })])],
      ['601', 'Viewer', () => reset([PackageView({ tab: 'documents' }), ViewerView(docs[0])])],
      ['601b', 'Page thumbnails', () => reset([PackageView({ tab: 'documents' }), ViewerView(docs[0], { sidebar: true })])],
      ['601c', 'Document details', () => reset([PackageView({ tab: 'documents' }), ViewerView(docs.find((d) => d.id === PACKAGE.detailsDocId), { details: true })])],
    ]],
    ['Search', [
      ['700', 'Typing', () => reset([PackageView({ query: 'ABC-4562', typing: true })])],
      ['701', 'Loading results', () => reset([PackageView({ query: 'ABC-4562', typing: true, searchLoading: true })])],
      ['701b', 'Results', () => reset([PackageView({ query: 'ABC-4562' })])],
    ]],
  ];
  const navList = document.getElementById('nav-list');
  navList.innerHTML = SCREENS.map(([group, items]) => `
    <div class="nav-group"><h2>${group}</h2>${items.map(([id, label]) => `<button data-screen="${id}"><span>${id.replace(/[bc]$/, '')}</span>${label}</button>`).join('')}</div>`).join('');
  const allScreens = Object.fromEntries(SCREENS.flatMap(([, items]) => items.map(([id, , fn]) => [id, fn])));
  navList.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-screen]');
    if (!b) return;
    state.docsShared = true;
    allScreens[b.dataset.screen]();
    syncNav(b.dataset.screen);
  });
  function syncNav(id) {
    if (!id) return;
    navList.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.screen === id));
  }

  /* Screen list: collapses to the left; the choice is remembered in this browser. */
  const stageEl = document.getElementById('stage');
  const navClose = document.getElementById('nav-close');
  const navOpen = document.getElementById('nav-open');
  function setNav(open, remember = true) {
    stageEl.classList.toggle('nav-closed', !open);
    navClose.setAttribute('aria-expanded', String(open));
    navOpen.setAttribute('aria-expanded', String(open));
    if (remember) { try { localStorage.setItem('dp-nav-closed', open ? '0' : '1'); } catch (e) { /* storage unavailable */ } }
    fitDevice();
  }
  navClose.addEventListener('click', () => setNav(false));
  navOpen.addEventListener('click', () => setNav(true));
  document.getElementById('navigator').addEventListener('transitionend', fitDevice);

  /* Centre the phone in the space next to the list and scale it down if that space is too small. */
  function fitDevice() {
    const d = document.querySelector('.device');
    const canvas = document.querySelector('.canvas');
    const desktop = isDesktopFrame() && !document.documentElement.classList.contains('bare');
    const k = desktop ? Math.min(1, (canvas.clientHeight - 48) / 864, (canvas.clientWidth - 48) / 413) : 1;
    d.style.transform = k < 1 ? `scale(${k})` : '';
    d.style.margin = k < 1 ? `${(-844 * (1 - k)) / 2}px ${(-393 * (1 - k)) / 2}px` : '';
  }
  window.addEventListener('resize', fitDevice);
  let startClosed = false;
  try { startClosed = localStorage.getItem('dp-nav-closed') === '1'; } catch (e) { /* storage unavailable */ }
  setNav(!startClosed, false);

  /* ---------- boot ---------- */
  const start = new URLSearchParams(location.search).get('screen');
  if (start && allScreens[start]) { allScreens[start](); syncNav(start); }
  else { reset([LoginView()]); syncNav('100'); }
})();
