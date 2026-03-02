/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from "react";
import { Form } from "@tsed/react-formio";
import { Typography } from "../shared/atoms/Typography";
import { useCreateNomination } from "../../services/recognitionService";
import toast from "react-hot-toast";
import Button from "../shared/atoms/Button";

interface NominationFormPanelProps {
  awardName: string;
  formSchema: any;
  onSuccess: () => void;
}

export const NominationFormPanel: React.FC<NominationFormPanelProps> = ({
  awardName,
  formSchema,
  onSuccess,
}) => {
  const formRef = useRef<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const createNomination = useCreateNomination();

  const handleSubmit = async () => {
    if (!formRef.current) {
      toast.error("Form not ready yet.");
      return;
    }
    if (submitting) return;

    let submission: any;
    try {
      submission = await formRef.current.submit();
    } catch {
      toast.error("Please check your form inputs and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await createNomination.mutateAsync({
        award: awardName,
        form_data: submission.data || submission,
      });
      toast.success("Nomination submitted successfully!");
      onSuccess();
    } catch (err: any) {
      const message =
        err?.response?.data?.exc_type === "ValidationError"
          ? err.response.data._server_messages
            ? JSON.parse(JSON.parse(err.response.data._server_messages)[0])
                .message
            : err.message
          : err?.message || "Failed to submit nomination";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Typography variant="bodyMedium" className="font-semibold">
        Submit Nomination
      </Typography>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <Form
          form={formSchema}
          onFormReady={(instance: any) => {
            formRef.current = instance;
          }}
          options={{
            submitButton: false,
            validateOnInit: false,
            validateOnBlur: false,
            validateOnChange: false,
          }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          size="md"
          loading={submitting}
          disabled={submitting}
        >
          Submit Nomination
        </Button>
      </div>
    </div>
  );
};
