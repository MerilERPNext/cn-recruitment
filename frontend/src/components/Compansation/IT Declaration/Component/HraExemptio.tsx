/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Typography } from "../../../shared/atoms/Typography";
import LTACards from "./LtaBreakUp";
import { useDeleteDocument } from "../../../../hooks/payroll/UseDeleteDocuemt";
import { useFileUpload } from "../../../../hooks/useEmployee";
import { formatCurrency } from "../../../../utils/currency";
import StatusBadge from "../../ui/StatusBadge";
import toast from "react-hot-toast";
import "formiojs/dist/formio.full.min.css";
import { Form } from "@tsed/react-formio";
import { IoMdCloudUpload } from "react-icons/io";

export interface LTAItem {
  exemption_sub_category: string;
  component_type: string;
  description: string | null;
  editable: number;
  amount: number | null;
  max_amount: number;
  proof_file?: string;
  file_id?: string;
}

export interface LTACategory {
  category_name: string;
  items: LTAItem[];
}

export interface LTAData {
  items: LTACategory[];
}

export interface HRAData {
  custom_name: string;
  attach_proof: string | undefined;
  custom_proof_status: string;
  owner_name: string;
  attach_reqd: number;
  monthly_hra: number;
  rented_in_metro_city: number;
  annual_hra_exemption: number;
  monthly_hra_exemption: number;
  start_date: string;
  end_date: string;
  pan: string;
  owner_pan: string;
  address_line1: string;
  address_line2: string;
  lta?: LTAData;
  proof_file?: string;
  file_id?: string;
}

interface HRAFormProps {
  hraData: HRAData;
  LATABreakup: any;
  ltaData ?: LTAData;
  onChange: (field: keyof HRAData | "lta", value: any) => void;
}

const formatDate = (val: any): string => {
  if (!val) return "";
  try {
    return new Date(val).toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const HRAForm: React.FC<HRAFormProps> = ({ hraData, ltaData, onChange, LATABreakup }) => {
  const [showLTAModal, setShowLTAModal] = useState(false);
  const uploadMutation = useFileUpload();
  const { mutateAsync: deleteDoc } = useDeleteDocument();
  const [fileName, setFileName] = useState<Record<string, string>>({});
  const LTAData = ltaData;
  const hraDetails = hraData;
  console.log("HRA Details: ", hraDetails);
  const [hraFileName, setHraFileName] = useState<string>("");
  const isPanMandatory = Number(hraData.monthly_hra) > 8333;
  const isInitialized = useRef(false);
  // ─── Sync ALL initial values to parent on mount / hraDetails change ───
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    const addr    = hraData.address_line1        ?? hraDetails?.address_line1        ?? "";
    const metro   = Number(hraData.rented_in_metro_city ?? hraDetails?.rented_in_metro_city ?? 0);
    const sDate   = formatDate(hraData.start_date  ?? hraDetails?.start_date);
    const eDate   = formatDate(hraData.end_date    ?? hraDetails?.end_date);
    const mHra    = Number(hraData.monthly_hra     ?? hraDetails?.monthly_hra    ?? 0);
    const owner   = hraData.owner_name             ?? hraDetails?.custom_name    ?? "";
    const p       = hraData.pan                    ?? hraDetails?.pan             ?? "";
    const proof   = hraData.proof_file             ?? hraDetails?.attach_proof   ?? undefined;
    const fileId  = hraData.file_id                ?? hraDetails?.file_id        ?? undefined;
    const attachReqd = hraData.attach_reqd         ?? hraDetails?.attach_reqd    ?? 0;

    onChange("address_line1",        addr);
    onChange("rented_in_metro_city", metro);
    onChange("start_date",           sDate);
    onChange("end_date",             eDate);
    onChange("monthly_hra",          mHra);
    onChange("owner_name",           owner);
    onChange("pan",                  p);
    onChange("attach_reqd",          attachReqd);

    // sync existing proof file from API response
    if (proof)   onChange("proof_file", proof);
    if (fileId)  onChange("file_id",    fileId);

    // auto-set attach_reqd if rent > 8333
    if (mHra > 8333 && attachReqd === 0) {
      onChange("attach_reqd", 1);
    }
  }, [hraDetails]);

  // ─── Form.io schema ───
  const hraSchema = {
    display: "form",
    components: [
      {
        type: "textfield",
        key: "address_line1",
        label: "Address",
        placeholder: "Enter rental address",
        input: true,
        validate: { required: true },
      },
      {
        type: "select",
        key: "rented_in_metro_city",
        label: "Is Metro",
        placeholder: "Select city type",
        input: true,
        data: {
          values: [
            { label: "Non-Metro", value: 0 },
            { label: "Metro",     value: 1 },
          ],
        },
        validate: { required: true },
      },
      {
        type: "panel",
        title: "Rental Period",
        key: "rental_period_panel",
        components: [
          {
            type: "datetime",
            key: "start_date",
            label: "From",
            input: true,
            format: "yyyy-MM-dd",
            enableTime: false,
            datePicker: { disableWeekends: false, disableWeekdays: false },
            validate: { required: true },
          },
          {
            type: "datetime",
            key: "end_date",
            label: "To",
            input: true,
            format: "yyyy-MM-dd",
            enableTime: false,
            datePicker: { disableWeekends: false, disableWeekdays: false },
            validate: { required: true },
          },
        ],
      },
      {
        type: "number",
        key: "monthly_hra",
        label: "Monthly Rental (₹)",
        placeholder: "Enter monthly rent amount",
        input: true,
        validate: { required: true, min: 0 },
      },
      {
        type: "textfield",
        key: "owner_name",
        label: "Owner Name",
        placeholder: "Enter owner name",
        input: true,
        validate: { required: true },
      },
      {
        type: "htmlelement",
        key: "pan_warning",
        tag: "div",
        className: "alert alert-warning",
        content: `⚠️ If rent is more than ${formatCurrency(8333)}/month or ${formatCurrency(100000)}/year, PAN is mandatory.`,
        customConditional: "show = data.monthly_hra > 8333;",
      },
      {
        type: "textfield",
        key: "pan",
        label: isPanMandatory ? "PAN *" : "PAN",
        placeholder: isPanMandatory ? "PAN is mandatory" : "Enter PAN",
        input: true,
        case: "uppercase",
        validate: {
          required: isPanMandatory,
          pattern: "[A-Z]{5}[0-9]{4}[A-Z]{1}",
          customMessage: "Enter a valid PAN (e.g. ABCDE1234F)",
          custom: "valid = (data.monthly_hra <= 8333) || (input && input.length === 10);",
        },
        description: "Mandatory when monthly rent exceeds ₹8,333",
      },
    ],
  };

  // ─── Pre-fill submission ───
  const submission = {
    data: {
      address_line1:        hraData.address_line1        ?? hraDetails?.address_line1        ?? "",
      rented_in_metro_city: Number(hraData.rented_in_metro_city ?? hraDetails?.rented_in_metro_city ?? 0),
      start_date:           formatDate(hraData.start_date  ?? hraDetails?.start_date),
      end_date:             formatDate(hraData.end_date    ?? hraDetails?.end_date),
      monthly_hra:          Number(hraData.monthly_hra    ?? hraDetails?.monthly_hra    ?? 0),
      owner_name:           hraData.owner_name            ?? hraDetails?.custom_name    ?? "",
      pan:                  hraData.pan                   ?? hraDetails?.pan             ?? "",
    },
  };

  // ─── Form.io onChange → parent ───
  const handleFormChange = (formSubmission: any) => {
    const d = formSubmission?.data;
    if (!d) return;

    if (d.address_line1 !== undefined)
      onChange("address_line1", d.address_line1);

    if (d.rented_in_metro_city !== undefined)
      onChange("rented_in_metro_city", Number(d.rented_in_metro_city));

    if (d.start_date !== undefined)
      onChange("start_date", formatDate(d.start_date));

    if (d.end_date !== undefined)
      onChange("end_date", formatDate(d.end_date));

    if (d.monthly_hra !== undefined) {
      const rent = Number(d.monthly_hra ?? 0);
      onChange("monthly_hra", rent);
      if (rent > 8333 && hraData.attach_reqd === 0)
        onChange("attach_reqd", 1);
    }

    if (d.owner_name !== undefined)
      onChange("owner_name", d.owner_name);

    if (d.pan !== undefined)
      onChange("pan", String(d.pan ?? "").toUpperCase());
  };

  // ─── HRA file handlers ───
  const handleHRAFileUpload = (file: File | null) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess(data) {
        onChange("proof_file", data?.file_url);
        onChange("file_id",    data?.name);
      },
      onError(err) {
        console.error(err);
        toast.error("File upload failed");
      },
    });
  };

  const handleHRARemoveProof = async () => {
    const fileId = hraData.file_id ?? hraDetails?.file_id;
    if (!fileId) return;
    if (!window.confirm("Delete this file?")) return;
    await deleteDoc({ doctype: "File", name: fileId });
    onChange("proof_file", undefined);
    onChange("file_id",    undefined);
  };

  // ─── LTA file handlers ───
  const handleLTAFileUpload = (catIdx: number, itemIdx: number, file: File | null) => {
    if (!file) return;
    uploadMutation.mutate(file, {
      onSuccess(data) {
        const updatedItems = [...(LTAData?.items ?? [])];
        updatedItems[catIdx].items[itemIdx] = {
          ...updatedItems[catIdx].items[itemIdx],
          proof_file: data?.file_url,
          file_id:    data.name,
        };
        onChange("lta", { items: updatedItems });
      },
      onError(err) {
        console.error("LTA proof upload failed", err);
        toast.error("File upload failed");
      },
    });
  };

  const handleLTARemoveProof = async (catIdx: number, itemIdx: number, fileId?: string) => {
    if (!fileId) return;
    if (!window.confirm("Delete this file?")) return;
    try {
      await deleteDoc({ doctype: "File", name: fileId });
      const updated = [...((LTAData?.items) ?? [])];
      updated[catIdx].items[itemIdx] = {
        ...updated[catIdx].items[itemIdx],
        proof_file: undefined,
        file_id:    undefined,
      };
      onChange("lta", { items: updated });
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  // existing proof file to show (from API or newly uploaded)
  const existingProofFile = hraData?.proof_file ?? hraDetails?.attach_proof;

  return (
    <div className="mt-4">
      {/* ═══════════════ HRA Section ═══════════════ */}
      <div className="border rounded-lg p-3 md:p-6 space-y-5">

        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-700 uppercase">
            House Rent Allowance (Exempt u/s 10(13A)){" "}
            {hraDetails?.custom_proof_status && (
              <StatusBadge status={hraDetails?.custom_proof_status} className="px-3 py-1" />
            )}
          </h3>
        </div>

        <Form
          form={hraSchema}
          submission={submission}
          onChange={handleFormChange}
          options={{ noAlerts: true, readOnly: false }}
        />

        {/* Attachment */}
        {hraData.attach_reqd !== 0 && (
  <div className="flex flex-col gap-2">
    <label className="text-xs text-gray-700 font-medium">
      Attachment {hraData.attach_reqd === 1 && <span className="text-red-500">*</span>}
    </label>
    <div className="w-max max-w-md">
      <label className="flex items-center gap-3 border-2 border-dashed border-gray-300  px-3 py-2 w-full cursor-pointer hover:border-gray-500 transition">

        <span className="text-gray-500 text-xl shrink-0">
          <IoMdCloudUpload />
        </span>

        <span
          title={hraFileName || existingProofFile}
          className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-sm text-gray-700"
        >
          {hraFileName || existingProofFile || "Upload PDF file or Browse"}
        </span>

        <input
          type="file"
          accept="application/pdf"
          required={hraData.attach_reqd === 1}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            if (!file) return;

            if (file.type !== "application/pdf") {
              toast.error("Please upload only PDF file");
              e.target.value = "";
              return;
            }

            // ✅ set state
            setHraFileName(file.name);

            handleHRAFileUpload(file);
          }}
          className="hidden"
        />
      </label>
    </div>

    {(hraFileName || existingProofFile) && (
      <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
        <span className="text-xs text-gray-700 truncate">
          {hraFileName || existingProofFile}
        </span>

        <button
          type="button"
          onClick={() => {
            setHraFileName("");
            handleHRARemoveProof();
          }}
          className="text-gray-500 hover:text-red-600"
        >
         
        </button>
      </div>
    )}
  </div>
)}
      </div>

      {/* ═══════════════ LTA Section ═══════════════ */}
       
        <div className="border rounded p-4 mt-4">
          <Typography variant="bodySmall" color="body1" className="font-semibold">
            LTA Details
          </Typography>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowLTAModal(true)}
              className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Use LTA Breakup
            </button>
          </div>

          {showLTAModal && (
            <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40">
              <div className="bg-white rounded-lg w-[90%] md:w-[60%] mt-2 max-w-3xl p-4 relative">
                <div className="flex justify-between items-center mb-3">
                  <Typography variant="bodySmall" color="body1" className="font-semibold">
                    LTA Breakup (View Only)
                  </Typography>
                  <button onClick={() => setShowLTAModal(false)} className="text-gray-500 hover:text-gray-700">
                    ✕
                  </button>
                </div>
                <div className="max-h-[70vh] overflow-auto">
                  <LTACards LTAData={LATABreakup} />
                </div>
              </div>
            </div>
          )}

          {LTAData?.items.map((category: any, catIdx: number) => (
            <div key={catIdx} className="mb-4">
              <Typography variant="bodySmall" color="body2" className="mb-2">
                {category.category_name}
              </Typography>

              {category.items.map((item: any, idx: number) => (
                <div key={item.exemption_sub_category} className="gap-4 mb-4 border-b pb-4">
                  <div className="col-span-2 flex justify-between items-center">
                    <Typography variant="bodySmall" color="body2" className="font-medium">
                      {item.exemption_sub_category}
                    </Typography>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full sm:justify-between">
                    <div className="w-full flex flex-col gap-2">
                      <label className="text-xs text-gray-700 font-medium">Amount</label>
                      <div className="flex flex-row items-center gap-2">
                        <input
                          type="text"
                          value={item.amount ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numericValue = value === "" ? null : Number(value);
                            const updatedItems = [...LTAData.items];
                            updatedItems[catIdx].items[idx].amount = numericValue;
                            onChange("lta", { items: updatedItems });
                          }}
                          className={`max-w-[500px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all ${
                            item.editable === 0 ? "bg-gray-200 cursor-not-allowed w-full" : "w-full"
                          }`}
                        />
                        {item?.custom_proof_status && (
                          <StatusBadge status={item.custom_proof_status} className="px-3 py-1" />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-gray-700 font-medium">Attachment</label>
                      <div className="flex flex-col sm:items-center gap-2">
                      <div className="w-full  flex flex-col">
  <label className="flex items-center gap-3 border-2 border-dashed border-gray-300  px-3 py-2 w-full cursor-pointer hover:border-primary transition">
    <span className="text-gray-500 text-xl shrink-0">
      <IoMdCloudUpload />
    </span>

    <span
      title={fileName[`${catIdx}-${idx}`] || ""}
      className="flex-1 min-w-0 overflow-hidden whitespace-nowrap text-ellipsis text-sm text-gray-700"
    >
      {fileName[`${catIdx}-${idx}`] || "Upload PDF file or Browse"}
    </span>

    <input
      type="file"
      accept="application/pdf"
      required={item.attach_reqd === 1}
      onChange={(e) => {
        const file = e.target.files?.[0] || null;
        if (!file) return;

        if (file.type !== "application/pdf") {
          toast.error("Please upload only PDF file");
          e.target.value = "";
          return;
        }
        setFileName((prev) => ({
          ...prev,
          [`${catIdx}-${idx}`]: file.name,
        }));

        handleLTAFileUpload(catIdx, idx, file);
      }}
      className="hidden"
    />
  </label>
</div>
                        {(item?.proof_file ?? item?.attach_proof) && (
                          <div className="flex items-center justify-between gap-2 px-3 py-1 border rounded bg-gray-50 max-w-xs">
                            <span className="text-xs text-gray-700 truncate">
                              {item?.proof_file ?? item?.attach_proof}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleLTARemoveProof(catIdx, idx, item.proof_file)}
                              className="text-gray-500 hover:text-red-600"
                              title="Remove file"
                            >
                          
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
 
    </div>
  );
};

export default HRAForm;