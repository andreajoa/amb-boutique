"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Product } from "./data";
import { getDirectProductImage, getProductImageStyle } from "./components";
import styles from "./product-reviews.module.css";

type Review = {
  id: number;
  customerName: string;
  rating: number;
  body: string;
  createdAt: string;
};

type ReviewResponse = {
  configured: boolean;
  average: number;
  count: number;
  reviews: Review[];
};

const emptyData: ReviewResponse = { configured: true, average: 0, count: 0, reviews: [] };

function Stars({ rating }: { rating: number }) {
  return <span className={styles.stars} aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => index < Math.round(rating) ? "★" : "☆").join("")}</span>;
}

export function ProductReviews({ product }: { product: Product }) {
  const [data, setData] = useState<ReviewResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const directImage = getDirectProductImage(product, 0);
  const productStyle = useMemo(() => directImage ? undefined : getProductImageStyle(product, 0), [directImage, product]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/reviews?slug=${encodeURIComponent(product.slug)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<ReviewResponse> : Promise.reject(new Error("load")))
      .then((next) => { if (active) setData(next); })
      .catch(() => { if (active) setData(emptyData); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [product.slug]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: product.slug, customerName: name, rating, review, company }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "We could not submit your review.");
      setSuccess(true);
      setName("");
      setReview("");
      setRating(5);
      setFormOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We could not submit your review.");
    } finally {
      setSubmitting(false);
    }
  }

  return <section className={styles.section} aria-labelledby={`reviews-${product.slug}`}>
    <div className={styles.inner}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Customer reviews</p>
          <h2 id={`reviews-${product.slug}`}>Real experiences with this piece</h2>
        </div>
        <div className={styles.summary} aria-live="polite">
          <Stars rating={data.average || 0}/>
          <strong>{loading ? "Loading reviews…" : data.count ? `${data.average.toFixed(1)} / 5` : "No reviews yet"}</strong>
          {!loading && <span>{data.count ? `${data.count} approved ${data.count === 1 ? "review" : "reviews"}` : "Be the first to share yours"}</span>}
        </div>
      </div>

      {!data.count && !loading && <div className={styles.empty}>
        <div><strong>Be the first to review {product.name}</strong><p>Your feedback can help another customer choose with more confidence.</p></div>
        <button type="button" className={styles.writeButton} onClick={() => { setSuccess(false); setFormOpen(true); }}>Write a review</button>
      </div>}

      {data.count > 0 && <>
        <button type="button" className={styles.writeButton} onClick={() => { setSuccess(false); setFormOpen((open) => !open); }}>Write a review</button>
        <div className={styles.list}>{data.reviews.map((item) => <article className={styles.card} key={item.id}>
          <div className={styles.cardTop}><div><Stars rating={item.rating}/><strong>{item.customerName}</strong></div><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</time></div>
          <p>{item.body}</p>
        </article>)}</div>
      </>}

      {formOpen && <div className={styles.formWrap}>
        <div className={styles.productRef}>
          <div className={styles.productThumb} style={productStyle}>{directImage && <Image src={directImage} alt="" fill sizes="72px"/>}</div>
          <div><span>You are reviewing</span><strong>{product.name}</strong></div>
        </div>
        <form className={styles.form} onSubmit={submitReview}>
          <div className={`${styles.field} ${styles.honeypot}`} aria-hidden="true"><label htmlFor={`company-${product.slug}`}>Company</label><input id={`company-${product.slug}`} value={company} onChange={(event) => setCompany(event.target.value)} tabIndex={-1} autoComplete="off"/></div>
          <div className={styles.field}><label htmlFor={`review-name-${product.slug}`}>Your name</label><input id={`review-name-${product.slug}`} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required autoComplete="name"/></div>
          <div><span className={styles.ratingLabel}>Your rating</span><div className={styles.ratingButtons} role="group" aria-label="Star rating">{[1,2,3,4,5].map((value) => <button type="button" key={value} className={value <= rating ? styles.active : ""} onClick={() => setRating(value)} aria-label={`${value} ${value === 1 ? "star" : "stars"}`}>★</button>)}</div></div>
          <div className={styles.field}><label htmlFor={`review-body-${product.slug}`}>Your review</label><textarea id={`review-body-${product.slug}`} value={review} onChange={(event) => setReview(event.target.value)} minLength={10} maxLength={2000} required placeholder="Tell us what you loved, how it fit, or anything another shopper should know."/></div>
          {error && <p className={`${styles.notice} ${styles.error}`} role="alert">{error}</p>}
          <p className={styles.notice}>Reviews are checked before publication to keep this space useful and trustworthy.</p>
          <div className={styles.actions}><button type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit review"}</button><button type="button" className={styles.secondary} onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</button></div>
        </form>
      </div>}

      {success && <p className={styles.success} role="status"><strong>Thank you.</strong> Your review was received and will appear here after it is approved.</p>}
    </div>
  </section>;
}
