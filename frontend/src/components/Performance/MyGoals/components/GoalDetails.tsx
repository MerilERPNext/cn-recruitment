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
          className="text-slate-500/20"
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
          className="text-primary"
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text-title">{score}</span>
        <span className="text-[10px] text-text-body2 font-medium uppercase tracking-wider">Score</span>
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
  'On Track': { active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20', dot: 'bg-emerald-500' },
  'At Risk': { active: 'border-amber-500/30 bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20', dot: 'bg-amber-500' },
  Blocked: { active: 'border-red-500/30 bg-red-500/10 text-red-500 ring-1 ring-red-500/20', dot: 'bg-red-500' },
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
      <div className="p-6 bg-app">
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
      <div className="flex min-h-[400px] items-center justify-center bg-app">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-6">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <Typography variant="bodySmall" className="text-red-500">
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
    <div ref={topRef} id="goal-details-container" className="min-h-full bg-app overflow-y-auto p-3 font-sans sm:p-6">
      <div className="mx-auto max-w-screen space-y-4 sm:space-y-6">

        {/* Back Button */}
        <button
          aria-label="Back to goals"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="flex items-center text-sm font-medium text-text-body2 hover:text-text-title transition-colors mb-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Goals
        </button>

        {/* Top Header Section */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6">
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
                <Typography variant="h3" className="mb-2 text-xl leading-tight sm:text-2xl break-words [word-break:break-word] font-bold">{goal.title || '-'}</Typography>
                <Typography variant="bodySmall" color="body2" className="break-words [word-break:break-word]">{goal.description || '-'}</Typography>
              </div>

              {/* Meta grid: Owner, Start, End, Weightage */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border sm:grid-cols-4">
                <div className="rounded-lg bg-slate-500/10 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" color="body2" className="uppercase tracking-wider block mb-1 font-semibold">Owner</Typography>
                  <Typography variant="bodySmall" className="font-semibold">{ownerName}</Typography>
                </div>
                <div className="rounded-lg bg-slate-500/10 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" color="body2" className="uppercase tracking-wider block mb-1 font-semibold">Start</Typography>
                  <Typography variant="bodySmall" className="font-semibold">{goal.start_date || '-'}</Typography>
                </div>
                <div className="rounded-lg bg-slate-500/10 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" color="body2" className="uppercase tracking-wider block mb-1 font-semibold">End</Typography>
                  <Typography variant="bodySmall" className="font-semibold">{goal.end_date || '-'}</Typography>
                </div>
                <div className="rounded-lg bg-slate-500/10 p-3 lg:bg-transparent lg:p-0">
                  <Typography variant="caption" color="body2" className="uppercase tracking-wider block mb-1 font-semibold">Weightage</Typography>
                  <Typography variant="bodySmall" className="font-semibold">{goal.weightage !== undefined ? `${goal.weightage}%` : '-'}</Typography>
                </div>
              </div>
            </div>

            {/* Right side: Score circle */}
            <div className="shrink-0 flex flex-col items-center justify-center bg-slate-500/10 rounded-xl p-4 sm:p-6 lg:w-[200px]">
              <CircularProgress score={goal.score ?? 0} />
              <Typography variant="caption" color="body2" className="mt-3 text-center">
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
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <Typography variant="h4" className="font-bold">Key Results</Typography>
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

              <div className="space-y-4 sm:space-y-6 max-h-[200px] overflow-y-auto">
                {isEditingKRs ? (
                  <div className="space-y-4">
                    {editingKRs.map((kr) => (
                      <div key={kr.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <div className="flex-1 w-full">
                          <Typography variant="caption" color="body2" className="block font-medium mb-1">Key Result Title</Typography>
                          <input
                            type="text"
                            value={kr.title}
                            onChange={(e) => updateKRField(kr.id, 'title', e.target.value)}
                            className="w-full border border-border bg-card rounded-lg px-3 py-2 text-sm text-text-title focus:outline-none focus:ring-1 focus:ring-primary transition"
                            placeholder="Enter key result"
                          />
                        </div>
                        <div className="w-full sm:w-24 shrink-0">
                          <Typography variant="caption" color="body2" className="block font-medium mb-1">Weight (%)</Typography>
                          <input
                            type="number"
                            value={kr.weightage}
                            onChange={(e) => updateKRField(kr.id, 'weightage', e.target.value)}
                            className="w-full border border-border bg-card rounded-lg px-3 py-2 text-sm text-text-title focus:outline-none focus:ring-1 focus:ring-primary transition"
                            placeholder="%"
                          />
                        </div>
                        <div className="pt-0 sm:pt-5">
                          <button
                            type="button"
                            onClick={() => removeKRField(kr.id)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
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
                      className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add More
                    </button>
               

                    {(() => {
                      const currentTotalWeight = editingKRs.reduce((sum, kr) => sum + Number(kr.weightage || 0), 0);
                      return (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-border">
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
                          <Typography variant="bodyMedium" className="font-medium leading-snug break-words [word-break:break-word]">{kr.title || '-'}</Typography>
                        </div>
                        <div className="flex items-center gap-3 text-left sm:text-right">
                          <div>
                            <Typography variant="bodyMedium" className="font-bold">{kr.achievement ?? 0}% Achieved</Typography>
                            <Typography variant="caption" color="body2">Weightage: {kr.weightage ?? 0}%</Typography>
                          </div>
                         {isAutoCalculate && <Button
                            size="sm"
                            variant="outline"
                            bgColor="text"
                            className={`text-xs border-border text-primary transition-colors shrink-0 hover:bg-primary/10`}
                            onClick={() => handleOpenKRCheckInModal(kr, idx)}
                           
                          >
                            Check in
                          </Button>}
                        </div>
                      </div>
                      <div className="w-full bg-slate-500/20 rounded-md h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-md ${kr.achievement >= 75 ? 'bg-emerald-500' : kr.achievement >= 50 ? 'bg-amber-500' : 'bg-primary'}`}
                          style={{ width: `${Math.min(kr.achievement ?? 0, 100)}%` }}
                        />
                      </div>
                      {idx !== (goal.key_results?.length ?? 0) - 1 && <hr className="mt-6 border-border" />}
                    </div>
                  ))
                ) : (
                  <Typography variant="bodyMedium" color="body2" className="text-center py-4">No Key Results found.</Typography>
                )}
              </div>
            </div>

            {isAutoCalculate && (
              <div className="flex items-start gap-3.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 sm:p-5 shadow-2xs">
                <div className="min-w-0 flex-1">
                  <Typography variant="bodyMedium" className="font-semibold text-primary">
                    Automatic Progress Calculation
                  </Typography>
                  <Typography variant="caption" color="body2" className="mt-1 block leading-relaxed">
                    Goal progress is automatically calculated from individual Key Result check-ins. Please use the <strong>"Check in"</strong> button on each Key Result above to update your progress.
                  </Typography>
                </div>
              </div>
            )}

          </div>

          {/* Right Column (1/3) — Check-ins Card */}
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <ClipboardList className="w-4 h-4 text-primary" />
                <Typography variant="h4" className="font-bold">Check-ins</Typography>
              </div>
              <Typography variant="bodySmall" color="body2" className="mb-6">Progress check-in history</Typography>

              {isAutoCalculate && goal.key_results?.length ? (
                <div className="max-h-[480px]  overflow-y-auto pr-0.5">
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
                    <div key={item} className="rounded-xl border border-border p-3 animate-pulse bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-24 rounded bg-slate-500/20" />
                          <div className="h-3 w-16 rounded bg-slate-500/10" />
                        </div>
                        <div className="h-6 w-16 rounded-md bg-slate-500/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : checkIns.length ? (
                <div className="space-y-3  max-h-[180px]   overflow-y-auto">
                  {checkIns.map((checkIn) => (
                    <CheckInItem key={checkIn.name} checkIn={checkIn} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-lg border border-dashed border-border bg-slate-500/10">
                  <ClipboardList className="h-8 w-8 text-text-body2 mb-3" />
                  <Typography variant="bodySmall" color="body2" className="font-medium">No check-ins yet</Typography>
                  <Typography variant="caption" color="body2" className="mt-1">Submit your first check-in to track progress</Typography>
                </div>
              )}
            </div>
          </div>

          {/* Quick Check-in Card (Full Width 3/3 Across the Grid) */}
          {!isAutoCalculate && (
            <Card radius="xl" padding="none" className="lg:col-span-3 overflow-hidden border border-border bg-card">
              <div className="p-4 sm:p-6">
                <Typography variant="h4" className="mb-1 font-semibold">Quick Check-in</Typography>
                <Typography variant="bodySmall" color="body2" className="mb-5">Update your progress</Typography>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Left Side: New Value, Auto Progress, Self-declared Health */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Typography variant="caption" color="body2" className="font-medium block mb-1.5">New Value</Typography>
                        <div className="flex items-center">
                          <input
                            type="number"
                            value={newValue}
                            onChange={(event) => setNewValue(event.target.value)}
                            min="0"
                            step="any"
                            inputMode="decimal"
                            className="w-full h-[40px] border border-border bg-card rounded-l-xl px-3 text-sm text-text-title focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                            aria-label="New goal progress value"
                          />
                          <span className="h-[40px] bg-slate-500/10 border border-l-0 border-border rounded-r-xl px-3 text-sm text-text-body2 flex items-center font-medium">
                            %
                          </span>
                        </div>
                      </div>

                      <div>
                        <Typography variant="caption" color="body2" className="font-medium block mb-1.5">Auto Progress</Typography>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 h-[40px] flex items-center">
                          <span className="text-primary font-bold text-sm">{displayedProgress}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Typography variant="caption" color="body2" className="font-medium block mb-1.5">Self-declared Health</Typography>
                      <div className="flex flex-nowrap gap-2.5" role="radiogroup" aria-label="Self-declared health">
                        {(Object.keys(sentimentStyles) as GoalCheckInSentiment[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={sentiment === option}
                            onClick={() => setSentiment(option)}
                            className={`flex h-[40px] min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-xs font-semibold transition-colors ${
                              sentiment === option
                                ? sentimentStyles[option].active
                                : 'border-border bg-card text-text-body2 hover:bg-slate-500/10'
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${sentimentStyles[option].dot}`} />
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Description Note, Attachment & Submit Button */}
                  <div className="flex flex-col justify-between space-y-3">
                    <div className="flex flex-col flex-1">
                      <Typography variant="caption" color="body2" className="font-medium block mb-1.5">Description</Typography>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="w-full flex-1 min-h-[80px] rounded-xl border border-border bg-card p-3 text-sm text-text-title placeholder:text-text-body2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition resize-none"
                        placeholder="Add details about your progress..."
                        aria-label="Goal progress details"
                      ></textarea>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
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
                          className="rounded-lg"
                        >
                          Attach
                        </Button>
                        {attachment && (
                          <span className="flex min-w-0 items-center gap-1 rounded-lg bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs text-primary font-medium">
                            <span className="truncate max-w-[140px]">{attachment.name}</span>
                            <button
                              type="button"
                              aria-label="Remove attachment"
                              onClick={() => { setAttachment(null); if (attachmentInputRef.current) attachmentInputRef.current.value = ''; }}
                              className="shrink-0 text-primary hover:text-primary/80 transition-colors ml-0.5"
                            >
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
                        className="rounded-lg font-medium px-4 shadow-2xs"
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
