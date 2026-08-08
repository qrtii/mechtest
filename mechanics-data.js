// جدول الميكانيك: تحويل الكود / الاسم / Copy ID إلى منشن Discord
// يحاول القراءة من Google Sheet، ويستخدم بيانات احتياطية إذا تعذر الوصول.
(function () {
  const SHEET_ID = '1K79WxPJarDhtjEscZDwjPojcYYbvWkDUMK_HXMMdJGE';
  const SHEET_GID = '719528778';

  const FALLBACK_PROFILES = [
    { name: 'سعيد البدواوي', code: 'G-109', discordId: '481603641158139924' },
    { name: 'محمد بن فاضل', code: 'G-070', discordId: '1336726577265774715' }
  ];

  const state = {
    loaded: false,
    loading: false,
    source: 'fallback',
    lastError: '',
    byCode: new Map(),
    byName: new Map(),
    byDiscordId: new Map()
  };

  function normalizeDigits(text) {
    const map = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
      '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
      '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9'
    };
    return String(text || '').replace(/[٠-٩۰-۹]/g, (digit) => map[digit] || digit);
  }

  function normalizeArabic(text) {
    return normalizeDigits(String(text || ''))
      .replace(/[إأآ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[ـ_]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normalizeCode(value) {
    const text = normalizeDigits(String(value || '').trim()).toUpperCase();
    if (!text) return '';

    const match = text.match(/(?:^|\b)G\s*[-–—]?\s*(\d{1,4})(?:\b|$)/i) || text.match(/^(\d{1,4})$/);
    if (!match) return '';

    const number = match[1].padStart(3, '0');
    return 'G-' + number;
  }

  function extractDiscordId(text) {
    const normalized = normalizeDigits(String(text || ''));
    const mention = normalized.match(/<@!?(\d{15,25})>/);
    if (mention) return mention[1];
    const raw = normalized.match(/\b\d{15,25}\b/);
    return raw ? raw[0] : '';
  }

  function extractCodes(text) {
    const normalized = normalizeDigits(String(text || ''));
    const codes = new Set();

    const gMatches = normalized.match(/G\s*[-–—]?\s*\d{1,4}/gi) || [];
    gMatches.forEach((item) => {
      const code = normalizeCode(item);
      if (code) codes.add(code);
    });

    // إذا الخانة تحتوي على رقم قصير فقط، اعتبره كود ميكانيكي.
    if (/^\s*\d{1,4}\s*$/.test(normalized)) {
      const code = normalizeCode(normalized);
      if (code) codes.add(code);
    }

    return Array.from(codes);
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function addProfile(profile, source) {
    const discordId = extractDiscordId(profile.discordId || profile.id || profile.copyId || '');
    if (!discordId) return;

    const name = String(profile.name || '').trim();
    const codes = Array.isArray(profile.codes) ? profile.codes : [profile.code];
    const cleanProfile = { discordId, name, codes: [], source: source || 'sheet' };

    codes.forEach((codeValue) => {
      const code = normalizeCode(codeValue);
      if (!code) return;
      cleanProfile.codes.push(code);
      state.byCode.set(code, cleanProfile);
    });

    if (name) state.byName.set(normalizeArabic(name), cleanProfile);
    state.byDiscordId.set(discordId, cleanProfile);
  }

  function resetIndexes() {
    state.byCode.clear();
    state.byName.clear();
    state.byDiscordId.clear();
    FALLBACK_PROFILES.forEach((profile) => addProfile(profile, 'fallback'));
  }

  function headerIndex(headers, patterns) {
    const normalizedHeaders = headers.map((header) => normalizeArabic(header));
    for (let index = 0; index < normalizedHeaders.length; index += 1) {
      if (patterns.some((pattern) => pattern.test(normalizedHeaders[index]))) return index;
    }
    return -1;
  }

  function importRows(headers, rows) {
    const nameIndex = headerIndex(headers, [/^ال?اسم/, /اسم.*الفني/, /الفني/, /الميكانيكي/, /name/]);
    const codeIndex = headerIndex(headers, [/الكود/, /كود/, /code/, /g[- ]?code/]);
    const discordIndex = headerIndex(headers, [/discord/, /ديسكورد/, /كوبي/, /copy/, /ايدي/, /ايدي/, /id/, /معرف/]);

    let imported = 0;

    rows.forEach((row) => {
      const cells = row.map((cell) => String(cell == null ? '' : cell).trim());
      const rowText = cells.join(' | ');

      const discordId = discordIndex >= 0 ? extractDiscordId(cells[discordIndex]) : extractDiscordId(rowText);
      if (!discordId) return;

      const name = nameIndex >= 0 ? cells[nameIndex] : (cells.find((cell) => {
        const clean = cell.trim();
        return clean && !extractDiscordId(clean) && !extractCodes(clean).length && /[\u0600-\u06FFa-zA-Z]/.test(clean);
      }) || '');

      const codes = [];
      if (codeIndex >= 0) {
        const directCode = normalizeCode(cells[codeIndex]);
        if (directCode) codes.push(directCode);
      }
      extractCodes(rowText).forEach((code) => {
        if (!codes.includes(code)) codes.push(code);
      });

      if (!codes.length && !name) return;
      addProfile({ name, codes, discordId }, 'sheet');
      imported += 1;
    });

    if (imported > 0) {
      state.loaded = true;
      state.source = 'sheet';
      state.lastError = '';
    }

    updateStatus();
    return imported;
  }

  function loadFromGviz() {
    return new Promise((resolve, reject) => {
      const callbackName = '__mechanicsSheetCallback_' + Date.now();
      const script = document.createElement('script');
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error('انتهت مهلة قراءة جدول الميكانيك'));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (error) { window[callbackName] = undefined; }
      }

      window[callbackName] = function (response) {
        try {
          cleanup();
          const table = response && response.table;
          if (!table || !Array.isArray(table.rows)) {
            reject(new Error('تعذر قراءة بيانات جدول الميكانيك'));
            return;
          }

          const headers = (table.cols || []).map((col) => col && (col.label || col.id || '') || '');
          const rows = table.rows.map((row) => (row.c || []).map((cell) => {
            if (!cell) return '';
            return cell.f != null ? cell.f : (cell.v != null ? cell.v : '');
          }));

          const imported = importRows(headers, rows);
          resolve(imported);
        } catch (error) {
          reject(error);
        }
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('فشل الاتصال بجدول الميكانيك'));
      };

      script.src = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?tqx=responseHandler:' + callbackName + '&gid=' + SHEET_GID + '&t=' + Date.now();
      document.head.appendChild(script);
    });
  }

  async function refresh() {
    if (state.loading) return false;
    state.loading = true;
    state.lastError = '';
    updateStatus('جاري قراءة جدول الميكانيك...');

    resetIndexes();

    try {
      const imported = await loadFromGviz();
      state.loading = false;
      if (imported > 0) {
        updateStatus('تم ربط جدول الميكانيك');
        return true;
      }
      state.source = 'fallback';
      state.lastError = 'لم يتم العثور على بيانات قابلة للربط في الجدول';
      updateStatus(state.lastError);
      return false;
    } catch (error) {
      state.loading = false;
      state.source = 'fallback';
      state.lastError = error && error.message ? error.message : 'تعذر قراءة جدول الميكانيك';
      updateStatus(state.lastError);
      return false;
    }
  }

  function protectText(working, regex, placeholders) {
    return working.replace(regex, (match) => {
      const token = '__MECH_PROTECT_' + placeholders.length + '__';
      placeholders.push(match);
      return token;
    });
  }

  function resolveMentions(text) {
    const placeholders = [];
    let working = normalizeDigits(String(text || ''));

    working = protectText(working, /https?:\/\/\S+/g, placeholders);
    working = protectText(working, /<@&?!?\d{15,25}>|<@!?\d{15,25}>/g, placeholders);

    // Copy ID مباشر.
    working = working.replace(/\b\d{15,25}\b/g, (discordId) => '<@' + discordId + '>');

    // أكواد G-000 أو رقم قصير في الخانة.
    working = working.replace(/\bG\s*[-–—]?\s*\d{1,4}\b|(?<!\d)\d{1,4}(?!\d)/gi, (token) => {
      const code = normalizeCode(token);
      if (!code) return token;
      const profile = state.byCode.get(code);
      return profile ? '<@' + profile.discordId + '>' : token;
    });

    // الاسم من الجدول.
    const names = Array.from(state.byName.keys()).sort((a, b) => b.length - a.length);
    names.forEach((normalizedName) => {
      const profile = state.byName.get(normalizedName);
      if (!profile || !profile.name) return;
      const pattern = new RegExp(escapeRegExp(profile.name), 'g');
      working = working.replace(pattern, '<@' + profile.discordId + '>');
    });

    placeholders.forEach((value, index) => {
      working = working.replace('__MECH_PROTECT_' + index + '__', value);
    });

    return working.trim();
  }

  function lookup(value) {
    const text = String(value || '').trim();
    const code = normalizeCode(text);
    if (code && state.byCode.has(code)) return state.byCode.get(code);

    const discordId = extractDiscordId(text);
    if (discordId && state.byDiscordId.has(discordId)) return state.byDiscordId.get(discordId);

    const nameKey = normalizeArabic(text);
    if (nameKey && state.byName.has(nameKey)) return state.byName.get(nameKey);

    return null;
  }

  function statusText() {
    if (state.loading) return 'جاري قراءة جدول الميكانيك...';
    if (state.source === 'sheet') return 'تم ربط جدول الميكانيك';
    return state.lastError ? ('تعذر ربط الجدول، يعمل النظام بالبيانات الاحتياطية: ' + state.lastError) : 'يعمل النظام بالبيانات الاحتياطية';
  }

  function updateStatus(customText) {
    const text = customText || statusText();
    document.querySelectorAll('[data-mechanics-status]').forEach((element) => {
      element.textContent = text;
    });
  }

  resetIndexes();

  window.MechanicsMentions = {
    refresh,
    resolve: resolveMentions,
    lookup,
    statusText,
    normalizeCode,
    get source() { return state.source; },
    get loaded() { return state.loaded; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => refresh());
  } else {
    refresh();
  }
})();
