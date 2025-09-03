/**
 * Override Formio configs to take into effect globally across application
 */

import { Formio } from '@formio/js';
import FrappeAPI from './frappeAPI';
// @ts-ignore
import tailwind from '@tsed/tailwind-formio';



Formio.setBaseUrl(window.location.origin);

const customProvider = {
  customBase64: function customBase64() {
    return {
      title: 'CustomBase64',
      name: 'customBase64',
      uploadFile: async (file: any, fileName: any) => {
        const formData = new FormData();
        formData.set("file", file)
        formData.set("filename", fileName)
        const res = await FrappeAPI.callMethod("upload_file", formData)
        if (res.message) {
          res.message.size = res.message.file_size;
        }
        return res.message ? res.message : 'Something went wrong';
      },
      downloadFile(file: any) {
        // Return the original as there is nothing to do.
        return Promise.resolve(file);
      },
    };
  },
};

Formio.Providers.addProviders('storage', customProvider);
