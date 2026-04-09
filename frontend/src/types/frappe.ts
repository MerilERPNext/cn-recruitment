// Core Frappe Types
export interface DoctypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  reqd?: number;
  read_only?: number;
  hidden?: number;
  default?: string | number;
  depends_on?: string;
  mandatory_depends_on?: string;
  description?: string;
}

export interface DoctypeSchema {
  data: {
    fields: DoctypeField[];
    name: string;
    module: string;
    custom: number;
    is_submittable: number;
    permissions: Array<{
      role: string;
      read: number;
      write: number;
      create: number;
      delete: number;
    }>;
  };
}

export interface DocumentItem {
  name: string;
  title?: string;
  status?: string;
  modified: string;
  owner?: string;
  creation?: string;
  docstatus?: number;
  idx?: number;
  [key: string]: unknown;
}

// API Request/Response Types
export interface GetDocumentsParams {
  doctype: string;
  pageParam?: number;
  pageSize: number;
  searchTerm?: string;
  filters?: Record<string, unknown>; // ✅ Fixed here
  fields: string[];
  searchFields: string[];
  orderBy?: string;
}

export interface FrappePageResponse {
  data: DocumentItem[];
  totalCount: number;
  hasNextPage: boolean;
  nextCursor?: number;
  pages: number[];
  page: number;  
}

export interface FrappeDocumentsResponse {
  data: DocumentItem[];
  totalCount: number;
}

export interface GetCountParams {
  doctype: string;
  searchTerm?: string;
  filters?: FilterCondition[];
}

// API Filter Types
export type FilterOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "like"
  | "not like"
  | "in"
  | "not in"
  | "is"
  | "is not"
  | "between";

export type FilterCondition = [string, FilterOperator, unknown];

export interface FrappeAPIOptions {
  fields?: string[];
  filters?: FilterCondition[];
  orFilters?: FilterCondition[];
  limit?: number;
  limitStart?: number;
  orderBy?: string;
  groupBy?: string;
}

export interface FrappeAPIResponse<T = DocumentItem[]> {
  data: T;
  totalCount?: number;
  message?: string;
}

// Error Types
export class PermissionError extends Error {
  constructor(message: string, public statusCode = 403) {
    super(message);
    this.name = "PermissionError";
  }
}

export class FrappeAPIError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public response?: unknown
  ) {
    super(message);
    this.name = "FrappeAPIError";
  }
}

// Utility Types
export type QueryKey = (
  | string
  | number
  | boolean
  | Record<string, unknown>
  | undefined
)[];

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Mutation Types for CRUD operations
export interface CreateDocumentParams {
  doctype: string;
  data: Record<string, unknown>;
}

export interface UpdateDocumentParams {
  doctype: string;
  name: string;
  data: Record<string, unknown>;
}

export interface DeleteDocumentParams {
  doctype: string;
  name: string;
}

export type CreateDocumentResult = DocumentItem;
export type UpdateDocumentResult = DocumentItem;
export type DeleteDocumentResult = void;
