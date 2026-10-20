import React, { useEffect, useRef } from 'react';
import { AccuracyGrade, GameMode, MODE_INFO, ShellState, TimerPhase, splitTimerParts } from '../game/rules';

export interface CanvasBridgeState {
  shellState: ShellState;
  mode: GameMode;
  timerPhase: TimerPhase;
  startTimePerf: number;
  stoppedElapsedMs: number;
  targetSeconds: number;
  hideDigitsInRun: boolean;
  lastGrade: AccuracyGrade | null;
  burstTriggerCount: number;
  burstColorHex: string;
  burstHeavy: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 64;

interface ChronoCanvasProps {
  bridgeRef: React.MutableRefObject<CanvasBridgeState>;
  liveDigitsDomRef: React.MutableRefObject<HTMLSpanElement | null>;
  liveCentisDomRef: React.MutableRefObject<HTMLSpanElement | null>;
}

export const ChronoCanvas: React.FC<ChronoCanvasProps> = ({
  bridgeRef,
  liveDigitsDomRef,
  liveCentisDomRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'block w-full h-full';
    canvas.setAttribute('data-testid', 'chrono-canvas');
    container.innerHTML = '';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = isHeadless ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      width = Math.max(320, rect.width || window.innerWidth);
      height = Math.max(320, rect.height || window.innerHeight);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(container);

    // Pre-allocated zero-GC particle pool
    const particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#F59E0B',
    }));
    let particleCursor = 0;

    const spawnBurst = (cx: number, cy: number, radius: number, count: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const speed = 90 + Math.random() * 210;
        p.active = true;
        p.x = cx + Math.cos(angle) * (radius * 0.72);
        p.y = cy + Math.sin(angle) * (radius * 0.72);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.maxLife = 0.45 + Math.random() * 0.35;
        p.life = p.maxLife;
        p.size = 2.5 + Math.random() * 3.5;
        p.color = color;
      }
    };

    // Interactive pointer parallax
    let pointerNormX = 0;
    let pointerNormY = 0;
    let smoothTiltX = 0;
    let smoothTiltY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNormX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointerNormY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let lastBurstCount = bridgeRef.current.burstTriggerCount;
    let hitstopTimer = 0;
    let flashAlpha = 0;
    let trauma = 0;
    let simTime = 0;
    let lastFramePerf = performance.now();
    let rafId = 0;
    let lastHeadlessDraw = 0;

    const renderFrame = (nowPerf: number) => {
      rafId = requestAnimationFrame(renderFrame);

      if (isHeadless && nowPerf - lastHeadlessDraw < 64) {
        return;
      }
      lastHeadlessDraw = nowPerf;

      const rawDt = Math.max(0.001, (nowPerf - lastFramePerf) / 1000);
      lastFramePerf = nowPerf;
      const dt = Math.min(rawDt, 0.05);

      const state = bridgeRef.current;

      // Update live DOM numerals directly at 60Hz when running (zero React re-renders)
      if (state.timerPhase === 'running') {
        const liveMs = Math.max(0, nowPerf - state.startTimePerf);
        if (!state.hideDigitsInRun) {
          const parts = splitTimerParts(liveMs);
          if (liveDigitsDomRef.current) {
            liveDigitsDomRef.current.textContent = parts.secondsStr;
          }
          if (liveCentisDomRef.current) {
            liveCentisDomRef.current.textContent = `.${parts.centisecondsStr}`;
          }
        }
      }

      // Compute center of the chronometer dial with mobile responsiveness
      const isMobile = width < 640;
      const cx = width * 0.5;
      const cy = isMobile
        ? (state.shellState === 'title' ? height * 0.42 : height * 0.29)
        : (state.shellState === 'title' ? height * 0.46 : height * 0.38);
      const baseRadius = isMobile
        ? Math.min(width * 0.24, height * 0.13)
        : Math.min(width, height) * (state.shellState === 'title' ? 0.19 : 0.21);
      const radius = isMobile
        ? Math.max(70, Math.min(100, baseRadius))
        : Math.max(105, Math.min(160, baseRadius));

      // Check for newly triggered impact/reveal bursts
      if (state.burstTriggerCount !== lastBurstCount) {
        lastBurstCount = state.burstTriggerCount;
        const count = state.burstHeavy ? 26 : 12;
        spawnBurst(cx, cy, radius, count, state.burstColorHex);
        if (state.burstHeavy) {
          hitstopTimer = 0.045;
          flashAlpha = 0.55;
          trauma = 0.65;
        } else {
          flashAlpha = 0.22;
          trauma = 0.25;
        }
      }

      if (hitstopTimer > 0) {
        hitstopTimer = Math.max(0, hitstopTimer - dt);
      } else if (state.shellState !== 'paused') {
        simTime += dt;
      }

      flashAlpha = Math.max(0, flashAlpha - dt * 2.8);
      trauma = Math.max(0, trauma - dt * 2.2);

      smoothTiltX += (pointerNormX - smoothTiltX) * Math.min(1, dt * 8);
      smoothTiltY += (pointerNormY - smoothTiltY) * Math.min(1, dt * 8);

      const shakeMag = trauma * trauma * 10;
      const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;
      const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * shakeMag : 0;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep horological obsidian canvas background
      ctx.fillStyle = '#0B0F17';
      ctx.fillRect(0, 0, width, height);

      const modeConfig = MODE_INFO[state.mode];
      const accentHex = modeConfig.accentHex;

      // Subtle radial instrument illumination
      const bgGrad = ctx.createRadialGradient(
        cx + smoothTiltX * 18,
        cy + smoothTiltY * 18,
        radius * 0.15,
        cx,
        cy,
        Math.max(width, height) * 0.68
      );
      bgGrad.addColorStop(0, '#162032');
      bgGrad.addColorStop(0.55, '#0E1420');
      bgGrad.addColorStop(1, '#080B11');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Fine technical coordinate crosshairs in background
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();

      // Apply camera shake & parallax offset to the chronometer assembly
      const dialX = cx + smoothTiltX * 10 + shakeX;
      const dialY = cy + smoothTiltY * 10 + shakeY;

      // Determine elapsed ms for dial sweep
      let dialElapsedMs = 0;
      if (state.shellState === 'title') {
        dialElapsedMs = simTime * 1000;
      } else if (state.timerPhase === 'running') {
        dialElapsedMs = Math.max(0, nowPerf - state.startTimePerf);
      } else if (
        state.timerPhase === 'stopped_awaiting_input' ||
        state.timerPhase === 'revealed'
      ) {
        dialElapsedMs = state.stoppedElapsedMs;
      }

      const isBlindMasked =
        state.shellState === 'playing' &&
        ((state.timerPhase === 'running' && state.hideDigitsInRun) ||
          (state.mode === 'buio' && state.timerPhase === 'stopped_awaiting_input'));

      // Outer ambient precision ring
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dialX, dialY, radius * 1.15, 0, Math.PI * 2);
      ctx.stroke();

      // Main anodized bezel shadow & ring
      ctx.fillStyle = '#0D131F';
      ctx.beginPath();
      ctx.arc(dialX, dialY, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(226, 232, 240, 0.16)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(dialX, dialY, radius, 0, Math.PI * 2);
      ctx.stroke();

      // 60 precision tachymeter ticks around the dial
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
        const isMajor = i % 5 === 0;
        const innerR = isMajor ? radius * 0.86 : radius * 0.91;
        const outerR = radius * 0.96;

        ctx.strokeStyle = isMajor ? 'rgba(248, 250, 252, 0.55)' : 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = isMajor ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(dialX + Math.cos(angle) * innerR, dialY + Math.sin(angle) * innerR);
        ctx.lineTo(dialX + Math.cos(angle) * outerR, dialY + Math.sin(angle) * outerR);
        ctx.stroke();
      }

      // Target arc indicator in Modalità Sfida
      if (state.shellState === 'playing' && state.mode === 'sfida' && !isBlindMasked) {
        const targetSweep = ((state.targetSeconds % 10) / 10) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 1.05, targetSweep - 0.08, targetSweep + 0.08);
        ctx.stroke();

        // Target marker diamond on outer rim
        const tx = dialX + Math.cos(targetSweep) * (radius * 1.07);
        const ty = dialY + Math.sin(targetSweep) * (radius * 1.07);
        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Active sweep progress & hand (hidden in Blind mode so user cannot cheat by watching rotation!)
      if (!isBlindMasked) {
        // 10-second full revolution sweep for high-precision visual feedback
        const sweepFraction = (dialElapsedMs % 10000) / 10000;
        const sweepAngle = sweepFraction * Math.PI * 2 - Math.PI / 2;

        // Glowing progress arc
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 0.99, -Math.PI / 2, sweepAngle);
        ctx.stroke();

        // Mechanical escapement inner gear ring
        const subGearAngle = (dialElapsedMs / 1000) * Math.PI * 0.5;
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 0.72, subGearAngle, subGearAngle + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        if (state.shellState === 'title') {
          // Full center sweep hand on Title Screen showcase
          const handLen = radius * 0.82;
          const tailLen = radius * 0.16;
          ctx.strokeStyle = accentHex;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(
            dialX - Math.cos(sweepAngle) * tailLen,
            dialY - Math.sin(sweepAngle) * tailLen
          );
          ctx.lineTo(
            dialX + Math.cos(sweepAngle) * handLen,
            dialY + Math.sin(sweepAngle) * handLen
          );
          ctx.stroke();

          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(dialX, dialY, 5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Peripheral track indicator during Playing so center digital readout is 100% clear
          const innerNeedle = radius * 0.72;
          const outerNeedle = radius * 0.86;
          ctx.strokeStyle = accentHex;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(
            dialX + Math.cos(sweepAngle) * innerNeedle,
            dialY + Math.sin(sweepAngle) * innerNeedle
          );
          ctx.lineTo(
            dialX + Math.cos(sweepAngle) * outerNeedle,
            dialY + Math.sin(sweepAngle) * outerNeedle
          );
          ctx.stroke();
        }

        // Tip jewel on sweep hand
        const tipRadius = radius * 0.84;
        ctx.fillStyle = '#F8FAFC';
        ctx.beginPath();
        ctx.arc(
          dialX + Math.cos(sweepAngle) * tipRadius,
          dialY + Math.sin(sweepAngle) * tipRadius,
          4,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else {
        // Blind Mode ("Al Buio"): Non-periodic enigmatic horizon rings so no time rhythm is leaked
        const slowDrift = simTime * 0.37;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.38)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([18, 24]);
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 0.78, slowDrift, slowDrift + Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 0.58, -slowDrift * 0.7, -slowDrift * 0.7 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Hit flash ring on Stop / Bullseye
      if (flashAlpha > 0.01) {
        ctx.strokeStyle = `rgba(248, 250, 252, ${flashAlpha.toFixed(3)})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(dialX, dialY, radius * 1.03, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Update & render pooled particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;

        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x + shakeX, p.y + shakeY, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [bridgeRef, liveDigitsDomRef, liveCentisDomRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    />
  );
};
