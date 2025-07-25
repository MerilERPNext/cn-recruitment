/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Formio } from "formiojs";
import HeaderBar from "../HeaderBar";

// Schema for Basic Expense Details
const basicDetailsSchema = {
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
        values: [
          { label: "Select Category", value: "" },
          { label: "Car", value: "car" },
          { label: "Motorcycle", value: "motorcycle" },
          { label: "Truck", value: "truck" },
          { label: "Other", value: "other" },
        ],
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
      label: "Fuel Category",
      tableView: true,
      dataSrc: "values",
      data: {
        values: [
          { label: "Select Category", value: "" },
          { label: "Petrol", value: "petrol" },
          { label: "Diesel", value: "diesel" },
          { label: "Electric", value: "electric" },
        ],
      },
      key: "fuelCategory",
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
      label: "Start Odometer (KM)",
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
    {
      label: "End Odometer (KM)",
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
  ],
};

// Schema for Notes
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
  // Refs for each Form.io instance
  const basicDetailsRef = useRef<HTMLDivElement>(null);
  const basicDetailsFormInstanceRef = useRef<any>(null);

  const travelFieldsRef = useRef<HTMLDivElement>(null);
  const travelFieldsFormInstanceRef = useRef<any>(null);

  const notesRef = useRef<HTMLDivElement>(null);
  const notesFormInstanceRef = useRef<any>(null);

  // React states
  const [travelType, setTravelType] = useState<"distance" | "odometer">(
    "distance"
  );
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);

  // Only keep travelFieldsFormData as it's used for calculation
  const [travelFieldsFormData, setTravelFieldsFormData] = useState<any>({});

  // Handler for the back button
  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Function to calculate amount (simple mock logic)
  const calculateAmount = useCallback((dist: number) => {
    const ratePerKm = 10.0; // Example rate
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
          // Removed setBasicDetailsFormData as its value is not read
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
          // Set initial hidden field value
          form.submission = { data: { travelTypeHidden: travelType } };
          form.on("change", (submission: any) => {
            setTravelFieldsFormData(submission.data); // This state is used for calculation
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
  }, []);

  // Effect to initialize Notes Form.io instance
  useEffect(() => {
    if (notesRef.current) {
      Formio.createForm(notesRef.current, notesSchema, {
        render: { submit: false, cancel: false },
      })
        .then((form: any) => {
          notesFormInstanceRef.current = form;
          form.submission = { data: {} };
          // Removed setNotesFormData as its value is not read
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
    const allFormData: any = {};
    try {
      if (basicDetailsFormInstanceRef.current) {
        const basicSubmission =
          await basicDetailsFormInstanceRef.current.submit();
        Object.assign(allFormData, basicSubmission.data);
      }
      if (travelFieldsFormInstanceRef.current) {
        const travelSubmission =
          await travelFieldsFormInstanceRef.current.submit();
        Object.assign(allFormData, travelSubmission.data);
      }
      if (notesFormInstanceRef.current) {
        const notesSubmission = await notesFormInstanceRef.current.submit();
        Object.assign(allFormData, notesSubmission.data);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      // Optionally, you might want to show an error message to the user here
      return; // Stop submission if there are validation errors
    }

    console.log("Mileage Expense Submitted Data:", allFormData);
    // Here you would typically send allFormData to your backend
    // e.g., apiClient.post('/api/mileage-expense', allFormData);
  }, []); // Dependencies remain minimal as Form.io instances handle data gathering

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <HeaderBar title="Mileage Expense" onBack={handleBack} />

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        {/* Basic Expense Details Section */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Basic Expense Details
          </h2>
          {/* Form.io will inject the basic details fields here */}
          <div ref={basicDetailsRef}></div>
        </div>

        {/* Type of Travel Section - React controlled UI */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Type of Travel
          </h2>

          {/* Toggle/Segmented Control */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTravelType("distance")}
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

          {/* Form.io will inject the conditional travel fields here */}
          <div ref={travelFieldsRef}></div>

          {/* Calculated Amount - Displayed outside the form */}
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
          {/* Form.io will inject the notes field here */}
          <div ref={notesRef}></div>
        </div>
      </div>

      {/* Footer Actions - Submit button */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default MileageExpense;
