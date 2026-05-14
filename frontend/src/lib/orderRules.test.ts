import { describe, it, expect } from 'vitest'
import { ORDER_RULES, shippingFeeTl } from './orderRules'

describe('shippingFeeTl', () => {
  it('ücretsiz kargo eşiğinin üzerinde 0 döner', () => {
    expect(shippingFeeTl(ORDER_RULES.FREE_SHIPPING_THRESHOLD_TL + 1)).toBe(0)
  })

  it('eşik altında standart ücret döner', () => {
    expect(shippingFeeTl(50)).toBe(ORDER_RULES.STANDARD_SHIPPING_FEE_TL)
  })
})
