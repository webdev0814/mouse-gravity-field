(() => {
  const canvas = document.getElementById("field");
  if (!canvas) return;

  const hero = canvas.closest(".demo");
  if (!hero) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  if (prefersReducedMotion.matches || !finePointer.matches) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: 0, y: 0, active: false },
    target: { x: 0, y: 0, active: false },
    particles: [],
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, amount) => from + (to - from) * amount;

  function resize() {
    const rect = hero.getBoundingClientRect();
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    if (!state.particles.length) {
      const count = clamp(Math.round((state.width * state.height) / 22000), 36, 76);
      for (let i = 0; i < count; i += 1) {
        const anchorX = Math.random() * state.width;
        const anchorY = Math.random() * state.height;
        state.particles.push({
          anchorX,
          anchorY,
          x: anchorX + (Math.random() - 0.5) * 20,
          y: anchorY + (Math.random() - 0.5) * 20,
          vx: 0,
          vy: 0,
          radius: 1.8 + Math.random() * 3.4,
          orbit: 8 + Math.random() * 20,
          phase: Math.random() * Math.PI * 2,
          spring: 0.003 + Math.random() * 0.0045,
          drag: 0.94 + Math.random() * 0.03,
          hue: i % 3 === 0 ? 176 : i % 3 === 1 ? 38 : 194,
          alpha: 0.18 + Math.random() * 0.16,
        });
      }
    }
  }

  function updatePointer(event) {
    const rect = hero.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, state.width);
    const y = clamp(event.clientY - rect.top, 0, state.height);
    state.target.x = x;
    state.target.y = y;
    state.target.active = true;
  }

  function leavePointer() {
    state.target.active = false;
  }

  function drawBackground() {
    ctx.fillStyle = "rgba(8, 16, 20, 0.06)";
    ctx.fillRect(0, 0, state.width, state.height);
  }

  function drawParticles(pointerX, pointerY) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const particle of state.particles) {
      const dx = particle.x - pointerX;
      const dy = particle.y - pointerY;
      const distance = Math.hypot(dx, dy) || 1;
      const proximity = clamp(1 - distance / (Math.min(state.width, state.height) * 0.34), 0, 1);
      const size = particle.radius + proximity * 1.8;

      const glow = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size * 6);
      glow.addColorStop(0, `hsla(${particle.hue}, 100%, 82%, ${particle.alpha + proximity * 0.24})`);
      glow.addColorStop(0.4, `hsla(${particle.hue}, 100%, 68%, ${(particle.alpha * 0.42) + proximity * 0.08})`);
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size * 5.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${particle.hue}, 100%, 88%, ${0.36 + proximity * 0.18})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < state.particles.length; i += 1) {
      const current = state.particles[i];
      let links = 0;
      for (let j = i + 1; j < state.particles.length && links < 2; j += 1) {
        const next = state.particles[j];
        const distance = Math.hypot(next.x - current.x, next.y - current.y);
        if (distance > 170) continue;
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - distance / 170) * 0.09})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        links += 1;
      }
    }

    ctx.restore();
  }

  function frame(time) {
    if (state.target.active) {
      state.pointer.x = lerp(state.pointer.x, state.target.x, 0.14);
      state.pointer.y = lerp(state.pointer.y, state.target.y, 0.14);
    } else {
      state.pointer.x = lerp(state.pointer.x, state.width * 0.56, 0.04);
      state.pointer.y = lerp(state.pointer.y, state.height * 0.42, 0.04);
    }

    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();

    const centerX = state.pointer.x;
    const centerY = state.pointer.y;
    const repulseRadius = Math.min(state.width, state.height) * 0.32;
    const maxSpeed = 1.35;

    for (const particle of state.particles) {
      const orbitAngle = time * 0.0007 + particle.phase;
      const orbitX = particle.anchorX + Math.sin(orbitAngle) * particle.orbit;
      const orbitY = particle.anchorY + Math.cos(orbitAngle * 1.1) * particle.orbit * 0.72;
      const toPointerX = particle.x - centerX;
      const toPointerY = particle.y - centerY;
      const distance = Math.hypot(toPointerX, toPointerY) || 1;
      const pull = clamp(1 - distance / repulseRadius, 0, 1);
      const swirlX = -toPointerY / distance;
      const swirlY = toPointerX / distance;

      particle.vx += (orbitX - particle.x) * particle.spring;
      particle.vy += (orbitY - particle.y) * particle.spring;
      particle.vx += (toPointerX / distance) * pull * 1.05;
      particle.vy += (toPointerY / distance) * pull * 1.05;
      particle.vx += swirlX * pull * 0.18;
      particle.vy += swirlY * pull * 0.18;
      particle.vx *= particle.drag;
      particle.vy *= particle.drag;

      const speed = Math.hypot(particle.vx, particle.vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        particle.vx *= scale;
        particle.vy *= scale;
      }

      particle.x += particle.vx;
      particle.y += particle.vy;

      if (particle.x < 16) {
        particle.x = 16;
        particle.vx *= -0.35;
      } else if (particle.x > state.width - 16) {
        particle.x = state.width - 16;
        particle.vx *= -0.35;
      }

      if (particle.y < 16) {
        particle.y = 16;
        particle.vy *= -0.35;
      } else if (particle.y > state.height - 16) {
        particle.y = state.height - 16;
        particle.vy *= -0.35;
      }
    }

    drawParticles(state.pointer.x, state.pointer.y);
    requestAnimationFrame(frame);
  }

  resize();
  state.pointer.x = state.width * 0.56;
  state.pointer.y = state.height * 0.42;
  state.target.x = state.pointer.x;
  state.target.y = state.pointer.y;

  hero.addEventListener("pointermove", updatePointer);
  hero.addEventListener("pointerleave", leavePointer);
  hero.addEventListener("pointercancel", leavePointer);
  window.addEventListener("resize", resize);

  requestAnimationFrame(frame);
})();
