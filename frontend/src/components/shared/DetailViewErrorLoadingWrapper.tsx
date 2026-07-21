import { X } from 'lucide-react';
import React from 'react'

interface LoadingViewProps {
    onClose: () => void;
    label: string;
}

const LoadingView: React.FC<LoadingViewProps> = ({
    onClose,
    label
}) => {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onMouseDown={onClose}
        >
            <div
                className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading request details...</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ErrorViewProps {
    onClose: () => void;
    label: string;
    error: Error;
}

const ErrorView: React.FC<ErrorViewProps> = ({
    onClose,
    label,
    error
}) => {

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onMouseDown={onClose}
        >
            <div
                className="w-full h-full md:h-auto md:max-w-xl md:max-h-[80vh] md:rounded-lg bg-white flex flex-col overflow-hidden relative"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
                    <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center">
                        <div className="text-red-500 mb-4">
                            <svg
                                className="h-12 w-12 mx-auto"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <p className="text-gray-600">Failed to load request details</p>
                        <p className="text-gray-500 text-sm mt-2">
                            {error instanceof Error ? error.message : "Unknown error"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}


export { LoadingView, ErrorView };