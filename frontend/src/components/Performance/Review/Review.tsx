import { 
  Calendar, 
  Clock, 
  Briefcase, 
  CheckCircle2, 
  ArrowRight,
  AlertCircle,
  Building2,
  Scale,
  FileSignature,
  Star,
  ClipboardCheck,
  TrendingUp,
  Target
} from 'lucide-react';
import {  useGetReviewRecordListViewSelf } from '../../../hooks/useGoal';
import useCurrentUser from '../../../hooks/useCurrentUser';
import { createSearchParams, useNavigate } from 'react-router-dom';

const Review = () => {
  const { data: currentUser, error: currentUserError, isLoading: loadinUser } = useCurrentUser();
  const { data: reviewRecordListView , error : reviewRecordError, isLoading: reviewRecordListViewLoading} = useGetReviewRecordListViewSelf(
    currentUser?.name || ""
  );

  // // Use the name from list view to fetch details (safe fallback)
  // const reviewRecordName = reviewRecordListView?.data?.review_record?.name;
  // const { data: getReviewRecordDetails, error: reviewRecordDetailsError , isLoading : getReviewRecordDetailsLoading } = useGetReviewRecordDetails(currentUser?.name || "", reviewRecordName || "");

  const navigate = useNavigate();

  const handleReviewClick = ()=>{
    let review = reviewRecordListView?.data?.review_record?.name || "";
     const queryParams = createSearchParams({
        review
    }).toString();
    navigate(`/webapp/performance-app/employee-review?${queryParams}`);
  }
  const error = currentUserError || reviewRecordError ;
  const isLoading = loadinUser || reviewRecordListViewLoading ;

  const infoMessage = ["No active review record found for the employee."];

  console.log("reviewRecordListView", reviewRecordListView)
  if (error ) {
    const info = infoMessage.includes(error?.message || "");
    if (info) {
      return (
      <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-blue-100 p-10 text-center">
        <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Active Review</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          {error?.message || "Please try again."}
        </p>
        </div>
      </div>
      );
    }
    return (
      <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-100 p-10 text-center">
        <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Error occurred while loading data</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
        {error?.message || "Please try again."}
        </p>
      </div>
      </div>
    );
  }

  if(isLoading){
    // Enhanced Skeleton - Full Width
    return (
      <div className="p-8 w-full animate-pulse">
        <div className="h-24 bg-gray-200 rounded-xl mb-8 w-full"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-xl w-full"></div>
          <div className="h-64 bg-gray-200 rounded-xl w-full"></div>
        </div>
      </div>
    );
  }

  if(!reviewRecordListView || !reviewRecordListView?.data?.has_active_review ){
        return (
      <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
          <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Self Review Record Found.</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            There are currently no Self Performance Review Record assigned to you.
          </p>
        </div>
      </div>
    );
  }

  const { data } = reviewRecordListView;
  const { review_cycle, review_record } = data;

  // Helper to safely format numbers to 2 decimal places
  const formatScore = (val: number | undefined | null) => {
    return Number(val || 0).toFixed(2);
  };

  return (
    <div className='min-h-screen bg-gray-50/30 p-4 sm:p-8'>
      
      {/* Header Section - Full Width */}
      <div className="w-full mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileSignature className="w-7 h-7 text-blue-600" />
              Self Review
            </h1>
            <p className="text-gray-500 mt-1">
              Complete your self-evaluation for the current performance cycle.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 font-medium">Due Date:</span>
            <span className="font-semibold text-gray-900">{review_cycle.end_date}</span>
          </div>
        </div>
      </div>

      {/* Main Grid - Full Width */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Review Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 text-blue-100 text-sm font-medium mb-2 uppercase tracking-wide">
                    <Clock className="w-4 h-4" />
                    Active Cycle
                  </div>
                  <h2 className="text-2xl font-bold">{review_cycle.review_cycle_name}</h2>
                  <p className="text-blue-100 mt-2 line-clamp-2 opacity-90">{review_cycle.description}</p>
                </div>
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-[1000px] text-sm font-medium border border-white/20">
                  In Progress
                </span>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Employee Details Mini-Section */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  {data.image ? (
                    <img 
                      src={data.image} 
                      alt={data.employee_name} 
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                      {data.employee_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{data.employee_name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      {data.designation || "No Designation"}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {data.department}
                    </p>
                  </div>
                </div>

                {/* Framework Details */}
                <div className="flex flex-col justify-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                   <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-purple-100 rounded-lg">
                       <Scale className="w-5 h-5 text-purple-600" />
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 font-medium uppercase">Framework</p>
                       <p className="font-medium text-gray-900 text-sm">{review_record.review_framework}</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-teal-100 rounded-lg">
                       <Target className="w-5 h-5 text-teal-600" />
                     </div>
                     <div>
                       <p className="text-xs text-gray-500 font-medium uppercase">Goal Plan</p>
                       <p className="font-medium text-gray-900 text-sm">{review_record.goal_plan}</p>
                     </div>
                   </div>
                </div>
              </div>

              {/* Action Area */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Review Record ID: <span className="font-mono text-gray-700">{review_record.name}</span></span>
                </div>
                
                <button onClick={handleReviewClick} className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm hover:shadow">
                  Proceed to Review
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Statistics */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
               <TrendingUp className="w-5 h-5 text-gray-400" />
               Current Metrics
             </h3>

             <div className="space-y-4">
               {/* Metric 1 */}
               <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                 <div className="flex justify-between items-start mb-2">
                   <span className="text-orange-600 font-medium text-sm">Avg. Achievement</span>
                   <Target className="w-5 h-5 text-orange-400 opacity-60" />
                 </div>
                 <div className="flex items-end gap-2">
                   <span className="text-3xl font-bold text-gray-900">
                     {formatScore(review_record.average_achievement)}%
                   </span>
                 </div>
                 {/* Progress Bar Container */}
                 <div className="w-full bg-orange-200 h-1.5 rounded-[1000px] mt-3 overflow-hidden">
                   <div 
                     className="bg-orange-500 h-full rounded-[1000px]" 
                     style={{ width: `${Math.min(review_record.average_achievement, 100)}%` }}
                   ></div>
                 </div>
               </div>

               {/* Metric 2 */}
               <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                 <div className="flex justify-between items-start mb-2">
                   <span className="text-blue-600 font-medium text-sm">Overall Score</span>
                   <Star className="w-5 h-5 text-blue-400 opacity-60" />
                 </div>
                 <div className="flex items-end gap-2">
                   <span className="text-3xl font-bold text-gray-900">
                     {formatScore(review_record.overall_score)}
                   </span>
                   <span className="text-sm text-gray-500 mb-1">/ 5.0</span>
                 </div>
                 {/* Progress Bar Container */}
                 <div className="w-full bg-blue-200 h-1.5 rounded-[1000px] mt-3 overflow-hidden">
                   <div 
                     className="bg-blue-500 h-full rounded-[1000px]" 
                     style={{ width: `${(review_record.overall_score / 5) * 100}%` }}
                   ></div>
                 </div>
               </div>

               {/* Summary Metric */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-300">
                  <span className="text-sm text-gray-500">Average Score</span>
                  <span className="font-semibold text-gray-900">
                    {formatScore(review_record.average_score)}
                  </span>
                </div>
             </div>
          </div>
          
          {/* Helper Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
               <ClipboardCheck className="w-24 h-24" />
            </div>
            <h4 className="font-bold text-lg mb-2 relative z-10">Need Help?</h4>
            <p className="text-slate-300 text-sm mb-4 relative z-10">
              Ensure all goals are updated before submitting your final self-review assessment.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Review;