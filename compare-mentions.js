(function () {
  const input = document.getElementById('compareMentionInput');
  const output = document.getElementById('compareMentionOutput');
  const convertBtn = document.getElementById('convertCompareMentionBtn');
  const copyBtn = document.getElementById('copyCompareMentionBtn');
  const refreshBtn = document.getElementById('refreshMechanicsSheetBtn');
  const toast = document.getElementById('toast');

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function convert() {
    const text = input ? input.value : '';
    const converted = window.MechanicsMentions ? window.MechanicsMentions.resolve(text) : text;
    if (output) {
      output.value = converted || 'اكتب الكود أو الاسم أو Copy ID ثم اضغط تحويل.';
    }
  }

  async function copy() {
    convert();
    if (!output || !output.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      showToast('تم نسخ المنشن');
    } catch (error) {
      output.select();
      document.execCommand('copy');
      showToast('تم نسخ المنشن');
    }
  }

  if (convertBtn) convertBtn.addEventListener('click', convert);
  if (copyBtn) copyBtn.addEventListener('click', copy);
  if (refreshBtn) refreshBtn.addEventListener('click', async () => {
    if (window.MechanicsMentions) {
      await window.MechanicsMentions.refresh();
      convert();
      if (typeof runLocalCompare === 'function') runLocalCompare();
      showToast('تم تحديث جدول الميكانيك');
    }
  });
  if (input) input.addEventListener('input', convert);

  document.addEventListener('DOMContentLoaded', convert);

  const supervisorCompareText = document.getElementById('supervisorCompareText');
  const technicianCompareText = document.getElementById('technicianCompareText');
  const runLocalCompareBtn = document.getElementById('runLocalCompareBtn');
  const commonMentionsNames = document.getElementById('commonMentionsNames');
  const supervisorOnlyMentionsNames = document.getElementById('supervisorOnlyMentionsNames');
  const technicianOnlyMentionsNames = document.getElementById('technicianOnlyMentionsNames');

  function normalizeMentionDirection(text) {
    return String(text || '').replace(/<(\d{15,25})@>/g, '<@$1>');
  }

  function extractMentionIds(text) {
    const source = normalizeMentionDirection(
      window.MechanicsMentions ? window.MechanicsMentions.resolve(text || '') : (text || '')
    );

    const ids = new Set();
    const regex = /<@!?(\d{15,25})>|\b(\d{15,25})\b/g;
    let match;

    while ((match = regex.exec(source)) !== null) {
      ids.add(match[1] || match[2]);
    }

    return ids;
  }

  function profileLabel(discordId) {
    const mention = '<@' + discordId + '>';
    const profile = window.MechanicsMentions ? window.MechanicsMentions.lookup(mention) : null;

    if (!profile) {
      return {
        title: mention,
        sub: 'غير موجود في جدول الميكانيك'
      };
    }

    const code = Array.isArray(profile.codes) && profile.codes.length ? profile.codes[0] : '';
    return {
      title: (profile.name || 'بدون اسم') + (code ? ' | ' + code : ''),
      sub: mention
    };
  }

  function renderNameList(element, ids) {
    if (!element) return;

    const list = Array.from(ids || []);
    if (!list.length) {
      element.innerHTML = '<span class="empty-mention-result">لا يوجد</span>';
      return;
    }

    element.innerHTML = list.map((discordId) => {
      const data = profileLabel(discordId);
      return '<div class="mention-name-item">' +
        '<strong>' + data.title + '</strong>' +
        '<span>' + data.sub + '</span>' +
      '</div>';
    }).join('');
  }

  function runLocalCompare() {
    const supervisorIds = extractMentionIds(supervisorCompareText ? supervisorCompareText.value : '');
    const technicianIds = extractMentionIds(technicianCompareText ? technicianCompareText.value : '');

    const common = new Set(Array.from(supervisorIds).filter((id) => technicianIds.has(id)));
    const supervisorOnly = new Set(Array.from(supervisorIds).filter((id) => !technicianIds.has(id)));
    const technicianOnly = new Set(Array.from(technicianIds).filter((id) => !supervisorIds.has(id)));

    renderNameList(commonMentionsNames, common);
    renderNameList(supervisorOnlyMentionsNames, supervisorOnly);
    renderNameList(technicianOnlyMentionsNames, technicianOnly);
  }

  if (runLocalCompareBtn) {
    runLocalCompareBtn.addEventListener('click', runLocalCompare);
  }

  if (supervisorCompareText) supervisorCompareText.addEventListener('input', () => {
    if (commonMentionsNames && commonMentionsNames.dataset.touched === '1') runLocalCompare();
  });
  if (technicianCompareText) technicianCompareText.addEventListener('input', () => {
    if (commonMentionsNames && commonMentionsNames.dataset.touched === '1') runLocalCompare();
  });

})();
