/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import type React from "react";

import {
  useITDeclarationTabData,
  useLTABrakup,
  useNewRegime,
  useProofDateForITDeclaration,
  useSubmitITDeclaration,
} from "../../../hooks/payroll/useITDeclaration";
import { normalizeITCategories } from "./Component/DataHandling";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import HRAForm, { type HRAData } from "./Component/HraExemptio";
import CompareTaxSheetHandler from "./Component/TaxCompare";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import CustomDropdown from "../../shared/CustomDropdown";
import Button from "../../shared/atoms/Button";
import { Typography } from "../../shared/atoms/Typography";
import toast from "react-hot-toast";
import CategorySection from "./Component/CategoryDeclarationSelectable";

type PayrollPeriod = {
  name: string;
  start_date: string; 
  end_date: string;
};

const ITDeclarationForm = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const mutation = useSubmitITDeclaration();

  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: PayrollPeriod[] | undefined;
  };
console.log("payrollPeriods", payrollPeriods);
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
  const [hraData, setHraData] = useState<HRAData | null>(null);

  /* ---------------- Regime ---------------- */
  const newRegimeResponse = useNewRegime(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as any;

  const declarationId = newRegimeResponse?.declaration_id;
  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1;

  /* ---------------- IT Declaration API ---------------- */
  const { data: responseData } = useITDeclarationTabData(
    goHeadWithNewRegimeBool,
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data?: any };
  const declarationDoctype = responseData?.doctype;
  const proofId = responseData?.proof_id;
  const currentDate = new Date().toISOString().split("T")[0];
  const { data: PrrofOfITDeclaration } = useProofDateForITDeclaration(
    currentDate,
    user?.employee || null,
    declarationDoctype || null,
    selectedPeriod || null
  ) as { data?: any };
  const {data: LTABreakup } = useLTABrakup(user?.employee || "");

  console.log("ProofOfITDeclaration DATA", LTABreakup, );

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

  setSelectedPeriod(
    matchedPeriod?.name || payrollPeriods[0].name
  );
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

    if (responseData?.hra_exemption) {
      setHraData(responseData.hra_exemption);
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
    const ltaDeclarations =
  hraData?.lta?.items?.flatMap((cat: any) =>
    cat.items
      .filter((item: any) => Number(item.amount) > 0)
      .map((item: any) => ({
        exemption_category: cat.category_name, // usually "LTA"
        exemption_sub_category: item.exemption_sub_category,
        amount: Number(item.amount),
        max_amount: Number(item.max_amount),
        attach_proof: null,
        note: "",
      }))
  ) || [];
    const itDeclarations = groupedCategories.flatMap((sec) =>
      sec.categories.flatMap((cat: any) =>
        cat.items
          .filter(
            (item: any) =>
              item.is_selected &&
              Number(item.amount) > 0
          )
          .map((item: any) => ({
            exemption_category: cat.category_name,
            exemption_sub_category: item.exemption_sub_category,
            amount: Number(item.amount),
            max_amount: Number(item.max_amount),
            attach_proof:
              typeof item.proof_file === "string"
                ? item.proof_file
                : null,
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
      employee: user?.employee,
      data: {
        monthly_house_rent: goHeadWithNewRegimeBool
          ? 0
          : hraData?.monthly_hra ?? 0,
        rented_in_metro_city: goHeadWithNewRegimeBool
          ? 0
          : hraData?.rented_in_metro_city ?? 0,
        start_date: goHeadWithNewRegimeBool ? "" : hraData?.start_date ?? "",
        end_date: goHeadWithNewRegimeBool ? "" : hraData?.end_date ?? "",
        pan: goHeadWithNewRegimeBool ? "" : hraData?.pan ?? "",
        address_line1: goHeadWithNewRegimeBool
          ? ""
          : hraData?.address_line1 ?? "",
        address_line2: goHeadWithNewRegimeBool
          ? ""
          : hraData?.address_line2 ?? "",
        company: user?.company,
        payroll_period: selectedPeriod,
        employee: user?.employee,
        go_head_with_new_regime: goHeadWithNewRegime,
        declarations,
      },
    };

    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Declaration submitted successfully");
        resetForm();
      },
      onError: () => toast.error("Submission failed"),
    });
  };

  const message = PrrofOfITDeclaration?.message || "";

  // eslint-disable-next-line no-useless-escape
  const dateRegex = /(\b\d{4}-\d{2}-\d{2}\b|\b\d{2}[\/-]\d{2}[\/-]\d{4}\b)/g;

  const parts = message.split(dateRegex);

  return (
    <div className="bg-white min-h-screen">
      <header className=" p-4  rounded-lg">
        <div
          className={`p-2 mb-2 rounded ${
            PrrofOfITDeclaration?.status === "failed"
              ? "bg-red-100 text-error"
              : "bg-green-100 text-success"
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
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <Typography variant="h4">IT Declaration</Typography>
            <Typography variant="bodySmall" color="body2">
            Track and manage your IT Declarations.
            </Typography>
          </div>
          <div className="flex gap-2 justify-between items-center">
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
            <CompareTaxSheetHandler
              declarationId={declarationId}
              disabled={false}
            />
            <Button
              onClick={handleSubmit}
              disabled={PrrofOfITDeclaration?.status === "failed"}
              className="bg-primary text-white py-2 rounded text-xs"
            >
              Submit
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <p className="text-gray-500">Tax Regime</p>
          <div className="inline-flex rounded-lg border bg-gray-100 p-[2px] text-xs">
            <button
              onClick={() => setGoHeadWithNewRegime(1)}
              className={`px-6 py-1 rounded-md ${
                goHeadWithNewRegime === 1
                  ? "bg-primary text-white"
                  : "text-gray-600"
              }`}
            >
              New
            </button>
            <button
              onClick={() => setGoHeadWithNewRegime(0)}
              className={`px-6 py-1 rounded-md ${
                goHeadWithNewRegime === 0
                  ? "bg-primary text-white"
                  : "text-gray-600"
              }`}
            >
              Old
            </button>
          </div>
        </div>

        {/* Tabs */}

        <div>
          <div className="flex gap-2 mt-4 border-b">
            <button
              onClick={() => setActiveMainTab("category")}
              className={`px-4 py-2 ${
                activeMainTab === "category"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-600"
              }`}
            >
              Other Investment Declaration
            </button>

            {!goHeadWithNewRegimeBool && (
              <button
                onClick={() => setActiveMainTab("hra")}
                className={`px-4 py-2 ${
                  activeMainTab === "hra"
                    ? "border-b-2 border-primary text-primary"
                    : "text-gray-600"
                }`}
              >
                HRA & Other Exemption Declaration
              </button>
            )}
          </div>
          {activeMainTab === "hra" && hraData && (
            <HRAForm hraData={hraData} onChange={handleHraChange} LATABreakup = { LTABreakup}/>
          )}
          {activeMainTab === "category" && (
            <>
              <div className="flex gap-2 mt-4">
                {groupedCategories.map((sec) => (
                  <button
                    key={sec.section}
                    onClick={() => setActiveSection(sec.section)}
                    className={`px-4 py-1 rounded-3xl text-xs ${
                      activeSection === sec.section
                        ? "bg-primary text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    {sec.section}
                  </button>
                ))}
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
