import React from 'react';
import { ArrowRight, BarChart2, Calendar, MessageSquare, Sparkles, Check } from 'lucide-react';
import { useScreenSize } from '../../../hooks/useScreenSize';
import Badge from '../../shared/Badge';
import { Typography } from '../../shared/atoms/Typography';

const Overview: React.FC = () => {
  const { isMobile } = useScreenSize();

  return (
    <div className="min-h-full bg-[#f8fafc] overflow-y-scroll p-6 font-sans">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge label="CYCLE LIVE" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" pulse={{ show: true, color: "bg-blue-600" }} />
                <Typography variant="bodySmall" className="text-gray-500">Apr 2026 &rarr; Mar 2027 &middot; India Tech</Typography>
              </div>
              <Typography variant="h3" >FY26 Annual Performance Cycle</Typography>
              <Typography variant="bodySmall" className="text-gray-500">Configured by HR &middot; India Tech BU &middot; 2,140 participants</Typography>
            </div>
            <div className="flex flex-col items-end">
              <Typography variant="label" className="text-gray-400 font-semibold tracking-wider uppercase mb-2">Next Deadline</Typography>
              <div className="flex items-center gap-4">
                <Typography variant="bodySmall" className="text-blue-600 font-medium">Self-Review due 21 May</Typography>
                <button className={`bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}>
                  Continue Self-Review <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="relative flex items-center justify-between max-w-3xl">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200 -z-10 -translate-y-1/2"></div>

            <div className="flex items-center gap-2 bg-white pr-4">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <Typography variant="bodySmall" className="font-medium text-green-600">Goal Setting</Typography>
            </div>

            <div className="flex items-center gap-2 bg-white px-4">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                2
              </div>
              <Typography variant="bodySmall" className="font-medium text-gray-900">Self-Review</Typography>
            </div>

            <div className="flex items-center gap-2 bg-white px-4">
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                3
              </div>
              <Typography variant="bodySmall" className="font-medium text-gray-400">Manager Review</Typography>
            </div>

            <div className="flex items-center gap-2 bg-white px-4">
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                4
              </div>
              <Typography variant="bodySmall" className="font-medium text-gray-400">Calibration</Typography>
            </div>

            <div className="flex items-center gap-2 bg-white pl-4">
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold">
                5
              </div>
              <Typography variant="bodySmall" className="font-medium text-gray-400">Released</Typography>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Typography variant="label" className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">Overall Goal Progress</Typography>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <BarChart2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <Typography variant="h3" >61%</Typography>
              <Typography variant="bodySmall" className="text-gray-500">weighted avg &middot; 5 goals</Typography>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Typography variant="label" className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">Cycle Days Remaining</Typography>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div>
              <Typography variant="h3" >42d</Typography>
              <Typography variant="bodySmall" className="text-gray-500">self-review locks 21 May</Typography>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Typography variant="label" className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">Check-ins This Quarter</Typography>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div>
              <Typography variant="h3" >11 / 12</Typography>
              <Typography variant="bodySmall" className="text-gray-500">1 week missed &middot; streak 7</Typography>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Typography variant="label" className="text-[11px] text-gray-500 font-semibold tracking-wider uppercase">Last Manager 1:1</Typography>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div>
              <Typography variant="h3" >3 days ago</Typography>
              <Typography variant="bodySmall" className="text-gray-500">Rohit Khanna &middot; 30 min</Typography>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - My Goals */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <Typography variant="h4" className="font-bold text-gray-900">My Goals</Typography>
                  <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">5</div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Typography variant="bodySmall" className="text-gray-500">Sum of weightage: <span className="font-semibold text-gray-900">100%</span></Typography>
                  <button className="text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                    Open all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Goal 1 */}
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="self-start mt-1">
                    <Badge label="OKR" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">Ship Oxygen 2.0 dashboard to 100% of PW employees</Typography>
                    <Typography variant="caption" className="text-gray-500">Weightage <span className="font-semibold text-gray-700">30%</span> &middot; Individual &middot; 64 / 100 % rollout</Typography>
                  </div>
                  <div className="w-32 flex flex-col items-end gap-2">
                    <div className="w-full flex items-center gap-3">
                      <Typography variant="caption" className="font-medium text-gray-500">64%</Typography>
                      <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-md bg-green-500" style={{ width: '64%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex justify-end">
                    <Badge label="On-track" backgroundColor="bg-green-100 ring-1 ring-inset ring-green-300" textColor="text-green-700" size="sm" pulse={{ show: true, color: "bg-green-700" }} />
                  </div>
                </div>

                {/* Goal 2 */}
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="self-start mt-1">
                    <Badge label="OKR" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">Reduce design &rarr; engineering handoff time by 40%</Typography>
                    <Typography variant="caption" className="text-gray-500">Weightage <span className="font-semibold text-gray-700">20%</span> &middot; Functional &middot; 3.4 / 2.5 Days median</Typography>
                  </div>
                  <div className="w-32 flex flex-col items-end gap-2">
                    <div className="w-full flex items-center gap-3">
                      <Typography variant="caption" className="font-medium text-gray-500">42%</Typography>
                      <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-md bg-yellow-500" style={{ width: '42%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex justify-end">
                    <Badge label="At-risk" backgroundColor="bg-yellow-100 ring-1 ring-inset ring-yellow-300" textColor="text-yellow-700" size="sm" pulse={{ show: true, color: "bg-yellow-700" }} />
                  </div>
                </div>

                {/* Goal 3 */}
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="self-start mt-1">
                    <Badge label="OKR" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">Mentor 2 junior designers to mid-level promotion</Typography>
                    <Typography variant="caption" className="text-gray-500">Weightage <span className="font-semibold text-gray-700">15%</span> &middot; Development &middot; 1.6 / 2 Promotion eligible</Typography>
                  </div>
                  <div className="w-32 flex flex-col items-end gap-2">
                    <div className="w-full flex items-center gap-3">
                      <Typography variant="caption" className="font-medium text-gray-500">80%</Typography>
                      <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-md bg-green-500" style={{ width: '80%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex justify-end">
                    <Badge label="On-track" backgroundColor="bg-green-100 ring-1 ring-inset ring-green-300" textColor="text-green-700" size="sm" pulse={{ show: true, color: "bg-green-700" }} />
                  </div>
                </div>

                {/* Goal 4 */}
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="self-start mt-1">
                    <Badge label="OKR" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">Maintain CSAT for design partnership &ge; 4.5 / 5</Typography>
                    <Typography variant="caption" className="text-gray-500">Weightage <span className="font-semibold text-gray-700">20%</span> &middot; Functional &middot; 4.6 / 4.5 CSAT</Typography>
                  </div>
                  <div className="w-32 flex flex-col items-end gap-2">
                    <div className="w-full flex items-center gap-3">
                      <Typography variant="caption" className="font-medium text-gray-500">91%</Typography>
                      <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-md bg-green-500" style={{ width: '91%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex justify-end">
                    <Badge label="On-track" backgroundColor="bg-green-100 ring-1 ring-inset ring-green-300" textColor="text-green-700" size="sm" pulse={{ show: true, color: "bg-green-700" }} />
                  </div>
                </div>

                {/* Goal 5 */}
                <div className="flex items-center gap-4 p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="self-start mt-1">
                    <Badge label="OKR" backgroundColor="bg-blue-100 ring-1 ring-inset ring-blue-300" textColor="text-blue-700" size="sm" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-semibold text-gray-900 mb-1">Launch design-thinking workshop series across 5 BUs</Typography>
                    <Typography variant="caption" className="text-gray-500">Weightage <span className="font-semibold text-gray-700">15%</span> &middot; Org &middot; 1 / 5 BUs covered</Typography>
                  </div>
                  <div className="w-32 flex flex-col items-end gap-2">
                    <div className="w-full flex items-center gap-3">
                      <Typography variant="caption" className="font-medium text-gray-500">18%</Typography>
                      <div className="w-full bg-gray-100 rounded-md h-1.5 overflow-hidden">
                        <div className="h-1.5 rounded-md bg-red-500" style={{ width: '18%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="w-24 flex justify-end">
                    <Badge label="Off-track" backgroundColor="bg-red-100 ring-1 ring-inset ring-red-300" textColor="text-red-700" size="sm" pulse={{ show: true, color: "bg-red-700" }} />
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Right Column - Tasks and Feedback */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Typography variant="h4" className="font-bold text-gray-900">Tasks Awaiting You</Typography>
                <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">3</div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 mb-1">Complete Q1 Self-Review</Typography>
                    <Typography variant="caption" className="text-gray-500">Due in 9 days</Typography>
                  </div>
                  <button className="px-4 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                    Continue
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 mb-1">Nominate 4 peer reviewers</Typography>
                    <Typography variant="caption" className="text-gray-500">Due in 4 days</Typography>
                  </div>
                  <button className="px-4 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                    Nominate
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <Typography variant="bodyMedium" className="font-medium text-gray-900 mb-1">Update progress on Goal: Oxygen 2.0</Typography>
                    <Typography variant="caption" className="text-gray-500">Not updated in 12 days</Typography>
                  </div>
                  <button className="px-4 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
                    Check in
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Typography variant="h4" className="font-bold text-gray-900">Recent Feedback</Typography>
                <div className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">5</div>
              </div>
              <Typography variant="bodySmall" className="text-gray-500 mb-6">Last 30 days</Typography>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-sm">KI</div>
                      <div>
                        <Typography variant="bodyMedium" className="font-medium text-gray-900">Karthik Iyer <Typography component="span" variant="caption" className="font-normal ml-1">&middot; Eng Lead</Typography></Typography>
                      </div>
                    </div>
                    <Badge label="Praise" backgroundColor="bg-green-100 ring-1 ring-inset ring-green-300" textColor="text-green-700" size="sm" />
                  </div>
                  <Typography variant="bodySmall" className="text-gray-600 pl-11">
                    "Pallavi's design system v2 audit unblocked a major release."
                  </Typography>
                </div>

                <div className="h-px bg-gray-100 ml-11"></div>

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-sm">NP</div>
                      <div>
                        <Typography variant="bodyMedium" className="font-medium text-gray-900">Neha Patel <Typography component="span" variant="caption" className="font-normal ml-1">&middot; Product Manager</Typography></Typography>
                      </div>
                    </div>
                    <Badge label="Praise" backgroundColor="bg-green-100 ring-1 ring-inset ring-green-300" textColor="text-green-700" size="sm" />
                  </div>
                  <Typography variant="bodySmall" className="text-gray-600 pl-11">
                    "Excellent stakeholder management during the dashboard rebuild."
                  </Typography>
                </div>

                <div className="h-px bg-gray-100 ml-11"></div>

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-sm">RK</div>
                      <div>
                        <Typography variant="bodyMedium" className="font-medium text-gray-900">Rohit Khanna <Typography component="span" variant="caption" className="font-normal ml-1">&middot; Manager &middot; 1:1</Typography></Typography>
                      </div>
                    </div>
                    <Badge label="Coaching" backgroundColor="bg-purple-100 ring-1 ring-inset ring-purple-300" textColor="text-purple-700" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;