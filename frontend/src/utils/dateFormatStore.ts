/**
 * dateFormatStore.ts
 *
 * Module-level singleton that holds the active date format fetched from the
 * backend system-settings API.  Components and utilities read the format
 * through `getDateFormat()` so that every call automatically uses whatever
 * the admin has configured.
 *
 * Supported formats (must match the API's `options` list):
 *   "yyyy-mm-dd" | "dd-mm-yyyy" | "dd/mm/yyyy" |
 *   "dd.mm.yyyy" | "mm/dd/yyyy" | "mm-dd-yyyy"
 */

const DATE_FORMAT_API =
  "/api/method/recruitment.api.system_format_options.get_date_format_options";

export type SupportedDateFormat =
  | "yyyy-mm-dd"
  | "dd-mm-yyyy"
  | "dd/mm/yyyy"
  | "dd.mm.yyyy"
  | "mm/dd/yyyy"
  | "mm-dd-yyyy";

export const SUPPORTED_DATE_FORMATS: SupportedDateFormat[] = [
  "yyyy-mm-dd",
  "dd-mm-yyyy",
  "dd/mm/yyyy",
  "dd.mm.yyyy",
  "mm/dd/yyyy",
  "mm-dd-yyyy",
];

export const FALLBACK_DATE_FORMAT: SupportedDateFormat = "dd-mm-yyyy";

let currentDateFormat: SupportedDateFormat = FALLBACK_DATE_FORMAT;
let _initialized = false;

export const getDateFormat = (): SupportedDateFormat => currentDateFormat;

/**
 * Manually override the date format (useful for settings pages / tests).
 * If the provided value is not in the supported list the call is ignored.
 */
export const setDateFormat = (format: string): void => {
  if (SUPPORTED_DATE_FORMATS.includes(format as SupportedDateFormat)) {
    currentDateFormat = format as SupportedDateFormat;
  } else {
    console.warn(
      `[dateFormatStore] Unsupported format "${format}". ` +
        `Supported: ${SUPPORTED_DATE_FORMATS.join(", ")}`,
    );
  }
};

/**
 * Fetches the date format from the backend and stores it.
 * Safe to call multiple times — subsequent calls are no-ops once initialised.
 * Call this once at application boot (e.g. in App.tsx or main.tsx).
 */
export const initializeDateFormat = async (): Promise<void> => {
  if (_initialized) return;

  try {
    const response = await fetch(DATE_FORMAT_API, {
      credentials: "include",
    });

    if (!response.ok) {
      console.warn(
        `[dateFormatStore] API returned ${response.status}. Falling back to "${FALLBACK_DATE_FORMAT}".`,
      );
      return;
    }

    const json = await response.json();
    const defaultFormat: string = json?.message?.default;

    if (
      defaultFormat &&
      SUPPORTED_DATE_FORMATS.includes(defaultFormat as SupportedDateFormat)
    ) {
      currentDateFormat = defaultFormat as SupportedDateFormat;
    } else {
      console.warn(
        `[dateFormatStore] Received unsupported format "${defaultFormat}". Falling back to "${FALLBACK_DATE_FORMAT}".`,
      );
    }
  } catch (err) {
    console.warn(
      `[dateFormatStore] Failed to fetch date format. Falling back to "${FALLBACK_DATE_FORMAT}".`,
      err,
    );
  } finally {
    _initialized = true;
  }
};

/** Reset store (for testing purposes only). */
export const _resetDateFormatStore = (): void => {
  currentDateFormat = FALLBACK_DATE_FORMAT;
  _initialized = false;
};
