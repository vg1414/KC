
        import { initializeApp }                            from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
        import { getDatabase, ref, set, get, onValue, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

        const firebaseConfig = {
            apiKey: "AIzaSyB-bBX07bnuMMfEJhsrSppMOmlHRUZQbWk",
            authDomain: "krokenscopa-multi.firebaseapp.com",
            databaseURL: "https://krokenscopa-multi-default-rtdb.firebaseio.com",
            projectId: "krokenscopa-multi",
            storageBucket: "krokenscopa-multi.firebasestorage.app",
            messagingSenderId: "229733900548",
            appId: "1:229733900548:web:3ba7951e00291678377051"
        };

        const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const SESSION_DURATION = 10 * 60 * 1000; // 10 minuter

        // ─── Landningssida – admin-state ──────────────────────────────────────────
        let database;
        let adminLoggedIn   = false;
        let adminHashStored = null;
        let adminHashLoaded = false;
        let createdLeagueCode = '';

        // ─── Liga-state ───────────────────────────────────────────────────────────
        let currentLeagueCode = '';
        let currentLeagueInfo = {};
        let currentUser       = null;

        let leaguePlayers    = [];
        let passwords        = {};
        let matches          = [];
        let predictions      = {};
        let exactPredictions = {};
        let deadlines        = {};
        let seasonHistory    = [];
        let activityLog      = [];
        let activityLogLoaded = false;
        let passwordsLoaded  = false;

        let matchMap         = {};
        let pointsCache      = {};
        let trophyCache      = {};
        let cachedFirstMatch = null;
        let renderScheduled  = false;
        let clientIP         = null;
        let leagueUnsubscribers = [];

        let plApiKey         = localStorage.getItem('kc_api_key') || '';
        let autoFetchInterval = null;
        let currentModalMatchId = null;
        let pendingPlayers   = {};

        // ─── Firebase init ────────────────────────────────────────────────────────
        try {
            const app = initializeApp(firebaseConfig);
            database = getDatabase(app);

            get(ref(database, 'adminConfig/hefnerHash'))
                .then(snap => { adminHashStored = snap.val(); adminHashLoaded = true; })
                .catch(() => { adminHashLoaded = true; });

            routeFromUrl();

        } catch (err) {
            console.error('Firebase-fel:', err);
            setEl('notFoundMsg', 'Firebase-fel: ' + err.message);
            showView('viewNotFound');
        }

        // ─── URL-routing ──────────────────────────────────────────────────────────
        async function routeFromUrl() {
            const params = new URLSearchParams(window.location.search);
            const raw    = params.get('liga');

            if (!raw) { showView('viewLanding'); return; }

            const code = raw.toUpperCase();
            showView('viewLoading');

            try {
                const snap = await get(ref(database, `leagues/${code}`));
                if (snap.exists()) {
                    setupLeagueView(code, snap.val());
                } else {
                    setEl('notFoundMsg', `Ligan "${code}" hittades inte.`);
                    showView('viewNotFound');
                }
            } catch (err) {
                setEl('notFoundMsg', 'Kunde inte ansluta till databasen.');
                showView('viewNotFound');
            }
        }

        // ─── Vy-hantering ────────────────────────────────────────────────────────
        const ALL_VIEWS = ['viewLoading','viewLanding','viewCreate','viewCreated','viewNotFound','viewLeague','viewApp'];

        function showView(id) {
            ALL_VIEWS.forEach(v => {
                const el = document.getElementById(v);
                if (el) el.style.display = v === id ? '' : 'none';
            });
        }

        // ─── Hjälp-funktioner ─────────────────────────────────────────────────────
        function showStatus(containerId, msg, type) {
            const el = document.getElementById(containerId);
            if (!el) return;
            el.innerHTML = '';
            const div = document.createElement('div');
            div.className = `status status-${type}`;
            div.textContent = msg;
            el.appendChild(div);
        }

        function showAppMsg(msg, type) {
            const el = document.getElementById('appStatus');
            if (!el) return;
            el.innerHTML = '';
            if (!msg) return;
            const div = document.createElement('div');
            div.className = `app-msg app-msg-${type}`;
            div.textContent = msg;
            el.appendChild(div);
            if (type !== 'error') setTimeout(() => { el.innerHTML = ''; }, 4000);
        }

        function clearStatus(id) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        }

        function setEl(id, text) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }

        // ─── SHA-256 ──────────────────────────────────────────────────────────────
        async function hashPassword(pw) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
        }

        // ─── Session (per liga) ───────────────────────────────────────────────────
        function sessionKey() { return `kc_session_${currentLeagueCode}`; }

        function saveSession(player) {
            localStorage.setItem(sessionKey(), JSON.stringify({ player, timestamp: Date.now() }));
        }

        function loadSession() {
            try {
                const data = localStorage.getItem(sessionKey());
                if (!data) return null;
                const s = JSON.parse(data);
                if (Date.now() - s.timestamp > SESSION_DURATION) {
                    localStorage.removeItem(sessionKey());
                    return null;
                }
                return s.player;
            } catch {
                localStorage.removeItem(sessionKey());
                return null;
            }
        }

        function clearSession() { localStorage.removeItem(sessionKey()); }

        // ─── IP-logging ───────────────────────────────────────────────────────────
        async function fetchClientIP() {
            if (clientIP) return clientIP;
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                clientIP = (await res.json()).ip || 'okänd';
            } catch { clientIP = 'okänd'; }
            return clientIP;
        }

        async function logActivity(action, details = '', ip = null) {
            if (!activityLogLoaded || !currentLeagueCode) return;
            const entry = {
                timestamp: new Date().toISOString(),
                user: currentUser || 'okänd',
                action,
                details: details || '',
                ip: ip || 'okänd'
            };
            activityLog = [...(Array.isArray(activityLog) ? activityLog : []), entry].slice(-200);
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/activityLog`), activityLog);
            } catch (err) {
                console.error('logActivity failed:', err);
            }
        }

        // ─── Datum-hjälpare ───────────────────────────────────────────────────────
        function formatDateTime(dateStr) {
            return new Date(dateStr).toLocaleString('sv-SE', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        }

        function formatCountdown(deadlineStr) {
            const diff = new Date(deadlineStr) - new Date();
            if (diff <= 0) return null;
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            if (d > 0) return `${d}d ${h}h ${m}m kvar`;
            if (h > 0) return `${h}h ${m}m kvar`;
            return `${m}m kvar`;
        }

        function updateCountdownSpans() {
            document.querySelectorAll('[data-countdown]').forEach(el => {
                const text = formatCountdown(el.dataset.countdown);
                if (text) {
                    el.textContent = text;
                } else {
                    scheduleRender();
                }
            });
        }

        setInterval(updateCountdownSpans, 60000);

        // ─── Match-hjälpare ───────────────────────────────────────────────────────
        function isMatchStarted(dateStr) { return new Date() >= new Date(dateStr); }

        function getDeadlineKey(match) {
            const comp = match.competition || (
                match.id && match.id.startsWith('pl_') ? 'PL' :
                match.id && match.id.startsWith('wc_') ? 'WC' : 'CL'
            );
            if (comp === 'PL') return 'PL';
            if (comp === 'WC') return 'WC';
            return match.stage ? `CL_${match.stage}` : 'CL';
        }

        function isMatchLocked(match) {
            const key = getDeadlineKey(match);
            const deadline = deadlines[key];
            if (!deadline) return false;
            return new Date() >= new Date(deadline);
        }

        // ─── Cache-rebuild ────────────────────────────────────────────────────────
        function rebuildMatchMap() {
            matchMap = {};
            matches.forEach(m => { matchMap[m.id] = m; });
            cachedFirstMatch = null;
        }

        function getMatch(matchId) {
            return matchMap[matchId] || matches.find(m => m.id === matchId);
        }

        function rebuildTrophyCache() {
            trophyCache = {};
            leaguePlayers.forEach(player => {
                let wins = 0;
                (seasonHistory || []).forEach(s => { if (s.winner === player) wins++; });
                if (wins === 0) { trophyCache[player] = ''; return; }
                const stars   = Math.floor(wins / 5);
                const trophies = wins % 5;
                trophyCache[player] = `<span style="color:#f0b429;font-size:.8em;" title="${wins} säsongsvinst${wins > 1 ? 'er' : ''}">` +
                    '⭐'.repeat(stars) + '🏆'.repeat(trophies) + '</span>';
            });
        }

        function getPlayerTrophyHTML(player) { return trophyCache[player] ?? ''; }

        function calculatePoints(matchId, player) {
            const match = getMatch(matchId);
            if (!match || !match.actualOutcome) return 0;
            if (match.actualOutcome === 'POSTPONED') return 0;

            let pts = 0;
            const playerPred = predictions[matchId]?.[player];
            if (playerPred && playerPred === match.actualOutcome) {
                const sameCount   = Object.values(predictions[matchId] || {}).filter(p => p === playerPred).length;
                const totalPlayers = leaguePlayers.length;
                if (sameCount < totalPlayers && totalPlayers > 1) {
                    pts = Math.round(100 * (totalPlayers - sameCount) / (totalPlayers - 1));
                }
            }

            if (match.actualScore && exactPredictions[matchId]?.[player]) {
                if (exactPredictions[matchId][player] === match.actualScore) pts += 50;
            }

            return pts;
        }

        function rebuildPointsCache() {
            pointsCache = {};
            matches.forEach(match => {
                if (!match.actualOutcome) return;
                pointsCache[match.id] = {};
                leaguePlayers.forEach(player => {
                    pointsCache[match.id][player] = calculatePoints(match.id, player);
                });
            });
        }

        function getCachedPoints(matchId, player) {
            return pointsCache[matchId]?.[player] ?? 0;
        }

        // ─── Render-pipeline ──────────────────────────────────────────────────────
        function scheduleRender() {
            if (!currentUser) return;
            if (renderScheduled) return;
            renderScheduled = true;
            requestAnimationFrame(() => {
                renderScheduled = false;
                rebuildMatchMap();
                rebuildTrophyCache();
                rebuildPointsCache();
                renderPredictions();
                renderMatches();
                renderLeaderboard();
                renderHistory();
                if (currentUser === 'Hefner') {
                    renderAdminPlayers();
                    renderAdminDeadlines();
                }
            });
        }

        // ─── Tab-hantering ────────────────────────────────────────────────────────
        window.switchTab = function(tabName) {
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.app-tab').forEach(el => el.classList.remove('active'));
            const tab = document.getElementById('tab-' + tabName);
            if (tab) tab.style.display = '';
            const btn = document.querySelector(`.app-tab[data-tab="${tabName}"]`);
            if (btn) btn.classList.add('active');
        };

        // ─── Liga-vy & listeners ──────────────────────────────────────────────────
        function setupLeagueView(code, data) {
            currentLeagueCode = code;
            currentLeagueInfo = data.info || {};

            // Fyll liga-header i login-vyn
            setEl('leagueNameDisplay', currentLeagueInfo.name || 'Okänd liga');
            setEl('leagueCodeDisplay', code);

            const badgesEl = document.getElementById('leagueCompBadges');
            if (badgesEl) {
                badgesEl.innerHTML = '';
                const labels = { PL: '⚽ PL', CL: '🏆 CL', WC: '🌍 VM' };
                (currentLeagueInfo.competitions || []).forEach(comp => {
                    const span = document.createElement('span');
                    span.className = `comp-badge comp-badge-${comp.toLowerCase()}`;
                    span.textContent = labels[comp] || comp;
                    badgesEl.appendChild(span);
                });
            }

            // Rendera login-formulär baserat på joinMode
            const container = document.getElementById('loginFormContainer');
            if (container) {
                container.innerHTML = currentLeagueInfo.joinMode === 'self'
                    ? buildSelfLoginForm()
                    : buildAdminLoginForm();
            }

            showView('viewLeague');
            setupLeagueListeners(code);
        }

        function buildAdminLoginForm() {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div class="field">
                        <label>Spelare</label>
                        <select id="playerSelect" onchange="window.onPlayerChange()">
                            <option value="">Valj spelare...</option>
                            <option value="Askadare">👁 Åskadare</option>
                        </select>
                    </div>
                    <div class="field" id="pwFieldWrap">
                        <label>Losenord</label>
                        <input type="password" id="passwordInput" placeholder="••••••••"
                               onkeydown="if(event.key==='Enter')window.handleLogin()">
                        <span class="field-hint">Forsta gangen? Valj ett losenord du minns.</span>
                    </div>
                    <button class="btn-gold" onclick="window.handleLogin()">Logga in</button>
                    <button class="btn-ghost" onclick="window.showLanding()">← Tillbaka</button>
                </div>`;
        }

        function buildSelfLoginForm() {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div id="loginFormSelf">
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div class="field">
                                <label>Ditt namn</label>
                                <input type="text" id="playerNameInput" placeholder="Ange ditt namn" autocomplete="off">
                            </div>
                            <div class="field">
                                <label>Losenord</label>
                                <input type="password" id="passwordInput" placeholder="••••••••"
                                       onkeydown="if(event.key==='Enter')window.handleLogin()">
                                <span class="field-hint">Forsta gangen som registrerad spelare? Valj ett losenord.</span>
                            </div>
                            <button class="btn-gold" onclick="window.handleLogin()">Logga in</button>
                            <button class="btn-ghost" onclick="window.showRegisterForm()">Ny spelare? Ansok om att ga med</button>
                            <button class="btn-ghost" onclick="window.showLanding()">← Tillbaka</button>
                        </div>
                    </div>
                    <div id="registerFormSelf" style="display:none">
                        <div style="display:flex;flex-direction:column;gap:12px;">
                            <div class="field">
                                <label>Ditt namn</label>
                                <input type="text" id="regNameInput" placeholder="Ange ditt namn">
                            </div>
                            <div class="field">
                                <label>Valj losenord</label>
                                <input type="password" id="regPasswordInput" placeholder="••••••••">
                            </div>
                            <button class="btn-gold" onclick="window.handleRegister()">Skicka ansokan</button>
                            <button class="btn-ghost" onclick="window.showLoginForm()">← Tillbaka till inloggning</button>
                        </div>
                    </div>
                </div>`;
        }

        function setupLeagueListeners(code) {
            leagueUnsubscribers.forEach(u => u());
            leagueUnsubscribers = [];

            // Återställ state
            leaguePlayers = []; passwords = {}; matches = [];
            predictions = {}; exactPredictions = {}; deadlines = {};
            seasonHistory = []; activityLog = []; pendingPlayers = {};
            passwordsLoaded = false; activityLogLoaded = false;

            const base = `leagues/${code}`;

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/players`), snap => {
                    const data = snap.val();
                    leaguePlayers = (data && Array.isArray(data)) ? data : [];
                    renderPlayerSelect();
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/passwords`), snap => {
                    passwords = snap.val() || {};
                    passwordsLoaded = true;
                    if (!currentUser) {
                        const saved = loadSession();
                        if (saved && (passwords[saved] || saved === 'Askadare')) {
                            activateSession(saved);
                            fetchClientIP().then(ip => logActivity('AUTO_LOGIN', 'Automatisk inloggning fran session', ip));
                        }
                    }
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/matches`), snap => {
                    const data = snap.val();
                    matches = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
                    cachedFirstMatch = null;
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/predictions`), snap => {
                    predictions = snap.val() || {};
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/exactPredictions`), snap => {
                    exactPredictions = snap.val() || {};
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/deadlines`), snap => {
                    deadlines = snap.val() || {};
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/seasonHistory`), snap => {
                    const data = snap.val();
                    seasonHistory = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
                    if (currentUser) scheduleRender();
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/activityLog`), snap => {
                    const data = snap.val();
                    activityLog = data ? (Array.isArray(data) ? data : []) : [];
                    activityLogLoaded = true;
                })
            );

            leagueUnsubscribers.push(
                onValue(ref(database, `${base}/pendingPlayers`), snap => {
                    pendingPlayers = snap.val() || {};
                    if (currentUser === 'Hefner') renderAdminPlayers();
                })
            );
        }

        // ─── Fyll spelare-dropdown (joinMode: admin) ──────────────────────────────
        function renderPlayerSelect() {
            const select = document.getElementById('playerSelect');
            if (!select) return;
            const current = select.value;
            select.innerHTML = '<option value="">Valj spelare...</option>';
            leaguePlayers.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                select.appendChild(opt);
            });
            const viewOpt = document.createElement('option');
            viewOpt.value = 'Askadare';
            viewOpt.textContent = '👁 Åskadare';
            select.appendChild(viewOpt);
            if (current) select.value = current;
            onPlayerChange();
        }

        window.onPlayerChange = function() {
            const select = document.getElementById('playerSelect');
            const pwWrap = document.getElementById('pwFieldWrap');
            if (pwWrap) pwWrap.style.display = select?.value === 'Askadare' ? 'none' : '';
        };

        window.showRegisterForm = function() {
            const loginForm = document.getElementById('loginFormSelf');
            const regForm   = document.getElementById('registerFormSelf');
            if (loginForm) loginForm.style.display = 'none';
            if (regForm)   regForm.style.display   = '';
            clearStatus('leagueStatus');
        };

        window.showLoginForm = function() {
            const loginForm = document.getElementById('loginFormSelf');
            const regForm   = document.getElementById('registerFormSelf');
            if (loginForm) loginForm.style.display = '';
            if (regForm)   regForm.style.display   = 'none';
            clearStatus('leagueStatus');
        };

        // ─── Login ────────────────────────────────────────────────────────────────
        window.handleLogin = async function() {
            if (!passwordsLoaded) {
                showStatus('leagueStatus', '⏳ Appen laddar fortfarande – forsok igen om ett ogonblick.', 'info');
                return;
            }

            const joinMode = currentLeagueInfo.joinMode || 'admin';
            let player, password;

            if (joinMode === 'admin') {
                player   = document.getElementById('playerSelect')?.value || '';
                password = document.getElementById('passwordInput')?.value || '';
            } else {
                player   = (document.getElementById('playerNameInput')?.value || '').trim();
                password = document.getElementById('passwordInput')?.value || '';
            }

            if (!player) {
                showStatus('leagueStatus', '❌ Valj eller ange ett spelarnamn', 'error');
                return;
            }

            // Åskådare (viewer)
            if (player === 'Askadare') {
                activateSession('Askadare');
                const ip = await fetchClientIP();
                await logActivity('LOGIN', 'Loggade in som askadare', ip);
                return;
            }

            // Self-mode: kontrollera att spelaren är registrerad
            if (joinMode === 'self' && !leaguePlayers.includes(player)) {
                showStatus('leagueStatus', `❌ "${player}" ar inte registrerad. Klicka "Ansok om att ga med" for att ansoka.`, 'error');
                return;
            }

            if (!password) {
                showStatus('leagueStatus', '❌ Ange ett losenord', 'error');
                return;
            }

            try {
                const hash = await hashPassword(password);
                const ip   = await fetchClientIP();

                if (passwords[player]) {
                    if (passwords[player] === hash) {
                        activateSession(player);
                        await logActivity('LOGIN', 'Loggade in', ip);
                    } else {
                        showStatus('leagueStatus', '❌ Fel losenord!', 'error');
                    }
                } else {
                    // Första inloggning – sätt lösenord
                    await set(ref(database, `leagues/${currentLeagueCode}/passwords/${player}`), hash);
                    activateSession(player);
                    await logActivity('FIRST_LOGIN', 'Skapade konto och loggade in', ip);
                }
            } catch (err) {
                showStatus('leagueStatus', '❌ Fel vid inloggning: ' + err.message, 'error');
            }
        };

        // ─── Registrering (self-mode) ─────────────────────────────────────────────
        window.handleRegister = async function() {
            const name     = (document.getElementById('regNameInput')?.value || '').trim();
            const password = document.getElementById('regPasswordInput')?.value || '';

            if (!name)     { showStatus('leagueStatus', '❌ Ange ett namn', 'error'); return; }
            if (!password) { showStatus('leagueStatus', '❌ Valj ett losenord', 'error'); return; }
            if (name.length < 2) { showStatus('leagueStatus', '❌ Namnet maste ha minst 2 tecken', 'error'); return; }

            if (leaguePlayers.includes(name)) {
                showStatus('leagueStatus', `ℹ️ "${name}" ar redan registrerad. Logga in istallet.`, 'info');
                setTimeout(window.showLoginForm, 1500);
                return;
            }

            try {
                const hash = await hashPassword(password);
                await set(ref(database, `leagues/${currentLeagueCode}/pendingPlayers/${name}`), {
                    passwordHash: hash,
                    requestedAt: Date.now()
                });
                showStatus('leagueStatus', `✅ Ansokan skickad! Vantar pa admin-godkannande.`, 'success');
                setTimeout(window.showLoginForm, 2500);
            } catch (err) {
                showStatus('leagueStatus', '❌ Fel: ' + err.message, 'error');
            }
        };

        // ─── Aktivera session ─────────────────────────────────────────────────────
        function activateSession(player) {
            currentUser = player;
            saveSession(player);
            clearStatus('leagueStatus');

            // Uppdatera app-header
            setEl('appUserName', player);
            setEl('appLeagueName', currentLeagueInfo.name || 'Krokens Copa');

            // Visa/dölj admin-fliken
            const adminTab = document.getElementById('adminTab');
            if (adminTab) adminTab.style.display = player === 'Hefner' ? '' : 'none';

            showView('viewApp');
            window.switchTab('tippning');

            // Fyll admin-ligainfo
            const shareCode = document.getElementById('adminShareCode');
            const shareUrl  = document.getElementById('adminShareUrl');
            if (shareCode) shareCode.textContent = currentLeagueCode;
            if (shareUrl)  shareUrl.textContent  = `https://vg1414.github.io/KC/?liga=${currentLeagueCode}`;
            if (plApiKey) {
                const apiKeyEl = document.getElementById('apiKeyStatus');
                if (apiKeyEl) apiKeyEl.textContent = '✅ API-nyckel laddad från localStorage';
            }

            scheduleRender();
        }

        // ─── Logout ───────────────────────────────────────────────────────────────
        window.handleLogout = async function() {
            if (currentUser) {
                await logActivity('LOGOUT', 'Loggade ut');
            }
            currentUser = null;
            clearSession();
            // Visa login-vyn för ligan igen
            showView('viewLeague');
        };

        // ─── RENDER: Matcher (Matcher-flik) ───────────────────────────────────────
        function renderMatches() {
            const list = document.getElementById('matchesList');
            if (!list) return;

            if (!matches || matches.length === 0) {
                list.innerHTML = `<div class="empty-state">
                    <div style="font-size:2em;margin-bottom:10px;">📅</div>
                    <p>${currentUser === 'Hefner' ? 'Inga matcher inladda ännu. Admin-panelen (Session 3) låter dig ladda in matcher.' : 'Hefner har inte laddat in några matcher ännu.'}</p>
                </div>`;
                return;
            }

            // Gruppera per omgång
            const roundGroups = {};
            const roundOrder  = [];
            matches.forEach(m => {
                const key = m.league || 'Okand omgång';
                if (!roundGroups[key]) { roundGroups[key] = []; roundOrder.push(key); }
                roundGroups[key].push(m);
            });

            function renderMatchCard(m) {
                const dateStr     = formatDateTime(m.date);
                const started     = isMatchStarted(m.date);
                const locked      = isMatchLocked(m);
                const scoreStr    = m.actualScore ? ` (${m.actualScore})` : '';
                const outcomeText = {
                    '1': `✅ ${m.homeTeam} vann${scoreStr}`,
                    'X': `✅ Oavgjort${scoreStr}`,
                    '2': `✅ ${m.awayTeam} vann${scoreStr}`,
                    'POSTPONED': '⚠️ Match installad – alla far 0 poang'
                };
                const status = m.actualOutcome ? (outcomeText[m.actualOutcome] || m.actualOutcome) :
                               (started ? '⏳ Vantar pa resultat...' : '📅 Ej startad');

                const matchPreds     = predictions[m.id] || {};
                const matchExact     = exactPredictions[m.id] || {};
                const isPostponed    = m.actualOutcome === 'POSTPONED';

                let predsHtml = '';
                if (!m.actualOutcome) {
                    predsHtml = '<div style="margin-top:8px;">';
                    if (locked || started) {
                        leaguePlayers.forEach(player => {
                            const pred  = matchPreds[player];
                            const exact = matchExact[player];
                            const label = { '1': m.homeTeam, 'X': 'Oavgjort', '2': m.awayTeam }[pred] || pred;
                            const trophy = getPlayerTrophyHTML(player);
                            const pName  = player + (trophy ? ' ' + trophy : '');
                            if (!pred) {
                                predsHtml += `<div class="pred-row pred-row-waiting">❌ ${pName}: Tippade inte</div>`;
                            } else {
                                const display = exact
                                    ? `<strong>${exact.replace('-', ' – ')}</strong> <span style="color:#9ca3af;font-size:.85em;">(${label})</span>`
                                    : `<strong>${label}</strong>`;
                                predsHtml += `<div class="pred-row" style="color:#374151;">🎯 ${pName}: ${display}</div>`;
                            }
                        });
                    } else {
                        leaguePlayers.forEach(player => {
                            const trophy = getPlayerTrophyHTML(player);
                            const pName  = player + (trophy ? ' ' + trophy : '');
                            if (matchPreds[player]) {
                                predsHtml += `<div class="pred-row pred-row-pending">✅ ${pName}: Har tippat</div>`;
                            } else {
                                predsHtml += `<div class="pred-row pred-row-waiting">⏳ ${pName}: Har inte tippat an</div>`;
                            }
                        });
                    }
                    predsHtml += '</div>';
                } else {
                    predsHtml = `<div style="margin-top:8px;">`;
                    leaguePlayers.forEach(player => {
                        const pred  = matchPreds[player];
                        const exact = matchExact[player];
                        const label = { '1': m.homeTeam, 'X': 'Oavgjort', '2': m.awayTeam }[pred] || pred;
                        const trophy = getPlayerTrophyHTML(player);
                        const pName  = player + (trophy ? ' ' + trophy : '');
                        if (!pred) {
                            predsHtml += `<div class="pred-row pred-row-waiting">❌ ${pName}: Tippade inte</div>`;
                        } else if (isPostponed) {
                            const exactTag = exact ? ` [${exact}]` : '';
                            predsHtml += `<div class="pred-row pred-row-postponed">⚠️ ${pName}: ${label}${exactTag}</div>`;
                        } else {
                            const isCorrect   = pred === m.actualOutcome;
                            const exactRight  = exact && m.actualScore && exact === m.actualScore;
                            const icon        = isCorrect ? '✅' : '❌';
                            const exactTag    = exact ? ` [${exact}]${exactRight ? ' 🔮+50' : ''}` : '';
                            const pts         = getCachedPoints(m.id, player);
                            const ptsBadge    = `<span class="pts-badge ${isCorrect ? 'pts-badge-correct' : 'pts-badge-wrong'}">${pts}p</span>`;
                            predsHtml += `<div class="pred-row ${isCorrect ? 'pred-row-correct' : 'pred-row-wrong'}">${icon} ${pName}: ${label}${exactTag}${ptsBadge}</div>`;
                        }
                    });
                    predsHtml += '</div>';
                }

                const canSetResult = currentUser === 'Hefner' && started;
                const resultBtn = canSetResult ? `<button class="result-set-btn" onclick="window.openResultModal('${m.id}')">${m.actualOutcome ? '✏️ Ändra resultat' : '📝 Sätt resultat'}</button>` : '';

                return `
                    <div class="match-item">
                        <div class="match-teams">${m.homeTeam} vs ${m.awayTeam}</div>
                        <div class="match-meta">${dateStr} · ${status}</div>
                        ${predsHtml}
                        ${resultBtn}
                    </div>`;
            }

            list.innerHTML = roundOrder.map((roundName, idx) => {
                const rMatches   = roundGroups[roundName];
                const played     = rMatches.filter(m => m.actualOutcome).length;
                const meta       = played === rMatches.length ? `${rMatches.length} matcher · Klar` :
                                   played > 0 ? `${rMatches.length} matcher · ${played}/${rMatches.length} spelade` :
                                   `${rMatches.length} matcher`;
                const isCollapsed = idx > 0;
                return `
                    <div class="round-group">
                        <div class="round-header" onclick="window.toggleRound(this)">
                            <span>⚽ ${roundName}<span class="round-meta">${meta}</span></span>
                            <span class="round-toggle${isCollapsed ? ' collapsed' : ''}">▼</span>
                        </div>
                        <div class="round-body${isCollapsed ? ' collapsed' : ''}">
                            ${rMatches.map(m => renderMatchCard(m)).join('')}
                        </div>
                    </div>`;
            }).join('');
        }

        window.toggleRound = function(headerEl) {
            const body   = headerEl.nextElementSibling;
            const toggle = headerEl.querySelector('.round-toggle');
            body.classList.toggle('collapsed');
            toggle.classList.toggle('collapsed');
        };

        // ─── RENDER: Tippning (Tippa-flik) ───────────────────────────────────────
        function renderPredictions() {
            const list = document.getElementById('predictionsList');
            if (!list) return;

            if (!currentUser) {
                list.innerHTML = '<div class="empty-state">Logga in for att tippa.</div>';
                return;
            }

            if (!matches || matches.length === 0) {
                list.innerHTML = '<div class="empty-state"><div style="font-size:2em;margin-bottom:10px;">🎯</div><p>Inga matcher inladda an. Hefner laddar in matcher via admin-panelen.</p></div>';
                const lbl = document.getElementById('tippCountLabel');
                if (lbl) lbl.textContent = '';
                return;
            }

            const isViewer = currentUser === 'Askadare';

            // Tipp-counter
            const tippCountLabel = document.getElementById('tippCountLabel');
            if (tippCountLabel) {
                if (isViewer) {
                    tippCountLabel.textContent = '👁 Askadarlage – du kan se tippningarna men inte tippa sjalv';
                    tippCountLabel.style.color = '#d4930a';
                } else {
                    const tippade = matches.filter(m => exactPredictions[m.id]?.[currentUser]).length;
                    const allDone = tippade === matches.length;
                    tippCountLabel.textContent = `${tippade}/${matches.length} matcher tippade`;
                    tippCountLabel.style.color = allDone ? '#059669' : '#dc2626';
                }
            }

            // Gruppera matcher per deadline-key
            const groups     = {};
            const groupOrder = [];
            matches.forEach(m => {
                const key = getDeadlineKey(m);
                if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
                groups[key].push(m);
            });

            const DEADLINE_LABELS = {
                'PL': 'Premier League',
                'CL': 'Champions League',
                'WC': 'VM',
                'CL_LEAGUE_PHASE': 'CL – Ligafas',
                'CL_KNOCKOUT_ROUND_PLAY_OFF': 'CL – Playoff',
                'CL_ROUND_OF_16': 'CL – Åttondelsfinaler',
                'CL_QUARTER_FINALS': 'CL – Kvartsfinaler',
                'CL_SEMI_FINALS': 'CL – Semifinaler',
                'CL_FINAL': 'CL – Final'
            };

            function renderPredCard(m, locked) {
                const myPred        = predictions[m.id]?.[currentUser];
                const myExact       = exactPredictions[m.id]?.[currentUser];
                const started       = isMatchStarted(m.date);
                const dateStr       = formatDateTime(m.date);
                const matchPreds    = predictions[m.id] || {};
                const matchExact    = exactPredictions[m.id] || {};
                const isEffLocked   = locked || started;

                let innerHtml = '';

                if (isEffLocked || isViewer) {
                    // Visa låst kort
                    const lockedLabel = isViewer && !isEffLocked
                        ? '<span style="color:#d4930a;">👁 Askadarlage</span><span class="pred-locked-chip">LASLAGE</span>'
                        : `<span>${myExact ? `Din tipp: <strong>${myExact.replace('-', ' – ')}</strong>` : 'Du tippade inte'}</span><span class="pred-locked-chip">STANGD</span>`;

                    let predsHtml = '';
                    if (isViewer && !isEffLocked) {
                        predsHtml = `<div style="text-align:center;color:#9ca3af;font-size:.82em;padding:8px 0;">Tippningarna visas nar omgangen stanger</div>`;
                    } else if (Object.keys(matchPreds).length > 0) {
                        predsHtml = `<div class="predictions-revealed">
                            <h4>Alla tippningar:</h4>
                            ${Object.entries(matchPreds).map(([player, pred]) => {
                                const exact  = matchExact[player];
                                const trophy = getPlayerTrophyHTML(player);
                                const label  = { '1': m.homeTeam, 'X': 'Oavgjort', '2': m.awayTeam }[pred] || pred;
                                return `<div class="prediction-row">
                                    <span><strong>${player}</strong>${trophy ? ' ' + trophy : ''}</span>
                                    <span style="font-weight:600;color:#d4930a;">
                                        ${exact ? exact.replace('-', ' – ') : pred}
                                        <span style="color:#9ca3af;font-weight:400;font-size:.85em;">(${label})</span>
                                    </span>
                                </div>`;
                            }).join('')}
                        </div>`;
                    }

                    innerHtml = `
                        <div class="pred-card-header">
                            ${m.homeTeam} <span class="pred-card-header-vs">vs</span> ${m.awayTeam}
                        </div>
                        <div class="pred-locked-status">${lockedLabel}</div>
                        ${predsHtml}`;
                } else {
                    // Visa tipp-inputs
                    const homeVal = myExact ? myExact.split('-')[0] : '';
                    const awayVal = myExact ? myExact.split('-')[1] : '';

                    innerHtml = `
                        <div class="score-entry">
                            <div class="score-entry-teams">
                                <span class="score-team score-team-home">${m.homeTeam}</span>
                                <div class="score-inputs">
                                    <input type="number" min="0" max="99" id="exact-home-${m.id}"
                                        value="${homeVal}"
                                        oninput="window.updateScorePrediction('${m.id}')"
                                        class="score-input" placeholder="?">
                                    <span class="score-dash">–</span>
                                    <input type="number" min="0" max="99" id="exact-away-${m.id}"
                                        value="${awayVal}"
                                        oninput="window.updateScorePrediction('${m.id}')"
                                        class="score-input" placeholder="?">
                                </div>
                                <span class="score-team score-team-away">${m.awayTeam}</span>
                            </div>

                        </div>`;
                }

                return `
                    <div class="pred-match${isEffLocked || isViewer ? ' locked' : ''}" data-match-id="${m.id}">
                        <div class="pred-match-meta">${m.league || ''} · ${dateStr}</div>
                        ${innerHtml}
                    </div>`;
            }

            // Bygg deadline-chips och matcher
            let html = '';

            // Visa deadline-chips
            const banners = [];
            groupOrder.forEach(key => {
                const deadline = deadlines[key];
                const isLocked = deadline && new Date() >= new Date(deadline);
                const label    = DEADLINE_LABELS[key] || key;
                if (isLocked) {
                    const lockedStr = new Date(deadline).toLocaleString('sv-SE', {
                        weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    banners.push(`<div class="deadline-chip deadline-chip-locked">
                        <span class="deadline-dot"></span>
                        <span>Stangd · ${label} · Stangde ${lockedStr}</span>
                    </div>`);
                } else if (deadline) {
                    const deadlineStr = new Date(deadline).toLocaleString('sv-SE', {
                        weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    const countdown = formatCountdown(deadline);
                    banners.push(`<div class="deadline-chip deadline-chip-open">
                        <span class="deadline-dot"></span>
                        <span>Oppen · ${label} · Tippa klart innan ${deadlineStr}</span>
                        ${countdown ? `<span class="deadline-countdown" data-countdown="${deadline}">${countdown}</span>` : ''}
                    </div>`);
                }
            });

            if (banners.length > 0) {
                html += `<div class="deadlines-row">${banners.join('')}</div>`;
            }

            // Sortera alla matcher kronologiskt
            const sorted = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
            html += sorted.map(m => renderPredCard(m, isMatchLocked(m))).join('');

            list.innerHTML = html;
        }

        // ─── RENDER: Topplista ────────────────────────────────────────────────────
        function renderLeaderboard() {
            const tbody = document.getElementById('leaderboardBody');
            if (!tbody) return;

            if (!leaguePlayers.length) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px;">Inga spelare i ligan ännu.</td></tr>';
                ['sniperSection','nostradamusSection','unicornSection'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.style.display = 'none';
                });
                return;
            }

            // Standings
            const scores = leaguePlayers.map(player => {
                let totalPoints = 0, correctPreds = 0, bonusCount = 0, finishedMatches = 0;
                matches.forEach(match => {
                    if (match.actualOutcome && match.actualOutcome !== 'POSTPONED') {
                        finishedMatches++;
                        const pts = getCachedPoints(match.id, player);
                        totalPoints += pts;
                        if (predictions[match.id]?.[player] === match.actualOutcome) correctPreds++;
                        if (match.actualScore && exactPredictions[match.id]?.[player] === match.actualScore) bonusCount++;
                    }
                });
                return { player, totalPoints, correctPreds, bonusCount, average: finishedMatches > 0 ? (totalPoints / finishedMatches).toFixed(1) : '0.0' };
            }).sort((a, b) => b.totalPoints !== a.totalPoints ? b.totalPoints - a.totalPoints : b.bonusCount - a.bonusCount);

            tbody.innerHTML = scores.map((s, i) => {
                const rankClass = ['rank-badge-1','rank-badge-2','rank-badge-3'][i] || '';
                const trophy = getPlayerTrophyHTML(s.player);
                const bonus = s.bonusCount > 0
                    ? `<strong style="color:#8b5cf6">${s.bonusCount}</strong>`
                    : '<span style="color:#d1d5db">0</span>';
                return `<tr>
                    <td><span class="rank-badge ${rankClass}">${i+1}</span></td>
                    <td><strong>${s.player}</strong>${trophy ? ' ' + trophy : ''}</td>
                    <td><strong>${s.totalPoints}</strong></td>
                    <td>${s.correctPreds}</td>
                    <td>${bonus}</td>
                    <td>${s.average}</td>
                </tr>`;
            }).join('');

            function nameWithTrophy(player) {
                const t = getPlayerTrophyHTML(player);
                return player + (t ? ' ' + t : '');
            }
            function joinNames(arr) {
                return arr.length === 1 ? arr[0] : arr.slice(0,-1).join(', ') + ' &amp; ' + arr[arr.length-1];
            }

            // Sniper: ensam rätt på 1X2
            const sniperCounts = leaguePlayers.map(player => {
                let soloCorrect = 0;
                matches.forEach(match => {
                    if (!match.actualOutcome || match.actualOutcome === 'POSTPONED') return;
                    const pred = predictions[match.id]?.[player];
                    if (!pred || pred !== match.actualOutcome) return;
                    const correctCount = Object.values(predictions[match.id] || {}).filter(p => p === match.actualOutcome).length;
                    if (correctCount === 1) soloCorrect++;
                });
                return { player, soloCorrect };
            }).sort((a, b) => b.soloCorrect - a.soloCorrect);

            const sniperSection = document.getElementById('sniperSection');
            if (sniperSection) {
                if (sniperCounts[0]?.soloCorrect > 0) {
                    const top = sniperCounts[0].soloCorrect;
                    const leaders = sniperCounts.filter(p => p.soloCorrect === top);
                    document.getElementById('sniperName').innerHTML = joinNames(leaders.map(p => nameWithTrophy(p.player)));
                    document.getElementById('sniperDetails').textContent = `${top} st soloträff${top > 1 ? 'ar' : ''}`;
                    sniperSection.style.display = '';
                } else { sniperSection.style.display = 'none'; }
            }

            // Nostradamus: flest korrekta exakta resultat
            const nostCounts = leaguePlayers.map(player => {
                let correctExact = 0;
                matches.forEach(match => {
                    if (match.actualScore && exactPredictions[match.id]?.[player] === match.actualScore) correctExact++;
                });
                return { player, correctExact };
            }).sort((a, b) => b.correctExact - a.correctExact);

            const nostSection = document.getElementById('nostradamusSection');
            if (nostSection) {
                const withNost = nostCounts.filter(p => p.correctExact > 0);
                if (withNost.length > 0) {
                    const top = withNost[0].correctExact;
                    const leaders = withNost.filter(p => p.correctExact === top);
                    document.getElementById('nostradamusLeader').innerHTML = joinNames(leaders.map(p => nameWithTrophy(p.player)));
                    document.getElementById('nostradamusLeaderDetail').textContent = `${top} st korrekt exakt resultat`;
                    nostSection.style.display = '';
                } else { nostSection.style.display = 'none'; }
            }

            // Unicorn: ensam rätt 1X2 + korrekt exakt
            const unicornCounts = leaguePlayers.map(player => {
                let unicornCount = 0;
                matches.forEach(match => {
                    if (!match.actualOutcome || match.actualOutcome === 'POSTPONED' || !match.actualScore) return;
                    if (exactPredictions[match.id]?.[player] !== match.actualScore) return;
                    const pred = predictions[match.id]?.[player];
                    if (!pred || pred !== match.actualOutcome) return;
                    const correctCount = Object.values(predictions[match.id] || {}).filter(p => p === match.actualOutcome).length;
                    if (correctCount === 1) unicornCount++;
                });
                return { player, unicornCount };
            }).sort((a, b) => b.unicornCount - a.unicornCount);

            const unicornSection = document.getElementById('unicornSection');
            if (unicornSection) {
                const withUnicorns = unicornCounts.filter(p => p.unicornCount > 0);
                if (withUnicorns.length > 0) {
                    const top = withUnicorns[0].unicornCount;
                    const leaders = withUnicorns.filter(p => p.unicornCount === top);
                    document.getElementById('unicornLeader').innerHTML = joinNames(leaders.map(p => nameWithTrophy(p.player)));
                    document.getElementById('unicornLeaderDetail').textContent = `${top} st unicorn-träff${top > 1 ? 'ar' : ''}`;
                    unicornSection.style.display = '';
                } else { unicornSection.style.display = 'none'; }
            }
        }

        // ─── Tippnings-funktioner ─────────────────────────────────────────────────
        window.updateScorePrediction = async function(matchId) {
            if (!currentUser) return;
            const homeVal = document.getElementById(`exact-home-${matchId}`)?.value;
            const awayVal = document.getElementById(`exact-away-${matchId}`)?.value;
            const match   = getMatch(matchId);
            if (!match) return;

            if (homeVal === '' || awayVal === '') return;
            const h = parseInt(homeVal), a = parseInt(awayVal);
            if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
            
            try {
                const outcome = h > a ? '1' : h < a ? '2' : 'X';
                const scoreStr = `${h}-${a}`;
                if (!predictions[matchId]) predictions[matchId] = {};
                if (!exactPredictions[matchId]) exactPredictions[matchId] = {};
                predictions[matchId][currentUser] = outcome;
                exactPredictions[matchId][currentUser] = scoreStr;
                await set(ref(database, `leagues/${currentLeagueCode}/predictions/${matchId}/${currentUser}`), outcome);
                await set(ref(database, `leagues/${currentLeagueCode}/exactPredictions/${matchId}/${currentUser}`), scoreStr);
            } catch (e) { console.error('save', e); }
        };



        // ═══════════════════════════════════════════════════════════════
        // ADMIN-FUNKTIONER (Session 3)
        // ═══════════════════════════════════════════════════════════════

        window.toggleAdminSection = function(el) {
            const body = el.nextElementSibling;
            const icon = el.querySelector('.admin-toggle-icon');
            body.classList.toggle('open');
            if (icon) icon.textContent = body.classList.contains('open') ? '▲' : '▼';
        };

        // ─── CL-fasetiketter ─────────────────────────────────────────────────────
        const CL_STAGE_LABELS = {
            'LEAGUE_PHASE': 'Ligafas', 'KNOCKOUT_ROUND_PLAY_OFF': 'Playoff',
            'GROUP_STAGE': 'Gruppspel', 'ROUND_OF_16': 'Åttondel',
            'QUARTER_FINALS': 'Kvartsfinal', 'SEMI_FINALS': 'Semifinal', 'FINAL': 'Final'
        };

        function adminLog(msg) {
            const el = document.getElementById('adminLoadLog');
            if (!el) return;
            el.style.display = 'block';
            el.textContent += `[${new Date().toLocaleTimeString('sv-SE')}] ${msg}\n`;
            el.scrollTop = el.scrollHeight;
        }

        function fetchLog(msg) {
            const el = document.getElementById('fetchLog');
            if (!el) return;
            el.style.display = 'block';
            el.textContent += `[${new Date().toLocaleTimeString('sv-SE')}] ${msg}\n`;
            el.scrollTop = el.scrollHeight;
        }

        // ─── Ladda matcher ────────────────────────────────────────────────────────
        window.adminLoadMatches = async function() {
            if (currentUser !== 'Hefner') return;
            if (!plApiKey) { showAppMsg('❌ Ange API-nyckel under "API-nyckel" i admin-panelen', 'error'); return; }

            const competition = document.getElementById('adminCompSelect')?.value || 'PL';
            const plRounds = parseInt(document.getElementById('adminPlRounds')?.value || 2);
            const clRounds = parseInt(document.getElementById('adminClRounds')?.value || 2);
            const wmRounds = parseInt(document.getElementById('adminWmRounds')?.value || 2);
            const compNames = { PL: 'Premier League', CL: 'Champions League', WC: 'VM', BOTH: 'PL + CL' };

            if (!confirm(`Hämta matcher från ${compNames[competition]}?\n\nNya matcher läggs till. Befintliga resultat bevaras.`)) return;

            const logEl = document.getElementById('adminLoadLog');
            if (logEl) logEl.textContent = '';

            adminLog(`📥 Hämtar från ${compNames[competition]}...`);

            async function fetchCompetitionMatches(code, rounds) {
                const apiUrl = `https://api.football-data.org/v4/competitions/${code}/matches?status=SCHEDULED,TIMED`;
                const url = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);
                adminLog(`🔗 Hämtar ${code}...`);

                const response = await fetch(url, { headers: { 'X-Auth-Token': plApiKey } });
                if (!response.ok) throw new Error(`${code} API svarade ${response.status}`);

                const data = await response.json();
                const allMatches = data.matches || [];
                adminLog(`📊 ${code}: ${allMatches.length} kommande matcher`);

                const matchesByRound = {};
                const stageBasedCompetition = code !== 'PL';
                allMatches.forEach(m => {
                    const roundKey = stageBasedCompetition ? `${m.stage}_${m.matchday || 1}` : String(m.matchday);
                    if (!matchesByRound[roundKey]) matchesByRound[roundKey] = [];
                    matchesByRound[roundKey].push(m);
                });

                let roundKeys = Object.keys(matchesByRound);
                if (code === 'PL') {
                    roundKeys.sort((a, b) => Number(a) - Number(b));
                } else {
                    roundKeys.sort((a, b) => new Date(matchesByRound[a][0].utcDate) - new Date(matchesByRound[b][0].utcDate));
                }
                roundKeys = roundKeys.slice(0, rounds);

                const converted = [], labels = [];
                roundKeys.forEach(roundKey => {
                    const roundMatches = matchesByRound[roundKey];
                    const first = roundMatches[0];
                    const leagueName = { PL: 'Premier League', CL: 'Champions League', WC: 'VM' }[code] || code;
                    const roundLabel = code === 'PL'
                        ? `Premier League - Omgång ${roundKey}`
                        : `${leagueName} - ${CL_STAGE_LABELS[first.stage] || first.stage}${first.matchday > 1 ? ' (Returmatch)' : ''}`;
                    labels.push(roundLabel);

                    roundMatches.forEach((m, idx) => {
                        const utcDate = new Date(m.utcDate);
                        const opts = { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
                        const dp = {};
                        new Intl.DateTimeFormat('sv-SE', opts).formatToParts(utcDate).forEach(p => { dp[p.type] = p.value; });
                        converted.push({
                            id: `${code.toLowerCase()}_${roundKey}_${idx}`,
                            homeTeam: m.homeTeam.shortName || m.homeTeam.name,
                            awayTeam: m.awayTeam.shortName || m.awayTeam.name,
                            league: roundLabel,
                            date: `${dp.year}-${dp.month}-${dp.day}T${dp.hour}:${dp.minute}`,
                            actualOutcome: null, actualScore: null,
                            apiMatchId: m.id, competition: code, stage: m.stage || null
                        });
                    });
                });
                return { converted, labels };
            }

            try {
                let matchesToLoad = [], roundLabels = [];
                if (competition === 'BOTH') {
                    const [pl, cl] = await Promise.all([
                        fetchCompetitionMatches('PL', plRounds),
                        fetchCompetitionMatches('CL', clRounds)
                    ]);
                    matchesToLoad = [...pl.converted, ...cl.converted];
                    roundLabels   = [...pl.labels, ...cl.labels];
                    matchesToLoad.sort((a, b) => new Date(a.date) - new Date(b.date));
                } else {
                    const rounds = { PL: plRounds, CL: clRounds, WC: wmRounds }[competition] || 2;
                    const result = await fetchCompetitionMatches(competition, rounds);
                    matchesToLoad = result.converted;
                    roundLabels   = result.labels;
                }

                if (matchesToLoad.length === 0) { adminLog('⚠️ Inga matcher hittades.'); return; }

                // Bevara befintliga resultat vid merge
                const existingMap = {};
                matches.forEach(m => { existingMap[m.id] = m; });
                const merged = matchesToLoad.map(m => {
                    const ex = existingMap[m.id];
                    return ex ? { ...m, actualOutcome: ex.actualOutcome, actualScore: ex.actualScore, setBy: ex.setBy, setAt: ex.setAt } : m;
                });
                // Behåll matcher som inte ingår i den nya laddningen
                matches.forEach(m => { if (!matchesToLoad.find(nm => nm.id === m.id)) merged.push(m); });
                merged.sort((a, b) => new Date(a.date) - new Date(b.date));

                adminLog(`✅ Konverterade ${matchesToLoad.length} matcher`);
                await set(ref(database, `leagues/${currentLeagueCode}/matches`), merged);
                await logActivity('ADMIN_LOAD_MATCHES', `Laddade ${matchesToLoad.length} matcher (${roundLabels.join(', ')})`);
                adminLog(`✅ KLART! ${merged.length} matcher totalt i Firebase.`);
                showAppMsg(`✅ ${matchesToLoad.length} matcher laddade!`, 'success');
            } catch (error) {
                adminLog(`❌ FEL: ${error.message}`);
                showAppMsg('❌ Kunde inte hämta: ' + error.message, 'error');
            }
        };

        // ─── Hämta resultat (auto) ────────────────────────────────────────────────
        async function fetchResults() {
            if (!plApiKey) return;
            const now = new Date();
            const pendingMatches = matches.filter(match => {
                if (match.setBy === 'API') return false;
                if (match.actualOutcome === 'POSTPONED') return false;
                if (!isMatchStarted(match.date)) return false;
                return (now - new Date(match.date)) / 3600000 >= 100/60;
            });

            if (pendingMatches.length === 0) {
                fetchLog('ℹ️ Inga matcher att kolla just nu');
                return;
            }

            fetchLog(`⚽ Kollar ${pendingMatches.length} matcher...`);
            let foundResults = 0;

            const groups = {};
            pendingMatches.forEach(match => {
                const matchDate = match.date.split('T')[0];
                const comp = match.competition || (match.id?.startsWith('cl_') ? 'CL' : match.id?.startsWith('wc_') ? 'WC' : 'PL');
                const key = `${comp}_${matchDate}`;
                if (!groups[key]) groups[key] = { comp, matchDate, matches: [] };
                groups[key].matches.push(match);
            });

            const matchesCopy = [...matches];

            for (const key of Object.keys(groups)) {
                const group = groups[key];
                try {
                    const apiUrl = `https://api.football-data.org/v4/competitions/${group.comp}/matches?dateFrom=${group.matchDate}&dateTo=${group.matchDate}`;
                    const url = 'https://corsproxy.io/?' + encodeURIComponent(apiUrl);
                    const response = await fetch(url, { headers: { 'X-Auth-Token': plApiKey } });

                    if (response.status === 429) { fetchLog('⚠️ Rate limit – väntar 60s...'); await new Promise(r => setTimeout(r, 60000)); continue; }
                    if (!response.ok) { fetchLog(`⚠️ API ${response.status} för ${group.comp} ${group.matchDate}`); continue; }

                    const data = await response.json();
                    const games = data.matches || [];

                    for (const match of group.matches) {
                        const game = games.find(g => {
                            const ah = (g.homeTeam?.shortName || g.homeTeam?.name || '').toLowerCase();
                            const aa = (g.awayTeam?.shortName || g.awayTeam?.name || '').toLowerCase();
                            const oh = match.homeTeam.toLowerCase(), oa = match.awayTeam.toLowerCase();
                            return (ah.includes(oh) || oh.includes(ah)) && (aa.includes(oa) || oa.includes(aa));
                        });
                        if (!game || game.status !== 'FINISHED') continue;
                        const hg = game.score?.fullTime?.home, ag = game.score?.fullTime?.away;
                        if (hg == null || ag == null) continue;

                        const outcome = hg > ag ? '1' : hg < ag ? '2' : 'X';
                        const idx = matchesCopy.findIndex(m => m.id === match.id);
                        if (idx >= 0) {
                            matchesCopy[idx] = { ...matchesCopy[idx], actualOutcome: outcome, actualScore: `${hg}-${ag}`, setBy: 'API', setAt: new Date().toISOString() };
                            fetchLog(`✅ ${match.homeTeam} ${hg}-${ag} ${match.awayTeam}`);
                            await logActivity('AUTO_RESULT', `API: ${match.homeTeam} ${hg}-${ag} ${match.awayTeam}`);
                            foundResults++;
                        }
                    }

                    const keys = Object.keys(groups);
                    if (keys.indexOf(key) < keys.length - 1) await new Promise(r => setTimeout(r, 6000));
                } catch (err) {
                    fetchLog(`❌ ${group.comp} ${group.matchDate}: ${err.message}`);
                }
            }

            if (foundResults > 0) {
                await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
            }
            fetchLog(`✅ Klar! ${foundResults} nya resultat`);
            const lastEl = document.getElementById('lastFetchStatus');
            if (lastEl) lastEl.textContent = `Senast: ${new Date().toLocaleTimeString('sv-SE')}`;
        }

        window.manualFetchResults = async function() {
            if (currentUser !== 'Hefner') return;
            const logEl = document.getElementById('fetchLog');
            if (logEl) { logEl.textContent = ''; logEl.style.display = 'block'; }
            await fetchResults();
        };

        window.toggleAutoFetch = function() {
            if (autoFetchInterval) {
                clearInterval(autoFetchInterval);
                autoFetchInterval = null;
                showAppMsg('⏹ Auto-hämtning stoppad', 'info');
            } else {
                autoFetchInterval = setInterval(fetchResults, 15 * 60 * 1000);
                fetchResults();
                showAppMsg('✅ Auto-hämtning startad (var 15:e minut)', 'success');
            }
            const statusEl = document.getElementById('autoFetchStatus');
            const btnEl    = document.getElementById('autoFetchBtn');
            if (statusEl) {
                statusEl.textContent  = autoFetchInterval ? '✅ Aktiv' : '⏹ Inaktiv';
                statusEl.className    = `auto-fetch-status ${autoFetchInterval ? 'auto-fetch-on' : 'auto-fetch-off'}`;
            }
            if (btnEl) {
                btnEl.textContent = autoFetchInterval ? '⏹ Stoppa' : '▶ Starta auto-hämtning';
                btnEl.className   = `btn-admin ${autoFetchInterval ? 'btn-admin-danger' : 'btn-admin-green'}`;
            }
        };

        // ─── Resultat-modal ───────────────────────────────────────────────────────
        window.openResultModal = function(matchId) {
            if (currentUser !== 'Hefner') return;
            const match = getMatch(matchId);
            if (!match) return;
            currentModalMatchId = matchId;
            document.getElementById('modalMatchInfo').textContent = `${match.homeTeam} vs ${match.awayTeam}`;
            document.getElementById('modalScoreHome').textContent = match.homeTeam;
            document.getElementById('modalScoreAway').textContent = match.awayTeam;
            if (match.actualScore && match.actualOutcome !== 'POSTPONED') {
                const parts = match.actualScore.split('-');
                document.getElementById('modalHomeScore').value = parts[0] || '';
                document.getElementById('modalAwayScore').value = parts[1] || '';
            } else {
                document.getElementById('modalHomeScore').value = '';
                document.getElementById('modalAwayScore').value = '';
            }
            document.getElementById('modalSpecialStatus').textContent = '';
            document.getElementById('resultModal').style.display = 'flex';
        };

        window.closeResultModal = function() {
            document.getElementById('resultModal').style.display = 'none';
            currentModalMatchId = null;
        };

        window.setModalPostponed = function() {
            document.getElementById('modalSpecialStatus').textContent = '⚠️ Markeras som inställd vid sparning';
            document.getElementById('modalHomeScore').value = 'POSTPONED';
        };

        window.clearModalResult = function() {
            document.getElementById('modalSpecialStatus').textContent = '🗑️ Resultatet rensas vid sparning';
            document.getElementById('modalHomeScore').value = 'CLEAR';
        };

        window.saveModalResult = async function() {
            if (!currentModalMatchId) return;
            const match = getMatch(currentModalMatchId);
            if (!match) return;
            const homeVal = document.getElementById('modalHomeScore').value;
            const awayVal = document.getElementById('modalAwayScore').value;
            const matchesCopy = matches.map(m => ({ ...m }));
            const idx = matchesCopy.findIndex(m => m.id === currentModalMatchId);
            if (idx < 0) return;
            try {
                if (homeVal === 'POSTPONED') {
                    matchesCopy[idx] = { ...matchesCopy[idx], actualOutcome: 'POSTPONED', actualScore: null, setBy: 'Hefner', setAt: new Date().toISOString() };
                    await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
                    await logActivity('SET_RESULT', `Inställd: ${match.homeTeam} vs ${match.awayTeam}`);
                    showAppMsg('⚠️ Match markerad som inställd', 'info');
                } else if (homeVal === 'CLEAR') {
                    matchesCopy[idx] = { ...matchesCopy[idx], actualOutcome: null, actualScore: null, setBy: null, setAt: null };
                    await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
                    await logActivity('CLEAR_RESULT', `Rensade: ${match.homeTeam} vs ${match.awayTeam}`);
                    showAppMsg('🗑️ Resultat rensat', 'info');
                } else {
                    if (homeVal === '' || awayVal === '') { showAppMsg('❌ Ange båda siffrorna', 'error'); return; }
                    const h = parseInt(homeVal), a = parseInt(awayVal);
                    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) { showAppMsg('❌ Ogiltiga siffror', 'error'); return; }
                    const outcome = h > a ? '1' : h < a ? '2' : 'X';
                    matchesCopy[idx] = { ...matchesCopy[idx], actualOutcome: outcome, actualScore: `${h}-${a}`, setBy: 'Hefner', setAt: new Date().toISOString() };
                    await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
                    await logActivity('SET_RESULT', `Resultat: ${match.homeTeam} ${h}-${a} ${match.awayTeam}`);
                    showAppMsg(`✅ ${match.homeTeam} ${h}–${a} ${match.awayTeam}`, 'success');
                }
                window.closeResultModal();
            } catch (err) { showAppMsg('❌ Fel: ' + err.message, 'error'); }
        };

        // ─── Spelare ──────────────────────────────────────────────────────────────
        function renderAdminPlayers() {
            const list = document.getElementById('adminPlayerList');
            if (!list) return;
            if (!leaguePlayers.length) {
                list.innerHTML = '<div style="color:#9ca3af;font-size:.85em;padding:4px 0;">Inga spelare ännu.</div>';
            } else {
                list.innerHTML = leaguePlayers.map(p => `
                    <div class="player-item">
                        <span class="player-item-name">${p}</span>
                        ${p !== 'Hefner'
                            ? `<button class="btn-admin btn-admin-danger" style="padding:5px 10px;font-size:.78em;" onclick="window.adminRemovePlayer('${p}')">Ta bort</button>`
                            : '<span style="font-size:.78em;color:#d4930a;font-weight:600;">Admin</span>'}
                    </div>`).join('');
            }

            // Väntande ansökningar
            const pendingSection = document.getElementById('pendingPlayersSection');
            const pendingList    = document.getElementById('pendingPlayerList');
            if (!pendingSection || !pendingList) return;
            const pendingEntries = Object.entries(pendingPlayers || {});
            if (currentLeagueInfo.joinMode === 'self' && pendingEntries.length > 0) {
                pendingSection.style.display = '';
                pendingList.innerHTML = pendingEntries.map(([name]) => `
                    <div class="pending-item">
                        <span style="font-weight:600;">${name}</span>
                        <div style="display:flex;gap:6px;">
                            <button class="btn-admin btn-admin-green" style="padding:5px 10px;font-size:.78em;" onclick="window.adminApprovePending('${name}')">✅ Godkänn</button>
                            <button class="btn-admin btn-admin-danger" style="padding:5px 10px;font-size:.78em;" onclick="window.adminRejectPending('${name}')">❌ Neka</button>
                        </div>
                    </div>`).join('');
            } else {
                pendingSection.style.display = 'none';
            }
        }

        window.adminAddPlayer = async function() {
            if (currentUser !== 'Hefner') return;
            const input = document.getElementById('newPlayerInput');
            const name = (input?.value || '').trim();
            if (!name) { showAppMsg('❌ Ange ett namn', 'error'); return; }
            if (leaguePlayers.includes(name)) { showAppMsg(`❌ ${name} finns redan`, 'error'); return; }
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/players`), [...leaguePlayers, name]);
                await logActivity('ADD_PLAYER', `Lade till spelare: ${name}`);
                if (input) input.value = '';
                showAppMsg(`✅ ${name} tillagd`, 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        window.adminRemovePlayer = async function(playerName) {
            if (currentUser !== 'Hefner') return;
            if (playerName === 'Hefner') { showAppMsg('❌ Kan inte ta bort admin', 'error'); return; }
            if (!confirm(`Ta bort ${playerName}? Tippningar och lösenord raderas.`)) return;
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/players`), leaguePlayers.filter(p => p !== playerName));
                const newPw = { ...passwords };
                delete newPw[playerName];
                await set(ref(database, `leagues/${currentLeagueCode}/passwords`), newPw);
                await logActivity('REMOVE_PLAYER', `Tog bort spelare: ${playerName}`);
                showAppMsg(`✅ ${playerName} borttagen`, 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        window.adminApprovePending = async function(name) {
            if (currentUser !== 'Hefner') return;
            const pending = pendingPlayers[name];
            if (!pending) return;
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/players`), [...leaguePlayers, name]);
                await set(ref(database, `leagues/${currentLeagueCode}/passwords/${name}`), pending.passwordHash);
                await set(ref(database, `leagues/${currentLeagueCode}/pendingPlayers/${name}`), null);
                await logActivity('APPROVE_PLAYER', `Godkände spelare: ${name}`);
                showAppMsg(`✅ ${name} godkänd och tillagd`, 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        window.adminRejectPending = async function(name) {
            if (currentUser !== 'Hefner') return;
            if (!confirm(`Neka ansökan från ${name}?`)) return;
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/pendingPlayers/${name}`), null);
                await logActivity('REJECT_PLAYER', `Nekade ansökan: ${name}`);
                showAppMsg(`✅ Ansökan från ${name} nekad`, 'info');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        // ─── Deadlines ────────────────────────────────────────────────────────────
        const ALL_DEADLINE_KEYS = ['PL','CL_LEAGUE_PHASE','CL_KNOCKOUT_ROUND_PLAY_OFF','CL_ROUND_OF_16','CL_QUARTER_FINALS','CL_SEMI_FINALS','CL_FINAL','WC'];
        const DEADLINE_LABELS_FULL = {
            'PL': 'Premier League', 'CL_LEAGUE_PHASE': 'CL – Ligafas',
            'CL_KNOCKOUT_ROUND_PLAY_OFF': 'CL – Playoff', 'CL_ROUND_OF_16': 'CL – Åttondelsfinaler',
            'CL_QUARTER_FINALS': 'CL – Kvartsfinaler', 'CL_SEMI_FINALS': 'CL – Semifinaler',
            'CL_FINAL': 'CL – Final', 'WC': 'VM'
        };

        function renderAdminDeadlines() {
            const el = document.getElementById('adminDeadlinesList');
            if (!el) return;
            const comps = currentLeagueInfo.competitions || [];
            const relevantKeys = ALL_DEADLINE_KEYS.filter(k => {
                if (k === 'PL') return comps.includes('PL');
                if (k === 'WC') return comps.includes('WC');
                return comps.includes('CL');
            });
            el.innerHTML = relevantKeys.map(key => {
                const deadline = deadlines[key];
                const label = DEADLINE_LABELS_FULL[key] || key;
                const isLocked = deadline && new Date() >= new Date(deadline);
                const currentStr = deadline
                    ? new Date(deadline).toLocaleString('sv-SE', { weekday:'short', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
                    : 'Ej satt';
                return `<div class="deadline-row">
                    <div>
                        <div class="deadline-label">${label}</div>
                        <div class="deadline-current" style="color:${isLocked ? '#dc2626' : deadline ? '#059669' : '#9ca3af'}">
                            ${deadline ? (isLocked ? '🔒 Stängd: ' : '🟢 Öppen: ') + currentStr : '⚪ Ej satt'}
                        </div>
                    </div>
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <input type="datetime-local" id="deadline-input-${key}" style="font-size:.78em;padding:5px 8px;border:1px solid #dde3ec;border-radius:6px;" value="${deadline || ''}">
                        <button class="btn-admin btn-admin-primary" style="padding:6px 10px;font-size:.78em;" onclick="window.adminSaveDeadline('${key}')">Spara</button>
                        ${deadline ? `<button class="btn-admin btn-admin-danger" style="padding:6px 10px;font-size:.78em;" onclick="window.adminClearDeadline('${key}')">Rensa</button>` : ''}
                    </div>
                </div>`;
            }).join('');
        }

        window.adminSaveDeadline = async function(key) {
            if (currentUser !== 'Hefner') return;
            const val = document.getElementById(`deadline-input-${key}`)?.value;
            if (!val) { showAppMsg('❌ Välj datum och tid', 'error'); return; }
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/deadlines/${key}`), val);
                await logActivity('SET_DEADLINE', `Spelstopp: ${DEADLINE_LABELS_FULL[key] || key} → ${val}`);
                showAppMsg(`✅ Spelstopp sparat för ${DEADLINE_LABELS_FULL[key] || key}`, 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        window.adminClearDeadline = async function(key) {
            if (currentUser !== 'Hefner') return;
            if (!confirm(`Ta bort spelstopp för ${DEADLINE_LABELS_FULL[key] || key}?`)) return;
            try {
                await set(ref(database, `leagues/${currentLeagueCode}/deadlines/${key}`), null);
                await logActivity('CLEAR_DEADLINE', `Spelstopp borttaget: ${DEADLINE_LABELS_FULL[key] || key}`);
                showAppMsg('✅ Spelstopp borttaget', 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        // ─── Aktivitetslogg ───────────────────────────────────────────────────────
        window.renderActivityLog = function() {
            const el = document.getElementById('activityLogBox');
            if (!el) return;
            if (!activityLog.length) {
                el.innerHTML = '<span style="color:#9ca3af;">Ingen aktivitet ännu.</span>';
                return;
            }
            const icons = { LOGIN:'🔓', LOGOUT:'🔒', AUTO_LOGIN:'⚡', FIRST_LOGIN:'✨', PREDICT:'🎯', SET_RESULT:'📝', CLEAR_RESULT:'🗑️', AUTO_RESULT:'⚽', ADMIN_LOAD_MATCHES:'📥', ADD_PLAYER:'👤', REMOVE_PLAYER:'🗑️', APPROVE_PLAYER:'✅', REJECT_PLAYER:'❌', SET_DEADLINE:'⏰', CLEAR_DEADLINE:'🗑️', POSTPONED_MATCH:'⚠️' };
            const colors = { LOGIN:'#059669', LOGOUT:'#6b7280', AUTO_LOGIN:'#3b82f6', FIRST_LOGIN:'#d4930a', PREDICT:'#8b5cf6', SET_RESULT:'#06b6d4', CLEAR_RESULT:'#ef4444', AUTO_RESULT:'#22c55e', ADMIN_LOAD_MATCHES:'#059669', ADD_PLAYER:'#059669', REMOVE_PLAYER:'#dc2626', APPROVE_PLAYER:'#059669', SET_DEADLINE:'#d4930a' };
            el.innerHTML = [...activityLog].reverse().map(entry => {
                const timeStr = new Date(entry.timestamp).toLocaleString('sv-SE', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
                const icon = icons[entry.action] || '📌';
                const color = colors[entry.action] || '#374151';
                const ip = entry.ip ? ` (${entry.ip})` : '';
                return `<div class="activity-log-entry" style="color:${color}">[${timeStr}] ${icon} <strong>${entry.user}</strong>${ip}: ${entry.details}</div>`;
            }).join('');
        };

        // ─── API-nyckel ───────────────────────────────────────────────────────────
        window.adminSaveApiKey = function() {
            const val = (document.getElementById('apiKeyInput')?.value || '').trim();
            if (!val) { showAppMsg('❌ Ange en API-nyckel', 'error'); return; }
            plApiKey = val;
            localStorage.setItem('kc_api_key', val);
            showAppMsg('✅ API-nyckel sparad', 'success');
            const statusEl = document.getElementById('apiKeyStatus');
            if (statusEl) statusEl.textContent = '✅ API-nyckel sparad i din webbläsare (localStorage)';
        };

        // ─── Ligainfo kopieringsknapp (admin) ─────────────────────────────────────
        window.adminCopyCode = function() {
            const code = document.getElementById('adminShareCode')?.textContent || '';
            copyText(code, 'adminCopyCodeBtn');
        };
        window.adminCopyUrl = function() {
            const url = document.getElementById('adminShareUrl')?.textContent || '';
            copyText(url, 'adminCopyUrlBtn');
        };

        // ─── Historik-rendering ───────────────────────────────────────────────────
        function renderHistory() {
            const container = document.getElementById('historyContent');
            if (!container) return;

            if (!seasonHistory || seasonHistory.length === 0) {
                container.innerHTML = `
                    <div class="app-card">
                        <div class="app-card-title">📜 Historik</div>
                        <div class="empty-state">
                            <div style="font-size:2em;margin-bottom:8px;">📜</div>
                            <p>Inga sparade säsonger ännu.<br>Admin sparar en säsong via Admin-fliken.</p>
                        </div>
                    </div>`;
                return;
            }

            // Visa nyaste säsongen först
            const sorted = [...seasonHistory].reverse();
            const cards = sorted.map(season => {
                const dateStr = season.date
                    ? new Date(season.date).toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '';
                const standings = season.standings || [];
                const rows = standings.map((s, i) => {
                    const rankClass = ['rank-badge-1','rank-badge-2','rank-badge-3'][i] || '';
                    const trophy = i === 0 ? ' 🏆' : '';
                    return `<tr>
                        <td><span class="rank-badge ${rankClass}">${i+1}</span></td>
                        <td><strong>${s.player}</strong>${trophy}</td>
                        <td><strong>${s.points}</strong></td>
                        <td>${s.correctPreds ?? '–'}</td>
                        <td>${s.bonusCount ?? '–'}</td>
                    </tr>`;
                }).join('');

                return `<div class="app-card" style="margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                        <div class="app-card-title" style="margin-bottom:0;">${season.name || 'Säsong'}</div>
                        ${dateStr ? `<div style="font-size:.78em;color:#9ca3af;">${dateStr}</div>` : ''}
                    </div>
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th style="text-align:left;">Spelare</th>
                                <th>Poäng</th>
                                <th>Rätt</th>
                                <th>Exakta</th>
                            </tr>
                        </thead>
                        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px;">Inga spelare</td></tr>'}</tbody>
                    </table>
                </div>`;
            }).join('');

            container.innerHTML = cards;
        }

        // ─── Spara säsong till historik ───────────────────────────────────────────
        window.adminSaveSeason = async function() {
            if (currentUser !== 'Hefner') return;

            const nameInput = document.getElementById('seasonNameInput');
            const name = (nameInput?.value || '').trim();
            if (!name) { showAppMsg('❌ Ange ett säsongsnamn', 'error'); return; }

            if (!leaguePlayers.length) { showAppMsg('❌ Inga spelare i ligan', 'error'); return; }

            // Bygg ställning (samma logik som leaderboard)
            const standings = leaguePlayers.map(player => {
                let totalPoints = 0, correctPreds = 0, bonusCount = 0;
                matches.forEach(match => {
                    if (match.actualOutcome && match.actualOutcome !== 'POSTPONED') {
                        totalPoints += getCachedPoints(match.id, player);
                        if (predictions[match.id]?.[player] === match.actualOutcome) correctPreds++;
                        if (match.actualScore && exactPredictions[match.id]?.[player] === match.actualScore) bonusCount++;
                    }
                });
                return { player, points: totalPoints, correctPreds, bonusCount };
            }).sort((a, b) => b.points !== a.points ? b.points - a.points : b.bonusCount - a.bonusCount);

            const winner = standings[0]?.player || '';

            const entry = {
                name,
                date: new Date().toISOString().split('T')[0],
                winner,
                standings
            };

            try {
                const histRef = ref(database, `leagues/${currentLeagueCode}/seasonHistory`);
                const snap = await get(histRef);
                const existing = snap.val();
                let arr = existing ? (Array.isArray(existing) ? existing : Object.values(existing)) : [];
                arr.push(entry);
                await set(histRef, arr);
                showAppMsg(`✅ Säsongen "${name}" sparad! Vinnare: ${winner}`, 'success');
                if (nameInput) nameInput.value = '';
                await logActivity('ADMIN_SAVE_SEASON', `Sparade säsong: ${name}, vinnare: ${winner}`);
            } catch (err) {
                showAppMsg('❌ Kunde inte spara: ' + err.message, 'error');
            }
        };

        // ─── Nollställ säsong ─────────────────────────────────────────────────────
        window.adminResetSeason = async function() {
            if (currentUser !== 'Hefner') return;
            if (!confirm('⚠️ Nollställ säsongen?\n\nMatcher, tippningar och deadlines raderas.\nSpelare, lösenord och historik behålls.')) return;
            if (!confirm('⚠️ SISTA VARNINGEN! Allt ovanstående raderas permanent.')) return;
            try {
                await logActivity('ADMIN_RESET_SEASON', 'Nollställde säsongen');
                await set(ref(database, `leagues/${currentLeagueCode}/matches`), []);
                await set(ref(database, `leagues/${currentLeagueCode}/predictions`), {});
                await set(ref(database, `leagues/${currentLeagueCode}/exactPredictions`), {});
                await set(ref(database, `leagues/${currentLeagueCode}/deadlines`), {});
                showAppMsg('✅ Säsongen nollställd. Ladda in nya matcher.', 'success');
            } catch (err) { showAppMsg('❌ ' + err.message, 'error'); }
        };

        // ═══════════════════════════════════════════════════════════════
        // SESSION 1 – ADMIN / LANDNINGSSIDA
        // ═══════════════════════════════════════════════════════════════

        // ─── Ligakod-generering ───────────────────────────────────────────────────
        function randomCode() {
            return Array.from({length:6}, () => CHARS[Math.floor(Math.random()*CHARS.length)]).join('');
        }

        async function codeExists(code) {
            return (await get(ref(database, `leagues/${code}/info`))).exists();
        }

        async function generateUniqueCode() {
            for (let i = 0; i < 20; i++) {
                const c = randomCode();
                if (!await codeExists(c)) return c;
            }
            throw new Error('Kunde inte generera unik kod');
        }

        // ─── Admin-autentisering ──────────────────────────────────────────────────
        window.verifyAdmin = async function() {
            const name = document.getElementById('adminName').value.trim();
            const pw   = document.getElementById('adminPassword').value;

            if (!name) { showStatus('adminStatus', '❌ Ange ett namn', 'error'); return; }
            if (!pw)   { showStatus('adminStatus', '❌ Ange ett losenord', 'error'); return; }

            if (!adminHashLoaded) {
                showStatus('adminStatus', '⏳ Laddar – forsok igen om ett ogonblick...', 'info');
                return;
            }

            const hash = await hashPassword(pw);

            if (adminHashStored === null) {
                try {
                    await set(ref(database, 'adminConfig/hefnerHash'), hash);
                    adminHashStored = hash;
                    activateAdmin();
                    showStatus('adminStatus', `✅ Valkommen ${name}! Adminlosenordet ar nu sparat.`, 'success');
                } catch (err) {
                    showStatus('adminStatus', '❌ Kunde inte spara: ' + err.message, 'error');
                }
            } else if (hash === adminHashStored) {
                activateAdmin();
                clearStatus('adminStatus');
            } else {
                showStatus('adminStatus', '❌ Fel losenord', 'error');
            }
        };

        function activateAdmin() {
            adminLoggedIn = true;
            document.getElementById('adminLoginForm').style.display = 'none';
            document.getElementById('adminPanel').style.display     = '';
        }

        window.logoutAdmin = function() {
            adminLoggedIn = false;
            document.getElementById('adminLoginForm').style.display = '';
            document.getElementById('adminPanel').style.display     = 'none';
            document.getElementById('adminPassword').value          = '';
            clearStatus('adminStatus');
        };

        // ─── Navigering ───────────────────────────────────────────────────────────
        window.goToLeague = function() {
            const code = document.getElementById('codeInput').value.trim().toUpperCase();
            if (!code) { showStatus('landingStatus', '❌ Ange en ligakod', 'error'); return; }
            if (code.length !== 6) { showStatus('landingStatus', '❌ Koden maste vara 6 tecken', 'error'); return; }
            clearStatus('landingStatus');
            document.getElementById('goBtn').disabled = true;
            window.location.href = `?liga=${code}`;
        };

        window.showLanding = function() {
            // Återställ liga-state
            if (currentUser) {
                // Inte logga ut formellt, men rensa state
            }
            currentUser       = null;
            currentLeagueCode = '';
            currentLeagueInfo = {};
            leaguePlayers     = [];
            matches           = [];
            predictions       = {};
            exactPredictions  = {};
            passwords         = {};
            deadlines         = {};
            passwordsLoaded   = false;
            leagueUnsubscribers.forEach(u => u());
            leagueUnsubscribers = [];

            history.pushState({}, '', window.location.pathname);

            if (adminLoggedIn) {
                document.getElementById('adminLoginForm').style.display = 'none';
                document.getElementById('adminPanel').style.display     = '';
            } else {
                document.getElementById('adminLoginForm').style.display = '';
                document.getElementById('adminPanel').style.display     = 'none';
            }
            clearStatus('landingStatus');
            showView('viewLanding');
        };

        window.showCreateForm = function() {
            if (!adminLoggedIn) {
                showStatus('adminStatus', '❌ Du maste vara inloggad som admin', 'error');
                return;
            }
            clearStatus('createStatus');
            showView('viewCreate');
        };

        // ─── Skapa liga ───────────────────────────────────────────────────────────
        window.createLeague = async function() {
            if (!adminLoggedIn) {
                showStatus('createStatus', '❌ Du maste vara inloggad som admin', 'error');
                return;
            }

            const name = document.getElementById('leagueName').value.trim();
            if (!name) { showStatus('createStatus', '❌ Ange ett liganamn', 'error'); return; }

            const comps = [];
            if (document.getElementById('compPL').checked) comps.push('PL');
            if (document.getElementById('compCL').checked) comps.push('CL');
            if (document.getElementById('compWC').checked) comps.push('WC');

            if (comps.length === 0) { showStatus('createStatus', '❌ Valj minst en tavling', 'error'); return; }

            const joinMode = document.querySelector('input[name="joinMode"]:checked').value;
            const btn = document.getElementById('createBtn');
            btn.disabled = true;
            btn.textContent = '⏳ Skapar liga...';
            clearStatus('createStatus');

            try {
                const code = await generateUniqueCode();

                await set(ref(database, `leagues/${code}`), {
                    info: {
                        name, createdAt: Date.now(), createdBy: 'Hefner',
                        joinMode, competitions: comps, status: 'active',
                        adminHash: adminHashStored
                    },
                    players: [], passwords: {}, matches: [],
                    predictions: {}, exactPredictions: {},
                    activityLog: [], seasonHistory: []
                });

                createdLeagueCode = code;
                setEl('createdLeagueName', name);
                setEl('createdCode', code);
                setEl('createdUrl', `https://vg1414.github.io/KC/?liga=${code}`);
                showView('viewCreated');

            } catch (err) {
                showStatus('createStatus', '❌ Kunde inte skapa liga: ' + err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '🎣 Skapa liga';
            }
        };

        // ─── Kopiera ──────────────────────────────────────────────────────────────
        async function copyText(text, btnId) {
            try {
                await navigator.clipboard.writeText(text);
                const btn  = document.getElementById(btnId);
                const orig = btn.textContent;
                btn.textContent = '✅ Kopierad!';
                setTimeout(() => { btn.textContent = orig; }, 2200);
            } catch {
                prompt('Kopiera:', text);
            }
        }

        window.copyCode = () => copyText(document.getElementById('createdCode').textContent, 'copyCodeBtn');
        window.copyUrl  = () => copyText(document.getElementById('createdUrl').textContent,  'copyUrlBtn');

        window.goToCreatedLeague = () => { window.location.href = `?liga=${createdLeagueCode}`; };

        // ─── Tangentbords-handlers ────────────────────────────────────────────────
        document.getElementById('codeInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') window.goToLeague();
        });

        document.getElementById('adminPassword').addEventListener('keydown', e => {
            if (e.key === 'Enter') window.verifyAdmin();
        });

        document.getElementById('codeInput').addEventListener('input', e => {
            const c = e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '');
            if (e.target.value !== c) e.target.value = c;
        });

    