"use client"
const incomeData = [
  {
    section: "Income from Salary",
    items: [
      { label: "Gross Salary", value: 19999996 },
      { label: "Less: CTC Reimbursements", value: "(0)" },
      { label: "Total Reimbursements", value: 0 },
      { label: "Gross Income after deduction and Reimbursements", value: 19999996 },
      { label: "Less exemption under Section 10", value: 0 },
      { label: "Total Income 15 Exemptions", value: 0 },
      { label: "Time amount of salary received after Section 10", value: 19999996 },
    ],
  },
  {
    section: "Less Deduction under section 16",
    items: [
      { label: "Less Deductions under section 16", value: 0 },
      { label: "Standard Deduction under section 16(ia)", value: 75000 },
      { label: "Total amount of deductions under section 16", value: 75000 },
    ],
  },
  { section: "Income from Other Sources", items: [{ label: "Add: Income from Other Sources", value: 14625004 }] },
  {
    section: "Tax Calculations",
    items: [
      { label: "Total Income Chargeable to Income Tax", value: 34624000 },
      { label: "Total Taxable Income", value: 34624000 },
      { label: "Income tax at slab rates", value: 1346482 },
      { label: "Outside Tax / Advance Tax (C)", value: 0 },
      { label: "Tax Deducted 10 Gross by Current Employer (D)", value: 144008 },
      { label: "Remaining Tax (E = C - D)", value: "1,202,474" },
      { label: "Remaining Months", value: 9 },
      { label: "Monthly TDS", value: 133608 },
    ],
  },
]

export default function IncomeComputationSheet() {

    return (
        <div className="">
          <div className="overflow-hidden">
            <div id="income-sheet-content" className=" bg-white">
      
              {/* Header */}
              <div className=" border px-4 py-2 rounded-t-lg bg-gray-100">
                <div className="grid grid-cols-4 gap-4 text-sm font-semibold">
                  <div className="text-sm">Description</div>
                  <div className="text-center">Declared Amount</div>
                  <div className="text-center">Exemption</div>
                  <div className="text-center">Taxable Amount</div>
                </div>
              </div>
              {/* Content Sections */}
              <div className="border">
                {incomeData.map((section, sectionIdx) => (
                  <div key={sectionIdx}>
                    <h3 className="text-sm font-bold bg-blue-50 p-2">
                      {section.section}
                    </h3>
      
                    <div className="space-y-2">
                      {section.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className={`grid grid-cols-4 gap-4 text-sm p-2 border-b ${
                            item.label.includes("Total") || item.label.includes("Income Tax")
                              ? "bg-gray-50 font-semibold"
                              : ""
                          }`}
                        >
                          {/* Col 1: Label */}
                          <div>{item.label}</div>
      
                          {/* Col 2: Declared Amount */}
                          <div className="text-center">
                            {typeof item.value === "number"
                              ? item.value.toLocaleString("en-IN")
                              : item.value}
                          </div>
      
                          {/* Col 3: Exemption */}
                          <div className="text-center">{ "-"}</div>
      
                          {/* Col 4: Taxable Amount */}
                          <div className="text-center">{ "-"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
      
              {/* Footer */}
              <div className=" p-2 border text-sm">
                <div className="grid grid-cols-4 gap-4 font-semibold">
                  <div>Net Tax Payable (Before 1(i)) or Receivable:</div>
                  <div className="text-center">1,202,474</div>
                  <div></div>
                  <div></div>
                </div>
              </div>
      
            </div>
          </div>
        </div>
      )
      
}
