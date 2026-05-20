import { ArrowRight, ArrowLeft, FileText, Plus, Sparkles, GitMerge, Inbox } from 'lucide-react';
import { Typography } from '../../shared/atoms/Typography';
import Button from '../../shared/atoms/Button';
import PageLayoutWrapper from '../../shared/PageLayoutWrapper';

const NewGoal = () => {
    return (
        <PageLayoutWrapper
            title="Create a new OKR for FY26"
            subtitle="Every PW goal is an OKR — 1 Objective + 3–5 measurable Key Results. Pick how you want to start."
            steps={[
                { label: "Start", active: true },
                { label: "Define", active: false },
                { label: "Alignment", active: false },
                { label: "Visibility & Submit", active: false },
            ]}
            footerLeft={
                <Button variant="outline" bgColor="text" className="bg-white border-gray-200 text-gray-700">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Cancel
                </Button>
            }
            footerRight={
                <>
                    <div className="hidden sm:flex items-center text-gray-400 text-sm">
                        <span className="mr-1">◷</span> Autosaved 4s ago
                    </div>
                    <Button variant="outline" bgColor="text" className="bg-white border-gray-200 text-gray-700">
                        Save Draft
                    </Button>
                    <Button variant="contain" bgColor="primary" className="bg-blue-500 hover:bg-blue-600">
                        Continue to Define <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </>
            }
        >
            {/* Mandatory OKRs Assigned */}
            <div className="bg-[#fff8f6] border border-red-100 rounded-xl p-5 mb-8 flex flex-col md:flex-row gap-5 items-start">
                <div className="bg-white border border-red-100 text-red-500 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2">
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-md tracking-wider">3 MANDATORY OKRs ASSIGNED</span>
                        <span className="text-gray-500 text-sm">Pushed by HR · India Tech BU · lock 21 May 2026</span>
                    </div>
                    <Typography variant="subheading" className="font-semibold text-gray-900 mb-4">
                        You have 3 mandatory OKRs to acknowledge before adding your own.
                    </Typography>
                    <div className="flex flex-wrap gap-3">
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-gray-700">Complete FY26 compliance & a11y training</span>
                            <span className="text-red-500 font-medium">5%</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                            <span className="text-gray-700">Maintain team DEI pulse score ≥ 4.0 / 5</span>
                            <span className="text-orange-500 font-medium">5%</span>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-gray-700">Drive customer-facing NPS ≥ 70 (PW-wide)</span>
                            <span className="text-blue-500 font-medium">10%</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4 md:mt-0 self-start md:self-center">
                    <Button variant="contain" bgColor="error" className="bg-[#cd2c41] hover:bg-[#b02235] text-white">
                        Acknowledge 3 <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                {/* Start from blank */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex gap-4 items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                <Plus className="w-6 h-6" />
                            </div>
                            <div>
                                <Typography variant="h4" className="mb-1">Start from blank</Typography>
                                <Typography variant="bodyMedium" className="text-gray-500">Write your own OKR from scratch — full creative control.</Typography>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto mb-6">
                            <div>
                                <div className="text-sm font-medium text-gray-700">Used by 18% of PW employees</div>
                                <div className="text-xs text-gray-500">Median time: ~ 4 minutes</div>
                            </div>
                            <Button variant="contain" bgColor="primary" className="bg-blue-500 hover:bg-blue-600">
                                Use this <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-sm text-gray-600">
                            Write your Objective + Key Results yourself. Best when your goal doesn't match anything in the library.
                        </div>
                    </div>
                </div>

                {/* From Goal Library */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex gap-4 items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <Typography variant="h4" className="mb-1">From Goal Library</Typography>
                                <Typography variant="bodyMedium" className="text-gray-500">Browse 500+ pre-built OKR templates by role, department, and grade.</Typography>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto mb-6">
                            <div>
                                <div className="text-sm font-medium text-gray-700">Most popular · 142 templates for Design</div>
                                <div className="text-xs text-gray-500">Median time: ~ 90 seconds</div>
                            </div>
                            <Button variant="contain" className="bg-indigo-500 hover:bg-indigo-600 text-white">
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

                {/* AI Suggestion */}
                <div className="bg-[#fffdf7] rounded-xl border-2 border-yellow-400 shadow-sm overflow-hidden flex flex-col relative">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex gap-4 items-start">
                                <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <Typography variant="h4" className="mb-1 text-gray-900">AI Suggestion (Marissa™)</Typography>
                                    <Typography variant="bodyMedium" className="text-gray-600 max-w-sm">Marissa proposes an OKR based on your role, last cycle, and recent check-ins.</Typography>
                                </div>
                            </div>
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">RECOMMENDED</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto mb-6">
                            <div>
                                <div className="text-sm font-medium text-gray-700">Beta · 84% acceptance rate</div>
                                <div className="text-xs text-gray-500">Median time: ~ 60 seconds</div>
                            </div>
                            <Button variant="contain" className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold border-none">
                                Use this <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <div className="bg-yellow-50/50 border border-yellow-200/60 border-dashed rounded-lg p-4 text-sm text-gray-700">
                            <div className="flex items-center text-yellow-700 font-medium mb-1.5 text-xs">
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Marissa™ would suggest:
                            </div>
                            <p className="italic">"Ship Oxygen 2.0 dashboard to 100% of PW employees by Q4 with WAU ≥ 80%, NPS ≥ 65, and accessibility audit complete."</p>
                        </div>
                    </div>
                </div>

                {/* Cascade from Manager */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex gap-4 items-start mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                <GitMerge className="w-6 h-6" />
                            </div>
                            <div>
                                <Typography variant="h4" className="mb-1">Cascade from Manager</Typography>
                                <Typography variant="bodyMedium" className="text-gray-500">Inherit a sub-OKR from one of Rohit Khanna's 4 active goals.</Typography>
                            </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto mb-6">
                            <div>
                                <div className="text-sm font-medium text-gray-700">Arithmetic cascading · 4 parents available</div>
                                <div className="text-xs text-gray-500">Median time: ~ 2 minutes</div>
                            </div>
                            <Button variant="contain" className="bg-indigo-500 hover:bg-indigo-600 text-white">
                                Use this <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <div className="border border-gray-100 rounded-lg overflow-hidden text-sm">
                            <div className="flex justify-between p-2.5 border-b border-gray-50 bg-gray-50/50">
                                <span className="text-gray-600">Ship Design System v2 across 6 product surfaces</span>
                                <span className="text-indigo-500 font-medium">25%</span>
                            </div>
                            <div className="flex justify-between p-2.5 border-b border-gray-50">
                                <span className="text-gray-600">Reduce design-eng handoff time by 50%</span>
                                <span className="text-indigo-500 font-medium">20%</span>
                            </div>
                            <div className="flex justify-between p-2.5 bg-gray-50/50">
                                <span className="text-gray-600">Hit team NPS 75+ from design partners</span>
                                <span className="text-indigo-500 font-medium">15%</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bulk Import */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm mb-12">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 text-green-500 flex items-center justify-center shrink-0">
                        <Inbox className="w-6 h-6" />
                    </div>
                    <div>
                        <Typography variant="subheading" className="font-semibold text-gray-900">Need to create many goals at once?</Typography>
                        <Typography variant="bodyMedium" className="text-gray-500 text-sm">Bulk-import via CSV/XLSX — up to 5,000 rows with row-level validation. Suitable for managers cascading to a team.</Typography>
                    </div>
                </div>
                <Button variant="outline" bgColor="text" className="whitespace-nowrap bg-white">
                    Bulk Import <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
            </div>
        </PageLayoutWrapper>
    );
};

export default NewGoal; 