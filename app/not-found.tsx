import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <main className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The landing page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="https://sageoutdooradvisory.com"
          className="inline-block px-6 py-3 bg-[#007a6e] text-white rounded-lg hover:bg-[#006b5f] transition-colors"
        >
          Return to Main Site
        </Link>
      </main>
    </div>
  );
}

