/**
 * Get CSRF token from various possible sources
 */

let csrfToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  try {
    if (csrfToken) return csrfToken;
    const res = await fetch('/api/method/nextai.get_csrf_token.get_csrf_token');
    const data = await res.json();
    csrfToken = data.message;
    if (!csrfToken) {
      throw new Error("CSRF token not available");
    }
    return csrfToken;
  } catch (error) {
    console.error("Error fetching CSRF token:", error);
    throw error;
  }
}

export async function refreshCsrfToken(): Promise<string | null> {
  csrfToken = null;
  return getCsrfToken();
}
