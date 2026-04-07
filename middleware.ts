import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Define public routes that don't require authentication
    const publicRoutes = ['/', '/auth/login', '/auth/register', '/about', '/contact'];

    // Check if the current path is a public route
    const isPublicRoute =
        publicRoutes.some(route => pathname === route || pathname.startsWith('/auth/')) ||
        pathname.startsWith('/tv-display'); // TV display: no login required

    // Get the user cookie
    const userCookie = request.cookies.get('medcore_user');
    let user = null;

    if (userCookie) {
        try {
            user = JSON.parse(userCookie.value);
        } catch (e) {
            // Invalid cookie
        }
    }

    // 1. Redirect unauthenticated users trying to access protected routes
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    // 2. Redirect authenticated users away from auth pages (login/register) to their dashboard
    if (user && (pathname === '/' || pathname.startsWith('/auth/'))) {
        const url = request.nextUrl.clone();

        // Determine dashboard based on role
        let dashboard = '/';
        if (['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user.role)) {
            dashboard = '/admin';
        } else if (user.role === 'Doctor') {
            dashboard = '/doctor';
        } else if (user.role === 'Receptionist') {
            dashboard = '/receptionist';
        } else if (user.role === 'Patient') {
            dashboard = '/patient';
        }

        url.pathname = dashboard;
        return NextResponse.redirect(url);
    }

    // 3. Role-Based Access Control (RBAC)
    if (user) {
        // Admin routes
        if (pathname.startsWith('/admin')) {
            if (!['SuperAdmin', 'GroupAdmin', 'HospitalAdmin'].includes(user.role)) {
                return NextResponse.redirect(new URL('/unauthorized', request.url)); // Or redirect to their dashboard
            }
        }

        // Doctor routes
        if (pathname.startsWith('/doctor')) {
            if (user.role !== 'Doctor') {
                // Allow Admins to view doctor pages? Usually no, they have their own view. 
                // But for now let's be strict.
                return NextResponse.redirect(new URL('/unauthorized', request.url));
            }
        }

        // Patient routes
        if (pathname.startsWith('/patient')) {
            if (user.role !== 'Patient') {
                return NextResponse.redirect(new URL('/unauthorized', request.url));
            }
        }

        // Receptionist routes
        if (pathname.startsWith('/receptionist')) {
            if (user.role !== 'Receptionist') {
                return NextResponse.redirect(new URL('/unauthorized', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder files (images, etc)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    ],
};
