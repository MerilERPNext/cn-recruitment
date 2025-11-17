/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { toast } from "react-hot-toast";
import {
  useCreateShiftRequest,
  useUpdateShiftRequest,
} from "../../hooks/useShift";
import { useCurrentEmployee } from "../../hooks/useEmployee";

import type {
  ShiftRequestFormData,
  FormioSubmission,
  ShiftRequest,
} from "../../types/shift";
import { Formio } from "formiojs";
import { useGlobalStore } from "../../hooks/useGlobalStore";
import defaultFormSchema from "./ShiftRequestFormSchema.json";
import Button from "../shared/atoms/Button";

interface ShiftRequestFormModalProps {
  onClose?: () => void;
  schema?: FormSchema;
  defaultShiftRequestData?: ShiftRequest;
  forActionType?: "create" | "edit";
}

type FormSchema = typeof defaultFormSchema;

const ShiftRequestFormModal: React.FC<ShiftRequestFormModalProps> = ({
  onClose,
  defaultShiftRequestData,
  schema: propSchema,
  forActionType,
}) => {
  const formRef = useRef<any>(null);
  const { setRefetchAttendance } = useGlobalStore();
  const [formSchema, setFormSchema] = useState<FormSchema>(
    (propSchema || defaultFormSchema) as FormSchema
  );

  const { mutate: createShiftRequest } = useCreateShiftRequest();
  const { mutate: updateShiftRequest } = useUpdateShiftRequest();
  const {
    data: employeeDetails,
    isLoading: employeeLoading,
    error: employeeError,
  } = useCurrentEmployee();

  const isLoading = employeeLoading;
  const error = employeeError;
  const handleSubmitonSuccess = () => {
    onClose?.();
    setTimeout(() => {
      setRefetchAttendance(true);
    }, 1000);
  };

  const handleSubmitionError = (message: string, error: any) => {
    console.error(message, error);
  };

  const handleSubmit = async () => {
    if (!formRef.current) {
      toast.error("Form not ready yet.");
      return;
    }

    try {
      const submission: FormioSubmission<ShiftRequestFormData> =
        await formRef.current.submit();

      const { shiftType, fromDate, toDate, reason } = submission.data;

      if (!employeeDetails) {
        toast.error("Employee details not loaded. Try again.");
        return;
      }

      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const payload = {
        shift_type: shiftType,
        from_date: formatDate(fromDate),
        to_date: formatDate(toDate),
        reason: reason,
        status: "Draft",
        employee: employeeDetails.name,
        shift_request_approver: employeeDetails.shift_request_approver,
      };

      if (forActionType === "edit" && defaultShiftRequestData?.name) {
        updateShiftRequest(
          {
            doctype: defaultShiftRequestData.doctype,
            name: defaultShiftRequestData.name,
            data: payload,
          },
          {
            onSuccess: handleSubmitonSuccess,
            onError: (error: any) => {
              handleSubmitionError("Error updating shift request:", error);
            },
          }
        );
      } else {
        createShiftRequest(payload, {
          onSuccess: handleSubmitonSuccess,
          onError: (error: any) => {
            handleSubmitionError("Error creating shift request:", error);
          },
        });
      }
    } catch (formError) {
      console.error("Form submission error:", formError);
      toast.error("Please check your form inputs and try again.");
    }
  };

  // Update schema when propSchema changes
  useEffect(() => {
    if (propSchema) {
      setFormSchema(propSchema);
    }
  }, [propSchema]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 flex flex-col font-sans">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button
              disabled
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-400 font-medium cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              disabled
              className="flex-1 py-3 rounded-lg bg-gray-400 text-white font-medium cursor-not-allowed"
            >
              Loading...
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 flex flex-col font-sans">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">
                  Unable to Load Form Data
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    There was an error loading the required data for this form.
                    This could be due to:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Network connectivity issues</li>
                    <li>Missing employee information</li>
                    <li>Server temporarily unavailable</li>
                  </ul>
                  <p className="mt-2">
                    Please try again or contact support if the problem persists.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col font-sans">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <Form
            form={formSchema}
            onFormReady={(instance: Formio) => {
              formRef.current = instance;
            }}
            submission={{
              data: {
                fromDate:
                  defaultShiftRequestData?.from_date ||
                  new Date().toISOString(),
                toDate:
                  defaultShiftRequestData?.to_date || new Date().toISOString(),
                shiftType: defaultShiftRequestData?.shift_type || "",
              },
            }}
            options={{
              builder: { styles: false },
              submitButton: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            className="space-y-6"
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <Button
            onClick={onClose}
            size="md"
            variant="outline"
            bgColor="gray-300"
            className="flex-1 border text-gray-700 hover:bg-gray-50 font-medium py-3"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            size="md"
            variant="contain"
            bgColor={"blue-600"}
            textColor="white"
            className={"hover:bg-blue-700 flex-1 font-medium"}
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShiftRequestFormModal;
