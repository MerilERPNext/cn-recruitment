import React, { useEffect } from "react";
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

const RequestLeaveAttachmentPreview: React.FC<
  RequestLeaveAttachmentPreviewProps
> = ({ currentAttachments, onPreview, onRemove }) => {
  useEffect(() => {
    const interval = setInterval(() => {
      const wrapper = document.querySelector(".formio-component-custom_attachment");
      if (!wrapper) return;

      let portal = wrapper.querySelector(".custom-preview-custom_attachment") as HTMLElement;
      if (!portal) {
        portal = document.createElement("div");
        portal.className = "custom-preview-custom_attachment mt-3 w-full";
        wrapper.appendChild(portal);
      }

      const hash = currentAttachments
        .map((attachment) => attachment?.url || attachment?.file_url || attachment?.originalName || attachment?.name || "file")
        .join("|");

      if (portal.getAttribute("data-hash") === hash && portal.children.length > 0) {
        return;
      }

      portal.setAttribute("data-hash", hash);

      if (currentAttachments.length === 0) {
        portal.innerHTML = "";
        return;
      }

      let html = '<div class="h-full px-2 lg:px-6">';
      html +=
        '<h3 class="text-md font-medium mb-2 text-gray-800">Attachments Preview</h3>';
      html += '<div class="space-y-2">';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentAttachments.forEach((attachment: any, index: number) => {
        let actualFile = attachment.file;
        if (
          actualFile &&
          !(actualFile instanceof Blob || actualFile instanceof File)
        ) {
          actualFile = null;
        }

        const url =
          attachment?.data?.message?.file_url ||
          attachment?.url ||
          attachment?.file_url;
        if (!actualFile && !url) return;

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

        const previewUrl = actualFile
          ? URL.createObjectURL(actualFile)
          : parsedUrl;
        const fileName =
          attachment?.originalName ||
          attachment?.name ||
          attachment?.data?.message?.file_name ||
          actualFile?.name ||
          "Attachment";
        const safeName = fileName.replace(/"/g, "&quot;");

        const isImage = actualFile
          ? actualFile.type?.startsWith("image/")
          : (
            attachment?.type || attachment?.data?.message?.file_type
          )?.startsWith("image/") ||
          /\.(jpeg|jpg|gif|png|webp|svg|ico)$/i.test(fileName);

        html +=
          '<div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg gap-3">';
        html += '<div class="flex items-center gap-3 min-w-0 flex-1">';

        if (isImage) {
          html += `<img src="${previewUrl}" alt="${safeName}" class="w-12 h-12 object-cover rounded-md border shrink-0" style="border-color: #d1d5db !important;" />`;
        } else {
          html +=
            '<div class="w-12 h-12 flex items-center justify-center bg-white border rounded-md text-[10px] font-semibold text-gray-600 uppercase shrink-0" style="border-color: #d1d5db !important;">File</div>';
        }

        html += '<div class="min-w-0 flex-1">';
        html += `<p class="text-sm font-medium text-gray-900 truncate" title="${safeName}">${safeName}</p>`;
        html += '<p class="text-xs text-gray-500">Attachment</p>';
        html += "</div>";
        html += "</div>";

        html += '<div class="flex items-center gap-2 shrink-0">';
        html += `<button type="button" title="Preview" class="preview-file-btn-v2 inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors" data-preview-url="${previewUrl}" data-preview-name="${safeName}">${EYE_ICON_SVG}</button>`;
        html += `<a href="${previewUrl}" download="${safeName}" title="Download" class="inline-flex items-center justify-center rounded-md border shadow-sm border-gray-300 bg-white p-2 text-gray-700 hover:bg-gray-100 transition-colors">${DOWNLOAD_ICON_SVG}</a>`;
        html += `<button type="button" title="Delete" class="remove-file-btn-v2 inline-flex items-center justify-center rounded-md border shadow-sm border-red-300 bg-white p-2 text-red-600 hover:bg-red-50 transition-colors" data-index="${index}">${TRASH_ICON_SVG}</button>`;
        html += "</div>";
        html += "</div>";
      });

      html += "</div></div>";
      portal.innerHTML = html;

      const triggers = portal.querySelectorAll(".preview-file-btn-v2");
      triggers.forEach((element) => {
        element.addEventListener("click", () => {
          const uri = element.getAttribute("data-preview-url");
          const name = element.getAttribute("data-preview-name");

          if (uri && name) onPreview({ url: uri, name });
          else if (uri) onPreview({ url: uri, name: "Attachment" });
        });
      });

      const removeButtons = portal.querySelectorAll(".remove-file-btn-v2");
      removeButtons.forEach((element) => {
        element.addEventListener("click", () => {
          const rawIndex = element.getAttribute("data-index");
          const idx = rawIndex ? Number(rawIndex) : NaN;
          if (!Number.isNaN(idx)) {
            onRemove(idx);
          }
        });
      });
    }, 300);

    return () => clearInterval(interval);
  }, [currentAttachments, onPreview, onRemove]);

  return null;
};

export default RequestLeaveAttachmentPreview;
