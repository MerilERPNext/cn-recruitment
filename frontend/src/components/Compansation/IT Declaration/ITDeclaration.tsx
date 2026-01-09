/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import type React from "react"

import {
  useITDeclarationTabData,
  useNewRegime,
  useSubmitITDeclaration,
} from "../../../hooks/payroll/useITDeclaration"
import { normalizeITCategories } from "./Component/DataHandling"
import { useLoggedInUser } from "../../../hooks/useLoggedInUser"
import { useCurrentEmployeeAllDetails } from "../../../hooks/useEmployee"
import HRAForm, { type HRAData } from "./Component/HraExemptio"
import CompareTaxSheetHandler from "./Component/TaxCompare"
import { useTaxSheetPayrollPriodsData } from "../../../hooks/useTaxSheet"
import CustomDropdown from "../../shared/CustomDropdown"
import Button from "../../shared/atoms/Button"

type PayrollPeriod = {
  name: string;
};

const ITDeclarationForm = () => {
  /* ---------------- User & hooks ---------------- */
  const { data: userId } = useLoggedInUser()
  const { data: user } = useCurrentEmployeeAllDetails(userId || "")
  const mutation = useSubmitITDeclaration()

  const { data: payrollPeriods } =
    useTaxSheetPayrollPriodsData(user?.company ?? null) as {
      data: PayrollPeriod[] | undefined
    }

  /* ---------------- State ---------------- */
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [goHeadWithNewRegime, setGoHeadWithNewRegime] = useState<0 | 1 | null>(null)
  const [activeMainTab, setActiveMainTab] = useState<"category" | "hra">("category")

  const [groupedCategories, setGroupedCategories] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState("")
  const [activeCategory, setActiveCategory] = useState("")
  const [hraData, setHraData] = useState<HRAData | null>(null)
  console.log("Rendered ITDeclarationForm", hraData)

  /* ---------------- Regime ---------------- */
  const newRegimeResponse = useNewRegime(
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ).data as any

  const declarationId = newRegimeResponse?.declaration_id
  const goHeadWithNewRegimeBool = goHeadWithNewRegime === 1

  /* ---------------- IT Declaration API ---------------- */
  const { data: responseData } = useITDeclarationTabData(
    goHeadWithNewRegimeBool,
    user?.employee || null,
    user?.company || null,
    selectedPeriod || null
  ) as { data?: any }

  /* ---------------- Initial payroll period ---------------- */
  useEffect(() => {
    if (payrollPeriods?.length && !selectedPeriod) {
      const currentYear = new Date().getFullYear().toString()
      setSelectedPeriod(
        payrollPeriods.find((p) => p.name.includes(currentYear))?.name ||
        payrollPeriods[0].name
      )
    }
  }, [payrollPeriods, selectedPeriod])

  /* ---------------- Regime flag ---------------- */
  useEffect(() => {
    if (
      newRegimeResponse?.go_head_with_new_regime === 0 ||
      newRegimeResponse?.go_head_with_new_regime === 1
    ) {
      setGoHeadWithNewRegime(newRegimeResponse.go_head_with_new_regime)
    }
  }, [newRegimeResponse])

  /* ---------------- Normalize data ---------------- */
  useEffect(() => {
    if (!responseData) return

    const normalized = normalizeITCategories(responseData)
    setGroupedCategories(normalized)

    if (normalized.length) {
      setActiveSection(normalized[0].section)
      setActiveCategory("")
    }

    const hra = responseData?.hra_exemption
    if (hra) setHraData(hra)
  }, [responseData])

  /* ---------------- Derived Data ---------------- */
  const activeSectionData = groupedCategories.find(
    (sec) => sec.section === activeSection
  )

  const sectionCategories = activeSectionData?.categories || []

  const activeCategoryData = sectionCategories.find(
    (cat: any) => cat.category_name === activeCategory
  )

  /* ---------------- Handlers ---------------- */
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedPeriod(e.target.value)
  }

  const handleHraChange = (field: keyof HRAData, value: string | number) => {
    setHraData((prev) => (prev ? { ...prev, [field]: value } : prev))
  }

  const handleItemAmountChange = (
    categoryName: string,
    itemIndex: number,
    value: number
  ) => {
    setGroupedCategories((prev) =>
      prev.map((sec) => ({
        ...sec,
        categories: sec.categories.map((cat: any) =>
          cat.category_name !== categoryName
            ? cat
            : {
              ...cat,
              items: cat.items.map((item: any, idx: number) =>
                idx === itemIndex
                  ? {
                    ...item,
                    amount: Math.min(value, item.max_amount),
                  }
                  : item
              ),
            }
        ),
      }))
    )
  }

  /* ---------------- Reset Form ---------------- */
  const resetForm = () => {
    const resetCategories = groupedCategories.map((sec) => ({
      ...sec,
      categories: sec.categories.map((cat: any) => ({
        ...cat,
        items: cat.items.map((item: any) => ({
          ...item,
          amount: 0, // Reset the input value to 0
        })),
      })),
    }));
    setGroupedCategories(resetCategories);

  }

  /* ---------------- Submit ---------------- */
  const handleSubmit = () => {
    const declarations = groupedCategories.flatMap((sec) =>
      sec.categories.flatMap((cat: any) =>
        cat.items
          .filter((item: any) => Number(item.amount) > 0)
          .map((item: any) => ({
            exemption_category: cat.category_name,
            exemption_sub_category: item.exemption_sub_category,
            amount: Number(item.amount),
            max_amount: Number(item.max_amount),
          }))
      )
    )

    const payload = {
      declaration_id: declarationId,
      data: {
        monthly_house_rent: goHeadWithNewRegimeBool ? 0 : hraData?.monthly_hra ?? 0,
        rented_in_metro_city: goHeadWithNewRegimeBool ? 0 : hraData?.rented_in_metro_city ?? 0,
        start_date: goHeadWithNewRegimeBool ? "" : hraData?.start_date ?? "",
        end_date: goHeadWithNewRegimeBool ? "" : hraData?.end_date ?? "",
        pan: goHeadWithNewRegimeBool ? "" : hraData?.pan ?? "",
        address_line1: goHeadWithNewRegimeBool ? "" : hraData?.address_line1 ?? "",
        address_line2: goHeadWithNewRegimeBool ? "" : hraData?.address_line2 ?? "",
        company: user?.company,
        payroll_period: selectedPeriod,
        employee: user?.employee,
        go_head_with_new_regime: goHeadWithNewRegime,
        declarations,
      },
    }

    mutation.mutate(payload, {
      onSuccess: () => {
        alert("Declaration submitted successfully")
        resetForm() // Reset form after success
      },
      onError: () => alert("Submission failed"),
    })
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="bg-gray-50 min-h-screen p-4">
      <header className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <h1 className="font-bold">IT Declaration</h1>

          <div className="flex gap-2">
            <CustomDropdown
              value={selectedPeriod}
              onChange={handlePeriodChange}
              options={payrollPeriods?.map((p) => ({
                value: p.name,
                label: p.name,
              })) || []}
            />
            <CompareTaxSheetHandler declarationId={declarationId} disabled={false} />
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-4 py-1 rounded text-xs"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Regime */}
        <div className="flex w-full justify-between items-center mt-4">
          <p className="text-gray-500">Tax Regime</p>
          <div className="mt-4 inline-flex rounded-lg border border-gray-300 bg-gray-100 p-[2px] text-xs">
            <button
              type="button"
              onClick={() => setGoHeadWithNewRegime(1)}
              className={`px-6 py-1 rounded-md transition-all
              ${goHeadWithNewRegime === 1
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
                }`}
            >
              New
            </button>

            <button
              type="button"
              onClick={() => setGoHeadWithNewRegime(0)}
              className={`px-6 py-1 rounded-md transition-all
              ${goHeadWithNewRegime === 0
                  ? "bg-blue-600 text-white shadow"
                  : "text-gray-600 hover:bg-gray-200"
                }`}
            >
              Old
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 border-b border-gray-300">
          <button
            onClick={() => setActiveMainTab("category")}
            className={`px-4 py-2 -mb-px font-medium transition-colors duration-200
              ${activeMainTab === "category"
                ? "text-blue-600 border-b-4 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
              }`}
          >
            Other Investment Declaration
          </button>

          {!goHeadWithNewRegimeBool && (
            <Button
              onClick={() => setActiveMainTab("hra")}
              className={`px-4 py-2 -mb-px font-medium transition-colors duration-200
                ${activeMainTab === "hra"
                  ? "text-blue-600 border-b-4 border-blue-600"
                  : "text-gray-600 hover:text-blue-600"
                }`}
            >
              HRA & Other   Exemption Declaration
            </Button>
          )}
        </div>

        {/* HRA */}
        {activeMainTab === "hra" && hraData && (
          <HRAForm hraData={hraData} onChange={handleHraChange} />
        )}

        {/* Sections */}
        {activeMainTab === "category" && (
          <>
            <div className="flex w-full py-4 px-2 gap-2 mt-4">
              {groupedCategories.map((sec) => (
                <button
                  key={sec.section}
                  onClick={() => {
                    setActiveSection(sec.section)
                    setActiveCategory("")
                  }}
                  className={`px-4 py-1 text-sx rounded-3xl ${activeSection === sec.section ? "bg-blue-600 text-white" : "bg-gray-200"
                    }`}
                >
                  {sec.section}
                </button>
              ))}
            </div>

            {/* Categories */}
            <div className="grid-row mt-4">
              {sectionCategories.map((cat: any) => (
                <button
                  key={cat.category_name}
                  onClick={() => setActiveCategory(cat.category_name)}
                  className={`p-3 ml-2 text-left border rounded text-xs ${activeCategory === cat.category_name
                    ? "border-blue-600 bg-blue-50"
                    : "bg-white"
                    }`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>

            {/* Items */}
            {activeCategoryData && (
              <div className="mt-6 space-y-3">
                {activeCategoryData.items.map((item: any, idx: number) => (
                  <div
                    key={item.exemption_sub_category}
                    className="flex justify-between p-3 border bg-white rounded"
                  >
                    <div>
                      <p className="text-xs font-medium">{item.description}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        disabled={item.editable === 0}
                        value={item.amount}
                        onChange={(e) =>
                          handleItemAmountChange(
                            activeCategoryData.category_name,
                            idx,
                            Number(e.target.value)
                          )
                        }
                        className="w-28 border rounded px-2 py-1 text-xs"
                      />
                      <p className="text-[11px] text-gray-500">
                        Max: ₹{item.max_amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </header>
    </div>
  )
}

export default ITDeclarationForm;
