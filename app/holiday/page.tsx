import type { Metadata } from "next";
import { products } from "../data";
import { CollectionsClient } from "../collections/collections-client";
import { toCollectionProducts } from "../collections/collection-products";
import { holidayCopy, holidayPhase, holidayProducts } from "./season";

// Uma página para a temporada inteira: Black Friday → presentes → Réveillon.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Holiday Edit: Black Friday, Gifts & New Year's Eve",
  description: "AMB BOUTIQUE holiday edit: Black Friday week, a gift guide with Christmas delivery dates and New Year's Eve dresses.",
  alternates: { canonical: "/holiday" },
};

export default function HolidayPage() {
  const phase = holidayPhase();
  const copy = holidayCopy(phase);
  return <CollectionsClient products={toCollectionProducts(holidayProducts(products, phase))} title={copy.title} eyebrow={copy.eyebrow} subtitle={copy.subtitle} notice={copy.notice} signup={copy.signup} />;
}
