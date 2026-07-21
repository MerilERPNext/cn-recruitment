import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Policies: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-6 py-4 shadow-sm flex items-center">
        <Link to="/webapp/" className="mr-4">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Policies</h1>
      </div>

      <div className="px-6 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Company Policies</h2>
          <p className="text-gray-600">Policies section coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default Policies;
