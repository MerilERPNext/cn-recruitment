/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import type React from "react";

import type { ITCategory } from "../../../types/itDeclaration";
import {
  useITDeclarationTabData,
  useNewRegime,
  useSubmitITDeclaration,
} from "../../../hooks/payroll/useITDeclaration";
import { normalizeITCategories } from "./Component/DataHandling";
import CategoryDeclaration from "./Component/test";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";
import HRAForm, { type HRAData } from "./Component/HraExemptio";
import CompareTaxSheetHandler from "./Component/TaxCompare";
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet";
import CustomDropdown from "../../shared/CustomDropdown";
import { Typography } from "../../shared/atoms/Typography";
import { Card } from "../../shared/atoms/Card";
import Button from "../../shared/atoms/Button";

type PayrollPeriod = {
  name: string;
};

const ITDeclarationForm = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");
  const mutation = useSubmitITDeclaration();
  const { data: payrollPeriods } = useTaxSheetPayrollPriodsData(
    user?.company ?? null
  ) as {
    data: PayrollPeriod[] | undefined;
    refetch: () => void;
  };
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");

  const newRegimeResponse = useNewRegime(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as any;
  const declarationId = newRegimeResponse?.declaration_id;
  const [goHeadWithNewRegime, setGoHeadWithNewRegime] = useState<0 | 1 | null>(
    null
  );
  const [apiResponse, setApiResponse] = useState<any | null>(null);

  useEffect(() => {
    if (
      newRegimeResponse?.go_head_with_new_regime === 0 ||
      newRegimeResponse?.go_head_with_new_regime === 1
    ) {
      setGoHeadWithNewRegime(newRegimeResponse.go_head_with_new_regime);
    }
  }, [newRegimeResponse]);

  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1;
  const { data: responseData, refetch: refetchDeclaration } =
    useITDeclarationTabData(
      goHeadWithNewRegimeBool,
      user?.employee || null,
      user?.company || null,
      selectedPeriod || null
    ) as { data?: any; refetch: () => void };

  console.log("IT Declaration Response Data:", refetchDeclaration);

  // Set initial payroll period once
  useEffect(() => {
    if (payrollPeriods?.length && !selectedPeriod) {
      const currentYear = new Date().getFullYear().toString();
      const periodForCurrentYear =
        payrollPeriods.find((p) => p.name.includes(currentYear))?.name ||
        payrollPeriods[0].name;
      setSelectedPeriod(periodForCurrentYear);
    }
  }, [payrollPeriods, selectedPeriod]);

  useEffect(() => {
    setCategories([]);
    setHraData(null);
    setActiveCategoryTab("");
  }, [selectedPeriod]);

  // Refetch API when payroll period changes
  useEffect(() => {
    if (responseData) {
      setApiResponse(responseData);
    }
  }, [responseData]);

  const payrollPeriodOptions =
    payrollPeriods?.map((p) => ({
      value: p.name,
      label: p.name,
    })) || [];

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value);
  };

  const [categories, setCategories] = useState<ITCategory[]>([]);
  const [activeMainTab, setActiveMainTab] = useState<"hra" | "category">(
    "category"
  );
  const [hraData, setHraData] = useState<HRAData | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState("");

  useEffect(() => {
    if (!apiResponse) return;

    const normalized = normalizeITCategories(apiResponse);

    if (normalized.length > 0) {
      setCategories(normalized);
      setActiveCategoryTab(normalized[0].category_name);
    }

    if (apiResponse?.hra_exemption) {
      setHraData(apiResponse.hra_exemption);
    }
  }, [apiResponse]);

  const activeCategory = categories.find(
    (c) => c.category_name === activeCategoryTab
  );

  const handleHraChange = (field: keyof HRAData, value: string | number) => {
    setHraData((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : prev
    );
  };

  const resetForm = () => {
    // HRA reset - set all fields to empty/default values
    if (hraData) {
      setHraData({
        monthly_hra: 0,
        rented_in_metro_city: 0,
        annual_hra_exemption: 0,
        monthly_hra_exemption: 0,
        start_date: "",
        end_date: "",
        pan: "",
        address_line1: "",
        address_line2: "",
      });
    }

    // Categories reset (amount = 0)
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          ...item,
          amount: 0,
        })),
      }))
    );

    // Tabs reset
    setActiveMainTab("category");
    setActiveCategoryTab("");
  };

  const handleAmountChange = (
    categoryName: string,
    itemIndex: number,
    value: number
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.category_name !== categoryName
          ? cat
          : {
              ...cat,
              items: cat.items.map((item, idx) =>
                idx === itemIndex ? { ...item, amount: value } : item
              ),
            }
      )
    );
  };

  const handleSubmit = () => {
    const declarations = categories.flatMap((cat) =>
      cat.items
        .filter((item) => Number(item.amount) > 0)
        .map((item) => ({
          exemption_category: cat.category_name,
          exemption_sub_category: item.exemption_sub_category,
          amount: Number(item.amount),
          max_amount: Number(item.max_amount ?? item.amount),
        }))
    );

    const payload = {
      declaration_id: declarationId,
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
      onSuccess: (res: any) => {
        console.log("API SUCCESS ✅", res);
        alert("Declaration submitted successfully!");
        resetForm();
      },
      onError: (err: any) => {
        console.error("API ERROR ❌", err);
        alert("Failed to submit declaration.");
      },
    });
    console.log("FINAL PAYLOAD", payload);
  };

  return (
    <Card radius="xl">
      <header className="mb-6 py-4 px-8">
        <div className="flex justify-between">
          <div className="mb-4">
            <Typography variant="h4">IT Declaration</Typography>
            <Typography variant="bodySmall" color="body2">
              Track and manage IT Declaration
            </Typography>
          </div>

          <div className="flex gap-2">
            <div className="flex flex-row md:flex-row md:items-center md:gap-4">
              <CustomDropdown
                value={selectedPeriod}
                onChange={handlePeriodChange}
                options={payrollPeriodOptions}
              />
            </div>
            <div className="flex items-center gap-3">
              <CompareTaxSheetHandler
                declarationId={declarationId}
                disabled={false}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={handleSubmit}
               
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Submit
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <label className="flex items-center text-xs">
            <input
              type="radio"
              checked={goHeadWithNewRegime === 1}
              onChange={() => setGoHeadWithNewRegime(1)}
              className="mr-2"
            />
            Yes
          </label>

          <label className="flex items-center text-xs">
            <input
              type="radio"
              checked={goHeadWithNewRegime === 0}
              onChange={() => setGoHeadWithNewRegime(0)}
              className="mr-2"
            />
            No
          </label>
        </div>

        <div className="flex gap-4 mt-4">
          <Button
            onClick={() => setActiveMainTab("category")}
            className={`px-4 py-1 rounded text-sm ${
              activeMainTab === "category"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Categories
          </Button>

          {!goHeadWithNewRegimeBool && (
            <Button
              onClick={() => setActiveMainTab("hra")}
              className={`px-4 py-1 rounded text-sm ${
                activeMainTab === "hra"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200"
              }`}
            >
              HRA Exemption
            </Button>
          )}
        </div>

        {activeMainTab === "hra" && hraData && (
          <HRAForm hraData={hraData} onChange={handleHraChange} />
        )}

        {activeMainTab === "category" && (
          <nav className="mt-4 border-b pb-3 overflow-x-auto">
            <div className="flex gap-2 whitespace-nowrap">
              {categories.map((cat) => (
                <Button
                  key={cat.category_name}
                  onClick={() => setActiveCategoryTab(cat.category_name)}
                  className={`px-3 py-1 text-xs rounded-lg border flex-shrink-0
              ${
                activeCategoryTab === cat.category_name
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100"
              }`}
                >
                  {cat.category_name}
                </Button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {activeMainTab === "category" && activeCategory && (
        <CategoryDeclaration
          categoryName={activeCategory.category_name}
          items={activeCategory.items}
          onAmountChange={handleAmountChange}
        />
      )}
    </Card>
  );
};

export default ITDeclarationForm;
