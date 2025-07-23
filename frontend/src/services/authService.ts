import FrappeAPI from "../utils/frappeAPI";

export const authService = {
  getLoggedInUser: async (): Promise<string> => {
    const response = await FrappeAPI.callMethod("frappe.auth.get_logged_user");
    if (!response) throw new Error("Failed to fetch logged-in user");
    return response as string;
  },
};
