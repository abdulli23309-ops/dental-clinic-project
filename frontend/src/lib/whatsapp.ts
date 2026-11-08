/**
 * WhatsApp integration helpers.
 * Generates direct chat links formatted for WhatsApp Web and mobile apps.
 */

/**
 * Builds a WhatsApp deep link formatted for mobile apps and WhatsApp Web.
 * Strips non-digits, converts leading 0 to 92 for Pakistan phone numbers,
 * and attaches an optional prefilled message.
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  // Convert leading 0 (e.g. 0300 1234567) to Pakistan country code 92
  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  }

  const base = `https://wa.me/${digits}`;
  if (message && message.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}
