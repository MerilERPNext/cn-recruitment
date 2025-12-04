import React, { useEffect, useMemo, useState } from 'react';
import GoalPlanCard from '../NewGoalPlan/GoalPlanCard';
import { Award, Flag, Goal, ClipboardCheck } from 'lucide-react'; // Removed Plus icon
import GoalPendingApprovalTable from '../NewGoalPlan/GoalPendingApprovalTable';
import { useScreenSize } from '../../../hooks/useScreenSize';
import GoalPendingMobileCard from '../NewGoalPlan/GoalPendingMobileCard';
import CreateGoalDialog from '../NewGoalPlan/CreateGoalDialog';
import { useGetAllGoalPlans, useGetCheckInButtonVisibility, useGetTeamGoalPlan, useGoalDetails } from '../../../hooks/useGoal';
import CustomDropdown from '../../shared/CustomDropdown';
import { createPortal } from 'react-dom';
import RequestCheckinDialog from './RequestCkeckinDialog';
import { useCurrentEmployeeIdCard } from '../../../hooks/useEmployee';
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

  const [ReporteeGoalPlanId, setReporteeGoalPlanId] = useState<any>(null);
  const {
    data: currentEmployee,
    isLoading: EmployeeLoading
  } = useCurrentEmployeeIdCard();
  const employeeId = currentEmployee?.id ?? "";

  const {
    data: goalPlanIds,
    isLoading: goalPlanIdsLoading
  } = useGetAllGoalPlans(employeeId || "");

  const firstGoalPlanName = goalPlanIds?.[0]?.name ?? "";

  const {
    data: goalPlan,
    isLoading: teamGoalPlanLoading
  } = useGoalDetails(firstGoalPlanName || "");
  const { data: TeamGoalPlan, isLoading: loadingTeamGoalPlan } = useGetTeamGoalPlan(goalPlan ? goalPlan.goal_plan_framework : "");

  const isLoading = EmployeeLoading || goalPlanIdsLoading || teamGoalPlanLoading || loadingTeamGoalPlan;
  console.log("Team Goal Plan Data: ", TeamGoalPlan);
  // 2. Local State for Reportee Selection
  const [selectedReportee, setSelectedReportee] = useState<string>('');
  const [showChekcinRequestDialog, setShowCheckinRequestDialog] = useState<boolean>(false);

  const selectedReporteesGoalPlan = useMemo(() => {
    if (!selectedReportee || !TeamGoalPlan) return null;
    return TeamGoalPlan.find((reporteeGoalPlan: any) => reporteeGoalPlan.employee === selectedReportee);
  }, [selectedReportee]);

  // 3. Prepare Dropdown Options
  const goalOptions = useMemo(() => {
    if (!selectedReporteesGoalPlan) return [];

    return [{
      label: selectedReporteesGoalPlan?.name,
      value: selectedReporteesGoalPlan?.name
    }];
  }, [selectedReporteesGoalPlan]);

  const reporteeOptions = useMemo(() => {
    if (!TeamGoalPlan) return [];
    return TeamGoalPlan.map((TeamGoalReportee: any) => ({
      label: TeamGoalReportee.employee_name,
      value: TeamGoalReportee.employee,
    }));
  }, [TeamGoalPlan]);

  const handleReporteeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportee(e.target.value);
  };

  useEffect(() => {
    if (TeamGoalPlan && TeamGoalPlan.length > 0) {
      setReporteeGoalPlanId(TeamGoalPlan[0].name);
      setSelectedReportee(TeamGoalPlan[0].employee);
    }
  }, [TeamGoalPlan]);

  useEffect(() => {

  }, [selectedReportee]);

  console.log("id, selec id", ReporteeGoalPlanId, selectedReportee)
  const { data } = useGetCheckInButtonVisibility(ReporteeGoalPlanId || "", selectedReportee || "");
  console.log("Check-In Button Visibility Data:", data);

  // INITIAL LOADING STATE (Page Load)
  if (isLoading) {
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
          <ContentSkeleton />
        </div>
      </div>
    );
  }

  // IF NO GOALS AVAILABLE (EMPTY STATE)
  if (!TeamGoalPlan || TeamGoalPlan.length === 0) {
    return (
      <div className="w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
          <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-12 h-12 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Team Member Found</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            There are currently no Team Member assigned to you. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-gray-50/50 sm:px-8 px-4 pt-8 pb-12'>
      <RequestCheckinDialog
        isOpen={showChekcinRequestDialog}
        onClose={() => setShowCheckinRequestDialog(false)}
        onSubmitSuccess={() => setShowCheckinRequestDialog(false)}
        goalPlan={ReporteeGoalPlanId}
      />
      <div className="w-full">

        {/* Header / Controls */}
        <div className='flex flex-col sm:flex-row items-start sm:items-end mb-8 gap-4'>

          {/* Left: Goal Plan Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 tracking-wider mb-2">
              Select Reportee
            </label>
            <div>
              <CustomDropdown
                options={reporteeOptions}
                value={selectedReportee}
                onChange={handleReporteeChange}
                position="bottom-right"
              />
            </div>
          </div>

          {/* Right: Reportee Dropdown (Replaces Button) */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 tracking-wider mb-2 ml-1">
              Select Goal Plan
            </label>
            <div>
              <CustomDropdown
                options={goalOptions}
                value={ReporteeGoalPlanId}
                onChange={(e) => setReporteeGoalPlanId(e.target.value)}
                position="bottom-right"
              />
            </div>
          </div>
          {data?.show_request_checkin &&
            <button
              onClick={() => setShowCheckinRequestDialog(true)}
              className='px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 ml-4 '>Request Checkin</button>}
        </div>

        {/* MAIN CONTENT AREA LOGIC */}
        {!TeamGoalPlan ? (
          <ContentSkeleton />
        ) : !ReporteeGoalPlanId ? (
          <div className='mt-20 bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center'>
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Goal className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No Plan Selected</h3>
            <p className="text-gray-500 mt-1">Please select a goal plan from the dropdown above to view details.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Goal Summary Cards */}
            <div className='grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 sm:gap-8 gap-4'>
              <GoalPlanCard title="Total Goals" data={selectedReporteesGoalPlan?.total_goals} icon={Icons[0]} description='+2 from last month' />
              <GoalPlanCard title="Total Sub Goals" data={selectedReporteesGoalPlan?.total_subgoals} icon={Icons[1]} description='Tasks within goals' />
              <GoalPlanCard title="Average Achievement" data={selectedReporteesGoalPlan?.average_achievement} icon={Icons[2]} description='Progress across all goals' />
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
                    {selectedReporteesGoalPlan?.goal_plan_items?.length || 0}
                  </span>
                </div>
              </div>

              {/* Pending Approval Table */}
              {isDesktop ? (
                <div className="overflow-x-auto">
                  <GoalPendingApprovalTable tableData={selectedReporteesGoalPlan?.goal_plan_items || []} />
                </div>
              ) : (
                <div className='flex flex-col gap-4'>
                  {selectedReporteesGoalPlan?.goal_plan_items?.map((item: any, i: number) => (
                    <GoalPendingMobileCard key={i} data={item} />
                  ))}
                </div>
              )}

              {(!selectedReporteesGoalPlan?.goal_plan_items || selectedReporteesGoalPlan?.goal_plan_items.length === 0) && (
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