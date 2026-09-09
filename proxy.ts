import { NextRequest, NextResponse } from 'next/server';

// This blueprint has no tenant authentication yet. Publish only the launch page.
// Remove this gate only after authorization and integration tests are complete.
export function proxy(request: NextRequest) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return NextResponse.json({ error: 'LeadNuvia is not yet open for service.' }, { status: 503 });
  }
  const path = request.nextUrl.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/embed') ||
      (path.startsWith('/api') && path !== '/api/health') || path === '/widget.js') {
    return NextResponse.json({ error: 'LeadNuvia is coming soon.' }, { status: 503 });
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
