/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import {
  ActivePendo,
  PendoAction,
  useRespondToPendo,
} from "../../services/pendoService";

// Resolve relative Frappe file paths (e.g. "/private/files/..") against the
// API host — same pattern used for badge/award images elsewhere in the app.
const API_HOST =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (import.meta as any).env?.VITE_API_DOMAIN ||
  (typeof window !== "undefined" ? window.location.origin : "");

const resolveImage = (image?: string | null): string | undefined => {
  if (!image) return undefined;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith("/")) return `${API_HOST}${image}`;
  return image;
};

interface PendoPopupProps {
  pendo: ActivePendo;
  onDismiss: () => void;
}

const PendoPopup: React.FC<PendoPopupProps> = ({ pendo, onDismiss }) => {
  const navigate = useNavigate();
  const { mutate: respond } = useRespondToPendo();
  const [isOpen, setIsOpen] = useState(true);

  // Fire-and-forget: the popup closes immediately regardless of whether the
  // log call itself succeeds — nothing in the UI should ever wait on it.
  const respondAndClose = (action: PendoAction) => {
    respond({ pendo_popup: pendo.name, action });
    setIsOpen(false);
    onDismiss();
  };

  const handleAct = () => {
    const url = (pendo.act_url || "").trim();
    respondAndClose("Acted");
    if (!url) return;
    if (url.startsWith("/")) {
      navigate(url);
    } else {
      window.location.href = url;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => respondAndClose("Closed")} size="sm">
      <div className="relative flex w-full flex-col overflow-hidden bg-white rounded-lg">
        <button
          type="button"
          onClick={() => respondAndClose("Closed")}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white/90 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>

        {pendo.image && (
          <img
            src={resolveImage(pendo.image)}
            alt={pendo.title}
            className="w-full max-h-72 object-cover"
          />
        )}

        <div className="flex flex-col gap-3 px-5 py-4">
          <Typography variant="h4" className="font-bold text-gray-900">
            {pendo.title}
          </Typography>
          {pendo.message && (
            <div
              className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
              // Pendo Popup.message is a Frappe Text Editor field, authored by
              // admins with doctype create/write access — same trust level as
              // any other Desk-authored rich text rendered elsewhere in ESS.
              dangerouslySetInnerHTML={{ __html: pendo.message }}
            />
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            bgColor="text"
            className="w-full justify-center sm:w-auto"
            onClick={() => respondAndClose("Declined")}
          >
            {pendo.decline_button_label || "I do not want to act"}
          </Button>
          <Button
            type="button"
            variant="contain"
            bgColor="primary"
            className="w-full justify-center sm:w-auto"
            onClick={handleAct}
          >
            {pendo.act_button_label || "Act"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PendoPopup;
