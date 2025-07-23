import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Formio } from "formiojs";

// =============================================================================
// Form.io Schemas - Split into three parts for interleaved rendering
// =============================================================================

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
      widget: "html5",
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
      widget: "html5",
      placeholder: "Select Category",
      validate: {
        required: true,
      },
    },
  ],
};

// Schema for Travel Fields (Distance/Odometer) - includes hidden field for conditional logic
const travelFieldsSchema = {
  display: "form",
  components: [
    {
      type: "hidden",
      key: "travelTypeHidden",
      defaultValue: "distance", // Default value to match initial state
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
        json: { '==': [{ var: 'data.travelTypeHidden' }, 'distance'] },
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
        json: { '==': [{ var: 'data.travelTypeHidden' }, 'odometer'] },
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
        json: { '==': [{ var: 'data.travelTypeHidden' }, 'odometer'] },
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

// =============================================================================
// MileageExpense Component
// =============================================================================
const MileageExpense: React.FC = () => {
  const navigate = useNavigate();

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

  // States to hold form data from each Form.io instance
  // These states are primarily for React to react to changes,
  // the actual submission data will be collected directly from form instances.
  const [basicDetailsFormData, setBasicDetailsFormData] = useState<any>({});
  const [travelFieldsFormData, setTravelFieldsFormData] = useState<any>({});
  const [notesFormData, setNotesFormData] = useState<any>({});

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
          form.on("change", (submission: any) => {
            setBasicDetailsFormData(submission.data);
          });
          form.on("error", (errors: any) => {
            console.error("Basic Details Form.io validation errors:", errors);
            // alert("Please correct the errors in Basic Details form."); // Use custom modal in real app
          });
        })
        .catch((err: any) => console.error("Error creating Basic Details Form.io form:", err));

      return () => {
        if (basicDetailsFormInstanceRef.current) {
          basicDetailsFormInstanceRef.current.destroy();
          basicDetailsFormInstanceRef.current = null;
        }
      };
    }
  }, []); // Empty dependency array: create once on mount

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
            setTravelFieldsFormData(submission.data);
          });
          form.on("error", (errors: any) => {
            console.error("Travel Fields Form.io validation errors:", errors);
            // alert("Please correct the errors in Travel Fields form."); // Use custom modal in real app
          });
        })
        .catch((err: any) => console.error("Error creating Travel Fields Form.io form:", err));

      return () => {
        if (travelFieldsFormInstanceRef.current) {
          travelFieldsFormInstanceRef.current.destroy();
          travelFieldsFormInstanceRef.current = null;
        }
      };
    }
  }, []); // Empty dependency array: create once on mount

  // Effect to initialize Notes Form.io instance
  useEffect(() => {
    if (notesRef.current) {
      Formio.createForm(notesRef.current, notesSchema, {
        render: { submit: false, cancel: false },
      })
        .then((form: any) => {
          notesFormInstanceRef.current = form;
          form.submission = { data: {} };
          form.on("change", (submission: any) => {
            setNotesFormData(submission.data);
          });
          form.on("error", (errors: any) => {
            console.error("Notes Form.io validation errors:", errors);
            // alert("Please correct the errors in Notes form."); // Use custom modal in real app
          });
        })
        .catch((err: any) => console.error("Error creating Notes Form.io form:", err));

      return () => {
        if (notesFormInstanceRef.current) {
          notesFormInstanceRef.current.destroy();
          notesFormInstanceRef.current = null;
        }
      };
    }
  }, []); // Empty dependency array: create once on mount

  // Effect to update Form.io's hidden travelType field when React state changes
  // This triggers Form.io's conditional logic without re-creating the whole form
  useEffect(() => {
    if (travelFieldsFormInstanceRef.current) {
      travelFieldsFormInstanceRef.current.setSubmission({
        data: {
          ...travelFieldsFormInstanceRef.current.submission.data,
          travelTypeHidden: travelType,
        },
      });
    }
  }, [travelType]); // Only re-run when travelType changes

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
    let isValid = true;
    const allFormData: any = {};

    // Trigger validation and get data from each Form.io instance
    // We explicitly call .submit() to trigger validation and get the latest data.
    // The .submit() method returns a Promise that resolves with the submission object.
    try {
      if (basicDetailsFormInstanceRef.current) {
        const basicSubmission = await basicDetailsFormInstanceRef.current.submit();
        console.log("Basic Details Submission:", basicSubmission); // Added log
        if (!basicSubmission.isValid) isValid = false;
        Object.assign(allFormData, basicSubmission.data);
      }
      if (travelFieldsFormInstanceRef.current) {
        const travelSubmission = await travelFieldsFormInstanceRef.current.submit();
        console.log("Travel Fields Submission:", travelSubmission); // Added log
        if (!travelSubmission.isValid) isValid = false;
        Object.assign(allFormData, travelSubmission.data);
      }
      if (notesFormInstanceRef.current) {
        const notesSubmission = await notesFormInstanceRef.current.submit();
        console.log("Notes Submission:", notesSubmission); // Added log
        if (!notesSubmission.isValid) isValid = false;
        Object.assign(allFormData, notesSubmission.data);
      }
    } catch (error) {
      // Catching errors from Form.io's submit method (e.g., validation errors)
      console.error("Form submission error:", error);
      isValid = false; // Ensure isValid is false if an error occurs during submission
    }


    console.log("Overall isValid status:", isValid); // Added log
    if (isValid) {
      // This is the console log you want to see with the combined form data
      console.log("Mileage Expense Submitted Data:", allFormData);
      alert("Mileage Expense Submitted!"); // Use a custom modal in a real app
      // Optionally reset all forms here after successful submission
      // basicDetailsFormInstanceRef.current.submission = { data: {} };
      // travelFieldsFormInstanceRef.current.submission = { data: { travelTypeHidden: travelType } };
      // notesFormInstanceRef.current.submission = { data: {} };
    } else {
      alert("Please correct the errors in the form.");
    }
  }, [travelType]); // Added travelType to dependency array as it influences conditional fields


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl m-auto font-bold text-gray-900">
            Mileage Expense
          </h1>
        </div>
      </div>

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
              ${calculatedAmount.toFixed(2)}
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


