/**
 * Hero LiDAR-style canvas — pauses when tab hidden only (keeps moving while scrolling).
 * Time uses rAF timestamps so speed stays consistent if frame rate drops.
 */
export function initLidarCanvas() {
  const canvas = document.getElementById('lidar-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Wall-clock animation time (matches old 60fps `t += 1/60` behavior). */
  let lastFrameTs = 0;

  /** Left bleed + shift: desktop only; paired with CSS inner offset so art moves ~125px left on screen. */
  const SHIFT_PAD_PX = 125;
  let w = 0;
  let h = 0;
  let colW = 0;
  /** Skip tiny height-only changes (mobile browser chrome) to avoid canvas clear/flicker */
  let lastOuterW = 0;
  let lastOuterH = 0;
  let padX = 0;
  let t = 0;
  let rafId = 0;
  /** Pause rAF when hero scrolls out of view (saves CPU while reading lower sections). */
  let heroInView = true;
  const container = document.getElementById('hero-animation-canvas');

  function shouldAnimate() {
    return !reduceMotion && !document.hidden && heroInView;
  }

  const palette = [
    '100,1,227',
    '72,40,240',
    '50,80,255',
    '20,120,255',
    '0,160,255',
    '60,100,240',
  ];

  const bands = [
    { base: 0.625, width: 90, blur: 54, color: palette[0], alpha: 0.74, bend: 48, drift: 28, phase: 0.4, speed: 0.95, depth: 0.72, lift: -18, coreScale: 0.95 },
    { base: 0.67, width: 76, blur: 50, color: palette[1], alpha: 0.7, bend: 42, drift: 20, phase: 1.1, speed: 1.08, depth: 0.88, lift: -10, coreScale: 1.02 },
    { base: 0.725, width: 92, blur: 58, color: palette[2], alpha: 0.68, bend: 34, drift: 16, phase: 2.1, speed: 0.9, depth: 1.0, lift: 0, coreScale: 1.06 },
    { base: 0.795, width: 84, blur: 54, color: palette[3], alpha: 0.66, bend: 30, drift: 18, phase: 2.85, speed: 0.82, depth: 1.14, lift: 10, coreScale: 1.12 },
    { base: 0.855, width: 94, blur: 54, color: palette[4], alpha: 0.66, bend: 36, drift: 16, phase: 3.4, speed: 0.75, depth: 1.22, lift: 16, coreScale: 1.16 },
    { base: 0.9, width: 68, blur: 44, color: palette[5], alpha: 0.7, bend: 24, drift: 12, phase: 4.0, speed: 0.72, depth: 1.3, lift: 22, coreScale: 1.2 },
  ];

  const meshNodes = [
    { x: 0.7, y: 0.22 },
    { x: 0.81, y: 0.17 },
    { x: 0.92, y: 0.3 },
    { x: 0.95, y: 0.46 },
    { x: 0.9, y: 0.67 },
    { x: 0.77, y: 0.57 },
    { x: 0.67, y: 0.72 },
    { x: 0.61, y: 0.55 },
    { x: 0.63, y: 0.34 },
  ];
  const meshEdges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 0],
    [0, 2],
    [1, 5],
    [2, 5],
    [4, 7],
    [8, 2],
  ];
  const ghostNodes = [
    [0.75, 0.44, 16],
    [0.84, 0.73, 14],
    [0.59, 0.28, 13],
    [0.91, 0.39, 15],
    [0.69, 0.61, 13],
  ];
  /** Wide column: current desktop nudge. Narrow column: pull art further left before stacked/tablet layout. */
  const SHX_FRAC_WIDE = 0.07;
  const SHX_FRAC_NARROW = 0.012;
  /**
   * Left-edge fade (`fadeX`) + left white wash: full strength on wide columns, removed as column narrows.
   * Range tuned so phone/stacked hero (~360–430px wide canvas) reads clean; ~768px+ column keeps richer edge treatment.
   */
  const W_LEFT_FADE_START = 400;
  const W_LEFT_FADE_END = 760;

  let shxFrac = SHX_FRAC_WIDE;
  /** 0 = no left-edge fade (narrow), 1 = full fade (wide desktop column) */
  let leftFadeStrength = 1;

  function updateLayoutForWidth() {
    const nw = Math.max(1, colW);
    const u = Math.min(1, Math.max(0, (nw - W_LEFT_FADE_START) / (W_LEFT_FADE_END - W_LEFT_FADE_START)));
    leftFadeStrength = u;
    shxFrac = SHX_FRAC_NARROW + (SHX_FRAC_WIDE - SHX_FRAC_NARROW) * u;
  }

  function isDesktopHeroRow() {
    return typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
  }

  function resize() {
    const outer = container || canvas.parentElement;
    const inner = canvas.parentElement;
    const box = inner && inner !== outer ? inner : outer;
    const rect = box.getBoundingClientRect();
    const nextW = Math.max(1, Math.round(rect.width));
    const nextH = Math.max(1, Math.round(rect.height));
    if (
      lastOuterW > 0 &&
      nextW === lastOuterW &&
      Math.abs(nextH - lastOuterH) < 64
    ) {
      return;
    }
    lastOuterW = nextW;
    lastOuterH = nextH;
    colW = nextW;
    const ch = nextH;
    padX = isDesktopHeroRow() ? SHIFT_PAD_PX : 0;
    const cw = colW + 2 * padX;
    const rawDpr = window.devicePixelRatio || 1;
    const dprCap = colW <= 480 ? 1.5 : 2;
    const dpr = Math.min(rawDpr, dprCap);
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    w = cw;
    h = ch;
    updateLayoutForWidth();
  }

  let resizeRaf = 0;
  let resizeDebounceTimer = 0;
  function runResizeAndMaybeDraw() {
    resize();
    if (reduceMotion) draw(performance.now());
    else if (shouldAnimate()) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    }
  }
  function scheduleResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      runResizeAndMaybeDraw();
    });
  }
  /** Window / visualViewport bounce during mobile chrome show/hide; short debounce limits canvas clears */
  function scheduleResizeDebounced() {
    clearTimeout(resizeDebounceTimer);
    resizeDebounceTimer = setTimeout(() => {
      resizeDebounceTimer = 0;
      scheduleResize();
    }, 72);
  }

  function bandX(base, yNorm, time, bend, drift, phase) {
    const shiftR = colW * shxFrac;
    const xOrig =
      base +
      shiftR +
      Math.sin(yNorm * 5.4 + time * 0.14 + phase) * bend +
      Math.sin(yNorm * 1.8 - time * 0.09 + phase * 0.7) * drift +
      Math.cos(yNorm * 9.2 + time * 0.05 + phase * 1.6) * bend * 0.23;
    /* padX + xOrig - SHIFT_PAD: with inner left offset, column sees art ~SHIFT_PAD px left vs unshifted */
    return padX + xOrig - (padX ? SHIFT_PAD_PX : 0);
  }

  function fadeX(x) {
    const s = padX + colW * 0.4;
    const e = padX + colW * 0.5;
    let raw;
    if (x <= s) raw = 0;
    else if (x >= e) raw = 1;
    else {
      const tt = (x - s) / (e - s);
      raw = tt * tt * (3 - 2 * tt);
    }
    return raw + (1 - raw) * (1 - leftFadeStrength);
  }

  function drawBand(band, layerOffset) {
    const path = new Path2D();
    const top = -h * 0.14;
    const bottom = h * 1.14;
    const yStep = colW <= 560 ? 26 : 22;
    const time = t * band.speed + layerOffset;
    const depth = band.depth;
    const bw = band.width * depth;
    const blur = band.blur * (0.92 + depth * 0.16);
    const sdx = 9 * (depth - 1);
    const sdy = 18 * (depth - 1) + (band.lift || 0);
    const rdx = -4 * (depth - 1);
    const rdy = -10 * (depth - 1) + (band.lift || 0) * 0.35;

    for (let yy = top; yy <= bottom; yy += yStep) {
      const x = bandX(band.base * colW, yy / h, time, band.bend, band.drift, band.phase);
      if (yy === top) path.moveTo(x, yy);
      else path.lineTo(x, yy);
    }

    const midX = bandX(band.base * colW, 0.5, time, band.bend, band.drift, band.phase);
    const fx = fadeX(midX);
    if (fx < 0.02) return;

    const a = band.alpha;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.translate(sdx, sdy);
    ctx.strokeStyle = `rgba(${band.color},${a * 0.12 * fx})`;
    ctx.lineWidth = bw + blur * 2.8;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(${band.color},${a * 0.18 * fx})`;
    ctx.lineWidth = bw + blur * 1.55;
    ctx.stroke(path);
    ctx.restore();

    ctx.strokeStyle = `rgba(${band.color},${a * 0.25 * fx})`;
    ctx.lineWidth = bw + blur * 2.6;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(${band.color},${a * 0.34 * fx})`;
    ctx.lineWidth = bw + blur * 1.2;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(${band.color},${a * 0.62 * fx})`;
    ctx.lineWidth = bw;
    ctx.stroke(path);

    ctx.save();
    ctx.translate(rdx, rdy);
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.44 * fx})`;
    ctx.lineWidth = Math.max(16, bw * 0.26);
    ctx.stroke(path);
    ctx.restore();

    ctx.strokeStyle = `rgba(255,255,255,${a * 0.22 * fx})`;
    ctx.lineWidth = Math.max(8, bw * 0.12);
    ctx.stroke(path);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${band.color},${Math.min(1, a * 1.28 * fx)})`;
    ctx.lineWidth = Math.max(4, bw * 0.085 * (band.coreScale || 1));
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.42 * fx})`;
    ctx.lineWidth = Math.max(2, bw * 0.045 * (band.coreScale || 1));
    ctx.stroke(path);
    ctx.restore();

    ctx.restore();
  }

  function nodePos(node, i) {
    const shiftR = colW * shxFrac;
    const xOrig = node.x * colW + shiftR + Math.sin(t * 0.12 + i * 1.4) * 8;
    return {
      x: padX + xOrig - (padX ? SHIFT_PAD_PX : 0),
      y: node.y * h + Math.cos(t * 0.1 + i * 1.9) * 10,
    };
  }

  function drawMesh() {
    const pts = meshNodes.map((n, i) => nodePos(n, i));
    ctx.save();
    ctx.lineWidth = 1.25;
    meshEdges.forEach(([a, b]) => {
      const p1 = pts[a];
      const p2 = pts[b];
      const mx = (p1.x + p2.x) / 2;
      const fx = fadeX(mx);
      if (fx < 0.02) return;
      const g = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      g.addColorStop(0, `rgba(80,20,240,${0.4 * fx})`);
      g.addColorStop(0.5, `rgba(20,100,255,${0.3 * fx})`);
      g.addColorStop(1, `rgba(0,150,255,${0.34 * fx})`);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
    pts.forEach((p) => {
      const fx = fadeX(p.x);
      if (fx < 0.02) return;
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
      gr.addColorStop(0, `rgba(60,120,255,${1.0 * fx})`);
      gr.addColorStop(0.35, `rgba(30,90,255,${0.48 * fx})`);
      gr.addColorStop(1, 'rgba(30,90,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(80,160,255,${1.0 * fx})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.15, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawGhostNodes() {
    ctx.save();
    ghostNodes.forEach((g, i) => {
      const xOrig = g[0] * colW + colW * shxFrac + Math.sin(t * 0.08 + i) * 4;
      const x = padX + xOrig - (padX ? SHIFT_PAD_PX : 0);
      const y = g[1] * h + Math.cos(t * 0.06 + i * 1.7) * 5;
      const fx = fadeX(x);
      if (fx < 0.02) return;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, g[2]);
      gr.addColorStop(0, `rgba(120,60,220,${0.2 * fx})`);
      gr.addColorStop(1, 'rgba(108,126,160,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, y, g[2], 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function draw(ts) {
    if (!reduceMotion) {
      const now = ts ?? performance.now();
      if (lastFrameTs) {
        const dt = Math.min((now - lastFrameTs) / 1000, 0.05);
        t += dt;
      }
      lastFrameTs = now;
    }
    ctx.clearRect(0, 0, w, h);

    drawBand(bands[0], 0.0);
    drawBand(bands[1], 0.15);
    drawBand(bands[2], 0.28);
    drawGhostNodes();
    drawMesh();
    drawBand(bands[3], 0.35);
    drawBand(bands[4], 0.5);
    drawBand(bands[5], 0.63);

    const ls = leftFadeStrength;
    const rs = leftFadeStrength;
    /* Narrow columns: soften right wash so it does not read as a vertical “cut”; wide = full blend */
    const r0 = 0.72 + (1 - rs) * 0.18;
    const fade = ctx.createLinearGradient(0, 0, w, 0);
    fade.addColorStop(0, `rgba(255,255,255,${ls})`);
    fade.addColorStop(0.32, `rgba(255,255,255,${0.95 * ls})`);
    fade.addColorStop(0.48, 'rgba(255,255,255,0.0)');
    fade.addColorStop(0.72, 'rgba(255,255,255,0.0)');
    fade.addColorStop(r0, 'rgba(255,255,255,0.0)');
    fade.addColorStop(Math.min(0.9, r0 + 0.08), `rgba(255,255,255,${0.16 * rs})`);
    fade.addColorStop(Math.min(0.97, r0 + 0.16), `rgba(255,255,255,${0.58 * rs})`);
    fade.addColorStop(1, `rgba(255,255,255,${0.92 * rs})`);
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);

    if (shouldAnimate()) rafId = requestAnimationFrame(draw);
  }

  resize();

  document.addEventListener(
    'visibilitychange',
    () => {
      if (reduceMotion) return;
      if (!shouldAnimate()) {
        cancelAnimationFrame(rafId);
        lastFrameTs = 0;
      } else {
        lastFrameTs = 0;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(draw);
      }
    },
    { passive: true }
  );

  if (container && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        heroInView = vis;
        if (reduceMotion) return;
        if (!shouldAnimate()) {
          cancelAnimationFrame(rafId);
          lastFrameTs = 0;
        } else {
          lastFrameTs = 0;
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(draw);
        }
      },
      { root: null, rootMargin: '80px 0px 80px 0px', threshold: 0 }
    );
    io.observe(container);
  }

  if (container && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleResize).observe(container);
  }
  window.addEventListener('resize', scheduleResizeDebounced);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleResizeDebounced);
  }
  if (typeof window.matchMedia !== 'undefined') {
    window.matchMedia('(min-width: 768px)').addEventListener('change', scheduleResize);
  }
  if (reduceMotion) draw(performance.now());
  else rafId = requestAnimationFrame(draw);
}
