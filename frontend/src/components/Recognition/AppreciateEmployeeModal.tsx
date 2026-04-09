import React, { useState, useEffect } from "react";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CircularLoader from "../shared/atoms/CircularLoader";
import { EmployeeSearchList } from "./EmployeeSearchList";
import { BadgeCard } from "./BadgeCard";
import { useGetBadgeTypes, useAppreciateEmployee } from "../../services/recognitionService";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentEmployeeAllDetails } from "../../hooks/useEmployee";
import toast from "react-hot-toast";
import { errorResponseFormater } from "../../utils/errorResponseFormater";
import { X, ChevronLeft } from "lucide-react";
import Avatar from "../shared/Avatar";
import { useGetAllEmployees } from "../../hooks/useEmployee";
import { Employee } from "../../types/employee";

interface AppreciateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployee?: string;
}

type AppreciationStep = "employee" | "badge" | "message";

const steps: AppreciationStep[] = ["employee", "badge", "message"];

export const AppreciateEmployeeModal: React.FC<
  AppreciateEmployeeModalProps
> = ({ isOpen, onClose, preselectedEmployee }) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    preselectedEmployee || ""
  );
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>("");
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails({
    fields: ["name", "employee_name"]
  });
  const { data: badgesData, isLoading: badgesLoading } = useGetBadgeTypes();
  const { data: selectedEmployeeData } = useGetAllEmployees(
    ["name", "employee_name", "designation", "image"],
    1,
    selectedEmployeeId ? [["name", "=", selectedEmployeeId]] : undefined
  );
  const appreciateMutation = useAppreciateEmployee();

  const badges = badgesData?.badges || [];
  const selectedEmployee = selectedEmployeeData?.[0] as Employee | undefined;
  const selectedBadgeData = badges.find((b) => b.name === selectedBadge);

  // Reset to first step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      if (preselectedEmployee) {
        setSelectedEmployeeId(preselectedEmployee);
      }
    }
  }, [isOpen, preselectedEmployee]);

  const handleEmployeeSelect = (employeeId: string, employeeName?: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeName || "");
    setCurrentStep(1); // Move to badge selection
  };

  const handleBadgeSelect = (badgeName: string) => {
    setSelectedBadge(badgeName);
    // Automatically move to step 3 when badge is selected (as per Figma design)
    // Small delay for visual feedback
    setTimeout(() => {
      setCurrentStep(2);
    }, 200);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedEmployeeId) {
      toast.error("Please select an employee");
      return;
    }

    if (!selectedBadge) {
      toast.error("Please select a badge");
      return;
    }

    if (!reason.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      await appreciateMutation.mutateAsync({
        employee: selectedEmployeeId,
        recognition_type: selectedBadge,
        reason: reason.trim(),
      });

      toast.success("Appreciation sent successfully!");

      // Reset form
      setSelectedEmployeeId(preselectedEmployee || "");
      setSelectedEmployeeName("");
      setSelectedBadge("");
      setReason("");
      setCurrentStep(0);

      // Close modal
      onClose();

      // Invalidate queries to refresh dashboard
      queryClient.invalidateQueries({ queryKey: ["recognition"] });
    } catch (error: any) {
      const errorMessage = errorResponseFormater(
        error,
        "Failed to send appreciation"
      );
      toast.error(errorMessage);
    }
  };

  const handleClose = () => {
    // Reset form on close
    setSelectedEmployeeId(preselectedEmployee || "");
    setSelectedEmployeeName("");
    setSelectedBadge("");
    setReason("");
    setCurrentStep(0);
    onClose();
  };

  const isSubmitting = appreciateMutation.isPending;
  const currentStepName = steps[currentStep];

  // Get current user name for header
  const currentUserName = currentEmployee?.employee_name || currentEmployee?.name || "You";

  // Render Step 1: Employee Selection
  const renderStep1 = () => (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="mb-4">
        <Typography variant="h4" className="font-semibold mb-2">
          Who do you want to appreciate?
        </Typography>
      </div>
      <EmployeeSearchList
        selectedEmployeeId={selectedEmployeeId}
        onSelect={handleEmployeeSelect}
        onCancel={handleClose}
      />
    </div>
  );

  // Render Step 2: Badge Selection
  const renderStep2 = () => (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="mb-4">
        <Typography variant="h4" className="font-semibold mb-2">
          Select a Value Badge
        </Typography>
      </div>
      {badgesLoading ? (
        <div className="flex items-center justify-center py-12">
          <CircularLoader size="md" />
          <Typography variant="bodySmall" color="body2" className="ml-3">
            Loading badges...
          </Typography>
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-12">
          <Typography variant="bodyMedium" color="body2">
            No badges available
          </Typography>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto flex-1 pb-4">
          {badges.map((badge) => (
            <BadgeCard
              key={badge.name}
              badge={badge}
              isSelected={selectedBadge === badge.name}
              onSelect={() => handleBadgeSelect(badge.name)}
            />
          ))}
        </div>
      )}
    </div>
  );

  // Render Step 3: Message and Review
  const renderStep3 = () => (
    <div className="flex flex-col h-full min-h-[400px]">
      <div className="mb-6 space-y-4">
        {/* Appreciating by section */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <Typography variant="bodySmall" color="body2" className="mb-1">
              Appreciating by
            </Typography>
            <Typography variant="bodyMedium" className="font-medium">
              {currentUserName}
            </Typography>
          </div>
          <Button
            variant="subtle"
            size="sm"
            onClick={() => setCurrentStep(0)}
            disabled={isSubmitting}
          >
            Change
          </Button>
        </div>

        {/* Selected Employee */}
        {selectedEmployee && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar
                src={selectedEmployee.image}
                name={selectedEmployee.employee_name || selectedEmployee.name || ""}
                size="h-10 w-10"
              />
              <div>
                <Typography variant="bodyMedium" className="font-medium">
                  {selectedEmployee.employee_name || selectedEmployee.name}
                </Typography>
                {selectedEmployee.designation && (
                  <Typography variant="bodySmall" color="body2">
                    {selectedEmployee.designation}
                  </Typography>
                )}
              </div>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setCurrentStep(0)}
              disabled={isSubmitting}
            >
              Change
            </Button>
          </div>
        )}

        {/* Selected Badge */}
        {selectedBadgeData && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {selectedBadgeData.icon && (
                <div className="text-2xl">
                  {selectedBadgeData.icon.startsWith("http") ||
                  selectedBadgeData.icon.startsWith("/") ? (
                    <img
                      src={selectedBadgeData.icon}
                      alt={selectedBadgeData.recognition_type_name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <span>{selectedBadgeData.icon}</span>
                  )}
                </div>
              )}
              <Typography variant="bodyMedium" className="font-medium">
                {selectedBadgeData.recognition_type_name}
              </Typography>
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => setCurrentStep(1)}
              disabled={isSubmitting}
            >
              Change
            </Button>
          </div>
        )}

        {/* Message Input */}
        <div>
          <Typography variant="label" className="block mb-2 font-medium">
            Write a message
          </Typography>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Say something nice about ${selectedEmployeeName || "this employee"}...`}
            disabled={isSubmitting}
            rows={5}
            className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm resize-none"
          />
        </div>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6 flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
                disabled={isSubmitting}
              >
                <ChevronLeft className="size-5 text-gray-600" />
              </button>
            )}
            <Typography variant="h3" className="font-semibold">
              Appreciate a Colleague
            </Typography>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
            disabled={isSubmitting}
          >
            <X className="size-5 text-gray-600" />
          </button>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto mb-6">
          {currentStepName === "employee" && renderStep1()}
          {currentStepName === "badge" && renderStep2()}
          {currentStepName === "message" && renderStep3()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3 pt-4 border-t border-gray-200 flex-shrink-0">
          {currentStep === 0 ? (
            <Button
              variant="subtle"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="subtle"
              onClick={handleBack}
              disabled={isSubmitting}
              icon={<ChevronLeft className="size-4" />}
            >
              Back
            </Button>
          )}

          {currentStep === 2 ? (
            <Button
              variant="contain"
              bgColor="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason.trim()}
              className="min-w-[140px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <CircularLoader size="sm" color="white" />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Send Appreciation"
              )}
            </Button>
          ) : currentStep === 1 && selectedBadge ? (
            <Button
              variant="contain"
              bgColor="primary"
              onClick={() => setCurrentStep(2)}
              disabled={isSubmitting}
            >
              Send Appreciation
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
