import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })

    const { data: job, error } = await supabase
      .from('analysis_jobs')
      .select('id, status, stage_label, error, property_id')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (error || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    return NextResponse.json({
      jobId:       job.id,
      status:      job.status,
      stageLabel:  job.stage_label,
      error:       job.error,
      propertyId:  job.property_id,
      done:        job.status === 'done',
      failed:      job.status === 'error',
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
