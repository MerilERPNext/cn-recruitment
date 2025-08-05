/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { Formio } from "formiojs";
import HeaderBar from "../HeaderBar";
import {
  useDailyAllowancesVehicleCategories,
  useExpenseTypes,
} from "../../hooks/useExpense";
import ExpensesUserInfo from "./ExpensesUserInfo";

interface MileageExpenseData {
  expenseDate: string;
  purpose: string;
  travelTypeHidden: "distance" | "odometer";
  distance?: number;
  startOdometer?: number;
  endOdometer?: number;
  startOdometerAttachment?: any[]; // Or a more specific Form.io file type
  endOdometerAttachment?: any[];
  notes?: string;
}

// Schema for Basic Expense Details

// Helper function to create the file attachment component configuration
const createOdometerAttachmentField = (key: string, label: string) => ({
  label,
  key,
  type: "file",
  storage: "base64",
  tableView: false,
  input: true,
  webcam: false,
  validate: {
    required: false,
  },
  fileTypes: [
    { label: "Images", value: "image/*" },
    { label: "Documents", value: "application/*" },
  ],
  image: true,
  conditional: {
    json: { "==": [{ var: "data.travelTypeHidden" }, "odometer"] },
  },
  fileViewTemplate: `<div class="flex items-center space-x-2"><a class="text-blue-600 underline" href="\${url}" target="_blank" rel="noreferrer">\${originalName}</a></div>`,
});

// Schema for travel fields with conditional file uploads
const travelFieldsSchema = {
  display: "form",
  components: [
    {
      type: "hidden",
      key: "travelTypeHidden",
      defaultValue: "distance",
      input: true,
    },
    {
      label: "Distance (in KM)",
      tableView: true,
      validate: {
        required: true,
        min: 0,
        pattern: "\\d+(\\.\\d{1,2})?",
      },
      key: "distance",
      type: "number",
      input: true,
      decimalLimit: 2,
      allowDecimals: true,
      placeholder: "Enter Distance",
      conditional: {
        json: { "==": [{ var: "data.travelTypeHidden" }, "distance"] },
      },
    },
    {
      label: "Odometer Start Reading",
      tableView: true,
      validate: {
        required: true,
        min: 0,
        pattern: "\\d+(\\.\\d{1,2})?",
      },
      key: "startOdometer",
      type: "number",
      input: true,
      decimalLimit: 2,
      allowDecimals: true,
      placeholder: "Enter Start Reading",
      conditional: {
        json: { "==": [{ var: "data.travelTypeHidden" }, "odometer"] },
      },
    },
    // Use the helper function to define the file attachment fields
    createOdometerAttachmentField(
      "startOdometerAttachment",
      "Start Reading Attachment"
    ),
    {
      label: "Odometer End Reading",
      tableView: true,
      validate: {
        required: true,
        min: 0,
        pattern: "\\d+(\\.\\d{1,2})?",
      },
      key: "endOdometer",
      type: "number",
      input: true,
      decimalLimit: 2,
      allowDecimals: true,
      placeholder: "Enter End Reading",
      conditional: {
        json: { "==": [{ var: "data.travelTypeHidden" }, "odometer"] },
      },
    },
    // Use the helper function again for the end attachment
    createOdometerAttachmentField(
      "endOdometerAttachment",
      "End Reading Attachment"
    ),
  ],
};

// Schema for Notes (Unchanged)
const notesSchema = {
  display: "form",
  components: [
    {
      label: "Notes (Optional)",
      tableView: true,
      key: "notes",
      type: "textarea",
      input: true,
      rows: 4,
      placeholder: "Add any additional notes",
    },
  ],
};

const MileageExpense: React.FC = () => {
  const navigate = useNavigate();
  const CURRENCY_SYMBOL = "₹";
  const basicDetailsRef = useRef<HTMLDivElement>(null);
  const basicDetailsFormInstanceRef = useRef<any>(null);
  const travelFieldsRef = useRef<HTMLDivElement>(null);
  const travelFieldsFormInstanceRef = useRef<any>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const notesFormInstanceRef = useRef<any>(null);
  const vehicleCategory = useDailyAllowancesVehicleCategories();
  const filters = [["custom_is_mileage", "=", "1"]];
  const expenseType = useExpenseTypes(filters as any);

  const basicDetailsSchema = useMemo(() => {
    return {
      display: "form",
      components: [
        {
          label: "Expense Date",
          tableView: true,
          validate: {
            required: true,
          },
          key: "expenseDate",
          type: "datetime",
          input: true,
          format: "yyyy-MM-dd",
          enableTime: false,
          widget: {
            type: "calendar",
            altInput: true,
            dateFormat: "yyyy-MM-dd",
            enableTime: false,
            mode: "single",
          },
          defaultValue: new Date().toISOString().slice(0, 10),
        },
        {
          label: "Vehicle Category",
          tableView: true,
          dataSrc: "values",
          data: {
            values: vehicleCategory?.data?.map((policy: any) => ({
              value: policy?.name,
              label: policy?.name,
            })),
          },
          key: "vehicleCategory",
          type: "select",
          input: true,
          customClass: "appearance-none",
          placeholder: "Select Category",
          validate: {
            required: true,
          },
        },
        {
          label: "Expense Category",
          key: "expense-category",
          tableView: true,
          dataSrc: "values",
          data: {
            values: expenseType?.data?.map((policy: any) => ({
              value: policy?.name,
              label: policy?.name,
            })),
          },
          type: "select",
          input: true,
          customClass: "appearance-none",
          placeholder: "Select Category",
          validate: {
            required: true,
          },
        },
      ],
    };
  }, [vehicleCategory, expenseType]);

  const [travelType, setTravelType] = useState<"distance" | "odometer">(
    "distance"
  );
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  const [travelFieldsFormData, setTravelFieldsFormData] = useState<any>({});

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const calculateAmount = useCallback((dist: number) => {
    const ratePerKm = 10.0;
    return dist * ratePerKm;
  }, []);

  // Effect to initialize Basic Details Form.io instance
  useEffect(() => {
    if (basicDetailsRef.current) {
      Formio.createForm(basicDetailsRef.current, basicDetailsSchema, {
        render: { submit: false, cancel: false },
      })
        .then((form: any) => {
          basicDetailsFormInstanceRef.current = form;
          form.submission = { data: {} };
          form.on("error", (errors: any) => {
            console.error("Basic Details Form.io validation errors:", errors);
          });
        })
        .catch((err: any) =>
          console.error("Error creating Basic Details Form.io form:", err)
        );
      return () => {
        if (basicDetailsFormInstanceRef.current) {
          basicDetailsFormInstanceRef.current.destroy();
          basicDetailsFormInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Effect to initialize Travel Fields Form.io instance
  useEffect(() => {
    if (travelFieldsRef.current) {
      Formio.createForm(travelFieldsRef.current, travelFieldsSchema, {
        render: { submit: false, cancel: false },
      })
        .then((form: any) => {
          travelFieldsFormInstanceRef.current = form;
          form.submission = { data: { travelTypeHidden: travelType } };
          form.on("change", (submission: any) => {
            setTravelFieldsFormData(submission.data);
            // Removed logic to manage file previews as Formio handles it now
          });
          form.on("error", (errors: any) => {
            console.error("Travel Fields Form.io validation errors:", errors);
          });
        })
        .catch((err: any) =>
          console.error("Error creating Travel Fields Form.io form:", err)
        );

      return () => {
        if (travelFieldsFormInstanceRef.current) {
          travelFieldsFormInstanceRef.current.destroy();
          travelFieldsFormInstanceRef.current = null;
        }
      };
    }
  }, [travelType]);

  // Effect to initialize Notes Form.io instance
  useEffect(() => {
    if (notesRef.current) {
      Formio.createForm(notesRef.current, notesSchema, {
        render: { submit: false, cancel: false },
      })
        .then((form: any) => {
          notesFormInstanceRef.current = form;
          form.submission = { data: {} };
          form.on("error", (errors: any) => {
            console.error("Notes Form.io validation errors:", errors);
          });
        })
        .catch((err: any) =>
          console.error("Error creating Notes Form.io form:", err)
        );
      return () => {
        if (notesFormInstanceRef.current) {
          notesFormInstanceRef.current.destroy();
          notesFormInstanceRef.current = null;
        }
      };
    }
  }, []);

  // Effect to update travelTypeHidden in the Form.io instance when travelType changes
  useEffect(() => {
    if (travelFieldsFormInstanceRef.current) {
      travelFieldsFormInstanceRef.current.setSubmission({
        data: {
          ...travelFieldsFormInstanceRef.current.submission.data,
          travelTypeHidden: travelType,
        },
      });
    }
  }, [travelType]);

  // Effect to update calculated amount when relevant form data changes
  useEffect(() => {
    let distanceValue = 0;
    if (travelType === "distance") {
      distanceValue = parseFloat(travelFieldsFormData.distance) || 0;
    } else {
      const startOdometer = parseFloat(travelFieldsFormData.startOdometer) || 0;
      const endOdometer = parseFloat(travelFieldsFormData.endOdometer) || 0;
      distanceValue = endOdometer - startOdometer;
    }
    setCalculatedAmount(calculateAmount(distanceValue));
  }, [travelFieldsFormData, travelType, calculateAmount]);

  // Handle overall form submission
  const handleSubmit = useCallback(async () => {
    const allFormData: Partial<MileageExpenseData> = {};
    try {
      // First, submit each form individually to trigger validation
      const basicSubmission =
        await basicDetailsFormInstanceRef.current.submit();
      const travelSubmission =
        await travelFieldsFormInstanceRef.current.submit();
      const notesSubmission = await notesFormInstanceRef.current.submit();

      // If all submissions are successful, merge the data
      Object.assign(
        allFormData,
        basicSubmission.data,
        travelSubmission.data,
        notesSubmission.data
      );

      console.log("Mileage Expense Submitted Data:", allFormData);
      // Here you would typically send allFormData to your backend,
      // which now includes the file data encoded in base64.
    } catch (error) {
      console.error("Form submission error:", error);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <HeaderBar title="Mileage Expense" onBack={handleBack} />
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <ExpensesUserInfo />
        {/* Basic Expense Details Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Expense Details
          </h2>
          <div ref={basicDetailsRef}></div>
        </div>

        {/* Type of Travel Section - React controlled UI */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Type of Travel
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setTravelType("distance");
              }}
              className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-colors ${
                travelType === "distance"
                  ? "bg-black text-white shadow"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              Distance Travelled
            </button>
            <button
              onClick={() => setTravelType("odometer")}
              className={`flex-1 py-2 text-center rounded-md text-sm font-medium transition-colors ${
                travelType === "odometer"
                  ? "bg-black text-white shadow"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              Odometer Reading
            </button>
          </div>
          <div ref={travelFieldsRef}></div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-base font-medium text-gray-900">
              Calculated Amount
            </span>
            <span className="text-lg font-bold text-gray-900">
              {CURRENCY_SYMBOL}
              {calculatedAmount.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
          <div ref={notesRef}></div>
        </div>
      </div>

      {/* Footer Actions - Submit button */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default MileageExpense;
