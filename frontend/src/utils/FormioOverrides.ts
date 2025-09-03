/**
 * Override Formio configs to take into effect globally across application
 */

import { Formio } from "@formio/js";
import FrappeAPI from "./frappeAPI";

Formio.setBaseUrl(window.location.origin);

const customProvider = {
  customBase64: function customBase64() {
    return {
      title: "CustomBase64",
      name: "customBase64",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      uploadFile: async (file: any, fileName: any) => {
        const formData = new FormData();
        formData.set("file", file);
        formData.set("filename", fileName);
        const res = (await FrappeAPI.callMethod(
          "upload_file",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formData as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        )) as any;
        if (res.message) {
          res.message.size = res.message.file_size;
        }
        return res.message ? res.message : "Something went wrong";
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadFile(file: any) {
        // Return the original as there is nothing to do.
        return Promise.resolve(file);
      },
    };
  },
};

Formio.Providers.addProviders("storage", customProvider);
