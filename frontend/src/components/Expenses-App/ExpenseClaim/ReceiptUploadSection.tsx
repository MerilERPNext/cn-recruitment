/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useRef } from "react";
import { Camera, CheckCircle2, AlertCircle, Loader2, Upload } from "lucide-react";
import { OcrStatus, OcrSummary } from "../../../types/expense.types";
import { OcrParsingStep } from "./OcrParsingStep";
import Button from "../../shared/atoms/Button";

export interface ReceiptUploadSectionProps {
  visibleAttachments: any[];
  ocrStatus: OcrStatus;
  ocrSummary: OcrSummary;
  ocrParsingSteps: { label: string; delay: number }[];
  isEditingExistingExpense: boolean;
  isManualMode: boolean;
  selectedExpenseType: string;
  isFetchingExpenseFields: boolean;
  onUpload: (files: FileList | null) => void;
  onProceedManually: () => void;
}

export const ReceiptUploadSection: React.FC<ReceiptUploadSectionProps> = ({
  visibleAttachments,
  ocrStatus,
  ocrSummary,
  ocrParsingSteps,
  isEditingExistingExpense,
  isManualMode,
  selectedExpenseType,
  isFetchingExpenseFields,
  onUpload,
  onProceedManually,
}) => {
  const receiptInputRef = useRef<HTMLInputElement>(null);

  if (isEditingExistingExpense || isManualMode) return null;
  if (!selectedExpenseType || isFetchingExpenseFields) return null;

  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-[#1E3A4C] bg-white dark:bg-[#0B1724] shadow-sm"
      style={{ transition: "all 0.3s ease" }}
    >
      <div className="border-b border-slate-200 dark:border-[#1E3A4C] bg-slate-50/50 dark:bg-[#102030] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm shadow-blue-200">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Upload Receipt
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload your receipt to auto-fill expense details
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {visibleAttachments.length === 0 && ocrStatus === "idle" && (
          <div
            className="group cursor-pointer rounded-xl border-2 border-dashed border-slate-200 dark:border-[#1E3A4C] bg-slate-50/50 dark:bg-[#102030] px-4 py-8 text-center transition-all hover:border-cyan-400 hover:bg-cyan-50/30 dark:hover:bg-[#162A3E] active:scale-[0.99]"
            onClick={() => receiptInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add(
                "border-cyan-400",
                "bg-cyan-50/50",
              );
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove(
                "border-cyan-400",
                "bg-cyan-50/50",
              );
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove(
                "border-cyan-400",
                "bg-cyan-50/50",
              );
              onUpload(e.dataTransfer.files);
            }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 transition-transform group-hover:scale-110">
              <Upload className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Tap to upload or drag receipt here
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              JPG, PNG, PDF — Max 10MB
            </p>
          </div>
        )}

        <input
          ref={receiptInputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = "";
          }}
        />

        {visibleAttachments.length > 0 &&
          ocrStatus !== "completed" &&
          ocrStatus !== "failed" && (
            <div className="space-y-2">
              {visibleAttachments.map((att: any, idx: number) => {
                const fileName =
                  att?.originalName || att?.name || "Attachment";
                const isImage =
                  att?.type?.startsWith("image/") ||
                  /\.(jpeg|jpg|gif|png|webp)$/i.test(fileName);
                const previewUrl =
                  att?.file instanceof File
                    ? URL.createObjectURL(att.file)
                    : att?.url || att?.file_url || "";

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#1E3A4C] bg-white dark:bg-[#102030] p-3 shadow-sm"
                  >
                    {isImage && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={fileName}
                        className="h-12 w-12 rounded-lg border border-slate-200 dark:border-[#1E3A4C] object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 dark:border-[#1E3A4C] bg-slate-50 dark:bg-[#0B1724]">
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {fileName.split(".").pop() || "FILE"}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {fileName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        {att?.size
                          ? `${(att.size / 1024).toFixed(1)} KB`
                          : "Uploaded"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        {ocrStatus === "parsing" && (
          <div className="mt-4 overflow-hidden rounded-xl border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/50 dark:bg-[#102A3A] p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Loader2 className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-bold text-cyan-800 dark:text-cyan-200">
                  Reading your receipt...
                </p>
                <div className="space-y-1.5">
                  {ocrParsingSteps.map((step, idx) => (
                    <OcrParsingStep
                      key={step.label}
                      label={step.label}
                      delay={step.delay}
                      index={idx}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {ocrStatus === "completed" &&
          !isEditingExistingExpense &&
          (ocrSummary.amount ||
            ocrSummary.merchant ||
            ocrSummary.expense_date) && (
            <div className="mt-4 overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Receipt Parsed Successfully
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {ocrSummary.amount && (
                  <div className="rounded-lg bg-white/80 dark:bg-[#102030] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Amount
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      ₹{ocrSummary.amount}
                    </p>
                  </div>
                )}
                {ocrSummary.merchant && (
                  <div className="rounded-lg bg-white/80 dark:bg-[#102030] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Merchant
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ocrSummary.merchant}
                    </p>
                  </div>
                )}
                {ocrSummary.expense_date && (
                  <div className="rounded-lg bg-white/80 dark:bg-[#102030] px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Date
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {ocrSummary.expense_date}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {ocrStatus === "failed" && (
          <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/40 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                  Could not parse receipt
                </p>
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  No worries — you can fill the details manually below.
                </p>
              </div>
            </div>
          </div>
        )}

        {ocrStatus !== "completed" && ocrStatus !== "failed" && (
          <div className="mt-4 flex justify-center sm:justify-start">
            <Button
              variant="outline"
              onClick={onProceedManually}
              className="w-full font-semibold sm:w-fit border-slate-300 dark:border-[#1E3A4C] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#162A3E]"
            >
              Proceed Manually
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
