import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "AMB BOUTIQUE", short_name: "AMB", description: "Contemporary women’s fashion curated in San Diego.", start_url: "/", display: "standalone", background_color: "#fffefc", theme_color: "#171512", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
