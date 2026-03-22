import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles').select('credits').eq('id', user.id).single()

    if (!profile || profile.credits < 2) {
      return NextResponse.json({
        error: `You need at least 2 credits. You have ${profile?.credits || 0}.`
      }, { status: 402 })
    }

    const formData   = await request.formData()
    const filePath   = formData.get('filePath') as string
    const propertyId = formData.get('propertyId') as string

    if (!filePath || !propertyId)
      return NextResponse.json({ error: 'Missing filePath or propertyId' }, { status: 400 })

    // Create the job record — returns immediately
    const { data: job, error: jobErr } = await supabase
      .from('analysis_jobs')
      .insert({
        user_id:     user.id,
        property_id: propertyId,
        file_path:   filePath,
        status:      'queued',
        stage_label: 'Job queued — starting now',
      })
      .select('id')
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Could not create job' }, { status: 500 })
    }

    // Fire off the worker — don't await it
    // Use waitUntil if available, otherwise just let it run
    const workerUrl = `${request.nextUrl.origin}/api/analyze/worker`
    fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => console.error('[PropertyOwl] Worker fire failed:', err))

    // Return jobId to browser immediately — under 1 second
    return NextResponse.json({ jobId: job.id })

  } catch (err: any) {
    console.error('[PropertyOwl/start] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to start' }, { status: 500 })
  }
}
