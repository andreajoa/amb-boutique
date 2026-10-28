import type { NextConfig } from "next";
import retired from "./imports/catalog-retired-20261028.json";

// Páginas retiradas (duplicatas e cores que o fornecedor não vende); lista em imports/.
const retiredProducts: Record<string, string> = retired.redirects;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  async redirects() {
    return Object.entries(retiredProducts).map(([from, to]) => ({
      source: `/products/${from}`,
      destination: `/products/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
