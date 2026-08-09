"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { Product, products } from "./data";
import { formatMarketPrice, getDiscountState, MarketCode, markets } from "./commerce";
import { CartRewards } from "./cart-rewards";

export type CartLine = {
  id: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: string;
  sheet: Product["sheet"];
  quadrant: Product["quadrant"];
};

type StoreContextValue = {
  cart: CartLine[];
  cartCount: number;
  cartTotal: number;
  cartOpen: boolean;
  market: MarketCode;
  setMarket: (market: MarketCode) => void;
  formatMoney: (valueUsd: number) => string;
  discount: ReturnType<typeof getDiscountState>;
  addItem: (product: Product, options: { size: string; color: string; quantity: number }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  openCart: () => void;
  closeCart: () => void;
  checkout: () => Promise<void>;
  buyNow: (product: Product, options: { size: string; color: string; quantity: number }) => Promise<void>;
  checkoutError: string;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const storageKey = "amb-boutique-cart-v1";
const marketStorageKey = "amb-boutique-market-v1";

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [market, setMarket] = useState<MarketCode>("US");
  const [checkoutError, setCheckoutError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) setCart(JSON.parse(saved));
        const savedMarket = window.localStorage.getItem(marketStorageKey);
        if (savedMarket && savedMarket in markets) setMarket(savedMarket as MarketCode);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(marketStorageKey, market);
  }, [market, hydrated]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const discount = getDiscountState(cartTotal);
  const formatMoney = (valueUsd: number) => formatMarketPrice(valueUsd, market);

  const addItem: StoreContextValue["addItem"] = (product, options) => {
    const id = `${product.slug}:${options.size}:${options.color}`;
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (existing) return current.map((line) => line.id === id ? { ...line, quantity: line.quantity + options.quantity } : line);
      return [...current, { id, slug: product.slug, name: product.name, price: product.price, quantity: options.quantity, size: options.size, color: options.color, sheet: product.sheet, quadrant: product.quadrant }];
    });
    setCheckoutError("");
    setCartOpen(true);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return setCart((current) => current.filter((line) => line.id !== id));
    setCart((current) => current.map((line) => line.id === id ? { ...line, quantity } : line));
  };

  const removeItem = (id: string) => setCart((current) => current.filter((line) => line.id !== id));

  const startCheckout = async (lines: Array<Pick<CartLine, "slug" | "quantity" | "size" | "color">>) => {
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, market }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "Checkout is not available yet.");
      window.location.assign(result.url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout is not available yet.");
    }
  };

  const checkout = () => startCheckout(cart.map(({ slug, quantity, size, color }) => ({ slug, quantity, size, color })));
  const buyNow: StoreContextValue["buyNow"] = async (product, options) => {
    addItem(product, options);
    await startCheckout([{ slug: product.slug, quantity: options.quantity, size: options.size, color: options.color }]);
  };

  const value = { cart, cartCount, cartTotal, cartOpen, market, setMarket, formatMoney, discount, addItem, updateQuantity, removeItem, openCart: () => setCartOpen(true), closeCart: () => setCartOpen(false), checkout, buyNow, checkoutError };

  return <StoreContext.Provider value={value}>{children}<CartDrawer /></StoreContext.Provider>;
}

function CartDrawer() {
  const { cart, cartCount, cartTotal, cartOpen, market, formatMoney, discount, addItem, closeCart, removeItem, checkout, checkoutError } = useStore();
  if (!cartOpen) return null;
  const shippingGap = Math.max(0, 150 - cartTotal);
  const upsell = products.find((product) => !cart.some((line) => line.slug === product.slug));

  return <div className="cart-layer" role="dialog" aria-modal="true" aria-label="Shopping bag">
    <button className="cart-backdrop" aria-label="Close shopping bag" onClick={closeCart}/>
    <aside className="cart-drawer">
      <div className="cart-head"><button onClick={closeCart} aria-label="Close">×</button><strong>Your Bag</strong><span>{cartCount ? `${cartCount} item${cartCount > 1 ? "s" : ""}` : "Empty"}</span></div>
      {cart.length ? <>
        <div className="cart-lines">{cart.map((line) => <div className="cart-item" key={line.id}>
          <div className={`cart-thumb sheet-${line.sheet} q${line.quadrant}`}/>
          <div><Link href={`/products/${line.slug}`} onClick={closeCart}><strong>{line.name}</strong></Link><span>Size: {line.size}</span><span>Color: {line.color}</span><span>Qty: {line.quantity}</span><button onClick={() => removeItem(line.id)}>Remove</button></div>
          <b>{formatMoney(line.price * line.quantity)}</b>
        </div>)}</div>
        <CartRewards subtotalUsd={cartTotal} market={market} />
        {upsell && <div className="cart-upsell"><p>COMPLETE YOUR LOOK</p><div><div className={`upsell-thumb sheet-${upsell.sheet} q${upsell.quadrant}`} style={upsell.images?.[0] ? { backgroundImage: `url(${upsell.images[0]})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}/><span><strong>{upsell.name}</strong><small>{formatMoney(upsell.price)}</small></span><button type="button" onClick={() => addItem(upsell, { size: upsell.sizes?.[0] || "One Size", color: upsell.colorNames?.[0] || "Selected", quantity: 1 })}>Quick add</button></div></div>}
        <div className="shipping-progress"><span>{market === "US" ? (shippingGap ? `You’re ${formatMoney(shippingGap)} away from complimentary U.S. shipping.` : "You’ve unlocked complimentary U.S. shipping.") : `International delivery to ${markets[market].country} is calculated at checkout.`}</span>{market === "US" && <i><b style={{ width: `${Math.min(100, (cartTotal / 150) * 100)}%` }}/></i>}</div>
        <label className="order-note">Add a note to your order<textarea rows={2}/></label>
        <div className="cart-totals"><p><span>Subtotal</span><strong>{formatMoney(cartTotal)}</strong></p>{discount.percent > 0 && <p className="discount-line"><span>Automatic reward ({discount.percent}%)</span><strong>−{formatMoney(discount.discountUsd)}</strong></p>}<p><span>Estimated total</span><strong>{formatMoney(discount.totalUsd)}</strong></p><p><span>Shipping</span><span>Calculated at checkout</span></p></div>
        <Link className="view-bag" href="/cart" onClick={closeCart}>View Bag</Link>
        <button className="checkout-button" type="button" onClick={checkout}>Secure Checkout</button>
        {checkoutError && <p className="form-message error" role="alert">{checkoutError}</p>}
        <small>Taxes, duties and delivery are calculated at checkout.</small>
      </> : <div className="empty-cart"><h2>Your bag is empty</h2><p>Discover something beautiful from the latest AMB edit.</p><Link className="button dark" href="/collections" onClick={closeCart}>Start Shopping</Link></div>}
    </aside>
  </div>;
}
