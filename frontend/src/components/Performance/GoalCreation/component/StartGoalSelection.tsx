import { Dispatch, SetStateAction, useState } from 'react';
import { ArrowRight, FileText, Plus, Inbox, GitMerge, FolderX, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';
import Modal from '../../../shared/Modal';
import GoalLibraryPopup from './GoalLibraryPopup';
import { useGoalModel } from '../../GoalModelContext';
import { useCascadeMangerGoals } from '../../../../hooks/usePerformance';
import { CascadeGoal } from '../../../../types/goal';
import { useGetUiPermission } from '../../../../hooks/userUiPermission';
import { getActionsEnabled } from '../../../../utils/uiPermission';
import TeamGoalLibraryPopup from './TeamGoalLibraryPopup';
import TemplateCard, { TemplateCardsSkeleton } from './GoalSelectionCard';
import toast from 'react-hot-toast';
import { useCurrentEmployeeDetails } from '../../../../hooks/useEmployee';
import MandatoryGoalsBanner from './MandatoryGoalsBanner';

const APP_NAME = "Performance";
const PAGE_NAME = "Goal Creation";
interface StartGoalSelectionProps {
  onContinue?: () => void;
  setActiveState?: Dispatch<SetStateAction<number>>;
}

const StartGoalSelection = ({ onContinue }: StartGoalSelectionProps) => {
  const navigate = useNavigate();
  const { data: userUiPermission, isLoading: isPermissionLoading } =
    useGetUiPermission(APP_NAME);
  
  const { addDraftGoals, setDraftGoals } = useGoalModel();
  const [isGoalLibraryOpen, setIsGoalLibraryOpen] = useState(false);
 

  const {
    data: teamGoals,
    isLoading: teamGoalsLoading,
    error: teamGoalerr,
    refetch: refetchteamgoals,
  } = useCascadeMangerGoals({
    search: undefined,
    department: undefined,
    designation: undefined,
  });
  const { data: currentEmployee } = useCurrentEmployeeDetails({
    logged_in_employee_details: true,
  });
  const [openTeamGoals, setOpenTeamGoals] = useState(false);
  const permissions = getActionsEnabled(
    userUiPermission,
    [
      "start_from_blank",
      "use_goal_library",
      "ai_suggestion",
      "cascade_from_manager",
      "bulk_import",
    ],
    PAGE_NAME,
  );
  const {
    start_from_blank,
    use_goal_library,
    ai_suggestion,
    cascade_from_manager,
    bulk_import,
  } = permissions;
  const canStartBlank = isPermissionLoading ? false : start_from_blank;
  const canUseLibrary = isPermissionLoading ? false : use_goal_library;
  const canUseAI = isPermissionLoading ? false : ai_suggestion;
  const canCascade = isPermissionLoading ? false : cascade_from_manager;
  const canBulkImport = isPermissionLoading ? false : bulk_import;

  const hasAnyGoalOption =
    canStartBlank || canUseLibrary || canUseAI || canCascade;



  return (
    <>
      <MandatoryGoalsBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {isPermissionLoading ? (
          <TemplateCardsSkeleton />
        ) : hasAnyGoalOption ? (
          <>
            {canStartBlank && (
              <TemplateCard
                containerClass={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${!canUseLibrary ? "lg:col-span-2" : ""}`}
                icon={<Plus className="w-6 h-6" />}
                iconClass="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"
                title="Start from blank"
                description="Write your own OKR from scratch — full creative control."
                onUse={() => {
                  setDraftGoals([]);
                  onContinue?.();
                }}
                ariaLabel="Use start from blank"
                buttonClass="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <Typography className="text-xs sm:text-sm leading-relaxed text-slate-700 font-normal">
                    Build a completely customized OKR from scratch tailored to
                    your role. Set your own Objectives, Key Results, metrics,
                    and weightages with total flexibility.
                  </Typography>
                </div>
              </TemplateCard>
            )}

            {canUseLibrary && (
              <TemplateCard
                containerClass={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${!canStartBlank ? "lg:col-span-2" : ""}`}
                icon={<FileText className="w-6 h-6" />}
                iconClass="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0"
                title="From Goal Library"
                description="Browse 500+ pre-built OKR templates by role, department, and grade."
                onUse={() => setIsGoalLibraryOpen(true)}
                ariaLabel="Use goal library"
                buttonClass="bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">
                    Recommended for you
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">
                    Org templates
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">
                    Department
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">
                    Designation
                  </span>
                  <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">
                    Role-based
                  </span>
                </div>
              </TemplateCard>
            )}

                    {/* Cascade Card */}
                    {canCascade && (
                        <TemplateCard
                            containerClass={`overflow-hidden rounded-2xl border ${teamGoalsLoading
                                ? 'border-slate-200 bg-white'
                                : teamGoalerr
                                    ? 'border-red-200 bg-red-50/20'
                                    : (teamGoals?.data?.goals?.length ?? 0) > 0
                                        ? 'border-slate-200 bg-white'
                                        : 'border-gray-200 bg-gray-50/60 opacity-80'
                                } shadow-sm flex flex-col ${!canUseAI ? 'lg:col-span-2' : ''}`}
                            icon={<GitMerge className="h-4 w-4" />}
                            iconClass={`rounded-xl ${teamGoalsLoading
                                ? 'bg-indigo-50 text-indigo-500 animate-pulse'
                                : teamGoalerr
                                    ? 'bg-red-100 text-red-500'
                                    : (teamGoals?.data?.goals?.length ?? 0) > 0
                                        ? 'bg-indigo-50 text-indigo-500'
                                        : 'bg-gray-200 text-gray-400'
                                } p-2 flex items-center justify-center shrink-0`}
                            title="Cascade from Manager"
                            description={
                                teamGoalsLoading
                                    ? 'Loading manager goals...'
                                    : teamGoalerr
                                        ? 'Failed to load manager goals.'
                                        : (teamGoals?.data?.goals?.length ?? 0) > 0
                                            ? `Inherit a sub-OKR from one of ${currentEmployee?.reports_to_name ?? "-"}'s ${teamGoals?.data?.goals?.length} active goals.`
                                            : 'No active manager goals available to cascade.'
                            }
                            statPrimary={
                                teamGoalsLoading
                                    ? 'Fetching active goals...'
                                    : teamGoalerr
                                        ? 'Error fetching goals'
                                        : (teamGoals?.data?.goals?.length ?? 0) > 0
                                            ? `${teamGoals?.data?.goals?.length} active parent goal${(teamGoals?.data?.goals?.length ?? 0) > 1 ? 's' : ''}`
                                            : '0 active parent goals available'
                            }
                            onUse={
                                teamGoalsLoading
                                    ? undefined
                                    : teamGoalerr
                                        ? () => refetchteamgoals()
                                        : (teamGoals?.data?.goals?.length ?? 0) > 0
                                            ? () => setOpenTeamGoals(true)
                                            : () => toast('No manager goals available to cascade.')
                            }
                            buttonClass={
                              teamGoalsLoading ? 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                                    : (teamGoals?.data?.goals?.length ?? 0) > 0
                                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                            }
                            buttonText={'Use this'}
                        >
                            {teamGoalsLoading ? (
                                <div className="mt-4 space-y-2 animate-pulse">
                                    <div className="h-8 w-full rounded-lg bg-slate-100"></div>
                                    <div className="h-8 w-full rounded-lg bg-slate-100"></div>
                                </div>
                            ) : teamGoalerr ? (
                                <div className="mt-4 flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-red-200 bg-red-50/60 text-center">
                                    <div className="flex items-center gap-1.5 text-red-600 mb-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <Typography className="text-xs font-semibold">Failed to load manager goals</Typography>
                                    </div>
                                    <Typography className="text-[11px] text-slate-500 mb-2">
                                        {teamGoalerr?.message || 'Something went wrong while fetching manager goals.'}
                                    </Typography>
                                    <button
                                        type="button"
                                        onClick={() => refetchteamgoals()}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline inline-flex items-center gap-1"
                                    >
                                        <RefreshCw className="w-3 h-3" /> Try Again
                                    </button>
                                </div>
                            ) : (teamGoals?.data?.goals?.length ?? 0) > 0 ? (
                                <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2 space-y-1.5">
                                                {teamGoals?.data?.goals?.slice(0, 3).map((goal: CascadeGoal, index: number) => (
                                        <div key={goal.goal || index} className="flex items-start justify-between gap-3 rounded-lg bg-white border border-slate-100 px-3 py-2 shadow-2xs">
                                            <span className="min-w-0 text-[12px] text-slate-700 font-medium truncate">
                                                {goal.title}
                                            </span>
                                            {goal.weightage !== undefined && (
                                                <span className="shrink-0 text-[12px] font-semibold text-indigo-600">
                                                    {goal.weightage}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-white/70 p-3.5 text-center">
                                    <Typography className="text-xs text-gray-500 font-medium">
                                        🚫 No active manager goals available to cascade.
                                    </Typography>
                                </div>
                            )}
                        </TemplateCard>
                    )}
                </>
        ) : (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-10 text-center flex flex-col items-center justify-center min-h-[240px]">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-100/80 shadow-xs">
              <FolderX className="w-7 h-7" />
            </div>
            <Typography variant="h4" className="font-bold text-gray-900 mb-1.5">
              You don't have any template
            </Typography>
            <Typography
              variant="bodyMedium"
              className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed"
            >
              You do not have permission to access any goal creation templates
              or options. Please contact your manager or HR administrator to
              request access.
            </Typography>
          </div>
        )}
      </div>
      {canBulkImport && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm mb-8 lg:mb-12">
          <div className="flex w-full min-w-0 items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
              <Inbox className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="subheading"
                className="font-semibold text-gray-900"
              >
                Need to create many goals at once?
              </Typography>
              <Typography
                variant="bodyMedium"
                className="text-gray-500 text-sm"
              >
                Bulk-import via CSV/XLSX — up to 5,000 rows with row-level
                validation. Suitable for managers cascading to a team.
              </Typography>
            </div>
          </div>
          <Button
            variant="outline"
            bgColor="text"
            className="w-full sm:w-auto justify-center whitespace-nowrap bg-white"
            onClick={() =>
              navigate("/webapp/performance-app/my-goals/bulk-import")
            }
          >
            Bulk Import <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

        <Modal
            isOpen={isGoalLibraryOpen}
            onClose={() => setIsGoalLibraryOpen(false)}
            size="xl"
            className="max-w-[1300px] p-0"
        >
            <GoalLibraryPopup
                onClose={() => setIsGoalLibraryOpen(false)}
                onUseTemplate={(selected, source) => {
                    setIsGoalLibraryOpen(false);
                    const selectedGoals = Array.isArray(selected) ? selected : [selected];
                    if (source === 'recommended') {
                        setDraftGoals(selectedGoals);
                    } else {
                        setDraftGoals([])
                        addDraftGoals(selectedGoals);
                    }
                    onContinue?.();
                }}
            />
        </Modal>
        <Modal
            isOpen={openTeamGoals}
            onClose={() => setOpenTeamGoals(false)}
            size="xl"
            className="max-w-[1300px] p-0"
        >
            <TeamGoalLibraryPopup
                onClose={() => setOpenTeamGoals(false)}
                onUseTemplate={(selected) => {
                    setOpenTeamGoals(false);
                    setDraftGoals(selected as CascadeGoal[])
                    onContinue?.()


                }}
            />
        </Modal>

   
    </>
  );
};

export default StartGoalSelection;
