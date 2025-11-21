import { useState } from "react";
import toast from "react-hot-toast";
import { useFileUpload } from "./useFrappeQuery";

export const useFileUploader = (): {
  uploadFiles: (
    fileObjs: any[],
    doctype: string,
    docName: string,
    onComplete?: () => void
  ) => Promise<void>;
  loading: boolean;
} => {
  const uploadMutation = useFileUpload();
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      await Promise.all(
        fileObjs.map(async (fileObj) => {
          const file = fileObj.file; // <-- GET THE REAL FILE

          if (!file) {
            console.error("No file object inside Form.io fileObj:", fileObj);
            return null;
          }
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
    } finally {
      setLoading(false);
      onComplete?.();
    }
  };

  return { uploadFiles, loading };
};
