import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, X } from "lucide-react";

import { Formio } from "formiojs";

interface ExpenseItem {
  id: string;
  type: string;
  date: string;
  amount: number;
  description: string;
  imageUrl?: string; // This will hold either the uploaded URL or a local object URL
  fileObject?: File; // To store the actual File object for local preview
}

const MOCK_EXPENSE_ITEMS: ExpenseItem[] = [
  {
    id: "exp1",
    type: "Travel",
    date: "2024-07-28",
    amount: 150.0,
    description: "Flight to San Francisco",
    imageUrl: "https://placehold.co/80x80/e0e0e0/000000?text=Receipt", // Placeholder image
  },
];

const newExpenseItemFormSchema = {
  display: "form",
  components: [
    {
      label: "Expense Type",
      tableView: true,
      dataSrc: "values",
      data: {
        values: [
          { label: "Travel", value: "Travel" },
          { label: "Food", value: "Food" },
          { label: "Accommodation", value: "Accommodation" },
          { label: "Supplies", value: "Supplies" },
          { label: "Other", value: "Other" },
        ],
      },
      key: "expenseType",
      type: "select",
      input: true,
      widget: "html5",
      placeholder: "Select type...",
      validate: {
        required: true,
      },
    },
    {
      label: "Amount",
      tableView: true,
      validate: {
        required: true,
        min: 0,
        pattern: "\\d+(\\.\\d{1,2})?",
      },
      key: "amount",
      type: "number",
      input: true,
      decimalLimit: 2,
      allowDecimals: true,
      placeholder: "0.00",
    },
    {
      label: "Description",
      tableView: true,
      validate: {
        required: true,
      },
      key: "description",
      type: "textarea",
      input: true,
      rows: 3,
      placeholder: "Add a description...",
    },
    {
      label: "Date",
      tableView: true,
      validate: {
        required: true,
      },
      key: "date",
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
      label: "Attachments",
      tableView: false,
      webcam: true,
      fileTypes: [
        { label: "Images", value: "image/*" },
        { label: "Documents", value: "application/*" },
      ],
      image: true,
      imageSize: "200",
      storage: "base64",
      key: "attachments",
      type: "file",
      input: true,
      tooltip: "Upload receipts or supporting documents.",
    },
  ],
};

interface FormioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (submission: any, fileObject?: File | null) => void; // Changed here
}

const FormioNewExpenseItemModal: React.FC<FormioModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  // Ref to the DOM element where Form.io will render
  const formioContainerRef = useRef<HTMLDivElement>(null);
  // Ref to the Form.io instance itself
  const formInstanceRef = useRef<any>(null);
  // localFile state is less critical for base64 previews
  const [localFile, setLocalFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen && formioContainerRef.current) {
      Formio.createForm(formioContainerRef.current, newExpenseItemFormSchema, {
        // We ensure no buttons are rendered by Form.io itself.
        render: {
          submit: false,
          cancel: false,
        },
      })
        .then((form: any) => {
          formInstanceRef.current = form;

          // When storage is 'base64', the 'change' event on attachments will already contain the data URI.
          form.on("change", (submission: any) => {
            if (submission.data && submission.data.attachments && submission.data.attachments.length > 0) {
                const attachment = submission.data.attachments[0];
                if (attachment.url && attachment.url.startsWith('data:')) {
                    // Form.io has provided the data URI for preview
                    console.log("Attachment data URI available for preview:", attachment.url.substring(0, 50) + '...');
                    // No need to createObjectURL here, as Formio gives us the full data URI
                    // If you *still* wanted the File object for some other reason:
                    // You'd need to convert the data URI back to a Blob/File, which is more complex.
                } else if (attachment.file instanceof File) {
                    // This branch might still be useful if Form.io happens to pass the File object alongside data URI
                    setLocalFile(attachment.file);
                }
            } else {
                setLocalFile(null); // No attachment or cleared
            }
          });

          // Attach a listener to Form.io's 'submit' event.
          // This event fires AFTER Form.io's internal validation passes.
          form.on("submit", (submission: any) => {
            console.log("Form.io internal submit event fired:", submission);
            // We'll pass `submission.data` and still pass `localFile` if it was set (though less critical now).
            onSubmit(submission.data, localFile); // Pass the validated data to parent
            onClose(); // Close modal after successful submission
          });

          // Attach a listener for validation errors (optional, but helpful for debugging)
          form.on("error", (errors: any) => {
            console.error("Form.io validation errors:", errors);
            // Form.io should automatically show errors on the fields.
            // You could also add a global notification here if you wish.
            alert("Please correct the errors in the form.");
          });
        })
        .catch((err: any) => {
          console.error("Error creating Form.io form:", err);
        });

      // Cleanup function: Destroy the Form.io instance when the modal closes or component unmounts
      return () => {
        if (formInstanceRef.current) {
          formInstanceRef.current.destroy();
          formInstanceRef.current = null;
        }
      };
    }
  }, [isOpen, onSubmit, onClose]);

  // Function to handle our custom "Save" button click
  const handleSaveClick = () => {
    if (formInstanceRef.current) {
      // Trigger Form.io's submission process.
      // This will internally validate and then fire the 'submit' event if valid.
      formInstanceRef.current.submit();
    } else {
      console.warn("Form.io instance not ready yet for submission.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-xl w-full max-w-md p-6 shadow-lg flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
          <h2 className="text-lg m-auto font-semibold text-gray-800">
            New Expense Item
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Form.io Form will be rendered into this div */}
        <div className="flex-grow" ref={formioContainerRef}>
          {/* Form.io will inject its HTML here */}
        </div>

        {/* Action Buttons (Managed by React, styled like original UI) */}
        <div className="flex justify-between space-x-4 pt-6 border-t border-gray-200 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveClick} // This button triggers Form.io's submission
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ... (Rest of your GeneralExpenseClaim component remains unchanged) ...

const GeneralExpenseClaim: React.FC = () => {
  const navigate = useNavigate();
  const [expenseItems, setExpenseItems] =
    useState<ExpenseItem[]>(MOCK_EXPENSE_ITEMS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // objectUrls ref can be removed if you are not using URL.createObjectURL anymore.
   const objectUrls = useRef<Record<string, string>>({}); 

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleDeleteItem = useCallback(
      (id: string) => {
        setExpenseItems((prevItems) => {
          const itemToDelete = prevItems.find((item) => item.id === id);
          // If you were using URL.createObjectURL for some images, keep this part.
          // If strictly using base64, this might not be needed.
          if (itemToDelete && itemToDelete.imageUrl && itemToDelete.imageUrl.startsWith('blob:')) {
              const urlToRevoke = objectUrls.current[itemToDelete.id];
              if (urlToRevoke) {
                  URL.revokeObjectURL(urlToRevoke);
                  delete objectUrls.current[itemToDelete.id];
              }
          }
          return prevItems.filter((item) => item.id !== id);
        });
      },
      []
    );

  const handleAddExpenseItem = useCallback(
      (formData: any, fileObjectFromModal: File | null | undefined) => {
      // Form.io submission data comes as an object (formData here is submission.data from the modal)
      const newId = `exp${expenseItems.length + 1}-${Date.now()}`;
      let imageUrl = "https://placehold.co/80x80/e0e0e0/000000?text=Receipt";
      let fileForState: File | undefined = undefined; // This will likely remain undefined with base64 storage

      // If Form.io is configured for 'base64' storage, formData.attachments[0]?.url will already be a data URI
      if (formData.attachments && formData.attachments.length > 0) {
        // Use the URL provided by Form.io, which will be the data URI (base64)
        imageUrl = formData.attachments[0]?.url || imageUrl;
        // The fileObjectFromModal will likely be null/undefined, as Formio doesn't expose the raw File object directly
        // when converting to base64 internally for the submission data.
        fileForState = fileObjectFromModal || undefined; // Assign if available, otherwise undefined
      }
      setExpenseItems((prevItems) => [
        ...prevItems,
        {
          id: newId,
          type: formData.expenseType,
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
          imageUrl: imageUrl, // This will now be the base64 data URI if an image was selected
          fileObject: fileForState, // Remains for potential future use or debugging
        },
      ]);
      setIsModalOpen(false); // Close modal after adding
    },
    [expenseItems.length]
  );

  // Calculate summary totals
  const totalAmount = expenseItems.reduce((sum, item) => sum + item.amount, 0);
  const advances = 0; // Mock value
  const netPayable = totalAmount - advances;

   // Cleanup effect for object URLs (keep if you potentially use URL.createObjectURL elsewhere)
    useEffect(() => {
      return () => {
        for (const id in objectUrls.current) {
          URL.revokeObjectURL(objectUrls.current[id]);
        }
      };
    }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* New Expense Item Modal with Form.io */}
      <FormioNewExpenseItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddExpenseItem}
      />

      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl m-auto font-bold text-gray-900">
            General Expense Claim
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center space-x-4">
          <div className="flex-shrink-0 p-3 bg-gray-200 rounded-full">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-user h-6 w-6 text-gray-600"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">John Doe</p>
            <p className="text-sm text-gray-600">Sales Department</p>
          </div>
        </div>

        {/* Expense Travel Policy */}
        <div className="bg-white p-4">
          <label
            htmlFor="expensePolicy"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Expense Travel Policy (Optional)
          </label>
          <select
            id="expensePolicy"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none "
          >
            <option value="">Select Policy...</option>
            <option value="policyA">Policy A - Domestic Travel</option>
            <option value="policyB">Policy B - International Travel</option>
            <option value="policyC">Policy C - Local Commute</option>
          </select>
        </div>

        {/* Expense Items Section */}
        <div className="bg-white p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Expense Items
          </h2>
          <div className="space-y-4">
            {expenseItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No expense items added yet.
              </p>
            ) : (
              expenseItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-gray-900">{item.type}</p>
                    <p className="text-sm text-gray-600">Date: {item.date}</p>
                    <p className="text-sm text-gray-600">
                      Amount: {item.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt="Receipt"
                        className="w-22 h-22 object-cover rounded-md flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src =
                            "https://placehold.co/80x80/e0e0e0/000000?text=Error";
                        }}
                      />
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 mt-[-60px] rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      aria-label={`Delete ${item.type} expense`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center py-3 mt-4 border border-gray-300 rounded-3xl text-blue-600 font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl mr-2">+</span> Add Expense Item
          </button>
        </div>

        {/* Summary Section */}
        <div className="bg-white p-4 space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount</span>
              <span className="font-medium">{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Advances</span>
              <span className="font-medium">{advances.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg border-t pt-2 mt-2">
              <span>Net Payable</span>
              <span>{netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer Buttons */}
      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={() => console.log("Save as Draft clicked")}
            className="flex-1 py-3 rounded-3xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Save as Draft
          </button>
          <button
            onClick={() => console.log("Submit clicked")}
            className="flex-1 py-3 rounded-3xl bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralExpenseClaim;
