import  { useState } from 'react';
import InvestmentDeclaration from './Component/InvestmentDeclaration';
import HouseProperty from './Component/HouseProperty';
import OtherDeclaration from './Component/OtherDeclaration';

const tabs = [
  { id: 'houseProperty', label: 'House Property (U/S 24)', component: HouseProperty },
  { id: 'investment', label: 'Investment Declaration (U/S 80C & Others)', component: InvestmentDeclaration },
  { id: 'others', label: 'Others', component: OtherDeclaration },
];

const ITDeclarationForm = () => {
  const [activeTab, setActiveTab] = useState('houseProperty');

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || null;

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="flex flex-col text-sm justify-start items-center mb-6 p-4 bg-blue-50 rounded-lg">
        
        <div className='flex items-center justify-between w-full'>
          <div className="space-y-2">
            <h1 className="text-xs font-semibold text-gray-800">
              IT Declaration for the Financial Year 2025 - 2026
              <span className="text-sm font-normal text-orange-500 ml-2 bg-orange-100 px-2 py-0.5 rounded">
                UPDATED
              </span>
            </h1>

            <p className='text-xs font-serif'>
              Go Ahead with New Tax Regime : NEW
            </p>
          </div>

          <div className="flex space-x-2">
            <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-blue-700">
              COMPARE TAX
            </button>
            <span className="border border-gray-300 px-4 py-1 rounded text-sm bg-gray-100">
              Form 12BB
            </span>
          </div>
        </div>

        <nav className="flex w-full gap-2 py-4 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-4 py-1 text-sm font-medium border-1 rounded-2xl border-gray-400
                ${activeTab === tab.id ? 'border-b-2 bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="bg-white p-6 shadow-md rounded-lg">
        {ActiveComponent && <ActiveComponent investments={[]} />} 
        {/* 👆 SAFE PASSING (optional data) */}
        
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">
            VIEW VERSIONS OF IT DECLARATION (0)
          </h3>
          <h3 className="text-sm font-medium text-gray-600">
            VIEW VERSIONS OF I/O (0)
          </h3>
        </div>
      </div>
    </div>
  );
};

export default ITDeclarationForm;
