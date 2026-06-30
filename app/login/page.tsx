import { Metadata } from "next";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Login - Sage Outdoor Advisory",
  description: "Authorized access only. Sign in with your Google account.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LoginPage() {
  // Default to English locale for login page
  const locale = 'en';
  
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />

      <main className="flex flex-1 flex-col justify-center px-4 py-16 pt-28 pb-16 min-h-[calc(100dvh+4rem)] sm:px-6 sm:pt-32 lg:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
              <p className="text-gray-600">Authorized access only. Sign in with your @sageoutdooradvisory.com Google account.</p>
            </div>
            
            <Suspense fallback={
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-600">Loading...</div>
              </div>
            }>
              <LoginForm locale={locale} />
            </Suspense>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
