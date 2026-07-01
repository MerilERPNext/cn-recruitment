import { useMemo, useRef } from "react";
import { X } from "lucide-react";
import { Form } from "@tsed/react-formio";
import { Formio } from "formiojs";
import { toast } from "react-hot-toast";
import Button from "../../shared/atoms/Button";
import {
  useCreateRecognitionProgram,
  useRecognitionProgram,
  useUpdateRecognitionProgram,
  type CreateRecognitionProgramPayload,
} from "../../../services/recognitionService";
import { CREATE_PROGRAM_FORM_SCHEMA } from "./createProgramFormSchema";

// Form.io datetime values arrive as ISO strings -> normalise to YYYY-MM-DD
// using local date parts so the day the user picked is preserved.
const toYmd = (v?: string): string | undefined => {
  if (!v) return undefined;
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return undefined;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// "YYYY-MM-DD" -> ISO datetime form.io can parse for prefill.
const toIso = (ymd?: string): string => (ymd ? `${ymd}T00:00:00` : "");

// Deep-clone the schema and mark the given component keys as disabled.
const withDisabledKeys = (schema: any, keys: string[]): any => {
  const cloned = JSON.parse(JSON.stringify(schema));
  const walk = (components?: any[]) => {
    if (!components) return;
    components.forEach((comp) => {
      if (comp.key && keys.includes(comp.key)) comp.disabled = true;
      if (comp.components) walk(comp.components);
      if (comp.columns) comp.columns.forEach((col: any) => walk(col.components));
    });
  };
  walk(cloned.components);
  return cloned;
};

type CreateProgramModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  /** When set, the modal edits this program instead of creating a new one. */
  editCode?: string | null;
};

const CreateProgramModal: React.FC<CreateProgramModalProps> = ({
  open,
  onClose,
  onSaved,
  editCode,
}) => {
  const formRef = useRef<any>(null);
  const isEdit = !!editCode;

  const { mutate: createProgram, isPending: creating } = useCreateRecognitionProgram();
  const { mutate: updateProgram, isPending: updating } = useUpdateRecognitionProgram();
  const { data: program, isLoading: programLoading } = useRecognitionProgram(
    open && isEdit ? editCode : null,
  );

  // In edit mode the program code is the identifier and can't be changed.
  const schema = useMemo(
    () => (isEdit ? withDisabledKeys(CREATE_PROGRAM_FORM_SCHEMA, ["program_code"]) : CREATE_PROGRAM_FORM_SCHEMA),
    [isEdit],
  );

  const submission = useMemo(() => {
    if (!isEdit || !program) return undefined;
    return {
      data: {
        program_type: program.program_type,
        program_name: program.program_name,
        program_code: program.program_code,
        award_type: program.award_type,
        start_date: toIso(program.start_date),
        end_date: toIso(program.end_date),
        program_description: program.program_description,
        values: program.values,
        is_active: !!program.is_active,
        program_has_reward: !!program.program_has_reward,
        reward_type: program.reward_type,
        points_per_recognition: program.points_per_recognition,
      },
    };
  }, [isEdit, program]);

  if (!open) return null;

  const isPending = creating || updating;

  const handleSubmit = async () => {
    if (!formRef.current) {
      toast.error("Form is not ready yet.");
      return;
    }

    let result: any;
    try {
      result = await formRef.current.submit();
    } catch {
      toast.error("Please fill all required fields.");
      return;
    }

    const d = result?.data ?? {};
    const isAward = d.program_type === "Award";

    if (isEdit && editCode) {
      updateProgram(
        {
          program_code: editCode,
          program_type: d.program_type,
          program_name: (d.program_name || "").trim(),
          program_description: d.program_description || "",
          award_type: isAward ? d.award_type || "Individual" : "Individual",
          start_date: toYmd(d.start_date),
          end_date: toYmd(d.end_date),
          values: d.values || "",
          is_active: d.is_active ? 1 : 0,
          program_has_reward: d.program_has_reward ? 1 : 0,
          reward_type: d.program_has_reward ? d.reward_type || undefined : undefined,
          points_per_recognition: d.program_has_reward ? Number(d.points_per_recognition || 0) : 0,
        },
        {
          onSuccess: () => {
            toast.success("Program updated successfully.");
            onSaved?.();
            onClose();
          },
          onError: (err: unknown) =>
            toast.error((err as Error)?.message || "Failed to update program."),
        },
      );
      return;
    }

    const payload: CreateRecognitionProgramPayload = {
      program_type: d.program_type,
      program_name: (d.program_name || "").trim(),
      program_code: (d.program_code || "").trim(),
      program_description: d.program_description || "",
      award_type: isAward ? d.award_type || "Individual" : "Individual",
      start_date: toYmd(d.start_date),
      end_date: toYmd(d.end_date),
      values: d.values || "",
      is_active: d.is_active ? 1 : 0,
      program_has_reward: d.program_has_reward ? 1 : 0,
      reward_type: d.program_has_reward ? d.reward_type || undefined : undefined,
      points_per_recognition: d.program_has_reward ? Number(d.points_per_recognition || 0) : 0,
    };

    createProgram(payload, {
      onSuccess: () => {
        toast.success("Program created successfully.");
        onSaved?.();
        onClose();
      },
      onError: (err: unknown) =>
        toast.error((err as Error)?.message || "Failed to create program."),
    });
  };

  const formReady = !isEdit || !!submission;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">
            {isEdit ? "Edit Program" : "Create New Program"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {isEdit && programLoading ? (
            <p className="py-10 text-center text-sm text-gray-400">Loading program…</p>
          ) : formReady ? (
            <Form
              key={isEdit ? `edit-${editCode}` : "create"}
              form={schema}
              submission={submission}
              onFormReady={(instance: Formio) => {
                formRef.current = instance;
              }}
              options={{
                submitButton: false,
                validateOnInit: false,
                formClass: "space-y-4",
                labelClass: "mb-1 font-medium text-gray-700",
              }}
              className="space-y-4"
            />
          ) : (
            <p className="py-10 text-center text-sm text-gray-400">Loading program…</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-5 py-4">
          <Button variant="outline" size="md" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="contain" size="md" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Program"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateProgramModal;
