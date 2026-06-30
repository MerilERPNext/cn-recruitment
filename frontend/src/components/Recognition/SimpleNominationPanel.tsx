import React, { useMemo, useState } from "react";
import { Typography } from "../shared/atoms/Typography";
import SearchableSelect from "../shared/SearchableSelect";
import {
  useCreateEmployeeAppreciation,
  useEligibleReceivers,
} from "../../services/recognitionService";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import Button from "../shared/atoms/Button";
import toast from "react-hot-toast";

// Local YYYY-MM-DD for the date input default.
const todayISO = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

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
  const createAppreciation = useCreateEmployeeAppreciation();

  // Eligible receivers the current employee may nominate within this program.
  const { data: currentUser } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const { data: receiversData, isLoading: receiversLoading } =
    useEligibleReceivers(currentUser?.employee, awardName);

  const receiverOptions = useMemo(
    () =>
      (receiversData?.eligible_receivers ?? []).map((r) => ({
        value: r.employee,
        label: r.designation
          ? `${r.employee_name} (${r.employee}) — ${r.designation}`
          : `${r.employee_name} (${r.employee})`,
      })),
    [receiversData],
  );

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast.error("Please select an employee to appreciate.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const res = await createAppreciation.mutateAsync({
        employee: selectedEmployee,
        program_name: awardName,
        given_by: currentUser?.employee,
        note: reason || undefined,
        date: todayISO(),
      });
      if (res?.success) {
        toast.success(
          res.message || `${selectedName || "Employee"} appreciated successfully!`,
        );
        setSelectedEmployee("");
        setSelectedName("");
        setReason("");
        onSuccess();
      } else {
        toast.error(res?.message || "Failed to submit appreciation");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?._server_messages
          ? JSON.parse(JSON.parse(err.response.data._server_messages)[0]).message
          : err?.message || "Failed to submit appreciation";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Typography variant="bodyMedium" className="font-semibold">
        Appreciate an Employee
      </Typography>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Select Employee</label>
          <SearchableSelect
            options={receiverOptions}
            value={selectedEmployee}
            onChange={(id) => {
              setSelectedEmployee(id);
              const match = receiversData?.eligible_receivers.find(
                (r) => r.employee === id,
              );
              setSelectedName(match?.employee_name || id);
            }}
            placeholder={
              receiversLoading
                ? "Loading eligible employees..."
                : receiverOptions.length === 0
                  ? "No eligible employees for this program"
                  : "Search by name or ID..."
            }
            disabled={receiversLoading || receiverOptions.length === 0}
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Note (optional)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you appreciating this employee?"
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
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
};
