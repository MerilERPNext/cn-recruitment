"use client";
import type React from "react";
import { useState, useMemo } from "react";
import { ChevronUp } from "lucide-react";
import { useGetPolicyQuestions } from "../../../../hooks/useLeaves";
import { LeaveBalance } from "../../../../types/leaves";
import { Typography } from "../../../shared/atoms/Typography";

interface PolicyQATabProps {
  leaveData: LeaveBalance;
}

const PolicyQATab: React.FC<PolicyQATabProps> = ({ leaveData }) => {
  const [isPolicyOpen, setIsPolicyOpen] = useState(true);

  const doctypeName = "Leave Type";
  const leaveId = leaveData?.leave_id || "";

  const { data, isLoading, isError } = useGetPolicyQuestions(
    doctypeName,
    leaveId
  );

  const policyQuestions = useMemo(() => {
    if (!data?.questions) return [];

    return data.questions.map((q) => ({
      question: q.question_name,
      answer: q.description,
    }));
  }, [data]);

  if (isError) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load policy information
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          onClick={() => setIsPolicyOpen(!isPolicyOpen)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-primary/10 transition-colors"
        >
          <Typography className="font-semibold">Policy</Typography>
          <ChevronUp
            className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isPolicyOpen ? "rotate-0" : "rotate-180"
              }`}
          />
        </button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isPolicyOpen ? "max-h-auto opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="px-6 pb-6 pt-2 border-t border-gray-100">
            <Typography className="font-semibold mb-4">
              Policy Information
            </Typography>

            {isLoading && (
              <div className="space-y-6 animate-pulse">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded-sm w-3/4" />
                    <div className="h-3 bg-gray-200 rounded-sm w-full" />
                    <div className="h-3 bg-gray-200 rounded-sm w-5/6" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && (
              <div className="space-y-6">
                {policyQuestions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No policy information available.
                  </p>
                ) : (
                  policyQuestions.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <Typography variant="bodySmall" className="font-medium">
                        {item.question}
                      </Typography>
                      <Typography variant="bodySmall" color="body2">
                        {item.answer}
                      </Typography>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyQATab;
