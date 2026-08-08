import { CURRENCY_SYMBOL } from "@/config/region";

export function formatMoney(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${CURRENCY_SYMBOL} ${value.toFixed(0)}`;
}
