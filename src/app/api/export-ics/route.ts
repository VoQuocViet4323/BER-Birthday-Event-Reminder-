import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateNextOccurrence, generateIcsCalendar } from "@/lib/date-utils";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let eventsQuery = (supabase as any).from("events").select("*").eq("enabled", true);

    if (user) {
      eventsQuery = eventsQuery.eq("user_id", user.id);
    }

    const { data: events, error } = await eventsQuery;
    if (error) throw error;

    const today = new Date();
    const eventsWithOcc = (events || []).map((ev: any) => ({
      ...ev,
      nextOccurrence: calculateNextOccurrence(ev, today),
    }));

    const icsContent = generateIcsCalendar(eventsWithOcc);

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="sinh-nhat-su-kien.ics"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Không thể xuất file lịch" },
      { status: 500 }
    );
  }
}
