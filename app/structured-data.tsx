const siteUrl = "https://ambboutique.online";

export function StructuredData() {
  const servedCountries = [
    { "@type": "Country", name: "United States" },
    { "@type": "Country", name: "Canada" },
    { "@type": "Country", name: "United Kingdom" },
    { "@type": "Country", name: "Australia" },
    { "@type": "Country", name: "New Zealand" },
  ];

  const organization = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${siteUrl}/#store`,
    name: "AMB BOUTIQUE",
    alternateName: "AMB Boutique",
    url: siteUrl,
    email: "info@ambboutique.online",
    image: `${siteUrl}/images/hero-01.webp`,
    description: "AMB BOUTIQUE is a San Diego women’s fashion boutique offering dresses, rompers, playsuits, skirts, tops, knitwear, bags, heels, shoes and accessories with international delivery.",
    founder: { "@type": "Person", name: "Ana Paula Maciel" },
    foundingLocation: { "@type": "Place", name: "San Diego, California, United States" },
    address: {
      "@type": "PostalAddress",
      addressLocality: "San Diego",
      addressRegion: "CA",
      addressCountry: "US",
    },
    areaServed: servedCountries,
    currenciesAccepted: ["USD", "CAD", "GBP", "AUD", "NZD"],
    contactPoint: {
      "@type": "ContactPoint",
      email: "info@ambboutique.online",
      contactType: "customer service",
      availableLanguage: "English",
      areaServed: servedCountries,
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AMB BOUTIQUE Women’s Fashion",
      itemListElement: [
        { "@type": "OfferCatalog", name: "Women’s Dresses", url: `${siteUrl}/collections/dresses` },
        { "@type": "OfferCatalog", name: "Women’s Rompers & Playsuits", url: `${siteUrl}/collections/rompers-playsuits` },
        { "@type": "OfferCatalog", name: "Women’s Skirts", url: `${siteUrl}/collections/skirts` },
        { "@type": "OfferCatalog", name: "Women’s Tops & Blouses", url: `${siteUrl}/collections/tops-blouses` },
        { "@type": "OfferCatalog", name: "Women’s Knitwear", url: `${siteUrl}/collections/knitwear` },
        { "@type": "OfferCatalog", name: "Women’s Bags", url: `${siteUrl}/collections/bags` },
        { "@type": "OfferCatalog", name: "Women’s Heels & Shoes", url: `${siteUrl}/collections/heels` },
      ],
    },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "AMB BOUTIQUE",
    alternateName: "AMB Boutique",
    url: siteUrl,
    description: "Shop women’s fashion online from AMB BOUTIQUE, curated in San Diego and delivered to the US, Canada, UK, Australia and New Zealand.",
    publisher: { "@id": `${siteUrl}/#store` },
    inLanguage: "en",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}/>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}/>
  </>;
}
