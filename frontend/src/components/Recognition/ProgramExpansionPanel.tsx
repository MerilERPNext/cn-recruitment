import React from "react";
import { Typography } from "../shared/atoms/Typography";
import {
  useGetProgramInteractionContext,
} from "../../services/recognitionService";
import { NominationFormPanel } from "./NominationFormPanel";
import { VotingPanel } from "./VotingPanel";
import { Loader2, CalendarCheck, Vote, Info } from "lucide-react";

interface ProgramExpansionPanelProps {
  awardName: string;
  onCollapse: () => void;
}

export const ProgramExpansionPanel: React.FC<ProgramExpansionPanelProps> = ({
  awardName,
  onCollapse,
}) => {
  const { data, isLoading, isError } =
    useGetProgramInteractionContext(awardName);

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

  const { nomination_open, voting_open, can_nominate, can_vote, form_schema, nominees_for_voting, award } = data;

  return (
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CalendarCheck className="size-3" />
            Nominations Open
          </span>
        )}
        {voting_open && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Vote className="size-3" />
            Voting Open
          </span>
        )}
        {!nomination_open && !voting_open && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Info className="size-3" />
            No active periods
          </span>
        )}
      </div>

      {/* Nomination Form */}
      {nomination_open && can_nominate && form_schema && (
        <NominationFormPanel
          awardName={awardName}
          formSchema={form_schema}
          onSuccess={onCollapse}
        />
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
  );
};
