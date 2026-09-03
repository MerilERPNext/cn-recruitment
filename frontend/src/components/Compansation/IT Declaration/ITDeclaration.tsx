/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import type React from "react";

import {
  useITDeclarationTabData,
  useLTABrakup,
  useNewRegime,
  useProofDateForITDeclaration,
  useSubmitITDeclaration,
} from "../../../hooks/payroll/useITDeclaration";
import { normalizeITCategories } from "./Component/DataHandling";
import { useCurrentEmployeeDetails } from "../../../hooks/useEmployee";
import { useTargetUser } from "../../../context/ViewedUserContext";
import HRAForm, { type HRAData } from "./Component/HraExemptio";
import CompareTaxSheetHandler from "./Component/TaxCompare";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import CustomDropdown from "../../shared/CustomDropdown";
import { Typography } from "../../shared/atoms/Typography";
import toast from "react-hot-toast";
import CategorySection from "./Component/CategoryDeclarationSelectable";
import { useScreenSize } from "../../../hooks/useScreenSize";
import Form12B from "./Component/Form12B";
import PreviewOfITDeclaration from "./Component/PerviewOfITDeclaration";
import { useGetUiPermission } from "../../../hooks/userUiPermission";
import { getActionsEnabled } from "../../../utils/uiPermission";
import { validateITDeclarationProofs } from "./util/Validation";
import EditITDeclarationAccess from "./Component/EditITDeclarationAccess";
import { SquarePen } from "lucide-react";
import Button from "../../shared/atoms/Button";

type PayrollPeriod = {
  name: string;
  start_date: string;
  end_date: string;
};

const ITDeclarationForm = () => {
  const { data: user } = useCurrentEmployeeDetails({ logged_in_employee_details: true });
  const { targetEmployeeId } = useTargetUser();
  // When an admin/HR is viewing another user, target their employee id.
  const effectiveEmployee = targetEmployeeId || user?.employee;
  const mutation = useSubmitITDeclaration();
  const { isDesktop } = useScreenSize();
  const { data: userUiPermission } = useGetUiPermission("Compensation");
  const actionsEnabled = getActionsEnabled(
    userUiPermission,
    ["compare_tax", "form_12b", "preview", "edit_decalaration"],
    "IT Declaration"
  );
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: PayrollPeriod[] | undefined;
  };
  /* ---------------- State ---------------- */
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [goHeadWithNewRegime, setGoHeadWithNewRegime] = useState<0 | 1 | null>(
    null
  );
  const [activeMainTab, setActiveMainTab] = useState<"category" | "hra">(
    "category"
  );
  const [groupedCategories, setGroupedCategories] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [hraData, setHraData] = useState<HRAData | null>(null);
  const [ltaData, setLtaData] = useState<any>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => {
    const el = tabRefs.current[activeMainTab];
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeMainTab]);
  /* ---------------- Regime ---------------- */
  const newRegimeResponse = useNewRegime(
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as any;
  const declarationId = newRegimeResponse?.declaration_id;
  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1;
  /* ---------------- IT Declaration API ---------------- */
  const { data: responseData } = useITDeclarationTabData(
    goHeadWithNewRegimeBool,
    effectiveEmployee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data?: any };
  const declarationDoctype = responseData?.doctype;
  const proofId = responseData?.proof_id;
  const declarationIdFromITDeclaration = proofId || declarationId;
  const currentDate = new Date().toISOString().split("T")[0];
  const { data: PrrofOfITDeclaration } = useProofDateForITDeclaration(
    currentDate,
    effectiveEmployee || null,
    declarationDoctype || null,
    selectedPeriod || null
  ) as { data?: any };
  const { data: LTABreakup } = useLTABrakup(effectiveEmployee || "");
  // Initial payroll period
  useEffect(() => {
    if (!payrollPeriods?.length || selectedPeriod) return;
    const today = new Date();
    const matchedPeriod = payrollPeriods.find((p) => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      // inclusive range check
      return today >= start && today <= end;
    });
    setSelectedPeriod(matchedPeriod?.name || payrollPeriods[0].name);
  }, [payrollPeriods, selectedPeriod]);
  useEffect(() => {
    if (goHeadWithNewRegimeBool && activeMainTab === "hra") {
      setActiveMainTab("category");
    }
  }, [goHeadWithNewRegimeBool, activeMainTab]);
  /* ---------------- Regime flag ---------------- */
  useEffect(() => {
    if (
      newRegimeResponse?.go_head_with_new_regime === 0 ||
      newRegimeResponse?.go_head_with_new_regime === 1
    ) {
      setGoHeadWithNewRegime(newRegimeResponse.go_head_with_new_regime);
    }
  }, [newRegimeResponse]);
  /* ---------------- Normalize data ---------------- */
  useEffect(() => {
    if (!responseData) return;
    const normalized = normalizeITCategories(responseData);
    setGroupedCategories(normalized);
    if (normalized.length) {
      setActiveSection(normalized[0].section);
    }
    if (responseData?.hra_exemption && responseData.lta_exemption) {
      setHraData(responseData.hra_exemption?.[0] || null);
      setLtaData({
        items: responseData.lta_exemption || [],
      });

    }
  }, [responseData]);
  /* ---------------- Derived ---------------- */
  const activeSectionData = groupedCategories.find(
    (sec) => sec.section === activeSection
  );
  const sectionCategories = activeSectionData?.categories || [];
  /* ---------------- Handlers ---------------- */
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };
  const handleHraChange = (field: keyof HRAData, value: string | number) => {
    setHraData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };
  /* ---------------- Reset ---------------- */
  const resetForm = () => {
    setGroupedCategories((prev) =>
      prev.map((sec) => ({
        ...sec,
        categories: sec.categories.map((cat: any) => ({
          ...cat,
          items: cat.items.map((item: any) => ({
            ...item,
            amount: 0,
          })),
        })),
      }))
    );
  };
  /* ---------------- Submit ---------------- */

  const handleSubmit = () => {
    const isValid = validateITDeclarationProofs({
      groupedCategories,
      hraData,
      goHeadWithNewRegimeBool,
      toast,
    });
    if (!isValid) return;
    const ltaDeclarations = ltaData?.items?.flatMap((cat: any) =>
      cat.items
        .filter((item: any) => Number(item?.amount) > 0)
        .map((item: any) => ({
          exemption_category: cat.category_name,
          exemption_sub_category: item.exemption_sub_category,
          amount: Number(item.amount),
          max_amount: Number(item.max_amount),

          attach_proof:
            typeof item.proof_file === "string" && item.proof_file.length > 0
              ? item.proof_file // new uploaded file
              : item.attach_proof || null, // existing API file

          note: "",
        }))
    );
    const itDeclarations = groupedCategories.flatMap((sec) =>
      sec.categories.flatMap((cat: any) =>
        cat.items
          .filter(
            (item: any) =>
              item.is_selected === true ||
              item.editable === 0 ||
              Number(item?.amount) > 0
          )
          .map((item: any) => ({
            exemption_category: cat.category_name,
            exemption_sub_category: item.exemption_sub_category,
            amount: Number(item.amount),
            max_amount: Number(item.max_amount),
            attach_proof:
              typeof item.proof_file === "string" && item.proof_file.length > 0
                ? item.proof_file // new uploaded file
                : item.attach_proof || null,
            note: item.proof_comment || "",
          }))
      )
    );
    const declarations = [...itDeclarations, ...ltaDeclarations];
    const payload = {
      declaration_id: declarationId,
      doctype: declarationDoctype,
      proof_id: proofId,
      payroll_period: selectedPeriod,
      company: user?.company,
      employee: effectiveEmployee,
      data: {
        monthly_house_rent: goHeadWithNewRegimeBool
          ? 0
          : Number(hraData?.monthly_hra || 0),

        rented_in_metro_city: goHeadWithNewRegimeBool
          ? 0
          : Number(hraData?.rented_in_metro_city || 0),

        start_date: goHeadWithNewRegimeBool ? "" : hraData?.start_date || "",

        end_date: goHeadWithNewRegimeBool ? "" : hraData?.end_date || "",

        pan: goHeadWithNewRegimeBool ? "" : hraData?.pan || "",

        custom_name: goHeadWithNewRegimeBool ? "" : hraData?.owner_name || "",

        address_title1: goHeadWithNewRegimeBool
          ? ""
          : hraData?.address_line1 || "",

        address_title2: goHeadWithNewRegimeBool
          ? ""
          : hraData?.address_line2 || "",

        attach_proof: goHeadWithNewRegimeBool
          ? null
          : hraData?.proof_file || null,

        payroll_period: selectedPeriod,
        employee: effectiveEmployee,
        go_head_with_new_regime: goHeadWithNewRegime,
        declarations,
      },
    };
    console.log("Submitting payload", payload);
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Declaration submitted successfully");
        resetForm();
        // window.location.reload();
      },
      onError: () => toast.error("Submission failed"),
    });
  };

  const message =
    typeof PrrofOfITDeclaration?.message === "string"
      ? PrrofOfITDeclaration.message
      : "";

  // eslint-disable-next-line no-useless-escape
  const dateRegex = /(\b\d{4}-\d{2}-\d{2}\b|\b\d{2}[\/-]\d{2}[\/-]\d{4}\b)/g;

  const parts = message.split(dateRegex);

  // Register action button in central SalarySlipApp via ref pattern

  return (
    <div className="bg-white min-h-screen font-brand flex flex-col">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 w-full">
        {/* Desktop top bar (hidden on mobile) */}
        {isDesktop && (
          <div className="sm:flex items-center justify-between h-[52px] px-7">
            <span className="font-bold text-[17px] text-text-title tracking-tight">IT Declaration</span>
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] text-text-body2">Payroll Period</span>
                <CustomDropdown
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  options={
                    payrollPeriods?.map((p) => ({
                      value: p.name,
                      label: p.name,
                    })) || []
                  }
                />
              </div>
              {actionsEnabled.compare_tax && (
                <CompareTaxSheetHandler
                  declarationId={declarationId}
                  disabled={false}
                />
              )}
              {actionsEnabled.form_12b && (
                <Form12B
                  declarationId={declarationIdFromITDeclaration}
                  docName={declarationDoctype}
                  disabled={false}
                />
              )}
              {actionsEnabled.preview &&
                declarationDoctype ===
                "Employee Tax Exemption Proof Submission" && (
                  <PreviewOfITDeclaration
                    declarationId={declarationIdFromITDeclaration}
                    disabled={false}
                  />
                )}
              <Button
                variant="contain"
                size="md"
                onClick={handleSubmit}
                disabled={PrrofOfITDeclaration?.status === "failed"}
              >
                Submit
              </Button>
            </div>
          </div>
        )}

        {/* Mobile top bar (hidden on sm+) */}
        {!isDesktop && (
          <div className="flex flex-col px-4 pt-3 pb-3 gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[16px] text-text-title tracking-tight">IT Declaration</span>
              <CustomDropdown
                value={selectedPeriod}
                onChange={handlePeriodChange}
                options={
                  payrollPeriods?.map((p) => ({
                    value: p.name,
                    label: p.name,
                  })) || []
                }
              />
            </div>
            <div className="flex gap-2 [&>*]:flex-1 [&>*]:w-0 [&>*]:min-w-0">
              {actionsEnabled.compare_tax && (
                <CompareTaxSheetHandler
                  declarationId={declarationId}
                  disabled={false}
                />
              )}
              {actionsEnabled.form_12b && (
                <Form12B
                  declarationId={declarationIdFromITDeclaration}
                  docName={declarationDoctype}
                  disabled={false}
                />
              )}
              {actionsEnabled.preview &&
                declarationDoctype ===
                "Employee Tax Exemption Proof Submission" && (
                  <PreviewOfITDeclaration
                    declarationId={declarationIdFromITDeclaration}
                    disabled={false}
                  />
                )}
              <Button
                onClick={handleSubmit}
                disabled={PrrofOfITDeclaration?.status === "failed"}
                size="sm"
              >
                Submit
              </Button>
            </div>
          </div>
        )}
      </div>

      <header className=" md:p-4 rounded-lg flex-1 overflow-y-auto">
        <div
          className={`p-2 mb-2 rounded ${PrrofOfITDeclaration?.status === "failed"
            ? "bg-error-50 text-error"
            : "bg-success-50 text-success"
            }`}
        >
          <Typography variant="bodySmall">
            {parts.map((part: string, index: number) =>
              dateRegex.test(part) ? (
                <strong key={index}>{part}</strong>
              ) : (
                <span key={index}>{part}</span>
              )
            )}
          </Typography>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:items-center mt-4">
          {isDesktop && <p className="text-gray-500">Tax Regime</p>}
          <div className="inline-flex rounded-lg border bg-gray-100 p-[2px] text-xs">
            <button
              disabled={PrrofOfITDeclaration?.status === "failed"}
              onClick={() => setGoHeadWithNewRegime(1)}
              className={`px-6 py-1 whitespace-nowrap w-full rounded-md ${goHeadWithNewRegime === 1
                ? "bg-primary text-white"
                : "text-gray-600"
                }`}
            >
              New Regime
            </button>
            <button
              disabled={PrrofOfITDeclaration?.status === "failed"}
              onClick={() => setGoHeadWithNewRegime(0)}
              className={`px-6  whitespace-nowrap py-1 w-full rounded-md ${goHeadWithNewRegime === 0
                ? "bg-primary text-white"
                : "text-gray-600"
                }`}
            >
              Old Regime
            </button>
          </div>
          <div className=" flex gap-2 items-center">
            {/* Open Button */}
            {actionsEnabled?.edit_decalaration && (
              <button
                onClick={() => setOpenModal(true)}
                className=" text-gray-500 rounded-xl"
              >
                <SquarePen className="h-5 w-5" />
              </button>
            )}

            {/* Modal */}
            <EditITDeclarationAccess
              isOpen={openModal}
              onClose={() => setOpenModal(false)}
              empdoc_id={effectiveEmployee || null}
            />
          </div>
        </div>
        {/* Tabs */}
        <div className="w-full">
          <div className="flex flex-nowrap overflow-x-auto md:overflow-visible gap-6 mt-4 border-b border-gray-200">
            <button
              ref={(el) => {
                tabRefs.current["category"] = el;
              }}
              onClick={() => setActiveMainTab("category")}
              className={`relative whitespace-nowrap pb-3 text-sm font-semibold transition-all duration-200
    ${activeMainTab === "category"
                  ? "text-primary"
                  : "text-gray-500 hover:text-gray-800"
                }`}
            >
              Other Investment Declaration
              {activeMainTab === "category" && (
                <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-lg"></span>
              )}
            </button>

            {!goHeadWithNewRegimeBool && (
              <button
                ref={(el) => {
                  tabRefs.current["hra"] = el;
                }}
                onClick={() => setActiveMainTab("hra")}
                className={`relative whitespace-nowrap pb-3 text-sm font-semibold transition-all duration-200
      ${activeMainTab === "hra"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-800"
                  }`}
              >
                HRA & Other (U/S 10)
                {activeMainTab === "hra" && (
                  <span className="absolute left-0 bottom-0 w-full h-[2px] bg-primary rounded-lg"></span>
                )}
              </button>
            )}
          </div>
          {activeMainTab === "hra" && hraData && (
            <HRAForm
              hraData={hraData}
              ltaData={ltaData}
              onChange={handleHraChange}
              LATABreakup={LTABreakup}
            />
          )}
          {activeMainTab === "category" && (
            <>
              <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mt-4 p-1 bg-gray-100/70 backdrop-blur-sm rounded-xl w-fit">
                {groupedCategories.map((sec, index) => {
                  const active = activeSection === sec.section;

                  return (
                    <div key={sec.section} className="flex items-center">
                      <button
                        onClick={() => setActiveSection(sec.section)}
                        className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all duration-200
                        ${active ? "bg-white text-primary shadow-sm"
                            : "text-gray-600 hover:text-gray-900 hover:bg-white/70"
                          }`}
                      >
                        {sec.section}
                      </button>

                      {index !== groupedCategories.length - 1 && (
                        <div className="w-px h-5 bg-gray-300 mx-1"></div>
                      )}
                    </div>
                  );
                })}
              </div>
              <CategorySection
                sectionCategories={sectionCategories}
                activeSection={activeSection}
                lockingDate={PrrofOfITDeclaration?.status}
                responseDoctype={responseData?.doctype}
                setGroupedCategories={setGroupedCategories}
              />
            </>
          )}
        </div>
      </header>
    </div>
  );
};

export default ITDeclarationForm;
