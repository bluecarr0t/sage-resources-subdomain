/** Gold/yellow confetti burst after gated-access form submit (client-only). */

const GATE_CONFETTI_COLORS = ['#d4af37', '#f5c542', '#ffd966', '#fff4c2', '#e8b923'];

export async function fireGateAccessConfetti(): Promise<void> {
  if (typeof window === 'undefined') return;

  const confetti = (await import('canvas-confetti')).default;

  const zIndex = 60;

  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 28,
    origin: { x: 0.5, y: 0.55 },
    colors: GATE_CONFETTI_COLORS,
    ticks: 180,
    gravity: 0.9,
    scalar: 0.9,
    zIndex,
    disableForReducedMotion: true,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 35,
      angle: 60,
      spread: 50,
      origin: { x: 0, y: 0.6 },
      colors: GATE_CONFETTI_COLORS,
      zIndex,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 35,
      angle: 120,
      spread: 50,
      origin: { x: 1, y: 0.6 },
      colors: GATE_CONFETTI_COLORS,
      zIndex,
      disableForReducedMotion: true,
    });
  }, 120);
}
