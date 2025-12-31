"use client";
import { ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { useGetPolicyQuestions } from "../../hooks/useLeaves";

interface Props {
  doctypeName: string;
  targetDoctype: string;
}

const PolicyQAContent = ({ doctypeName, targetDoctype }: Props) => {
  const [open, setOpen] = useState(true);

  const { data, isLoading, isError } = useGetPolicyQuestions(
    doctypeName,
    targetDoctype
  );

  const questions = useMemo(() => {
    if (!data?.questions) return [];
    return data.questions.map((q) => ({
      question: q.question_name,
      answer: q.description,
    }));
  }, [data]);

  if (isError) {
    return (
      <p className="text-sm text-red-600">
        Failed to load policy information
      </p>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-6 py-4"
      >
        <h2 className="module-title">Policy</h2>
        <ChevronUp
          className={`transition-transform ${open ? "rotate-0" : "rotate-180"}`}
        />
      </button>

      {/* Body */}
      {open && (
        <div className="px-6 pb-6 pt-2 border-t">

          {isLoading && <p className="text-sm text-gray-500">Loading...</p>}

          {!isLoading && questions.length === 0 && (
            <p className="text-sm text-gray-500">
              No policy information available.
            </p>
          )}

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i}>
                <p className="font-semibold text-sm">{q.question}</p>
                <p className="text-sm text-gray-600">{q.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyQAContent;
