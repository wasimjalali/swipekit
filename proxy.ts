import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Optional HTTP basic auth. If AUTH_USER and AUTH_PASS are both set in the
// environment, every request must present matching credentials. If either is
// missing, the proxy is a no-op and traffic passes through unchanged — this is
// the expected mode for open-source / local development.
export function proxy(req: NextRequest) {
  const expectedUser = process.env.AUTH_USER;
  const expectedPass = process.env.AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const [user, pass] = decoded.split(':');

      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Carousel Forge"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
