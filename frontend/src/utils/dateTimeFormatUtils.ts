export const formatMySQLDatetime = (
  isoString: string | undefined
): string | undefined => {
  if (!isoString) return undefined;
  const datetimePart = isoString.replace('T', ' ').split(/[Z+]/)[0]; 

  if (!datetimePart || datetimePart === isoString) {
    return isoString; 
  }
  
  return datetimePart;
};