const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const form = $("#wishForm");
const nameInput = $("#name");
const messageInput = $("#message");
const photoInput = $("#photo");
const preview = $("#photoPreview");
const previewImage = $("#previewImage");
const statusEl = $("#formStatus");
const counter = $("#counter");
const result = $("#result");
const shared = $("#shared");
const audioToggle = $("#audioToggle");

let selectedImageData = null;
let currentTheme = "classic";
let audioPlayer = null;

// Character counter
if (messageInput && counter) {
  // Show correct count immediately (the textarea may have a default value)
  counter.textContent = messageInput.value.trim().length;
  messageInput.addEventListener("input", () => counter.textContent = messageInput.value.length);
}

// Ambient Audio Setup
function initAudio() {
  if (!audioToggle) return;

  // Royalty-free ambient audio. If the URL is unavailable the button
  // silently disables itself rather than throwing an uncaught error.
  const AUDIO_URL = "https://actions.google.com/sounds/v1/ambiences/outdoor_park.ogg";
  audioPlayer = new Audio();
  audioPlayer.loop = true;
  audioPlayer.volume = 0.4;

  // Detect load failure before the user even clicks
  audioPlayer.addEventListener("error", () => {
    audioToggle.disabled = true;
    audioToggle.title = "Music unavailable";
    audioToggle.querySelector(".audio-label").textContent = "Music N/A";
  }, { once: true });

  audioPlayer.src = AUDIO_URL;

  audioToggle.addEventListener("click", () => {
    if (audioPlayer.paused) {
      audioPlayer.play().then(() => {
        audioToggle.classList.add("playing");
        audioToggle.querySelector(".audio-label").textContent = "Music On";
      }).catch((err) => {
        console.warn("Audio playback blocked:", err);
        // Don't crash — browser autoplay policy or network error
        audioToggle.querySelector(".audio-label").textContent = "Music Off";
      });
    } else {
      audioPlayer.pause();
      audioToggle.classList.remove("playing");
      audioToggle.querySelector(".audio-label").textContent = "Music Off";
    }
  });
}

initAudio();

function readAndCompressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("Please select a JPG, PNG or WebP image."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Please choose an image under 8 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 720;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL("image/webp", .72);
        if (!data.startsWith("data:image/webp")) data = canvas.toDataURL("image/jpeg", .78);
        if (data.length > 850000) {
          const smaller = document.createElement("canvas");
          smaller.width = Math.round(canvas.width * .75);
          smaller.height = Math.round(canvas.height * .75);
          smaller.getContext("2d").drawImage(canvas, 0, 0, smaller.width, smaller.height);
          data = smaller.toDataURL("image/jpeg", .65);
        }
        resolve(data);
      };
      img.onerror = () => reject(new Error("Could not read this image."));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

if (photoInput) {
  photoInput.addEventListener("change", async () => {
    try {
      selectedImageData = await readAndCompressImage(photoInput.files[0]);
      if (previewImage) previewImage.src = selectedImageData || "";
      if (preview) preview.classList.toggle("hidden", !selectedImageData);
    } catch (e) {
      selectedImageData = null;
      photoInput.value = "";
      if (statusEl) statusEl.textContent = e.message;
    }
  });
}

const removePhoto = $("#removePhoto");
if (removePhoto) {
  removePhoto.addEventListener("click", () => {
    selectedImageData = null;
    photoInput.value = "";
    preview.classList.add("hidden");
    previewImage.removeAttribute("src");
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function drawChakra(ctx, x, y, radius, color = "#173d91") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, radius / 18);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let spoke = 0; spoke < 24; spoke++) {
    const angle = (Math.PI * 2 * spoke) / 24;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius / 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRibbon(ctx, W, y, height, color, direction) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.bezierCurveTo(W * .25, y + direction * height, W * .58, y - direction * height, W, y + direction * height * .12);
  ctx.lineTo(W, y + direction * height * 1.2);
  ctx.bezierCurveTo(W * .58, y + direction * height * .1, W * .25, y + direction * height * 1.6, 0, y + direction * height * .82);
  ctx.closePath();
  ctx.fill();
}

// Single-card drawing engine
function drawCard(canvas, wish, onReady) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const theme = wish.theme || "classic";
  ctx.clearRect(0, 0, W, H);

  if (theme === "saffron") {
    // Royal Saffron Theme
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#ff9933");
    grad.addColorStop(0.5, "#d97706");
    grad.addColorStop(1, "#92400e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(40, 40, W - 80, H - 80);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 62px Arial";
    ctx.fillText("HAPPY INDEPENDENCE DAY", W / 2, H * .22);
    ctx.font = "700 36px Arial";
    ctx.fillStyle = "#fef3c7";
    ctx.fillText("15 AUGUST • JAI HIND", W / 2, H * .28);

  } else if (theme === "gold") {
    // Ashoka Gold Theme
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#071b3a");
    grad.addColorStop(0.5, "#0b2545");
    grad.addColorStop(1, "#134074");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.font = "800 62px Arial";
    ctx.fillText("HAPPY INDEPENDENCE DAY", W / 2, H * .22);
    ctx.font = "600 34px Arial";
    ctx.fillStyle = "#d1d5db";
    ctx.fillText("15 AUGUST • ASHOKA CHAKRA PRIDE", W / 2, H * .28);

  } else if (theme === "glass") {
    // Modern Glassmorphism Theme
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#f0f9ff");
    grad.addColorStop(0.5, "#e0f2fe");
    grad.addColorStop(1, "#bae6fd");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.beginPath();
    ctx.roundRect(50, 50, W - 100, H - 100, 40);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#0369a1";
    ctx.font = "800 60px Arial";
    ctx.fillText("HAPPY INDEPENDENCE DAY", W / 2, H * .23);
    ctx.font = "600 34px Arial";
    ctx.fillStyle = "#0284c7";
    ctx.fillText("15 AUGUST • CELEBRATE FREEDOM", W / 2, H * .29);

  } else {
    // Classic Tricolor Theme
    ctx.fillStyle = "#fffaf2"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ff9933"; ctx.fillRect(0, 0, W, H * .09);
    ctx.fillStyle = "#fff"; ctx.fillRect(0, H * .09, W, H * .05);
    ctx.fillStyle = "#138808"; ctx.fillRect(0, H * .14, W, H * .05);

    ctx.fillStyle = "rgba(255,153,51,.12)";
    ctx.beginPath(); ctx.arc(W * .12, H * .30, 120, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(19,136,8,.10)";
    ctx.beginPath(); ctx.arc(W * .88, H * .72, 140, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#0b3d91";
    ctx.font = "800 58px Arial";
    ctx.fillText("HAPPY INDEPENDENCE DAY", W / 2, H * .25);
    ctx.font = "600 34px Arial";
    ctx.fillStyle = "#5b6472";
    ctx.fillText("15 AUGUST • JAI HIND", W / 2, H * .30);
  }

  if (theme === "classic") {
    const background = ctx.createLinearGradient(0, 0, W, H);
    background.addColorStop(0, "#fffdf8");
    background.addColorStop(.6, "#fffaf1");
    background.addColorStop(1, "#f8f0e3");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, W, H);
    drawRibbon(ctx, W, 75, 125, "#ff941c", 1);
    drawRibbon(ctx, W, 194, 105, "#ffffff", 1);
    drawRibbon(ctx, W, 268, 108, "#138a2e", 1);
    drawRibbon(ctx, W, H - 145, 112, "#138a2e", -1);
    drawRibbon(ctx, W, H - 67, 94, "#ffffff", -1);
    drawRibbon(ctx, W, H - 8, 80, "#ff941c", -1);
    ctx.save();
    ctx.shadowColor = "rgba(7, 27, 58, .16)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(138, 200, 94, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawChakra(ctx, 138, 200, 60);
    ctx.textAlign = "center";
    ctx.fillStyle = "#10458f";
    ctx.font = "800 58px Arial";
    ctx.fillText("HAPPY INDEPENDENCE DAY", W / 2, H * .31);
    ctx.font = "600 32px Arial";
    ctx.fillStyle = "#5b6472";
    ctx.fillText("15 AUGUST - JAI HIND", W / 2, H * .355);
  }

  const cx = W / 2, cy = H * .48, r = 185;
  const finish = () => {
    ctx.strokeStyle = theme === "gold" ? "#fbbf24" : "#fff";
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = theme === "saffron" || theme === "gold" ? "#ffffff" : "#14213d";
    ctx.font = "800 58px Arial";
    ctx.fillText(String(wish.name || "").replace(/[<>]/g, ""), cx, H * .67);

    ctx.fillStyle = theme === "gold" ? "#fbbf24" : (theme === "glass" ? "#0284c7" : "#0b3d91");
    ctx.font = "700 42px Arial";
    ctx.fillText("My India • My Pride", cx, H * .73);

    ctx.fillStyle = theme === "saffron" ? "#fef3c7" : (theme === "gold" ? "#e5e7eb" : "#596579");
    ctx.font = "500 30px Arial";
    wrapText(ctx, String(wish.message || "").replace(/[<>]/g, ""), cx, H * .80, W * .78, 44);

    if (theme === "classic") {
      ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(0, H * .96, W, H * .04);
      ctx.fillStyle = "#ff941c"; ctx.roundRect(0, H * .96, W * .37, H * .04, 16); ctx.fill();
      ctx.fillStyle = "#138a2e"; ctx.roundRect(W * .63, H * .96, W * .37, H * .04, 16); ctx.fill();
      drawChakra(ctx, W / 2, H * .98, 13);
    }
    if (onReady) onReady();
  };

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (wish.image) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
      const iw = img.width * scale, ih = img.height * scale;
      ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
      ctx.restore(); finish();
    };
    img.onerror = () => { ctx.restore(); finish(); };
    img.src = wish.image;
  } else {
    const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    grad.addColorStop(0, "#ffd29d"); grad.addColorStop(.5, "#fff"); grad.addColorStop(1, "#bce8b5");
    ctx.fillStyle = grad; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.font = "120px Arial"; ctx.fillStyle = "#0b3d91"; ctx.fillText("🇮🇳", cx, cy + 42);
    ctx.restore(); finish();
  }
}

// Blogger landing page URL — share links always point here
function getSiteRootUrl() {
  // Works on both a user site (https://user.github.io/) and a project site
  // (https://user.github.io/repository/).
  return new URL(".", window.location.href).href.replace(/\/$/, "");
}

function makeShareUrl(wishId) {
  return `${getSiteRootUrl()}/?wish=${encodeURIComponent(wishId)}`;
}

async function showShared(wish) {
  if (!wish || !wish.name || !wish.message || !shared) return;
  document.body.classList.add("shared-mode");
  shared.classList.remove("hidden");
  const sharedMessage = $("#sharedMessage");
  if (sharedMessage) sharedMessage.textContent = wish.message;
  drawCard($("#sharedCanvas"), wish, () => {
    if (window.triggerConfetti) window.triggerConfetti(5000);
  });
  document.title = `${wish.name}'s Independence Day Wish 🇮🇳`;
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.textContent = "Generating your wish...";
    const name = nameInput.value.trim();
    const message = messageInput.value.trim();
    if (!name || !message) {
      if (statusEl) statusEl.textContent = "Please enter your name and message.";
      return;
    }

    const wish = { name, message, theme: currentTheme, image: selectedImageData };

    try {
      const saved = await window.WishStorage.saveWish(wish);
      const shareUrl = makeShareUrl(saved.id);

      drawCard($("#wishCanvas"), wish, () => {
        $("#shareUrl").value = shareUrl;
        result.classList.remove("hidden");
        result.scrollIntoView({ behavior: "smooth", block: "start" });
        if (statusEl) statusEl.textContent = "";
        if (window.triggerConfetti) window.triggerConfetti(4500);
        history.replaceState({}, "", `?wish=${encodeURIComponent(saved.id)}`);
      });
    } catch (err) {
      if (statusEl) statusEl.textContent = "Error saving wish. Please try again.";
    }
  });

  $("#copyBtn").addEventListener("click", async () => {
    const url = $("#shareUrl").value;
    try {
      await navigator.clipboard.writeText(url);
      $("#copyBtn").textContent = "Copied!";
      setTimeout(() => $("#copyBtn").textContent = "Copy", 1500);
    } catch {
      $("#shareUrl").select(); document.execCommand("copy");
    }
  });

  $("#whatsappBtn").addEventListener("click", () => {
    const url = $("#shareUrl").value;
    const text = `🇮🇳 Happy Independence Day! 🇮🇳\n\nI made a special wish for you ❤️\n\n✨ Open your special wish:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  });

  $("#downloadBtn").addEventListener("click", () => {
    const a = document.createElement("a");
    a.download = "independence-day-wish.png";
    a.href = $("#wishCanvas").toDataURL("image/png");
    a.click();
  });

  $("#newWishBtn").addEventListener("click", () => {
    result.classList.add("hidden");
    history.replaceState({}, "", getSiteRootUrl() + "/create.html");
    form.reset();
    messageInput.value = "🇮🇳 Let’s celebrate Independence Day together! Wishing you joy, freedom and pride.";
    counter.textContent = messageInput.value.length;
    selectedImageData = null;
    preview.classList.add("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// Load Shared Wish (Supports both ?wish= and #wish=)
(async function checkSharedWish() {
  const urlParams = new URLSearchParams(window.location.search);
  let wishToken = urlParams.get("wish");

  if (!wishToken) {
    wishToken = new URLSearchParams(location.hash.replace(/^#/, "?")).get("wish");
  }

  if (wishToken) {
    const wishData = await window.WishStorage.fetchWish(wishToken);
    if (wishData) {
      showShared(wishData);
    }
  }
})();
