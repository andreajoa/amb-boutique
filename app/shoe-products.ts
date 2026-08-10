import type { Product, ShoeVariant } from "./data";

const CARE = "Wipe gently with a soft dry cloth after wear. Keep away from prolonged moisture, direct heat and abrasive surfaces. Store filled and protected to preserve shape.";
const SYNTHETIC = "Smooth synthetic upper with decorative detailing, synthetic lining and sole. Exact composition follows the product label.";
const CRYSTAL = "Textile and synthetic upper with crystal-look embellishment, smooth lining and synthetic sole. Exact composition follows the product label.";
const WOVEN = "Woven textile upper with smooth synthetic lining and sole. Exact composition follows the product label.";
const HEEL_ATLAS_IMAGE = "/api/heel-atlas?v=20260810-3";

let placement = 0;
function shell(product: Omit<Product, "vendor" | "category" | "subcategory" | "sheet" | "quadrant" | "images" | "care" | "styleEligible" | "heelAtlasIndex">): Product {
  const index = placement++;
  return {
    ...product,
    vendor: "AMB BOUTIQUE",
    category: "Shoes",
    subcategory: "Heels",
    sheet: index % 2 === 0 ? "one" : "two",
    quadrant: ((index % 4) + 1) as 1 | 2 | 3 | 4,
    images: [HEEL_ATLAS_IMAGE, HEEL_ATLAS_IMAGE, HEEL_ATLAS_IMAGE, HEEL_ATLAS_IMAGE],
    heelAtlasIndex: index,
    care: CARE,
    styleEligible: true,
  };
}

function fixed(
  slug: string,
  name: string,
  price: number,
  color: string,
  colorName: string,
  sizes: string[],
  stock: number,
  weightOz: number,
  unitCostUsd: number,
  description: string,
  materials: string,
  heelHeightCm?: number,
): Product {
  return shell({
    slug, name, price, badge: placement < 5 ? "Just In" : "New",
    colors: [color], colorNames: [colorName], sizes, stock, weightOz, unitCostUsd,
    minimumMarginPercent: 40, description, materials, heelHeightCm,
  });
}

function variable(
  slug: string,
  name: string,
  price: number,
  color: string,
  colorName: string,
  variants: ShoeVariant[],
  weightOz: number,
  unitCostUsd: number,
  description: string,
): Product {
  const sizes = Array.from(new Set(variants.flatMap((variant) => variant.sizes))).sort((a, b) => Number(a) - Number(b));
  return shell({
    slug, name, price, badge: "New", colors: [color], colorNames: [colorName],
    sizes, stock: variants.reduce((sum, variant) => sum + variant.stock, 0), weightOz, unitCostUsd,
    minimumMarginPercent: 40, description, materials: SYNTHETIC, shoeVariants: variants,
  });
}

const wovenDescription = "An airy woven pointed-toe slingback with an openwork upper and slim heel, designed for polished warm-weather dressing.";
const crystalSandalDescription = "A crystal-trim block-heel sandal with a slender crossover strap and secure ankle fastening for occasion-ready shine with a stable step.";
const crystalSlingbackDescription = "A pointed slingback covered in crystal-look embellishment, balancing a refined profile with luminous evening texture.";
const buckleSlingbackDescription = "A sharp pointed-toe slingback on a 9 cm stiletto heel, finished with a sculptural buckle detail for polished occasion dressing.";
const bucklePumpDescription = "A pointed 9 cm pump with a refined metal buckle accent and slim stiletto heel, cut for a sleek day-to-evening line.";
const patentDescription = "A sharply pointed patent-look slingback with a fine heel and elongated line, offered in four heel heights for flexible day-to-evening styling.";
const glossDescription = "A pointed slingback with a slim heel and clean, elongated profile, available in two heel heights for a precise balance of polish and impact.";
const bowDescription = "A feminine pointed pump with a sculpted bow detail and slim heel, offered in two heel heights for celebrations, weddings and evening looks.";

const s3343 = ["33","34","35","36","37","38","39","40","41","42","43"];
const s3346 = ["33","34","35","36","37","38","39","40","41","42","43","44","45","46"];
const s3441 = ["34","35","36","37","38","39","40","41"];
const s3440 = ["34","35","36","37","38","39","40"];

export const shoeProducts: Product[] = [
  fixed("solene-woven-slingback","Solene Woven Slingback",118,"#eee7d8","Cream Ivory",["35","36","37","38","39","40","41","42"],1334,19.4,36.70,wovenDescription,WOVEN),
  fixed("valentina-crystal-sandal","Valentina Crystal Sandal",98,"#b32635","Red",["35","36","37","38","39","40","41","42","43","44","45"],437,16.51,21.03,crystalSandalDescription,CRYSTAL),
  fixed("luna-crystal-sandal","Luna Crystal Sandal",98,"#d8c3a8","Beige",["35","36","37","38","39","40","41","42","43","44","45"],437,16.51,21.57,crystalSandalDescription,CRYSTAL),
  fixed("noir-crystal-sandal","Noir Crystal Sandal",98,"#171717","Black",["35","36","37","38","39","40","41","42","43","44","45"],425,16.51,21.44,crystalSandalDescription,CRYSTAL),
  fixed("elodie-crystal-slingback","Elodie Crystal Slingback",128,"#d8c3a8","Champagne",["36","37","38","39","40","41","42"],130,17.64,43.07,crystalSlingbackDescription,CRYSTAL),

  fixed("monaco-buckle-slingback","Monaco Buckle Slingback",148,"#171717","Black",["36","37","38","39","40"],19,21.27,50.44,buckleSlingbackDescription,SYNTHETIC,9),
  fixed("bianca-buckle-slingback","Bianca Buckle Slingback",148,"#f4f2ec","White",["36","37","38","39","40"],25,21.27,50.47,buckleSlingbackDescription,SYNTHETIC,9),
  fixed("celeste-buckle-slingback","Celeste Buckle Slingback",148,"#c7aa8d","Champagne",["36","37","38","39","40"],35,21.27,50.52,buckleSlingbackDescription,SYNTHETIC,9),

  fixed("mosaic-buckle-pump","Mosaic Buckle Pump",168,"#a78d83","Metallic Mix",["37","40"],5,23.17,57.13,bucklePumpDescription,SYNTHETIC,9),
  fixed("sable-buckle-pump","Sable Buckle Pump",168,"#d8c3a8","Beige",["36","37","38","39","40"],24,23.17,58.59,bucklePumpDescription,SYNTHETIC,9),
  fixed("onyx-buckle-pump","Onyx Buckle Pump",168,"#171717","Black",["36","37","38","39"],13,23.17,57.32,bucklePumpDescription,SYNTHETIC,9),
  fixed("rouge-buckle-pump","Rouge Buckle Pump",168,"#b32635","Red",["36","37","38","39","40"],49,23.17,58.70,bucklePumpDescription,SYNTHETIC,9),
  fixed("cognac-buckle-pump","Cognac Buckle Pump",168,"#8a4f35","Cognac",["36","37","39","40"],18,23.17,57.72,bucklePumpDescription,SYNTHETIC,9),

  variable("aurelia-patent-slingback","Aurelia Patent Slingback",158,"#d6b39e","Nude",[
    { heelHeightCm: 6, sizes: s3343, stock: 1070 }, { heelHeightCm: 8, sizes: s3346, stock: 1337 },
    { heelHeightCm: 10, sizes: s3346, stock: 1354 }, { heelHeightCm: 12, sizes: s3346, stock: 1370 },
  ],17.64,49.41,patentDescription),
  variable("rouge-patent-slingback","Rouge Patent Slingback",158,"#a7192f","Laser Red",[
    { heelHeightCm: 6, sizes: s3343, stock: 1087 }, { heelHeightCm: 8, sizes: s3346, stock: 1383 },
    { heelHeightCm: 10, sizes: s3346, stock: 1384 }, { heelHeightCm: 12, sizes: s3346, stock: 1383 },
  ],17.64,49.41,patentDescription),
  variable("onyx-patent-slingback","Onyx Patent Slingback",158,"#171717","Black",[
    { heelHeightCm: 6, sizes: s3343, stock: 1077 }, { heelHeightCm: 8, sizes: s3346, stock: 1367 },
    { heelHeightCm: 10, sizes: s3346, stock: 1378 }, { heelHeightCm: 12, sizes: s3346, stock: 1383 },
  ],17.64,49.41,patentDescription),

  variable("lucia-gloss-slingback","Lucia Gloss Slingback",228,"#d8b8a4","Nude Gloss",[
    { heelHeightCm: 8, sizes: s3441, stock: 7054 }, { heelHeightCm: 10, sizes: s3441, stock: 7054 },
  ],17.64,81.34,glossDescription),
  variable("pearl-gloss-slingback","Pearl Gloss Slingback",228,"#b9b5b0","Pearl Grey",[
    { heelHeightCm: 8, sizes: s3441, stock: 7056 }, { heelHeightCm: 10, sizes: s3441, stock: 7055 },
  ],17.64,81.34,glossDescription),
  variable("noir-matte-slingback","Noir Matte Slingback",228,"#1b1b1b","Black Matte",[
    { heelHeightCm: 8, sizes: s3441, stock: 7050 }, { heelHeightCm: 10, sizes: s3441, stock: 7055 },
  ],17.64,81.34,glossDescription),
  variable("noir-gloss-slingback","Noir Gloss Slingback",228,"#111111","Black Gloss",[
    { heelHeightCm: 8, sizes: s3441, stock: 7052 }, { heelHeightCm: 10, sizes: s3441, stock: 7056 },
  ],17.64,81.34,glossDescription),

  variable("soleil-bow-pump","Soleil Bow Pump",98,"#e7cd68","Yellow",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6209 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6195 },
  ],21.16,17.65,bowDescription),
  variable("pearl-bow-pump","Pearl Bow Pump",98,"#f2eee6","White",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6204 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6151 },
  ],21.16,17.65,bowDescription),
  variable("rouge-bow-pump","Rouge Bow Pump",98,"#b32635","Red",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6214 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6183 },
  ],21.16,17.65,bowDescription),
  variable("blush-bow-pump","Blush Bow Pump",98,"#e7b7bb","Blush Pink",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6212 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6126 },
  ],21.16,17.65,bowDescription),
  variable("mist-bow-pump","Mist Bow Pump",98,"#aeb4b6","Grey",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6204 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6180 },
  ],21.16,17.65,bowDescription),
  variable("sky-bow-pump","Sky Bow Pump",98,"#b9d5dc","Powder Blue",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6211 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6150 },
  ],21.16,17.65,bowDescription),
  variable("noir-bow-pump","Noir Bow Pump",98,"#171717","Black",[
    { heelHeightCm: 7.5, sizes: s3440, stock: 6209 }, { heelHeightCm: 10.5, sizes: s3440, stock: 6170 },
  ],21.16,17.65,bowDescription),
];