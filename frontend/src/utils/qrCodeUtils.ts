import { EmployeeIdCard } from '../types/employee';

// Generate QR code data URL using a QR code API
export const generateQRCodeDataURL = (data: string, size: number = 200): string => {
  // Using QR Server API as a fallback (you can replace with your preferred QR code service)
  const encodedData = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}`;
};

// Generate employee QR code data
export const generateEmployeeQRData = (employee: EmployeeIdCard): string => {
  const qrData = {
    type: 'employee_id',
    id: employee.id,
    name: employee.employee_name,
    department: employee.department,
    designation: employee.designation,
    company: employee.company,
    employee_number: employee.employee_number,
    contact: employee.contact,
    email: employee.email,
    generated_at: new Date().toISOString()
  };
  
  return JSON.stringify(qrData);
};

// Generate QR code URL for employee
export const generateEmployeeQRCodeURL = (employee: EmployeeIdCard, size: number = 200): string => {
  const qrData = generateEmployeeQRData(employee);
  return generateQRCodeDataURL(qrData, size);
};

// Alternative: Generate a simple contact card QR code (vCard format)
export const generateVCardQRData = (employee: EmployeeIdCard): string => {
  const vCardData = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${employee.employee_name}`,
    `ORG:${employee.company || ''}`,
    `TITLE:${employee.designation || ''}`,
    `TEL:${employee.contact || ''}`,
    `EMAIL:${employee.email || ''}`,
    `NOTE:Employee ID: ${employee.employee_number || employee.id}`,
    'END:VCARD'
  ].join('\n');
  
  return vCardData;
};

// Generate vCard QR code URL for employee
export const generateVCardQRCodeURL = (employee: EmployeeIdCard, size: number = 200): string => {
  const vCardData = generateVCardQRData(employee);
  return generateQRCodeDataURL(vCardData, size);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

// Generate default avatar URL if no image is provided
export const getDefaultAvatarURL = (name: string): string => {
  // Generate a simple avatar based on initials
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  // Using a service like UI Avatars (you can replace with your preferred service)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=200&background=0d9488&color=fff&bold=true`;
}; 