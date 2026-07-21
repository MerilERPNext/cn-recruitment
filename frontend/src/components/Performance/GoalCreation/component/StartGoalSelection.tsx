import { useState } from 'react';
import { ArrowRight, FileText, Plus, Inbox, Sparkles, GitMerge } from 'lucide-react';
import { Typography } from '../../../shared/atoms/Typography';
import Button from '../../../shared/atoms/Button';

interface StartGoalSelectionProps {
    onContinue?: () => void;
}

const StartGoalSelection = ({ onContinue }: StartGoalSelectionProps) => {
    const [blankGoalDescription, setBlankGoalDescription] = useState(
        "Write your Objective + Key Results yourself. Best when your goal doesn't match anything in the library."
    );
  
    return <>
        <div  className="bg-[#fff8f6] border border-red-100 rounded-xl p-4 sm:p-5 mb-6 sm:mb-8 flex flex-col md:flex-row gap-4 sm:gap-5 items-start">
            <div className="bg-white border border-red-100 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">3 MANDATORY OKRs ASSIGNED</span>
                    <span className="text-gray-500 text-sm">Pushed by HR · India Tech BU · lock 21 May 2026</span>
                </div>
                <Typography variant="subheading" className="font-semibold text-gray-900 mb-4">
                    You have 3 mandatory OKRs to acknowledge before adding your own.
                </Typography>
                <div className="flex flex-wrap gap-3">
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Complete FY26 compliance & a11y training</span>
                        <span className="shrink-0 text-red-500 font-medium">5%</span>
                    </div>
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Maintain team DEI pulse score ≥ 4.0 / 5</span>
                        <span className="shrink-0 text-orange-500 font-medium">5%</span>
                    </div>
                    <div className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-start sm:items-center gap-2 text-sm shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="min-w-0 flex-1 text-gray-700">Drive customer-facing NPS ≥ 70 (PW-wide)</span>
                        <span className="shrink-0 text-blue-500 font-medium">10%</span>
                    </div>
                </div>
            </div>
            <div className="w-full md:w-auto mt-1 md:mt-0 self-start md:self-center">
                <Button variant="contain" bgColor="error" className="w-full md:w-auto justify-center bg-[#cd2c41] hover:bg-[#b02235] text-white">
                    Acknowledge 3 <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 flex-1">
                    <div className="flex gap-4 items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <Typography variant="h4" className="mb-1">Start from blank</Typography>
                            <Typography variant="bodyMedium" className="text-gray-500">Write your own OKR from scratch — full creative control.</Typography>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto mb-6">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-700">Used by 18% of PW employees</div>
                            <div className="text-xs text-gray-500">Median time: ~ 4 minutes</div>
                        </div>
                        <Button variant="contain" bgColor="primary" className="w-full sm:w-auto justify-center bg-blue-500 hover:bg-blue-600" onClick={onContinue} aria-label="Use start from blank">
                            Use this <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <textarea
                        aria-label="Start from blank description"
                        className="min-h-[92px] w-full resize-none rounded-lg border border-gray-100 bg-blue-50 p-4 text-sm leading-6 text-gray-900 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        value={blankGoalDescription}
                        onChange={(event) => setBlankGoalDescription(event.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 sm:p-6 flex-1">
                    <div className="flex gap-4 items-start mb-6">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <Typography variant="h4" className="mb-1">From Goal Library</Typography>
                            <Typography variant="bodyMedium" className="text-gray-500">Browse 500+ pre-built OKR templates by role, department, and grade.</Typography>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-auto mb-6">
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-700">Most popular · 142 templates for Design</div>
                            <div className="text-xs text-gray-500">Median time: ~ 90 seconds</div>
                        </div>
                        <Button variant="contain" className="w-full sm:w-auto justify-center bg-indigo-500 hover:bg-indigo-600 text-white" onClick={onContinue} aria-label="Use goal library">
                            Use this <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Design craft +12</span>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Mentorship</span>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Systems thinking</span>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">Cross-functional</span>
                        <span className="bg-indigo-50 text-indigo-600 text-xs px-2.5 py-1 rounded-md">+138 more</span>
                    </div>
                </div>
            </div>


            {/* AI Suggestion Card */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-300 bg-[#FFFCF4] shadow-sm">
                <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-500">
                                <Sparkles className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <Typography className="text-[15px] font-semibold text-slate-900">
                                        AI Suggestion (Marissa™)
                                    </Typography>

                                    <span className="rounded-md bg-amber-400 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-slate-900">
                                        Recommended
                                    </span>
                                </div>

                                <Typography className="text-[13px] leading-5 text-slate-500 max-w-[420px]">
                                    Marissa proposes an OKR based on your role, last cycle,
                                    and recent check-ins.
                                </Typography>
                            </div>
                        </div>

                        <button
                            onClick={onContinue}
                            className="h-9 w-full sm:w-auto rounded-lg flex justify-center items-center gap-2 bg-amber-400 px-4 text-sm font-medium text-slate-900 "
                            aria-label="Use AI suggested goal"
                        >
                            Use this
                            <ArrowRight className="ml-1 h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 text-[11px] text-slate-400">
                        <span>Beta · 84% acceptance rate</span>
                        <span>Median time: ~ 60 seconds</span>
                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-[#FFF8E8] px-4 py-3">
                        <Typography className="text-[13px] italic leading-6 text-slate-700">
                            ✨ Marissa™ would suggest:
                        </Typography>

                        <Typography className="mt-1 text-[13px] leading-6 text-slate-700">
                            “Ship Oxygen 2.0 dashboard to 100% of PW employees by Q4
                            with WAU ≥ 80%, NPS ≥ 65, and accessibility audit complete.”
                        </Typography>
                    </div>
                </div>
            </div>

            {/* Cascade Card */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-500">
                                <GitMerge className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                                <Typography className="text-[15px] font-semibold text-slate-900">
                                    Cascade from Manager
                                </Typography>

                                <Typography className="mt-1 text-[13px] leading-5 text-slate-500">
                                    Inherit a sub-OKR from one of Rohit Khanna’s 4 active goals.
                                </Typography>
                            </div>
                        </div>

                        <Button
                            variant="contain"
                            bgColor="primary"
                            className="h-9 w-full sm:w-auto justify-center whitespace-nowrap rounded-lg bg-indigo-500 px-4 text-sm font-medium text-white hover:bg-indigo-600"
                        >
                            Use this
                        </Button>
                    </div>

                    <div className="mt-4 text-[11px] text-slate-400">
                        Arithmetic cascading · 4 parents available
                    </div>

                    <div className="mt-1 text-[11px] text-slate-400">
                        Median time: ~ 2 minutes
                    </div>

                    <div className="mt-4 space-y-2">
                        <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="min-w-0 text-[12px] text-slate-700">
                                Ship Design System v2 across 6 product surfaces
                            </span>

                            <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                25%
                            </span>
                        </div>

                        <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="min-w-0 text-[12px] text-slate-700">
                                Reduce design-eng handoff time by 50%
                            </span>

                            <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                20%
                            </span>
                        </div>

                        <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="min-w-0 text-[12px] text-slate-700">
                                Hit team NPS 75+ from design partners
                            </span>

                            <span className="shrink-0 text-[12px] font-medium text-indigo-500">
                                15%
                            </span>
                        </div>
                    </div>
                </div>
            </div>


        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center  sm:justify-between gap-4 shadow-sm mb-8 lg:mb-12">
            <div className="flex w-full min-w-0 items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                    <Inbox className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                    <Typography variant="subheading" className="font-semibold text-gray-900">Need to create many goals at once?</Typography>
                    <Typography variant="bodyMedium" className="text-gray-500 text-sm">Bulk-import via CSV/XLSX — up to 5,000 rows with row-level validation. Suitable for managers cascading to a team.</Typography>
                </div>
            </div>
            <Button variant="outline" bgColor="text" className="w-full sm:w-auto justify-center whitespace-nowrap bg-white">
                Bulk Import <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
    </>};

export default StartGoalSelection;
