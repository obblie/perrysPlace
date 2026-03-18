const IMAGE_EXT = /\.(avif|webp|png|jpe?g|gif)$/i;
const AUTO_ADVANCE_MS = 7000;
let autoAdvanceTimer = null;

const state = {
  images: [],
  current: 0,
  touchStartX: 0,
};

const track = document.getElementById("carouselTrack");
const indicators = document.getElementById("carouselIndicators");
const thumbs = document.getElementById("carouselThumbs");
const heroImage = document.getElementById("heroImage");
const fallback = document.getElementById("galleryFallback");
const prevBtn = document.querySelector(".carousel-btn.prev");
const nextBtn = document.querySelector(".carousel-btn.next");
const revealEmailBtn = document.getElementById("revealEmailBtn");
const revealedEmail = document.getElementById("revealedEmail");
const revealedEmailLink = document.getElementById("revealedEmailLink");

async function loadImageList() {
  // Preferred: explicit manifest created at build/content stage.
  try {
    const manifestRes = await fetch("public/images.json", { cache: "no-store" });
    if (manifestRes.ok) {
      const manifest = await manifestRes.json();
      if (Array.isArray(manifest)) {
        return manifest.filter((file) => IMAGE_EXT.test(file)).map((file) => `public/${file}`);
      }
    }
  } catch {
    // No manifest found; fallback to directory listing.
  }

  // Fallback: parse links when server exposes /public/ directory index.
  try {
    const dirRes = await fetch("public/", { cache: "no-store" });
    if (!dirRes.ok) return [];
    const html = await dirRes.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    const files = [...doc.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter(Boolean)
      .filter((href) => !href.startsWith("/") && !href.endsWith("/"))
      .filter((href) => IMAGE_EXT.test(href));

    return [...new Set(files)].map((file) => `public/${decodeURIComponent(file)}`);
  } catch {
    return [];
  }
}

function renderCarousel() {
  track.innerHTML = "";
  indicators.innerHTML = "";
  thumbs.innerHTML = "";

  state.images.forEach((src, index) => {
    const slide = document.createElement("article");
    slide.className = "slide";

    const img = document.createElement("img");
    img.src = src;
    img.alt = `Perry's Place photo ${index + 1}`;
    img.loading = index === 0 ? "eager" : "lazy";
    slide.append(img);
    track.append(slide);

    const dot = document.createElement("button");
    dot.className = "indicator";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to image ${index + 1}`);
    dot.addEventListener("click", () => goTo(index));
    indicators.append(dot);

    const thumb = document.createElement("button");
    thumb.className = "thumb";
    thumb.type = "button";
    thumb.setAttribute("aria-label", `Select image ${index + 1}`);
    thumb.addEventListener("click", () => goTo(index));

    const thumbImg = document.createElement("img");
    thumbImg.src = src;
    thumbImg.alt = "";
    thumbImg.loading = "lazy";
    thumb.append(thumbImg);
    thumbs.append(thumb);
  });

  updateCarousel();
}

function updateCarousel() {
  track.style.transform = `translateX(-${state.current * 100}%)`;

  [...indicators.children].forEach((dot, i) => {
    dot.classList.toggle("active", i === state.current);
    dot.setAttribute("aria-current", i === state.current ? "true" : "false");
  });

  [...thumbs.children].forEach((thumb, i) => {
    thumb.classList.toggle("active", i === state.current);
    thumb.setAttribute("aria-current", i === state.current ? "true" : "false");
  });

  if (state.images[state.current]) {
    heroImage.src = state.images[state.current];
  }
}

function goTo(index) {
  if (!state.images.length) return;
  state.current = (index + state.images.length) % state.images.length;
  updateCarousel();
}

function bindCarouselEvents() {
  prevBtn.addEventListener("click", () => {
    goTo(state.current - 1);
    startAutoAdvance();
  });
  nextBtn.addEventListener("click", () => {
    goTo(state.current + 1);
    startAutoAdvance();
  });

  track.addEventListener("touchstart", (e) => {
    state.touchStartX = e.changedTouches[0].clientX;
  });

  track.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - state.touchStartX;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goTo(state.current + 1);
    else goTo(state.current - 1);
    startAutoAdvance();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      goTo(state.current - 1);
      startAutoAdvance();
    }
    if (e.key === "ArrowRight") {
      goTo(state.current + 1);
      startAutoAdvance();
    }
  });
}

function startAutoAdvance() {
  if (autoAdvanceTimer) {
    window.clearInterval(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }

  if (state.images.length < 2) return;

  autoAdvanceTimer = window.setInterval(() => {
    goTo(state.current + 1);
  }, AUTO_ADVANCE_MS);
}

function bindEmailReveal() {
  if (!revealEmailBtn || !revealedEmail || !revealedEmailLink) return;

  revealEmailBtn.addEventListener("click", () => {
    const user = "you";
    const domain = "example.com";
    const email = `${user}@${domain}`;

    revealedEmailLink.href = `mailto:${email}`;
    revealedEmailLink.textContent = email;
    revealedEmail.hidden = false;
    revealEmailBtn.hidden = true;
  });
}

function initListingMap() {
  const mapEl = document.getElementById("listingMap");
  if (!mapEl || typeof window.L === "undefined") return;

  const coords = [40.6772463, -73.9756434];
  const map = window.L.map(mapEl, { scrollWheelZoom: false }).setView(coords, 16);

  window
    .L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    })
    .addTo(map);

  window.L.marker(coords).addTo(map).bindPopup("Perry's Place<br>111 St. Johns Place, Brooklyn, NY").openPopup();
  window.addEventListener("resize", () => map.invalidateSize());
}

async function init() {
  document.getElementById("year").textContent = String(new Date().getFullYear());
  bindEmailReveal();
  initListingMap();

  state.images = await loadImageList();
  if (!state.images.length) {
    fallback.hidden = false;
    prevBtn.hidden = true;
    nextBtn.hidden = true;
    heroImage.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop stop-color='%2337465a'/%3E%3Cstop offset='1' stop-color='%23212934'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='1600' height='900' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' fill='%23ffffff' font-size='50' text-anchor='middle' font-family='sans-serif'%3EAdd images to public/%3C/text%3E%3C/svg%3E";
    return;
  }

  renderCarousel();
  bindCarouselEvents();
  startAutoAdvance();
}

init();
