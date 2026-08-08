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
      showToast('تم تحديث جدول الميكانيك');
    }
  });
  if (input) input.addEventListener('input', convert);

  document.addEventListener('DOMContentLoaded', convert);
})();
