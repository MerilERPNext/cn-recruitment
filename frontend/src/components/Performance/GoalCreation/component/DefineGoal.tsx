import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useCurrentEmployeeDetails } from '../../../../hooks/useEmployee';
import { Plus } from 'lucide-react';
import { ObjectiveCard } from './define-goal/ObjectiveCard';
import { LivePreviewCard } from './define-goal/LivePreviewCard';
import type { GoalFormConfig, GoalSaveItem, MyGoalsGoal } from '../../../../types/goal';
import { useGoalModel } from '../../GoalModelContext';
export type MetricType = '%' | 'Number' | 'Count' | 'Currency' | 'Boolean' | 'Milestone';
export type DepartmentType = string;
export type DesignationType = string;
export type MetricSelectOption = { label: string; value: MetricType };
export type DepartmentSelectOption = { label: string; value: DepartmentType };
export type DesignationSelectOption = { label: string; value: DesignationType };

export interface KeyResult {
    id: string;
    title: string;
    metricType?: MetricType;
    start?: string;
    current?: string;
    target?: string;
    unit?: string;
    weight: string;
    suggested?: boolean;
}

export interface GoalItem {
    id: string;
    existingGoalName?: string;
    title: string;
    description: string;
    weightage: number;
    selectedDepartment: DepartmentSelectOption;
    selectedDesignation: DesignationSelectOption;
    startDate: string;
    endDate: string;
    locked?:boolean
    keyResults: KeyResult[];
    isCollapsed: boolean;
}

interface DefineGoalProps {
    goalType: string;
    formConfig: GoalFormConfig;
    initialGoal?: MyGoalsGoal;
    onGoalsChange: (goals: GoalSaveItem[]) => void;
}

const createInitialKeyResults = (minimumKeyResults: number): KeyResult[] =>
    Array.from({ length: minimumKeyResults }, (_, index) => ({
        id: `KR ${index + 1}`,
        title: '',
        weight: '',
    }));

const labelClass = 'mb-1.5 block text-xs font-medium text-gray-600';

const DefineGoal = ({ goalType, formConfig, onGoalsChange }: DefineGoalProps) => {
    const { draftGoals, removeDraftGoal } = useGoalModel(); 
   
    const defaultDepartment = { label: 'Select', value: '' };
    const defaultDesignation = { label: 'Select', value: '' };
console.log(draftGoals,"[[[[[[[[[[[[]]]]]]]]]]]]]]]]]]]")
    const { data: currentEmployee } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
    const currentCompany = currentEmployee?.company;

    const minimumKeyResults = formConfig.limits?.min_krs ?? 1;
    const maximumKeyResults = formConfig.limits?.max_krs ?? null;
    const [goals, setGoals] = useState<GoalItem[]>(() => {
        if (draftGoals && draftGoals.length > 0) {
            return draftGoals.map((draft, idx) => ({
                id: draft.goal || `draft-${idx}-${Date.now()}`,
                title: draft.title || '',
                description: draft.description || '',
                weightage: (draft as { weightage?: number }).weightage ?? 30,
                selectedDepartment: draft.department
                    ? { label: draft.department, value: draft.department }
                    : defaultDepartment,
                selectedDesignation: draft.designation
                    ? { label: draft.designation, value: draft.designation }
                    : defaultDesignation,
                startDate: formConfig.start_date,
                locked: Boolean(draft?.locked || (draft as any)?.is_mandatory),
                endDate: formConfig.end_date,
                keyResults: draft.key_results && draft.key_results.length > 0
                    ? draft.key_results.map((kr, kIdx) => ({
                        id: `KR ${kIdx + 1}`,
                        title: kr.title || '',
                        weight: String(kr.weightage || ''),
                    }))
                    : createInitialKeyResults(minimumKeyResults),
                isCollapsed: idx !== 0, //only first goal will open other will collapsed
            }));
        }
        // 3. Fallback:if there is no goal
        return [{
            id: 'goal-1',
            title: '',
            description: '',
            weightage: 30,
            selectedDepartment: defaultDepartment,
            selectedDesignation: defaultDesignation,
            startDate: formConfig.start_date,
            endDate: formConfig.end_date,
            keyResults: createInitialKeyResults(minimumKeyResults),
            isCollapsed: false,
        }];
    });
    const handleAddGoal = () => {
        const hasEmptyKr = goals.some((goal) =>
            goal.keyResults.some((kr) => !kr.title.trim() || !kr.weight)
        );

        if (hasEmptyKr) {
            toast.error("Please fill or remove empty key results before adding a new goal.");
            return;
        }

        setGoals((prevGoals) => {
            const collapsedGoals = prevGoals.map((g) => ({ ...g, isCollapsed: true }));
            const newGoal: GoalItem = {
                id: `goal-${Date.now()}`,
                title: '',
                description: '',
                weightage: 30,
                selectedDepartment: defaultDepartment,
                selectedDesignation: defaultDesignation,
                startDate: formConfig.start_date,
                endDate: formConfig.end_date,
                keyResults: createInitialKeyResults(minimumKeyResults),
                isCollapsed: false,
            };
            return [...collapsedGoals, newGoal];
        });
    };

    const handleToggleCollapseGoal = (goalId: string) => {
        setGoals((prevGoals) =>
            prevGoals.map((g) => {
                if (g.id === goalId) {
                    return { ...g, isCollapsed: !g.isCollapsed };
                }
                return { ...g, isCollapsed: true };
            })
        );
    };

    const handleDeleteGoal = (goalId: string) => {
        removeDraftGoal(goalId);
        setGoals((prevGoals) => prevGoals.filter((g) => g.id !== goalId));
    };

    const handleUpdateGoalField = <K extends keyof GoalItem>(
        goalId: string,
        field: K,
        value: GoalItem[K],
    ) => {
        setGoals((prevGoals) =>
            prevGoals.map((g) => (g.id === goalId ? { ...g, [field]: value } : g))
        );
    };

    const handleDeleteKeyResult = (goalId: string, krId: string) => {
        setGoals((prevGoals) =>
            prevGoals.map((g) => {
                if (g.id !== goalId) return g;
                return {
                    ...g,
                    keyResults: g.keyResults.filter((kr) => kr.id !== krId),
                };
            })
        );
    };

    const handleAddKeyResult = (goalId: string) => {
        setGoals((prevGoals) =>
            prevGoals.map((g) => {
                if (g.id !== goalId || (maximumKeyResults !== null && g.keyResults.length >= maximumKeyResults)) return g;
                return {
                    ...g,
                    keyResults: [
                        ...g.keyResults,
                        {
                            id: `KR ${g.keyResults.length + 1}`,
                            title: '',
                            weight: '',
                        },
                    ],
                };
            })
        );
    };

    const handleUpdateKeyResult = (
        goalId: string,
        krId: string,
        field: 'title' | 'weight',
        value: string
    ) => {
        setGoals((prevGoals) =>
            prevGoals.map((g) => {
                if (g.id !== goalId) return g;
                if (field === 'weight') {
                    const otherSum = g.keyResults
                        .filter((kr) => kr.id !== krId)
                        .reduce((sum, kr) => sum + (parseFloat(kr.weight) || 0), 0);
                    const maxAllowed = Math.max(0, 100 - otherSum);

                    return {
                        ...g,
                        keyResults: g.keyResults.map((kr) => {
                            if (kr.id !== krId) return kr;
                            if (value === '') return { ...kr, weight: '' };
                            const num = parseFloat(value);
                            if (!isNaN(num)) {
                                const cappedVal = Math.min(num, maxAllowed);
                                return { ...kr, weight: String(cappedVal) };
                            }
                            return kr;
                        }),
                    };
                }

                return {
                    ...g,
                    keyResults: g.keyResults.map((kr) =>
                        kr.id === krId ? { ...kr, [field]: value } : kr
                    ),
                };
            })
        );
    };

    // Find active (uncollapsed) goal or default to last goal
    const activeGoalIndex = goals.findIndex((g) => !g.isCollapsed);
    const activeGoal = activeGoalIndex !== -1 ? goals[activeGoalIndex] : goals[goals.length - 1];
    const activeGoalNumber = activeGoalIndex !== -1 ? activeGoalIndex + 1 : goals.length;

    useEffect(() => {
        onGoalsChange(goals.map((goal) => ({
            goal: goal.existingGoalName ?? null,
            goal_type: goalType,
            title: goal.title,
            description: goal.description,
            weightage: goal.weightage,
            department: goal.selectedDepartment.value,
            designation: goal.selectedDesignation.value,
            key_results: goal.keyResults.map((keyResult) => ({
                title: keyResult.title,
                weightage: Number.parseFloat(keyResult.weight) || 0,
            })),
        })));
    }, [goalType, goals, onGoalsChange]);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
                {goals.map((goal, index) => (
                    <ObjectiveCard
                        key={goal.id}
                        goalNumber={goals.length > 1 ? index + 1 : undefined}
                        title={goal.title}
                        locked={goal.locked}
                        setTitle={(val) => handleUpdateGoalField(goal.id, 'title', val)}
                        description={goal.description}
                        setDescription={(val) => handleUpdateGoalField(goal.id, 'description', val)}
                        weightage={goal.weightage}
                        setWeightage={(val) => handleUpdateGoalField(goal.id, 'weightage', val)}
                        selectedDepartment={goal.selectedDepartment}
                        setSelectedDepartment={(val) => {
                            handleUpdateGoalField(goal.id, 'selectedDepartment', val);
                            handleUpdateGoalField(goal.id, 'selectedDesignation', { label: 'Select', value: '' });
                        }}
                        selectedDesignation={goal.selectedDesignation}
                        setSelectedDesignation={(val) => handleUpdateGoalField(goal.id, 'selectedDesignation', val)}
                        startDate={goal.startDate}
                        setStartDate={(val) => handleUpdateGoalField(goal.id, 'startDate', val)}
                        endDate={goal.endDate}
                        setEndDate={(val) => handleUpdateGoalField(goal.id, 'endDate', val)}
                        labelClass={labelClass}
                        currentCompany={currentCompany}
                        keyResults={goal.keyResults}
                        onDeleteKeyResult={(krId) => handleDeleteKeyResult(goal.id, krId)}
                        onAddKeyResult={() => handleAddKeyResult(goal.id)}
                        onUpdateKeyResult={(krId, field, value) =>
                            handleUpdateKeyResult(goal.id, krId, field, value)
                        }
                        minimumKeyResults={minimumKeyResults}
                        maximumKeyResults={maximumKeyResults}
                        isCollapsed={goal.isCollapsed}
                        onToggleCollapse={() => handleToggleCollapseGoal(goal.id)}
                        onDeleteGoal={goals.length > 1 ? () => handleDeleteGoal(goal.id) : undefined}
                    />
                ))}

                <button
                    type="button"
                    onClick={handleAddGoal}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white text-sm font-semibold text-violet-700 shadow-sm hover:border-violet-300 hover:bg-violet-50/50 transition-colors"
                    aria-label="Add Another Goal"
                >
                    <Plus className="h-4 w-4" />
                    Add Another Goal
                </button>
            </div>

            <LivePreviewCard
                goalType={goalType}
                goalTitle={activeGoal?.title}
                department={activeGoal?.selectedDepartment?.label !== 'Select' ? activeGoal?.selectedDepartment?.label : undefined}
                designation={activeGoal?.selectedDesignation?.label !== 'Select' ? activeGoal?.selectedDesignation?.label : undefined}
                weightage={activeGoal ? activeGoal.weightage : 30}
                keyResults={activeGoal ? activeGoal.keyResults : []}
                goalNumber={goals.length > 1 ? activeGoalNumber : undefined}
                minimumKeyResults={minimumKeyResults}
                maximumKeyResults={maximumKeyResults}
            />
        </div>
    );
};

export default DefineGoal;
