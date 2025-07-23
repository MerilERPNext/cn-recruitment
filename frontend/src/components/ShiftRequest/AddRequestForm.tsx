import { ArrowLeft } from "lucide-react";
import { Form } from "react-formio";
import { useNavigate } from "react-router";

const formSchema = {
  title: "Request Shift Change",
  name: "requestShiftChange",
  path: "request-shift-change",
  display: "form",
  components: [
    {
      type: "columns",
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
              defaultValue: "2024-05-10",
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
              defaultValue: "2024-05-10",
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
        values: [
          { label: "Morning Shift", value: "morning" },
          { label: "Evening Shift", value: "evening" },
          { label: "Night Shift", value: "night" },
        ],
      },
    },
    {
      type: "textarea",
      key: "reason",
      label: "Reason",
      placeholder: "Enter reason",
      input: true,
    },
    {
      type: "button",
      action: "submit",
      label: "Submit",
      theme: "primary",
      block: true,
      key: "submitButton",
      customClass: "text-sm flex justify-center",
    },
  ],
};

const ShiftChangeForm = () => {
  const navigator = useNavigate();
  const handleBack = () => {
    navigator(-1);
  };
  return (
    <div>
      <header className="flex justify-between items-center p-4">
        <ArrowLeft
          onClick={handleBack}
          className="w-6 h-6 text-gray-600 cursor-pointer"
        />
        <div className="text-xl font-sans font-bold">Shift Request Form</div>
        <div></div>
      </header>
      <div style={{ maxWidth: "[100%]", margin: "0 auto", padding: "1rem" }}>
        <Form form={formSchema} />
      </div>
    </div>
  );
};

export default ShiftChangeForm;
