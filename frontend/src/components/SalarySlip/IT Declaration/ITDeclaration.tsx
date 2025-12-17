/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useIncomeTaxSheetData } from '../../../hooks/useTaxSheet';
import CategoryDeclaration from './Component/test';

const ITDeclarationForm = () => {
  const { data } = useIncomeTaxSheetData();
  const categories = data || [];

  const [activeTab, setActiveTab] = useState<string>("");

  // 👇 auto-select first category
  useEffect(() => {
    if (categories.length && !activeTab) {
      setActiveTab(categories[0].category_name);
    }
  }, [categories, activeTab]);

  const activeCategory = categories.find(
    (cat: any) => cat.category_name === activeTab
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <header className="mb-6 py-4 px-8 bg-blue-50 rounded-lg">
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
            <button className="bg-blue-600 text-white px-4 py-1 rounded text-sm font-medium hover:bg-blue-700">
              Submit
            </button>
            
          </div>
        </div>
<div className='flex flex-row justify-start w-full gap-4 mt-4 '>
  <span className="text-xs flex flex-row items-center justify-center font-medium text-gray-700"><input type="checkbox" id="declarationCheckbox" className="mr-2" /><h2>Yes</h2></span>
  <span className="text-xs flex flex-row items-center justify-center font-medium text-gray-700"><input type="checkbox" id="declarationCheckbox" className="mr-2" /><h2>No</h2></span>
</div>

        {/* 🔹 Dynamic Tabs */}
        <nav className="flex flex-wrap gap-2 mt-4 border-b pb-3">
          {categories.map((cat: any) => (
            <button
              key={cat.category_name}
              onClick={() => setActiveTab(cat.category_name)}
              className={`
                px-4 py-1 text-xs rounded-2xl border
                ${
                  activeTab === cat.category_name
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {cat.category_name}
            </button>
          ))}
        </nav>
      </header>

      {/* 🔹 Active Category Content */}
      <div className="bg-white p-6 shadow rounded-lg">
        {activeCategory && (
          <CategoryDeclaration
            categoryName={activeCategory.category_name}
            items={activeCategory.items}
          />
        )}
      </div>
    </div>
  );
};

export default ITDeclarationForm;
