import React from "react";
import { Form } from "@tsed/react-formio";

const formSchema = {
  components: [
    {
      type: "textfield",
      key: "pwianName",
      label: "PWian Name",
      placeholder: "Enter here",
      validate: { required: true },
      input: true,
    },
    {
      type: "textfield",
      key: "pwianId",
      label: "PWian ID",
      placeholder: "Enter here",
      validate: { required: true },
      input: true,
    },
    {
      type: "textfield",
      key: "bankAccountNumber",
      label: "Bank Account Number",
      placeholder: "Enter here",
      validate: { required: true },
      input: true,
    },
    {
      type: "textfield",
      key: "ifsc",
      label: "IFSC",
      placeholder: "Enter here",
      validate: { required: true },
      input: true,
    },
    {
      type: "textfield",
      key: "accountHolderName",
      label: "Account Holder's Name",
      placeholder: "Enter here",
      validate: { required: true },
      input: true,
    },
    {
      type: "radio",
      key: "isJointAccount",
      label: "Is it a joint account?",
      values: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
      validate: { required: true },
      input: true,
      inline: true,
    },
    {
      type: "file",
      key: "bankProof",
      label: "Attach bank account proof",
      storage: "base64",
      validate: { required: true },
      input: true,
    },
  ],
};

const InitiateForm: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSubmit = (submission: any) => {
    console.log("Form submission:", submission.data);
  };

  return (
    <div className="flex flex-col bg-white">
      <div className="overflow-y-auto">
        <Form form={formSchema} onSubmit={handleSubmit} />
      </div>

      <div className=" bg-white border-t py-3 mt-2 flex justify-end gap-3">
        <button
          className="px-4 w-full py-3 border border-gray-400 text-gray-700 rounded-lg text-sm font-medium"
          onClick={() => console.log("Save as draft clicked")}
        >
          SAVE AS DRAFT
        </button>
        <button
          className="px-4 w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-medium"
          onClick={() => console.log("Submit clicked")}
        >
          SUBMIT
        </button>
      </div>
    </div>
  );
};

export default InitiateForm;
