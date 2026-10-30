// Oeffentliche Dashboard-API. Jira- und Clockify-Secrets liegen nur im Worker.
window.L8S_DASHBOARD_API = "https://l8sec-dashboard-api.l8sec.workers.dev/api/dashboard";

// Arbeitszeiten aus AZBB (https://azbb.duckdns.org): öffentlicher, nur lesender Freigabe-Link mit Summen pro Person.
// Widerrufen bzw. neu erstellen unter AZBB -> Freigaben.
window.L8S_AZBB_API = "https://azbb.duckdns.org/api/share/lzFyymExI6QsrXfUqnZmLybVFYMncp94kq9E7B69X5A/dashboard";

// Die geöffnete Seite prüft alle 30 Sekunden auf neue Jira-/AZBB-Daten.
window.L8S_REFRESH_MS = 30000;
