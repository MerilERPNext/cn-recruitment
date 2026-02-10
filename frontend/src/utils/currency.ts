export function RupeeSymbolPerfix( amount : string | number ): string{
    return "₹" + amount.toString();
}