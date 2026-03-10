/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";
import { Form } from "@tsed/react-formio";
import Button from "../../../shared/atoms/Button";
import { Typography } from "../../../shared/atoms/Typography";
import {
  useEditITDeclaration,
  useEditValueITDeclaration,
} from "../../../../hooks/payroll/useEditITDeclaration";

import itDeclarationSchema from "./editITDeclarationForm.json";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  empdoc_id: string | null;
};

const EditITDeclarationAccess = ({
  isOpen,
  onClose,
  empdoc_id,
}: Props) => {
  const formInstance = useRef<any>(null);

  const mutation = useEditITDeclaration();
  const { data: editValueITDeclaration } =
    useEditValueITDeclaration(empdoc_id);

  /** 🔹 Load backend default values */
  useEffect(() => {
    if (!formInstance.current) return;
    if (!editValueITDeclaration) return;

    formInstance.current.setSubmission({
      data: {
        status: editValueITDeclaration.status || "",
        declaration_type: editValueITDeclaration.type || "",
        from_date:
          editValueITDeclaration.individual_start_date || "",
        to_date:
          editValueITDeclaration.individual_end_date || "",
      },
    });
  }, [editValueITDeclaration]);

  /** 🔹 Submit */
  const handleSubmit = async () => {
    try {
      const submission = await formInstance.current?.submit();

      const data = submission?.data;

      if (!data) return;

      await mutation.mutateAsync({
        empdoc_id,
        declaration_type: data.declaration_type,
        status: data.status,
        from_date: data.from_date,
        to_date: data.to_date,
      });

      onClose();
    } catch (error) {
      console.error("Submission failed", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">

      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg  max-w-xl p-4">

        {/* Header */}
        <div className="flex justify-between mb-4">
          <div>
            <Typography variant="body" className="font-bold">
              Edit IT Declaration Access
            </Typography>

            <p className="text-sm text-gray-500">
              Update configuration and access period for employees.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 text-xl"
          >
            ✕
          </button>
        </div>

        {/* FormIO */}
        <Form
          form={itDeclarationSchema}
          options={{ submitButton: false, noAlerts: true }}
          onFormReady={(instance: any) => {
            formInstance.current = instance;

            if (editValueITDeclaration) {
              instance.setSubmission({
                data: {
                  status: editValueITDeclaration.status || "",
                  declaration_type:
                    editValueITDeclaration.type || "",
                  from_date:
                    editValueITDeclaration.individual_start_date ||
                    "",
                  to_date:
                    editValueITDeclaration.individual_end_date ||
                    "",
                },
              });
            }
          }}
        />

        {/* Footer */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded"
          >
            Cancel
          </button>

          <Button variant="contain" size="md" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditITDeclarationAccess;