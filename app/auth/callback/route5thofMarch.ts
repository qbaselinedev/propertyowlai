import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PROFESSIONAL_TYPES = ['conveyancer', 'lawyer']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // After confirming email, check if this is a pending professional user
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type, conveyancer_verified, conveyancer_pending_approval')
          .eq('id', user.id)
          .single();

        // Professional user not yet approved — hold them on a pending page
        if (
          profile &&
          PROFESSIONAL_TYPES.includes(profile.user_type ?? '') &&
          !profile.conveyancer_verified
        ) {
          return NextResponse.redirect(`${origin}/auth/pending-approval`);
        }
      }

      // All other users — go to dashboard as normal
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
