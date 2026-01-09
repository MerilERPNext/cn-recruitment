export type ActionButtonStyle = {
  bgColor: "success" | "error" | "disabled";
  variant: "soft" | "contain" | "outline";
};

export const getActionStyles = (action: string): ActionButtonStyle => {
    const parsedAction = action.toLowerCase().trim();

    switch (parsedAction) {
      case "approve":
        return { bgColor: "success", variant: "soft" };

      case "reject":
        return { bgColor: "error", variant: "soft" };

      default:
        return { bgColor: "disabled", variant: "soft" };
    }
  };