import FrappeAPI from "../utils/frappeAPI";
import { ImpersonationSettings } from "../types/impersonationSettings";

export const impersonationService = {
  getImpersonationSettings: async (): Promise<ImpersonationSettings | null> => {
    try {
      const res = (await FrappeAPI.getDocument(
        "Impersonation Settings",
        "Impersonation Settings",
        ["show_dashboard", "show_todo"]
      )) as ImpersonationSettings | undefined;
      return res || null;
    } catch (error) {
      console.error("📡 Error while reading Impersonation Settings:", error);
      return null;
    }
  },
};
