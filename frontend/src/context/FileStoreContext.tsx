/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const DeclarationContext = createContext<any>(null);

export const DeclarationProvider = ({ children }: any) => {
  const [groupedCategories, setGroupedCategories] = useState<any[]>([]);

  return (
    <DeclarationContext.Provider
      value={{ groupedCategories, setGroupedCategories }}
    >
      {children}
    </DeclarationContext.Provider>
  );
};

export const useDeclaration = () => useContext(DeclarationContext);
