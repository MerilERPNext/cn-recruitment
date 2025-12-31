/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { ITCategory } from "../../../types/itDeclaration";
import {
  useITDeclarationTabData,
  useNewRegime,
} from "../../../hooks/payroll/useITDeclaration";
import { normalizeITCategories } from "./Component/DataHandling";
import CategoryDeclaration from "./Component/test";
import { useLoggedInUser } from "../../../hooks/useLoggedInUser";
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee";

type HRAExemption = {
  monthly_hra: number;
  rented_in_metro_city: number;
  annual_hra_exemption: number;
  monthly_hra_exemption: number;
  start_date: string;
  end_date: string;
  pan: string;
  address_line1: string;
  address_line2: string;
};

const ITDeclarationForm = () => {
  const { data: userId } = useLoggedInUser();
  const { data: user } = useCurrentEmployeeAllDetails(userId || "");

  const newRegimeValue = useNewRegime(
    user?.employee || null,
    user?.company || null
  ).data as any | undefined;

  const goHeadValue = newRegimeValue?.go_head_with_new_regime;
  const declarationId = newRegimeValue?.declaration_id;

  const { data: apiResponse } = useITDeclarationTabData(
    goHeadValue,
    user?.employee || null,
    user?.company || null
  ) as {data?: any};

  const normalizedCategories = normalizeITCategories(apiResponse);

  // ✅ STATES
  const [categories, setCategories] = useState<ITCategory[]>([]);
  const [hraExemption, setHraExemption] = useState<HRAExemption[]>([]);
  const [activeMainTab, setActiveMainTab] =
    useState<"hra" | "category">("hra");
  const [activeCategoryTab, setActiveCategoryTab] = useState("");

  // ✅ API → STATE
  useEffect(() => {
    if (normalizedCategories.length > 0) {
      setCategories(normalizedCategories);
      setActiveCategoryTab(normalizedCategories[0].category_name);
    }

    if (apiResponse?.hra_exemption) {
      setHraExemption(apiResponse.hra_exemption);
    }
  }, [normalizedCategories, apiResponse]);

  const activeCategory = categories.find(
    (c) => c.category_name === activeCategoryTab
  );

  // ✅ CATEGORY AMOUNT UPDATE
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
                idx === itemIndex
                  ? { ...item, amount: value }
                  : item
              ),
            }
      )
    );
  };

  // ✅ SUBMIT
  const handleSubmit = () => {
    const payload = {
      declaration_id: declarationId,
      go_head_with_new_regime: goHeadValue,
      hra_exemption: hraExemption,
      categories,
    };

    alert(JSON.stringify(payload, null, 2));
    console.log("SUBMIT PAYLOAD 👉", payload);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="mb-6 py-4 px-8 bg-blue-50 rounded-lg">
        <div className="flex justify-between">
          <h1 className="text-xs font-semibold">
            IT Declaration FY 2025-26
          </h1>

          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-1 rounded text-xs">
              Compare Tax
            </button>
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-4 py-1 rounded text-xs"
            >
              Submit
            </button>
          </div>
        </div>

        {/* REGIME */}
        <div className="flex gap-4 mt-4">
          <label className="flex items-center text-xs">
            <input
              type="radio"
              checked={goHeadValue === 1}
              readOnly
              className="mr-2"
            />
            Yes
          </label>

          <label className="flex items-center text-xs">
            <input
              type="radio"
              checked={goHeadValue === 0}
              readOnly
              className="mr-2"
            />
            No
          </label>
        </div>

        {/* 🔹 MAIN TABS */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveMainTab("hra")}
            className={`px-4 py-1 rounded text-sm ${
              activeMainTab === "hra"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            HRA Exemption
          </button>

          <button
            onClick={() => setActiveMainTab("category")}
            className={`px-4 py-1 rounded text-sm ${
              activeMainTab === "category"
                ? "bg-blue-600 text-white"
                : "bg-gray-200"
            }`}
          >
            Categories
          </button>
        </div>

        {/* 🔹 HRA TAB */}
        {activeMainTab === "hra" && (
  <div className="border rounded p-4 mt-4">
    <h2 className="font-semibold mb-4 text-sm">
      HRA Exemption Details
    </h2>

    {hraExemption.map((hra, index) => (
      <div
        key={index}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 border p-3 rounded"
      >
        {/* Monthly HRA */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Monthly HRA
          </label>
          <input
            type="number"
            value={hra.monthly_hra || ""}
            readOnly
            className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
          />
        </div>

        {/* Metro City */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Rented in Metro City
          </label>
          <input
            type="text"
            value={hra.rented_in_metro_city ? "Yes" : "No"}
            readOnly
            className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
          />
        </div>

        {/* Annual Exemption */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Annual HRA Exemption
          </label>
          <input
            type="number"
            value={hra.annual_hra_exemption || ""}
            readOnly
            className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
          />
        </div>

        {/* Monthly Exemption */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Monthly HRA Exemption
          </label>
          <input
            type="number"
            value={hra.monthly_hra_exemption || ""}
            readOnly
            className="w-full border rounded px-2 py-1 text-sm bg-gray-50"
          />
        </div>
      </div>
    ))}
  </div>
)}


        {/* 🔹 CATEGORY TABS */}
        {activeMainTab === "category" && (
          <nav className="flex flex-wrap gap-2 mt-4 border-b pb-3">
            {categories.map((cat) => (
              <button
                key={cat.category_name}
                onClick={() =>
                  setActiveCategoryTab(cat.category_name)
                }
                className={`px-3 py-1 text-xs rounded-lg border ${
                  activeCategoryTab === cat.category_name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100"
                }`}
              >
                {cat.category_name}
              </button>
            ))}
          </nav>
        )}
      </header>

      {/* CATEGORY CONTENT */}
      {activeMainTab === "category" && activeCategory && (
        <CategoryDeclaration
          categoryName={activeCategory.category_name}
          items={activeCategory.items}
          onAmountChange={handleAmountChange}
        />
      )}
    </div>
  );
};

export default ITDeclarationForm;
