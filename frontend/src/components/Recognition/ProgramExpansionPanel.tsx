/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from "react";
import { Typography } from "../shared/atoms/Typography";
import {
  useGetProgramInteractionContext,
  useGetFormSessionId,
} from "../../services/recognitionService";
import { VotingPanel } from "./VotingPanel";
import { SimpleNominationPanel } from "./SimpleNominationPanel";
import Button from "../shared/atoms/Button";
import { Loader2, CalendarCheck, Vote, Info, FileCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

interface ProgramExpansionPanelProps {
  awardName: string;
  onCollapse: () => void;
}

export const ProgramExpansionPanel: React.FC<ProgramExpansionPanelProps> = ({
  awardName,
}) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } =
    useGetProgramInteractionContext(awardName);
  const getFormSession = useGetFormSessionId();
  const [openingForm, setOpeningForm] = useState(false);

  const handleNominationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["recognition"] });
  };

  const handleOpenNominationForm = async () => {
    if (!data?.award?.nomination_form) return;
    setOpeningForm(true);
    try {
      const result = await getFormSession.mutateAsync({
        form_widget_name: data.award.nomination_form,
        award_name: awardName,
      });
      if (result?.session_id && window.trigger_chatnext_assistant) {
        window.trigger_chatnext_assistant(true, result.session_id);
      } else if (!window.trigger_chatnext_assistant) {
        toast.error("ChatNext assistant is not available.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to open nomination form");
    } finally {
      setOpeningForm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-2 p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin text-gray-400" />
        <Typography variant="bodySmall" color="body2">
          Loading...
        </Typography>
      </div>
    );
  }

  if (isError || !data?.success) {
    return (
      <div className="mt-2 p-4 rounded-xl border border-red-100 bg-red-50">
        <Typography variant="bodySmall" className="text-red-600">
          Failed to load program details. Please try again.
        </Typography>
      </div>
    );
  }

  const { nomination_open, voting_open, can_nominate, can_vote, nominees_for_voting, award, my_nominations_count } = data;

  return (
    <>
      <div className="mt-2 p-4 rounded-xl border border-gray-100 bg-gray-50 space-y-4">
        {/* Description */}
        {award.description && (
          <div
            className="text-sm text-gray-600 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: award.description }}
          />
        )}

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          {nomination_open && (
            <div className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
              <CalendarCheck className="w-3 h-3" />
              <span>Nominations Open</span>
            </div>
          )}
          {voting_open && (
            <div className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-lg bg-blue-100 text-blue-700 text-xs font-medium">
              <Vote className="w-3 h-3" />
              <span>Voting Open</span>
            </div>
          )}
          {!nomination_open && !voting_open && (
            <div className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-lg bg-gray-100 text-gray-600 text-xs font-medium">
              <Info className="w-3 h-3" />
              <span>No active periods</span>
            </div>
          )}
        </div>

        {/* Nomination button — opens ChatNext window with dynamic form */}
        {nomination_open && can_nominate && award.nomination_form && (
          <div className="space-y-3">
            <Typography variant="bodyMedium" className="font-semibold">
              Submit Nomination
            </Typography>
            {my_nominations_count > 0 && (
              <div className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                <FileCheck className="w-3 h-3" />
                <span>
                  You have submitted {my_nominations_count}{" "}
                  {my_nominations_count === 1 ? "nomination" : "nominations"}
                </span>
              </div>
            )}
            <Button
              onClick={handleOpenNominationForm}
              size="md"
              loading={openingForm}
              disabled={openingForm}
            >
              {my_nominations_count > 0 ? "Nominate Another" : "Nominate"}
            </Button>
          </div>
        )}

        {/* Simple nomination (no form widget linked) */}
        {nomination_open && can_nominate && !award.nomination_form && (
          <div className="space-y-3">
            {my_nominations_count > 0 && (
              <div className="inline-flex items-center gap-[6px] px-3 py-[5px] rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium">
                <FileCheck className="w-3 h-3" />
                <span>
                  You have submitted {my_nominations_count}{" "}
                  {my_nominations_count === 1 ? "nomination" : "nominations"}
                </span>
              </div>
            )}
            <SimpleNominationPanel
              awardName={awardName}
              onSuccess={handleNominationSuccess}
            />
          </div>
        )}

        {/* Info: can't nominate */}
        {nomination_open && !can_nominate && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
            <Typography variant="bodySmall" className="text-yellow-700">
              Nominations are open but you are not assigned as a nominator for this program.
            </Typography>
          </div>
        )}

        {/* Voting Panel */}
        {voting_open && can_vote && nominees_for_voting.length > 0 && (
          <VotingPanel nominees={nominees_for_voting} />
        )}

        {/* Info: can't vote */}
        {voting_open && !can_vote && (
          <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-100">
            <Typography variant="bodySmall" className="text-yellow-700">
              Voting is open but you are not assigned as a voter for this program.
            </Typography>
          </div>
        )}

        {/* Info: voting open but no nominees */}
        {voting_open && can_vote && nominees_for_voting.length === 0 && (
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Typography variant="bodySmall" color="body2">
              No nominees available for voting yet.
            </Typography>
          </div>
        )}
      </div>

    </>
  );
};
