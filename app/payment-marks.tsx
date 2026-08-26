import styles from "./payment-marks.module.css";

export function PaymentMarks({ compact = false }: { compact?: boolean }) {
  return <div className={`${styles.marks}${compact ? ` ${styles.compact}` : ""}`} aria-label="Accepted payment methods">
    <span className={styles.mark} aria-label="Visa">VISA</span>
    <span className={`${styles.mark} ${styles.mastercard}`} aria-label="Mastercard"><svg viewBox="0 0 36 18" aria-hidden="true"><circle cx="13" cy="9" r="7" fill="currentColor" opacity=".72"/><circle cx="23" cy="9" r="7" fill="currentColor" opacity=".42"/></svg></span>
    <span className={styles.mark} aria-label="American Express">AMEX</span>
    <span className={`${styles.mark} ${styles.apple}`} aria-label="Apple Pay"> Pay</span>
  </div>;
}
