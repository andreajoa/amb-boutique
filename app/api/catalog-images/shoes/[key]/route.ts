import { NextResponse } from "next/server";

const SHOE_IMAGE_SOURCES: Record<string, string> = {
  "shoe-01": "https://ae01.alicdn.com/kf/S655d62ab31404631807ff432090cb079c.jpg",
  "shoe-02": "https://ae01.alicdn.com/kf/Se0fc50cec9e54028a07e74806cf0489dw.jpg",
  "shoe-03": "https://ae01.alicdn.com/kf/S7cfe0e8d352c4c0ba57b2110eb7b4a40z.jpg",
  "shoe-04": "https://ae01.alicdn.com/kf/S98bdb61f48674ad7aa8f1a06dc84ef403.jpg",
  "shoe-05": "https://ae01.alicdn.com/kf/S76577406bf604e7d9e3fe54dc5713b3eZ.jpg",
  "shoe-06": "https://ae01.alicdn.com/kf/S1fbeb0fa6d6c463facd3d85f6a2f7c60g.jpg",
  "shoe-07": "https://ae01.alicdn.com/kf/Sbba85139abfd4a5488e35d4e8dbb5184S.jpg",
  "shoe-08": "https://ae01.alicdn.com/kf/S774f31f49ca144e78e6082ca897f25e1F.jpg",
  "shoe-09": "https://ae01.alicdn.com/kf/Sb3820bcec3104f4581db65b8ec02faf4B.jpg",
  "shoe-10": "https://ae01.alicdn.com/kf/S800b3f6eb2394d099dc78afc4c43ecaaB.jpg",
  "shoe-11": "https://ae01.alicdn.com/kf/Sd67d5605437e42508835c41803929a83e.jpg",
  "shoe-12": "https://ae01.alicdn.com/kf/S9d03454c183b42dda66bd7ae3285d8c8u.jpg",
  "shoe-13": "https://ae01.alicdn.com/kf/Sf2170425fdbe4c269e02bbcc0d58bbe4w.jpg",
  "shoe-14": "https://ae01.alicdn.com/kf/Sc300939d3fb54bb180e9f3193819285ce.jpg",
  "shoe-15": "https://ae01.alicdn.com/kf/S039ea985e44449638e96f3091f6c1e38t.jpg",
  "shoe-16": "https://ae01.alicdn.com/kf/S8380cd7d53244deb99ac5d0856f1137bV.jpg",
  "shoe-17": "https://ae01.alicdn.com/kf/S0efc4ef85f694694a384e3440b41d73aL.jpg",
  "shoe-18": "https://ae01.alicdn.com/kf/S2f27ee9d7d284bccadd4484a9871e402J.jpg",
  "shoe-19": "https://ae01.alicdn.com/kf/S67965fbca60e4e72942a6181ac488b1fK.jpg",
  "shoe-20": "https://ae01.alicdn.com/kf/S5e1553f4e52a4c90baa3b9b0afe6e94fq.jpg",
  "shoe-21": "https://ae01.alicdn.com/kf/S5e0db9f50ae64b3a955c4ccb766a378eT.jpg",
  "shoe-22": "https://ae01.alicdn.com/kf/Sa5c914c312d843978ca77e11e99d8299w.jpg",
  "shoe-23": "https://ae01.alicdn.com/kf/S6abc9c6b02d7485aa7d65b25aeae2228M.jpg",
  "shoe-24": "https://ae01.alicdn.com/kf/S9554a47074564e75b683ab30762797c8D.jpg",
  "shoe-25": "https://ae01.alicdn.com/kf/S0a8bc128b9284a8bbd9442b20c09e3e4h.jpg",
  "shoe-26": "https://ae01.alicdn.com/kf/S29b4f55d90b24469abc87f809b0fd13fA.jpg",
  "shoe-27": "https://ae01.alicdn.com/kf/S1052fcf646df49cb9ebed06b54d0f3e0s.jpg",
  "shoe-28": "https://ae01.alicdn.com/kf/Sd640949b714943058e4ee94b6b963016L.jpg",
  "shoe-29": "https://ae01.alicdn.com/kf/Sc8f50d48c0c24db7b8c56ab094d8eaa9W.jpg",
  "shoe-30": "https://ae01.alicdn.com/kf/S0c30adb441234e34ad4825c60a37b6ae2.jpg",
  "shoe-31": "https://ae01.alicdn.com/kf/Hccd1801145ed44e2ad51f61589ab80b95.jpg",
  "shoe-32": "https://ae01.alicdn.com/kf/Hd2b8df1609c345b780eec3fe47d2abceI.jpg",
  "shoe-33": "https://ae01.alicdn.com/kf/H9c0a74a075214d5980a6ee2d423650502.jpg",
  "shoe-34": "https://ae01.alicdn.com/kf/Had01905d8ab84e4e86c10ae0ad84f90eq.jpg",
  "shoe-35": "https://ae01.alicdn.com/kf/He350a51e9ac04a78a20f331d58052123w.jpg",
  "shoe-36": "https://ae01.alicdn.com/kf/H651d512dcdd34a98a8aeed19dadff37fe.jpg",
  "shoe-37": "https://ae01.alicdn.com/kf/H2a8039c213094a8bb29984da899cce28Y.jpg"
};

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const source = SHOE_IMAGE_SOURCES[key];
  if (!source) return new NextResponse("Image not found", { status: 404 });

  try {
    const response = await fetch(source, { next: { revalidate: 60 * 60 * 24 * 7 } });
    if (!response.ok || !response.body) return new NextResponse("Image unavailable", { status: 502 });
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Image unavailable", { status: 502 });
  }
}
