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
      try {
        // First get the current user email/name
        const userEmail = await FrappeAPI.callMethod(
          "frappe.auth.get_logged_user"
        );

        if (!userEmail || typeof userEmail !== "string") {
          console.error("No user email found");
          return null;
        }


        // Then fetch the full user document
        const userData = await FrappeAPI.getDocument("User", userEmail, [
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


        if (!userData) {
          console.error("Failed to fetch user document");
          return null;
        }

        // Fetch user roles using safe API method that handles Administrator correctly
        const rolesData = await FrappeAPI.callMethod("recruitment.api.get_user_roles");

        // Map roles to the expected format
        const roles = Array.isArray(rolesData)
          ? rolesData.map((r: { role: string }) => ({ role: r.role }))
          : [];


        return { ...userData, roles } as CurrentUser;
      } catch (error) {
        console.error("Error fetching current user:", error);
        throw error;
      }
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
