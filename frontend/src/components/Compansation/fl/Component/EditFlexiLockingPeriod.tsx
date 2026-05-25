/* eslint-disable @typescript-eslint/no-explicit-any */
import { Form } from "@tsed/react-formio";
import { X } from "lucide-react";
import { useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import "../../../../formio.custom.css";
import { useSetIndividualEmployeeFlexiLockingPeriod } from "../../../../hooks/payroll/useFlexiDeclaration";
import { useScreenSize } from "../../../../hooks/useScreenSize";
import Button from "../../../shared/atoms/Button";
import CircularLoader from "../../../shared/atoms/CircularLoader";
import { Typography } from "../../../shared/atoms/Typography";
import { FlexiLockingPeriod } from "../../../../types/flexiDeclaration";

interface EditFlexiLockingPeriodProps {
  onClose: () => void;
  open?: boolean;
  data: FlexiLockingPeriod | undefined;
  onRefetchData?: (() => void) | null;
}

export const EditFlexiLockingPeriod = ({
  onClose,
  open = true,
  data,
  onRefetchData,
}: EditFlexiLockingPeriodProps) => {
  const formInstance = useRef<any>(null);
  const { isDesktop } = useScreenSize();
  const mutation = useSetIndividualEmployeeFlexiLockingPeriod();

  const initialSubmission = useMemo(() => {
    if (!data) return undefined;
    return {
      data: {
        employee: data.employee,
        individual_start_date: data.individual_start_date,
        individual_end_date: data.individual_end_date,
        status: data.status,
        doctype_name: data.doctype_name || "Salary Structure Assignment",
      },
    };
  }, [data]);

  const lockingForm = useMemo(() => {
    return {
      display: "form",
      components: [
        {
          type: "panel",
          key: "locking_period_settings",
          label: "Locking Period Settings",
          hideLabel: true,
          customClass: "border-0",
          components: [
            {
              label: "Employee",
              key: "employee",
              type: "textfield",
              input: true,
              disabled: true,
              customClass: "mb-4",
            },
            {
              label: "Start Date",
              key: "individual_start_date",
              type: "datetime",
              input: true,
              widget: { type: "calendar" },
              format: "yyyy-MM-dd",
              placeholder: "yyyy-mm-dd",
              customClass: "mb-4",
              enableTime: false,
            },
            {
              label: "End Date",
              key: "individual_end_date",
              type: "datetime",
              input: true,
              widget: { type: "calendar" },
              format: "yyyy-MM-dd",
              placeholder: "yyyy-mm-dd",
              customClass: "mb-4",
              enableTime: false,
            },
            {
              label: "Status",
              key: "status",
              type: "select",
              input: true,
              placeholder: "Select Status",
              customClass: "mb-4",
              validate: { required: true },
              data: {
                values: [
                  { label: "Open", value: "Open" },
                  { label: "Closed", value: "Closed" },
                ],
              },
            },
            {
              label: "Doctype Name",
              key: "doctype_name",
              type: "textfield",
              input: true,
              disabled: true,
              customClass: "mb-4",
            },
          ],
        },
      ],
    };
  }, []);

  const formatDate = (date: any): string => {
    if (!date) return "";
    if (typeof date === "string") {
      const match = date.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  };

  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();
      const submissionData = submission?.data || {};
      
      const payload: FlexiLockingPeriod = {
        employee: submissionData.employee,
        status: submissionData.status,
        doctype_name: submissionData.doctype_name,
        start_date: formatDate(submissionData.individual_start_date),
        end_date: formatDate(submissionData.individual_end_date),
        individual_start_date: undefined,
        individual_end_date: undefined
      };

      mutation.mutate(payload, {
        onSuccess() {
          toast.success("Updated Locking Period Successfully.");
          if (onRefetchData) {
            onRefetchData();
          }
          onClose();
        },
        onError(error) {
          toast.error("Failed while updating locking period.");
          console.error("Mutation error:", error);
        },
      });
    } catch (err) {
      toast.error("Please fill in all required fields.");
      console.warn("Form submission error -", err);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full h-full md:h-auto md:max-w-2xl md:max-h-[85vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <Typography variant="h4" className="text-lg font-semibold text-gray-800">
            Edit Flexi Locking Period
          </Typography>
          {isDesktop && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 pt-4 pb-32 md:pb-6">
          <Form
            form={lockingForm}
            submission={initialSubmission}
            onFormReady={(instance: any) => {
              formInstance.current = instance;
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              disableOnSubmit: true,
              formClass: "space-y-6",
              rowClass: "flex flex-col md:flex-row md:space-x-4",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass: "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 px-2 py-1",
              validateOnInit: true,
              validateOnBlur: true,
              validateOnChange: false,
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 w-full border-gray-200 bg-white border-t shadow-md p-4 z-20">
          <div className="max-w-4xl mx-auto flex flex-row gap-3 md:gap-4 md:justify-end">
            {!isDesktop && (
              <Button
                onClick={onClose}
                size="md"
                variant="outline"
                className="w-full md:w-auto min-w-[150px] rounded-md font-brand"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              size="md"
              variant="contain"
              bgColor="primary"
              className="w-full md:w-auto min-w-[150px] rounded-md font-brand"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <CircularLoader size="sm" color="white" />
              ) : (
                "Update"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
