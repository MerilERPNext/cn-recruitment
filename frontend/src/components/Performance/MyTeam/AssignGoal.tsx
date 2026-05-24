import { ArrowLeft, Check, CheckCircle2, GitBranch } from "lucide-react";
import React, { useState } from "react";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";

import Avatar from "../../shared/Avatar";
import Button from "../../shared/atoms/Button";
import { INITIAL_REPORTEES } from "./mockData";
import { ReporteeAssign } from "./types";

interface AssignGoalProps {
  onBack: () => void;
}

const AssignGoal: React.FC<AssignGoalProps> = ({ onBack }) => {
  const { isMobile } = useScreenSize();
  const [reportees, setReportees] =
    useState<ReporteeAssign[]>(INITIAL_REPORTEES);

  const totalContribution = reportees.reduce(
    (acc, curr) => acc + curr.contribution,
    0,
  );
  const isValid = totalContribution >= 100;

  const handleSliderChange = (id: string, value: number) => {
    setReportees((prev) =>
      prev.map((r) => (r.id === id ? { ...r, contribution: value } : r)),
    );
  };

  const handleWeightageChange = (id: string, value: string) => {
    const num = parseInt(value, 10) || 0;
    setReportees((prev) =>
      prev.map((r) => (r.id === id ? { ...r, weightage: num } : r)),
    );
  };

  const handleTitleChange = (id: string, value: string) => {
    setReportees((prev) =>
      prev.map((r) => (r.id === id ? { ...r, subGoalTitle: value } : r)),
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-50 w-fit">
            Approved
          </span>
        );
      case "Submitted":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 bg-amber-50 w-fit">
            Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 bg-gray-100 w-fit">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      <div
        className={`mx-auto w-full max-w-screen space-y-6 ${isMobile ? "p-4" : "p-8 pb-16"}`}
      >
        {/* ── Stepper Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <Typography
              variant="bodySmall"
              className="text-green-600 font-medium whitespace-nowrap"
            >
              Pick Source Goal
            </Typography>
          </div>

          <div className="flex-1 h-px bg-gray-200 mx-4" />

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 text-xs font-bold">
              2
            </div>
            <Typography
              variant="bodySmall"
              className="text-gray-900 font-bold whitespace-nowrap"
            >
              Assign Reportees
            </Typography>
          </div>

          <div className="flex-1 h-px bg-gray-200 mx-4" />

          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center shrink-0 text-xs font-bold">
              3
            </div>
            <Typography
              variant="bodySmall"
              className="text-gray-400 font-medium whitespace-nowrap"
            >
              Set Contribution
            </Typography>
          </div>
        </div>

        {/* ── Source Goal Card ────────────────────────────────────────── */}
        <div className="bg-[#fcfdff] rounded-xl border border-blue-100 p-6 flex justify-between items-center shadow-sm">
          <div className="space-y-3">
            <div className="flex gap-2">
              <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-semibold text-blue-600 bg-blue-50">
                OKR - My Goal
              </span>
              <span className="px-2.5 py-0.5 rounded-xl text-[11px] font-medium text-gray-600 bg-white border border-gray-200">
                Cascading from you
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              Ship Design System v2 across 6 product surfaces
            </h2>
            <Typography variant="caption" className="text-gray-500 block">
              Weightage 25% · Target Q3 FY26 · 5 KRs
            </Typography>
          </div>
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            {/* Simple SVG Circular Progress */}
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-gray-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-blue-500"
                strokeDasharray="42, 100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-gray-900">42%</span>
            </div>
          </div>
        </div>

        {/* ── Assign Table ────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Table Header Area */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-end">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Assign to reportees & set contribution
              </h3>
              <Typography
                variant="caption"
                className="text-gray-500 mt-1 block"
              >
                Arithmetic cascading - contributions must sum to ≥ 100% of
                parent
              </Typography>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-gray-500">
                Total contribution
              </span>
              <span
                className={`text-lg font-bold ${isValid ? "text-green-600" : "text-red-600"}`}
              >
                {totalContribution}%
              </span>
              {isValid && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-green-700 bg-green-100 w-fit">
                  <CheckCircle2 className="w-3 h-3" /> Valid
                </span>
              )}
            </div>
          </div>

          {/* Table Columns Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <div className="col-span-3">Reportee</div>
            <div className="col-span-4">Sub-goal Title</div>
            <div className="col-span-1">Weightage</div>
            <div className="col-span-2">Contribution to Parent</div>
            <div className="col-span-2 pl-4">Status</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-100">
            {reportees.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
              >
                {/* User Column */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar
                    name={r.name}
                    size="h-8 w-8"
                    fontSize="text-xs"
                    avatarBgColor="bg-blue-50"
                    avatarTextColor="text-blue-600"
                  />
                  <span className="text-[13px] font-bold text-gray-900 truncate">
                    {r.name}
                  </span>
                </div>

                {/* Sub-goal Title */}
                <div className="col-span-4">
                  <input
                    aria-label={`${r.name} sub-goal title`}
                    type="text"
                    value={r.subGoalTitle}
                    onChange={(e) => handleTitleChange(r.id, e.target.value)}
                    className="w-full text-[13px] text-gray-900 border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-shadow"
                  />
                </div>

                {/* Weightage */}
                <div className="col-span-1">
                  <div className="flex items-center border border-gray-200 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-300 transition-shadow">
                    <input
                      aria-label={`${r.name} weightage`}
                      type="number"
                      value={r.weightage}
                      onChange={(e) =>
                        handleWeightageChange(r.id, e.target.value)
                      }
                      className="w-full text-[13px] font-bold text-gray-900 px-2 py-1.5 text-center focus:outline-none"
                    />
                    <div className="bg-gray-50 border-l border-gray-200 px-2 py-1.5 text-[11px] text-gray-400 font-bold">
                      %
                    </div>
                  </div>
                </div>

                {/* Contribution Slider */}
                <div className="col-span-2 flex items-center gap-3 pr-4">
                  <input
                    aria-label={`${r.name} contribution`}
                    type="range"
                    min="0"
                    max="100"
                    value={r.contribution}
                    onChange={(e) =>
                      handleSliderChange(r.id, parseInt(e.target.value, 10))
                    }
                    className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 ${r.contribution}%, #e5e7eb ${r.contribution}%)`,
                    }}
                  />
                  <span className="text-[13px] font-bold text-blue-600 w-10 shrink-0 text-right">
                    {r.contribution}%
                  </span>
                </div>

                {/* Status & Action */}
                <div className="col-span-2 flex items-center justify-between pl-4">
                  {getStatusBadge(r.status)}
                  <button className="text-gray-400 hover:text-gray-600 transition-colors" aria-label={`Open branch details for ${r.name}`}>
                    <GitBranch className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────────────── */}
      <div
        className={`mx-auto w-full max-w-screen flex items-center justify-between pt-2 pb-8 ${isMobile ? "px-4" : "px-8"}`}
      >
        <Button
          variant="outline"
          bgColor="text"
          onClick={onBack}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="border-gray-200"
        >
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" bgColor="text" className="border-gray-200">
            Save Draft
          </Button>
          <Button variant="contain" bgColor="primary">
            Cascade & Send for approval
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignGoal;
