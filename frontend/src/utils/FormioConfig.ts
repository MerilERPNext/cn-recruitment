import { Formio } from "formiojs";
import FrappeAPI from "./frappeAPI";

Formio.setBaseUrl(window.location.origin);

const customProvider = {
  customBase64: function customBase64() {
    return {
      title: "CustomBase64",
      name: "customBase64",
      uploadFile: async (file: File, fileName: string) => {
        const res: any = await FrappeAPI.uploadFile(file, fileName);
        console.log({ res });
        return res.message ? res.message : "Something went wrong";
      },
      downloadFile(file: File) {
        // Return the original as there is nothing to do.
        return Promise.resolve(file);
      },
    };
  },
};

try {
  // @ts-expect-error error in formiojs types
  Formio.Providers.addProviders("storage", customProvider);
} catch (error) {
  console.log(error, "error");
}
