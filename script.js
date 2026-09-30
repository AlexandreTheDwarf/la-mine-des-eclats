const SAVE_KEY = "mine-des-eclats-teaser-v1";
const REPAIR_COST = 5;

const initialState = {
  shards: 0,
  durability: 100,
  resonance: 0,
  depth: 4,
  strikes: 0,
  soundOn: true,
};

const elements = {
  game: document.querySelector("#game"),
  rock: document.querySelector("#rockHitbox"),
  shards: document.querySelector("#shardCount"),
  depth: document.querySelector("#depthCount"),
  durabilityValue: document.querySelector("#durabilityValue"),
  durabilityFill: document.querySelector("#durabilityFill"),
  durabilityMeter: document.querySelector("#durabilityMeter"),
  resonanceValue: document.querySelector("#resonanceValue"),
  resonanceFill: document.querySelector("#resonanceFill"),
  resonanceMeter: document.querySelector("#resonanceMeter"),
  message: document.querySelector("#mineMessage"),
  callout: document.querySelector("#hitCallout"),
  repair: document.querySelector("#repairButton"),
  repairCost: document.querySelector("#repairCost"),
  sound: document.querySelector("#soundToggle"),
  particles: document.querySelector("#particles"),
};

let state = loadState();
let audioContext = null;
let particleFrame = null;
const particles = [];
const context = elements.particles.getContext("2d");

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
    return stored ? { ...initialState, ...stored } : { ...initialState };
  } catch {
    return { ...initialState };
  }
}

function saveState() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // The teaser remains playable if storage is unavailable.
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function render() {
  elements.shards.textContent = state.shards.toLocaleString("fr-FR");
  elements.depth.textContent = state.depth;
  elements.durabilityValue.textContent = state.durability;
  elements.durabilityFill.style.width = `${state.durability}%`;
  elements.durabilityMeter.setAttribute("aria-valuenow", state.durability);
  elements.resonanceValue.textContent = state.resonance;
  elements.resonanceFill.style.width = `${state.resonance}%`;
  elements.resonanceMeter.setAttribute("aria-valuenow", state.resonance);
  elements.rock.disabled = state.durability <= 0;

  const canRepair = state.durability < 100 && (state.shards >= REPAIR_COST || state.durability === 0);
  elements.repair.disabled = !canRepair;
  elements.repairCost.textContent = state.durability === 0 && state.shards < REPAIR_COST
    ? "secours gratuit"
    : `${REPAIR_COST} eclats`;

  if (state.durability <= 0) {
    elements.message.textContent = "La pioche a cede. L'atelier peut encore la sauver.";
    elements.callout.textContent = "PIOCHE BRISEE";
  } else if (state.strikes === 0) {
    elements.message.textContent = "Quelque chose vibre sous la roche.";
    elements.callout.textContent = "FRAPPER";
  } else {
    elements.callout.textContent = "ENCORE";
  }

  elements.sound.classList.toggle("is-muted", !state.soundOn);
  elements.sound.setAttribute("aria-label", state.soundOn ? "Couper le son" : "Activer le son");
  elements.sound.title = state.soundOn ? "Couper le son" : "Activer le son";
}

function strike(event) {
  if (state.durability <= 0) return;

  const point = getImpactPoint(event);
  const gain = Math.random() < 0.16 ? 3 : Math.random() < 0.48 ? 2 : 1;
  const pulse = 7 + Math.floor(Math.random() * 8);

  state.shards += gain;
  state.strikes += 1;
  state.durability = clamp(state.durability - 3, 0, 100);
  state.resonance = clamp(state.resonance + pulse, 0, 100);
  state.depth = 4 + Math.floor(state.strikes / 7);

  elements.message.textContent = gain === 3
    ? "Impact parfait. Le filon chante plus fort."
    : state.strikes < 4
      ? "La roche repond."
      : "Des eclats azur se liberent.";

  animateStrike(point.x, point.y, gain);
  playStrikeSound(gain);

  if (state.resonance >= 100) awakenVein();

  saveState();
  render();
}

function awakenVein() {
  state.resonance = 0;
  state.shards += 12;
  elements.message.textContent = "FILON REVEILLE · une reserve inconnue vient de s'ouvrir.";
  elements.game.classList.remove("is-awake");
  void elements.game.offsetWidth;
  elements.game.classList.add("is-awake");
  setTimeout(() => elements.game.classList.remove("is-awake"), 950);
  playAwakenSound();
}

function repairTool() {
  if (state.durability >= 100) return;

  const emergency = state.durability === 0 && state.shards < REPAIR_COST;
  if (!emergency && state.shards < REPAIR_COST) return;

  if (!emergency) state.shards -= REPAIR_COST;
  state.durability = clamp(state.durability + (emergency ? 35 : 42), 0, 100);
  elements.message.textContent = emergency
    ? "Reparation de fortune. Juste assez pour repartir."
    : "L'acier tient de nouveau. Le filon attend.";
  playRepairSound();
  saveState();
  render();
}

function getImpactPoint(event) {
  if (event instanceof PointerEvent && event.clientX && event.clientY) {
    return { x: event.clientX, y: event.clientY };
  }

  const bounds = elements.rock.getBoundingClientRect();
  return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
}

function animateStrike(x, y, gain) {
  elements.game.classList.add("is-striking");
  elements.rock.classList.remove("is-hit");
  void elements.rock.offsetWidth;
  elements.rock.classList.add("is-hit");

  window.setTimeout(() => {
    elements.game.classList.remove("is-striking");
    elements.rock.classList.remove("is-hit");
  }, 220);

  const gainLabel = document.createElement("span");
  gainLabel.className = "floating-gain";
  gainLabel.textContent = `+${gain}`;
  gainLabel.style.left = `${x}px`;
  gainLabel.style.top = `${y}px`;
  document.body.append(gainLabel);
  window.setTimeout(() => gainLabel.remove(), 760);

  spawnParticles(x, y, gain === 3 ? 22 : 14);
}

function resizeCanvas() {
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  elements.particles.width = Math.floor(window.innerWidth * scale);
  elements.particles.height = Math.floor(window.innerHeight * scale);
  elements.particles.style.width = `${window.innerWidth}px`;
  elements.particles.style.height = `${window.innerHeight}px`;
  context.setTransform(scale, 0, 0, scale, 0, 0);
}

function spawnParticles(x, y, amount) {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.8,
      life: 1,
      size: 2 + Math.random() * 5,
      color: Math.random() > 0.22 ? "#83fff4" : "#ffbd58",
    });
  }

  if (!particleFrame) particleFrame = requestAnimationFrame(drawParticles);
}

function drawParticles() {
  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.16;
    particle.life -= 0.026;
    particle.vx *= 0.985;

    if (particle.life <= 0) {
      particles.splice(index, 1);
      continue;
    }

    context.globalAlpha = particle.life;
    context.fillStyle = particle.color;
    context.shadowColor = particle.color;
    context.shadowBlur = 8;
    context.fillRect(particle.x, particle.y, particle.size, particle.size);
  }

  context.globalAlpha = 1;
  context.shadowBlur = 0;

  if (particles.length) {
    particleFrame = requestAnimationFrame(drawParticles);
  } else {
    particleFrame = null;
  }
}

function ensureAudio() {
  if (!state.soundOn) return null;
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    audioContext = new AudioContext();
  }
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, duration, type, volume, delay = 0) {
  const audio = ensureAudio();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + delay;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(42, frequency * 0.58), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

function playStrikeSound(gain) {
  playTone(gain === 3 ? 420 : 190 + Math.random() * 45, 0.1, "square", 0.035);
  playTone(82, 0.16, "triangle", 0.045, 0.015);
}

function playAwakenSound() {
  [220, 330, 440, 660].forEach((frequency, index) => {
    playTone(frequency, 0.34, "sine", 0.038, index * 0.08);
  });
}

function playRepairSound() {
  playTone(160, 0.12, "square", 0.03);
  playTone(280, 0.2, "triangle", 0.035, 0.09);
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  if (state.soundOn) playTone(440, 0.13, "sine", 0.025);
  saveState();
  render();
}

elements.rock.addEventListener("pointerdown", strike);
elements.repair.addEventListener("click", repairTool);
elements.sound.addEventListener("click", toggleSound);
window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !event.repeat) {
    event.preventDefault();
    strike(event);
  }
  if (event.key.toLowerCase() === "r" && !event.repeat) repairTool();
});

resizeCanvas();
render();
