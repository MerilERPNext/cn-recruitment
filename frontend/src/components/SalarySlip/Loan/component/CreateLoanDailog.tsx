import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import {
  useCurrentEmployeeAllDetails,
  useGetAllEmployees,
} from "../../../../hooks/useEmployee";
import useCurrentUser from "../../../../hooks/useCurrentUser";

interface CreateLoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateLoanDialog({
  isOpen,
  onClose,
}: CreateLoanDialogProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: currentEmployee } = useCurrentEmployeeAllDetails(
    currentUser?.name as string
  );
  const { data: employeeList } = useGetAllEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formRef = useRef<any>(null);
  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();
    const formData = submission?.data;
    console.log("Submitted Loan Form Data", formData);
    // Call API here
  };
  const handleEmployeeChange = (event: { data: { employee: string } }) => {
    const employeeId = event?.data?.employee || "";
    setSelectedEmployee(employeeId);

    console.log(employeeId, "--------");
  };

  //  applicant type, applicant, company, posting date, loan appliction, branch, repay from salary

  const createLoanFormSchema = {
    type: "form",
    display: "form",
    components: [
      {
        key: "loanPanel",
        customClass: "py-4 px-12",
        components: [
          {
            type: "columns",
            columns: [
              {
                width: "100%",
                components: [
                  {
                    type: "select",
                    key: "applicant_type",
                    label: "Applicant Type",
                    placeholder: "Select Applicant Type",
                    validate: { required: true },
                    input: true,
                    data: {
                      values: [
                        { label: "Employee", value: "Employee" },
                        { label: "Member", value: "Member" },
                        { label: "Customer", value: "Customer" },
                      ],
                    },
                    customClass: "w-full",
                  },
                  {
                    label: "Company",
                    key: "company",
                    type: "textfield",
                    input: true,
                    placeholder: !selectedEmployee
                      ? "Select an employee first"
                      : "Loading company information...",
                    customClass: "mb-4",
                    disabled: true,
                    defaultValue: currentEmployee?.company || "Not Assigned",
                    value: currentEmployee?.company || "Not Assigned",
                    clearOnHide: false,
                  },
                  {
                    // this nees to be updated with dynamic values
                    type: "select",
                    key: "loan_application",
                    label: "Loan Application",
                    placeholder: "Select Loan Application",
                    validate: { required: true },
                    input: true,
                    data: {
                      values: [
                        { label: "Education Loan", value: "Education Loan" },
                        { label: "Home Loan", value: "Home Loan" },
                        { label: "Personal Loan", value: "Personal Loan" },
                        { label: "Car Loan", value: "Car Loan" },
                      ],
                    },
                    customClass: "mb-6 w-full",
                  },
                ],
              },
              {
                width: "100%",
                components: [
                  {
                    label: "Applicant",
                    key: "applicant",
                    type: "select",
                    input: true,
                    placeholder: "Select Applicant",
                    customClass: "mb-4",
                    onChange: handleEmployeeChange,
                    validate: { required: true },
                    data: {
                      values:
                        employeeList && employeeList?.length > 0
                          ? employeeList?.map(
                              (item: {
                                name: string;
                                employee_name: string;
                              }) => ({
                                label: `${item?.employee_name} (${item?.name})`,
                                value: item?.name,
                              })
                            )
                          : [],
                    },
                  },

                  {
                    type: "datetime",
                    key: "posting_date",
                    label: "Posting Date",
                    input: true,
                    enableTime: false,
                    validate: { required: true },
                    customClass: "mb-6",
                  },
                  {
                    type: "number",
                    key: "rateOfInterest",
                    label: "Rate of Interest (%)",
                    validate: {
                      required: true,
                      min: 0,
                      max: 100,
                      step: 0.01,
                    },
                    input: true,
                    customClass: "mb-6",
                  },
                ],
              },
            ],
            customClass: "grid grid-cols-1 md:grid-cols-2 gap-6",
          },
        ],
      },
    ],
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onMouseDown={() => {
        if (onClose) {
          onClose();
        }
      }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-20">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Loan
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        {/* Dialog Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-20">
          <Form
            form={createLoanFormSchema}
            options={{
              submitButton: false,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
          />
        </div>
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 z-50 border-t border-gray-200">
          <button
            onClick={() => {
              handleSubmit();
            }}
            className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit Request
          </button>
        </div>
      </div>
    </div>
  );
}
