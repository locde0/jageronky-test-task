import { BASE_URL } from './config'
import type {
  Order,
  OrderCreate,
  OrdersListParams,
  OrdersListResponse,
  ImportResponse,
} from './types'

const ORDERS_PREFIX = `${BASE_URL}/orders`

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path)
  if (!params) return url.toString()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return
  let message = response.statusText
  try {
    const body = await response.json()
    if (body.detail) {
      message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    }
  } catch {

  }
  throw new Error(message)
}

export async function importOrders(file: File): Promise<ImportResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${ORDERS_PREFIX}/import`, {
    method: 'POST',
    body: formData,
  })

  await throwIfNotOk(response)
  return response.json() as Promise<ImportResponse>
}

export async function createOrder(body: OrderCreate): Promise<Order> {
  const response = await fetch(ORDERS_PREFIX, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  await throwIfNotOk(response)
  return response.json() as Promise<Order>
}

export async function getOrders(params?: OrdersListParams): Promise<OrdersListResponse> {
  const query: Record<string, string | number | undefined> = {
    limit: params?.limit ?? 20,
    offset: params?.offset ?? 0,
    date_from: params?.date_from,
    date_to: params?.date_to,
    min_subtotal: params?.min_subtotal,
    max_subtotal: params?.max_subtotal,
  }

  const url = buildUrl(ORDERS_PREFIX, query)
  const response = await fetch(url)

  await throwIfNotOk(response)
  return response.json() as Promise<OrdersListResponse>
}
