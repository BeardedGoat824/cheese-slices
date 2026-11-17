(() => {
  const stopSignTarget = document.getElementById("stopSignTarget");
  const cheeseLayer = document.getElementById("cheeseLayer");
  const sliceCountEl = document.getElementById("sliceCount");
  const headerStatusText = document.getElementById("headerStatusText");
  const headerStatusDot = document.getElementById("headerStatusDot");
  const signViewport = document.getElementById("signViewport");

  const btnSlapRandom = document.getElementById("btnSlapRandom");
  const btnToggleNight = document.getElementById("btnToggleNight");
  const btnToggleSound = document.getElementById("btnToggleSound");
  const btnWeather = document.getElementById("btnWeather");
  const btnCopyCoords = document.getElementById("btnCopyCoords");
  const presetButtons = document.querySelectorAll("[data-preset]");

  const reviewsGrid = document.getElementById("reviewsGrid");
  const fieldReportForm = document.getElementById("fieldReportForm");

  let soundEnabled = true;
  let audioCtx = null;
  let slices = [];

  // Coordinates derived from the actual Google Maps photos
  const PRESETS = {
    era1: {
      night: true,
      slices: [
        { x: 24, y: 36, rot: -16, age: 0 },
        { x: 46, y: 24, rot: 12, age: 0 },
        { x: 25, y: 48, rot: 28, age: 0 },
        { x: 38, y: 45, rot: -8, age: 0 },
        { x: 20, y: 66, rot: 6, age: 0 },
        { x: 41, y: 66, rot: -14, age: 0 },
        { x: 51, y: 69, rot: 8, age: 0 },
        { x: 64, y: 66, rot: -5, age: 0 },
        { x: 42, y: 80, rot: 22, age: 0 },
        { x: 67, y: 77, rot: 3, age: 0 },
        { x: 56, y: 58, rot: -20, age: 1 },
        { x: 33, y: 69, rot: 15, age: 1 },
      ],
    },
    era2: {
      night: false,
      slices: [
        { x: 41, y: 52, rot: -12, age: 3 }, // Charred remnant on the T
        { x: 56, y: 49, rot: 4, age: 0 },   // Lone surviving slice between T and O
      ],
    },
    era3: {
      night: false,
      slices: [],
    },
  };

  function playSlapSound(isPeel = false) {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      if (isPeel) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
      } else {
        // Soft wet thwap
        osc.type = "triangle";
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch {
      // Ignore audio errors on restricted browsers
    }
  }

  // Check if normalized (0..100) coordinates lie inside the stop sign octagon
  function isInsideOctagon(xPct, yPct) {
    const dx = Math.abs(xPct - 50);
    const dy = Math.abs(yPct - 50);
    return dx <= 44 && dy <= 44 && dx + dy <= 64;
  }

  function setNightMode(enable) {
    signViewport.dataset.theme = enable ? "night" : "day";
    btnToggleNight.setAttribute("aria-pressed", String(enable));
    btnToggleNight.textContent = enable ? "☀️ Day Mode" : "🌙 Night Mode";
  }

  function updateStatusReadout() {
    const count = slices.length;
    sliceCountEl.textContent = String(count);

    const freshCount = slices.filter((s) => s.age < 2).length;
    const remnantCount = count - freshCount;

    headerStatusDot.classList.toggle("drought", count === 0);

    if (count === 0) {
      headerStatusText.textContent = "NO CHEESE. JUST STOP SIGN.";
    } else if (freshCount >= 8) {
      headerStatusText.textContent = `PEAK DAIRY SATURATION (${count} SLICES)`;
    } else if (freshCount > 0 && remnantCount > 0) {
      headerStatusText.textContent = `${freshCount} SURVIVOR${freshCount > 1 ? "S" : ""} + ${remnantCount} REMNANT${remnantCount > 1 ? "S" : ""}`;
    } else if (freshCount > 0) {
      headerStatusText.textContent = `${freshCount} ACTIVE SLICE${freshCount > 1 ? "S" : ""} ON SIGN`;
    } else {
      headerStatusText.textContent = `${remnantCount} CHARRED REMNANT${remnantCount > 1 ? "S" : ""} ONLY`;
    }
  }

  function renderSlices() {
    cheeseLayer.innerHTML = "";
    slices.forEach((slice, index) => {
      const el = document.createElement("div");
      el.className = "cheese-slice";
      el.style.left = `${slice.x}%`;
      el.style.top = `${slice.y}%`;
      el.style.setProperty("--rot", `${slice.rot}deg`);
      el.style.transform = `rotate(${slice.rot}deg)`;
      el.dataset.age = String(slice.age);
      el.title = "Click to peel slice off sign";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Cheese slice ${index + 1}. Click to peel off.`);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        slices.splice(index, 1);
        playSlapSound(true);
        clearActivePresetHighlight();
        renderSlices();
      });

      cheeseLayer.appendChild(el);
    });
    updateStatusReadout();
  }

  function addSliceAt(xPct, yPct) {
    const rot = Math.round((Math.random() - 0.5) * 34);
    slices.push({ x: xPct, y: yPct, rot, age: 0 });
    playSlapSound(false);
    clearActivePresetHighlight();
    renderSlices();
  }

  function addRandomSlice() {
    for (let attempt = 0; attempt < 25; attempt++) {
      const x = 14 + Math.random() * 72;
      const y = 14 + Math.random() * 72;
      if (isInsideOctagon(x, y)) {
        addSliceAt(Number(x.toFixed(1)), Number(y.toFixed(1)));
        return;
      }
    }
    addSliceAt(50, 50);
  }

  function clearActivePresetHighlight() {
    document.querySelectorAll(".preset-bar .preset-btn[data-preset]").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  function loadPreset(name) {
    const preset = PRESETS[name];
    if (!preset) return;
    slices = preset.slices.map((s) => ({ ...s }));
    setNightMode(preset.night);
    renderSlices();

    document.querySelectorAll(".preset-bar .preset-btn[data-preset]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.preset === name);
    });
  }

  stopSignTarget.addEventListener("click", (e) => {
    const rect = stopSignTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    if (isInsideOctagon(xPct, yPct)) {
      addSliceAt(Number(xPct.toFixed(1)), Number(yPct.toFixed(1)));
    }
  });

  stopSignTarget.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      addRandomSlice();
    }
  });

  btnSlapRandom.addEventListener("click", () => {
    addRandomSlice();
    stopSignTarget.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  btnToggleNight.addEventListener("click", () => {
    const isNight = signViewport.dataset.theme === "night";
    setNightMode(!isNight);
  });

  btnToggleSound.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    btnToggleSound.setAttribute("aria-pressed", String(soundEnabled));
    btnToggleSound.textContent = soundEnabled ? "🔊 Sound: On" : "🔇 Sound: Off";
  });

  btnWeather.addEventListener("click", () => {
    if (slices.length === 0) return;
    slices = slices
      .map((s) => ({ ...s, age: s.age + 1 }))
      .filter((s) => s.age <= 3);
    clearActivePresetHighlight();
    renderSlices();
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      loadPreset(btn.dataset.preset);
      if (btn.classList.contains("preset-trigger")) {
        document.getElementById("simulator").scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Copy GPS Coordinates
  btnCopyCoords.addEventListener("click", async () => {
    const coords = "33.585785, -85.820824";
    try {
      await navigator.clipboard.writeText(coords);
      btnCopyCoords.textContent = "Copied!";
    } catch {
      btnCopyCoords.textContent = coords;
    }
    setTimeout(() => {
      btnCopyCoords.textContent = "Copy";
    }, 1800);
  });

  // Local Guestbook Sightings
  const STORAGE_KEY = "cheese_slices_oxford_sightings_v1";

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderGuestSighting(entry) {
    const starsNum = Number(entry.stars) || 5;
    const starsStr = "★".repeat(starsNum) + "☆".repeat(5 - starsNum);
    const card = document.createElement("article");
    card.className = `review-card ${starsNum <= 2 ? "review-card-drought" : ""}`;
    card.innerHTML = `
      <div class="review-top">
        <div>
          <strong>${escapeHtml(entry.name)}</strong>
          <span class="review-badge">Local Sighting • ${escapeHtml(entry.status)}</span>
        </div>
        <span class="review-stars ${starsNum <= 2 ? "stars-low" : ""}">${starsStr}</span>
      </div>
      <blockquote>“${escapeHtml(entry.note)}”</blockquote>
      <div class="review-foot">Logged locally (${escapeHtml(entry.date)})</div>
    `;
    reviewsGrid.prepend(card);
  }

  function loadStoredSightings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        saved.forEach(renderGuestSighting);
      }
    } catch {
      // Ignore storage failures
    }
  }

  fieldReportForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("reportName").value.trim();
    const status = document.getElementById("reportStatus").value;
    const stars = document.getElementById("reportStars").value;
    const note = document.getElementById("reportNote").value.trim();
    if (!name || !note) return;

    const entry = {
      name,
      status,
      stars,
      note,
      date: new Date().toLocaleDateString(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      existing.push(entry);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-10)));
    } catch {
      // Ignore storage failures
    }

    renderGuestSighting(entry);
    headerStatusText.textContent = status;
    headerStatusDot.classList.toggle("drought", status.includes("NO CHEESE") || status.includes("NO CHEDDAR"));
    fieldReportForm.reset();
  });

  // Boot with Era II ("1 Slice of cheese stuck to the stop sign and the remnants of 2")
  loadPreset("era2");
  loadStoredSightings();
})();
