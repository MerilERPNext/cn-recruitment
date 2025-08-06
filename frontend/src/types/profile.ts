export interface Genders {
  name: string
}

export interface GenderResponse {
  data: Genders[]
}


export interface Address {
  name: string;
  address_title: string;
  address_line1: string;
  address_line2: string;
  city: string;
  county: string;
  state: string;
  country: string;
  pincode: string;
  email_id: string;
  phone: string;
}

export interface AddressInfoData {
  data : {
    current_address: Address;
    permanent_address: Address;
    emergency_address: Address;
  }
}