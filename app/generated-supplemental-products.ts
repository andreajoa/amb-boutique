import type { Product } from "./data";

const BAG_CARE = "Wipe clean with a soft damp cloth. Avoid prolonged moisture, direct heat and abrasive surfaces. Store filled to preserve shape.";
const BAG_MATERIALS = "Soft synthetic leather or textile upper with synthetic lining and polished metal hardware. Exact composition follows the product label.";
const BAG_DESCRIPTION = "An AMB BOUTIQUE bag selected for practical everyday capacity, polished proportions and easy day-to-evening styling.";

function localImages(slug: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => `/products/${slug}/${String(index + 1).padStart(2, "0")}.avif`);
}

function bag(slug: string, name: string, price: number, color: string, colorName: string, stock: number, weightOz: number, unitCostUsd: number, imageCount = 4): Product {
  return {
    slug,
    name,
    vendor: "AMB BOUTIQUE",
    category: "Bags",
    price,
    badge: "New",
    sheet: "one",
    quadrant: 1,
    colors: [color],
    colorNames: [colorName],
    sizes: ["One Size"],
    description: BAG_DESCRIPTION,
    materials: BAG_MATERIALS,
    care: BAG_CARE,
    images: localImages(slug, imageCount),
    stock,
    weightOz,
    unitCostUsd,
    minimumMarginPercent: 40,
    styleEligible: true,
  };
}

export const supplementalProducts: Product[] = [
  bag("portofino-carryall-black", "Portofino Carryall — Black", 79, "#171717", "Black", 2, 25.29, 25.67),
  bag("portofino-carryall-coffee", "Portofino Carryall — Coffee", 79, "#7a543b", "Coffee", 9, 25.29, 24.22),
  bag("portofino-carryall-burgundy", "Portofino Carryall — Burgundy", 79, "#742c3d", "Burgundy", 3, 25.29, 24.07),
  bag("portofino-carryall-army-green", "Portofino Carryall — Army Green", 79, "#59624a", "Army Green", 990, 25.29, 25.68),
  bag("portofino-carryall-white", "Portofino Carryall — White", 79, "#f4f1e8", "White", 992, 25.29, 25.37),
  bag("portofino-carryall-light-brown", "Portofino Carryall — Light Brown", 79, "#b88663", "Light Brown", 994, 25.29, 24.77),
  bag("portofino-carryall-brown", "Portofino Carryall — Brown", 79, "#774936", "Brown", 4, 25.29, 25.74),
  bag("noir-lace-crossbody-black", "Noir Lace Crossbody — Black", 49, "#171717", "Black", 28, 6.31, 6.81, 6),
  bag("camille-multi-pocket-crossbody-black", "Camille Multi-Pocket Crossbody — Black", 59, "#171717", "Black", 962, 9.88, 8.54, 6),
  bag("camille-multi-pocket-crossbody-green", "Camille Multi-Pocket Crossbody — Green", 59, "#4d6b5b", "Green", 1, 9.88, 9.86, 6),
  bag("camille-multi-pocket-crossbody-red", "Camille Multi-Pocket Crossbody — Red", 59, "#a9323a", "Red", 1, 9.88, 9.49, 6),
  bag("camille-multi-pocket-crossbody-purple", "Camille Multi-Pocket Crossbody — Purple", 59, "#7a5a83", "Purple", 1, 9.88, 11.46, 6),
  bag("camille-multi-pocket-crossbody-signature-print", "Camille Multi-Pocket Crossbody — Signature Print", 59, "#9b7d5c", "Signature Print", 955, 9.88, 5.20, 6),
  bag("florence-mini-backpack-apricot", "Florence Mini Backpack — Apricot", 59, "#d7b58d", "Apricot", 123, 3.49, 10.78),
  bag("florence-mini-backpack-pink", "Florence Mini Backpack — Pink", 59, "#d9a0ab", "Pink", 145, 3.49, 10.78),
  bag("florence-mini-backpack-dark-brown", "Florence Mini Backpack — Dark Brown", 59, "#4b3328", "Dark Brown", 242, 3.49, 9.11),
  bag("florence-mini-backpack-black", "Florence Mini Backpack — Black", 59, "#171717", "Black", 113, 3.49, 10.84),
  bag("avery-bow-satchel-black", "Avery Bow Satchel — Black", 69, "#171717", "Black", 6, 13.62, 11.58),
  bag("avery-bow-satchel-pink", "Avery Bow Satchel — Pink", 69, "#d9a0ab", "Pink", 16, 13.62, 11.98),
  bag("avery-bow-satchel-green", "Avery Bow Satchel — Green", 69, "#4d6b5b", "Green", 1, 13.62, 12.25),
  bag("avery-bow-satchel-blue", "Avery Bow Satchel — Blue", 69, "#426d99", "Blue", 3, 13.62, 11.38),
  bag("avery-bow-satchel-brown", "Avery Bow Satchel — Brown", 69, "#774936", "Brown", 3, 13.62, 11.52),
  bag("avery-bow-satchel-burgundy", "Avery Bow Satchel — Burgundy", 69, "#742c3d", "Burgundy", 5, 13.62, 11.52),
  bag("avery-bow-satchel-light-gray", "Avery Bow Satchel — Light Gray", 69, "#b8b8b3", "Light Gray", 3, 13.62, 11.83),
  bag("siena-signature-satchel-kangaroo-brown", "Siena Signature Satchel — Kangaroo Brown", 98, "#91694a", "Kangaroo Brown", 1, 26.49, 34.12, 6),
  bag("celeste-chain-crossbody-black", "Celeste Chain Crossbody — Black", 98, "#171717", "Black", 2, 16.4, 29.94),
  bag("celeste-chain-crossbody-brown", "Celeste Chain Crossbody — Brown", 98, "#774936", "Brown", 197, 16.4, 31.09),
  bag("celeste-chain-crossbody-purple", "Celeste Chain Crossbody — Purple", 98, "#7a5a83", "Purple", 199, 16.4, 29.79),
  bag("celeste-chain-crossbody-pink", "Celeste Chain Crossbody — Pink", 98, "#d9a0ab", "Pink", 190, 16.4, 30.11),
  bag("celeste-chain-crossbody-khaki", "Celeste Chain Crossbody — Khaki", 98, "#b6a27b", "Khaki", 1, 16.4, 30.71),
  bag("marina-structured-tote-deep-blue", "Marina Structured Tote — Deep Blue", 108, "#203b62", "Deep Blue", 3, 17.88, 31.95, 6),
  bag("marina-structured-tote-brown", "Marina Structured Tote — Brown", 108, "#774936", "Brown", 4, 17.88, 32.64, 6),
  bag("marina-structured-tote-black", "Marina Structured Tote — Black", 108, "#171717", "Black", 4, 17.88, 31.29, 6),
];
