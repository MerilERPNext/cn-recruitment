import { Formio } from "formiojs";
import { FrappeAPI } from "./frappeAPI";

Formio.setBaseUrl(window.location.origin);

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
