import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const input = searchParams.get('input')
  const sessiontoken = searchParams.get('sessiontoken')

  if (!input) return NextResponse.json({ error: 'Missing input' }, { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('components', 'country:au')
  url.searchParams.set('types', 'address')
  url.searchParams.set('language', 'en')
  url.searchParams.set('key', apiKey!)
  if (sessiontoken) url.searchParams.set('sessiontoken', sessiontoken)

  const res = await fetch(url.toString())
  const data = await res.json()
  return NextResponse.json(data)
}
