
// example : 1000000 -> ₹10,00,000
// exmaple: XXXXX -> ₹XXXXX
export const CURRENCY_SYMBOL = "₹";

export function formatCurrency(amount: string | number | null | undefined): string {
    if (amount === null || amount === undefined || amount === "") {
        return CURRENCY_SYMBOL + "0";
    }

    let numericAmount: number;

    if (typeof amount === "number") {
        numericAmount = amount;
    } else {
        // Check for masks or non-numeric content (excluding commas, dots, and spaces)
        // If it contains letters (like 'X' for masking), return as is with symbol
        if (/[a-zA-Z]/.test(amount)) {
            return CURRENCY_SYMBOL + amount;
        }

        // Handle string inputs, removing commas/spaces if present for parsing
        const cleanAmount = amount.toString().replace(/[, ]/g, "");
        numericAmount = Number(cleanAmount);
    }

    if (isNaN(numericAmount)) {
        // Fallback if parsing failed but didn't trigger mask check
        return CURRENCY_SYMBOL + "0";
    }

    return CURRENCY_SYMBOL + numericAmount.toLocaleString("en-IN");
}