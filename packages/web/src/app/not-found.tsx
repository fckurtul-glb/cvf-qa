import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="rounded-2xl bg-white p-12 shadow-sm">
        <h1 className="mb-2 text-8xl font-bold text-blue-600">404</h1>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900">Sayfa Bulunamadı</h2>
        <p className="mb-8 max-w-md text-gray-500">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
          >
            Ana Sayfaya Dön
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Dashboard'a Git
          </Link>
        </div>
      </div>
    </div>
  );
}
