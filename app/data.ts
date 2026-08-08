export type Product = {
  slug: string;
  name: string;
  category: "Dresses" | "Tops" | "Playsuits" | "Bags" | "Shoes";
  price: number;
  compareAt?: number;
  badge?: string;
  sheet: "one" | "two";
  quadrant: 1 | 2 | 3 | 4;
  colors: string[];
  rating?: number;
};

export const products: Product[] = [
  { slug: "sienna-linen-midi-dress", name: "Sienna Linen Midi Dress", category: "Dresses", price: 89, compareAt: 118, badge: "Save 25%", sheet: "one", quadrant: 1, colors: ["#eee6d8", "#1b1b1b"], rating: 5 },
  { slug: "isla-pleated-mini-dress", name: "Isla Pleated Mini Dress", category: "Dresses", price: 98, sheet: "one", quadrant: 2, colors: ["#e8c7c0", "#f4eee2"] },
  { slug: "margot-knit-midi-dress", name: "Margot Knit Midi Dress", category: "Dresses", price: 112, badge: "New", sheet: "one", quadrant: 3, colors: ["#191919", "#b58d78"], rating: 5 },
  { slug: "del-mar-draped-dress", name: "Del Mar Draped Dress", category: "Dresses", price: 94, sheet: "one", quadrant: 4, colors: ["#d2b6a9", "#f6f0e7"] },
  { slug: "la-jolla-linen-blouse", name: "La Jolla Linen Blouse", category: "Tops", price: 68, compareAt: 86, badge: "Save 20%", sheet: "one", quadrant: 2, colors: ["#eec3bd", "#efe7d9"] },
  { slug: "sunset-ribbed-tank", name: "Sunset Ribbed Tank", category: "Tops", price: 54, sheet: "one", quadrant: 4, colors: ["#bf8e78", "#eee4d7"] },
  { slug: "cabrillo-tailored-playsuit", name: "Cabrillo Tailored Playsuit", category: "Playsuits", price: 104, sheet: "two", quadrant: 2, colors: ["#aa8c76", "#f1ebe2"], rating: 5 },
  { slug: "solana-wrap-playsuit", name: "Solana Wrap Playsuit", category: "Playsuits", price: 96, badge: "Just In", sheet: "two", quadrant: 4, colors: ["#d5aaa4", "#f5efe6"] },
  { slug: "catalina-shoulder-bag", name: "Catalina Shoulder Bag", category: "Bags", price: 128, sheet: "two", quadrant: 1, colors: ["#9d6541", "#151515"] },
  { slug: "pacific-structured-tote", name: "Pacific Structured Tote", category: "Bags", price: 146, badge: "Best Seller", sheet: "two", quadrant: 1, colors: ["#8c5b3d", "#e7d9c5"], rating: 5 },
  { slug: "paloma-slingback-heel", name: "Paloma Slingback Heel", category: "Shoes", price: 118, sheet: "two", quadrant: 3, colors: ["#d5b39d", "#171717"] },
  { slug: "maren-strappy-sandal", name: "Maren Strappy Sandal", category: "Shoes", price: 92, compareAt: 115, badge: "Save 20%", sheet: "two", quadrant: 3, colors: ["#b99070", "#e9ddce"] },
];

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(value);
