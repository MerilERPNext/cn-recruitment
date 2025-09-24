import React, { useRef, useMemo, useEffect } from "react";
import { Form } from "@tsed/react-formio";
import "formiojs/dist/formio.form.css";
import { X } from "lucide-react";
import { useGetLeaveBalance } from "../../hooks/useLeaves";
import { useLoggedInUser } from "../../hooks/useLoggedInUser";
import { useEmployeeByUserId } from "../../hooks/useEmployee";

interface ReplaceLeaveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReplace: (data: any) => void;
  currentLeaveType?: string;
  currentLeaveName?: string;
}

const ReplaceLeaveOverlay: React.FC<ReplaceLeaveOverlayProps> = ({
  isOpen,
  onClose,
  onReplace,
  currentLeaveType,
  currentLeaveName,
}) => {
  const { data: userId } = useLoggedInUser();
  const { data: currentEmployee } = useEmployeeByUserId(userId);
  const today = new Date().toISOString().split("T")[0];
  const { data: leaveBalanceData } = useGetLeaveBalance(
    currentEmployee?.name,
    today
  );
  console.log(currentLeaveName);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);

  const leaveTypeOptions = useMemo(() => {
    if (!leaveBalanceData?.leave_balance)
      return [{ label: "Select Leave Type", value: "" }];

    return [
      { label: "Select Leave Type", value: "" },
      ...leaveBalanceData.leave_balance
        .filter(
          (entry) =>
            entry.dont_show_in_frontend === 0 && entry.type !== currentLeaveType
        )
        .map((entry) => ({
          label: entry.type,
          value: entry.type,
        })),
    ];
  }, [leaveBalanceData, currentLeaveType]);

  const leaveForm = useMemo(
    () => ({
      components: [
        {
          type: "checkbox",
          key: "replaceBoth",
          label: "Replace Both Halves Separately",
          input: true,
          labelPosition: "right",
          customClass: "mb-4",
        },
        {
          type: "select",
          key: "newLeaveType",
          label: 'New Leave Type <span style="color:red">*</span>',
          placeholder: "Select Leave Type",
          input: true,
          validate: {
            required: true,
            customMessage: "New Leave Type is required",
          },
          showRequiredIndicator: true,
          data: { values: leaveTypeOptions },
          conditional: { show: true, when: "replaceBoth", eq: false },
          selectConfiguration: { appendToBody: true, dropdownParent: null },
          html: true,
        },
        {
          type: "select",
          key: "firstHalfType",
          label: 'First Half Leave Type <span style="color:red">*</span>',
          placeholder: "Select Leave Type",
          input: true,
          validate: {
            required: true,
            customMessage: "First Half Type is required",
          },
          showRequiredIndicator: true,
          data: { values: leaveTypeOptions },
          conditional: { show: true, when: "replaceBoth", eq: true },
          selectConfiguration: { appendToBody: true, dropdownParent: null },
          html: true,
        },
        {
          type: "select",
          key: "secondHalfType",
          label: 'Second Half Leave Type <span style="color:red">*</span>',
          placeholder: "Select Leave Type",
          input: true,
          validate: {
            required: true,
            customMessage: "Second Half Type is required",
          },
          showRequiredIndicator: true,
          data: { values: leaveTypeOptions },
          conditional: { show: true, when: "replaceBoth", eq: true },
          selectConfiguration: { appendToBody: true, dropdownParent: null },
          html: true,
        },
      ],
    }),
    [leaveTypeOptions]
  );

  useEffect(() => {
    if (formRef.current) {
      formRef.current.redraw();
    }
  }, [isOpen]);

  const handleReplace = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFormSubmit = (submission: any) => {
    onReplace(submission.data);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center md:items-center items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="bg-white md:rounded-xl rounded-t-xl shadow-md w-full max-w-md relative pb-3">
        <div className="flex justify-between items-center border-b px-4 py-4">
          <h2 className="text-lg font-semibold">Replace Leave Type</h2>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <Form
            form={leaveForm}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
            onSubmit={handleFormSubmit}
            options={{
              builder: { styles: false },
              submitButton: false,
              alerts: false,
              validateOnInit: false,
              validateOnBlur: true,
              validateOnChange: false,
              formClass: "space-y-4",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200",
            }}
          />
          <button
            onClick={handleReplace}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplaceLeaveOverlay;
