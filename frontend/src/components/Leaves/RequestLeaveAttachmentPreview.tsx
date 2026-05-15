import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  EYE_ICON_SVG,
  DOWNLOAD_ICON_SVG,
  TRASH_ICON_SVG,
} from "../../constants/expense.constants";

type PreviewFile = {
  url: string;
  name: string;
};

type RequestLeaveAttachmentPreviewProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentAttachments: any[];
  onPreview: (file: PreviewFile) => void;
  onRemove: (index: number) => void;
};

const AttachmentItem: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attachment: any;
  index: number;
  onPreview: (file: PreviewFile) => void;
  onRemove: (index: number) => void;
}> = ({ attachment, index, onPreview, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  let actualFile = attachment.file;
  if (
    actualFile &&
    !(actualFile instanceof Blob || actualFile instanceof File)
  ) {
    actualFile = null;
  }

  useEffect(() => {
    if (!actualFile) return;

    const url = URL.createObjectURL(actualFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [actualFile]);

  const url =
    attachment?.data?.message?.file_url ||
    attachment?.url ||
    attachment?.file_url;

  if (!actualFile && !url) return null;

  let parsedUrl = url;
  if (
    url &&
    typeof url === "string" &&
    !url.startsWith("http") &&
    !url.startsWith("/") &&
    !url.startsWith("blob:")
  ) {
    parsedUrl = url.startsWith("files/") ? `/${url}` : `/files/${url}`;
  }

  const finalUrl = actualFile ? previewUrl : parsedUrl;
  if (actualFile && !finalUrl) return null; // wait until state-level objectURL is created

  const fileName =
    attachment?.originalName ||
    attachment?.name ||
    attachment?.data?.message?.file_name ||
    actualFile?.name ||
    "Attachment";

  const isImage = actualFile
    ? actualFile.type?.startsWith("image/")
    : (
        attachment?.type || attachment?.data?.message?.file_type
      )?.startsWith("image/") ||
      /\.(jpeg|jpg|gif|png|webp|svg|ico)$/i.test(fileName);

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {isImage && finalUrl ? (
          <img
            src={finalUrl}
            alt={fileName}
            className="w-12 h-12 object-cover rounded-md border shrink-0"
            style={{ borderColor: "#d1d5db" }}
          />
        ) : (
          <div
            className="w-12 h-12 flex items-center justify-center bg-white border rounded-md text-[10px] font-semibold text-gray-600 uppercase shrink-0"
            style={{ borderColor: "#d1d5db" }}
          >
            File
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-medium text-gray-900 truncate"
            title={fileName}
          >
            {fileName}
          </p>
          <p className="text-xs text-gray-500">Attachment</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {finalUrl && (
          <>
            <button
              type="button"
              title="Preview"
              className="inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => onPreview({ url: finalUrl, name: fileName })}
              dangerouslySetInnerHTML={{ __html: EYE_ICON_SVG }}
            />
            <a
              href={finalUrl}
              download={fileName}
              title="Download"
              className="inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors"
              dangerouslySetInnerHTML={{ __html: DOWNLOAD_ICON_SVG }}
            />
          </>
        )}
        <button
          type="button"
          title="Delete"
          className="inline-flex items-center justify-center rounded-md border shadow-sm border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => onRemove(index)}
          dangerouslySetInnerHTML={{ __html: TRASH_ICON_SVG }}
        />
      </div>
    </div>
  );
};

const RequestLeaveAttachmentPreview: React.FC<
  RequestLeaveAttachmentPreviewProps
> = ({ currentAttachments, onPreview, onRemove }) => {
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    const updateContainer = () => {
      const wrapper = document.querySelector(
        ".formio-component-custom_attachment"
      );
      if (!wrapper) {
        setContainer(null);
        return;
      }

      let portal = wrapper.querySelector(".custom-preview-custom_attachment");
      if (!portal) {
        portal = document.createElement("div");
        portal.className = "custom-preview-custom_attachment mt-3 w-full";
        wrapper.appendChild(portal);
      }

      setContainer((prev) => (prev === portal ? prev : portal));
    };

    updateContainer();

    const observer = new MutationObserver(() => {
      updateContainer();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!container || currentAttachments.length === 0) {
    return null;
  }

  return createPortal(
    <div className="h-full px-2 lg:px-6">
      <h3 className="text-md font-medium mb-2 text-gray-800">
        Attachments Preview
      </h3>
      <div className="space-y-2">
        {currentAttachments.map((attachment, index) => (
          <AttachmentItem
            key={`${attachment?.originalName || attachment?.name || index}-${index}`}
            attachment={attachment}
            index={index}
            onPreview={onPreview}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>,
    container
  );
};

export default RequestLeaveAttachmentPreview;
