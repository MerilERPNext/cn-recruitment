import React, { useMemo, useLayoutEffect } from "react";
import { Form } from "@tsed/react-formio";
import { FormIOForm, getFileComponents, buildFormFromSchemaAndAnswer } from "../../../utils/flowUtils";
import { FormioPreviewItem, FormioPreviewPortal } from "./FormioPreview";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FormPreviewProps {
  /** Unique ID used as the container element id — must be unique per page. */
  containerId: string;
  /** The Formio schema (components array wrapper). */
  schema: FormIOForm;
  /** Submission data keyed by component key. */
  submissionData: Record<string, unknown>;
  /** When true, file attachment previews will hide the remove button. Defaults to true. */
  readOnly?: boolean;
  /** Optional callback when a file is removed (only relevant when readOnly is false). */
  onRemoveFile?: (compKey: string, index: number) => void;
  /** Optional extra className on the wrapper div. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Global style injection (runs once)                                 */
/* ------------------------------------------------------------------ */

const GLOBAL_STYLE_ID = "formpreview-hide-native-files";

/**
 * Injects a single global CSS rule that hides the native Formio file list
 * on any container with the `formio-hide-attachment` class.
 * Runs synchronously via useLayoutEffect so the rule is in place
 * **before** the browser paints — eliminating the flicker.
 */
function useHideNativeFileList() {
  useLayoutEffect(() => {
    if (document.getElementById(GLOBAL_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = GLOBAL_STYLE_ID;
    style.textContent = `
      .formio-hide-attachment .formio-component-file .list-group {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    // Intentionally never removed — lightweight global rule needed app-wide.
  }, []);
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Click the native Formio "remove" button for a given file component + index.
 * This is the same approach used across HelpDesk forms.
 */
const clickNativeRemoveButton = (formId: string, compKey: string, index: number) => {
  try {
    const rootNode = document.getElementById(formId) || document;
    const container = rootNode.querySelector(`.formio-component-${compKey}`);
    if (container) {
      const removeButtons = container.querySelectorAll(
        'i[ref="fileStatusRemove"], i[ref="removeLink"], button[ref="removeLink"], i.fa-times'
      );
      if (removeButtons?.[index]) {
        (removeButtons[index] as HTMLElement).click();
      } else {
        console.error("Form.io native remove button not found");
      }
    }
  } catch (err) {
    console.error("Failed to remove file from formio", err);
  }
};

/* ------------------------------------------------------------------ */
/*  Attachment Previews (portal-based)                                 */
/* ------------------------------------------------------------------ */

const FormioAttachmentPreviews: React.FC<{
  formId: string;
  schema: FormIOForm;
  submissionData: Record<string, unknown>;
  readOnly: boolean;
  onRemoveFile?: (compKey: string, index: number) => void;
}> = ({ formId, schema, submissionData, readOnly, onRemoveFile }) => {
  const fileComps = useMemo(
    () => (schema?.components ? getFileComponents(schema.components) : []),
    [schema]
  );

  if (fileComps.length === 0) return null;

  return (
    <>
      {fileComps.map((comp) => {
        const rawFiles = submissionData?.[comp.key as string];
        const files = Array.isArray(rawFiles)
          ? rawFiles
          : rawFiles
            ? [rawFiles]
            : [];
        if (files.length === 0) return null;

        return (
          <FormioPreviewPortal
            key={comp.key}
            compKey={comp.key as string}
            formContainerId={formId}
          >
            <div className="space-y-2 mt-2 w-full">
              {files.map((fileObj, idx) => (
                <FormioPreviewItem
                  key={`${comp.key}-${idx}`}
                  fileObj={fileObj}
                  onRemove={() => {
                    if (onRemoveFile) {
                      onRemoveFile(comp.key as string, idx);
                    } else {
                      clickNativeRemoveButton(formId, comp.key as string, idx);
                    }
                  }}
                  readOnly={readOnly}
                />
              ))}
            </div>
          </FormioPreviewPortal>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------ */
/*  FormPreview — the main exported component                          */
/* ------------------------------------------------------------------ */

/**
 * A common, read-only (by default) Formio form preview that:
 * 1. Renders the form with pre-filled submission data.
 * 2. Uses portal-based custom attachment previews below file fields
 *    (via `FormioPreviewPortal` + `FormioPreviewItem`).
 *
 * Usage:
 * ```tsx
 * <FormPreview
 *   containerId={`creation-form-preview-${ticketId}`}
 *   schema={creationFormSchema}
 *   submissionData={creationFormAnswer}
 * />
 * ```
 */
const FormPreview: React.FC<FormPreviewProps> = ({
  containerId,
  schema,
  submissionData,
  readOnly = true,
  onRemoveFile,
  className,
}) => {
  // Inject the global CSS rule synchronously before paint
  useHideNativeFileList();

  // Build a read-only version of the form when in readOnly mode
  const resolvedForm = useMemo(() => {
    if (readOnly) {
      return buildFormFromSchemaAndAnswer(schema.components, submissionData);
    }
    return schema;
  }, [schema, submissionData, readOnly]);

  return (
    <div id={containerId} className={`formio-hide-attachment ${className || ""}`}>
      <Form
        form={resolvedForm}
        submission={readOnly ? { data: submissionData } : undefined}
        options={{
          readOnly,
          ...(readOnly ? {} : { buttonSettings: { showSubmit: false } }),
        }}
      />

      {/* Portal-based custom attachment previews */}
      <FormioAttachmentPreviews
        formId={containerId}
        schema={schema}
        submissionData={submissionData}
        readOnly={readOnly}
        onRemoveFile={onRemoveFile}
      />
    </div>
  );
};

export default FormPreview;
