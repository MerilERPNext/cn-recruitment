import { useState } from "react";
import toast from "react-hot-toast";
import { useFileUpload } from "./useFrappeQuery";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UploadResponse = {
  name: string;
  file_name: string;
  file_size: string;
  file_type: string;
  file_url: string;
};

export const useFileUploader = (): {
  uploadFiles: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileObjs: any[],
    doctype?: string,
    docName?: string,
    onComplete?: () => void
  ) => Promise<UploadResponse[]>;
  loading: boolean;
} => {
  const uploadMutation = useFileUpload();
  const [loading, setLoading] = useState(false);

  const uploadFiles = async (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fileObjs: any[],
    doctype?: string,
    docName?: string,
    onComplete?: () => void
  ): Promise<UploadResponse[]> => {
    if (!fileObjs || fileObjs.length === 0) {
      onComplete?.();
      return [];
    }

    setLoading(true);

    try {
      const results = await Promise.all(
        fileObjs.map(async (fileObj) => {
          const file = fileObj.file;

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

      // remove failed (null) uploads if needed
      const successfulUploads = results.filter(
        (res): res is UploadResponse => res !== null
      );

      return successfulUploads;
    } finally {
      setLoading(false);
      onComplete?.();
    }
  };

  return { uploadFiles, loading };
};