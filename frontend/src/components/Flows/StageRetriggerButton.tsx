import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import Modal from "../shared/Modal";
import { useRetriggerApprovalFlowEvent } from "../../hooks/useFlows";
import { useGetUiPermission } from "../../hooks/userUiPermission";
import { isActionEnabled } from "../../utils/uiPermission";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";

const StageRetriggerButton = ({
  todoId,
  page,
}: {
  todoId?: string;
  page: string;
}) => {
  const { data: userUiPermission } = useGetUiPermission("HR Process");

  let actionKey = "";
  if (page === "Flow Requests") {
    actionKey = "flow_stage_retrigger";
  } else if (page === "Separation") {
    actionKey = "separation_stage_retrigger";
  } else if (page === "Confirmation") {
    actionKey = "confirmation_stage_retrigger";
  }

  const canRetrigger = actionKey ? isActionEnabled(userUiPermission, actionKey, page) : false;

  const { mutate, isPending } = useRetriggerApprovalFlowEvent();

  const [showModal, setShowModal] = useState(false);

  console.log({ canRetrigger, todoId })
  if (!todoId || !canRetrigger) return null;

  return (
    <>
      <Button
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        loading={isPending}
        disabled={isPending}
      >
        Retrigger
      </Button>

      {showModal && createPortal(
        <Modal isOpen={showModal} onClose={() => setShowModal(false)} size="sm">
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-start justify-between gap-3">
              <Typography variant="subheading">
                Confirm Retrigger Action?
              </Typography>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            
            <Typography variant="bodySmall" className="text-gray-600 leading-relaxed">
              Are you sure you want to retrigger this stage? The task will be retriggered to the respective assignees.
            </Typography>

            <div className="flex gap-3 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="contain"
                size="sm"
                onClick={() => {
                  mutate({ todo: todoId }, {
                    onSuccess: () => {
                      toast.success("Stage retriggered successfully");
                      setShowModal(false);
                    },
                    onError: (error) => {
                      errorResponseFormater(error, "Failed to retrigger stage.", { showToast: true });
                      setShowModal(false);
                    }
                  });
                }}
                loading={isPending}
                disabled={isPending}
              >
                Retrigger
              </Button>
            </div>
          </div>
        </Modal>,
        document.body
      )}
    </>
  );
};

export default StageRetriggerButton;
