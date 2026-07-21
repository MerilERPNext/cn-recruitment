

export type ITItem = {
  exemption_sub_category: string
  component_type?: string
  description?: string | null
  editable: number
  amount?: number
  max_amount?: number
}

export type ITCategory = {
  exemption_category: string // 80C
  category_name: string      // EXEMPT U/S 80C...
  items: ITItem[]
}
