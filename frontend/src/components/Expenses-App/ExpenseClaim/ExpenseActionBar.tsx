/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React from "react";
import Button from "../../shared/atoms/Button";

export interface ExpenseActionBarProps {
  isEditingExistingExpense: boolean;
  isDraftExpenseEdit: boolean;
  onSave: () => void;
  onUpdate: () => void;
  onSaveAndSubmit: () => void;
}

export const ExpenseActionBar: React.FC<ExpenseActionBarProps> = ({
  isEditingExistingExpense,
  isDraftExpenseEdit,
  onSave,
  onUpdate,
  onSaveAndSubmit,
}) => {
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
      {isEditingExistingExpense ? (
        <>
          {isDraftExpenseEdit ? (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={onSave}
                className="w-full font-semibold sm:w-fit"
              >
                Save
              </Button>
              <Button
                bgColor="primary"
                size="md"
                onClick={onSaveAndSubmit}
                className="w-full font-semibold shadow-sm sm:w-fit"
              >
                Save & Submit
              </Button>
            </>
          ) : (
            <Button
              bgColor="primary"
              size="md"
              onClick={onUpdate}
              className="w-full font-semibold shadow-sm sm:w-fit"
            >
              Resubmit
            </Button>
          )}
        </>
      ) : (
        <>
          <Button
            variant="outline"
            size="md"
            onClick={onSave}
            className="w-full font-semibold sm:w-fit"
          >
            Save
          </Button>
          <Button
            bgColor="primary"
            size="md"
            onClick={onSaveAndSubmit}
            className="w-full font-semibold shadow-sm sm:w-fit"
          >
            Save & Submit
          </Button>
        </>
      )}
    </div>
  );
};
