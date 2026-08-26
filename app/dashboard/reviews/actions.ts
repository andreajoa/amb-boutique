"use server";

import { revalidatePath } from "next/cache";
import { dashboardAuthenticated } from "../auth";
import { getReviewsSql } from "../../reviews/db";

async function requireReviewAdmin() {
  if (!await dashboardAuthenticated()) throw new Error("Unauthorized");
  const sql = await getReviewsSql();
  if (!sql) throw new Error("Reviews database unavailable");
  return sql;
}

function reviewId(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid review");
  return id;
}

export async function approveReview(formData: FormData) {
  const sql = await requireReviewAdmin();
  const id = reviewId(formData);
  await sql`UPDATE amb_product_reviews SET status = 'approved', moderated_at = now() WHERE id = ${id}`;
  revalidatePath("/dashboard/reviews");
}

export async function rejectReview(formData: FormData) {
  const sql = await requireReviewAdmin();
  const id = reviewId(formData);
  await sql`UPDATE amb_product_reviews SET status = 'rejected', moderated_at = now() WHERE id = ${id}`;
  revalidatePath("/dashboard/reviews");
}

export async function deleteReview(formData: FormData) {
  const sql = await requireReviewAdmin();
  const id = reviewId(formData);
  await sql`DELETE FROM amb_product_reviews WHERE id = ${id}`;
  revalidatePath("/dashboard/reviews");
}
