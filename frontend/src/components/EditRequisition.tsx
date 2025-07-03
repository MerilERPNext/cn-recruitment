import React from "react";

const EditRequisition = ({ requisition, onClose }: any) => (
  <div className="w-full max-w-lg mx-auto p-6">
    <h2 className="text-xl font-bold mb-4">Edit Requisition</h2>
    <div className="text-gray-700 mb-6">
      This page is not made fully yet. Will work on it.
    </div>
    <div className="flex gap-2 mt-6">
      <button
        type="button"
        className="bg-gray-200 px-4 py-2 rounded"
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  </div>
);

export default EditRequisition;