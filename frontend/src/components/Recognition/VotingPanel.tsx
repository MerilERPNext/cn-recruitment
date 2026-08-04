import React, { useState, useMemo } from "react";
import { Typography } from "../shared/atoms/Typography";
import Avatar from "../shared/Avatar";
import WrapperHoverCard from "../shared/WrapperHoverCard";
import { useSubmitVote } from "../../services/recognitionService";
import { NomineeForVoting } from "../../types/recognition";
import toast from "react-hot-toast";
import { ThumbsUp, Loader2, CheckCircle, MessageSquare } from "lucide-react";

interface VotingPanelProps {
  nominees: NomineeForVoting[];
}

export const VotingPanel: React.FC<VotingPanelProps> = ({ nominees }) => {
  const [votingFor, setVotingFor] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const submitVote = useSubmitVote();

  const votedCount = nominees.filter((n) => n.already_voted).length;

  const grouped = useMemo(() => {
    const g: Record<string, NomineeForVoting[]> = {};
    nominees.forEach((n) => {
      const dept = n.department || "Other";
      (g[dept] ??= []).push(n);
    });
    return g;
  }, [nominees]);

  const handleVote = async (nominationName: string) => {
    setVotingFor(nominationName);
    try {
      await submitVote.mutateAsync({
        nomination_name: nominationName,
        vote_score: 1,
        vote_comment: comment || undefined,
      });
      toast.success("Vote submitted!");
      setCommentFor(null);
      setComment("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit vote");
    } finally {
      setVotingFor(null);
    }
  };

  const departments = Object.keys(grouped).sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Typography variant="bodyMedium" className="font-semibold">
          Cast Your Vote
        </Typography>
        <span className="text-xs text-gray-500 font-medium">
          {votedCount} of {nominees.length} voted
        </span>
      </div>

      {/* Vote progress bar */}
      <div className="w-full bg-gray-200 rounded-sm h-1.5">
        <div
          className="bg-emerald-500 h-1.5 rounded-sm transition-all"
          style={{
            width: `${nominees.length > 0 ? (votedCount / nominees.length) * 100 : 0}%`,
          }}
        />
      </div>

      {departments.map((dept) => (
        <div key={dept} className="space-y-2">
          {departments.length > 1 && (
            <Typography variant="bodySmall" className="font-semibold text-gray-500 uppercase tracking-wider mt-2">
              {dept}
            </Typography>
          )}

          {grouped[dept].map((nominee) => (
            <div
              key={nominee.nomination_name}
              className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200"
            >
              <Avatar
                src={nominee.image}
                name={nominee.employee_name}
                size="md"
              />

              <div className="flex-1 min-w-0">
                <WrapperHoverCard employeeId={nominee.employee}>
                  <Typography variant="bodySmall" className="font-medium cursor-pointer">
                    {nominee.employee_name}
                  </Typography>
                </WrapperHoverCard>
                <Typography variant="bodySmall" color="body2">
                  {[nominee.designation, nominee.department]
                    .filter(Boolean)
                    .join(" - ")}
                </Typography>
                <Typography variant="bodySmall" color="body2" className="mt-0.5">
                  {nominee.votes_received}{" "}
                  {nominee.votes_received === 1 ? "vote" : "votes"}
                </Typography>

                {/* Comment input */}
                {commentFor === nominee.nomination_name && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment (optional)"
                      className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleVote(nominee.nomination_name)}
                      disabled={votingFor === nominee.nomination_name}
                      className="px-3 py-1 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
                    >
                      {votingFor === nominee.nomination_name ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Submit"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setCommentFor(null);
                        setComment("");
                      }}
                      className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Vote button / Already voted indicator */}
              <div className="shrink-0">
                {nominee.already_voted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-green-700 bg-green-50">
                    <CheckCircle className="size-3.5" />
                    Voted
                  </span>
                ) : commentFor === nominee.nomination_name ? null : (
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setCommentFor(nominee.nomination_name)
                      }
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Vote with comment"
                    >
                      <MessageSquare className="size-4" />
                    </button>
                    <button
                      onClick={() => handleVote(nominee.nomination_name)}
                      disabled={votingFor === nominee.nomination_name}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 transition-colors"
                    >
                      {votingFor === nominee.nomination_name ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ThumbsUp className="size-3.5" />
                      )}
                      Vote
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
