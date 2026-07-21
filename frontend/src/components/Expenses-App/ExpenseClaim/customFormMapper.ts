/* eslint-disable @typescript-eslint/no-explicit-any */

const EXPENSE_ATTACHMENT_FILE_PATTERN =
  ".pdf,.doc,.docx,.jpg,.jpeg,.png,.csv,.xls,.xlsx";

const mergeFilePatterns = (...patterns: Array<string | undefined>) => {
  const extensions = patterns
    .flatMap((pattern) => (pattern || "").split(","))
    .map((extension) => extension.trim())
    .filter(Boolean);

  return Array.from(new Set(extensions)).join(",");
};

const buildLabel = (label?: string) => {
  if (!label) return "";
  return label;
};

export const processCustomComponents = (comps: any[]): any[] => {
  return comps
    .filter(
      (c: any) =>
        !(c.type === "button" && (!c.action || c.action === "submit")),
    )
    .map((c: any) => {
      const next = { ...c };

      if (next.label && next.validate?.required) {
        next.label = buildLabel(next.label);
      }

      if (next.type === "file") {
        next.multiple = true;
        // Keep parity with V1 behavior for custom Form.io file fields.
        next.storage = "customfiles";
        next.filePattern = mergeFilePatterns(
          next.filePattern,
          EXPENSE_ATTACHMENT_FILE_PATTERN,
        );
      }

      if (next.type === "datetime") {
        next.format = "dd-MM-yyyy";
        if (!next.placeholder) {
          next.placeholder = "dd-mm-yyyy";
        }
      }

      if (Array.isArray(next.components)) {
        next.components = processCustomComponents(next.components);
      }

      if (Array.isArray(next.columns)) {
        next.columns = next.columns.map((col: any) => ({
          ...col,
          components: processCustomComponents(col.components || []),
        }));
      }

      return next;
    });
};

export const getCustomFormComponents = (customFormData: any): any[] => {
  if (!customFormData) return [];

  try {
    const parsed =
      typeof customFormData === "string"
        ? JSON.parse(customFormData)
        : customFormData;

    if (!parsed || !Array.isArray(parsed.components)) return [];

    return processCustomComponents(parsed.components);
  } catch (e) {
    console.error("Failed to parse custom_form_data:", e);
    return [];
  }
};
