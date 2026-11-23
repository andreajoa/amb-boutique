import type { Metadata } from "next";
import { Footer, Header } from "../components";
import { FitFinderClient } from "./fit-finder-client";

export const metadata: Metadata = {
  title: "Personal Fit Studio",
  description: "Find the AMB BOUTIQUE silhouettes, sizes and hemline proportions tailored to your height, shape and upcoming event date — no account required.",
  alternates: { canonical: "/fit-finder" },
  openGraph: {
    title: "Personal Fit Studio · AMB BOUTIQUE",
    description: "Discover your exact size, flattering silhouettes and real delivery dates across AMB BOUTIQUE.",
    url: "/fit-finder",
  },
};

export default function FitFinderPage() {
  return (
    <main>
      <Header />
      <FitFinderClient />
      <Footer />
    </main>
  );
}
