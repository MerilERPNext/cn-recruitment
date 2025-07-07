/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DoctypeField {
    fieldname: string
    label: string
    fieldtype: string
    options?: string
  }
  
  export interface DoctypeSchema {
    data: {
      fields: DoctypeField[]
    }
  }
  
  export interface DocumentItem {
    name: string
    title?: string
    status?: string
    modified: string
    owner?: string
    [key: string]: any
  }
  
  export interface GetDocumentsParams {
    doctype: string
    pageParam?: number
    pageSize: number
    searchTerm?: string
    filters?: Record<string, any>
    fields: string[]
    searchFields: string[]
  }
  
  export interface GetDocumentsResponse {
    pages: any
    data: DocumentItem[]
    totalCount: number
    hasNextPage: boolean
    nextCursor?: number
  }
  
  export interface GetCountParams {
    doctype: string
    searchTerm?: string
    filters?: Record<string, any>
  }
  
  export interface GetCountResponse {
    message: number
  }
  
  export class PermissionError extends Error {
    constructor(
      message: string,
      public statusCode = 403,
    ) {
      super(message)
      this.name = "PermissionError"
    }
  }
  