import React, { useEffect, useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.full.css";
import { useCreateNewAttendanceRequest } from "../../../hooks/useAttendance";
import { formatDateToYYYYMMDD } from "../../../utils/helperUtils";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import { toast } from "react-hot-toast";
import useCurrentUser from "../../../hooks/useCurrentUser";
import { X } from "lucide-react";
import { useGlobalStore } from "../../../hooks/useGlobalStore";
import DOMPurify from "dompurify";
import { useGetUserRoles } from "../../../hooks/useAttendance";

// Import the JSON schema
import defaultFormSchema from "./attendanceRequestFormSchema.json";

interface AttendanceFormData {
  request_type?: string;
  company?: string;
  employee?: string;
  message?: string;
  custom__request_reason?: string;
  from_date?: string | Date;
  to_date?: string | Date;
  custom_from_time?: string | Date;
  custom_to_time?: string | Date;
  select_shift?: string;
  overnight_out_duty?: boolean;
  attachments?: { url: string }[];
  custom_attachment?: string;
  custom_location?: string;
  isForOthers?: boolean;
  currentEmployeeId?: string;
  currentUserId?: string;
}

interface FormioFormInstance {
  submit: () => void;
  getValue: () => { data: AttendanceFormData };
  setValue: (value: { data: AttendanceFormData }) => void;
  redraw: () => void;
  getComponent: (key: string) => {
    setValue: (value: any, options?: { noUpdateEvent?: boolean }) => void;
    redraw: () => void;
  } | null;
}

interface AttendanceRequestFormV2Props {
  onClose: () => void;
  selectedDate?: Date | string;
  schema?: any; // Optional: Backend can provide custom schema
  schemaUrl?: string; // Optional: URL to fetch schema from backend
}

const AttendanceRequestFormV2: React.FC<AttendanceRequestFormV2Props> = ({
  onClose,
  selectedDate = new Date(),
  schema: propSchema,
  schemaUrl,
}) => {
  const { setRefetchAttendance } = useGlobalStore();
  const formAddressInstance = useRef<FormioFormInstance | null>(null);

  const [isForOthers, setIsForOthers] = useState(false);
  const [formSchema, setFormSchema] = useState<any>(
    propSchema || defaultFormSchema
  );
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);

  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data: userRoles } = useGetUserRoles();

  const mutation = useCreateNewAttendanceRequest();

  // Fetch schema from backend if schemaUrl is provided
  useEffect(() => {
    if (schemaUrl && !propSchema) {
      setIsSchemaLoading(true);
      fetch(schemaUrl)
        .then((res) => res.json())
        .then((data) => {
          setFormSchema(data.message || data);
          setIsSchemaLoading(false);
        })
        .catch((error) => {
          console.error("Failed to fetch schema:", error);
          toast.error("Failed to load form schema");
          setIsSchemaLoading(false);
        });
    }
  }, [schemaUrl, propSchema]);

  // Update schema when propSchema changes
  useEffect(() => {
    if (propSchema) {
      setFormSchema(propSchema);
    }
  }, [propSchema]);

  // Update hidden fields when isForOthers or currentEmployee changes
  useEffect(() => {
    if (formAddressInstance.current) {
      const isForOthersComponent =
        formAddressInstance.current.getComponent("isForOthers");
      const currentEmployeeIdComponent =
        formAddressInstance.current.getComponent("currentEmployeeId");
      const currentUserIdComponent =
        formAddressInstance.current.getComponent("currentUserId");

      if (isForOthersComponent) {
        isForOthersComponent.setValue(isForOthers, { noUpdateEvent: true });
      }
      if (currentEmployeeIdComponent && currentEmployee?.employee) {
        currentEmployeeIdComponent.setValue(currentEmployee.employee, {
          noUpdateEvent: true,
        });
      }
      if (currentUserIdComponent && currentEmployee?.user_id) {
        currentUserIdComponent.setValue(currentEmployee.user_id, {
          noUpdateEvent: true,
        });
      }

      // Force redraw to update conditional fields
      formAddressInstance.current?.redraw();
    }
  }, [isForOthers, currentEmployee]);

  const formatTime = (date: Date | string | undefined): string | undefined => {
    if (!date) return undefined;
    const d = new Date(date);
    return d.toLocaleTimeString("en-GB");
  };

  type CustomError = Error & {
    response?: { data?: { exception?: string } };
  };

  const handleSubmit = async (submission: { data: AttendanceFormData }) => {
    const baseBody = {
      custom_request_type: submission.data.request_type,
      company: isForOthers
        ? submission.data.company
        : currentEmployee?.company,
      employee: isForOthers
        ? submission.data.employee
        : currentEmployee?.employee,
      explanation: submission.data.message,
      ...(submission.data.from_date && {
        from_date: formatDateToYYYYMMDD(new Date(submission.data.from_date)),
      }),
      ...(submission.data.to_date && {
        to_date: formatDateToYYYYMMDD(new Date(submission.data.to_date)),
      }),
    };

    let requestBody: any = { ...baseBody };

    switch (submission.data.request_type) {
      case "Clockin":
        requestBody = {
          ...baseBody,
          to_date: baseBody.from_date,
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom__request_reason: submission.data.custom__request_reason,
          custom_location: submission?.data?.custom_location,
        };
        break;
      case "Out Duty":
        requestBody = {
          ...baseBody,
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          custom__request_reason: submission.data.custom__request_reason,
          overnight_out_duty: submission.data.overnight_out_duty || false,
        };
        break;

      case "Short Attendance Request":
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(
            new Date(submission.data.from_date || new Date())
          ),
          to_date: formatDateToYYYYMMDD(
            new Date(submission.data.to_date || new Date())
          ),
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          custom__request_reason: submission.data.custom__request_reason,
        };
        break;

      case "Attendance Adjustment":
        requestBody = {
          ...baseBody,
          from_date: formatDateToYYYYMMDD(
            new Date(submission.data.from_date || new Date())
          ),
          to_date: formatDateToYYYYMMDD(
            new Date(submission.data.to_date || new Date())
          ),
          custom_from_time: formatTime(submission.data.custom_from_time),
          custom_to_time: formatTime(submission.data.custom_to_time),
          custom__request_reason: submission.data.custom__request_reason,
          custom_location: submission?.data?.custom_location,
        };
        break;

      case "Shift Change":
        requestBody = {
          ...baseBody,
          select_shift: submission.data.select_shift,
        };
        break;
    }

    if (
      submission.data.attachments?.[0] &&
      submission?.data?.attachments?.length > 0
    ) {
      requestBody.custom_attachment = submission.data?.attachments?.[0]?.url;
    }

    mutation.mutate(requestBody as Record<string, unknown>, {
      onSuccess: () => {
        onClose();
        setTimeout(() => {
          setRefetchAttendance(true);
        }, 2000);
        toast.success("Added Attendance Request successfully!");
      },
      onError: (error: CustomError) => {
        const errorMessage =
          error?.response?.data?.exception
            ?.split(":")
            .slice(1)
            .join(":")
            .trim() || "Something went wrong!!";
        const cleanString = DOMPurify.sanitize(errorMessage || "");
        toast.error(<span dangerouslySetInnerHTML={{ __html: cleanString }} />);
        console.error(error);
      },
    });
  };

  // Handle form change
  const handleFormChange = (submission: any) => {
    // Auto-sync from_date to to_date for certain request types
    if (submission?.changed?.component?.key === "from_date") {
      const formInstance = formAddressInstance.current;
      if (formInstance) {
        const fromDateValue = submission?.data?.from_date;
        const toDateComponent = formInstance.getComponent("to_date");
        if (toDateComponent && fromDateValue) {
          toDateComponent.setValue(fromDateValue, {
            noUpdateEvent: true,
          });
          toDateComponent.redraw();
        }
      }
    }
  };

  if (isSchemaLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="w-8 h-8 border-4 border-t-transparent border-black rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-gray-800">
            Create Attendance Request
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 md:px-4 pt-4 pb-32 md:pb-6">
          {userRoles?.roles["Employee Direct Manager"] ? (
            <div className="flex bg-white rounded-lg p-1 mt-2 border border-gray-200">
              <button
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${
                  !isForOthers ? "bg-black text-white" : ""
                }`}
                onClick={() => setIsForOthers(false)}
              >
                Self
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-gray-500 ${
                  isForOthers ? "bg-black text-white" : ""
                }`}
                onClick={() => setIsForOthers(true)}
              >
                For Others
              </button>
            </div>
          ) : null}
          <Form
            form={formSchema}
            submission={{
              data: {
                from_date: selectedDate,
                to_date: selectedDate,
                isForOthers: isForOthers,
                currentEmployeeId: currentEmployee?.employee || "",
                currentUserId: currentEmployee?.user_id || "",
              },
            }}
            onSubmit={handleSubmit}
            options={{
              builder: { styles: false },
              submitButton: false,
              noAlerts: true,
            }}
            onChange={handleFormChange}
            onFormReady={(instance: any) => {
              formAddressInstance.current = instance;

              try {
                const rootEl: HTMLElement | Document =
                  (instance && instance.element) || document;

                const flatInputs: NodeListOf<HTMLInputElement> = (
                  rootEl as HTMLElement
                ).querySelectorAll
                  ? (rootEl as HTMLElement).querySelectorAll(
                      "input.flatpickr-input"
                    )
                  : document.querySelectorAll("input.flatpickr-input");

                flatInputs.forEach((input) => {
                  const handler = () => {
                    flatInputs.forEach((other) => {
                      if (other !== input && (other as any)._flatpickr) {
                        try {
                          (other as any)._flatpickr.close();
                        } catch (err) {
                          console.error("flatpickr close failed", err);
                        }
                      }
                    });
                  };

                  // avoid adding duplicate listeners
                  if (!(input as any).__closeOtherFPHandler) {
                    input.addEventListener("focus", handler);
                    (input as any).__closeOtherFPHandler = handler;
                  }
                });
              } catch (err) {
                // non-fatal: attach failed, but app continues
                console.warn("flatpickr focus bind failed", err);
              }
            }}
            className="formio-no-border address-form-container mt-4"
          />
        </div>

        {/* Submit Bar */}
        <div className="fixed md:static bottom-0 w-full bg-white border-t shadow-md p-4 z-20">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => formAddressInstance.current?.submit()}
              className="flex-1 w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
            >
              {mutation.isPending ? (
                <div className="w-5 h-5 my-0 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                "Submit"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceRequestFormV2;
