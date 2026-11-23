"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Product } from "./data";
import { productForSize, productPrice } from "./product-pricing";
import { getPreparationNotice } from "./product-fulfillment";
import { FIRST_ORDER_CODE, formatMarketPrice, getDiscountState, MarketCode, markets, US_FREE_SHIPPING_THRESHOLD_USD } from "./commerce";
import { CartRewards } from "./cart-rewards";
import { rankRecommendations } from "./recommendations";
import { approvedOfferPercent } from "./offer-ceiling";

type OfferType = "cart-bump" | "post-purchase";
export type CartLineOffer = { approvedPercent: number; discountedLineUsd: number; excluded: boolean };
type ServerCartQuote = {
  key: string;
  effectiveDiscountUsd: number;
  estimatedTotalUsd: number;
  hasIneligibleItems: boolean;
  lines: Record<string, CartLineOffer>;
};

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  heelHeightCm?: number;
  sheet: Product["sheet"];
  quadrant: Product["quadrant"];
  image?: string;
  imageSpriteColumns?: number;
  imageSpriteRows?: number;
  imageViewWidth?: number;
  imageViewHeight?: number;
  offer?: OfferType;
};

type AddOptions = { size: string; color: string; quantity: number; heelHeightCm?: number; offer?: OfferType };
type AddEntry = { product: Product; options: AddOptions };
type BehaviorEvent = "product_view" | "size_guide_open" | "add_to_cart" | "cart_open" | "style_look_add" | "checkout_start" | "checkout_error" | "save_item";

type StoreContextValue = {
  /** Browser-safe catalogue from the layout: no costs or supplier identity. */
  catalog: Product[];
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  estimatedTotal: number;
  cartOpen: boolean;
  market: MarketCode;
  promoCode: string;
  visitorId: string;
  preferredCategories: string[];
  setMarket: (market: MarketCode) => void;
  setPromoCode: (code: string) => void;
  setOrderNote: (note: string) => void;
  formatMoney: (valueUsd: number) => string;
  discount: ReturnType<typeof getDiscountState>;
  effectiveDiscountUsd: number;
  lineOffers: Record<string, CartLineOffer>;
  hasIneligibleOfferItems: boolean;
  addItem: (product: Product, options: AddOptions) => void;
  addItems: (entries: AddEntry[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  recordProductView: (product: Product) => void;
  trackEvent: (event: BehaviorEvent, details?: { slug?: string; category?: string; source?: string; valueUsd?: number }) => void;
  openCart: () => void;
  closeCart: () => void;
  checkout: () => Promise<void>;
  buyNow: (product: Product, options: AddOptions, context?: { parentSessionId?: string }) => Promise<void>;
  checkoutError: string;
  getProductPreparationNotice: (slug: string) => string | undefined;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const storageKey = "amb-boutique-cart-v2";
const marketStorageKey = "amb-boutique-market-v1";
const promoStorageKey = "amb-boutique-promo-v1";
const profileStorageKey = "amb-boutique-preferences-v1";
const consentKey = "amb-cookie-consent-v1";

function consentAllowsPersonalization() {
  try { return JSON.parse(window.localStorage.getItem(consentKey) || "null")?.value === "all"; } catch { return false; }
}

function createVisitorId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `amb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

export function StoreProvider({ children, catalog }: { children: React.ReactNode; catalog: Product[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [market, setMarket] = useState<MarketCode>("US");
  const [promoCode, setPromoCodeState] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [checkoutError, setCheckoutError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [serverQuote, setServerQuote] = useState<ServerCartQuote | null>(null);
  const [renderNow] = useState(() => Date.now());

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const savedLines = JSON.parse(saved) as CartLine[];
          setCart(savedLines.flatMap((line) => {
            const product = catalog.find((item) => item.slug === line.slug);
            if (!product?.sizePrices) return [line];
            if (!product.sizes?.includes(line.size)) return [];
            return [{ ...line, price: productPrice(product, line.size) }];
          }));
        }
        const savedMarket = window.localStorage.getItem(marketStorageKey);
        if (savedMarket && savedMarket in markets) setMarket(savedMarket as MarketCode);
        setPromoCodeState(window.localStorage.getItem(promoStorageKey) || "");

        const sessionId = window.sessionStorage.getItem("amb-session-id") || createVisitorId();
        window.sessionStorage.setItem("amb-session-id", sessionId);
        if (consentAllowsPersonalization()) {
          const profile = JSON.parse(window.localStorage.getItem(profileStorageKey) || "null");
          const persistentId = profile?.visitorId || sessionId;
          setVisitorId(persistentId);
          setPreferredCategories(Array.isArray(profile?.categories) ? profile.categories : []);
          window.localStorage.setItem(profileStorageKey, JSON.stringify({ visitorId: persistentId, categories: profile?.categories || [], updatedAt: new Date().toISOString() }));
        } else setVisitorId(sessionId);
      } catch {
        window.localStorage.removeItem(storageKey);
        setVisitorId(createVisitorId());
      }
      setHydrated(true);
    });
  }, [catalog]);

  useEffect(() => {
    const handleConsent = (event: Event) => {
      if ((event as CustomEvent).detail !== "all") return;
      setVisitorId((current) => {
        const id = current || createVisitorId();
        window.localStorage.setItem(profileStorageKey, JSON.stringify({ visitorId: id, categories: preferredCategories, updatedAt: new Date().toISOString() }));
        return id;
      });
    };
    window.addEventListener("amb-consent-change", handleConsent);
    return () => window.removeEventListener("amb-consent-change", handleConsent);
  }, [preferredCategories]);

  useEffect(() => { if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(cart)); }, [cart, hydrated]);
  useEffect(() => { if (hydrated) window.localStorage.setItem(marketStorageKey, market); }, [market, hydrated]);
  useEffect(() => {
    if (!hydrated || !cart.length) return;
    if (new URLSearchParams(window.location.search).get("open_cart") === "1") queueMicrotask(() => setCartOpen(true));
  }, [cart.length, hydrated]);
  useEffect(() => {
    if (!hydrated || !visitorId) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          visitorId,
          market,
          items: cart.map(({ slug, quantity, size, color, heelHeightCm, offer }) => ({ slug, quantity, size, color, heelHeightCm, offer })),
        }),
      }).catch(() => undefined);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [cart, hydrated, market, visitorId]);
  const drawerOpen = cartOpen && pathname !== "/checkout";
  useEffect(() => { document.body.style.overflow = drawerOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [drawerOpen]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = getDiscountState(cartTotal, renderNow, promoCode);
  const welcomePercent = promoCode.toUpperCase() === FIRST_ORDER_CODE ? 10 : 0;
  const catalogBySlug = useMemo(() => new Map(catalog.map((product) => [product.slug, product])), [catalog]);
  const getProductPreparationNotice = useCallback((slug: string) => getPreparationNotice(catalogBySlug.get(slug)), [catalogBySlug]);
  const quoteKey = useMemo(
    () => JSON.stringify({
      market,
      promotionCode: promoCode.trim().toUpperCase(),
      items: cart.map(({ id, slug, quantity, size, heelHeightCm, offer }) => ({ id, slug, quantity, size, heelHeightCm, offer })),
    }),
    [cart, market, promoCode],
  );

  useEffect(() => {
    if (!hydrated || !cart.length) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/cart/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: quoteKey,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: Omit<ServerCartQuote, "key"> | null) => {
          if (!data || typeof data.estimatedTotalUsd !== "number") return;
          setServerQuote({
            key: quoteKey,
            effectiveDiscountUsd: data.effectiveDiscountUsd,
            estimatedTotalUsd: data.estimatedTotalUsd,
            hasIneligibleItems: Boolean(data.hasIneligibleItems),
            lines: data.lines || {},
          });
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cart.length, hydrated, quoteKey]);

  const optimisticPricing = useMemo(() => {
    const lines: Record<string, CartLineOffer> = {};
    let total = 0;
    let hasIneligible = false;
    for (const line of cart) {
      const product = catalogBySlug.get(line.slug);
      const requestedPercent = Math.max(discount.percent, welcomePercent, line.offer === "cart-bump" ? 10 : 0);
      let approvedPercent = 0;
      if (product) {
        try {
          approvedPercent = approvedOfferPercent(productForSize(product, line.size), requestedPercent);
        } catch {
          approvedPercent = 0;
        }
      }
      const discountedLineUsd = line.price * line.quantity * (1 - approvedPercent / 100);
      const excluded = requestedPercent > 0 && approvedPercent === 0;
      if (excluded) hasIneligible = true;
      lines[line.id] = { approvedPercent, discountedLineUsd, excluded };
      total += discountedLineUsd;
    }
    return {
      estimatedTotal: total,
      effectiveDiscountUsd: Math.max(0, cartTotal - total),
      lineOffers: lines,
      hasIneligibleOfferItems: hasIneligible,
    };
  }, [cart, cartTotal, catalogBySlug, discount.percent, welcomePercent]);

  const activeServerQuote = cart.length && serverQuote?.key === quoteKey ? serverQuote : null;
  const estimatedTotal = activeServerQuote ? activeServerQuote.estimatedTotalUsd : optimisticPricing.estimatedTotal;
  const effectiveDiscountUsd = activeServerQuote ? activeServerQuote.effectiveDiscountUsd : optimisticPricing.effectiveDiscountUsd;
  const lineOffers = activeServerQuote ? activeServerQuote.lines : optimisticPricing.lineOffers;
  const hasIneligibleOfferItems = activeServerQuote ? activeServerQuote.hasIneligibleItems : optimisticPricing.hasIneligibleOfferItems;
  const formatMoney = (valueUsd: number) => formatMarketPrice(valueUsd, market);

  const trackEvent: StoreContextValue["trackEvent"] = useCallback((event, details = {}) => {
    if (!visitorId) return;
    const anonymous = !consentAllowsPersonalization();
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        anonymous,
        visitorId,
        sessionId: window.sessionStorage.getItem("amb-analytics-session-v1") || undefined,
        path: window.location.pathname,
        market,
        ...details,
      }),
    }).catch(() => undefined);
  }, [market, visitorId]);

  const setPromoCode = (code: string) => {
    const normalized = code.trim().toUpperCase();
    setPromoCodeState(normalized);
    if (normalized) window.localStorage.setItem(promoStorageKey, normalized); else window.localStorage.removeItem(promoStorageKey);
  };

  const addItems: StoreContextValue["addItems"] = (entries) => {
    if (!entries.length) return;
    setCart((current) => entries.reduce<CartLine[]>((next, { product, options }) => {
      const heelKey = options.heelHeightCm ? `${options.heelHeightCm}cm` : "no-heel-variant";
      const id = `${product.slug}:${options.size}:${options.color}:${heelKey}:${options.offer || "standard"}`;
      const existing = next.find((line) => line.id === id);
      if (existing) {
        return next.map((line) => line.id === id
          ? { ...line, quantity: Math.min(10, line.quantity + options.quantity) }
          : line);
      }
      const sprite = product.gallerySprite && product.images?.length === 1 ? product.gallerySprite : undefined;
      return [...next, {
        id,
        slug: product.slug,
        name: product.name,
        price: productPrice(product, options.size),
        quantity: options.quantity,
        size: options.size,
        color: options.color,
        heelHeightCm: options.heelHeightCm,
        sheet: product.sheet,
        quadrant: product.quadrant,
        image: product.images?.[0],
        imageSpriteColumns: sprite?.columns,
        imageSpriteRows: sprite?.rows,
        imageViewWidth: sprite?.viewWidth,
        imageViewHeight: sprite?.viewHeight,
        offer: options.offer,
      }];
    }, current));
    setCheckoutError("");
    setCartOpen(true);
    entries.forEach(({ product, options }) => {
      trackEvent("add_to_cart", { slug: product.slug, category: product.category, source: options.offer || "product", valueUsd: productPrice(product, options.size) * options.quantity });
    });
  };

  const addItem: StoreContextValue["addItem"] = (product, options) => {
    addItems([{ product, options }]);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return setCart((current) => current.filter((line) => line.id !== id));
    setCart((current) => current.map((line) => line.id === id ? { ...line, quantity: Math.min(10, quantity) } : line));
  };
  const removeItem = (id: string) => setCart((current) => current.filter((line) => line.id !== id));

  const recordProductView = useCallback((product: Product) => {
    setPreferredCategories((current) => {
      const next = [product.category, ...current.filter((item) => item !== product.category)].slice(0, 5);
      if (consentAllowsPersonalization()) window.localStorage.setItem(profileStorageKey, JSON.stringify({ visitorId, categories: next, updatedAt: new Date().toISOString() }));
      return next;
    });
    trackEvent("product_view", { slug: product.slug, category: product.category, valueUsd: product.price });
  }, [trackEvent, visitorId]);

  const startCheckout = async (lines: Array<Pick<CartLine, "slug" | "quantity" | "size" | "color" | "heelHeightCm" | "offer">>, parentSessionId?: string) => {
    setCheckoutError("");
    trackEvent("checkout_start", { source: "shopping-bag", valueUsd: estimatedTotal });
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, market, promotionCode: promoCode, orderNote, visitorId, parentSessionId }),
      });
      const result = await response.json();
      if (!response.ok || !result.clientSecret) throw new Error(result.error || "Checkout is not available yet.");
      window.sessionStorage.setItem("amb-stripe-client-secret", result.clientSecret);
      window.sessionStorage.setItem("amb-stripe-session-id", result.sessionId || "");
      setCartOpen(false);
      router.push("/checkout");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout is not available yet.");
      trackEvent("checkout_error", { source: "shopping-bag", valueUsd: estimatedTotal });
    }
  };

  const checkout = () => startCheckout(cart.map(({ slug, quantity, size, color, heelHeightCm, offer }) => ({ slug, quantity, size, color, heelHeightCm, offer })));
  const buyNow: StoreContextValue["buyNow"] = async (product, options, context) => {
    if (!context?.parentSessionId) addItem(product, options);
    await startCheckout([{ slug: product.slug, quantity: options.quantity, size: options.size, color: options.color, heelHeightCm: options.heelHeightCm, offer: options.offer }], context?.parentSessionId);
  };

  const clearCart = useCallback(() => {
    setCart([]);
    setPromoCodeState("");
    setOrderNote("");
    setCartOpen(false);
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(promoStorageKey);
  }, []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const value = { catalog, cart, cartCount, cartTotal, estimatedTotal, cartOpen: drawerOpen, market, promoCode, visitorId, preferredCategories, setMarket, setPromoCode, setOrderNote, formatMoney, discount, effectiveDiscountUsd, lineOffers, hasIneligibleOfferItems, addItem, addItems, updateQuantity, removeItem, clearCart, recordProductView, trackEvent, openCart: () => { setCartOpen(true); trackEvent("cart_open", { valueUsd: estimatedTotal }); }, closeCart, checkout, buyNow, checkoutError, getProductPreparationNotice };
  return <StoreContext.Provider value={value}>{children}<CartDrawer catalog={catalog} /></StoreContext.Provider>;
}

export function getCartLineThumbnail(line: CartLine, product?: Product): { style?: CSSProperties; isSprite: boolean; hasImage: boolean } {
  const image = line.image || product?.images?.[0];
  if (!image) return { isSprite: false, hasImage: false };

  const fallbackSprite = product?.gallerySprite && product.images?.length === 1 ? product.gallerySprite : undefined;
  const columns = line.imageSpriteColumns || fallbackSprite?.columns;
  const rows = line.imageSpriteRows || fallbackSprite?.rows;
  const isSprite = Boolean(columns && rows);

  return {
    isSprite,
    hasImage: true,
    style: {
      backgroundImage: `url(${image})`,
      backgroundSize: isSprite ? `${columns! * 100}% ${rows! * 100}%` : "contain",
      backgroundPosition: "0% 0%",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#f5efe5",
      ...(isSprite ? { aspectRatio: `${line.imageViewWidth || fallbackSprite?.viewWidth || 1} / ${line.imageViewHeight || fallbackSprite?.viewHeight || 1}` } : {}),
    },
  };
}

// 17/11/2026: e-mail no carrinho, ANTES do checkout. 48 de 50 checkouts abandonados não tinham e-mail, então a
// recuperação não tinha para quem mandar. Opcional, com consentimento explícito; aplica o código de primeira compra.
function CartSaveBag() {
  const { market, promoCode, setPromoCode, visitorId } = useStore();
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  // A sacola só abre depois de interação no navegador, então ler o storage na inicialização é seguro.
  const [hidden] = useState(() => { try { return Boolean(window.localStorage.getItem("amb-bag-saved")); } catch { return false; } });
  if (hidden || promoCode.toUpperCase() === FIRST_ORDER_CODE) return null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (!data.get("emailConsent")) { setState("error"); setMessage("Tick the box so we can email your bag and code."); return; }
    setState("sending");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), emailConsent: true, market, visitorId, source: "cart-save" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPromoCode(result.code || FIRST_ORDER_CODE);
      try { window.localStorage.setItem("amb-bag-saved", new Date().toISOString()); } catch { /* sem storage */ }
      setState("done"); setMessage(`Bag saved. ${FIRST_ORDER_CODE} (10% off your first order) is applied.`);
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Please try again."); }
  }
  if (state === "done") return <p className="form-message" aria-live="polite">{message}</p>;
  return <form className="promo-entry" onSubmit={save}>
    <label htmlFor="cart-save-email">Save your bag + 10% off your first order</label>
    <div><input id="cart-save-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com"/><button type="submit" disabled={state === "sending"}>{state === "sending" ? "Saving…" : "Save"}</button></div>
    <label className="consent-check"><input name="emailConsent" type="checkbox"/> <span>Email me my bag and AMB offers. Unsubscribe anytime.</span></label>
    {state === "error" && <p className="form-message error" role="alert">{message}</p>}
  </form>;
}

function CartDrawer({ catalog }: { catalog: Product[] }) {
  const { cart, cartCount, cartTotal, estimatedTotal, cartOpen, market, promoCode, preferredCategories, formatMoney, discount, effectiveDiscountUsd, lineOffers, hasIneligibleOfferItems, setPromoCode, setOrderNote, addItem, closeCart, removeItem, updateQuantity, checkout, checkoutError } = useStore();
  const layerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const catalogBySlug = useMemo(() => new Map(catalog.map((product) => [product.slug, product])), [catalog]);

  useEffect(() => {
    if (!cartOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeCart(); return; }
      if (event.key !== "Tab") return;
      const focusable = layerRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled])");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [cartOpen, closeCart]);

  if (!cartOpen) return null;
  const shippingGap = Math.max(0, US_FREE_SHIPPING_THRESHOLD_USD - cartTotal);
  const cartProducts = cart.map((line) => catalogBySlug.get(line.slug)).filter((product): product is Product => Boolean(product));
  const rankedUpsell = rankRecommendations(catalog, cart.map((line) => line.slug), preferredCategories, cartProducts)[0];
  const upsellCandidate = rankedUpsell ? productForSize(rankedUpsell, rankedUpsell.sizes?.[0] || "One Size") : undefined;
  // approved > 0 already implies a verified cost (unknown cost => ceiling 0).
  const upsellPercent = upsellCandidate ? approvedOfferPercent(upsellCandidate, 10) : 0;
  const upsell = upsellCandidate && upsellPercent > 0 ? upsellCandidate : null;
  return <div className="cart-layer" role="dialog" aria-modal="true" aria-label="Shopping bag" ref={layerRef}>
    <button className="cart-backdrop" aria-label="Close shopping bag" onClick={closeCart}/>
    <aside className="cart-drawer">
      <div className="cart-head"><button onClick={closeCart} aria-label="Close shopping bag" ref={closeButtonRef}>×</button><strong>Your Bag</strong><span>{cartCount ? `${cartCount} item${cartCount > 1 ? "s" : ""}` : "Empty"}</span></div>
      {cart.length ? <>
        <div className="cart-lines">{cart.map((line) => {
          const lineProduct = catalogBySlug.get(line.slug);
          const preparationNotice = getPreparationNotice(lineProduct);
          const thumbnail = getCartLineThumbnail(line, lineProduct);
          const lineOffer = lineOffers[line.id];
          return <div className="cart-item" data-product-slug={line.slug} key={line.id}>
          <div className="cart-thumb"><span className={`cart-thumb-media sheet-${line.sheet} q${line.quadrant}${thumbnail.isSprite ? " sprite-media" : ""}`} style={thumbnail.style}/></div>
          <div><Link href={`/products/${line.slug}${line.heelHeightCm ? `?heel=${line.heelHeightCm}` : ""}`} onClick={closeCart}><strong>{line.name}</strong></Link><span>Size: {line.size}</span><span>Color: {line.color}</span>{preparationNotice && <span data-preparation-notice>{preparationNotice}</span>}{line.heelHeightCm ? <span>Heel: {line.heelHeightCm} cm</span> : null}{line.offer && <span className="offer-label">Private cart offer</span>}{lineOffer?.excluded && <span className="offer-excluded">Excluded from automatic offers</span>}<div className="mini-quantity"><button onClick={() => updateQuantity(line.id, line.quantity - 1)} aria-label="Decrease">−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.id, line.quantity + 1)} aria-label="Increase">+</button></div><button onClick={() => removeItem(line.id)}>Remove</button></div>
          <b>{formatMoney(line.price * line.quantity)}</b>
        </div>;
        })}</div>
        <CartRewards subtotalUsd={cartTotal} market={market} promoCode={promoCode} />
        {upsell && upsellPercent > 0 && <div className="cart-upsell"><p>ONE-TIME CART OFFER</p><strong>Complete the look and save {upsellPercent.toFixed(upsellPercent % 1 ? 1 : 0)}%</strong><div><div className={`upsell-thumb sheet-${upsell.sheet} q${upsell.quadrant}`} style={upsell.images?.[0] ? { backgroundImage: `url(${upsell.images[0]})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#f5efe5" } : undefined}/><span><strong>{upsell.name}</strong><small><del>{formatMoney(upsell.price)}</del> {formatMoney(upsell.price * (1 - upsellPercent / 100))}</small></span><button type="button" onClick={() => addItem(upsell, { size: upsell.shoeVariants?.[0]?.sizes?.[0] || upsell.sizes?.[0] || "One Size", color: upsell.colorNames?.[0] || "Selected", heelHeightCm: upsell.shoeVariants?.[0]?.heelHeightCm || upsell.heelHeightCm, quantity: 1, offer: "cart-bump" })}>Add offer</button></div><small>Margin verified. Discounts never stack; the best eligible offer wins.</small></div>}
        <div className="shipping-progress"><span>{market === "US" ? (shippingGap ? `You’re ${formatMoney(shippingGap)} away from complimentary U.S. shipping.` : "You’ve unlocked complimentary U.S. shipping.") : `Tracked delivery to ${markets[market].country} is calculated at checkout.`}</span>{market === "US" && <i><b style={{ width: `${Math.min(100, (cartTotal / US_FREE_SHIPPING_THRESHOLD_USD) * 100)}%` }}/></i>}</div>
        <div className="promo-entry"><label htmlFor="cart-code">Offer code</label><div><input id="cart-code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Enter code"/><button type="button">{promoCode ? "Applied" : "Apply"}</button></div>{promoCode && <small>{promoCode} is ready. The single best eligible discount will be used.</small>}</div>
        <label className="order-note">Add a note to your order<textarea rows={2} onChange={(event) => setOrderNote(event.target.value)}/></label>
        <div className="cart-totals"><p><span>Subtotal</span><strong>{formatMoney(cartTotal)}</strong></p>{effectiveDiscountUsd > 0 && <p className="discount-line"><span>Best eligible offer</span><strong>−{formatMoney(effectiveDiscountUsd)}</strong></p>}<p><span>Estimated total</span><strong>{formatMoney(estimatedTotal)}</strong></p><p><span>Shipping</span><span>Calculated at checkout</span></p>{hasIneligibleOfferItems && <p className="offer-excluded-note"><span>Some items in your bag are excluded from automatic offers. <Link href="/holiday" onClick={closeCart}>Shop eligible {discount.blackFriday ? "Black Friday" : "Holiday"} pieces</Link>.</span></p>}</div>
        <CartSaveBag />
        <Link className="view-bag" href="/cart" onClick={closeCart}>View Bag</Link>
        <button className="checkout-button" type="button" onClick={checkout}>Secure Checkout</button>
        {checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}
        <small>Taxes, duties and delivery are calculated at checkout.</small>
      </> : <div className="empty-cart"><h2>Your bag is empty</h2><p>Discover something beautiful from the latest AMB edit.</p><Link className="button dark" href="/collections" onClick={closeCart}>Start Shopping</Link></div>}
    </aside>
  </div>;
}
