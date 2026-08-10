import type { Product } from "./data";

const BAG_CARE = "Wipe clean with a soft damp cloth. Avoid prolonged moisture, direct heat and abrasive surfaces. Store filled to preserve shape.";
const BAG_MATERIALS = "Soft synthetic leather or textile upper with synthetic lining and polished metal hardware. Exact composition follows the product label.";
const BAG_DESCRIPTION = "An AMB BOUTIQUE bag selected for practical everyday capacity, polished proportions and easy day-to-evening styling.";

function bag(slug: string, name: string, price: number, color: string, colorName: string, stock: number, weightOz: number, unitCostUsd: number, image: string): Product {
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
    images: [image, image, image, image],
    stock,
    weightOz,
    unitCostUsd,
    minimumMarginPercent: 40,
    styleEligible: true,
  };
}

export const supplementalProducts: Product[] = [
  bag("portofino-carryall-black", "Portofino Carryall — Black", 79, "#171717", "Black", 2, 25.29, 25.67, "https://ae01.alicdn.com/kf/S8ec74f31a46a41bc98025bd7c975313er.jpg"),
  bag("portofino-carryall-coffee", "Portofino Carryall — Coffee", 79, "#7a543b", "Coffee", 9, 25.29, 24.22, "https://ae01.alicdn.com/kf/Sd3363d72301a4c0a9e8d9d19157cd09az.jpg"),
  bag("portofino-carryall-burgundy", "Portofino Carryall — Burgundy", 79, "#742c3d", "Burgundy", 3, 25.29, 24.07, "https://ae01.alicdn.com/kf/Se785aca08bd64901a83491381086b992a.jpg"),
  bag("portofino-carryall-army-green", "Portofino Carryall — Army Green", 79, "#59624a", "Army Green", 990, 25.29, 25.68, "https://ae01.alicdn.com/kf/S4a850b5e5f8d48b7918aa3819bf518fbq.jpg"),
  bag("portofino-carryall-white", "Portofino Carryall — White", 79, "#f4f1e8", "White", 992, 25.29, 25.37, "https://ae01.alicdn.com/kf/S24c42f1a63a447e3be3e254944f08d41V.jpg"),
  bag("portofino-carryall-light-brown", "Portofino Carryall — Light Brown", 79, "#b88663", "Light Brown", 994, 25.29, 24.77, "https://ae01.alicdn.com/kf/Sb1cd051acdf14c3087c7f93af47b7681D.jpg"),
  bag("portofino-carryall-brown", "Portofino Carryall — Brown", 79, "#774936", "Brown", 4, 25.29, 25.74, "https://ae01.alicdn.com/kf/S694fa37b398747e1b7c601df3d98dcaca.jpg"),
  bag("noir-lace-crossbody-black", "Noir Lace Crossbody — Black", 49, "#171717", "Black", 28, 6.31, 6.81, "https://ae01.alicdn.com/kf/Sa5f04fe2de324971bbd6439a2241505da.jpg"),
  bag("camille-multi-pocket-crossbody-black", "Camille Multi-Pocket Crossbody — Black", 59, "#171717", "Black", 962, 9.88, 8.54, "https://ae01.alicdn.com/kf/S3affadc9f04e49f797aa92118ffedb32s.jpg"),
  bag("camille-multi-pocket-crossbody-green", "Camille Multi-Pocket Crossbody — Green", 59, "#4d6b5b", "Green", 1, 9.88, 9.86, "https://ae01.alicdn.com/kf/S3165e8413c8a49459920718c9d8a75fbq.jpg"),
  bag("camille-multi-pocket-crossbody-red", "Camille Multi-Pocket Crossbody — Red", 59, "#a9323a", "Red", 1, 9.88, 9.49, "https://ae01.alicdn.com/kf/Sd0ec1b40fb5649b29a8d319af6f523c4D.jpg"),
  bag("camille-multi-pocket-crossbody-purple", "Camille Multi-Pocket Crossbody — Purple", 59, "#7a5a83", "Purple", 1, 9.88, 11.46, "https://ae01.alicdn.com/kf/S665c65b1e4dc494f9dc46e20c0348b4a9.jpg"),
  bag("camille-multi-pocket-crossbody-signature-print", "Camille Multi-Pocket Crossbody — Signature Print", 59, "#9b7d5c", "Signature Print", 955, 9.88, 5.20, "https://ae01.alicdn.com/kf/S7524475eaa0b43c3b3e38aff2e215241b.jpg"),
  bag("florence-mini-backpack-apricot", "Florence Mini Backpack — Apricot", 59, "#d7b58d", "Apricot", 123, 3.49, 10.78, "https://ae01.alicdn.com/kf/Sdbed3c172ff14b0bb64c64b6597414a73.jpg"),
  bag("florence-mini-backpack-pink", "Florence Mini Backpack — Pink", 59, "#d9a0ab", "Pink", 145, 3.49, 10.78, "https://ae01.alicdn.com/kf/Sb725f61778854f55bc06be3cb17d51ba9.jpg"),
  bag("florence-mini-backpack-dark-brown", "Florence Mini Backpack — Dark Brown", 59, "#4b3328", "Dark Brown", 242, 3.49, 9.11, "https://ae01.alicdn.com/kf/S818df8e57f1749ec87928f3f857843704.jpg"),
  bag("florence-mini-backpack-black", "Florence Mini Backpack — Black", 59, "#171717", "Black", 113, 3.49, 10.84, "https://ae01.alicdn.com/kf/S9724298cc0bb4512990cd5aef3b1c232w.jpg"),
  bag("avery-bow-satchel-black", "Avery Bow Satchel — Black", 69, "#171717", "Black", 6, 13.62, 11.58, "https://ae01.alicdn.com/kf/S025a3141f7274ac29abf4b7b864bb2de2.jpg"),
  bag("avery-bow-satchel-pink", "Avery Bow Satchel — Pink", 69, "#d9a0ab", "Pink", 16, 13.62, 11.98, "https://ae01.alicdn.com/kf/Sdfec2d3b43b4461389dda7c00ca55295U.jpg"),
  bag("avery-bow-satchel-green", "Avery Bow Satchel — Green", 69, "#4d6b5b", "Green", 1, 13.62, 12.25, "https://ae01.alicdn.com/kf/Sc5401f5a0fb24854ad87d6be3f01963bH.jpg"),
  bag("avery-bow-satchel-blue", "Avery Bow Satchel — Blue", 69, "#426d99", "Blue", 3, 13.62, 11.38, "https://ae01.alicdn.com/kf/Sf7dbf30f731c414fb3a2a7e747fb09cfB.jpg"),
  bag("avery-bow-satchel-brown", "Avery Bow Satchel — Brown", 69, "#774936", "Brown", 3, 13.62, 11.52, "https://ae01.alicdn.com/kf/S4d8c604218624ff1a34212c353a8fe216.jpg"),
  bag("avery-bow-satchel-burgundy", "Avery Bow Satchel — Burgundy", 69, "#742c3d", "Burgundy", 5, 13.62, 11.52, "https://ae01.alicdn.com/kf/S085eb4dfa3694a59a5d3b5fcc8db17a8M.jpg"),
  bag("avery-bow-satchel-light-gray", "Avery Bow Satchel — Light Gray", 69, "#b8b8b3", "Light Gray", 3, 13.62, 11.83, "https://ae01.alicdn.com/kf/S4e8bb9f916044c92bbf01f29b8fcf9bfO.jpg"),
  bag("siena-signature-satchel-kangaroo-brown", "Siena Signature Satchel — Kangaroo Brown", 98, "#91694a", "Kangaroo Brown", 1, 26.49, 34.12, "https://ae01.alicdn.com/kf/S92477319ee894cdf908d3991e7869544H.jpg"),
  bag("celeste-chain-crossbody-black", "Celeste Chain Crossbody — Black", 98, "#171717", "Black", 2, 16.4, 29.94, "https://ae01.alicdn.com/kf/S61c18758afc04d10af0941144cd76240N.jpg"),
  bag("celeste-chain-crossbody-brown", "Celeste Chain Crossbody — Brown", 98, "#774936", "Brown", 197, 16.4, 31.09, "https://ae01.alicdn.com/kf/Sf8aab1fa376049a4b8a096994bf79206L.jpg"),
  bag("celeste-chain-crossbody-purple", "Celeste Chain Crossbody — Purple", 98, "#7a5a83", "Purple", 199, 16.4, 29.79, "https://ae01.alicdn.com/kf/Sfb17ba4373b54b9e8ecc40336f5b2390J.jpg"),
  bag("celeste-chain-crossbody-pink", "Celeste Chain Crossbody — Pink", 98, "#d9a0ab", "Pink", 190, 16.4, 30.11, "https://ae01.alicdn.com/kf/S7630f08804a3494dbe5a8c4dd9e9aa9aI.jpg"),
  bag("celeste-chain-crossbody-khaki", "Celeste Chain Crossbody — Khaki", 98, "#b6a27b", "Khaki", 1, 16.4, 30.71, "https://ae01.alicdn.com/kf/Sc82a5307a9eb4cc0a3b4ef919f4f3a88Q.jpg"),
  bag("marina-structured-tote-deep-blue", "Marina Structured Tote — Deep Blue", 108, "#203b62", "Deep Blue", 3, 17.88, 31.95, "https://ae01.alicdn.com/kf/S8a2af31c079a4607a121946382daf63dB.jpg"),
  bag("marina-structured-tote-brown", "Marina Structured Tote — Brown", 108, "#774936", "Brown", 4, 17.88, 32.64, "https://ae01.alicdn.com/kf/S151d87e3487645c7973f791c2ae98afdJ.jpg"),
  bag("marina-structured-tote-black", "Marina Structured Tote — Black", 108, "#171717", "Black", 4, 17.88, 31.29, "https://ae01.alicdn.com/kf/S17b24d99d47b4479beaad67fe8278542Q.jpg"),
];
