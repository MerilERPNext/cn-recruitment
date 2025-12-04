import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  MoreHorizontal,
  Clock,
  ChevronRight,
  ChevronLeft,
  FileText,
  User,
} from 'lucide-react';

import { useGetReviewRecordListView } from '../../../hooks/useGoal';
import useCurrentUser from '../../../hooks/useCurrentUser';
import { createSearchParams, useNavigate } from 'react-router-dom';

const ITEMS_PER_PAGE = 8;

// Transform API → UI Model 
interface ReviewRecord {
  id: string;
  employeeName: string;
  employeeCode: string;
  employeeUserId: string;
  department: string;
  status: "Active" | "Completed";
  achievement?: number;
  score?: number;
  overall?: number;
  reviewFramework?: string;
  goalPlan?: string;
  cycleName?: string;
  startDate?: string;
  endDate?: string;
}


const TeamReview = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: currentUser } = useCurrentUser();
  const { data: reviewRecordListView } = useGetReviewRecordListView(
    currentUser?.name || "",
    "Team"
  );
  console.log("reviewRecordListView", reviewRecordListView)

  const apiData = reviewRecordListView?.data || [];

  const formattedReviews = useMemo((): ReviewRecord[] => {
    let data = apiData.filter(item => item.has_active_review)
    const cleanedData = data.map((item): ReviewRecord => ({
      id: item.review_record?.name || "N/A",
      employeeName: item.employee_name,
      employeeCode: item.employee,
      employeeUserId: item.user_id,
      department: item.department,
      status: item.has_active_review ? "Active" : "Completed",
      achievement: item.review_record?.average_achievement,
      score: item.review_record?.average_score,
      overall: item.review_record?.overall_score,
      reviewFramework: item.review_record?.review_framework,
      goalPlan: item.review_record?.goal_plan,
      cycleName: item.review_cycle?.review_cycle_name,
      startDate: item.review_cycle?.start_date,
      endDate: item.review_cycle?.end_date,
    }))
    return cleanedData;
  }, [apiData]);

  // Filter Logic
  const filteredReviews = formattedReviews.filter((review) => {
    const matchesSearch =
      review.employeeName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      activeTab === "All"
        ? true
        : activeTab === "Completed"
          ? review.status === "Completed"
          : review.status !== "Completed";

    return matchesSearch && matchesTab;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredReviews.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentReviews = filteredReviews.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handlePageChange = (newPage: any) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">

      <main className="max-w-[1600px] mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">My Team Reviews</h2>
            <p className="text-slate-500 mt-1">
              Manage evaluations and track team performance.
            </p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-lg flex items-center gap-2">
            <FileText className="w-4 h-4" />
            New Evaluation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between">

          <div className="flex p-1 bg-slate-100 rounded-lg">
            {["All", "Active", "Completed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md text-sm font-medium ${activeTab === tab
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee name..."
              className="pl-10 pr-3 py-2.5 border rounded-lg w-full bg-white focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

        </div>

        {/* GRID */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {currentReviews.length > 0 ? (
              currentReviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed">
                <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No records found for "{searchTerm}"</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredReviews.length > 0 && (
            <div className="flex items-center justify-between border-t bg-white px-4 py-3 rounded-lg shadow-sm">

              {/* Mobile */}
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  Previous
                </button>

                <p className="text-sm">
                  Page {currentPage} of {totalPages}
                </p>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>

              {/* Desktop */}
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <p className="text-sm text-slate-700">
                  Showing <b>{startIndex + 1}</b> to{" "}
                  <b>{Math.min(startIndex + ITEMS_PER_PAGE, filteredReviews.length)}</b> of{" "}
                  <b>{filteredReviews.length}</b>
                </p>

                <nav className="inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-2 py-2 border rounded-l-md text-slate-400"
                  >
                    <ChevronLeft />
                  </button>

                  {[...Array(totalPages)].map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePageChange(idx + 1)}
                      className={`px-4 py-2 border ${currentPage === idx + 1
                        ? "bg-blue-600 text-white"
                        : "hover:bg-slate-100"
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-2 border rounded-r-md text-slate-400"
                  >
                    <ChevronRight />
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// -----------------------------
// REVIEW CARD (API BASED)
// -----------------------------
const ReviewCard = ({ review }: { review: ReviewRecord }) => {
  const statusColors = {
    Completed: "bg-green-50 text-green-600 border-green-100",
    Active: "bg-blue-50 text-blue-600 border-blue-100",
    Critical: "bg-red-50 text-red-600 border-red-100",
  };

  const navigate = useNavigate();
  const handleView = ({ review, user_id }: { review: string, user_id: string }) => {
    const queryParams = createSearchParams({
      user_id: user_id,
      review: review,
    }).toString();
    navigate(`/webapp/performance-app/employee-review?${queryParams}`);
  }

  return (
    <div className="bg-white p-6 rounded-2xl border shadow-sm hover:shadow-lg transition-all">

      {/* Header */}
      <div className="flex justify-between">
        <div>
          <h3 className="font-bold text-slate-900">{review.employeeName}</h3>
          <p className="text-xs text-slate-500">{review.department}</p>
        </div>
        <MoreHorizontal className="text-slate-400" />
      </div>

      {/* Status */}
      <div className="mt-3">
        <span
          className={`text-xs px-2 py-1 rounded-full border ${statusColors[review.status]}`}
        >
          {review.status}
        </span>
      </div>

      <div className="mt-4 text-sm space-y-1">
        <p><b>Review ID:</b> {review.id}</p>
        <p><b>Review Cycle:</b> {review.cycleName}</p>
        <p><b>Goal Plan:</b> {review.goalPlan}</p>
        <p><b>Achievement:</b> {review.achievement ?? "N/A"}</p>
        <p><b>Score:</b> {review.score ?? "N/A"}</p>
      </div>

      <div className="mt-6 pt-4 border-t flex justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>End {review.endDate}</span>
        </div>

        <button onClick={() => handleView({ review: review.id, user_id: review.employeeUserId })} className="text-blue-600 flex items-center gap-1">
          View <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};

export default TeamReview;
