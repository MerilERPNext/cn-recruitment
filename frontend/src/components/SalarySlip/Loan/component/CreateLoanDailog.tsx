"use client"

import type React from "react"

import { useState } from "react"


interface CreateLoanDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateLoanDialog({ isOpen, onClose }: CreateLoanDialogProps) {
  const [formData, setFormData] = useState({
    loanType: "",
    loanName: "",
    emiType: "Flat",
    loanAmount: "",
    rateOfInterest: "",
    standardInterestRate: "",
    noOfInstallments: "",
    startDate: "",
    endMonth: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    // Here you would typically send the data to your backend
    onClose()
    // Reset form
    setFormData({
      loanType: "",
      loanName: "",
      emiType: "Flat",
      loanAmount: "",
      rateOfInterest: "",
      standardInterestRate: "",
      noOfInstallments: "",
      startDate: "",
      endMonth: "",
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Dialog Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create New Loan</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
           x
          </button>
        </div>

        {/* Dialog Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loan Type */}
            <div>
              <label htmlFor="loanType" className="block text-sm font-medium text-gray-700 mb-2">
                Loan Type *
              </label>
              <select
                id="loanType"
                name="loanType"
                value={formData.loanType}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select Loan Type</option>
                <option value="Education Loan">Education Loan</option>
                <option value="Home Loan">Home Loan</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Car Loan">Car Loan</option>
              </select>
            </div>

            {/* Loan Name */}
            <div>
              <label htmlFor="loanName" className="block text-sm font-medium text-gray-700 mb-2">
                Loan Name *
              </label>
              <input
                type="text"
                id="loanName"
                name="loanName"
                value={formData.loanName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter loan name"
              />
            </div>

            {/* EMI Type */}
            <div>
              <label htmlFor="emiType" className="block text-sm font-medium text-gray-700 mb-2">
                EMI Type *
              </label>
              <select
                id="emiType"
                name="emiType"
                value={formData.emiType}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Flat">Flat</option>
                <option value="Reducing">Reducing</option>
              </select>
            </div>

            {/* Loan Amount */}
            <div>
              <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-700 mb-2">
                Loan Amount (INR) *
              </label>
              <input
                type="number"
                id="loanAmount"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter loan amount"
              />
            </div>

            {/* Rate of Interest */}
            <div>
              <label htmlFor="rateOfInterest" className="block text-sm font-medium text-gray-700 mb-2">
                Rate of Interest (%) *
              </label>
              <input
                type="number"
                id="rateOfInterest"
                name="rateOfInterest"
                value={formData.rateOfInterest}
                onChange={handleInputChange}
                required
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter interest rate"
              />
            </div>

            {/* Standard Interest Rate */}
            <div>
              <label htmlFor="standardInterestRate" className="block text-sm font-medium text-gray-700 mb-2">
                Standard Interest Rate (%) *
              </label>
              <input
                type="number"
                id="standardInterestRate"
                name="standardInterestRate"
                value={formData.standardInterestRate}
                onChange={handleInputChange}
                required
                min="0"
                max="100"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter standard interest rate"
              />
            </div>

            {/* Number of Installments */}
            <div>
              <label htmlFor="noOfInstallments" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Installments *
              </label>
              <input
                type="number"
                id="noOfInstallments"
                name="noOfInstallments"
                value={formData.noOfInstallments}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter number of installments"
              />
            </div>

            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {/* End Month */}
            <div>
              <label htmlFor="endMonth" className="block text-sm font-medium text-gray-700 mb-2">
                End Month *
              </label>
              <input
                type="date"
                id="endMonth"
                name="endMonth"
                value={formData.endMonth}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Dialog Footer */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Loan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
