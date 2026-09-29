import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "es_session";

/**
 * Быстрая «оптимистичная» проверка: без cookie сразу отправляем на вход.
 * Настоящая проверка сессии и роли — на сервере в каждой странице и API.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (/^\/(courses|course|profile)(\/|$)/.test(pathname)) {
      const url = new URL("/login", request.url);
      if (pathname !== "/courses") url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/courses/:path*", "/course/:path*", "/profile/:path*", "/admin/:path*"],
};
