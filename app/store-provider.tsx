"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Product, products } from "./data";
import { FIRST_ORDER_CODE, formatMarketPrice, getDiscountState, MarketCode, markets, US_FREE_SHIPPING_THRESHOLD_USD } from "./commerce";
import { CartRewards } from "./cart-rewards";
import { rankRecommendations } from "./recommendations";
import { protectMargin } from "./profitability";

type OfferType = "cart-bump" | "post-purchase";

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
type BehaviorEvent = "product_view" | "size_guide_open" | "add_to_cart" | "cart_open" | "style_look_add" | "checkout_start";

type StoreContextValue = {
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

export function StoreProvider({ children }: { children: React.ReactNode }) {
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

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) setCart(JSON.parse(saved));
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
  }, []);

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
  useEffect(() => { document.body.style.overflow = cartOpen ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [cartOpen]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = getDiscountState(cartTotal);
  const welcomePercent = promoCode.toUpperCase() === FIRST_ORDER_CODE ? 10 : 0;
  const estimatedTotal = useMemo(() => cart.reduce((sum, line) => {
    const product = products.find((item) => item.slug === line.slug);
    const requestedPercent = Math.max(discount.percent, welcomePercent, line.offer === "cart-bump" ? 10 : 0);
    const approvedPercent = product ? protectMargin(product, requestedPercent).approvedPercent : 0;
    return sum + line.price * line.quantity * (1 - approvedPercent / 100);
  }, 0), [cart, discount.percent, welcomePercent]);
  const effectiveDiscountUsd = cartTotal - estimatedTotal;
  const formatMoney = (valueUsd: number) => formatMarketPrice(valueUsd, market);

  const trackEvent: StoreContextValue["trackEvent"] = useCallback((event, details = {}) => {
    if (!consentAllowsPersonalization() || !visitorId) return;
    void fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ event, visitorId, market, ...details }) }).catch(() => undefined);
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
        price: product.price,
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
      trackEvent("add_to_cart", { slug: product.slug, category: product.category, source: options.offer || "product", valueUsd: product.price * options.quantity });
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
      router.push("/checkout");
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout is not available yet.");
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
  const value = { cart, cartCount, cartTotal, estimatedTotal, cartOpen, market, promoCode, visitorId, preferredCategories, setMarket, setPromoCode, setOrderNote, formatMoney, discount, effectiveDiscountUsd, addItem, addItems, updateQuantity, removeItem, clearCart, recordProductView, trackEvent, openCart: () => { setCartOpen(true); trackEvent("cart_open", { valueUsd: estimatedTotal }); }, closeCart: () => setCartOpen(false), checkout, buyNow, checkoutError };
  return <StoreContext.Provider value={value}>{children}<CartDrawer /></StoreContext.Provider>;
}

function getExactCartThumbnail(line: CartLine, product?: Product): { style?: CSSProperties; isSprite: boolean } {
  const image = line.image || product?.images?.[0];
  if (!image) return { isSprite: false };

  const fallbackSprite = product?.gallerySprite && product.images?.length === 1 ? product.gallerySprite : undefined;
  const columns = line.imageSpriteColumns || fallbackSprite?.columns;
  const rows = line.imageSpriteRows || fallbackSprite?.rows;
  const isSprite = Boolean(columns && rows);

  return {
    isSprite,
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

function CartDrawer() {
  const { cart, cartCount, cartTotal, estimatedTotal, cartOpen, market, promoCode, preferredCategories, formatMoney, effectiveDiscountUsd, setPromoCode, setOrderNote, addItem, closeCart, removeItem, updateQuantity, checkout, checkoutError } = useStore();
  if (!cartOpen) return null;
  const shippingGap = Math.max(0, US_FREE_SHIPPING_THRESHOLD_USD - cartTotal);
  const cartProducts = cart.map((line) => products.find((product) => product.slug === line.slug)).filter((product): product is Product => Boolean(product));
  const upsellCandidate = rankRecommendations(products, cart.map((line) => line.slug), preferredCategories, cartProducts)[0];
  const upsellMargin = upsellCandidate ? protectMargin(upsellCandidate, 10) : null;
  const upsell = upsellCandidate && upsellMargin?.costKnown && upsellMargin.approvedPercent > 0 ? upsellCandidate : null;
  return <div className="cart-layer" role="dialog" aria-modal="true" aria-label="Shopping bag">
    <button className="cart-backdrop" aria-label="Close shopping bag" onClick={closeCart}/>
    <aside className="cart-drawer">
      <div className="cart-head"><button onClick={closeCart} aria-label="Close">×</button><strong>Your Bag</strong><span>{cartCount ? `${cartCount} item${cartCount > 1 ? "s" : ""}` : "Empty"}</span></div>
      {cart.length ? <>
        <div className="cart-lines">{cart.map((line) => {
          const lineProduct = products.find((item) => item.slug === line.slug);
          const thumbnail = getExactCartThumbnail(line, lineProduct);
          return <div className="cart-item" data-product-slug={line.slug} key={line.id}>
          <div className="cart-thumb"><span className={`cart-thumb-media sheet-${line.sheet} q${line.quadrant}${thumbnail.isSprite ? " sprite-media" : ""}`} style={thumbnail.style}/></div>
          <div><Link href={`/products/${line.slug}`} onClick={closeCart}><strong>{line.name}</strong></Link><span>Size: {line.size}</span><span>Color: {line.color}</span>{line.heelHeightCm ? <span>Heel: {line.heelHeightCm} cm</span> : null}{line.offer && <span className="offer-label">Private cart offer</span>}<div className="mini-quantity"><button onClick={() => updateQuantity(line.id, line.quantity - 1)} aria-label="Decrease">−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.id, line.quantity + 1)} aria-label="Increase">+</button></div><button onClick={() => removeItem(line.id)}>Remove</button></div>
          <b>{formatMoney(line.price * line.quantity)}</b>
        </div>;
        })}</div>
        <CartRewards subtotalUsd={cartTotal} market={market} />
        {upsell && upsellMargin && <div className="cart-upsell"><p>ONE-TIME CART OFFER</p><strong>Complete the look and save {upsellMargin.approvedPercent.toFixed(upsellMargin.approvedPercent % 1 ? 1 : 0)}%</strong><div><div className={`upsell-thumb sheet-${upsell.sheet} q${upsell.quadrant}`} style={upsell.images?.[0] ? { backgroundImage: `url(${upsell.images[0]})`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat", backgroundColor: "#f5efe5" } : undefined}/><span><strong>{upsell.name}</strong><small><del>{formatMoney(upsell.price)}</del> {formatMoney(upsell.price * (1 - upsellMargin.approvedPercent / 100))}</small></span><button type="button" onClick={() => addItem(upsell, { size: upsell.shoeVariants?.[0]?.sizes?.[0] || upsell.sizes?.[0] || "One Size", color: upsell.colorNames?.[0] || "Selected", heelHeightCm: upsell.shoeVariants?.[0]?.heelHeightCm || upsell.heelHeightCm, quantity: 1, offer: "cart-bump" })}>Add offer</button></div><small>Margin verified. Discounts never stack; the best eligible offer wins.</small></div>}
        <div className="shipping-progress"><span>{market === "US" ? (shippingGap ? `You’re ${formatMoney(shippingGap)} away from complimentary U.S. shipping.` : "You’ve unlocked complimentary U.S. shipping.") : `Tracked delivery to ${markets[market].country} is calculated at checkout.`}</span>{market === "US" && <i><b style={{ width: `${Math.min(100, (cartTotal / US_FREE_SHIPPING_THRESHOLD_USD) * 100)}%` }}/></i>}</div>
        <div className="promo-entry"><label htmlFor="cart-code">Offer code</label><div><input id="cart-code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="Enter code"/><button type="button">{promoCode ? "Applied" : "Apply"}</button></div>{promoCode && <small>{promoCode} is ready. The single best eligible discount will be used.</small>}</div>
        <label className="order-note">Add a note to your order<textarea rows={2} onChange={(event) => setOrderNote(event.target.value)}/></label>
        <div className="cart-totals"><p><span>Subtotal</span><strong>{formatMoney(cartTotal)}</strong></p>{effectiveDiscountUsd > 0 && <p className="discount-line"><span>Best eligible offer</span><strong>−{formatMoney(effectiveDiscountUsd)}</strong></p>}<p><span>Estimated total</span><strong>{formatMoney(estimatedTotal)}</strong></p><p><span>Shipping</span><span>Calculated at checkout</span></p></div>
        <Link className="view-bag" href="/cart" onClick={closeCart}>View Bag</Link>
        <button className="checkout-button" type="button" onClick={checkout}>Secure Checkout</button>
        {checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}
        <small>Taxes, duties and delivery are calculated at checkout.</small>
      </> : <div className="empty-cart"><h2>Your bag is empty</h2><p>Discover something beautiful from the latest AMB edit.</p><Link className="button dark" href="/collections" onClick={closeCart}>Start Shopping</Link></div>}
    </aside>
  </div>;
}
