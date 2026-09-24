/* L8S Cookie-Consent — EU-konform (ePrivacy-RL Art.5 Abs.3, DSGVO Art.6/7/13, AT TKG §165)
 * - Opt-in VOR Speicherung nicht-notwendiger Daten (keine Pre-Ticks)
 * - Ablehnen genauso einfach wie Annehmen
 * - Granular: notwendig / funktional / statistik / marketing
 * - Widerruf jederzeit über FAB + Footer
 * - Nachweis: Version + Zeitstempel + Auswahl in localStorage (keine Tracking-Cookies)
 * - Gültigkeit: 182 Tage, danach erneute Abfrage
 */
(() => {
  'use strict';

  const KEY = 'l8s-consent-v1';
  const VERSION = '1.0';
  const MAX_AGE_DAYS = 182;

  const DEFAULTS = { necessary: true, functional: false, statistics: false, marketing: false };

  const $ = (sel, root = document) => root.querySelector(sel);

  function loadStored() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || data.version !== VERSION || !data.timestamp || !data.choices) return null;
      const ageDays = (Date.now() - data.timestamp) / 86400000;
      if (ageDays > MAX_AGE_DAYS) return null;
      return data;
    } catch { return null; }
  }

  function save(choices) {
    const record = {
      version: VERSION,
      timestamp: Date.now(),
      dateISO: new Date().toISOString(),
      choices: { ...DEFAULTS, ...choices, necessary: true },
      dnt: navigator.doNotTrack === '1',
      ua: navigator.userAgent.slice(0, 120)
    };
    try { localStorage.setItem(KEY, JSON.stringify(record)); } catch {}
    return record;
  }

  function apply(choices) {
    // Steuerung optionaler Funktionen — derzeit bewusst tracking-frei:
    // functional=false  -> keine UI-Präferenzen speichern, System-Fonts bevorzugen
    // statistics=false  -> l8sTrack() bleibt No-Op (kein Analytics aktiv)
    // marketing=false   -> keine Marketing-Skripte (keine aktiv)
    document.body.dataset.consentFunctional = choices.functional ? '1' : '0';
    document.body.dataset.consentStatistics = choices.statistics ? '1' : '0';
    window.L8S_CONSENT = { ...choices };
    document.dispatchEvent(new CustomEvent('l8s:consent', { detail: { ...choices } }));
  }

  // Öffentliche API (für Datenschutz-Seite + Footer + zukünftige Tracker)
  window.L8SConsent = {
    get: () => {
      const s = loadStored();
      return s ? s.choices : null;
    },
    openSettings: () => openBanner(true),
    reset: () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); }
  };
  // Beispiel-Gate für künftige Statistik-Tools: nur tracken wenn statistics=true
  window.l8sTrack = (...args) => {
    const c = window.L8S_CONSENT;
    if (!c || !c.statistics) return; // ohne Einwilligung: kein Tracking
    if (window.console) console.debug('[l8sTrack:deaktiviert-kein-Anbieter]', ...args);
  };

  function buildUI() {
    if ($('#l8s-cookie-banner')) return;

    const overlay = document.createElement('div');
    overlay.className = 'l8s-cookie-overlay';
    overlay.id = 'l8s-cookie-overlay';

    const banner = document.createElement('div');
    banner.className = 'l8s-cookie-banner';
    banner.id = 'l8s-cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'true');
    banner.setAttribute('aria-labelledby', 'l8s-cookie-title');

    const dntHint = navigator.doNotTrack === '1'
      ? '<p class="l8s-cookie-text" style="border:1px dashed #3a3a3a;border-radius:8px;padding:8px 12px;">Hinweis: Ihr Browser sendet „Do Not Track“. Wir haben daher alle optionalen Kategorien vorausgewählt <strong style="color:#f0f0f0">abgelehnt</strong>.</p>'
      : '';

    banner.innerHTML = `
      <div class="l8s-cookie-kicker">[ Privatsphäre · DSGVO ]</div>
      <div class="l8s-cookie-title" id="l8s-cookie-title">Cookies &amp; lokale Speicherung</div>
      <p class="l8s-cookie-text">
        Wir nutzen <strong style="color:#f0f0f0">ausschließlich technisch notwendige Speicherung</strong>
        (Consent-Nachweis, Dashboard-Cache) und — nur mit Ihrer <strong style="color:#f0f0f0">ausdrücklichen Einwilligung</strong> —
        optionale Funktionen. Es werden <strong style="color:#f0f0f0">keine Tracking- oder Werbe-Cookies</strong> ohne Opt-in gesetzt.
        Rechtsgrundlagen: Art.&nbsp;6 Abs.&nbsp;1 lit.&nbsp;a/f DSGVO, §&nbsp;165 TKG 2021. Details in
        <a href="datenschutz.html">Datenschutz</a> und <a href="impressum.html">Impressum</a>.
      </p>
      ${dntHint}
      <div class="l8s-cookie-btns">
        <button class="l8s-btn l8s-btn-secondary" type="button" data-act="reject">Alle ablehnen</button>
        <button class="l8s-btn l8s-btn-ghost" type="button" data-act="custom">Auswahl anpassen</button>
        <button class="l8s-btn l8s-btn-primary" type="button" data-act="accept">Alle akzeptieren</button>
      </div>
      <div class="l8s-cookie-details" id="l8s-cookie-details">
        <div class="l8s-cat">
          <div><div class="l8s-cat-name">Notwendig</div><div class="l8s-cat-legal">Immer aktiv · Art. 6 Abs. 1 lit. f</div></div>
          <div class="l8s-cat-status"><label class="l8s-switch"><input type="checkbox" checked disabled aria-label="Notwendig immer aktiv"><span class="l8s-slider"></span></label></div>
          <div class="l8s-cat-desc">Consent-Nachweis (<code>${KEY}</code>) + Dashboard-Cache (<code>l8s-dashboard-last-good-v1</code>) in localStorage. Keine Cookies, keine Übertragung.</div>
        </div>
        <div class="l8s-cat">
          <div><div class="l8s-cat-name">Funktional / Präferenzen</div><div class="l8s-cat-legal">Einwilligung · Art. 6 Abs. 1 lit. a</div></div>
          <div class="l8s-cat-status"><label class="l8s-switch"><input type="checkbox" data-cat="functional" aria-label="Funktionale Speicherung"><span class="l8s-slider"></span></label></div>
          <div class="l8s-cat-desc">Merken von UI-Einstellungen (z.&nbsp;B. ein-/ausgeklappte Tabellen) + externe Schriftarten (Google Fonts, IP-Übertragung an Google). Aus = System-Fonts.</div>
        </div>
        <div class="l8s-cat">
          <div><div class="l8s-cat-name">Statistik</div><div class="l8s-cat-legal">Einwilligung · Art. 6 Abs. 1 lit. a</div></div>
          <div class="l8s-cat-status"><label class="l8s-switch"><input type="checkbox" data-cat="statistics" aria-label="Statistik"><span class="l8s-slider"></span></label></div>
          <div class="l8s-cat-desc">Derzeit <strong>kein Analyse-Tool aktiv</strong>. Diese Kategorie bleibt blockiert und ist nur für ein künftiges anonymes Tool (z.&nbsp;B. selbstgehostetes Matomo) reserviert.</div>
        </div>
        <div class="l8s-cat">
          <div><div class="l8s-cat-name">Marketing</div><div class="l8s-cat-legal">Einwilligung · Art. 6 Abs. 1 lit. a</div></div>
          <div class="l8s-cat-status"><label class="l8s-switch"><input type="checkbox" data-cat="marketing" aria-label="Marketing"><span class="l8s-slider"></span></label></div>
          <div class="l8s-cat-desc">Derzeit <strong>keine Marketing-Tracker</strong> eingebunden. Aktivierung nur nach ausdrücklichem Opt-in.</div>
        </div>
        <div class="l8s-cookie-btns">
          <button class="l8s-btn l8s-btn-secondary" type="button" data-act="save">Auswahl speichern</button>
          <button class="l8s-btn l8s-btn-primary" type="button" data-act="accept">Alle akzeptieren</button>
        </div>
      </div>`;

    document.body.append(overlay, banner);

    banner.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === 'accept') decide({ functional: true, statistics: true, marketing: true });
      else if (act === 'reject') decide({ functional: false, statistics: false, marketing: false });
      else if (act === 'custom') {
        $('#l8s-cookie-details', banner).classList.toggle('open');
        btn.textContent = $('#l8s-cookie-details', banner).classList.contains('open') ? 'Weniger anzeigen' : 'Auswahl anpassen';
      }
      else if (act === 'save') {
        decide({
          functional: $('[data-cat="functional"]', banner).checked,
          statistics: $('[data-cat="statistics"]', banner).checked,
          marketing: $('[data-cat="marketing"]', banner).checked
        });
      }
    });

    overlay.addEventListener('click', () => {
      // Overlay-Klick = keine Einwilligung (nur schließen wenn bereits gewählt wurde)
      if (loadStored()) closeBanner();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && loadStored()) closeBanner();
    });
  }

  function decide(partial) {
    const record = save({ ...DEFAULTS, ...partial });
    apply(record.choices);
    closeBanner();
  }

  function openBanner(customize) {
    buildUI();
    const banner = $('#l8s-cookie-banner');
    const overlay = $('#l8s-cookie-overlay');
    const stored = loadStored();
    if (stored) {
      const map = { functional: '[data-cat="functional"]', statistics: '[data-cat="statistics"]', marketing: '[data-cat="marketing"]' };
      for (const [k, sel] of Object.entries(map)) {
        const el = $(sel, banner);
        if (el) el.checked = !!stored.choices[k];
      }
    }
    $('#l8s-cookie-details', banner).classList.toggle('open', !!customize);
    banner.classList.add('show');
    overlay.classList.add('show');
    const first = $('[data-act="reject"]', banner);
    if (first) first.focus({ preventScroll: true });
  }

  function closeBanner() {
    $('#l8s-cookie-banner')?.classList.remove('show');
    $('#l8s-cookie-overlay')?.classList.remove('show');
  }

  function ensureFooter() {
    let footer = $('.l8s-footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.className = 'l8s-footer';
      footer.innerHTML = `
        <span>© 2026 Layer 8 Security · HTL Wien 3 Rennweg · 5CN</span>
        <span class="sep">·</span><a href="datenschutz.html">Datenschutz</a>
        <span class="sep">·</span><a href="impressum.html">Impressum</a>
        <span class="sep">·</span><button type="button" id="l8s-footer-cookies">Cookie-Einstellungen</button>`;
      document.body.append(footer);
    }
    const btn = $('#l8s-footer-cookies', footer) || $('button', footer);
    if (btn && !btn.dataset.wired) {
      btn.dataset.wired = '1';
      btn.addEventListener('click', () => openBanner(true));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildUI();
    ensureFooter();
    const stored = loadStored();
    if (stored) { apply(stored.choices); }
    else {
      // Banner erst nach kurzer Verzögerung (nicht render-blockierend)
      setTimeout(() => {
        const b = $('#l8s-cookie-banner');
        b.classList.add('show');
        $('#l8s-cookie-overlay').classList.add('show');
      }, 600);
    }
  });
})();
