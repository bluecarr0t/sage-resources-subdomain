import { Metadata } from "next";
import AdminAuthGuard from "@/components/AdminAuthGuard";
import AdminColumnsView from "@/components/AdminColumnsView";

export const metadata: Metadata = {
  title: "Admin - Sage Outdoor Advisory",
  description: "Admin dashboard for managing glamping properties",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50">
        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-gray-600">
                View all columns from the <code className="bg-gray-100 px-2 py-1 rounded">all_glamping_properties</code> table
              </p>
            </div>
            
            <AdminColumnsView />
          </div>
        </main>
      </div>
    </AdminAuthGuard>
  );
}
