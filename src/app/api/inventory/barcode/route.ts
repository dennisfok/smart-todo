import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface BarcodeProductResult {
  found: boolean
  barcode: string
  name?: string
  brand?: string
  quantity_str?: string   // e.g. "500g", "1L"
  category_hint?: string  // raw category tag for matching
  image_url?: string
}

// Open Food Facts world + HK databases
const OFF_URLS = (code: string) => [
  `https://world.openfoodfacts.org/api/v2/product/${code}.json`,
  `https://hk.openfoodfacts.org/api/v2/product/${code}.json`,
]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const code = req.nextUrl.searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ error: 'Missing barcode' }, { status: 400 })

  for (const url of OFF_URLS(code)) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'HomeHelper/1.0 (household management app)' },
        next: { revalidate: 86400 },  // cache product info for 24h
      })

      if (!res.ok) continue
      const json = await res.json()
      if (json.status !== 1 || !json.product) continue

      const p = json.product

      // Pick best name (prefer traditional Chinese → English)
      const name =
        p.product_name_zh ||
        p.product_name_hk ||
        p.product_name_en ||
        p.product_name ||
        undefined

      const brand = p.brands?.split(',')[0].trim() || undefined

      // e.g. "500 g" or "1 L"
      const quantity_str = p.quantity || undefined

      // First category tag, e.g. "en:beverages"
      const category_hint = (p.categories_tags as string[] | undefined)?.[0] || undefined

      const image_url = p.image_front_small_url || p.image_url || undefined

      return NextResponse.json({
        found: true,
        barcode: code,
        name,
        brand,
        quantity_str,
        category_hint,
        image_url,
      } satisfies BarcodeProductResult)
    } catch {
      continue
    }
  }

  return NextResponse.json({ found: false, barcode: code } satisfies BarcodeProductResult)
}
