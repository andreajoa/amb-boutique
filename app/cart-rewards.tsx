import { discountTiers, formatMarketPrice, getDiscountState, MarketCode } from "./commerce";

export function CartRewards({ subtotalUsd, market }: { subtotalUsd: number; market: MarketCode }) {
  const reward = getDiscountState(subtotalUsd);
  const money = (value: number) => formatMarketPrice(value, market);

  return (
    <section className="cart-rewards" aria-label="Automatic cart rewards">
      <p>AMB CART REWARDS</p>
      <strong>{reward.next
        ? reward.percent
          ? `${reward.percent}% off unlocked · add ${money(reward.amountToNextUsd)} for ${reward.next.percent}% off`
          : `Add ${money(reward.amountToNextUsd)} to unlock 5% off`
        : "You unlocked the maximum 25% off"
      }</strong>
      <div className="reward-track" aria-label={`${Math.round(reward.progress)}% toward the maximum reward`}>
        <i style={{ width: `${reward.progress}%` }} />
        {discountTiers.map((tier) => <span key={tier.threshold} className={subtotalUsd >= tier.threshold ? "earned" : ""} style={{ left: `${(tier.threshold / 500) * 100}%` }} />)}
      </div>
      <div className="reward-labels">{discountTiers.map((tier) => <span key={tier.threshold}><b>{tier.percent}%</b><small>{money(tier.threshold)}</small></span>)}</div>
      <small>Discount is applied automatically and cannot be combined with another offer.</small>
    </section>
  );
}
