/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";

export const useExpenseModals = () => {
  const [isSharePanelOpen, setIsSharePanelOpen] = useState(false);
  const [isDeleteShareConfirmOpen, setIsDeleteShareConfirmOpen] = useState(false);
  const [isAcknowledgementOpen, setIsAcknowledgementOpen] = useState(false);
  const [isAcknowledgementChecked, setIsAcknowledgementChecked] = useState(false);
  const [
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  ] = useState(false);

  useEffect(() => {
    if (isSharePanelOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSharePanelOpen]);

  return {
    isSharePanelOpen,
    setIsSharePanelOpen,
    isDeleteShareConfirmOpen,
    setIsDeleteShareConfirmOpen,
    isAcknowledgementOpen,
    setIsAcknowledgementOpen,
    isAcknowledgementChecked,
    setIsAcknowledgementChecked,
    isRelocationAcknowledgementChecked,
    setIsRelocationAcknowledgementChecked,
  };
};
