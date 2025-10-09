import { Formio } from "formiojs";
import { FrappeAPI } from "./frappeAPI";

const getBaseUrl = () => {
  return (
    // @ts-expect-error - Global variable set by Vite plugin
    window.__FORMIO_BASE_URL__ ||
    window.location?.origin ||
    "http://localhost:3000"
  );
};

// Initialize FormIO with proper error handling
try {
  const baseUrl = getBaseUrl();
  Formio.setBaseUrl(baseUrl);
  console.log("FormIO initialized with base URL:", baseUrl);
} catch (error) {
  console.error("Error initializing FormIO:", error);
  // Retry once after a short delay
  setTimeout(() => {
    try {
      const baseUrl = getBaseUrl();
      Formio.setBaseUrl(baseUrl);
      console.log("FormIO initialized (retry) with base URL:", baseUrl);
    } catch (retryError) {
      console.error("Failed to initialize FormIO on retry:", retryError);
    }
  }, 100);
}

const customProvider = {
  customBase64: function customBase64() {
    return {
      title: "CustomBase64",
      name: "customBase64",
      /**
       * Upload file to Frappe backend
       */
      uploadFile: async (file: File, fileName: string) => {
        const res = await FrappeAPI.uploadFile(file, fileName);

        if (!res || !res.file_url) {
          throw new Error("Invalid upload response");
        }

        return {
          storage: "customBase64",
          name: res.name || file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          url: res.file_url,
          data: res,
        };
      },

      /**
       * Handle file download
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadFile: async (file: any) => {
        // If backend provides a URL
        if (file.url) {
          return fetch(file.url).then((res) => res.blob());
        }
        return file;
      },
    };
  },
};

// @ts-expect-error: formiojs types issue
Formio.Providers.addProviders("storage", customProvider);
