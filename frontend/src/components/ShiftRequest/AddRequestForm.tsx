import React from "react";
import {ArrowLeft} from "lucide-react";
import {Form} from "@tsed/react-formio";
import {useNavigate} from "react-router";
import {useShiftTypes} from "../../hooks/useShift";

const ShiftChangeForm: React.FC = () => {
  const navigate = useNavigate();
  const { data: shiftTypes, isLoading, error } = useShiftTypes();
  console.log(shiftTypes,"=======")

  const handleBack = () => navigate(-1);

  if (isLoading) return <div>Loading shifts…</div>;
  if (error)
    return (
      <div className="text-red-600">
        Error loading shifts: {error.message}
      </div>
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
                type: "datetime" as const,
                key: "fromDate",
                label: "From Date",
                input: true,
                format: "dd/MM/yyyy",
                enableDate: true,
                enableTime: false,
                defaultValue: "2024-05-10",
              },
            ],
          },
          {
            components: [
              {
                type: "datetime" as const,
                key: "toDate",
                label: "To Date",
                input: true,
                format: "dd/MM/yyyy",
                enableDate: true,
                enableTime: false,
                defaultValue: "2024-05-10",
              },
            ],
          },
        ],
      },
      {
        type: "select" as const,
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
      },
      {
        type: "textarea" as const,
        key: "reason",
        label: "Reason",
        placeholder: "Enter reason",
        input: true,
      },
      {
        type: "button" as const,
        action: "submit",
        label: "Submit",
        theme: "primary",
        block: true,
        key: "submitButton",
        customClass: "text-sm flex justify-center",
      },
    ],
  };

  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <ArrowLeft
          onClick={handleBack}
          className="w-6 h-6 text-gray-600 cursor-pointer"
        />
        <div className="text-xl font-sans font-bold">Shift Request Form</div>
      </header>
      <div className="max-w-full mx-auto p-4">
        <Form form={formSchema} />
      </div>
    </div>
  );
};

export default ShiftChangeForm;
