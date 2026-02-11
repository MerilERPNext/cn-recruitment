import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { FrappeAPI } from "../utils/frappeAPI";

// User interface based on Frappe User DocType
export interface CurrentUser {
  name: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  username?: string;
  user_image?: string;
  mobile_no?: string;
  phone?: string;
  user_type?: string;
  enabled?: boolean;
  roles?: { role: string }[];
}

// Hook to get current logged-in user data
export const useCurrentUser = (): UseQueryResult<CurrentUser | null, Error> => {
  return useQuery<CurrentUser | null, Error>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      // First check if the user is logged in — this is the auth gate
      const userEmail = await FrappeAPI.callMethod(
        "frappe.auth.get_logged_user"
      );

      if (!userEmail || typeof userEmail !== "string") {
        return null;
      }

      // User is authenticated. Fetch supplementary data but don't fail
      // the auth check if these calls lack permissions (e.g. Website Users).
      let userData: Record<string, unknown> = { name: userEmail, email: userEmail };
      try {
        const doc = await FrappeAPI.getDocument("User", userEmail, [
          "name",
          "email",
          "first_name",
          "last_name",
          "full_name",
          "username",
          "user_image",
          "mobile_no",
          "phone",
          "user_type",
          "enabled",
        ]);
        if (doc) {
          userData = doc as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("Could not fetch user document, using basic user info:", error);
      }

      let roles: { role: string }[] = [];
      try {
        const rolesData = await FrappeAPI.callMethod("recruitment.api.get_user_roles");
        roles = Array.isArray(rolesData)
          ? rolesData.map((r: { role: string }) => ({ role: r.role }))
          : [];
      } catch (error) {
        console.warn("Could not fetch user roles:", error);
      }

      return { ...userData, roles } as CurrentUser;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

/**
 * Helper function to check if a user has admin roles (System Manager or Administrator)
 */
export const isAdminUser = (user: CurrentUser | null): boolean => {
  return (
    user?.roles?.some((role) =>
      ["System Manager", "Administrator"].includes(role.role)
    ) ?? false
  );
};

/**
 * Helper function to check if a user is an HD Agent (HelpDesk Agent)
 * HD Agents have access to admin features in HelpDesk module
 */
export const isHDAgent = (user: CurrentUser | null): boolean => {
  return (
    user?.roles?.some((role) =>
      ["HD Agent", "HD Manager", "System Manager", "Administrator"].includes(role.role)
    ) ?? false
  );
};

export default useCurrentUser;
