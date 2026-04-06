import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/crm/resolve-invite?token=xxx
 *
 * Public endpoint — resolves an invite token to get contact details
 * for pre-filling the signup form.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim()

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try crm_customers first
  const { data: customer } = await db
    .from('crm_customers')
    .select(`
      id, full_name, email, invite_expires_at, joined_at, propertyowl_user_id,
      conveyancer:conveyancer_id ( full_name ),
      crm_customer_properties ( property:property_id ( address, suburb ) )
    `)
    .eq('invite_token', token)
    .single()

  if (customer) {
    // Check expiry
    if (customer.invite_expires_at && new Date(customer.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired. Please ask your conveyancer to resend.' }, { status: 410 })
    }
    if (customer.propertyowl_user_id) {
      return NextResponse.json({ error: 'This invite has already been used. Please sign in instead.', alreadyUsed: true }, { status: 409 })
    }

    const prop = (customer.crm_customer_properties as any[])?.[0]?.property
    return NextResponse.json({
      name:            customer.full_name,
      email:           customer.email,
      role:            'buyer',
      conveyancerName: (customer.conveyancer as any)?.full_name ?? 'Your conveyancer',
      propertyAddress: prop ? `${prop.address}, ${prop.suburb}` : undefined,
      expired:         false,
      alreadyUsed:     false,
    })
  }

  // Try crm_partners
  const { data: partner } = await db
    .from('crm_partners')
    .select(`
      id, full_name, email, partner_type, invite_expires_at, joined_at, propertyowl_user_id,
      conveyancer:conveyancer_id ( full_name ),
      crm_property_partners ( property:property_id ( address, suburb ) )
    `)
    .eq('invite_token', token)
    .single()

  if (partner) {
    if (partner.invite_expires_at && new Date(partner.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired. Please ask your conveyancer to resend.' }, { status: 410 })
    }
    if (partner.propertyowl_user_id) {
      return NextResponse.json({ error: 'This invite has already been used. Please sign in instead.', alreadyUsed: true }, { status: 409 })
    }

    const prop = (partner.crm_property_partners as any[])?.[0]?.property
    return NextResponse.json({
      name:            partner.full_name,
      email:           partner.email,
      role:            partner.partner_type ?? 'buyer',
      conveyancerName: (partner.conveyancer as any)?.full_name ?? 'Your conveyancer',
      propertyAddress: prop ? `${prop.address}, ${prop.suburb}` : undefined,
      expired:         false,
      alreadyUsed:     false,
    })
  }

  return NextResponse.json({ error: 'Invite link not found. It may have expired or already been used.' }, { status: 404 })
}
