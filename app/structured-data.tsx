export function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": "https://ambboutique.online/#store",
    name: "AMB BOUTIQUE",
    url: "https://ambboutique.online",
    email: "info@ambboutique.online",
    description: "A San Diego women’s fashion boutique offering dresses, tops, blouses, rompers, playsuits, skirts, shorts, knitwear, bags, shoes and accessories.",
    founder: { "@type": "Person", name: "Ana Paula Maciel" },
    foundingLocation: { "@type": "Place", name: "San Diego, California, United States" },
    address: { "@type": "PostalAddress", addressLocality: "San Diego", addressRegion: "CA", addressCountry: "US" },
    areaServed: ["United States", "Canada", "United Kingdom", "Australia", "New Zealand"],
    currenciesAccepted: ["USD", "CAD", "GBP", "AUD", "NZD"],
    contactPoint: { "@type": "ContactPoint", email: "info@ambboutique.online", contactType: "customer service", availableLanguage: "English" },
  };
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://ambboutique.online/#website",
    name: "AMB BOUTIQUE",
    url: "https://ambboutique.online",
    publisher: { "@id": "https://ambboutique.online/#store" },
    inLanguage: "en-US",
    potentialAction: { "@type": "SearchAction", target: "https://ambboutique.online/search?q={search_term_string}", "query-input": "required name=search_term_string" },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}/><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}/></>;
}
