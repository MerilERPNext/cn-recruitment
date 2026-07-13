import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown, ChevronUp, Trophy } from "lucide-react";
import Modal from "../shared/Modal";
import Button from "../shared/atoms/Button";
import { Typography } from "../shared/atoms/Typography";
import CircularLoader from "../shared/atoms/CircularLoader";
import { useTargetUser } from "../../context/ViewedUserContext";
import { useCurrentEmployeeDetails } from "../../hooks/useEmployee";
import {
    useEligiblePrograms,
    useCreateEmployeeAppreciation,
    useRecognitionFlags,
    useProgramValues,
} from "../../services/recognitionService";

// Local YYYY-MM-DD for the appreciation date sent in the payload.
const todayISO = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const Appreciations = () => {
    const [open, setOpen] = useState(false);
    const [modal, setModal] = useState({
        open: false,
        programName: "",
        programTitle: "",
        note: "",
    });
    const [selectedValues, setSelectedValues] = useState<string[]>([]);
    const [valuesOpen, setValuesOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    const toggleValue = (v: string) =>
        setSelectedValues((prev) =>
            prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
        );

    // Effective target (viewed employee) and the giver (logged-in employee).
    const { targetEmployeeId } = useTargetUser();
    const { data: currentEmployee } = useCurrentEmployeeDetails({
        logged_in_employee_details: true,
    });
    const effectiveEmployeeId = targetEmployeeId || currentEmployee?.employee;

    // Award list = recognition programs the giver is eligible to recognize in.
    const { data: eligiblePrograms, isLoading: programsLoading } =
        useEligiblePrograms(currentEmployee?.employee, "Appreciation");
    const { mutate: createAppreciation, isPending: isSubmitting } =
        useCreateEmployeeAppreciation();

    // Appreciations must be enabled in the Advanced Settings doctype.
    const { enableAppreciations, minimumNominationCharacters } = useRecognitionFlags();

    // Recognition values for the selected program (dynamic, comma-separated).
    const { data: programValues = [] } = useProgramValues(modal.programName);

    const programs = eligiblePrograms?.eligible_programs ?? [];

    // Close the award panel on outside click.
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const selectAward = (programName: string, programTitle: string) => {
        setOpen(false);
        setSelectedValues([]);
        setValuesOpen(false);
        setModal({ open: true, programName, programTitle, note: "" });
    };

    const handleSubmit = () => {
        if (!effectiveEmployeeId) {
            toast.error("Employee information not found");
            return;
        }
        if (!modal.programName) {
            toast.error("Please select an award");
            return;
        }
        if (minimumNominationCharacters > 0 && modal.note.trim().length < minimumNominationCharacters) {
            toast.error(
                `Note must be at least ${minimumNominationCharacters} character${minimumNominationCharacters > 1 ? "s" : ""}.`,
            );
            return;
        }

        createAppreciation(
            {
                employee: effectiveEmployeeId,
                program_name: modal.programName,
                given_by: currentEmployee?.employee,
                note: modal.note || undefined,
                values: selectedValues.length > 0 ? selectedValues.join(",") : undefined,
                date: todayISO(),
            },
            {
                onSuccess: (res) => {
                    if (res?.success) {
                        toast.success(res.message || "Appreciation sent successfully!");
                        setSelectedValues([]);
                        setValuesOpen(false);
                        setModal({ open: false, programName: "", programTitle: "", note: "" });
                    } else {
                        toast.error(res?.message || "Failed to send appreciation");
                    }
                },
                onError: () => {
                    toast.error("Failed to send appreciation");
                },
            }
        );
    };

    // Hidden entirely when Appreciations are disabled in Advanced Settings.
    if (!enableAppreciations) return null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
            >
                Appreciate
                {open ? (
                    <ChevronUp className="size-4" />
                ) : (
                    <ChevronDown className="size-4" />
                )}
            </button>

            {/* Horizontally scrollable award cards */}
            {open && (
                <div className="absolute left-0 top-full z-50 mt-2 w-[684px] max-w-[90vw] rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    {programsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <CircularLoader size="sm" />
                        </div>
                    ) : programs.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-400">
                            No awards available
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-3 max-h-[340px] overflow-y-auto pb-1">
                            {programs.map((p) => (
                                <button
                                    type="button"
                                    key={p.program_name}
                                    onClick={() => selectAward(p.program_name, p.program_title)}
                                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 p-3 text-center transition-all hover:border-primary-200 hover:shadow-md"
                                >
                                    {p.program_logo ? (
                                        <img
                                            src={p.program_logo}
                                            alt={p.program_title}
                                            className="size-16 rounded-lg object-cover"
                                        />
                                    ) : (
                                        <div className="flex size-16 items-center justify-center rounded-lg bg-primary-50">
                                            <Trophy className="size-7 text-primary-500" />
                                        </div>
                                    )}
                                    <span className="line-clamp-2 text-sm font-medium text-gray-800">
                                        {p.program_title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal
                size="sm"
                isOpen={modal.open}
                onClose={() => setModal({ ...modal, open: false })}
            >
                <div className="space-y-4 p-2">
                    {/* Selected award */}
                    <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                        <Typography variant="label" color="primary" className="block mb-1 font-semibold">
                            Award
                        </Typography>
                        <Typography variant="bodyMedium" className="font-bold text-primary-900">
                            {modal.programTitle || modal.programName}
                        </Typography>
                    </div>

                    {/* Note */}
                    <div>
                        <Typography variant="label" className="block mb-2 font-medium">
                            {minimumNominationCharacters > 0
                                ? `Note (min ${minimumNominationCharacters} characters)`
                                : "Note"}
                        </Typography>
                        <textarea
                            value={modal.note}
                            onChange={(e) => setModal({ ...modal, note: e.target.value })}
                            placeholder="Add a note for this appreciation (e.g., Outstanding performance on Project X)"
                            className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm resize-none"
                        />
                        {minimumNominationCharacters > 0 && (
                            <p
                                className={`mt-1 text-xs ${
                                    modal.note.trim().length < minimumNominationCharacters
                                        ? "text-red-500"
                                        : "text-gray-400"
                                }`}
                            >
                                {modal.note.trim().length}/{minimumNominationCharacters} characters
                            </p>
                        )}
                    </div>

                    {/* Recognition Values — dynamic multi-select from the program's values. */}
                    {programValues.length > 0 && (
                        <div className="relative">
                            <Typography variant="label" className="block mb-2 font-medium">
                                Values
                            </Typography>
                            <button
                                type="button"
                                onClick={() => setValuesOpen((v) => !v)}
                                className="flex w-full items-center bg-white justify-between rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-left hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            >
                                <span className={selectedValues.length ? "text-gray-800" : "text-gray-400"}>
                                    {selectedValues.length
                                        ? `${selectedValues.length} selected`
                                        : "Select values..."}
                                </span>
                                {valuesOpen ? (
                                    <ChevronUp className="size-4 text-gray-400" />
                                ) : (
                                    <ChevronDown className="size-4 text-gray-400" />
                                )}
                            </button>

                            {selectedValues.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedValues.map((v) => (
                                        <span
                                            key={v}
                                            className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-600"
                                        >
                                            {v}
                                            <button
                                                type="button"
                                                onClick={() => toggleValue(v)}
                                                className="text-primary-400 hover:text-primary-700"
                                                aria-label={`Remove ${v}`}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {valuesOpen && (
                                <div className="mt-2 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1">
                                    {programValues.map((v) => (
                                        <label
                                            key={v}
                                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50"
                                        >
                                            <input
                                                type="checkbox"
                                                className="accent-primary"
                                                checked={selectedValues.includes(v)}
                                                onChange={() => toggleValue(v)}
                                            />
                                            <span className="text-gray-700">{v}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="subtle"
                            onClick={() => setModal({ ...modal, open: false })}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contain"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="min-w-[100px]"
                        >
                            {isSubmitting ? <CircularLoader size="sm" color="white" /> : "Submit"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Appreciations;
