export interface Brand {
  id: number
  name: string
  logo_url: string | null
  sort_order?: number | null
}

export interface Model {
  id: number
  brand_id: number
  name: string
  image_url: string | null
  sort_order?: number | null
}

export interface ModelGeneration {
  id: number
  model_id: number
  title: string
  subtitle?: string | null
  image_url: string | null
  sort_order?: number | null
  created_at: string
}

export interface AdPhoto {
  id: number
  ad_id: number
  url: string
  order_index: number | null
}

export interface Ad {
  id: number
  user_id: string
  brand_id: number
  model_id: number
  price: number
  year: number
  mileage: number
  generation_id?: number | null
  region_id: number | null
  city: string | null
  description: string | null
  created_at: string
  status: string
  brand?: Brand
  model?: Model
  photos?: AdPhoto[]
  profile?: {
    phone: string | null
  }
}

export interface Region {
  id: number
  name: string
  sort_order?: number | null
}

export interface Profile {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  region_id: number | null
  phone: string | null
}


