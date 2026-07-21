/* eslint-disable @typescript-eslint/no-explicit-any */
export const extractFileComponents = (components: any[]): any[] => {
  let files: any[] = [];
  components.forEach((c) => {
    if (c.type === "file") files.push(c);
    if (Array.isArray(c.components))
      files = [...files, ...extractFileComponents(c.components)];
    if (Array.isArray(c.columns)) {
      c.columns.forEach((col: any) => {
        if (Array.isArray(col.components))
          files = [...files, ...extractFileComponents(col.components)];
      });
    }
  });
  return files;
};

export const getCustomFileComponents = (customData: unknown): any[] => {
  if (!customData) return [];
  try {
    const parsed =
      typeof customData === "string" ? JSON.parse(customData) : customData;
    if (!parsed || !Array.isArray(parsed.components)) return [];

    return extractFileComponents(parsed.components);
  } catch (e) {
    console.error("Failed to parse custom_form_data for file search", e);
    return [];
  }
};

export const getHiddenFileListKeys = (
  customFileComponents: any[],
  hasAttachReceiptField: boolean,
): string[] => {
  const keys = customFileComponents.map((comp: any) => String(comp.key));
  if (hasAttachReceiptField) {
    keys.push("attach_receipt");
  }
  return Array.from(new Set(keys));
};

export const extractPendingCustomFiles = (
  customFileKeys: string[],
  dynamicFormData: Record<string, any>,
) => {
  const filesToUpload: any[] = [];
  const fileKeyMap: Record<number, { key: string; index: number }> = {};

  customFileKeys.forEach((key) => {
    const val = dynamicFormData[key];
    const files = Array.isArray(val) ? val : val ? [val] : [];
    files.forEach((f: any, idx: number) => {
      if (f && f.file && !f.url && !f.file_url) {
        fileKeyMap[filesToUpload.length] = { key, index: idx };
        filesToUpload.push(f);
      }
    });
  });

  return { filesToUpload, fileKeyMap };
};

export const applyUploadedUrlsToFormData = (
  fileKeyMap: Record<number, { key: string; index: number }>,
  uploadedUrls: string[],
  dynamicFormData: Record<string, any>,
) => {
  const newData = { ...dynamicFormData };

  Object.entries(fileKeyMap).forEach(([uploadIndexStr, mapInfo]) => {
    const uploadIndex = Number(uploadIndexStr);
    const { key, index: arrIndex } = mapInfo;

    const val = newData[key];
    const files = Array.isArray(val) ? [...val] : val ? [val] : [];
    const url = uploadedUrls[uploadIndex];

    if (files[arrIndex] && url) {
      files[arrIndex] = {
        ...files[arrIndex],
        url,
        file_url: url,
        storage: "url",
      };
      delete files[arrIndex].file;
    }

    newData[key] = files;
  });

  return newData;
};
