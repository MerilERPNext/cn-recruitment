export interface Genders {
  name: string;
}

export interface GenderResponse {
  data: Genders[];
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
  data: {
    current_address: Address;
    permanent_address: Address;
    emergency_address: Address;
  };
}

export interface IField {
  name: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
  docstatus: number;
  parent: string;
  parentfield: string;
  parenttype: string;
  idx: number;
  fieldname: string;
  label: string;
  oldfieldname: string | null;
  fieldtype: string;
  oldfieldtype: string | null;
  options: string | null;
  search_index: number;
  show_dashboard: number;
  hidden: number;
  set_only_once: number;
  allow_in_quick_entry: number;
  print_hide: number;
  report_hide: number;
  reqd: number;
  bold: number;
  in_global_search: number;
  collapsible: number;
  unique: number;
  no_copy: number;
  allow_on_submit: number;
  show_preview_popup: number;
  trigger: string | null;
  collapsible_depends_on: string | null;
  mandatory_depends_on: string | null;
  read_only_depends_on: string | null;
  depends_on: string | null;
  permlevel: number;
  ignore_user_permissions: number;
  width: string | null;
  print_width: string | null;
  columns: number;
  default: string | null;
  description: string | null;
  in_list_view: number;
  fetch_if_empty: number;
  in_filter: number;
  remember_last_selected_value: number;
  ignore_xss_filter: number;
  print_hide_if_no_value: number;
  allow_bulk_edit: number;
  in_standard_filter: number;
  in_preview: number;
  read_only: number;
  precision: number | null;
  max_height: string | null;
  length: number;
  translatable: number;
  hide_border: number;
  hide_days: number;
  hide_seconds: number;
  non_negative: number;
  is_virtual: number;
  sort_options: number;
  link_filters: string | null;
  fetch_from: string | null;
  show_on_timeline: number;
  make_attachment_public: number;
  documentation_url: string | null;
  placeholder: string | null;
  doctype: string;
  value: string | null;
  [key: string]: unknown;
}
