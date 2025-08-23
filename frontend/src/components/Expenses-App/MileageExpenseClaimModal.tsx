/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { File as FileIcon, FileText, Trash2 } from "lucide-react";
import defaultReceipt from "../../assets/Receipt.svg";

import { Form } from "@tsed/react-formio";
import FormioNewExpenseItemModal from "./FormioNewExpenseItemModal";
import { useExpenseTravelPolicies } from "../../hooks/useExpense";
import ExpensesUserInfo from "./ExpensesUserInfo";

interface MileageItem {
  id: string;
  fromLocation: string;
  toLocation: string;
  distance: number;
  rate: number;
  amount: number;
  date: string;
  purpose: string;
  attachmentUrl?: string;
  attachmentType?: string;
  fileName?: string;
  fileObject?: File;
}

interface MileageExpenseClaimModalProps {
  onClose?: () => void;
}

const MileageExpenseClaimModal: React.FC<MileageExpenseClaimModalProps> = ({ onClose }) => {
  const CURRENCY_SYMBOL = "₹";
  const [mileageItems, setMileageItems] = useState<MileageItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const objectUrls = useRef<Record<string, string>>({}); // Using a ref to hold object URLs for cleanup

  const ExpenseTravelPolicies = useExpenseTravelPolicies();

  const ExpenseTravelPoliciesForm = useMemo(() => {
    return {
      components: [
        {
          type: "select",
          key: "travel_policy",
          label: "Expense Travel Policy (Optional)",
          input: true,
          validate: { required: true },
          placeholder: "Local Commute",
          data: {
            values: ExpenseTravelPolicies?.data?.map((policy: any) => ({
              value: policy?.name,
              label: policy?.name,
            })),
          },
          customClass: "appearance-none",
        },
      ],
    };
  }, [ExpenseTravelPolicies]);

  const MileageForm = useMemo(() => {
    return {
      components: [
        {
          type: "textfield",
          key: "from_location",
          label: "From Location",
          input: true,
          validate: { required: true },
          placeholder: "Enter starting location",
        },
        {
          type: "textfield",
          key: "to_location",
          label: "To Location",
          input: true,
          validate: { required: true },
          placeholder: "Enter destination",
        },
        {
          type: "number",
          key: "distance",
          label: "Distance (KM)",
          input: true,
          validate: { required: true, min: 0 },
          placeholder: "0",
        },
        {
          type: "number",
          key: "rate",
          label: "Rate per KM (₹)",
          input: true,
          validate: { required: true, min: 0 },
          placeholder: "0.00",
          defaultValue: 10,
        },
        {
          type: "datetime",
          key: "date",
          label: "Travel Date",
          input: true,
          validate: { required: true },
          format: "dd-MM-yyyy",
          enableTime: false,
          placeholder: "Select Date",
        },
        {
          type: "textarea",
          key: "purpose",
          label: "Purpose of Travel",
          input: true,
          validate: { required: true },
          placeholder: "Enter purpose of travel",
          rows: 3,
        },
      ],
    };
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setMileageItems((prevItems) => {
      const itemToDelete = prevItems.find((item) => item.id === id);
      if (
        itemToDelete &&
        itemToDelete.attachmentUrl &&
        itemToDelete.attachmentUrl.startsWith("blob:")
      ) {
        const urlToRevoke = objectUrls.current[itemToDelete.id];
        if (urlToRevoke) {
          URL.revokeObjectURL(urlToRevoke);
          delete objectUrls.current[itemToDelete.id];
        }
      }
      return prevItems.filter((item) => item.id !== id);
    });
  }, []);

  const handleAddMileageItem = useCallback(
    (formData: any, fileObjectFromModal: File | null | undefined) => {
      const newId = `mile${mileageItems.length + 1}-${Date.now()}`;
      let attachmentUrl: string = defaultReceipt;
      let attachmentType: string = "image/png";
      let fileName: string | undefined;

      if (fileObjectFromModal) {
        attachmentUrl = URL.createObjectURL(fileObjectFromModal);
        objectUrls.current[newId] = attachmentUrl;
        attachmentType = fileObjectFromModal.type;
        fileName = fileObjectFromModal.name;
      } else if (formData.attachments && formData.attachments.length > 0) {
        const attachedFile = formData.attachments[0];
        attachmentUrl = attachedFile.url || attachmentUrl;
        attachmentType = attachedFile.type || attachmentType;
        fileName = attachedFile.name || undefined;
      }

      setMileageItems((prevItems) => [
        ...prevItems,
        {
          id: newId,
          fromLocation: formData.from_location,
          toLocation: formData.to_location,
          distance: parseFloat(formData.distance),
          rate: parseFloat(formData.rate),
          amount: parseFloat(formData.distance) * parseFloat(formData.rate),
          date: formData.date,
          purpose: formData.purpose,
          attachmentUrl: attachmentUrl,
          attachmentType: attachmentType,
          fileName: fileName,
          fileObject: fileObjectFromModal || undefined,
        },
      ]);
      setIsModalOpen(false);
    },
    [mileageItems.length]
  );

  const [formData, setFormData] = useState<any>({});

  const handleMileageFormSubmission = useCallback((submission: any) => {
    const data = submission.data;
    const distance = parseFloat(data.distance) || 0;
    const rate = parseFloat(data.rate) || 0;
    const calculatedAmount = distance * rate;

    setFormData({
      ...data,
      amount: calculatedAmount,
    });
  }, []);

  const handleAddItem = useCallback(() => {
    if (formData.from_location && formData.to_location && formData.distance && formData.rate && formData.date && formData.purpose) {
      const newId = `mile${mileageItems.length + 1}-${Date.now()}`;
      
      setMileageItems((prevItems) => [
        ...prevItems,
        {
          id: newId,
          fromLocation: formData.from_location,
          toLocation: formData.to_location,
          distance: parseFloat(formData.distance),
          rate: parseFloat(formData.rate),
          amount: parseFloat(formData.distance) * parseFloat(formData.rate),
          date: formData.date,
          purpose: formData.purpose,
          attachmentUrl: defaultReceipt,
          attachmentType: "image/png",
        },
      ]);

      // Reset form
      setFormData({});
    } else {
      alert("Please fill in all required fields");
    }
  }, [formData, mileageItems.length]);

  const totalAmount = mileageItems.reduce((sum, item) => sum + item.amount, 0);
  const advances = 0;
  const netPayable = totalAmount - advances;

  useEffect(() => {
    return () => {
      for (const id in objectUrls.current) {
        if (objectUrls.current[id].startsWith("blob:")) {
          URL.revokeObjectURL(objectUrls.current[id]);
        }
      }
    };
  }, []);

  return (
    <div className="bg-gray-50 flex flex-col font-sans">
      <FormioNewExpenseItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddMileageItem}
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 flex-grow w-full">
        <ExpensesUserInfo />
        
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <Form
            form={ExpenseTravelPoliciesForm}
            options={{
              builder: { styles: false },
              submitButton: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            className="space-y-6"
          />
        </div>

        {/* Mileage Entry Form */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Add Mileage Entry
          </h2>
          <Form
            form={MileageForm}
            onSubmit={handleMileageFormSubmission}
            onChange={handleMileageFormSubmission}
            options={{
              builder: { styles: false },
              submitButton: false,
              formClass: "space-y-6",
              rowClass: "flex flex-col",
              labelClass: "mb-1 font-medium text-gray-700",
              inputClass:
                "border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-200",
              validateOnInit: false,
              validateOnBlur: false,
              validateOnChange: false,
            }}
            className="space-y-6"
          />
          
          {formData.distance && formData.rate && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                Calculated Amount: {CURRENCY_SYMBOL}{(parseFloat(formData.distance) * parseFloat(formData.rate)).toFixed(2)}
              </p>
            </div>
          )}

          <button
            onClick={handleAddItem}
            className="w-full flex items-center justify-center py-2 mt-4 border border-gray-300 rounded-lg font-medium bg-black"
          >
            <span className="text-lg mr-2 text-white">+ Add Mileage Entry</span>
          </button>
        </div>

        {/* Mileage Items */}
        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Mileage Entries
          </h2>
          <div className="space-y-4">
            {mileageItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No mileage entries added yet.
              </p>
            ) : (
              mileageItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex flex-col space-y-1">
                    <p className="font-medium text-gray-900">
                      {item.fromLocation} → {item.toLocation}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {new Date(item.date)
                        .toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                        .replace(/\//g, "-")}
                    </p>
                    <p className="text-sm text-gray-600">
                      Distance: {item.distance} KM × Rate: {CURRENCY_SYMBOL}{item.rate.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Amount: {CURRENCY_SYMBOL}{item.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Purpose: {item.purpose}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        download={item.fileName || "download"}
                        className="w-22 h-22 flex-shrink-0 cursor-pointer"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.attachmentType?.startsWith("image/") ? (
                          <img
                            src={item.attachmentUrl}
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src =
                                "https://placehold.co/80x80/e0e0e0/000000?text=Error";
                            }}
                          />
                        ) : item.attachmentType?.startsWith("application/") ||
                          item.attachmentType?.startsWith("text/") ? (
                          <div className="w-22 h-22 bg-gray-100 rounded-md flex flex-col items-center justify-center p-2 text-gray-600 text-center text-xs border border-gray-300">
                            {item.attachmentType?.includes("pdf") ? (
                              <FileText className="h-8 w-8 text-red-500 mb-1" />
                            ) : item.attachmentType?.includes("word") ||
                              item.attachmentType?.includes("document") ? (
                              <FileText className="h-8 w-8 text-blue-500 mb-1" />
                            ) : item.attachmentType?.includes("excel") ||
                              item.attachmentType?.includes("sheet") ? (
                              <FileText className="h-8 w-8 text-green-500 mb-1" />
                            ) : (
                              <FileIcon className="h-8 w-8 text-gray-500 mb-1" />
                            )}
                            <span className="truncate w-full font-medium">
                              {item.fileName || "Document"}
                            </span>
                          </div>
                        ) : (
                          <img
                            src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                            alt="Receipt"
                            className="w-22 h-22 object-cover rounded-md"
                          />
                        )}
                      </a>
                    )}
                    {!item.attachmentUrl && (
                      <img
                        src="https://placehold.co/80x80/e0e0e0/000000?text=Receipt"
                        alt="Receipt"
                        className="w-22 h-22 object-cover rounded-md flex-shrink-0"
                      />
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 mt-[-60px] rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                      aria-label={`Delete mileage entry`}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-2">
            <div className="flex justify-between text-gray-700">
              <span>Total Amount</span>
              <span className="font-medium">
                {CURRENCY_SYMBOL}
                {totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span>Advances</span>
              <span className="font-medium">
                {CURRENCY_SYMBOL}
                {advances.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-lg border-t pt-2 mt-2">
              <span>Net Payable</span>
              <span>
                {CURRENCY_SYMBOL}
                {netPayable.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t shadow-lg py-4 px-4 w-full">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <button
            onClick={() => console.log("Submit clicked")}
            className="flex-1 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default MileageExpenseClaimModal;
