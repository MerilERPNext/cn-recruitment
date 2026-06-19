import React, { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { WorkflowStage } from "../../../../types/flows";
import { useReinitiateStage } from "../../../../hooks/useFlows";
import { errorResponseFormater } from "../../../../utils/errorResponseFormater";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import Modal from "../../../shared/Modal";

interface RetriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStage;
}

const RetriggerModal: React.FC<RetriggerModalProps> = ({
  isOpen,
  onClose,
  stage,
}) => {
  const hasDependents = stage.has_dependents ?? false;
  const dependentNames = stage.dependent_stage_names ?? [];
  const [withDependents, setWithDependents] = useState<0 | 1>(0);

  const { mutate: reinitiate, isPending } = useReinitiateStage();

  const handleSubmit = () => {
    if (!stage.funnel_task) return;

    reinitiate(
      {
        funnel_task: stage.funnel_task,
        with_dependents: hasDependents ? withDependents : 0,
      },
      {
        onSuccess: () => {
          toast.success("Stage retriggered successfully");
          onClose();
        },
        onError: (error) => {
          toast.error(
            errorResponseFormater(error, "Failed to retrigger stage.")
          );
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <Typography variant="subheading">
            Confirm Retrigger Action?
          </Typography>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Description */}
        <Typography variant="bodySmall" className="text-gray-600 leading-relaxed">
          The task will be retriggered to the respective assignees.
        </Typography>

        {/* Radio options — only when has_dependents is true */}
        {hasDependents && (
          <div className="flex flex-col gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="retrigger-option"
                checked={withDependents === 0}
                onChange={() => setWithDependents(0)}
                className="w-4 h-4 accent-primary"
              />
              <Typography variant="bodySmall" className="text-gray-700">
                Retrigger this workflow stage only.
              </Typography>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="retrigger-option"
                checked={withDependents === 1}
                onChange={() => setWithDependents(1)}
                className="w-4 h-4 accent-primary"
              />
              <Typography variant="bodySmall" className="text-gray-700">
                Reset workflow stage(s) dependent on this stage.
              </Typography>
            </label>

            {/* Dependent stage names info — show when "reset dependents" is selected */}
            {withDependents === 1 && dependentNames.length > 0 && (
              <Typography variant="bodySmall" className="text-gray-600 leading-relaxed">
                <span className="font-medium text-gray-800">
                  {dependentNames.join(", ")}
                </span>{" "}
                will be reset as they are dependent on this stage.
              </Typography>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 justify-end pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="contain"
            size="sm"
            onClick={handleSubmit}
            loading={isPending}
            disabled={isPending}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RetriggerModal;
