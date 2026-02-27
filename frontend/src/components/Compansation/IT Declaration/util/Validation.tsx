/* eslint-disable @typescript-eslint/no-explicit-any */
export const validateITDeclarationProofs = ({
    groupedCategories,
    hraData,
    goHeadWithNewRegimeBool,
    toast,
  }: any) => {
  
    // 🔹 CATEGORY VALIDATION
    for (const sec of groupedCategories || []) {
      for (const cat of sec.categories || []) {
        for (const item of cat.items || []) {
          const isSelected =
            item.is_selected === true ||
            item.editable === 0 ||
            Number(item?.amount ?? 0) > 0;
  
          const isProofRequired =
            item.attach_reqd === 1 ||
            item.approval_needed === "Yes";
  
          const hasProof =
            (typeof item.proof_file === "string" &&
              item.proof_file.length > 0) ||
            item.attach_proof;
  
          if (isSelected && isProofRequired && !hasProof) {
            toast.error(
              `Please upload proof for ${item.exemption_sub_category}`
            );
            return false;
          }
        }
      }
    }
  
    // 🔹 HRA VALIDATION
    if (!goHeadWithNewRegimeBool && hraData) {
      const isHRAProofRequired = hraData.attach_reqd === 1;
  
      const hasHRAProof =
        typeof hraData.proof_file === "string" &&
        hraData.proof_file.length > 0;
  
      if (isHRAProofRequired && !hasHRAProof) {
        toast.error("Please upload HRA proof");
        return false;
      }
  
      const isPanMandatory = Number(hraData.monthly_hra) > 8333;
  
      if (isPanMandatory && !hraData.pan) {
        toast.error(
          "PAN is mandatory when rent exceeds ₹8,333/month"
        );
        return false;
      }
    }
  
    return true;
  };