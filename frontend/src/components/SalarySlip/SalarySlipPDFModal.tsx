import React, { useState } from "react";
import { X, Download, Eye, EyeOff } from "lucide-react";
import { BsToggleOff, BsToggleOn } from "react-icons/bs";
import PDFViewer from "../PDFViewer";
import { useDownloadSalarySlipPDF } from "../../hooks/useSalaryDetails";
import { useScreenSize } from "../../hooks/useScreenSize";

interface SalarySlipPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  salarySlipName: string;
  salarySlipDate?: string;
}

const SalarySlipPDFModal: React.FC<SalarySlipPDFModalProps> = ({
  isOpen,
  onClose,
  salarySlipName,
  salarySlipDate
}) => {
  const { isDesktop } = useScreenSize();
  const [isMasked, setIsMasked] = useState(true);
  const { mutate: downloadPDF, isPending: isDownloading } = useDownloadSalarySlipPDF();

  if (!isOpen) return null;

  const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Salary%20Slip&name=${encodeURIComponent(
    salarySlipName
  )}&format=Salary%20Slip&no_letterhead=0`;

  const handleDownload = () => {
    downloadPDF(salarySlipName);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Mobile version - full screen
  if (!isDesktop) {
    return (
      <div className="fixed inset-0 z-[70] bg-white">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={onClose}
                className="mr-3 p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="font-semibold text-gray-900">Salary Slip</h3>
                {salarySlipDate && (
                  <p className="text-sm text-gray-500">{salarySlipDate}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMasked(!isMasked)}
                className="p-2 rounded-full hover:bg-gray-100"
                title={isMasked ? 'Show PDF' : 'Hide PDF'}
              >
                {isMasked ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile PDF Content */}
        <div className="h-[calc(100vh-64px)] relative">
          <div className={`w-full h-full ${isMasked ? "filter blur-lg" : ""}`}>
            <PDFViewer
              pdfUrl={pdfUrl}
              mode="react-pdf"
              className="w-full h-full"
              title={`Salary Slip - ${salarySlipName}`}
            />
          </div>
          {isMasked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
              <div className="text-center text-gray-700">
                <EyeOff className="w-12 h-12 mx-auto mb-2" />
                <p className="text-lg font-semibold">PDF Hidden</p>
                <p className="text-sm">Tap the eye icon to reveal</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop version - modal dialog with dark background
  return (
    <div 
      className="fixed inset-0 z-[70] bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Desktop Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Salary Slip PDF</h3>
              {salarySlipDate && (
                <p className="text-sm text-gray-600">{salarySlipDate}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Visibility Toggle */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {isMasked ? 'Hidden' : 'Visible'}
              </span>
              <button
                onClick={() => setIsMasked(!isMasked)}
                className="flex items-center gap-1"
                title={isMasked ? 'Show PDF' : 'Hide PDF'}
              >
                {isMasked ? (
                  <BsToggleOff className="w-6 h-6 text-gray-400" />
                ) : (
                  <BsToggleOn className="w-6 h-6 text-blue-500" />
                )}
              </button>
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isDownloading ? 'Downloading...' : 'Download'}
              </span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Desktop PDF Content */}
        <div className="flex-1 relative overflow-hidden">
          <div className={`w-full h-full transition-all duration-300 ${isMasked ? "filter blur-xl" : ""}`}>
            <PDFViewer
              pdfUrl={pdfUrl}
              mode="react-pdf"
              className="w-full h-full"
              title={`Salary Slip - ${salarySlipName}`}
            />
          </div>
          {isMasked && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10">
              <div className="text-center text-gray-600">
                <EyeOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-semibold mb-2">PDF Content Hidden</p>
                <p className="text-sm">Toggle the visibility switch to reveal the salary slip</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalarySlipPDFModal;
