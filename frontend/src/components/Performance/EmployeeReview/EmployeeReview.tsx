import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useGetReviewRecordDetails } from '../../../hooks/useGoal';
import GoalCard from './GoalCard';
import { useScreenSize } from '../../../hooks/useScreenSize';
import OverallGoalSection from './OverallGoalSection';
import { GoalItem } from '../../../types/goalReviewDetails';
import ReviewSidebar from './ReviewSidebar';
import StageTimeline from './StageTimeline';

// --- Helper Functions ---
const formatNumber = (num: number | undefined) => {
  if (num === undefined || num === null) return "0.00";
  return Number(num).toFixed(2);
};

const getStatusColor = (status: string | undefined) => {
  const normalized = status?.toLowerCase() || '';
  switch (normalized) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'in progress': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'not started': return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'on hold': return 'bg-orange-100 text-orange-600 border-orange-200';
    case 'active': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};



// --- Main Component ---

const EmployeeReview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const user_id = searchParams.get("user_id") || "";
  const review = searchParams.get("review") || "";
  const { data: reviewRecordDetails, isLoading } = useGetReviewRecordDetails(user_id, review);


  const reviewData = reviewRecordDetails?.data;
  const goals = reviewData?.goals?.data?.goal_plan_items || [];
  const reviewCycle = reviewData?.review_cycle;
  const reviewStatus = reviewData?.review_record?.status || "Draft";
  const overallScore = reviewData?.review_record?.overall_score || 0;
  const { isDesktop } = useScreenSize();
  const scales = reviewRecordDetails?.data.scales;
  const approval_stages = reviewRecordDetails?.data?.approval_stages;

  const totalWeightage = goals.reduce((acc: number, curr: any) => acc + (curr.weightage || 0), 0);
  const weightageError = totalWeightage !== 100;
  const navigate = useNavigate();

  const handleNavigateBack = () => {
    navigate(-1);
  }

  if (isLoading || !reviewData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-blue-600">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mb-4 mx-auto" />
          <p className="text-sm font-medium text-gray-500">Loading Review Record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden w-full bg-slate-50 font-sans text-gray-900">
      {/* Top Header */}
      <div className="flex flex-row items-center justify-between  px-8 py-4">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ArrowLeft onClick={handleNavigateBack} className='rounded-full bg-gray-50 hover:bg-gray-200 w-10 cursor-pointer h-10 p-2' />
          Performance Review
          <span className={`text-[10px] px-2 py-0.5 rounded-[1000px] border ${getStatusColor(reviewStatus)}`}>
            {reviewStatus}
          </span>
        </h1>
        {!isDesktop &&
          <span className="text-md text-gray-600 font-medium">
            {reviewCycle?.review_cycle_name || "Review Cycle"}
          </span>
        }
        {isDesktop &&
          <span className="text-md text-gray-600 font-medium">
            {reviewCycle?.review_cycle_name || "Review Cycle"}
          </span>
        }

        {isDesktop &&
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-[1000px] text-sm font-medium transition-colors">
              <Save size={16} /> Save Draft
            </button>
            <button onClick={() => { }} className="flex items-center gap-2 px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[1000px] text-sm font-medium shadow-md shadow-blue-200 transition-all">
              <Send size={16} /> <span>Submit Review</span>
            </button>
          </div>
        }
      </div>

      {/* Content Area */}
      <div className='flex h-full'>
        {/* Sidebar  */}
        <div className='h-full w-full max-w-xs bg-gray-300'>
          <ReviewSidebar />
        </div>
        {/* Main Content  */}
        <div className="h-full w-full overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto pb-20">
            <StageTimeline stages={approval_stages?.stages || []} currentStage={approval_stages?.current_step || 0} />
            {weightageError ? (
              <div className="mb-8 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-4 shadow-sm">
                <AlertCircle className="text-red-500 mt-1 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h3 className="text-red-800 font-bold text-sm">Action Required: Check Weightage</h3>
                  <p className="text-red-600 text-sm mt-1">
                    The total weightage is <span className="font-bold">{totalWeightage}%</span>. It must be 100%.
                  </p>
                </div>
                <button className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-[1000px] transition-colors">
                  Fix Now
                </button>
              </div>
            ) : (
              <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-800 text-sm font-medium">
                <CheckCircle2 size={18} />
                Weightage allocation is correct (100%).
              </div>
            )}

            {/* Goals Section  */}
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Goals & Key Result Areas</h2>
                <p className="text-gray-500 mt-1">Review your performance against set targets.</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 font-bold uppercase block">Overall Score</span>
                <span className="text-3xl font-bold text-blue-600">{formatNumber(overallScore)}</span>
              </div>
            </div>

            <div className="space-y-6">
              {goals.length > 0 ? (
                goals.map((item: GoalItem, index: number) => (
                  <GoalCard scales={scales} key={index} item={item} index={index} />
                ))
              ) : (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                  <p className="text-gray-500">No goals found.</p>
                </div>
              )}
            </div>


            <OverallGoalSection scales={scales} overallSection={reviewRecordDetails?.data?.overall_section} />
          </div>
          {!isDesktop &&
            <div className="flex w-full bg-white py-3 items-center gap-3 sticky bottom-0">
              <button className="flex justify-center w-full items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-[1000px] text-sm font-medium transition-colors">
                <Save size={16} /> Save Draft
              </button>
              <button onClick={() => { }} className="flex justify-center w-full items-center gap-2 px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-[1000px] text-sm font-medium shadow-md shadow-blue-200 transition-all">
                <Send size={16} /> <span>Submit Review</span>
              </button>
            </div>
          }
        </div>
      </div>

    </div>
  );
};


export default EmployeeReview;