import React, { useMemo, useState } from 'react';
import GoalPlanCard from './GoalPlanCard';
import { Award, Flag, Goal, Plus, ClipboardCheck } from 'lucide-react';
import GoalPendingApprovalTable from './GoalPendingApprovalTable';
import { useScreenSize } from '../../../hooks/useScreenSize';
import GoalPendingMobileCard from './GoalPendingMobileCard';
import CreateGoalDialog from './CreateGoalDialog';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
import { useGetAllGoalPlans, useGetCheckInButtonVisibility, useGoalDetails } from '../../../hooks/useGoal';
import { useGoalModel } from '../GoalModelContext';
import CustomDropdown from '../../shared/CustomDropdown';
import { createPortal } from 'react-dom';
import { GoalPlanId } from '../../../types/goal';
import { useNavigate } from 'react-router-dom';

// CARD ICONS
const Icons = [
  <Flag className='w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 p-2.5' />,
  <Goal className='w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 p-2.5' />,
  <Award className='w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 p-2.5' />
];

// --- LOADING SKELETON COMPONENTS ---

const SkeletonCard = () => (
  <div className="animate-pulse bg-white border border-gray-100 h-32 rounded-xl shadow-sm p-4">
    <div className="h-full flex flex-col justify-between">
      <div className="h-10 w-10 bg-gray-100 rounded-lg mb-2"></div>
      <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
    </div>
  </div>
);

const SkeletonLine = ({ width = "100%" }: { width?: string }) => (
  <div className={`animate-pulse h-4 bg-gray-200 rounded mb-2`} style={{ width }}></div>
);

const SkeletonTable = () => (
  <div className="animate-pulse space-y-4 mt-6">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="h-16 bg-gray-50 rounded-lg border border-gray-100"></div>
    ))}
  </div>
);

const ContentSkeleton = () => (
  <div className="space-y-8">
    <div className='grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-8 gap-4'>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
    <div className="bg-white border border-gray-100 shadow-sm lg:p-8 px-4 rounded-xl mt-8">
      <div className="flex justify-between mb-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      </div>
      <SkeletonTable />
    </div>
  </div>
);

// --- MAIN COMPONENT ---

const NewGoalPlan: React.FC = () => {
  const { isDesktop } = useScreenSize();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { setGoalPlanId, selectedGoalPlanId } = useGoalModel();
  const { isLoading, data: currentEmployeeIdCard } = useCurrentEmployeeIdCard();
  const { data: GoalPlanIds, isLoading: goalsLoading } = useGetAllGoalPlans(currentEmployeeIdCard?.id || "");
  const { data: goalPlan, isLoading: goalPlanLoading } = useGoalDetails(selectedGoalPlanId || "");
 
  const options = useMemo(() => {
    if(!GoalPlanIds || GoalPlanIds.length==0) return [];
    setGoalPlanId(GoalPlanIds[0].name);
    return GoalPlanIds?.map((goal: GoalPlanId) => ({
      label: goal.name,
      value: goal.name
    })) || [];
  }, [GoalPlanIds]);


    const navigate = useNavigate();
  
    const handleCheckin = ()=>{
      if(!selectedGoalPlanId) return;
      navigate(`/webapp/performance-app/checkin/${selectedGoalPlanId}`);
    }

  const { data: CheckinButtonVisibility } = useGetCheckInButtonVisibility(selectedGoalPlanId, currentEmployeeIdCard?.id || "");
  
  // INITIAL LOADING STATE (Page Load)
  // This shows when we are fetching the list of plans initially
  if (isLoading || goalsLoading) {
    return (
      <div className='w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8'>
        <div className="w-full">
          {/* Dropdown Skeleton */}
          <div className="mb-8 flex justify-between items-end">
            <div className="w-1/3">
              <SkeletonLine width="30%" />
              <div className="h-11 w-64 bg-gray-200 animate-pulse rounded-lg mt-2"></div>
            </div>
            <div className="h-10 w-32 bg-gray-200 animate-pulse rounded-lg"></div>
          </div>
          
          {/* Content Skeleton */}
          <ContentSkeleton />
        </div>
      </div>
    );
  }

  // IF NO GOALS AVAILABLE (EMPTY STATE)
  if (!GoalPlanIds || GoalPlanIds.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
          <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-12 h-12 text-blue-600" /> 
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Goal Plans Found</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            There are currently no goal plans assigned to you. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-12'>
      <div className="w-full">

        {CheckinButtonVisibility?.show_checkin && 
          <div className="mb-6 p-4 bg-white border border-green-200 rounded-lg shadow-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-medium text-green-800 mb-1">Check-In Available</h3>
              <p className="text-green-700 text-sm">
                {CheckinButtonVisibility.checkin_description} (Due: {new Date(CheckinButtonVisibility.due_date).toLocaleDateString()})
              </p>
            </div>
            <button
              className='px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200'
              onClick={handleCheckin}
            >
              Check-In Now
            </button>
          </div>
        }  
        {/* Header / Controls */}
        <label className="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-1">
          Select Goal Plan
        </label>
        <div className='flex flex-row items-center justify-between mb-8 gap-4'>
          <div className="flex flex-col w-full sm:w-auto">
            <div className="w-full sm:w-72">
              <CustomDropdown
                options={options}
                value={selectedGoalPlanId}
                onChange={(e) => setGoalPlanId(e.target.value)}
                position="bottom-right"
              />
            </div>
          </div>

          {/* Button is visible if a plan is selected OR if we are loading a selected plan */}
          {(selectedGoalPlanId) && (
            <button
              className='px-5 py-2.5 nowrap whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 disabled:opacity-70'
              onClick={() => setIsDialogOpen(true)}
              disabled={goalPlanLoading} // Prevent clicks while loading
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          )}
        </div>

        {/* MAIN CONTENT AREA LOGIC */}
        {goalPlanLoading ? (
          // 1. LOADING: If switching plans, show Skeleton underneath the dropdown
          <ContentSkeleton />
        ) : !selectedGoalPlanId ? (
          // 2. NO SELECTION: If no plan selected, show prompt
          <div className='mt-20 bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center'>
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Goal className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Plan Selected</h3>
            <p className="text-gray-500 mt-1">Please select a goal plan from the dropdown above to view details.</p>
          </div>
        ) : (
          // 3. DATA LOADED: Show the Cards and Table
          <div className="space-y-8">
            {/* Goal Summary Cards */}
            <div className='grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-8 gap-4'>
              <GoalPlanCard title="Total Goals" data={goalPlan?.total_goals} icon={Icons[0]} description='+2 from last month' />
              <GoalPlanCard title="Total Sub Goals" data={goalPlan?.total_subgoals} icon={Icons[1]}  description='Tasks within goals' />
              <GoalPlanCard title="Average Achievement" data={goalPlan?.average_achievement} icon={Icons[2]} description='Progress across all goals' />
            </div>

            {/* Table Container */}
            <div className='bg-white border border-gray-100 shadow-sm lg:p-8 p-5 rounded-2xl overflow-hidden'>
              <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2'>
                <div className='flex items-center gap-3'>
                   <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                   <h3 className='text-xl font-bold text-gray-900'>
                      Goals Pending Approval
                   </h3>
                   <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {goalPlan?.goal_plan_items?.length || 0}
                   </span>
                </div>
              </div>

              {/* Pending Approval Table */}
              {isDesktop ? (
                <div className="overflow-x-auto">
                   <GoalPendingApprovalTable tableData={goalPlan?.goal_plan_items || []} />
                </div>
              ) : (
                <div className='flex flex-col gap-4'>
                  {goalPlan?.goal_plan_items?.map((item: any, i: number) => (
                    <GoalPendingMobileCard key={i} data={item} />
                  ))}
                </div>
              )}
              
              {(!goalPlan?.goal_plan_items || goalPlan?.goal_plan_items.length === 0) && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    No goals pending approval.
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
      {
        createPortal(
        <CreateGoalDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />,
        document.body
        )
    }
    </div>
  );
};

export default NewGoalPlan;