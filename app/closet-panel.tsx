"use client";

import Image from "next/image";
import Link from "next/link";
import { getDirectProductImage } from "./components";
import { BODY_SHAPE_META, formatHeightImperial, kgToLb } from "./fit-engine";
import { useFitProfile } from "./fit-profile";
import { useSavedItems } from "./saved-items";
import { useStore } from "./store-provider";

export function ClosetPanel() {
  const { profile, clearProfile } = useFitProfile();
  const { saved } = useSavedItems();
  const { catalog, cartCount, openCart, formatMoney } = useStore();

  const savedProducts = saved
    .map((slug) => catalog.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="closet-hub">
      <section className="closet-card">
        <div className="closet-card-head">
          <div>
            <p className="eyebrow">PRIVATE FIT PROFILE</p>
            <h2>Your Saved Sizing</h2>
          </div>
          <Link className="button dark" href="/fit-finder">
            {profile ? "Update in Fit Studio" : "Create Fit Profile"}
          </Link>
        </div>

        {profile ? (
          <>
            <div className="closet-metrics">
              <div>
                <span>Height</span>
                <strong>{formatHeightImperial(profile.heightCm)} ({profile.heightCm} cm)</strong>
              </div>
              <div>
                <span>Usual Size</span>
                <strong>{profile.usualSystem === "ALPHA" ? profile.usualSize : `${profile.usualSystem} ${profile.usualSize}`}</strong>
              </div>
              <div>
                <span>Proportions</span>
                <strong>{BODY_SHAPE_META[profile.bodyShape].label}</strong>
              </div>
              <div>
                <span>Fit Feel</span>
                <strong>{profile.fitPreference === "sculpted" ? "Close & Sculpted" : profile.fitPreference === "relaxed" ? "Easy Movement" : "True to Size"}</strong>
              </div>
              {profile.mode === "quick" ? (
                <div>
                  <span>Weight</span>
                  <strong>{kgToLb(profile.weightKg)} lb ({Math.round(profile.weightKg)} kg)</strong>
                </div>
              ) : (
                <div>
                  <span>Measurements</span>
                  <strong>{profile.bustIn}&quot; / {profile.waistIn}&quot; / {profile.hipIn}&quot;</strong>
                </div>
              )}
            </div>
            <p className="closet-note">
              Your profile stays strictly in this browser and automatically highlights your best size across every AMB dress, set and top.
            </p>
            <button type="button" className="fit-reset-link" onClick={clearProfile}>
              Clear saved profile from this device
            </button>
          </>
        ) : (
          <p className="closet-note">
            Set up your 20-second Fit Profile once — no measuring tape required — to unlock personalized size recommendations, hemline height previews, and body-shape curation across all AMB pieces.
          </p>
        )}
      </section>

      <section className="closet-card">
        <div className="closet-card-head">
          <div>
            <p className="eyebrow">SAVED WARDROBE</p>
            <h2>Saved Pieces ({savedProducts.length})</h2>
          </div>
          <Link className="button outline" href="/saved">
            {savedProducts.length >= 2 ? "Compare Side by Side" : "Open Saved"}
          </Link>
        </div>

        {savedProducts.length > 0 ? (
          <div className="closet-saved-strip">
            {savedProducts.slice(0, 4).map((item) => {
              const img = getDirectProductImage(item, 0);
              return (
                <Link key={item.slug} href={`/products/${item.slug}`} className="closet-mini-piece">
                  <span className="closet-mini-photo">
                    {img && <Image src={img} alt={item.name} fill sizes="120px" />}
                  </span>
                  <strong>{item.name}</strong>
                  <small>{formatMoney(item.price)}</small>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="closet-note">
            Tap <strong>Save</strong> on any piece while browsing to build your shortlist and compare silhouettes side by side.
          </p>
        )}
      </section>

      <section className="closet-grid-actions">
        <div className="closet-card">
          <p className="eyebrow">ORDERS &amp; DELIVERY</p>
          <h3>Track an Existing Order</h3>
          <p className="closet-note">
            Guest checkout means no password needed — look up any AMB order directly with your order number and checkout email.
          </p>
          <Link className="button dark" href="/track-order">Track My Order</Link>
        </div>

        <div className="closet-card">
          <p className="eyebrow">SHOPPING BAG</p>
          <h3>{cartCount > 0 ? `${cartCount} piece${cartCount === 1 ? "" : "s"} in your bag` : "Your bag is ready"}</h3>
          <p className="closet-note">
            Automatic seasonal offers and U.S. complimentary shipping ($99+) calculate live inside your bag before Stripe checkout.
          </p>
          <div className="closet-inline-links">
            <button type="button" className="button outline" onClick={openCart}>Open Bag</button>
            <Link className="button dark" href="/holiday">Shop the Holiday Edit</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
