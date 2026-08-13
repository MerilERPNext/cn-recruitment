import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Paperclip, AlertCircle, ClipboardList, X, Edit, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Typography } from '../../../shared/atoms/Typography';
import Badge, { type BadgeVariant } from '../../../shared/Badge';
import Button from '../../../shared/atoms/Button';
import { Card } from '../../../shared/atoms/Card';
import { useGoalCheckIns, useGoalDetail, useSubmitGoalCheckIn, useSaveGoals } from '../../../../hooks/usePerformance';
import useCurrentUser from '../../../../hooks/useCurrentUser';
import type { GoalCheckInSentiment, GoalDetailKeyResult } from '../../../../types/goal';
import FrappeAPI from '../../../../utils/frappeAPI';
import { getPerformanceErrorMessage } from '../../../../services/performanceService';
import { KRCheckInModal } from './KRCheckInModal';
import GoalDetailSkeleton from './GoalDetailSkeleton';
import KRCheckInsAccordion from './KRCheckInsAccordion';
import CheckInItem from './CheckInItem';

const CircularProgress = ({ score }: { score: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-gray-100"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-gray-900">{score}</span>
        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
};

const getStatusVariant = (status?: string): BadgeVariant => {
  const s = (status ?? '').toLowerCase();
  if (s === 'on-track' || s === 'completed') return 'success';
  if (s === 'at-risk' || s === 'in progress') return 'warning';
  if (s === 'off-track' || s === 'cancelled') return 'danger';
  if (s === 'not started') return 'default';
  return 'default';
};

const sentimentStyles: Record<GoalCheckInSentiment, { active: string; dot: string }> = {
  'On Track': { active: 'border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200', dot: 'bg-green-500' },
  'At Risk': { active: 'border-amber-300 bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  Blocked: { active: 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
};


const toSentiment = (status?: string): GoalCheckInSentiment => {
  const normalized = status?.toLowerCase().replace(/[-_]/g, ' ').trim();
  if (normalized === 'at risk') return 'At Risk';
  if (normalized === 'blocked' || normalized === 'off track') return 'Blocked';
  return 'On Track';
};

interface GoalDetailsProps {
  goalId?: string;
  onBack?: () => void;
}

const GoalDetails: React.FC<GoalDetailsProps> = ({ goalId, onBack }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = goalId || paramId || '';

  const { data: goalResponse, isLoading, isError, error } = useGoalDetail(id);
  const { data: parentCheckInsResponse, isLoading: isParentCheckInsLoading } = useGoalCheckIns(id);

  const [selectedKRForCheckIn, setSelectedKRForCheckIn] = React.useState<{ kr: GoalDetailKeyResult; index: number } | null>(null);
  const [isCheckInModalOpen, setIsCheckInModalOpen] = React.useState(false);

  const firstKRId = goalResponse?.data?.key_results?.[0]?.goal_key || goalResponse?.data?.key_results?.[0]?.goal || '';
  const [openKRId, setOpenKRId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (firstKRId && openKRId === null) {
      setOpenKRId(firstKRId);
    }
  }, [firstKRId]);
  const { mutateAsync: submitCheckIn, isPending: isSubmittingCheckIn } = useSubmitGoalCheckIn();
  const { mutateAsync: saveGoals, isPending: isSavingGoals } = useSaveGoals();
  const { data: currentUser } = useCurrentUser();
  const topRef = React.useRef<HTMLDivElement>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement>(null);
  const [newValue, setNewValue] = React.useState('');
  const [sentiment, setSentiment] = React.useState<GoalCheckInSentiment>('On Track');
  const [note, setNote] = React.useState('');
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [latestProgress, setLatestProgress] = React.useState<number | null>(null);

  const [isEditingKRs, setIsEditingKRs] = React.useState(false);
  const [editingKRs, setEditingKRs] = React.useState<{ id: string; title: string; weightage: string; goal_key?: string }[]>([]);

  const handleOpenKRCheckInModal = (kr: GoalDetailKeyResult, index: number) => {
    setSelectedKRForCheckIn({ kr, index });
    setIsCheckInModalOpen(true);
  };


  React.useEffect(() => {
    if (goalResponse?.data) {
      setNewValue(String(goalResponse.data.achievement ?? 0));
      setSentiment(toSentiment(goalResponse.data.status || goalResponse.data.goal_status));
      setLatestProgress(null);
    }
  }, [goalResponse?.data?.goal_key]);

  const handleStartEditKRs = () => {
    if (goalResponse?.data?.key_results && goalResponse.data.key_results.length > 0) {
      setEditingKRs(goalResponse.data.key_results.map((kr: any, idx: number) => ({
        id: `kr-${Date.now()}-${idx}`,
        title: kr.title || '',
        weightage: String(kr.weightage || ''),
        goal_key: kr.goal_key,
      })));
    } else {
      setEditingKRs([{ id: `kr-${Date.now()}`, title: '', weightage: '' }]);
    }
    setIsEditingKRs(true);
  };

  const handleCancelEditKRs = () => {
    setIsEditingKRs(false);
    setEditingKRs([]);
  };

  const handleUpdateKRs = async () => {
    const hasEmpty = editingKRs.some(kr => !kr.title.trim() || !kr.weightage || Number(kr.weightage) <= 0);
    if (hasEmpty) {
      toast.error('Please fill or delete the empty key result.');
      return;
    }
    const totalWeight = editingKRs.reduce((sum, kr) => sum + Number(kr.weightage), 0);
    if (totalWeight !== 100) {
      toast.error(`Total weightage must be 100% (currently ${totalWeight}%).`);
      return;
    }

    try {
      const payload = {
        action: 'draft' as const,
        goals: [{
          goal: goalResponse!.data.goal,
          goal_type: goalResponse!.data.goal_type,
          title: goalResponse!.data.title,
          description: goalResponse!.data.description || '',
          weightage: goalResponse!.data.weightage,
          department: goalResponse!.data.department,
          designation: goalResponse!.data.designation,
          key_results: editingKRs.map(kr => ({
            title: kr.title,
            weightage: Number(kr.weightage)
          }))
        }]
      };
      await saveGoals(payload);
      toast.success('Key results updated successfully.');
      setIsEditingKRs(false);
    } catch (e: any) {
      toast.error(getPerformanceErrorMessage(e, 'Failed to update key results.'));
    }
  };

  const addKRField = () => setEditingKRs(prev => [...prev, { id: `kr-${Date.now()}`, title: '', weightage: '' }]);
  const updateKRField = (id: string, field: 'title' | 'weightage', value: string) => {
    setEditingKRs(prev => prev.map(kr => kr.id === id ? { ...kr, [field]: value } : kr));
  };
  const removeKRField = (id: string) => setEditingKRs(prev => prev.filter(kr => kr.id !== id));

  const handleSubmitCheckIn = async () => {
    const parsedValue = Number(newValue);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      toast.error('Enter a valid progress value.');
      return;
    }

    try {
      let attachmentUrl: string | undefined;
      if (attachment) {
        const uploaded = await FrappeAPI.uploadFile(attachment, attachment.name);
        attachmentUrl = uploaded.file_url;
      }

      const response = await submitCheckIn({
        goal: id,
        new_value: parsedValue,
        sentiment,
        note: note.trim(),
        attachment: attachmentUrl,
      });

      setLatestProgress(response.data.progress);
      setNote('');
      setAttachment(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
      toast.success(response.message || 'Check-in submitted.');
    } catch (submitError) {
      console.error('Failed to submit goal check-in:', submitError);
      toast.error(getPerformanceErrorMessage(submitError, 'Unable to submit check-in. Please try again.'));
    }
  };

  if (!id) {
    return (
      <div className="p-6">
        <Typography variant="bodyMedium">Goal not found.</Typography>
        <Button variant="outline" bgColor="text" onClick={() => (onBack ? onBack() : navigate(-1))} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <GoalDetailSkeleton />
    );
  }

  if (isError || !goalResponse?.data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <Typography variant="bodySmall" className="text-red-600">
            {error?.message || 'Failed to load goal details. Please try again.'}
          </Typography>
          <Button variant="outline" bgColor="text" onClick={() => (onBack ? onBack() : navigate(-1))} className="mt-2">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const goal = goalResponse.data;
  const ownerName = currentUser?.full_name || currentUser?.first_name || currentUser?.email || '-';
  const displayedProgress = latestProgress ?? goal.achievement ?? 0;
  const isPendingGoal = goal.goal_status?.toLowerCase() === 'pending';
  const isAutoCalculate = Boolean(goal.auto_calculate);
  const checkIns = parentCheckInsResponse?.data?.check_ins ?? [];
  const isCheckInsLoading = isParentCheckInsLoading;
 
  return (
    <div ref={topRef} id="goal-details-container" className="min-h-full bg-[#f8fafc] overflow-y-auto p-3 font-sans sm:p-6">
      <div className="mx-auto max-w-screen space-y-4 sm:space-y-6">

        {/* Back Button */}
        <button
          aria-label="Back to goals"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Goals
        </button>

        {/* Top Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row justify-between gap-6">
            <div className="min-w-0 space-y-4 flex-1">
              {/* Badges Row: OKR → Locked → Department → Designation → Status */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={goal.goal_type || 'OKR'} variant="purple" size="sm" />

                {goal.department_title && (
                  <Badge label={goal.department_title} variant="default" size="sm" />
                )}
                {goal.designation_title && (
                  <Badge label={goal.designation_title} variant="info" size="sm" />
                )}
                <Badge
                  label={goal.status || '-'}
                  variant={getStatusVariant(goal.status)}
                  size="sm"
                  pulse={{ show: true }}
                />
              </div>

              {/* Title */}
              <div className="min-w-0">
                <Typography variant="h3" className="mb-2 text-xl leading-tight sm:text-2xl break-words [word-break:break-word]">{goal.title || '-'}</Typography>
                <Typography variant="bodySmall" className="text-gray-500 break-words [word-break:break-word]">{goal.description || '-'}</Typography>
              </div>

              {/* Meta grid: Owner, Start, End, Weightage */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Owner</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">{ownerName}</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Start</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">{goal.start_date || '-'}</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">End</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">{goal.end_date || '-'}</Typography>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" className="text-gray-500 uppercase tracking-wider block mb-1 font-semibold">Weightage</Typography>
                  <Typography variant="bodySmall" className="font-semibold text-gray-900">{goal.weightage !== undefined ? `${goal.weightage}%` : '-'}</Typography>
                </div>
              </div>
            </div>

            {/* Right side: Score circle */}
            <div className="shrink-0 flex flex-col items-center justify-center bg-gray-50 rounded-xl p-4 sm:p-6 lg:w-[200px]">
              <CircularProgress score={goal.score ?? 0} />
              <Typography variant="caption" className="text-gray-500 mt-3 text-center">
                {goal.achievement ? `${goal.achievement}% Achieved` : `${goal.score ?? 0} / 100`}
              </Typography>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">

            {/* Key Results */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <Typography variant="h4">Key Results</Typography>
                {!isEditingKRs && isPendingGoal && (
                  <Button
                    variant="outline"
                    bgColor="text"
                    size="sm"
                    onClick={handleStartEditKRs}
                    icon={goal.key_results?.length ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  >
                    {goal.key_results?.length ? 'Edit' : 'Add KR'}
                  </Button>
                )}
              </div>

              <div className="space-y-4 sm:space-y-6">
                {isEditingKRs ? (
                  <div className="space-y-4">
                    {editingKRs.map((kr) => (
                      <div key={kr.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Key Result Title</label>
                          <input
                            type="text"
                            value={kr.title}
                            onChange={(e) => updateKRField(kr.id, 'title', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                            placeholder="Enter key result"
                          />
                        </div>
                        <div className="w-full sm:w-24 shrink-0">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Weight (%)</label>
                          <input
                            type="number"
                            value={kr.weightage}
                            onChange={(e) => updateKRField(kr.id, 'weightage', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                            placeholder="%"
                          />
                        </div>
                        <div className="pt-0 sm:pt-5">
                          <button
                            type="button"
                            onClick={() => removeKRField(kr.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            aria-label="Remove KR"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addKRField}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </button>
               

                    {(() => {
                      const currentTotalWeight = editingKRs.reduce((sum, kr) => sum + Number(kr.weightage || 0), 0);
                      return (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
                          <div>
                            {currentTotalWeight !== 100 && (
                              <span className="text-xs font-medium text-red-500">
                                Total weightage must be 100% (currently {currentTotalWeight}%)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <Button variant="outline" bgColor="text" onClick={handleCancelEditKRs}>
                              Cancel
                            </Button>
                            <Button variant="contain" bgColor="primary" onClick={handleUpdateKRs} disabled={isSavingGoals}>
                              {isSavingGoals
                                ? (goal.key_results?.length ? 'Updating...' : 'Adding...')
                                : (goal.key_results?.length ? 'Update' : 'Add')}
                            </Button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : goal.key_results && goal.key_results.length > 0 ? (
                  goal.key_results.map((kr: GoalDetailKeyResult, idx: number) => (
                    <div key={kr.goal_key || idx} className="relative">
                      <div className="flex flex-col gap-2 mb-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                          <div className="shrink-0">
                            <Badge label={`KR ${idx + 1}`} variant="purple" size="sm" />
                          </div>
                          <Typography variant="bodyMedium" className="font-medium leading-snug text-gray-900 break-words [word-break:break-word]">{kr.title || '-'}</Typography>
                        </div>
                        <div className="flex items-center gap-3 text-left sm:text-right">
                          <div>
                            <Typography variant="bodyMedium" className="font-bold text-gray-900">{kr.achievement ?? 0}% Achieved</Typography>
                            <Typography variant="caption" className="text-gray-500">Weightage: {kr.weightage ?? 0}%</Typography>
                          </div>
                         {isAutoCalculate && <Button
                            size="sm"
                            variant="outline"
                            bgColor="text"
                            className={`text-xs border-blue-200 text-blue-600 transition-colors shrink-0 hover:bg-blue-50 hover:border-blue-300`}
                            onClick={() => handleOpenKRCheckInModal(kr, idx)}
                           
                          >
                            Check in
                          </Button>}
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-md h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-md ${kr.achievement >= 75 ? 'bg-green-500' : kr.achievement >= 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(kr.achievement ?? 0, 100)}%` }}
                        />
                      </div>
                      {idx !== (goal.key_results?.length ?? 0) - 1 && <hr className="mt-6 border-gray-100" />}
                    </div>
                  ))
                ) : (
                  <Typography variant="bodyMedium" className="text-gray-500 text-center py-4">No Key Results found.</Typography>
                )}
              </div>
            </div>

            {isAutoCalculate && (
              <div className="flex items-start gap-3.5 rounded-xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <Typography variant="bodyMedium" className="font-semibold text-blue-950">
                    Automatic Progress Calculation
                  </Typography>
                  <Typography variant="caption" className="text-blue-700 mt-1 block leading-relaxed">
                    Goal progress is automatically calculated from individual Key Result check-ins. Please use the <strong>"Check in"</strong> button on each Key Result above to update your progress.
                  </Typography>
                </div>
              </div>
            )}

          </div>

          {/* Right Column (1/3) — Check-ins Card */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-blue-500" />
                <Typography variant="h4">Check-ins</Typography>
              </div>
              <Typography variant="bodySmall" className="text-gray-500 mb-6">Progress check-in history</Typography>

              {isAutoCalculate && goal.key_results?.length ? (
                <div className="max-h-[480px] overflow-y-auto pr-0.5">
                  {goal.key_results.map((kr: GoalDetailKeyResult, idx: number) => {
                    const krId = kr.goal_key || kr.goal || String(idx);
                    const isOpen = openKRId === krId;
                    return (
                      <KRCheckInsAccordion
                        key={krId}
                        kr={kr}
                        index={idx}
                        isOpen={isOpen}
                        onToggle={() => setOpenKRId(isOpen ? null : krId)}
                      />
                    );
                  })}
                </div>
              ) : isCheckInsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="rounded-xl border border-gray-100 p-3 animate-pulse bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-24 rounded bg-slate-200" />
                          <div className="h-3 w-16 rounded bg-slate-100" />
                        </div>
                        <div className="h-6 w-16 rounded-md bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : checkIns.length ? (
                <div className="space-y-3 max-h-[150px] overflow-y-auto">
                  {checkIns.map((checkIn) => (
                    <CheckInItem key={checkIn.name} checkIn={checkIn} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
                  <ClipboardList className="h-8 w-8 text-gray-300 mb-3" />
                  <Typography variant="bodySmall" className="text-gray-500 font-medium">No check-ins yet</Typography>
                  <Typography variant="caption" className="text-gray-400 mt-1">Submit your first check-in to track progress</Typography>
                </div>
              )}
            </div>
          </div>

          {/* Quick Check-in Card (Full Width 3/3 Across the Grid) */}
          {!isAutoCalculate && (
            <Card radius="xl" padding="none" className="lg:col-span-3 overflow-hidden border border-gray-100">
              <div className="p-4 sm:p-5">
                <Typography variant="h4" className="mb-1">Quick Check-in</Typography>
                <Typography variant="bodySmall" className="text-gray-500 mb-4">Update your progress</Typography>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Left Side: New Value, Auto Progress, Self-declared Health */}
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">New Value</Typography>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={newValue}
                            onChange={(event) => setNewValue(event.target.value)}
                            min="0"
                            step="any"
                            inputMode="decimal"
                            className="w-full border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                            aria-label="New goal progress value"
                          />
                          <span className="bg-gray-50 border border-l-0 border-gray-300 rounded-r-lg px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">Auto Progress</Typography>
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex min-h-[38px] items-center">
                          <span className="text-blue-600 font-bold text-sm mr-2">{displayedProgress}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">Self-declared Health</Typography>
                      <div className="flex flex-nowrap gap-2" role="radiogroup" aria-label="Self-declared health">
                        {(Object.keys(sentimentStyles) as GoalCheckInSentiment[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={sentiment === option}
                            onClick={() => setSentiment(option)}
                            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${sentiment === option ? sentimentStyles[option].active : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                          >
                            <span className={`h-2 w-2 rounded-full ${sentimentStyles[option].dot}`} />
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Description Note, Attachment & Submit Button */}
                  <div className="flex flex-col justify-between space-y-2.5">
                    <div>
                      <Typography variant="caption" className="text-gray-700 font-medium block mb-1.5">Description</Typography>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[85px] transition"
                        placeholder="Add details about your progress..."
                        aria-label="Goal progress details"
                      ></textarea>
                    </div>

                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          className="hidden"
                          onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                        />
                        <Button
                          variant="outline"
                          bgColor="text"
                          size="sm"
                          icon={<Paperclip className="w-4 h-4" />}
                          onClick={() => attachmentInputRef.current?.click()}
                        >
                          Attach
                        </Button>
                        {attachment && (
                          <span className="flex min-w-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
                            <span className="truncate">{attachment.name}</span>
                            <button type="button" aria-label="Remove attachment" onClick={() => { setAttachment(null); if (attachmentInputRef.current) attachmentInputRef.current.value = ''; }} className="shrink-0 text-blue-500 hover:text-blue-800">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      <Button
                        variant="contain"
                        bgColor="primary"
                        size="sm"
                        onClick={handleSubmitCheckIn}
                        disabled={isSubmittingCheckIn}
                      >
                        {isSubmittingCheckIn ? 'Submitting…' : 'Submit Check-in'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

        </div>
      </div>

      {/* KR Check-in Modal Popup */}
      <KRCheckInModal
        isOpen={isCheckInModalOpen}
        onClose={() => setIsCheckInModalOpen(false)}
        kr={selectedKRForCheckIn?.kr ?? null}
        krIndex={selectedKRForCheckIn?.index}
        initialStatus={goal.status || goal.goal_status}
        goalId={goal.goal_key}
      />
    </div>
  );
};

export default GoalDetails;
