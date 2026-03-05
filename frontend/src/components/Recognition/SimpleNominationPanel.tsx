import React, { useState } from "react";
import { Typography } from "../shared/atoms/Typography";
import { EmployeeSelector } from "./EmployeeSelector";
import { useCreateNomination } from "../../services/recognitionService";
import Button from "../shared/atoms/Button";
import toast from "react-hot-toast";

interface SimpleNominationPanelProps {
  awardName: string;
  onSuccess: () => void;
}

export const SimpleNominationPanel: React.FC<SimpleNominationPanelProps> = ({
  awardName,
  onSuccess,
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const createNomination = useCreateNomination();

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee to nominate.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      await createNomination.mutateAsync({
        award: awardName,
        form_data: {
          nominee: selectedEmployee,
          reason: reason || undefined,
        },
      });
      toast.success(`${selectedName || "Employee"} nominated successfully!`);
      setSelectedEmployee("");
      setSelectedName("");
      setReason("");
      onSuccess();
    } catch (err: any) {
      const message =
        err?.response?.data?._server_messages
          ? JSON.parse(JSON.parse(err.response.data._server_messages)[0]).message
          : err?.message || "Failed to submit nomination";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Typography variant="bodyMedium" className="font-semibold">
        Nominate an Employee
      </Typography>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Select Employee</label>
          <EmployeeSelector
            value={selectedEmployee}
            onChange={(id, name) => {
              setSelectedEmployee(id);
              setSelectedName(name || "");
            }}
            placeholder="Search by name or ID..."
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Reason (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you nominating this employee?"
            className="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={3}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            size="md"
            loading={submitting}
            disabled={submitting || !selectedEmployee}
          >
            Submit Nomination
          </Button>
        </div>
      </div>
    </div>
  );
};
