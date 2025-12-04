import { ChevronDown, Target, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { GoalItem, ReviewEntry, ScaleSettings } from "../../../types/goalReviewDetails";
import { Form } from "@tsed/react-formio";
import reviewFormSchema from "./reviewFormSchema.json";
import DropdownMenu from "../../shared/DropDownMenu";
import { getRatingShapFromScalesSettings } from "./utils";


const StatBadge = ({ label, value, unit = '' }: { label: string, value: string | number, unit?: string }) => (
    <div className="flex flex-col">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-800">{value}</span>
            <span className="text-xs text-gray-500">{unit}</span>
        </div>
    </div>
);

const ProgressBar = ({ value, colorClass = "bg-blue-600" }: { value: number, colorClass?: string }) => (
    <div className="h-2 w-full bg-gray-100 rounded-[1000px] overflow-hidden mt-2">
        <div
            className={`h-full ${colorClass} transition-all duration-500`}
            style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
    </div>
);

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

interface GoalCardProps {
    scales?: ScaleSettings;
    item: GoalItem;
    index: number;
}

const GoalCard: React.FC<GoalCardProps> = ({ scales, item, index }) => {
    const [showSubgoals, setShowSubgoals] = useState(false);
    const [formSchema, setFormSchema] = useState<any>(null);
    const hasSubgoals = item.subgoals && item.subgoals.length > 0;
    const { isDesktop } = useScreenSize();
    // Handler to toggle only if subgoals exist
    const handleToggle = () => {
        if (hasSubgoals) setShowSubgoals(!showSubgoals);
    };


    const goalFieldsSettings: ReviewEntry | undefined = item.goal_review.reviews.find(review => review.is_current_user);
    useEffect(() => {
        // defensive copy of schema
        const schema = JSON.parse(JSON.stringify(reviewFormSchema));

        // sanity checks
        if (!schema || typeof schema !== 'object') {
            console.error('reviewFormSchema missing or invalid', reviewFormSchema);
            setFormSchema(schema);
            return;
        }

        if (!Array.isArray(schema.components)) {
            console.error('reviewFormSchema.components missing or not an array', schema);
            setFormSchema(schema);
            return;
        }

        // Defensive defaults + coercion
        const canViewComment = !!goalFieldsSettings?.can_view_comment;
        const commentMandatory = !!goalFieldsSettings?.comment_mandatory;

        const canViewRating = !!goalFieldsSettings?.can_view_rating;
        const ratingMandatory = !!goalFieldsSettings?.rating_mandatory;

        console.log('goalFieldsSettings', goalFieldsSettings);

        schema.components = schema.components.map((comp: any) => {
            if (comp.key === 'comment') {
                comp.hidden = !canViewComment;
                comp.validate = comp.validate || {};
                comp.validate.required = commentMandatory;
                comp.label = (commentMandatory ? "Comment <span style='color:red;margin-left:4px;'>*</span>" : "Comment");
            } else if (comp.key === 'rating') {
                comp.hidden = !canViewRating;
                console.log("scales", scales)
                if (scales) {
                    comp.shape = getRatingShapFromScalesSettings(scales?.settings);

                    let compItems = scales.goal_scale.scale_details.map(sd => ({
                        label: sd.scale_marker,
                        value: sd.marks,
                        description: sd.description
                    }));
                    comp.items = compItems;
                }

                comp.validate = comp.validate || {};
                comp.validate.required = ratingMandatory;
                comp.label = (ratingMandatory ? "Overall Rating <span style='color:red;margin-left:4px;'>*</span>" : "Overall Rating");
            }

            comp.hidden = !!comp.hidden;
            return comp;
        });

        setFormSchema(schema);
    }, [item, goalFieldsSettings, scales]);

    console.log(formSchema)
    return (
        <div className="bg-white border border-gray-300 shadow-sm rounded-xl mb-6 overflow-hidden transition-all hover:shadow-md flex flex-col">

            {/* --- 1. HEADER ROW (Clickable for Subgoals) --- */}
            <div
                onClick={handleToggle}
                className={`p-6 pb-2 flex flex-col transition-colors select-none ${hasSubgoals ? 'cursor-pointer hover:bg-gray-50/50' : ''}`}
            >
                <div className="flex items-start justify-between gap-4">
                    {/* Left: Index + Title + Desc */}

                    <div className="flex gap-4 items-start">

                        {/* Dropdown Arrow (Only if subgoals exist) */}
                        {hasSubgoals && (
                            <div className={`text-gray-400 ring-blue-500 ring-2  border border-gray-100 p-1.5 rounded-full shadow-sm transition-transform duration-300 ${showSubgoals ? 'rotate-180 text-blue-600 border-blue-100' : ''}`}>
                                <ChevronDown size={16} className="stroke-blue-500" />
                            </div>
                        )}
                        <div className="flex items-center justify-center w-8 h-8 rounded-[1000px] bg-blue-50 text-blue-600 font-bold text-sm flex-shrink-0">
                            {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 leading-tight">{item.goal}</h3>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">{item.description || "No description provided."}</p>
                        </div>
                    </div>
                    {isDesktop &&
                        <>
                            <div>
                                <StatBadge label="Weightage" value={formatNumber(item.weightage)} unit="%" />
                                <div className="h-2 mt-2" />
                            </div>
                            <div>
                                <StatBadge label="Achievement" value={formatNumber(item.achievement)} unit="%" />
                                <ProgressBar value={item.achievement} colorClass="bg-emerald-500" />
                            </div>
                            <div>
                                <StatBadge label="Score" value={formatNumber(item.score)} />
                                <ProgressBar value={(item.score / 5) * 100} colorClass="bg-indigo-500" />
                            </div>
                        </>
                    }

                    {/* Right: Status + Actions */}
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-[1000px] text-xs font-semibold border whitespace-nowrap ${getStatusColor(item.status)}`}>
                            {item.status || "Unknown"}
                        </span>

                        <DropdownMenu
                            placement="bottom-left"
                            items={[
                                {
                                    label: "View",
                                    icon: <Eye className="h-4 w-4" />,
                                    onClick: () => () => console.log("View"),
                                },

                                // EDIT option
                                ...(true
                                    ? [
                                        {
                                            label: "Edit",
                                            icon: <Edit className="h-4 w-4" />,
                                            onClick: () => console.log("handle edit"),
                                        },
                                    ]
                                    : []
                                ),

                                // DELETE option
                                ...(true
                                    ? [
                                        {
                                            label: "Delete",
                                            icon: <Trash2 className="h-4 w-4 text-red-500" />,
                                            onClick: () => console.log("Delete"),
                                        },
                                    ]
                                    : []
                                ),
                            ]}

                        >
                            <button className="p-2 border-1 rounded-lg hover:bg-gray-200">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenu>
                    </div>
                </div>
                {!isDesktop &&
                    <div className="flex items-center justify-between px-4 ml-6 mt-4">
                        <div className="flex flex-col items-center">
                            <StatBadge label="Weightage" value={formatNumber(item.weightage)} unit="%" />
                            <div className="h-2 mt-2" />
                        </div>
                        <div className="flex  flex-col items-center">
                            <StatBadge label="Achievement" value={formatNumber(item.achievement)} unit="%" />
                            <ProgressBar value={item.achievement} colorClass="bg-emerald-500" />
                        </div>
                        <div className="flex  flex-col items-center">
                            <StatBadge label="Score" value={formatNumber(item.score)} />
                            <ProgressBar value={(item.score / 5) * 100} colorClass="bg-indigo-500" />
                        </div>
                    </div>
                }
            </div>

            {/* --- 3. SUBGOALS DROPDOWN (Conditional) --- */}
            {showSubgoals && hasSubgoals && (
                <div className="px-6 pb-2 animate-in slide-in-from-top-2 duration-300">
                    <div className="mt-4 rounded-lg border border-gray-200 shadow-sm bg-white overflow-hidden">
                        {/* Grid Header */}
                        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider items-center">
                            <div>Sub-goal / Key Result</div>
                            <div className="text-right w-16 md:w-24">Target</div>
                            <div className="text-right w-16 md:w-24">Achieved</div>
                            <div className="text-center w-20 md:w-28">Status</div>
                        </div>
                        {/* Grid Body */}
                        <div className="divide-y divide-gray-100">
                            {item.subgoals.map((sub: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-4 px-4 py-3 items-center hover:bg-blue-50/30 transition-colors">
                                    <div className="text-sm font-medium text-gray-700 truncate pr-2" title={sub.name || sub.title}>
                                        {sub.name || sub.title}
                                    </div>
                                    <div className="text-right w-16 md:w-24">
                                        <span className="text-xs md:text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md inline-block min-w-[3rem]">
                                            {formatNumber(sub.target)}
                                        </span>
                                    </div>
                                    <div className="text-right w-16 md:w-24">
                                        <span className="text-xs md:text-sm font-bold text-gray-800">
                                            {formatNumber(sub.achieved || sub.achievement)}
                                        </span>
                                    </div>
                                    <div className="text-center w-20 md:w-28 flex justify-center">
                                        <span className={`px-2 py-0.5 rounded-[1000px] text-[10px] font-bold border truncate max-w-full ${getStatusColor(sub.status)}`}>
                                            {sub.status || "Pending"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 4. REVIEW SECTION (Always Visible) --- */}
            <div className="p-6 pt-4 mt-auto">
                <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                        <Target size={14} /> Review & Assessment
                    </h4>

                    {!formSchema ? (
                        <div className="text-sm text-gray-500">Loading form…</div>
                    ) : (
                        <Form
                            form={formSchema}
                            options={{
                                noAlerts: false,
                                submitButton: false
                            }}
                        />
                    )}

                </div>
            </div>

        </div>
    );
};

export default GoalCard;