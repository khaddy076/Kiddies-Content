import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-xl font-semibold text-gray-700 mt-4">Page not found</p>
        <p className="text-gray-500 mt-2">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
          Go home
        </Link>
      </div>
    </div>
  );
}
