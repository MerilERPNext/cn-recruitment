import { Formio } from "formiojs";
import { FrappeAPI } from "./frappeAPI";

if (typeof window !== "undefined") {
  const baseUrl = window.location.origin;
  try {
    // Ensure Form.io always initializes with our host origin and has a CDN object defined.
    Formio.setBaseUrl(baseUrl);

    const formioAny = Formio as unknown as {
      GlobalFormio?: typeof Formio;
      cdn?: { baseUrl?: string; setBaseUrl?: (url: string) => void };
    };

    const globalFormio =
      (formioAny.GlobalFormio as typeof Formio | undefined) ?? Formio;
    const globalFormioAny = globalFormio as unknown as {
      cdn?: { baseUrl?: string; setBaseUrl?: (url: string) => void };
    };
    const cdnInstance = globalFormioAny.cdn ?? formioAny.cdn;

    if (!globalFormioAny.cdn && cdnInstance) {
      globalFormioAny.cdn = cdnInstance;
    }

    if (cdnInstance?.setBaseUrl) {
      cdnInstance.setBaseUrl(baseUrl);
    } else if (cdnInstance) {
      cdnInstance.baseUrl = baseUrl;
    }
  } catch (error) {
    console.error("Error configuring Formio CDN base URL:", error);
  }
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
