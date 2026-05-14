/// Web [frontend/src/lib/orderRules.ts] ile aynı teslimat kuralları.
abstract class OrderRules {
  static const double freeShippingThresholdTl = 200;
  static const double standardShippingFeeTl = 29.9;

  static double shippingFeeTl(double subtotal) {
    return subtotal > freeShippingThresholdTl ? 0 : standardShippingFeeTl;
  }
}
