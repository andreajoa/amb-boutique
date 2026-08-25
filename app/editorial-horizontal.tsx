"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const editorialLooks = [
  {
    slug: "selene-satin-maxi-dress",
    name: "Selene Satin Maxi Dress",
    eyebrow: "AFTER DARK",
    copy: "Liquid movement and quiet drama for beautifully unhurried evenings.",
  },
  {
    slug: "zinnia-midi-dress",
    name: "Zinnia Midi Dress",
    eyebrow: "THE SOFT STATEMENT",
    copy: "A feminine silhouette made for plans that begin in daylight and end after dinner.",
  },
  {
    slug: "bianca-tailored-romper",
    name: "Bianca Tailored Romper",
    eyebrow: "ONE AND DONE",
    copy: "Clean tailoring and effortless ease, styled in one confident step.",
  },
  {
    slug: "xyla-wide-leg-trousers",
    name: "Xyla Wide-Leg Trousers",
    eyebrow: "TAILORED EASE",
    copy: "A fluid foundation for polished days, warm nights and everything between.",
  },
] as const;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function EditorialHorizontal() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!section || !stage || !track) return;

    const desktop = window.matchMedia("(min-width: 901px) and (min-height: 680px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let distance = 0;
    let frame = 0;

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

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    desktop.addEventListener("change", measure);
    reducedMotion.addEventListener("change", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      desktop.removeEventListener("change", measure);
      reducedMotion.removeEventListener("change", measure);
      reset();
    };
  }, []);

  return (
    <section className="horizontal-editorial" ref={sectionRef} aria-labelledby="horizontal-editorial-title">
      <div className="horizontal-editorial-stage" ref={stageRef}>
        <header className="horizontal-editorial-heading">
          <p>THE AMB MOVEMENT</p>
          <h2 id="horizontal-editorial-title">Four looks. One point of view.</h2>
          <span>Scroll to explore</span>
        </header>
        <div className="horizontal-editorial-track" ref={trackRef} role="list" aria-label="Featured AMB looks">
          {editorialLooks.map((look, index) => (
            <article className="horizontal-look" role="listitem" key={look.slug}>
              <Link href={`/products/${look.slug}`} aria-label={`View ${look.name}`} data-track={`horizontal-editorial:${look.slug}`}>
                <div className="horizontal-look-image">
                  <Image
                    src={`/products/${look.slug}/01.webp`}
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
