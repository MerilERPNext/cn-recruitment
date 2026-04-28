import React, { useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { AttachmentCard } from "./AttachmentCard";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const FormioPreviewItem = ({ fileObj, onRemove, readOnly = false, showFileNameWithEye = false }: { fileObj: any, onRemove: () => void, readOnly?: boolean, showFileNameWithEye?: boolean }) => {
  const [objectUrl, setObjectUrl] = useState<string>("");

  useEffect(() => {
    let url = "";
    if (fileObj.file && !fileObj.url && !fileObj.file_url) {
      try {
        url = URL.createObjectURL(fileObj.file);
        setObjectUrl(url);
        /* eslint-disable @typescript-eslint/no-explicit-any */
      } catch (e: any) {
        console.error("error in creating object url", e)
      }
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileObj]);

  const fileUrl = fileObj?.data?.message?.file_url || fileObj.url || fileObj.file_url || objectUrl;
  const fileName = fileObj?.data?.message?.file_name || fileObj.name || fileObj.originalName || (fileObj.file ? fileObj.file.name : "");

  if (!fileUrl) return null;

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <AttachmentCard
          fileUrl={fileUrl}
          fileName={fileName}
          showFileNameWithEye={showFileNameWithEye}
        />
      </div>
      {!readOnly && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-gray-400 hover:text-red-600 ml-2"
          title="Remove attachment"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const FormioPreviewPortal = ({ compKey, formContainerId, children }: { compKey: string, formContainerId?: string, children: React.ReactNode }) => {
  const [targetDom, setTargetDom] = useState<Element | null>(null);

  useLayoutEffect(() => {
    let currentSlot: Element | null = null;
    const findAndSetTarget = () => {
      const rootNode = formContainerId ? (document.getElementById(formContainerId) || document) : document;
      const wrapper = rootNode.querySelector(`.formio-component-${compKey}`);
      if (!wrapper) return;

      let slot = wrapper.querySelector(`.custom-preview-${compKey}`);
      if (!slot) {
        slot = document.createElement("div");
        slot.className = `custom-preview-${compKey} mt-3 w-full`;
        wrapper.appendChild(slot);
      }
      if (currentSlot !== slot) {
        currentSlot = slot;
        setTargetDom(slot);
      }
    };

    findAndSetTarget();

    const observer = new MutationObserver(() => {
      if (!currentSlot || !document.body.contains(currentSlot)) {
        findAndSetTarget();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (currentSlot && currentSlot.parentNode) {
        currentSlot.parentNode.removeChild(currentSlot);
      }
    };
  }, [compKey, formContainerId]);

  if (!targetDom) return null;
  return createPortal(children, targetDom);
};
