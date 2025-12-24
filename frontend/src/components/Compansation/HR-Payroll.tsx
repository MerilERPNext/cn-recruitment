import React from "react";
import { IoIosArrowForward } from "react-icons/io";

interface PayrollDocument {
    name: string
}

const PayrollDocuments: React.FC = () => {
    const documents: PayrollDocument[] = [
        { name: "Form 16"},
        { name: "Test1"},
        { name: "Test2"},
    ];

    return (
        <div className="px-0 sm:px-2 w-full">
            <div className="space-y-1 w-full">
                {documents.map((doc) => (
                    <div
                    key={doc.name}
                    rel="noopener noreferrer"
                    className="flex justify-between items-center bg-white rounded-lg p-4 border border-gray-200 w-full 
                 hover:border-gray-300 transition-all duration-200 ease-in-out cursor-pointer"
                >
                    <span className="text-gray-800 font-medium">{doc.name}</span>
                    <IoIosArrowForward  className="text-gray-500 ml-auto" />
                </div>
                ))}
            </div>
        </div>
    );
};

export default PayrollDocuments;