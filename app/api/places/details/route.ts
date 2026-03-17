import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get('placeId')
  const sessiontoken = searchParams.get('sessiontoken')

  if (!placeId) return NextResponse.json({ error: 'Missing placeId' }, { status: 400 })

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'address_components')
  url.searchParams.set('key', apiKey!)
  if (sessiontoken) url.searchParams.set('sessiontoken', sessiontoken)

  const res = await fetch(url.toString())
  const data = await res.json()
  return NextResponse.json(data)
}
