import { ArrowLeft, XCircle } from 'lucide-react';
import React from 'react'
import { useNavigate } from 'react-router-dom';

type err = {
    error?:string
}
const AttendanceError:React.FC<err> = ({error}) => {
    const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        <XCircle className="w-12 h-12 text-black mx-auto" />
        <h2 className="text-xl font-semibold text-black">
          Error Loading Attendances
        </h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => {
            navigate(-1);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
}

export default AttendanceError
