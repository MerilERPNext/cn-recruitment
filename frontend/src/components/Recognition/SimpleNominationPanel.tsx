import React, { useMemo, useState } from "react";
import { Form } from "@tsed/react-formio";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Typography } from "../shared/atoms/Typography";
import SearchableSelect from "../shared/SearchableSelect";
import {
  useCreateEmployeeAppreciation,
  useEligibleReceivers,
  usePanelForm,
  useRecognitionFlags,
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

// The attached form.io schema ships its own "Submit" button. We drive submission
// from the single panel Submit instead, so strip every button component (nested
// panels/columns included) to leave one submit button on the panel.
type FormioComponent = { type?: string; components?: FormioComponent[]; columns?: { components?: FormioComponent[] }[] };
type FormioSchema = { components?: FormioComponent[] } | null | undefined;

const stripButtons = (comps: FormioComponent[] = []): FormioComponent[] =>
  comps
    .filter((c) => c.type !== "button")
    .map((c) => ({
      ...c,
      ...(Array.isArray(c.components) ? { components: stripButtons(c.components) } : {}),
      ...(Array.isArray(c.columns)
        ? { columns: c.columns.map((col) => ({ ...col, components: stripButtons(col.components) })) }
        : {}),
    }));

const stripSubmitButtons = (schema: FormioSchema): FormioSchema =>
  schema?.components ? { ...schema, components: stripButtons(schema.components) } : schema;

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

  // Minimum characters required in the note (Advanced Settings).
  const { minimumNominationCharacters } = useRecognitionFlags();

  // Optional form attached to the program (attach_form_for_panel_members).
  // Shown below the fields on click when the program has one configured.
  const { data: panelForm } = usePanelForm(awardName);
  const hasPanelForm = !!panelForm?.schema?.components?.length;
  const [showPanelForm, setShowPanelForm] = useState(false);
  const [panelFormData, setPanelFormData] = useState<Record<string, unknown>>({});
  // Render the attached form without its built-in Submit button — the panel's
  // single Submit triggers both the appreciation and this form's data.
  const panelFormSchema = useMemo(
    () => stripSubmitButtons(panelForm?.schema),
    [panelForm?.schema],
  );

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
    if (minimumNominationCharacters > 0 && reason.trim().length < minimumNominationCharacters) {
      toast.error(
        `Note must be at least ${minimumNominationCharacters} character${minimumNominationCharacters > 1 ? "s" : ""}.`,
      );
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
        custom_form_data:
          hasPanelForm && Object.keys(panelFormData).length > 0
            ? JSON.stringify(panelFormData)
            : undefined,
      });
      if (res?.success) {
        toast.success(
          res.message || `${selectedName || "Employee"} appreciated successfully!`,
        );
        setSelectedEmployee("");
        setSelectedName("");
        setReason("");
        setPanelFormData({});
        setShowPanelForm(false);
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
          <label className="text-xs text-gray-500 mb-1 block">
            {minimumNominationCharacters > 0
              ? `Note (min ${minimumNominationCharacters} characters)`
              : "Note (optional)"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you appreciating this employee?"
            className="w-full rounded-lg border border-gray-200 p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            rows={3}
          />
          {minimumNominationCharacters > 0 && (
            <p
              className={`mt-1 text-xs ${
                reason.trim().length < minimumNominationCharacters
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {reason.trim().length}/{minimumNominationCharacters} characters
            </p>
          )}
        </div>

        {/* Optional program-attached form for panel members. Revealed on click. */}
        {hasPanelForm && (
          <div>
            <button
              type="button"
              onClick={() => setShowPanelForm((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg border border-primary-200 bg-primary-50/60 px-3 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50"
            >
              <span>{panelForm?.label || "Additional Form"}</span>
              {showPanelForm ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>

            {showPanelForm && (
              <div className="mt-3 rounded-lg border border-gray-200 p-3">
                <Form
                  form={panelFormSchema as any}
                  submission={{ data: panelFormData }}
                  onChange={(change: any) => {
                    if (change?.data) setPanelFormData(change.data);
                  }}
                />
              </div>
            )}
          </div>
        )}

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
