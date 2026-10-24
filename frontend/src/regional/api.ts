import { apiRequest } from '@/shared/api/client'

export interface RegionOption {
  id: string
  code: string
  name: { en: string; am: string; om: string }
}

export interface CenterOption {
  id: string
  code: string
  name: string
}

export interface DistributorOption {
  id: string
  code: string
  name: string
}

interface List<T> {
  items: T[]
}

export function loadRegionOptions(): Promise<RegionOption[]> {
  return apiRequest<List<RegionOption>>('/geo?limit=100').then((page) => page.items)
}

export function loadCenterOptions(): Promise<CenterOption[]> {
  return apiRequest<List<{ id: string; code: string; name: string }>>('/admin/local-centers?limit=100').then((page) =>
    page.items.map((row) => ({ id: row.id, code: row.code, name: row.name })),
  )
}

export function loadDistributorOptions(): Promise<DistributorOption[]> {
  return apiRequest<List<{ id: string; code: string; name: string }>>('/admin/distributors?limit=100').then((page) =>
    page.items.map((row) => ({ id: row.id, code: row.code, name: row.name })),
  )
}
