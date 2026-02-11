
// example : 1000000 -> ₹10,00,000

export const CURRENCY_SYMBOL = "₹";
export function formatCurrency(amount: string | number): string {
    const numericAmount =
        typeof amount === "number"
            ? Math.floor(amount)
            : Math.floor(Number(amount));

    if (isNaN(numericAmount)) {
        return CURRENCY_SYMBOL + "0";
    }
    return CURRENCY_SYMBOL + numericAmount.toLocaleString("en-IN");
}