// صيغة الناتج في التوجيه الميداني:
// الاسم | لاعب معتمد | الكود | الموقع / المسمى الميداني
const rankInput = document.getElementById("rank");
const companyInput = document.getElementById("company");
const certifiedInput = document.getElementById("certified");
const playerNameInput = document.getElementById("playerName");
const resultBox = document.getElementById("resultBox");
const showBtn = document.getElementById("showBtn");
const copyBtn = document.getElementById("copyBtn");
const toast = document.getElementById("toast");


const FIELD_DISCORD_PROFILES = {
  "سعيد البدواوي": {
    discordId: "481603641158139924",
    name: "سعيد البدواوي",
    code: "G-142",
    certified: "CD",
    avatar: "https://cdn.discordapp.com/embed/avatars/0.png"
  },
  "محمد بن فاضل": {
    discordId: "1336726577265774715",
    name: "محمد بن فاضل",
    code: "G-070",
    certified: "CD",
    avatar: "https://cdn.discordapp.com/embed/avatars/1.png"
  }
};

function getFieldDiscordProfile(name) {
  return FIELD_DISCORD_PROFILES[String(name || '').trim()] || null;
}

function updateFieldDiscordProfile() {
  const profile = getFieldDiscordProfile(companyInput.value);
  const card = document.getElementById('discordProfileCard');
  const avatar = document.getElementById('discordProfileAvatar');
  const profileName = document.getElementById('discordProfileName');
  const profileId = document.getElementById('discordProfileId');

  if (!card || !avatar || !profileName || !profileId) return;

  if (!profile) {
    card.classList.add('hidden');
    avatar.removeAttribute('src');
    profileName.textContent = '---';
    profileId.textContent = '---';
    return;
  }

  avatar.src = profile.avatar;
  profileName.textContent = profile.name + ' | ' + profile.certified + ' | ' + profile.code;
  profileId.textContent = profile.discordId;
  card.classList.remove('hidden');

  if (certifiedInput && profile.certified) certifiedInput.value = profile.certified;
  if (playerNameInput && profile.code) playerNameInput.value = profile.code;
}

let currentText = "";

function makeText() {
  updateFieldDiscordProfile();

  const rank = rankInput.value.trim();
  const company = companyInput.value.trim();
  const certified = certifiedInput.value.trim();
  const playerName = playerNameInput.value.trim();

  if (!rank) {
    showToast("اختر المسمى الميداني أولاً");
    rankInput.focus();
    return "";
  }

  // عكسنا مكان الاسم مع الموقع فقط، مع بقاء لاعب معتمد والكود في نفس الترتيب.
  return [company, certified, playerName, rank].filter(Boolean).join(" | ");
}

function showResult() {
  const text = makeText();
  if (!text) return;

  currentText = text;
  resultBox.textContent = text;
  resultBox.classList.add("ready");
}

async function copyResult() {
  if (!currentText) showResult();
  if (!currentText) return;

  try {
    await navigator.clipboard.writeText(currentText);
    showToast("تم نسخ النص بنجاح");
  } catch (error) {
    // حل احتياطي للمتصفحات القديمة.
    const temp = document.createElement("textarea");
    temp.value = currentText;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    showToast("تم نسخ النص بنجاح");
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

showBtn.addEventListener("click", showResult);
copyBtn.addEventListener("click", copyResult);

[rankInput, companyInput, certifiedInput, playerNameInput].forEach((input) => {
  input.addEventListener("change", () => {
    if (input === companyInput) updateFieldDiscordProfile();
    if (currentText) showResult();
  });

  input.addEventListener("input", () => {
    if (currentText) showResult();
  });
});
