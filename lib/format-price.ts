/** 120 -> "₹120", 99.5 -> "₹99.50". */
export function formatPrice(price: number) {
  return Number.isInteger(price) ? `₹${price}` : `₹${price.toFixed(2)}`;
}
