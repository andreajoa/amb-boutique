"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const slides = [
  {
    image: "/images/hero-01.webp",
    eyebrow: "THE AMB EDIT",
    title: <>A new point<br />of view.</>,
    copy: "Modern femininity, warm-weather ease and polished silhouettes curated in San Diego.",
    align: "center",
    position: "center center",
  },
  {
    image: "/images/hero-02.webp",
    eyebrow: "THE RESORT EDIT",
    title: <>Made for<br />golden hours.</>,
    copy: "Flowing dresses and understated accessories for sunlit days and beautifully unhurried plans.",
    align: "left",
    position: "center center",
  },
  {
    image: "/images/hero-03.webp",
    eyebrow: "NEW SEASON",
    title: <>Warm tones.<br />Modern lines.</>,
    copy: "Soft tailoring and confident color, designed to move from daytime ease to dinner plans.",
    align: "right",
    position: "center center",
  },
  {
    image: "/images/hero-04.webp",
    eyebrow: "THE EVENING EDIT",
    title: <>Quiet<br />confidence.</>,
    copy: "Refined black dresses and elegant finishing touches for every invitation on your calendar.",
    align: "left",
    position: "center center",
  },
];

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 7800);
    return () => window.clearInterval(timer);
  }, [paused]);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="AMB Boutique featured edits"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="hero-slides" aria-live="polite">
        {slides.map((slide, index) => (
          <div
            className={`hero-slide hero-slide-${index + 1} hero-slide-${slide.align}${active === index ? " is-active" : ""}`}
            key={slide.image}
            aria-hidden={active !== index}
          >
            <Image
              src={slide.image}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: slide.position }}
            />
            <div className={`hero-content hero-content-${slide.align}`}>
              <p>{slide.eyebrow}</p>
              <h1>{slide.title}</h1>
              <span>{slide.copy}</span>
              <div className="hero-actions">
                <Link className="button light" href="/collections">Shop New Arrivals</Link>
                <Link className="button ghost" href="/collections">Explore the Edit</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-pagination" aria-label="Choose a hero slide">
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.image}
            className={active === index ? "active" : ""}
            onClick={() => setActive(index)}
            aria-label={`Show slide ${index + 1} of ${slides.length}`}
            aria-current={active === index ? "true" : undefined}
          ><span /></button>
        ))}
      </div>
      <span className="hero-index">{String(active + 1).padStart(2, "0")}&nbsp;&nbsp;—&nbsp;&nbsp;{String(slides.length).padStart(2, "0")}</span>
    </section>
  );
}
