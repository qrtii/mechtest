// توجيهات الميدان حسب حساب Discord المسجل دخول
// الناتج: الاسم | لاعب معتمد | الكود | التوجيه / المسمى الميداني

const FIELD_ACCOUNT_PROFILES = {
  "481603641158139924": {
    name: "سعيد البدواوي",
    code: "G-142",
    certified: "CD",
    avatar: "https://cdn.discordapp.com/embed/avatars/0.png"
  },
  "1336726577265774715": {
    name: "محمد بن فاضل",
    code: "G-070",
    certified: "CD",
    avatar: "https://cdn.discordapp.com/embed/avatars/1.png"
  }
};

const rankInput = document.getElementById("rank");
const companyInput = document.getElementById("company");
const certifiedInput = document.getElementById("certified");
const playerNameInput = document.getElementById("playerName");
const resultBox = document.getElementById("resultBox");
const showBtn = document.getElementById("showBtn");
const copyBtn = document.getElementById("copyBtn");
const toast = document.getElementById("toast");

const currentProfileAvatar = document.getElementById("currentProfileAvatar");
const currentProfileName = document.getElementById("currentProfileName");
const currentProfileDetails = document.getElementById("currentProfileDetails");

let currentText = "";

function getCurrentDiscordId() {
  const session = window.MechGarageAuth?.getSession?.();
  return session?.discordId || "";
}

function getCurrentProfile() {
  const discordId = getCurrentDiscordId();
  const profile = FIELD_ACCOUNT_PROFILES[discordId];

  if (!profile) return null;

  return {
    discordId,
    ...profile
  };
}

function applyCurrentProfile() {
  const profile = getCurrentProfile();

  if (!profile) {
    showToast("هذا الحساب غير مربوط ببروفايل توجيهات الميدان");
    resultBox.textContent = "هذا الحساب غير مربوط ببروفايل توجيهات الميدان.";
    resultBox.classList.remove("ready");
    return null;
  }

  companyInput.value = profile.name;
  certifiedInput.value = profile.certified;
  playerNameInput.value = profile.code;

  if (currentProfileAvatar) currentProfileAvatar.src = profile.avatar;
  if (currentProfileName) currentProfileName.textContent = profile.name;
  if (currentProfileDetails) {
    currentProfileDetails.textContent = `${profile.discordId} | ${profile.certified} | ${profile.code}`;
  }

  return profile;
}

function makeText() {
  const profile = applyCurrentProfile();
  if (!profile) return "";

  const rank = rankInput.value.trim();

  if (!rank) {
    showToast("اختر التوجيه أولاً");
    rankInput.focus();
    return "";
  }

  return [profile.name, profile.certified, profile.code, rank].filter(Boolean).join(" | ");
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

document.addEventListener("DOMContentLoaded", () => {
  applyCurrentProfile();

  showBtn.addEventListener("click", showResult);
  copyBtn.addEventListener("click", copyResult);

  rankInput.addEventListener("change", () => {
    if (currentText) showResult();
  });

  rankInput.addEventListener("input", () => {
    if (currentText) showResult();
  });
});
