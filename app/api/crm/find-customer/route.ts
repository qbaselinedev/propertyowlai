import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/crm/find-customer?email=...
 *
 * Finds a CRM customer by email for the current conveyancer.
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const email = request.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const { data: customer } = await supabase
    .from('crm_customers')
    .select('id')
    .eq('conveyancer_id', user.id)
    .eq('email', email.toLowerCase())
    .single()

  if (!customer) {
    return NextResponse.json({ customerId: null })
  }

  return NextResponse.json({ customerId: customer.id })
}
