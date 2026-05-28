import { ArrowLeft, Check, CheckCircle2, GitBranch } from "lucide-react";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScreenSize } from "../../../hooks/useScreenSize";
import { Typography } from "../../shared/atoms/Typography";

import Avatar from "../../shared/Avatar";
import Button from "../../shared/atoms/Button";
import { INITIAL_REPORTEES } from "./mockData";
import { ReporteeAssign } from "./types";

interface AssignGoalProps {
  onBack?: () => void;
}

const AssignGoal: React.FC<AssignGoalProps> = ({ onBack }) => {
  const navigate = useNavigate();
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

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate("/webapp/performance-app/team-goals");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex h-6 min-w-[96px] items-center justify-center rounded-md bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700">
            Approved
          </span>
        );
      case "Submitted":
        return (
          <span className="inline-flex h-6 min-w-[96px] items-center justify-center rounded-md bg-amber-50 px-3 text-[11px] font-bold text-amber-700">
            Submitted
          </span>
        );
      default:
        return (
          <span className="inline-flex h-6 min-w-[96px] items-center justify-center rounded-md bg-gray-100 px-3 text-[11px] font-bold text-gray-600">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-full flex-col overflow-y-auto bg-[#f4f8ff]">
      <div
        className={`mx-auto w-full max-w-screen space-y-4 ${isMobile ? "p-4" : "p-3 lg:p-4 lg:pb-6"}`}
      >
        {/* ── Stepper Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 py-1 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </div>
            <Typography
              variant="bodySmall"
              className="hidden whitespace-nowrap font-semibold text-emerald-600 sm:block"
            >
              Pick Source Goal
            </Typography>
          </div>

          <div className="h-px flex-1 bg-gray-200" />

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
              2
            </div>
            <Typography
              variant="bodySmall"
              className="hidden whitespace-nowrap font-bold text-gray-900 sm:block"
            >
              Assign Reportees
            </Typography>
          </div>

          <div className="h-px flex-1 bg-gray-200" />

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500">
              3
            </div>
            <Typography
              variant="bodySmall"
              className="hidden whitespace-nowrap font-medium text-gray-400 sm:block"
            >
              Set Contribution
            </Typography>
          </div>
        </div>

        {/* ── Source Goal Card ────────────────────────────────────────── */}
        <div className="flex min-h-[132px] flex-col items-start justify-between gap-5 rounded-xl border border-blue-200 bg-[#f8fdff] px-5 py-6 shadow-sm sm:flex-row sm:items-center lg:px-6">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-bold text-purple-600">
                OKR - My Goal
              </span>
              <span className="rounded-full border border-gray-100 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600">
                Cascading from you
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl lg:text-[22px]">
              Ship Design System v2 across 6 product surfaces
            </h2>
            <Typography variant="caption" className="block text-sm font-medium text-gray-500">
              Weightage 25% · Target Q3 FY26 · 5 KRs
            </Typography>
          </div>
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center sm:h-[72px] sm:w-[72px]">
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
              <span className="text-sm font-bold text-gray-900">42%</span>
            </div>
          </div>
        </div>

        {/* ── Assign Table ────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          {/* Table Header Area */}
          <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-6 text-gray-900">
                Assign to reportees & set contribution
              </h3>
              <Typography
                variant="caption"
                className="mt-1 block text-sm font-medium text-gray-500"
              >
                Arithmetic cascading - contributions must sum to ≥ 100% of
                parent
              </Typography>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[12px] font-medium text-gray-500">
                Total contribution
              </span>
              <span
                className={`text-xl font-bold ${isValid ? "text-emerald-600" : "text-red-600"}`}
              >
                {totalContribution}%
              </span>
              {isValid && (
                <span className="inline-flex h-6 items-center gap-1 rounded-full bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> Valid
                </span>
              )}
            </div>
          </div>

          {/* Table Area */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Table Columns Header */}
              <div className="grid grid-cols-[270px_minmax(300px,1fr)_120px_220px_160px_32px] gap-4 border-b border-gray-100 bg-[#f5f8fc] px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <div>Reportee</div>
                <div>Sub-goal Title</div>
                <div>Weightage</div>
                <div>Contribution to Parent</div>
                <div>Status</div>
                <div />
              </div>

              {/* Table Rows */}
              <div className="divide-y divide-gray-100">
                {reportees.map((r) => (
                  <div
                    key={r.id}
                    className="grid grid-cols-[270px_minmax(300px,1fr)_120px_220px_160px_32px] items-center gap-4 px-6 py-3"
                  >
                    {/* User Column */}
                    <div className="flex items-center gap-3">
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
                    <div>
                      <input
                        aria-label={`${r.name} sub-goal title`}
                        type="text"
                        value={r.subGoalTitle}
                        onChange={(e) =>
                          handleTitleChange(r.id, e.target.value)
                        }
                        className="h-9 w-full rounded-md border border-gray-200 px-3 text-[13px] text-gray-900 transition-shadow focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                    </div>

                    {/* Weightage */}
                    <div>
                      <div className="flex h-9 overflow-hidden rounded-md border border-gray-200 bg-white transition-shadow focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                        <input
                          aria-label={`${r.name} weightage`}
                          type="number"
                          value={r.weightage}
                          onChange={(e) =>
                            handleWeightageChange(r.id, e.target.value)
                          }
                          className="w-full px-3 text-left text-[13px] font-bold text-gray-900 focus:outline-none"
                        />
                        <div className="flex w-10 items-center justify-center border-l border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-400">
                          %
                        </div>
                      </div>
                    </div>

                    {/* Contribution Slider */}
                    <div className="flex items-center gap-4 pr-2">
                      <input
                        aria-label={`${r.name} contribution`}
                        type="range"
                        min="0"
                        max="100"
                        value={r.contribution}
                        onChange={(e) =>
                          handleSliderChange(r.id, parseInt(e.target.value, 10))
                        }
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg accent-blue-500"
                        style={{
                          background: `linear-gradient(to right, #1f8bed ${r.contribution}%, #3f3f46 ${r.contribution}%)`,
                        }}
                      />
                      <span className="w-10 shrink-0 text-right text-[13px] font-bold text-blue-600">
                        {r.contribution}%
                      </span>
                    </div>

                    {/* Status & Action */}
                    <div>
                      {getStatusBadge(r.status)}
                    </div>
                    <div className="flex justify-end">
                      <button
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={`Open branch details for ${r.name}`}
                      >
                        <GitBranch className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-100 md:hidden">
            {reportees.map((r) => (
              <article key={r.id} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      name={r.name}
                      size="h-9 w-9"
                      fontSize="text-xs"
                      avatarBgColor="bg-blue-50"
                      avatarTextColor="text-blue-600"
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-bold text-gray-900">
                        {r.name}
                      </span>
                      <div className="mt-1">{getStatusBadge(r.status)}</div>
                    </div>
                  </div>
                  <button
                    className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                    aria-label={`Open branch details for ${r.name}`}
                  >
                    <GitBranch className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Sub-goal Title
                  </label>
                  <input
                    aria-label={`${r.name} sub-goal title`}
                    type="text"
                    value={r.subGoalTitle}
                    onChange={(e) => handleTitleChange(r.id, e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 transition-shadow focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-[150px_1fr] sm:items-end">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Weightage
                    </label>
                    <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white transition-shadow focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
                      <input
                        aria-label={`${r.name} weightage`}
                        type="number"
                        value={r.weightage}
                        onChange={(e) =>
                          handleWeightageChange(r.id, e.target.value)
                        }
                        className="w-full px-3 py-2 text-center text-sm font-bold text-gray-900 focus:outline-none"
                      />
                      <div className="border-l border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400">
                        %
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Contribution to Parent
                      </label>
                      <span className="text-sm font-bold text-blue-600">
                        {r.contribution}%
                      </span>
                    </div>
                    <input
                      aria-label={`${r.name} contribution`}
                      type="range"
                      min="0"
                      max="100"
                      value={r.contribution}
                      onChange={(e) =>
                        handleSliderChange(r.id, parseInt(e.target.value, 10))
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg accent-blue-500"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 ${r.contribution}%, #e5e7eb ${r.contribution}%)`,
                      }}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* ── Action Bar ──────────────────────────────────────────────── */}
      <div
        className={`mx-auto flex w-full max-w-screen flex-col gap-3 pt-0 pb-8 sm:flex-row sm:items-center sm:justify-between ${isMobile ? "px-4" : "px-4"}`}
      >
        <Button
          variant="outline"
          bgColor="text"
          onClick={handleBack}
          icon={<ArrowLeft className="w-4 h-4" />}
          className="h-10 w-full justify-center border-gray-200 bg-white px-4 sm:w-[82px]"
        >
          Back
        </Button>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button
            variant="outline"
            bgColor="text"
            className="h-10 w-full justify-center border-gray-200 bg-white px-4 sm:w-[100px]"
          >
            Save Draft
          </Button>
          <Button
            variant="contain"
            bgColor="primary"
            className="h-10 w-full justify-center bg-blue-500 px-5 font-semibold hover:bg-blue-600 sm:w-[210px]"
          >
            Cascade & Send for approval
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AssignGoal;
