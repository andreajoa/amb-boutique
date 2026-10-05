import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { products as catalogProducts } from "../../../data";
import { storeManagerRequestAuthorized } from "../../../store-manager-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!storeManagerRequestAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const products = catalogProducts.flatMap((product) => {
    const colorNames = Array.isArray(product.colorNames)
      ? product.colorNames.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const sizes = Array.isArray(product.sizes)
      ? product.sizes.map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!product.slug || !product.name || colorNames.length !== 1 || sizes.length === 0) {
      return [];
    }

    return [{
      slug: product.slug,
      name: product.name,
      color: colorNames[0],
      sizes,
      stock: typeof product.stock === "number" ? product.stock : null,
      unitCostUsd: typeof product.unitCostUsd === "number" ? product.unitCostUsd : null,
      ...(product.sourceProductId && product.sourceColor ? {
        sourceProductId: product.sourceProductId,
        sourceColor: product.sourceColor,
      } : {}),
    }];
  });

  const version = createHash("sha256")
    .update(JSON.stringify(products))
    .digest("hex");

  return NextResponse.json(
    { ok: true, version, products },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
