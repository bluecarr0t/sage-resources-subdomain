import { Metadata } from "next";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";

export const metadata: Metadata = {
  title: "Terms of Service - Sage Outdoor Advisory",
  description: "Terms of Service for Sage Outdoor Advisory",
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsOfServicePage() {
  const locale = 'en';
  
  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />
      
      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Agreement to Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using the services provided by Sage Outdoor Advisory ("we," "our," or "us"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, then you may not access the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Use License</h2>
              <p className="text-gray-700 mb-4">
                Permission is granted to temporarily access the materials on Sage Outdoor Advisory's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose or for any public display</li>
                <li>Attempt to reverse engineer any software contained on the website</li>
                <li>Remove any copyright or other proprietary notations from the materials</li>
                <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Accounts</h2>
              <p className="text-gray-700 mb-4">
                <strong>Authorization Required:</strong> Access to this service is restricted to authorized users only. Users must be added to our authorization system by an administrator to gain access. Unauthorized access attempts are prohibited and may result in immediate termination of access and legal action.
              </p>
              <p className="text-gray-700 mb-4">
                When you create an account with us through Google OAuth authentication, you must provide information that is accurate, complete, and current at all times. You are responsible for maintaining the security of your Google account credentials used to access our service, and for all activities that occur under your account.
              </p>
              <p className="text-gray-700 mb-4">
                You agree not to share your account credentials with any third party and to take sole responsibility for any activities or actions under your account, whether or not you have authorized such activities or actions. You may only create one account per person, and accounts are non-transferable.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Account Deletion:</strong> If you wish to delete your account, please contact us at <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a>. We will process your deletion request within 30 days, subject to our legal obligations to retain certain information as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Prohibited Uses</h2>
              <p className="text-gray-700 mb-4">You may not use our service:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>In any way that violates any applicable national or international law or regulation</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
                <li>To impersonate or attempt to impersonate the company, a company employee, another user, or any other person or entity</li>
                <li>In any way that infringes upon the rights of others, including intellectual property rights, or in any way is illegal, threatening, fraudulent, or harmful</li>
                <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of the website</li>
                <li>To scrape, crawl, or use automated systems (including bots, spiders, or scrapers) to access, collect, or harvest data from our website without our express written permission</li>
                <li>To reverse engineer, decompile, or disassemble any software or technology used on our website</li>
                <li>To attempt to gain unauthorized access to our systems, networks, or accounts</li>
                <li>To interfere with or disrupt the integrity or performance of our service or the data contained therein</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Content</h2>
              <p className="text-gray-700 mb-4">
                Our service allows you to access content, including but not limited to property information, guides, and other materials. All content provided on or through the service is owned by Sage Outdoor Advisory or its licensors.
              </p>
              <p className="text-gray-700 mb-4">
                You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our website without our prior written consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Disclaimer</h2>
              <p className="text-gray-700 mb-4">
                The information on this website is provided on an "as is" basis. To the fullest extent permitted by law, Sage Outdoor Advisory excludes all representations, warranties, conditions, and terms related to our website and the use of this website.
              </p>
              <p className="text-gray-700 mb-4">
                We do not warrant that the website will be available at all times or that the information on this website is complete, true, accurate, or non-misleading.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                To the fullest extent permitted by applicable law, in no event shall Sage Outdoor Advisory, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the service.
              </p>
              <p className="text-gray-700 mb-4">
                Our total liability to you for all claims arising out of or relating to the use of or inability to use any portion of the service shall not exceed the amount you paid us in the 12 months prior to the event giving rise to liability, or $100, whichever is greater.
              </p>
              <p className="text-gray-700 mb-4">
                Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages, so the above limitation or exclusion may not apply to you. In such jurisdictions, our liability will be limited to the fullest extent permitted by applicable law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to defend, indemnify, and hold harmless Sage Outdoor Advisory and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees) arising out of or relating to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Your use of or access to the service</li>
                <li>Your violation of these Terms</li>
                <li>Your violation of any third-party right, including without limitation any intellectual property right, privacy right, or other proprietary right</li>
                <li>Any claim that your use of the service caused damage to a third party</li>
              </ul>
              <p className="text-gray-700 mb-4">
                This indemnification obligation will survive these Terms and your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Termination</h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>A breach of these Terms</li>
                <li>Unauthorized access or use of the service</li>
                <li>Violation of any applicable law or regulation</li>
                <li>At the request of law enforcement or government agencies</li>
                <li>Extended periods of inactivity</li>
                <li>Discontinuation or material modification of the service</li>
              </ul>
              <p className="text-gray-700 mb-4">
                Upon termination, your right to use the service will immediately cease. All provisions of these Terms which by their nature should survive termination (including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability) shall survive termination.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Account Deletion:</strong> If you wish to terminate your account, please contact us at <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a> to request account deletion. We will process your deletion request within 30 days, subject to our legal obligations to retain certain information as described in our Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Service Availability and Modifications</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify, suspend, or discontinue any part of the service at any time, with or without notice, for any reason. We do not guarantee that the service will be available at all times or that access will be uninterrupted, secure, or error-free.
              </p>
              <p className="text-gray-700 mb-4">
                We may modify the service, add new features, or remove features at any time. We will provide notice of material changes to the service, but we are not obligated to provide advance notice of all changes. Your continued use of the service after any changes constitutes your acceptance of the modified service.
              </p>
              <p className="text-gray-700 mb-4">
                We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the service or any part thereof.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law and Jurisdiction</h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of the State of California, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the federal or state courts located in California, and you hereby consent to the personal jurisdiction and venue of such courts.
              </p>
              <p className="text-gray-700 mb-4">
                Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights. If any provision of these Terms is held to be invalid or unenforceable by a court, the remaining provisions will remain in effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
              <p className="text-gray-700 mb-4">
                By continuing to access or use our service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>Sage Outdoor Advisory</strong></p>
                <p className="text-gray-700 mb-2">
                  Email: <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a>
                </p>
                <p className="text-gray-700">
                  Website: <a href="https://sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">https://sageoutdooradvisory.com</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
