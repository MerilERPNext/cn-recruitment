
// gives current year-period, if no current period for current year found then gives first year-period from array
export const getCurrentPeriod = (optionYears : {label: string, value: string}[]) =>{
    if (optionYears.length > 0) {
      const currentYear = new Date().getFullYear();
      const currentYearOption = optionYears.find((option) => {
        const [startYear] = option.value.split("-").map(Number);
        return startYear  === currentYear % 100;
      });    
    
    return currentYearOption?.value || optionYears[0].value;
    }else 
      return "";
    }