"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export type EditorialLook = {
  slug: string;
  name: string;
  image: string;
  eyebrow: string;
  copy: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function EditorialHorizontal({ looks }: { looks: EditorialLook[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!section || !stage || !track) return;

    const desktop = window.matchMedia("(min-width: 901px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let distance = 0;
    let frame = 0;
    let dragFrame = 0;
    let pointerId: number | null = null;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let lastX = 0;
    let velocity = 0;
    let dragged = false;

    const reset = () => {
      section.style.removeProperty("height");
      track.style.removeProperty("--editorial-x");
      section.style.removeProperty("--editorial-progress");
    };

    const update = () => {
      frame = 0;
      if (!desktop.matches || reducedMotion.matches) return;
      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, section.offsetHeight - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, 1);
      track.style.setProperty("--editorial-x", `${-distance * progress}px`);
      section.style.setProperty("--editorial-progress", progress.toFixed(3));
    };

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    const measure = () => {
      if (!desktop.matches || reducedMotion.matches) { reset(); return; }
      distance = Math.max(0, track.scrollWidth - stage.clientWidth);
      section.style.height = `${window.innerHeight + distance}px`;
      update();
    };

    const stopDragFrame = () => {
      window.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if ((desktop.matches && !reducedMotion.matches) || event.pointerType === "touch" || event.button !== 0) return;
      stopDragFrame();
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartScroll = track.scrollLeft;
      lastX = event.clientX;
      velocity = 0;
      dragged = false;
      track.setPointerCapture(event.pointerId);
      track.classList.add("is-dragging");
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      const movement = event.clientX - lastX;
      lastX = event.clientX;
      velocity = movement;
      if (Math.abs(event.clientX - dragStartX) > 5) dragged = true;
      track.scrollLeft = dragStartScroll - (event.clientX - dragStartX);
    };

    const releasePointer = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
      track.classList.remove("is-dragging");
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      if (reducedMotion.matches) return;
      const coast = () => {
        velocity *= 0.92;
        if (Math.abs(velocity) < 0.25) { dragFrame = 0; return; }
        track.scrollLeft -= velocity;
        dragFrame = window.requestAnimationFrame(coast);
      };
      dragFrame = window.requestAnimationFrame(coast);
    };

    const preventDraggedClick = (event: MouseEvent) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    desktop.addEventListener("change", measure);
    reducedMotion.addEventListener("change", measure);
    track.addEventListener("pointerdown", onPointerDown);
    track.addEventListener("pointermove", onPointerMove);
    track.addEventListener("pointerup", releasePointer);
    track.addEventListener("pointercancel", releasePointer);
    track.addEventListener("click", preventDraggedClick, true);
    return () => {
      window.cancelAnimationFrame(frame);
      stopDragFrame();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      desktop.removeEventListener("change", measure);
      reducedMotion.removeEventListener("change", measure);
      track.removeEventListener("pointerdown", onPointerDown);
      track.removeEventListener("pointermove", onPointerMove);
      track.removeEventListener("pointerup", releasePointer);
      track.removeEventListener("pointercancel", releasePointer);
      track.removeEventListener("click", preventDraggedClick, true);
      reset();
    };
  }, [looks]);

  return (
    <section className="horizontal-editorial" ref={sectionRef} aria-labelledby="horizontal-editorial-title">
      <div className="horizontal-editorial-stage" ref={stageRef}>
        <header className="horizontal-editorial-heading">
          <p data-scramble="THE AMB MOVEMENT" aria-label="The AMB movement">THE AMB MOVEMENT</p>
          <h2 id="horizontal-editorial-title">Four looks. One point of view.</h2>
          <span>Scroll to explore</span>
        </header>
        <div className="horizontal-editorial-track" ref={trackRef} role="list" aria-label="Featured AMB looks">
          {looks.map((look, index) => (
            <article className="horizontal-look" role="listitem" key={look.slug}>
              <Link href={`/products/${look.slug}`} aria-label={`View ${look.name}`} data-track={`horizontal-editorial:${look.slug}`}>
                <div className="horizontal-look-image">
                  <Image
                    src={look.image}
                    alt={look.name}
                    fill
                    sizes="(max-width: 900px) 84vw, 58vw"
                  />
                  <span className="horizontal-look-number" aria-hidden="true">0{index + 1}</span>
                </div>
                <div className="horizontal-look-copy">
                  <p>{look.eyebrow}</p>
                  <h3>{look.name}</h3>
                  <span>{look.copy}</span>
                  <strong>Discover the look</strong>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
