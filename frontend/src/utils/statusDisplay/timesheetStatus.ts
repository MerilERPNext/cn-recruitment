export const timesheetDisplayStatus = (status: string | null | undefined) => {
    switch (status) {
        case "Draft":
            return "Submitted";
    }

    return status ?? "N/A";
};