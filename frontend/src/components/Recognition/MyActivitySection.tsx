import React, { useState } from "react";
import { Card } from "../shared/atoms/Card";
import { Typography } from "../shared/atoms/Typography";
import StatusBadge from "../shared/atoms/statusBadge";
import type { MyRecognitionActivity } from "../../types/recognition";
import { Award, Vote, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface MyActivitySectionProps {
  activity?: MyRecognitionActivity;
  isLoading?: boolean;
  onExpandProgram?: (awardId: string) => void;
}

export const MyActivitySection: React.FC<MyActivitySectionProps> = ({
  activity,
  isLoading,
  onExpandProgram,
}) => {
  const [showMyNominations, setShowMyNominations] = useState(false);

  if (isLoading) return null;
  if (
    !activity?.success ||
    (activity.nominated_for.length === 0 &&
      activity.pending_votes.length === 0 &&
      activity.my_nominations.length === 0)
  ) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* You've been nominated */}
      {activity.nominated_for.length > 0 && (
        <Card radius="xl" className="border border-emerald-200 bg-emerald-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="size-5 text-emerald-600" />
            <Typography variant="bodyMedium" className="font-semibold text-emerald-800">
              You've been nominated!
            </Typography>
          </div>
          <div className="space-y-2">
            {activity.nominated_for.map((nom) => (
              <div
                key={nom.nomination_name}
                className="flex items-center justify-between p-2 rounded-lg bg-white/70"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {nom.icon ? (
                    <img src={nom.icon} alt="" className="w-6 h-6 object-contain shrink-0" />
                  ) : (
                    <Award
                      className="size-5 shrink-0"
                      style={{ color: nom.color || "#6366f1" }}
                    />
                  )}
                  <div className="min-w-0">
                    <Typography variant="bodySmall" className="font-medium truncate">
                      {nom.award_name}
                    </Typography>
                    <Typography variant="bodySmall" color="body2">
                      {nom.votes_received} {nom.votes_received === 1 ? "vote" : "votes"}
                    </Typography>
                  </div>
                </div>
                <StatusBadge status={nom.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Pending Votes */}
      {activity.pending_votes.length > 0 && (
        <Card radius="xl" className="border border-blue-200 bg-blue-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Vote className="size-5 text-blue-600" />
            <Typography variant="bodyMedium" className="font-semibold text-blue-800">
              Pending Votes
            </Typography>
          </div>
          <div className="space-y-2">
            {activity.pending_votes.map((pv) => (
              <div
                key={pv.award}
                className="flex items-center justify-between p-2 rounded-lg bg-white/70"
              >
                <div className="min-w-0">
                  <Typography variant="bodySmall" className="font-medium truncate">
                    {pv.award_name}
                  </Typography>
                  <Typography variant="bodySmall" color="body2">
                    {pv.unvoted_count} {pv.unvoted_count === 1 ? "nominee" : "nominees"} to vote
                  </Typography>
                </div>
                <button
                  onClick={() => onExpandProgram?.(pv.award)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                >
                  Vote Now
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My Nominations */}
      {activity.my_nominations.length > 0 && (
        <Card radius="xl" className="border p-4">
          <button
            onClick={() => setShowMyNominations(!showMyNominations)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Award className="size-5 text-gray-600" />
              <Typography variant="bodyMedium" className="font-semibold">
                My Nominations ({activity.my_nominations.length})
              </Typography>
            </div>
            {showMyNominations ? (
              <ChevronUp className="size-4 text-gray-400" />
            ) : (
              <ChevronDown className="size-4 text-gray-400" />
            )}
          </button>
          {showMyNominations && (
            <div className="space-y-2 mt-3">
              {activity.my_nominations.map((nom) => (
                <div
                  key={nom.nomination_name}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <div className="min-w-0">
                    <Typography variant="bodySmall" className="font-medium truncate">
                      {nom.nominee_name}
                    </Typography>
                    <Typography variant="bodySmall" color="body2" className="truncate">
                      {nom.award_name}
                    </Typography>
                  </div>
                  <StatusBadge status={nom.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
