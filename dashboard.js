(() => {
  'use strict';

  const apiUrl = window.L8S_DASHBOARD_API || '';
  const refreshMs = Math.max(Number(window.L8S_REFRESH_MS) || 30000, 10000);
  const cacheKey = 'l8s-dashboard-last-good-v1';
  let timer;

  const $ = id => document.getElementById(id);
  const fmtDate = value => new Intl.DateTimeFormat('de-AT', { dateStyle:'medium', timeStyle:'medium' }).format(new Date(value));
  const fmtHours = seconds => `${(Math.max(0, seconds || 0) / 3600).toLocaleString('de-AT', { minimumFractionDigits:1, maximumFractionDigits:1 })} h`;
  const percent = (part, total) => total > 0 ? Math.round((part / total) * 1000) / 10 : 0;

  document.addEventListener('mousemove', event => {
    document.body.style.setProperty('--mx', `${event.clientX}px`);
    document.body.style.setProperty('--my', `${event.clientY}px`);
  });

  function setLiveState(state, label) {
    const tag = $('live-tag');
    tag.className = `live-tag ${state}`;
    $('live-label').textContent = label;
  }

  function showMessage(text, kind = '') {
    const box = $('sync-message');
    box.textContent = text;
    box.className = `sync-message ${kind}`.trim();
    box.hidden = !text;
  }

  function setText(id, value) { $(id).textContent = value; }
  function setBar(id, value) { $(id).style.width = `${Math.max(0, Math.min(100, value))}%`; }

  function renderStats(jira) {
    setText('stat-total', jira.total);
    setText('stat-done', jira.done);
    setText('stat-progress', jira.inProgress);
    setText('stat-todo', jira.todo);
    setText('stat-percent', `${jira.progressPercent.toLocaleString('de-AT')}%`);
    setBar('bar-total', 100);
    setBar('bar-done', percent(jira.done, jira.total));
    setBar('bar-progress', percent(jira.inProgress, jira.total));
    setBar('bar-todo', percent(jira.todo, jira.total));
    setBar('bar-percent', jira.progressPercent);

    setText('done-count', jira.done);
    setText('progress-count', jira.inProgress);
    setText('todo-count', jira.todo);
    setText('progress-summary', `${jira.done} von ${jira.total} Vorgängen abgeschlossen · ${jira.inProgress} in Bearbeitung · ${jira.todo} offen`);
    setText('jira-updated', jira.lastUpdated ? `Letzte Jira-Änderung: ${fmtDate(jira.lastUpdated)}` : 'Noch keine Jira-Änderung vorhanden');

    const circumference = 2 * Math.PI * 40;
    const completed = circumference * (jira.progressPercent / 100);
    $('ring-fg').style.strokeDasharray = `${completed} ${circumference - completed}`;
    setText('ring-label', `${jira.progressPercent.toLocaleString('de-AT')}%`);
  }

  function renderEpics(epics) {
    const list = $('epic-list');
    list.replaceChildren();
    if (!epics.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Im Jira-Projekt wurden keine Projektbereiche gefunden.';
      list.append(empty);
      return;
    }
    epics.forEach(epic => {
      const row = document.createElement('div'); row.className = 'epic-row';
      const identity = document.createElement('div');
      const name = document.createElement('div'); name.className = 'epic-name'; name.textContent = epic.title;
      const key = document.createElement('div'); key.className = 'epic-key'; key.textContent = epic.key;
      identity.append(name, key);
      const progress = document.createElement('div');
      const track = document.createElement('div'); track.className = 'progress-track';
      const fill = document.createElement('div'); fill.className = 'progress-fill'; fill.style.width = `${epic.progressPercent}%`;
      track.append(fill);
      const sub = document.createElement('div'); sub.className = 'progress-sub'; sub.textContent = `${epic.done} / ${epic.total} Vorgänge erledigt`;
      progress.append(track, sub);
      const pct = document.createElement('div'); pct.className = 'epic-pct'; pct.textContent = `${epic.progressPercent.toLocaleString('de-AT')}%`;
      row.append(identity, progress, pct);
      list.append(row);
    });
  }

  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?';
  }

  function colorFor(name) {
    const palette = ['#6a4c93','#2060a0','#1a7a4c','#c87a08','#9a3f66','#3b6f8f'];
    const hash = [...name].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 0);
    return palette[hash % palette.length];
  }

  function issueRow(issue) {
    const row = document.createElement('tr');
    if (issue.url) {
      row.dataset.url = issue.url;
      row.tabIndex = 0;
      row.setAttribute('aria-label', `${issue.key} in Jira öffnen`);
      const open = () => window.open(issue.url, '_blank', 'noopener');
      row.addEventListener('click', open);
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') open(); });
    }
    const keyCell = document.createElement('td');
    const key = document.createElement('span'); key.className = 'story-key'; key.textContent = issue.key; keyCell.append(key);
    const title = document.createElement('td'); title.textContent = issue.title;
    const typeCell = document.createElement('td');
    const type = document.createElement('span'); type.className = 'type-badge'; type.textContent = issue.type; typeCell.append(type);
    const statusCell = document.createElement('td');
    const status = document.createElement('span'); status.className = `status-badge status-${issue.category}`; status.textContent = issue.status; statusCell.append(status);
    const personCell = document.createElement('td');
    if (issue.assignee) {
      const person = document.createElement('span'); person.className = 'assignee';
      const avatar = document.createElement('span'); avatar.className = 'avatar'; avatar.style.background = colorFor(issue.assignee); avatar.textContent = initials(issue.assignee);
      const name = document.createElement('span'); name.textContent = issue.assignee;
      person.append(avatar, name); personCell.append(person);
    } else {
      personCell.textContent = '—';
    }
    row.append(keyCell, title, typeCell, statusCell, personCell);
    return row;
  }

  function renderIssueGroup(id, issues) {
    const tbody = $(id);
    tbody.replaceChildren();
    if (!issues.length) {
      const row = document.createElement('tr');
      const cell = document.createElement('td'); cell.colSpan = 5; cell.className = 'empty-state'; cell.textContent = 'Keine Vorgänge in dieser Kategorie.';
      row.append(cell); tbody.append(row); return;
    }
    issues.forEach(issue => tbody.append(issueRow(issue)));
  }

  function renderClockify(clockify) {
    setText('clockify-total', fmtHours(clockify.totalSeconds));
    setText('clockify-updated', clockify.syncedAt ? `Letzte Clockify-Abfrage: ${fmtDate(clockify.syncedAt)}` : '');
    const list = $('member-hours');
    list.replaceChildren();
    if (!clockify.members.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state'; empty.textContent = 'Für dieses Clockify-Projekt wurden noch keine Zeiten erfasst.'; list.append(empty); return;
    }
    const max = Math.max(...clockify.members.map(member => member.seconds), 1);
    clockify.members.forEach(member => {
      const row = document.createElement('div'); row.className = 'member-row';
      const name = document.createElement('div'); name.className = 'member-name'; name.textContent = member.name;
      if (member.running) { const mark = document.createElement('span'); mark.className = 'running-mark'; mark.title = 'Timer läuft'; name.append(mark); }
      const track = document.createElement('div'); track.className = 'member-track';
      const fill = document.createElement('div'); fill.className = 'member-fill'; fill.style.width = `${(member.seconds / max) * 100}%`; track.append(fill);
      const value = document.createElement('div'); value.className = 'member-value'; value.textContent = fmtHours(member.seconds);
      row.append(name, track, value); list.append(row);
    });
  }

  function render(data, stale = false) {
    if (data.jira) {
      renderStats(data.jira);
      renderEpics(data.jira.epics || []);
      renderIssueGroup('done-tbody', data.jira.issues.filter(issue => issue.category === 'done'));
      renderIssueGroup('progress-tbody', data.jira.issues.filter(issue => issue.category === 'in_progress'));
      renderIssueGroup('todo-tbody', data.jira.issues.filter(issue => issue.category === 'todo'));
    }
    if (data.clockify) renderClockify(data.clockify);
    setText('updated-at', `Synchronisiert: ${fmtDate(data.generatedAt)}`);
    setText('dashboard-footer', `Stand: ${fmtDate(data.generatedAt)} · Datenquellen: Jira Cloud und Clockify · automatische Aktualisierung alle ${Math.round(refreshMs / 1000)} Sekunden`);

    const unavailable = data.unavailableSources || [];
    if (stale) {
      setLiveState('stale', 'Gespeicherter Stand');
      showMessage('Die Live-Schnittstelle ist gerade nicht erreichbar. Angezeigt wird der letzte erfolgreich gespeicherte Stand.', 'error');
    } else if (unavailable.length) {
      setLiveState('stale', 'Teilweise aktuell');
      showMessage(`Vorübergehend nicht verfügbar: ${unavailable.join(', ')}. Die übrigen Daten sind aktuell.`);
    } else {
      setLiveState('live', 'Jira & Clockify live');
      showMessage('');
    }
  }

  async function refresh() {
    if (!apiUrl || apiUrl.includes('DEIN-WORKER')) {
      setLiveState('error', 'Einrichtung fehlt');
      showMessage('Trage nach dem Backend-Deploy dessen URL in dashboard-config.js ein.', 'error');
      return;
    }
    setLiveState('loading', 'Wird aktualisiert');
    try {
      const response = await fetch(apiUrl, { headers:{ Accept:'application/json' }, cache:'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.generatedAt || (!data.jira && !data.clockify)) throw new Error('Ungültige Antwort');
      localStorage.setItem(cacheKey, JSON.stringify(data));
      render(data);
    } catch (error) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { render(JSON.parse(cached), true); return; } catch (_) { /* ungültigen Cache ignorieren */ }
      }
      setLiveState('error', 'Nicht erreichbar');
      showMessage('Die Projektdaten konnten nicht geladen werden. Prüfe die Backend-URL und die dort hinterlegten Secrets.', 'error');
    }
  }

  document.querySelectorAll('.collapse-btn').forEach(button => {
    button.addEventListener('click', () => {
      const target = $(button.dataset.target);
      const collapsed = button.classList.toggle('collapsed');
      target.hidden = collapsed;
      button.lastElementChild.textContent = collapsed ? 'Ausklappen' : 'Einklappen';
    });
  });

  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) { refresh(); timer = setInterval(refresh, refreshMs); }
  });

  refresh();
  timer = setInterval(refresh, refreshMs);
})();
