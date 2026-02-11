/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import CategoryDeclarationSelectable from "./Category";
interface CategorySectionProps {
  sectionCategories: any[];
  activeSection: string;
  lockingDate: string;
  responseDoctype?: string;
  medicalClaim?: boolean;
  setGroupedCategories: React.Dispatch<React.SetStateAction<any[]>>;
}

const CategorySection = ({
  sectionCategories,
  activeSection,
  lockingDate,
  responseDoctype,
  setGroupedCategories,
}: CategorySectionProps) => {
    const medicalClaim = sectionCategories.some(
        (cat) => Boolean(cat.custom_select_type)
      );

      const [global80DLock, setGlobal80DLock] = useState<string | null>(null);

  return (
    <>
      {sectionCategories.map((cat: any) => (
        <div key={cat.category_name} className="mt-6">
<CategoryDeclarationSelectable
  categoryName={cat.category_name}
  max_amount={cat.max_amount}
  lockingDate={lockingDate}
  selectable={medicalClaim ? cat.custom_select_type : false}
  custom_80d_variable={cat.custom_80d_variable}

  locked80DVariable={global80DLock}
  setLocked80DVariable={setGlobal80DLock}

  showProofFields={
    responseDoctype === "Employee Tax Exemption Proof Submission"
  }
  items={cat.items}
  onChange={(updatedItems) => {
    setGroupedCategories((prev) =>
      prev.map((sec) =>
        sec.section === activeSection
          ? {
              ...sec,
              categories: sec.categories.map((c: any) =>
                c.category_name === cat.category_name
                  ? { ...c, items: updatedItems }
                  : c
              ),
            }
          : sec
      )
    );
  }}
/>

        </div>
      ))}
    </>
  );
};

export default CategorySection;
