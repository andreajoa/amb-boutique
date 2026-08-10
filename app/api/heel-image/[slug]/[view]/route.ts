import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ATLAS_WIDTH = 1800;
const ATLAS_HEIGHT = 1500;
const TILE = 300;
const VIEW = 150;
const COLS = 6;

const productIndex: Record<string, number> = {"solene-woven-slingback":0,"valentina-crystal-sandal":1,"luna-crystal-sandal":2,"noir-crystal-sandal":3,"elodie-crystal-slingback":4,"monaco-buckle-slingback":5,"bianca-buckle-slingback":6,"celeste-buckle-slingback":7,"mosaic-buckle-pump":8,"sable-buckle-pump":9,"onyx-buckle-pump":10,"rouge-buckle-pump":11,"cognac-buckle-pump":12,"aurelia-patent-slingback":13,"rouge-patent-slingback":14,"onyx-patent-slingback":15,"lucia-gloss-slingback":16,"pearl-gloss-slingback":17,"noir-matte-slingback":18,"noir-gloss-slingback":19,"soleil-bow-pump":20,"pearl-bow-pump":21,"rouge-bow-pump":22,"blush-bow-pump":23,"mist-bow-pump":24,"sky-bow-pump":25,"noir-bow-pump":26};

export async function GET(_: Request, { params }: { params: Promise<{ slug: string; view: string }> }) {
  const { slug, view } = await params;
  const index = productIndex[slug];
  const viewIndex = Number(view) - 1;
  if (!Number.isInteger(index) || viewIndex < 0 || viewIndex > 3) return new NextResponse("Not found", { status: 404 });

  const tileX = (index % COLS) * TILE;
  const tileY = Math.floor(index / COLS) * TILE;
  const sourceX = tileX + (viewIndex % 2) * VIEW;
  const sourceY = tileY + Math.floor(viewIndex / 2) * VIEW;
  const scale = 900 / VIEW;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><rect width="900" height="900" fill="#f5efe5"/><image href="/products/_heels/heels-atlas.webp" width="${ATLAS_WIDTH * scale}" height="${ATLAS_HEIGHT * scale}" x="${-sourceX * scale}" y="${-sourceY * scale}" preserveAspectRatio="none"/></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=31536000, immutable" } });
}
