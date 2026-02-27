// contracts for backend API

  export interface Order {
    id: number
    latitude: number
    longitude: number
    subtotal: number
    timestamp: string
    composite_tax_rate: number
    tax_amount: number
    total_amount: number
    breakdown: TaxBreakdown
    jurisdictions?: Jurisdictions | null
  }

  export interface TaxBreakdown {
    state_rate: number
    county_rate: number
    city_rate: number
    special_rates: number[]
  }

  export interface Jurisdictions {
    state?: string | null
    county?: string | null
    city?: string | null
    special?: string[]
  }

  // request body for POST /orders
  export interface OrderCreate {
    latitude: number
    longitude: number
    subtotal: number
    timestamp: string
  }

  // response for GET /orders 
  export interface OrdersListResponse {
    items: Order[]
    total: number
    limit: number
    offset: number
  }

  export interface OrdersListParams {
    limit?: number
    offset?: number
    date_from?: string
    date_to?: string
    min_subtotal?: number
    max_subtotal?: number
  }


  export interface ImportSuccessResponse {
    import_id: number
    total: number
    inserted: number
    failed: number
  }

  export interface ImportDuplicateResponse {
    error: string
  }

  export type ImportResponse = ImportSuccessResponse | ImportDuplicateResponse

  export function isImportSuccess(
    data: ImportResponse
  ): data is ImportSuccessResponse {
    return 'import_id' in data
  }
