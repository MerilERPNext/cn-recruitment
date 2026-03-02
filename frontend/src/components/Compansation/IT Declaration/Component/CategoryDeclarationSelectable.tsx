/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
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
  const [global80DLock, setGlobal80DLock] = useState<Map<string, any>>();
  useEffect(() => {
    const initialLockMap = new Map<string, any>();
  
    if(global80DLock &&  global80DLock.size > 0) return;
    
    sectionCategories.forEach((cat) => {
      if (!cat.custom_80d_variable) return;
  
      const key = cat.custom_80d_variable;
  
      if (!initialLockMap.has(key)) {
        initialLockMap.set(key, {
          indexes: [cat.id],   
          parent: null,     
        });
      } else {
        const existing = initialLockMap.get(key);
        existing.indexes.push(cat.id);  
        initialLockMap.set(key, existing);
      }
    });
    setGlobal80DLock(initialLockMap)
  }, [sectionCategories]);

  useEffect(() =>{
    console.log("global80DLock = ", global80DLock)
  },[global80DLock])

  return (
    <>
      {sectionCategories.map((cat: any) => (
        <div key={cat.category_name} className="mt-6">
          <CategoryDeclarationSelectable
            itemId={cat.id}
            categoryName={cat.category_name}
            max_amount={cat.max_amount}
            lockingDate={lockingDate}
            selectable={cat.custom_select_type}
            locked80DVariable={global80DLock}
            categoryVaribale={cat.custom_80d_variable}
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
