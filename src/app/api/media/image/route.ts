import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Обложки, фото преподавателей и превью — только для вошедших. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse(null, { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^images\/[\w.-]+$/.test(key)) return new NextResponse(null, { status: 404 });

  const url = await storage().signedGetUrl(key, { ttl: 900 });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, max-age=600" } });
}
