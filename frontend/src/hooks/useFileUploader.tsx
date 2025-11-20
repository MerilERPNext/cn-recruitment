/* eslint-disable @typescript-eslint/no-explicit-any */
import { base64ToFile } from "../utils/helperUtils";
import toast from "react-hot-toast";
import { useFileUpload } from "./useFrappeQuery";

export const useFileUploader = (): {
  uploadFiles: (
    fileObjs: any[],
    doctype: string,
    docName: string,
    onComplete?: () => void
  ) => Promise<void>;
} => {
  const uploadMutation = useFileUpload();

  const uploadFiles = async (
    fileObjs: any[],
    doctype: string,
    docName: string,
    onComplete?: () => void
  ) => {
    if (!fileObjs || fileObjs.length === 0 || !doctype || !docName) {
      onComplete?.();
      return;
    }

    await Promise.all(
      fileObjs.map(async (fileObj) => {
        const file = base64ToFile(fileObj);
        try {
          const res = await uploadMutation.mutateAsync({
            file,
            doctype,
            docName,
          });
          console.log(`File "${file.name}" uploaded successfully.`);
          return res;
        } catch (err) {
          toast.error(`File "${file.name}" upload failed.`);
          console.error(err);
          return null;
        }
      })
    );

    onComplete?.();
  };

  return { uploadFiles };
};
