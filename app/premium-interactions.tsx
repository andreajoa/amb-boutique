"use client";

import { useEffect } from "react";

const buttonSelector = [
  ".button",
  ".add-button",
  ".buy-button",
  ".checkout-button",
  ".load-more-button",
  ".view-bag",
  ".newsletter button[type='submit']",
  ".footer-form button[type='submit']",
  ".welcome-copy button[type='submit']",
].join(",");

const pointerLightSelector = [
  ".product-photo",
  ".collection-tile",
  ".explore-card",
  ".horizontal-look-image",
].join(",");

type SpringState = { scale: number; velocity: number; target: number };

function resetButton(button: HTMLElement | null) {
  if (!button) return;
  button.style.removeProperty("--button-shift-x");
  button.style.removeProperty("--button-shift-y");
  button.classList.remove("is-magnetic");
}

export function PremiumInteractions() {
  useEffect(() => {
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activeButton: HTMLElement | null = null;
    let activeLight: HTMLElement | null = null;
    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let springFrame = 0;
    const springs = new Map<HTMLElement, SpringState>();
    const scrambleFrames = new Map<HTMLElement, number>();

    const resetLight = (element: HTMLElement | null) => {
      if (!element) return;
      element.classList.remove("has-pointer-light");
      element.style.removeProperty("--pointer-x");
      element.style.removeProperty("--pointer-y");
    };

    const animateSprings = () => {
      springFrame = 0;
      springs.forEach((spring, button) => {
        const force = (spring.target - spring.scale) * 0.22;
        spring.velocity = (spring.velocity + force) * 0.72;
        spring.scale += spring.velocity;
        button.style.setProperty("--button-scale", spring.scale.toFixed(4));
        button.classList.add("is-springing");
        if (Math.abs(spring.target - spring.scale) < 0.001 && Math.abs(spring.velocity) < 0.001) {
          spring.scale = spring.target;
          spring.velocity = 0;
          button.style.setProperty("--button-scale", spring.target.toFixed(3));
          button.classList.remove("is-springing");
          if (spring.target === 1) {
            button.style.removeProperty("--button-scale");
            springs.delete(button);
          }
        }
      });
      if (springs.size) springFrame = window.requestAnimationFrame(animateSprings);
    };

    const setSpringTarget = (button: HTMLElement | null, target: number) => {
      if (!button || !precisePointer.matches || reducedMotion.matches) return;
      const current = springs.get(button) || { scale: 1, velocity: 0, target: 1 };
      current.target = target;
      springs.set(button, current);
      if (!springFrame) springFrame = window.requestAnimationFrame(animateSprings);
    };

    const update = () => {
      frame = 0;
      if (!precisePointer.matches || reducedMotion.matches) return;
      if (activeButton) {
        const rect = activeButton.getBoundingClientRect();
        const x = Math.max(-1, Math.min(1, (pointerX - (rect.left + rect.width / 2)) / Math.max(1, rect.width / 2)));
        const y = Math.max(-1, Math.min(1, (pointerY - (rect.top + rect.height / 2)) / Math.max(1, rect.height / 2)));
        activeButton.style.setProperty("--button-shift-x", `${(x * 4).toFixed(2)}px`);
        activeButton.style.setProperty("--button-shift-y", `${(y * 3).toFixed(2)}px`);
        activeButton.classList.add("is-magnetic");
      }
      if (activeLight) {
        const rect = activeLight.getBoundingClientRect();
        activeLight.style.setProperty("--pointer-x", `${pointerX - rect.left}px`);
        activeLight.style.setProperty("--pointer-y", `${pointerY - rect.top}px`);
        activeLight.classList.add("has-pointer-light");
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!precisePointer.matches || reducedMotion.matches) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(buttonSelector) : null;
      if (target !== activeButton) {
        setSpringTarget(activeButton, 1);
        resetButton(activeButton);
        activeButton = target;
        setSpringTarget(activeButton, 1.045);
      }
      const light = event.target instanceof Element ? event.target.closest<HTMLElement>(pointerLightSelector) : null;
      if (light !== activeLight) {
        resetLight(activeLight);
        activeLight = light;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const onPointerOut = (event: PointerEvent) => {
      const related = event.relatedTarget;
      if (activeButton && !(related instanceof Node && activeButton.contains(related))) {
        setSpringTarget(activeButton, 1);
        resetButton(activeButton);
        activeButton = null;
      }
      if (activeLight && !(related instanceof Node && activeLight.contains(related))) {
        resetLight(activeLight);
        activeLight = null;
      }
    };

    const onPointerDown = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(buttonSelector) : null;
      setSpringTarget(button, 0.965);
    };

    const onPointerUp = (event: PointerEvent) => {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(buttonSelector) : activeButton;
      setSpringTarget(button, button === activeButton ? 1.045 : 1);
    };

    const runScramble = (element: HTMLElement) => {
      const finalText = element.dataset.scramble || element.textContent || "";
      if (reducedMotion.matches) { element.textContent = finalText; return; }
      const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@*";
      let animationFrame = 0;
      const draw = () => {
        const locked = Math.floor(animationFrame / 3);
        element.textContent = Array.from(finalText, (character, index) => {
          if (index < locked || character === " ") return character;
          return characters[Math.floor(Math.random() * characters.length)];
        }).join("");
        animationFrame += 1;
        if (locked <= finalText.length) {
          scrambleFrames.set(element, window.requestAnimationFrame(draw));
        } else {
          element.textContent = finalText;
          scrambleFrames.delete(element);
        }
      };
      draw();
    };

    const scrambleObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runScramble(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll<HTMLElement>("[data-scramble]").forEach((element) => scrambleObserver.observe(element));

    const onPreferenceChange = () => {
      if (!precisePointer.matches || reducedMotion.matches) {
        resetButton(activeButton);
        resetLight(activeLight);
        window.cancelAnimationFrame(springFrame);
        springFrame = 0;
        springs.forEach((_spring, button) => {
          button.style.removeProperty("--button-scale");
          button.classList.remove("is-springing");
        });
        springs.clear();
        activeButton = null;
        activeLight = null;
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    precisePointer.addEventListener("change", onPreferenceChange);
    reducedMotion.addEventListener("change", onPreferenceChange);
    return () => {
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(springFrame);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      precisePointer.removeEventListener("change", onPreferenceChange);
      reducedMotion.removeEventListener("change", onPreferenceChange);
      scrambleObserver.disconnect();
      scrambleFrames.forEach((scrambleFrame) => window.cancelAnimationFrame(scrambleFrame));
      springs.forEach((_spring, button) => {
        button.style.removeProperty("--button-scale");
        button.classList.remove("is-springing");
      });
      resetButton(activeButton);
      resetLight(activeLight);
    };
  }, []);

  return null;
}
