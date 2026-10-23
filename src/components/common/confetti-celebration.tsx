"use client";

import confetti from "canvas-confetti";

export function fireCelebrationConfetti() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ["#8B5CF6", "#EC4899", "#F43F5E"],
  });
  fire(0.2, {
    spread: 60,
    colors: ["#FB923C", "#F43F5E", "#A855F7"],
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ["#38BDF8", "#818CF8", "#C084FC"],
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
}
