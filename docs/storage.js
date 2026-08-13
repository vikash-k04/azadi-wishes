/**
 * Wish Storage Service — Supabase Edge Function client
 *
 * The website talks ONLY to the deployed `wish-api` Edge Function.
 * It does not access Supabase Database or Storage directly.
 * It does not contain a service-role/secret key.
 *
 * Backend contract:
 *   POST /functions/v1/wish-api
 *     multipart fields: name, message, theme, optional photo
 *   GET /functions/v1/wish-api?id=XXXXXXXXXX
 *
 * The server generates the 10-character wish ID and returns a temporary
 * signed photo URL when a shared wish is requested.
 */

const WISH_API = {
  functionUrl: "https://pgweyiwzvqpflecjficf.supabase.co/functions/v1/wish-api",
  publishableKey: "sb_publishable_LB7zkG5XYYznv74mBH6RSA_0yJhGErP"
};

const LIMITS = {
  name: 60,
  message: 240
};

const THEMES = new Set(["classic", "saffron", "gold", "glass"]);

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function dataURLtoBlob(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid compressed image data.");

  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: match[1] });
}

async function parseApiResponse(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Server returned HTTP ${response.status}.`);
  }

  if (!response.ok || payload?.error) {
    throw new Error(payload?.error || `Server returned HTTP ${response.status}.`);
  }

  return payload;
}

function apiHeaders() {
  return {
    apikey: WISH_API.publishableKey
  };
}

async function saveWish(wishData) {
  const name = cleanText(wishData.name, LIMITS.name);
  const message = cleanText(wishData.message, LIMITS.message);
  const theme = THEMES.has(wishData.theme) ? wishData.theme : "classic";

  if (!name) throw new Error("Name is required.");
  if (!message) throw new Error("Message is required.");

  // The Edge Function uses these server-side theme names.
  const serverTheme = {
    classic: "tricolor",
    saffron: "heritage",
    gold: "celebration",
    glass: "patriotic"
  }[theme];

  const form = new FormData();
  form.append("name", name);
  form.append("message", message);
  form.append("theme", serverTheme);

  if (wishData.image) {
    const blob = dataURLtoBlob(wishData.image);
    form.append("photo", blob, "wish.webp");
  }

  const response = await fetch(WISH_API.functionUrl, {
    method: "POST",
    headers: apiHeaders(),
    body: form
  });

  const payload = await parseApiResponse(response);

  if (!payload.id || !/^[A-Za-z0-9]{10}$/.test(payload.id)) {
    throw new Error("Server returned an invalid wish ID.");
  }

  return {
    id: payload.id,
    isShortId: true
  };
}

async function fetchWish(id) {
  if (!id || !/^[A-Za-z0-9]{10}$/.test(id)) return null;

  const response = await fetch(
    `${WISH_API.functionUrl}?id=${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: apiHeaders()
    }
  );

  if (response.status === 404 || response.status === 410) return null;

  const payload = await parseApiResponse(response);
  const wish = payload?.wish;
  if (!wish) return null;

  const clientTheme = {
    tricolor: "classic",
    heritage: "saffron",
    celebration: "gold",
    patriotic: "glass"
  }[wish.theme] || "classic";

  return {
    name: wish.name,
    message: wish.message,
    theme: clientTheme,
    image: wish.photoUrl || null
  };
}

window.WishStorage = {
  saveWish,
  fetchWish,
  config: WISH_API
};
