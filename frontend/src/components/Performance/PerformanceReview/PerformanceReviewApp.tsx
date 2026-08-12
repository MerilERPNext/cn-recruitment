import { lazy, useState } from "react";
import type { BreakdownItem } from "./component/types";

const PerformanceReviewHeader = lazy(
  () => import("./component/PerformanceReviewHeader"),
);
const SectionBreakdownCard = lazy(
  () => import("./component/SectionBreakdownCard"),
);
const AcknowledgeRatingCard = lazy(
  () => import("./component/AcknowledgeRatingCard"),
);

const breakdownItems: BreakdownItem[] = [
  {
    title: "Goals & KPIs",
    weight: "60% weight",
    note: '"Pallavi consistently shipped against goals; Oxygen 2.0 rollout is on plan."',
    progress: "80%",
    rating: "Exceeds · 4/5",
  },
  {
    title: "Competencies",
    weight: "30% weight",
    note: '"Standout in Craft and Cross-functional Partnership."',
    progress: "100%",
    rating: "Outstanding · 5/5",
  },
  {
    title: "Career Growth",
    weight: "10% weight",
    note: '"Promotion-ready to Staff Designer in 12-18 months."',
    progress: "80%",
    rating: "Exceeds · 4/5",
  },
];



const PerformanceReviewApp = () => {
  const [agreed, setAgreed] = useState(true);
  const [comment, setComment] = useState("");

  return (
    <div className="min-h-full overflow-y-auto bg-[#f8fafc] px-3 py-4 font-sans sm:p-6">
      <div className="mx-auto flex w-full  flex-col gap-4 sm:gap-6">
          <PerformanceReviewHeader />
          <SectionBreakdownCard items={breakdownItems} />
          <AcknowledgeRatingCard
            agreed={agreed}
            comment={comment}
            onAgreedChange={setAgreed}
            onCommentChange={setComment}
          />
      </div>
    </div>
  );
};

export default PerformanceReviewApp;
