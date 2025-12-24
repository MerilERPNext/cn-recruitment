"use client";

import { useRef, useMemo } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import Button from "../../shared/atoms/Button";
import toast from "react-hot-toast";
import extraPaymentFormSchema from "./extraPaymentFormSchema.json";

interface ExtraPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ExtraPaymentForm({
  isOpen,
  onClose,
  onSuccess,
}: ExtraPaymentFormProps) {
  const formRef = useRef<any>(null);

  const initialSubmission = useMemo(() => {
    return {
      data: {
        currency: "INR",
        type: "Fixed",
      },
    };
  }, []);

  const handleSubmit = async () => {
    const submission = await formRef.current?.submit();

    if (!submission?.data) {
      toast.error("Failed to submit extra payment");
      return;
    }

    const payload = {
      ...submission.data,
    };

    console.log("Extra Payment Payload:", payload);

    toast.success("Extra Payment created successfully");
    onClose();
    onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div onMouseDown={onClose}>
      <div
        className="w-full h-full md:h-auto md:max-w-4xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-20">
          <h2 className="text-xl font-semibold">Create Extra Payment</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <X />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto pb-25 pt-5 px-6">
          <Form
            form={extraPaymentFormSchema}
            submission={initialSubmission}
            options={{ submitButton: false }}
            onFormReady={(instance: any) => {
              formRef.current = instance;
            }}
          />
        </div>

        {/* Footer */}
        <div className="fixed md:static bottom-0 right-0 w-full bg-white py-4 px-4 border-t">
          <Button
            onClick={handleSubmit}
            fullWidth
            size="lg"
            variant="contain"
            bgColor="blue-600"
            textColor="white"
            className="hover:bg-blue-700 font-medium"
          >
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}
