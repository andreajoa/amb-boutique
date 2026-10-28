import { formatMarketPrice, getDiscountState, MarketCode } from "./commerce";

export function CartRewards({ subtotalUsd, market, promoCode }: { subtotalUsd: number; market: MarketCode; promoCode?: string }) {
  const reward = getDiscountState(subtotalUsd, Date.now(), promoCode);
  const tiers = reward.tiers;
  const top = tiers.at(-1)!;
  const money = (value: number) => formatMarketPrice(value, market);

  return (
    <section className="cart-rewards" aria-label="Automatic cart rewards">
      <p>{reward.blackFriday ? "BLACK FRIDAY · 20% OFF OUR REGULAR PRICES" : "AMB CART REWARDS"}</p>
      <strong>{reward.next
        ? reward.percent
          ? `${reward.percent}% off unlocked · add ${money(reward.amountToNextUsd)} for ${reward.next.percent}% off`
          : `Add ${money(reward.amountToNextUsd)} to unlock ${tiers[0].percent}% off`
        : `You unlocked the maximum ${top.percent}% off`
      }</strong>
      <div className="reward-track" aria-label={`${Math.round(reward.progress)}% toward the maximum reward`}>
        <i style={{ width: `${reward.progress}%` }} />
        {tiers.map((tier) => <span key={tier.threshold} className={subtotalUsd >= tier.threshold ? "earned" : ""} style={{ left: `${(tier.threshold / top.threshold) * 100}%` }} />)}
      </div>
      <div className="reward-labels">{tiers.map((tier) => <span key={tier.threshold}><b>{tier.percent}%</b><small>{money(tier.threshold)}</small></span>)}</div>
      <small>Applied automatically to eligible styles and cannot be combined with another offer.</small>
    </section>
  );
}
