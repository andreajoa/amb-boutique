import { NextResponse } from "next/server";
import { cookieName } from "../../../dashboard/auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard/login", request.url), 303);
  response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/dashboard", maxAge: 0 });
  return response;
}

