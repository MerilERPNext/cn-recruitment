/**
 * Extracts the file name from a URL or file path.
 *
 * Examples:
 * - "/private/files/39.tyre-hotel-fattura (1).pdf"
 *   => "39.tyre-hotel-fattura (1).pdf"
 * - "https://example.com/example.com/files/39.tyre-hotel-fattura (1).pdf"
 *   => "39.tyre-hotel-fattura (1).pdf"
 *
 * @param url - A file URL or path.
 * @returns The file name, or an empty string if the input is invalid.
 */
export const getFileNameFromUrl = (url: string): string => {
    if (!url) return "";

    const fileName = url.split("/").pop();
    return fileName ?? "";
};