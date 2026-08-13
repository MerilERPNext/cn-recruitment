const AddRequisition = ({ onClose }: { onClose?: () => void }) => {
  return (
    <div className="relative max-w-md mx-auto mt-8 bg-white p-6 rounded shadow">
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-700"
        aria-label="Close"
      >
        ×
      </button>
      <h2 className="text-xl font-bold mb-4">Add New Requisition</h2>
      <div className="text-gray-700">
        This page is not made fully yet. Will work on it.
      </div>
    </div>
  );
};

export default AddRequisition;
