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
}

// Hook to get current logged-in user data
export const useCurrentUser = (): UseQueryResult<CurrentUser | null, Error> => {
  return useQuery<CurrentUser | null, Error>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      try {
        console.log("Fetching current user data...");
        
        // First get the current user email/name
        const userEmail = await FrappeAPI.callMethod("frappe.auth.get_logged_user");
        
        if (!userEmail || typeof userEmail !== 'string') {
          console.error("No user email found");
          return null;
        }
        
        console.log("Current user email:", userEmail);
        
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
          "enabled"
        ]);
        
        console.log("Fetched user data:", userData);
        
        if (!userData) {
          console.error("Failed to fetch user document");
          return null;
        }
        
        return userData as CurrentUser;
        
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

export default useCurrentUser;
