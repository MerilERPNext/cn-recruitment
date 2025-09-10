import { useNavigate } from "react-router"
import HeaderBar from "../../../HeaderBar"

export default function LoanSummary() {
  const navigate = useNavigate()
  const installmentData = [
    { id: 1, month: "Jan", year: "2024", openingBalance: "₹10,000.00", principal: "₹833.33" },
    { id: 2, month: "Feb", year: "2024", openingBalance: "₹9,166.67", principal: "₹833.33" },
    { id: 3, month: "Mar", year: "2024", openingBalance: "₹8,333.34", principal: "₹833.33" },
    { id: 4, month: "Apr", year: "2024", openingBalance: "₹7,500.01", principal: "₹833.33" },
    { id: 5, month: "May", year: "2024", openingBalance: "₹6,666.68", principal: "₹833.33" },
    { id: 6, month: "Jun", year: "2024", openingBalance: "₹5,833.35", principal: "₹833.33" },
    { id: 7, month: "Jul", year: "2024", openingBalance: "₹5,000.02", principal: "₹833.33" },
    { id: 8, month: "Aug", year: "2024", openingBalance: "₹4,166.69", principal: "₹833.33" },
    { id: 9, month: "Sep", year: "2024", openingBalance: "₹3,333.36", principal: "₹833.33" },
    { id: 10, month: "Oct", year: "2024", openingBalance: "₹2,500.03", principal: "₹833.33" },
    { id: 11, month: "Nov", year: "2024", openingBalance: "₹1,666.70", principal: "₹833.33" },
    { id: 12, month: "Dec", year: "2024", openingBalance: "₹833.37", principal: "₹833.33" },
  ]

  return (
    <div><HeaderBar title="Loan Details" onBack={() => navigate(-1)} />
    <div className="max-w-md mx-auto bg-gray-50 p-6 font-sans">
     
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Loan Summary</h1>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Pending Months</p>
            <p className="text-lg font-semibold text-gray-900">12</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Total Principal</p>
            <p className="text-lg font-semibold text-gray-900">₹10,000</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Total Interest</p>
            <p className="text-lg font-semibold text-gray-900">₹1,200</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Total Amount</p>
            <p className="text-lg font-semibold text-gray-900">₹11,200</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Total Paid</p>
            <p className="text-lg font-semibold text-green-600">₹5,600</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Total Outstanding</p>
            <p className="text-lg font-semibold text-red-600">₹5,600</p>
          </div>
        </div>
      </div>

      {/* Installment Breakup Section */}
      <div className="mb-8 bg-white py-6 px-2 rounded-lg shadow">
        <h2 className="text-xl ml-4 font-semibold text-gray-900 mb-6">Installment Breakup</h2>

        {/* Table Header */}
        <div className="bg-gray-100 px-4 py-3 grid grid-cols-4 gap-4 text-xs font-medium text-gray-700 uppercase tracking-wider">
          <div>#</div>
          <div>MONTH</div>
          <div>OPENING BALANCE</div>
          <div>PRINCIPAL</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-200">
          {installmentData.map((item, index) => (
            <div
              key={item.id}
              className={`px-4 py-4 grid grid-cols-4 gap-4 text-sm ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
            >
              <div className="text-gray-900 font-medium">{item.id}</div>
              <div className="text-gray-600">
                <div>{item.month}</div>
                <div>{item.year}</div>
              </div>
              <div className="text-gray-900">{item.openingBalance}</div>
              <div className="text-gray-900">{item.principal}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Download Button */}
      <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Download Loan Statement
      </button>
    </div>
    </div>
  )
}
