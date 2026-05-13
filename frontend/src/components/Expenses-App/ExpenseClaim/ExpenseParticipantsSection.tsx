/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from "react";
import ParticipantsList from "./ParticipantsList";
import ParticipantsDrawer from "./ParticipantDrawer";
import { Trash2 } from "lucide-react";
import Button from "../../shared/atoms/Button";

export interface ExpenseParticipantsSectionProps {
  displayParticipants: any[];
  isDesktop: boolean;
  isShareAllowed: boolean;
  isSharePanelOpen: boolean;
  setIsSharePanelOpen: (open: boolean) => void;
  isDeleteShareConfirmOpen: boolean;
  setIsDeleteShareConfirmOpen: (open: boolean) => void;
  dynamicFormData: Record<string, any>;
  setDynamicFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setDynamicFormRevision?: React.Dispatch<React.SetStateAction<number>>;
  currentEmployee: any;
  maxAllowedParticipants: number;
  employeesList: any;
  isLoadingEmployees: boolean;
}

export const ExpenseParticipantsSection: React.FC<ExpenseParticipantsSectionProps> = ({
  displayParticipants,
  isDesktop,
  isShareAllowed,
  isSharePanelOpen,
  setIsSharePanelOpen,
  isDeleteShareConfirmOpen,
  setIsDeleteShareConfirmOpen,
  dynamicFormData,
  setDynamicFormData,
  setDynamicFormRevision,
  currentEmployee,
  maxAllowedParticipants,
  employeesList,
  isLoadingEmployees,
}) => {
  return (
    <>
      <ParticipantsList
        participants={displayParticipants}
        isDesktop={isDesktop}
        onEdit={() => setIsSharePanelOpen(true)}
        onRemove={() => setIsDeleteShareConfirmOpen(true)}
      />

      {isSharePanelOpen && isShareAllowed && (
        <ParticipantsDrawer
          isOpen={isSharePanelOpen}
          onClose={() => {
            setIsSharePanelOpen(false);
            // If no participants were saved, reset the toggle to unchecked
            if (displayParticipants.length === 0) {
              setDynamicFormData((prev) => ({
                ...prev,
                shareExpenseCheckbox: false,
              }));
              setDynamicFormRevision?.((r) => r + 1);
            }
          }}
          expenseAmount={Number(dynamicFormData?.amount ?? 0)}
          initialParticipants={displayParticipants}
          currentEmployee={currentEmployee}
          maxParticipants={maxAllowedParticipants}
          employeeOptions={employeesList}
          employeeOptionsLoading={isLoadingEmployees}
          onSave={(formattedParticipants) => {
            setDynamicFormData((prev: any) => ({
              ...prev,
              participants: formattedParticipants,
              shareExpenseCheckbox:
                formattedParticipants.length > 0
                  ? true
                  : prev?.shareExpenseCheckbox,
            }));
            setIsSharePanelOpen(false);
          }}
        />
      )}

      {isDeleteShareConfirmOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
              <Trash2 className="h-5 w-5" /> Confirm Removal
            </h3>
            <p className="mb-6 text-sm text-gray-700">
              Are you sure you want to remove the shared expense? This will
              delete all added participants.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                className="font-semibold"
                onClick={() => setIsDeleteShareConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="md"
                className="bg-red-600 font-semibold text-white"
                onClick={() => {
                  setDynamicFormData((prev) => ({
                    ...prev,
                    participants: [],
                    shareExpenseCheckbox: false,
                  }));
                  setIsDeleteShareConfirmOpen(false);
                  setIsSharePanelOpen(false);
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
