import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const [user, pass] = decoded.split(':');

      if (
        user === process.env.AUTH_USER &&
        pass === process.env.AUTH_PASS
      ) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Slideco"',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
