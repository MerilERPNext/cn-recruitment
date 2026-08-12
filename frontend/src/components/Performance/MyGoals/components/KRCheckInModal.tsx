import React, { useRef, useState, useEffect } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { Typography } from "../../../shared/atoms/Typography";
import Badge from "../../../shared/Badge";
import Button from "../../../shared/atoms/Button";
import type { GoalCheckInSentiment, GoalDetailKeyResult } from "../../../../types/goal";
import { PERFORMANCE_QUERY_KEYS, useGoalCheckIns, useSubmitGoalCheckIn } from "../../../../hooks/usePerformance";
import { getPerformanceErrorMessage } from "../../../../services/performanceService";
import FrappeAPI from "../../../../utils/frappeAPI";
import { useQueryClient } from "@tanstack/react-query";

const sentimentStyles: Record<GoalCheckInSentiment, { active: string; dot: string }> = {
  "On Track": { active: "border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200", dot: "bg-green-500" },
  "At Risk": { active: "border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-amber-500" },
  Blocked: { active: "border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200", dot: "bg-red-500" },
};

export interface KRCheckInModalSubmitData {
  newValue: string;
  sentiment: GoalCheckInSentiment;
  attachment: File | null;
}

export interface KRCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  kr: GoalDetailKeyResult | null;
  krIndex?: number;
  initialStatus?: string;
  goalId: string
}

export const KRCheckInModal: React.FC<KRCheckInModalProps> = ({
  isOpen,
  onClose,
  goalId,
  kr,
  krIndex = 0,
  initialStatus,
}) => {
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [newValue, setNewValue] = useState("");
  const [sentiment, setSentiment] = useState<GoalCheckInSentiment>("On Track");
  const [attachment, setAttachment] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const krId = kr?.goal_key || kr?.goal || "";
  const { data: krCheckInData, refetch: refetchKRCheckIns } = useGoalCheckIns(krId);
  console.log(krCheckInData?.data?.check_ins,'ccccccccchhhhhhhhheeeeeeck in')
  const { mutateAsync: submitCheckIn, isPending: isSubmittingCheckIn } = useSubmitGoalCheckIn();

  useEffect(() => {
    if (kr && isOpen) {
      setNewValue(String(kr.achievement ?? 0));
      const norm = (initialStatus || "").toLowerCase().replace(/[-_]/g, " ").trim();
      if (norm === "at risk") setSentiment("At Risk");
      else if (norm === "blocked" || norm === "off track") setSentiment("Blocked");
      else setSentiment("On Track");
      setAttachment(null);
    }
  }, [kr, isOpen, initialStatus]);

  if (!isOpen || !kr) return null;

  const handleSubmit = async () => {
    const parsedValue = Number(newValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      toast.error("Enter a valid progress value.");
      return;
    }

    const goalKey = kr?.goal_key || kr?.goal || "";
    if (!goalKey) {
      toast.error("Goal key is missing.");
      return;
    }

    try {
      let attachmentUrl: string | undefined;
      if (attachment) {
        const uploaded = await FrappeAPI.uploadFile(attachment, attachment.name);
        attachmentUrl = uploaded.file_url;
      }

      const response = await submitCheckIn({
        goal: goalKey,
        new_value: parsedValue,
        sentiment,
        note: "",
        attachment: attachmentUrl,
      }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ["performance", "goal-check-ins"] });
          queryClient.invalidateQueries({ queryKey: ["performance", "goal-detail"] });
          if (krId) {
            await refetchKRCheckIns();
            queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.goalCheckIns(krId) });
          }
          if (goalId) {
            queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.goalCheckIns(goalId) });
            queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.goalDetail(goalId) });
          }
          queryClient.invalidateQueries({ queryKey: PERFORMANCE_QUERY_KEYS.myGoals });
        }
      });

      toast.success(response?.message || "Check-in submitted successfully!");
      onClose();
    } catch (err) {
      console.error("Failed to submit KR check-in:", err);
      toast.error(getPerformanceErrorMessage(err, "Failed to submit check-in."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-5 sm:p-6 relative flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="shrink-0">
              <Badge label={`KR ${krIndex + 1}`} variant="purple" size="sm" />
            </div>
            <div className="min-w-0 flex-1">
              <Typography variant="h4" className="text-gray-900 text-base sm:text-lg font-semibold leading-snug break-words [word-break:break-word]">
                {kr.title || "Check-in"}
              </Typography>
              <Typography variant="caption" className="text-gray-500 text-xs">
                Update progress for this Key Result
              </Typography>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-1">
          <div>
            <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">
              New Value
            </Typography>
            <div className="flex items-center">
              <input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                min="0"
                step="any"
                inputMode="decimal"
                className="w-full border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="New key result progress value"
              />
              <span className="bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                %
              </span>
            </div>
          </div>

          <div>
            <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">
              Self-declared Health
            </Typography>
            <div className="flex flex-nowrap gap-2" role="radiogroup" aria-label="Self-declared health">
              {(Object.keys(sentimentStyles) as GoalCheckInSentiment[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={sentiment === option}
                  onClick={() => setSentiment(option)}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${sentiment === option
                      ? sentimentStyles[option].active
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                >
                  <span className={`h-2 w-2 rounded-full ${sentimentStyles[option].dot}`} />
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-2">
          <div className="flex items-center gap-2 min-w-0">
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              bgColor="text"
              size="sm"
              icon={<Paperclip className="w-4 h-4" />}
              onClick={() => attachmentInputRef.current?.click()}
              disabled={isSubmittingCheckIn}
            >
              Attach
            </Button>
            {attachment && (
              <span className="flex min-w-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                <span className="truncate max-w-[120px]">{attachment.name}</span>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => {
                    setAttachment(null);
                    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
                  }}
                  className="shrink-0 text-blue-500 hover:text-blue-800"
                  disabled={isSubmittingCheckIn}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button variant="outline" bgColor="text" size="sm" onClick={onClose} disabled={isSubmittingCheckIn}>
              Cancel
            </Button>
            <Button
              variant="contain"
              bgColor="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmittingCheckIn}
              icon={isSubmittingCheckIn ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isSubmittingCheckIn ? "Submitting…" : "Submit Check-in"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
