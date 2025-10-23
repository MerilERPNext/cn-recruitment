/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { Form } from "@tsed/react-formio";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import { useShiftTypes, useCreateShiftRequest, useShiftRequestById, useUpdateShiftRequest } from "../../hooks/useShift";
import { useCurrentEmployee } from "../../hooks/useEmployee";
import HeaderBar from "../HeaderBar";

import type { ShiftRequestFormData, FormioSubmission } from "../../types/shift";
import { useGlobalStore } from "../../hooks/useGlobalStore";

interface ShiftRequestFormModalProps {
  onClose?: () => void;
}

const ShiftChangeForm: React.FC<ShiftRequestFormModalProps> = ({ onClose }) => {
  const { setRefetchAttendance } = useGlobalStore();

  const { id } = useParams<{ id: string }>();

  
  const { data : ShiftRequest , isLoading : loadingShiftRequest , error : ShiftRequestError } = useShiftRequestById(id as string);

  useEffect(()=>{
    console.log("Shift Request Data in Edit Form:", ShiftRequest);
  },[ShiftRequest]);
  const navigate = useNavigate();
  const formRef = useRef<any>(null);

  const { data: shiftTypes, isLoading, error } = useShiftTypes();
  const { mutate: updateShiftRequest } = useUpdateShiftRequest();
  const { data: employeeDetails } = useCurrentEmployee();

  const handleBack = () => navigate(-1);

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
        reason,
        status: "Draft",
        employee: employeeDetails.name,
        shift_request_approver: employeeDetails.shift_request_approver,
      };


      updateShiftRequest({ doctype: "", name: id as string, data : payload}, {
        onSuccess: () => {
          onClose?.();
          setTimeout(() => {
            setRefetchAttendance(true);
          }, 1000);
          navigate("/webapp/shift-request/shift-list");
        },
        onError: () => {
          console.error("Failed to update shift request.");
        },
      });
    } catch (error: any) {
      console.error("Form updating failed:", error);

      if (error?.details) {
        console.error("Please fill all required fields.");
      } else {
        console.error("Something went wrong.");
      }
    }
  };

  if (isLoading || loadingShiftRequest ) return <div>Loading shift…</div>;
  if (error)
    return (
      <div className="text-red-600">Error loading shift: {error.message}</div>
    );

  const formSchema = {
    title: "Request Shift Change",
    name: "requestShiftChange",
    path: "request-shift-change",
    display: "form",
    components: [
      {
        type: "columns" as const,
        key: "dateRange",
        label: "Date Range",
        columns: [
          {
            components: [
              {
                type: "datetime",
                key: "fromDate",
                label: "From Date",
                input: true,
                format: "dd/MM/yyyy",
                enableDate: true,
                enableTime: false,
                defaultValue: ShiftRequest?.from_date || new Date().toISOString(),
                validate: { required: true },
              },
            ],
          },
          {
            components: [
              {
                type: "datetime",
                key: "toDate",
                label: "To Date",
                input: true,
                format: "dd/MM/yyyy",
                enableDate: true,
                enableTime: false,
                defaultValue: ShiftRequest?.to_date || new Date().toISOString(),
                validate: { required: true },
              },
            ],
          },
        ],
      },
      {
        type: "select",
        key: "shiftType",
        label: "Shift Type",
        input: true,
        placeholder: "Select shift type",
        data: {
          values: shiftTypes?.data.map((s) => ({
            label: s?.name,
            value: s?.name,
          })),
        },
        validate: { required: true },
        defaultValue: ShiftRequest?.shift_type || "",
      },
      {
        type: "textarea",
        key: "reason",
        label: "Reason",
        placeholder: "Enter reason",
        input: true,
        validate: { required: true },
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <HeaderBar title={`Shift Request Form `} onBack={handleBack} />

      <div className="flex-1 p-4 overflow-y-auto">
        <Form
          form={formSchema}
          options={{ submitButton: false }}
          onFormReady={(instance: any) => {
            formRef.current = instance;
          }}
        />
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 z-50">
        <button
          onClick={handleSubmit}
          className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
        >
          Resubmit Request
        </button>
      </div>
    </div>
  );
};

export default ShiftChangeForm;
