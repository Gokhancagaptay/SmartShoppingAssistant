/** Sepet ve ödeme ekranlarında paylaşılan teslimat kuralları (tek kaynak). */
export const ORDER_RULES = {
  FREE_SHIPPING_THRESHOLD_TL: 200,
  STANDARD_SHIPPING_FEE_TL: 29.9,
} as const

export function shippingFeeTl(subtotal: number): number {
  return subtotal > ORDER_RULES.FREE_SHIPPING_THRESHOLD_TL
    ? 0
    : ORDER_RULES.STANDARD_SHIPPING_FEE_TL
}
