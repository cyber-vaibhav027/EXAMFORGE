import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await supabase.from("submissions").select("*").eq("exam_code", code.toUpperCase()).order("score", { ascending: false });
  return NextResponse.json({ submissions: data || [] });
}