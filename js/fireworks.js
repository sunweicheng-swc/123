"use strict";

// 粒子使用 CSS 像素坐标，画布分辨率单独随设备像素比调整。
class NightSky {
  constructor(starCanvas, effectCanvas, motionPreference) {
    this.starCanvas = starCanvas;
    this.effectCanvas = effectCanvas;
    this.stars = starCanvas.getContext("2d");
    this.ctx = effectCanvas.getContext("2d");
    this.motionPreference = motionPreference;
    this.palette = [
      ["#ffe7b0", "#ffc565", "#ff9853"],
      ["#f1d9ff", "#c990ff", "#826aff"],
      ["#dbf5ff", "#7fd5ff", "#7c99ff"],
      ["#ffe1f0", "#ff8bbd", "#ff688e"],
      ["#ecffeb", "#9ff4cc", "#79c3d6"],
    ];
    this.frame = 0;
    this.focusLost = false;
    this.reset();
    this.resize();
    window.addEventListener("resize", () => this.resize(), { passive: true });
    window.addEventListener("blur", () => {
      this.focusLost = true;
      this.pause();
    });
    window.addEventListener("focus", () => {
      this.focusLost = false;
      this.wake();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.pause();
      else this.wake();
    });
  }

  resize() {
    this.width = this.effectCanvas.clientWidth || window.innerWidth;
    this.height = this.effectCanvas.clientHeight || window.innerHeight;
    this.compact = this.width < 720 || (navigator.hardwareConcurrency || 4) < 4;
    this.limit = this.compact ? 400 : 790;
    const ratio = Math.min(window.devicePixelRatio || 1, this.compact ? 1.5 : 2,
      Math.sqrt(4200000 / (this.width * this.height)));
    for (const [canvas, context] of [[this.starCanvas, this.stars], [this.effectCanvas, this.ctx]]) {
      canvas.width = Math.round(this.width * ratio);
      canvas.height = Math.round(this.height * ratio);
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    this.drawStars();
    if (this.stillPalette !== null) this.drawStillCelebration();
    this.wake();
  }

  drawStars() {
    const ctx = this.stars;
    if (!ctx) return;
    // 固定随机种子让横竖屏切换后保有相同的星空布局。
    let seed = 47235;
    const next = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = this.compact ? 105 : 230;
    for (let i = 0; i < count; i += 1) {
      const x = this.width * next();
      const y = this.height * next();
      const size = .6 + next() ** 2 * 1.95;
      ctx.globalAlpha = .17 + next() * .56;
      ctx.fillStyle = i % 5 === 0 ? "#ffce9c" : "#eee0ff";
      ctx.fillRect(x, y, size, size);
      if (i % 26 === 4) {
        ctx.globalAlpha *= .43;
        ctx.fillRect(x + .5, y - 4, 1, 10);
        ctx.fillRect(x - 4, y + .5, 10, 1);
      }
    }
    ctx.globalAlpha = 1;
  }

  pause() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.lastFrame = null;
  }

  reset() {
    this.pause();
    this.clock = 0;
    this.lastSpark = -Infinity;
    this.stillPalette = null;
    this.ambientAt = null;
    this.queue = [];
    this.rockets = [];
    this.particles = [];
    this.flashes = [];
    this.ctx?.clearRect(0, 0, this.width || 0, this.height || 0);
  }

  setMode(mode) {
    this.reset();
    if (!this.ctx || this.motionPreference.matches) return;

    if (mode === "intro") {
      this.queue = [
        [80, .22, .30, 0, "bloom"], [380, .76, .28, 1, "ring"],
        [790, .48, .21, 2, "bloom"], [1210, .12, .48, 3, "ring"],
        [1450, .86, .48, 0, "willow"], [1770, .38, .36, 3, "bloom"],
        [2080, .65, .31, 1, "ring"],
      ];
    }
    if (mode === "victory") this.scheduleCelebration();
    if (mode === "quiet" || mode === "victory") this.allowAmbient(mode === "quiet" ? 3600 : 5400);
    this.wake();
  }

  // 开场结束后让最后几束自然消散，之后偶尔在边缘放一束。
  finishIntro() {
    this.queue = [];
    this.allowAmbient();
  }

  allowAmbient(delay = 3500) {
    if (this.motionPreference.matches || !this.ctx) return;
    this.ambientAt = this.clock + delay;
    this.wake();
  }

  scheduleCelebration() {
    this.queue = [
      [0, .18, .35, 0, "bloom", true], [100, .83, .37, 3, "ring", true],
      [180, .49, .17, 0, "willow"], [310, .27, .21, 2, "ring"],
      [510, .72, .22, 1, "bloom"], [800, .12, .53, 4, "bloom"],
      [1010, .90, .49, 0, "bloom"], [1280, .37, .24, 3, "ring"],
      [1580, .63, .23, 2, "bloom"], [1950, .83, .21, 1, "ring"],
    ];
    this.confetti();
  }

  showStillCelebration() {
    const previous = this.stillPalette ?? -1;
    this.stillPalette = (previous + 1) % this.palette.length;
    this.drawStillCelebration();
  }

  drawStillCelebration() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    const radius = Math.min(this.width * .15, this.height * .16, 125);
    const bursts = [[.15, .21], [.82, .22], [.10, .68], [.91, .61]];
    for (const [index, [x, y]] of bursts.entries()) {
      const palette = this.palette[(this.stillPalette + index) % this.palette.length];
      for (let i = 0; i < 45; i += 1) {
        const angle = i * 2.399963 + this.stillPalette * .17;
        const distance = Math.sqrt((i + 1) / 45) * radius;
        ctx.fillStyle = palette[i % palette.length];
        ctx.globalAlpha = .55 + i % 4 * .11;
        ctx.fillRect(x * this.width + Math.cos(angle) * distance, y * this.height + Math.sin(angle) * distance, 2, 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  wake() {
    if (!this.ctx || this.frame || this.focusLost || document.hidden || this.motionPreference.matches) return;
    if (!this.queue.length && !this.rockets.length && !this.particles.length && !this.flashes.length) {
      if (this.ambientAt !== null && !this.idleTimer) {
        this.idleTimer = setTimeout(() => {
          this.idleTimer = 0;
          this.clock = this.ambientAt;
          this.ambientBurst();
          this.wake();
        }, Math.max(0, this.ambientAt - this.clock));
      }
      return;
    }
    clearTimeout(this.idleTimer);
    this.idleTimer = 0;
    this.frame = requestAnimationFrame(time => this.update(time));
  }

  ambientBurst() {
    const x = (Math.random() < .5 ? .06 : .82) + Math.random() * .12;
    const y = .19 + Math.random() * .32;
    this.burst(x * this.width, y * this.height, Math.floor(Math.random() * 4), "spark");
    this.ambientAt = this.clock + 4800 + Math.random() * 4200;
  }

  spark(x, y, kind = "spark") {
    if (!this.ctx || this.motionPreference.matches) return;
    const now = performance.now();
    if (now - this.lastSpark < 180) return;
    this.lastSpark = now;
    this.burst(x, y, Math.floor(Math.random() * this.palette.length), kind);
    this.wake();
  }

  launch(x, y, color, kind) {
    this.rockets.push({
      startX: x + (Math.random() - .5) * this.width * .15,
      x, y, color, kind, age: 0, duration: 530 + Math.random() * 250,
      trail: [],
    });
  }

  burst(x, y, color, kind) {
    const scale = Math.min(1, this.height / 650, this.width / 555);
    const small = kind === "spark";
    const question = kind === "question";
    const ring = kind === "ring";
    const willow = kind === "willow";
    const requested = question ? 12 : small ? 36 : ring ? 112 : 143;
    const count = Math.min(this.limit - this.particles.length, Math.ceil(requested * (this.compact ? .62 : 1)));
    if (!small && !question && count > 0) this.flashes.push({ x, y, age: 0, color });
    const colors = this.palette[color];
    const rotation = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i += 1) {
      const angle = rotation + (i / count + (ring ? 0 : Math.random() * .08)) * Math.PI * 2;
      const radius = question ? 1.15 : small ? 2.7 : 7.25;
      const speed = (ring ? .76 + Math.random() * .23 : .23 + Math.random() * .77) * radius * scale;
      this.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        age: 0, life: (small ? 480 : willow ? 1050 : 780) + Math.random() * (small ? 500 : 850),
        color: colors[i % 3], size: .85 + Math.random() * 1.35, kind, glow: i % 3 === 0,
      });
    }
  }

  confetti() {
    const colors = this.palette.flat();
    const count = this.compact ? 78 : 150;
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: Math.random() * this.width, y: -25 - Math.random() * this.height * .63,
        vx: (Math.random() - .5) * 2.1, vy: 1.4 + Math.random() * 2.9,
        age: 0, life: 2600 + Math.random() * 2400,
        size: 3 + Math.random() * 4.5, color: colors[i % colors.length],
        spin: Math.random() * .2 - .1, rotation: Math.random() * 6.3, kind: "paper",
      });
    }
  }

  update(time) {
    this.frame = 0;
    const elapsed = this.lastFrame === null ? 16.7 : Math.min(37, time - this.lastFrame);
    this.lastFrame = time;
    this.clock += elapsed;
    const step = elapsed / 16.7;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    while (this.queue.length && this.queue[0][0] <= this.clock) {
      const [, x, y, color, kind, immediate] = this.queue.shift();
      if (immediate) this.burst(x * this.width, y * this.height, color, kind);
      else this.launch(x * this.width, y * this.height, color, kind);
    }
    if (this.ambientAt !== null && this.clock >= this.ambientAt) this.ambientBurst();

    this.rockets = this.rockets.filter(rocket => this.drawRocket(rocket, elapsed));
    this.flashes = this.flashes.filter(flash => this.drawFlash(flash, elapsed));
    this.particles = this.particles.filter(particle => this.drawParticle(particle, elapsed, step));
    ctx.globalAlpha = 1;
    this.wake();
    if (!this.frame) this.lastFrame = null;
  }

  drawRocket(rocket, elapsed) {
    rocket.age += elapsed;
    if (rocket.age >= rocket.duration) {
      this.burst(rocket.x, rocket.y, rocket.color, rocket.kind);
      return false;
    }
    const ctx = this.ctx;
    const t = rocket.age / rocket.duration;
    const arc = 1 - (1 - t) ** 1.55;
    const x = rocket.startX + (rocket.x - rocket.startX) * t;
    const y = this.height + 10 + (rocket.y - this.height - 10) * arc;
    rocket.trail.push([x, y]);
    if (rocket.trail.length > 10) rocket.trail.shift();
    for (let i = 1; i < rocket.trail.length; i += 1) {
      ctx.globalAlpha = i / rocket.trail.length * .8;
      ctx.strokeStyle = this.palette[rocket.color][1];
      ctx.lineWidth = .6 + i * .14;
      ctx.beginPath();
      ctx.moveTo(...rocket.trail[i - 1]);
      ctx.lineTo(...rocket.trail[i]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff6de";
    ctx.fillRect(x - 1.5, y - 2, 3, 4);
    return true;
  }

  drawFlash(flash, elapsed) {
    flash.age += elapsed;
    if (flash.age >= 230) return false;
    const ctx = this.ctx;
    const radius = 42 + flash.age * .32;
    const light = ctx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
    light.addColorStop(0, this.palette[flash.color][0]);
    light.addColorStop(.23, this.palette[flash.color][1] + "58");
    light.addColorStop(1, this.palette[flash.color][1] + "00");
    ctx.globalAlpha = .48 * (1 - flash.age / 230) ** 2;
    ctx.fillStyle = light;
    ctx.fillRect(flash.x - radius, flash.y - radius, radius * 2, radius * 2);
    return true;
  }

  drawParticle(particle, elapsed, step) {
    particle.age += elapsed;
    const progress = particle.age / particle.life;
    if (progress >= 1 || particle.y > this.height + 40) return false;
    const ctx = this.ctx;
    const paper = particle.kind === "paper";
    const question = particle.kind === "question";
    const willow = particle.kind === "willow";
    particle.x += particle.vx * step;
    particle.y += particle.vy * step;
    if (!paper) {
      const friction = .978 ** step;
      particle.vx *= friction;
      particle.vy = particle.vy * friction + (willow ? .063 : .036) * step;
    }
    ctx.globalAlpha = Math.min(1, (1 - progress) * (paper ? 2.15 : 1.35));
    ctx.fillStyle = particle.color;
    if (paper) {
      particle.rotation += particle.spin * step;
      ctx.save();
      ctx.translate(particle.x + Math.sin(particle.age / 350 + particle.size) * 8, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillRect(0, 0, particle.size, particle.size * 1.75 * Math.cos(particle.age / 150 + particle.spin * 16));
      ctx.restore();
    } else if (question) {
      ctx.font = "bold " + Math.round(13 + particle.size * 4) + "px system-ui";
      ctx.fillText("?", particle.x, particle.y);
    } else {
      const width = particle.size * (1 - progress * .65);
      const tail = willow ? 6 : 3.7;
      ctx.strokeStyle = particle.color;
      ctx.beginPath();
      ctx.moveTo(particle.x - particle.vx * tail, particle.y - particle.vy * tail);
      ctx.lineTo(particle.x, particle.y);
      if (particle.glow && progress < .66) {
        const alpha = ctx.globalAlpha;
        ctx.lineWidth = width + 3;
        ctx.globalAlpha = alpha * .2;
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
      ctx.lineWidth = width;
      ctx.stroke();
      if (progress < .54) ctx.fillRect(particle.x, particle.y, 1.2, 1.2);
    }
    return true;
  }
}
