import { NextResponse } from "next/server";

type RouteHandler = (
  req: Request,
  ctx?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with consistent error handling.
 * Catches unhandled exceptions and returns a uniform 500 JSON response.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`[API ${req.method} ${new URL(req.url).pathname}]`, err);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function badRequest(message = "Invalid request") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
