import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { dashboardAuthenticated } from "../auth";
import { getReviewsSql } from "../../reviews/db";
import { approveReview, deleteReview, rejectReview } from "./actions";
import styles from "./reviews.module.css";

export const metadata: Metadata = { title: "Review Moderation", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type ReviewRow = {
  id: number | string;
  product_slug: string;
  product_name: string;
  product_image: string | null;
  customer_name: string;
  rating: number | string;
  review_body: string;
  status: "pending" | "approved" | "rejected";
  created_at: string | Date;
};

export default async function ReviewsDashboardPage() {
  if (!await dashboardAuthenticated()) redirect("/dashboard/login");
  const sql = await getReviewsSql();

  if (!sql) return <main className={styles.page}><section className={styles.setup}><p className={styles.kicker}>AMB BOUTIQUE · PRIVATE</p><h1>Review moderation</h1><p>The reviews database is not configured. Connect the existing store database to enable moderation.</p><Link href="/dashboard">Back to dashboard</Link></section></main>;

  const rows = await sql`
    SELECT id, product_slug, product_name, product_image, customer_name, rating, review_body, status, created_at
    FROM amb_product_reviews
    ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, created_at DESC
    LIMIT 200
  ` as unknown as ReviewRow[];

  const pending = rows.filter((row) => row.status === "pending").length;
  const approved = rows.filter((row) => row.status === "approved").length;
  const rejected = rows.filter((row) => row.status === "rejected").length;

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.kicker}>AMB BOUTIQUE · PRIVATE</p><h1>Review moderation</h1><p>Nothing reaches a product page until you approve it here.</p></div>
      <nav className={styles.nav}><Link href="/dashboard">Commerce dashboard</Link><form action="/api/dashboard/logout" method="post"><button type="submit">Sign out</button></form></nav>
    </header>

    <section className={styles.summary} aria-label="Review status summary">
      <div><span>Waiting for approval</span><strong>{pending}</strong></div>
      <div><span>Published</span><strong>{approved}</strong></div>
      <div><span>Rejected</span><strong>{rejected}</strong></div>
    </section>

    {rows.length ? <section className={styles.list} aria-label="Customer reviews">{rows.map((row) => {
      const id = Number(row.id);
      const rating = Number(row.rating);
      return <article className={styles.card} key={id}>
        <div className={styles.image} style={row.product_image ? { backgroundImage: `url(${row.product_image})` } : undefined} aria-hidden="true"/>
        <div className={styles.meta}>
          <div className={styles.metaTop}><span className={`${styles.status} ${styles[row.status]}`}>{row.status}</span><h2>{row.product_name}</h2></div>
          <p className={styles.customer}><span className={styles.stars}>{"★".repeat(rating)}{"☆".repeat(Math.max(0, 5 - rating))}</span> · {row.customer_name} · {new Date(row.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
          <p className={styles.review}>{row.review_body}</p>
          <p className={styles.customer}><Link href={`/products/${row.product_slug}`} target="_blank">Open product page ↗</Link></p>
        </div>
        <div className={styles.actions}>
          {row.status !== "approved" && <form action={approveReview}><input type="hidden" name="id" value={id}/><button type="submit">Approve</button></form>}
          {row.status !== "rejected" && <form action={rejectReview}><input type="hidden" name="id" value={id}/><button type="submit" className={styles.reject}>Reject</button></form>}
          <form action={deleteReview}><input type="hidden" name="id" value={id}/><button type="submit" className={styles.delete}>Delete</button></form>
        </div>
      </article>;
    })}</section> : <div className={styles.empty}>No reviews have been submitted yet. New submissions will appear here as pending.</div>}
  </main>;
}
