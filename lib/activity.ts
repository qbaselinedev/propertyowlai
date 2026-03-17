import { createClient } from '@/lib/supabase/server'

type EventType =
  | 'signup' | 'login'
  | 'property_added' | 'property_deleted'
  | 'report_run' | 'pdf_downloaded'
  | 'credits_purchased' | 'credits_granted'

export async function logActivity(
  userId: string,
  eventType: EventType,
  eventDetail: Record<string, any> = {}
) {
  try {
    const supabase = createClient()
    await supabase.from('activity_log').insert({
      user_id: userId,
      event_type: eventType,
      event_detail: eventDetail,
    })
  } catch (e) {
    // Never let logging break the main flow
    console.error('Activity log error:', e)
  }
}
