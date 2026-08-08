import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMB BOUTIQUE | Women’s Fashion from San Diego",
  description: "Contemporary women’s clothing, dresses, tops, bags and shoes curated in San Diego, California by AMB BOUTIQUE.",
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
