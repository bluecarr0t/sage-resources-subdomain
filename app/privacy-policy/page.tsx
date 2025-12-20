import { Metadata } from "next";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";

export const metadata: Metadata = {
  title: "Privacy Policy - Sage Outdoor Advisory",
  description: "Privacy Policy for Sage Outdoor Advisory",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  const locale = 'en';
  
  return (
    <div className="min-h-screen bg-white">
      <FloatingHeader locale={locale} showFullNav={true} showSpacer={false} />
      
      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
              <p className="text-gray-700 mb-4">
                Sage Outdoor Advisory (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Information We Collect</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">Personal Information</h3>
              <p className="text-gray-700 mb-4">
                We collect personal information that you provide to us when you:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li><strong>Sign in via Google OAuth:</strong> When you authenticate using Google, we receive your email address, name, and profile picture from Google&apos;s authentication service</li>
                <li><strong>Create an account:</strong> We store your account information in our database, including your user ID, email address, and account status</li>
                <li><strong>Contact us:</strong> If you contact us through our website, we collect the information you provide, such as your name and email address</li>
                <li><strong>Use our services:</strong> We collect information about how you interact with our website and services</li>
              </ul>
              <p className="text-gray-700 mb-4">
                The specific information we collect includes:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Email address (required for account creation)</li>
                <li>Name and display name (from Google OAuth or manual entry)</li>
                <li>Profile picture (from Google OAuth, if provided)</li>
                <li>Account status and authorization information</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">Automatically Collected Information</h3>
              <p className="text-gray-700 mb-4">
                When you visit our website, we may automatically collect certain information about your device, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Operating system</li>
                <li>Pages you visit and time spent on pages</li>
                <li>Referring website addresses</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process and respond to your inquiries</li>
                <li>Send you administrative information and updates</li>
                <li>Monitor and analyze usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                We use the following third-party services that collect, monitor, and analyze information:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li><strong>Supabase:</strong> We use Supabase for data storage, database services, and user authentication. Your account information, including email address and account status, is stored securely in Supabase databases. Supabase&apos;s privacy policy applies to their handling of this data. <a href="https://supabase.com/privacy" className="text-[#006b5f] hover:underline" target="_blank" rel="noopener noreferrer">View Supabase Privacy Policy</a></li>
                <li><strong>Google OAuth:</strong> We use Google OAuth for user authentication. When you sign in with Google, Google provides us with your email address, name, and profile picture. Google&apos;s privacy policy applies to data collected by Google during the authentication process. <a href="https://policies.google.com/privacy" className="text-[#006b5f] hover:underline" target="_blank" rel="noopener noreferrer">View Google Privacy Policy</a></li>
                <li><strong>Google Analytics:</strong> We use Google Analytics to analyze website traffic and usage patterns. Google Analytics collects information such as IP addresses, browser type, pages visited, and time spent on pages. <a href="https://policies.google.com/privacy" className="text-[#006b5f] hover:underline" target="_blank" rel="noopener noreferrer">View Google Privacy Policy</a></li>
              </ul>
              <p className="text-gray-700 mb-4">
                These third-party service providers have their own privacy policies addressing how they use such information. We encourage you to review their privacy policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
              <p className="text-gray-700 mb-4">Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li><strong>The right to access:</strong> Request a copy of the personal information we hold about you</li>
                <li><strong>The right to correct:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>The right to deletion:</strong> Request deletion of your personal information (subject to legal obligations)</li>
                <li><strong>The right to object:</strong> Object to certain processing of your information</li>
                <li><strong>The right to data portability:</strong> Receive your data in a structured, commonly used format</li>
                <li><strong>The right to withdraw consent:</strong> Withdraw consent for processing based on consent (where applicable)</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>How to Exercise Your Rights:</strong> To exercise any of these rights, please contact us at <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a> with your request. We will respond to your request within 30 days (or as required by applicable law). We may need to verify your identity before processing your request.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>Right to Lodge a Complaint (GDPR):</strong> If you are located in the European Economic Area (EEA) or United Kingdom, you have the right to lodge a complaint with your local data protection supervisory authority if you believe we have violated your data protection rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-700 mb-4">
                If you are located in the European Economic Area (EEA) or United Kingdom, we process your personal information based on the following legal bases under the General Data Protection Regulation (GDPR):
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li><strong>Consent:</strong> When you provide explicit consent for specific purposes, such as account creation and authentication</li>
                <li><strong>Contract:</strong> To fulfill our contractual obligations to you, such as providing access to our services</li>
                <li><strong>Legal obligation:</strong> To comply with applicable laws and regulatory requirements</li>
                <li><strong>Legitimate interests:</strong> For our legitimate business interests, such as improving our services, preventing fraud, and ensuring security, where such interests are not overridden by your privacy rights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your personal information only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
              </p>
              <p className="text-gray-700 mb-4">Specifically:</p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li><strong>Account information:</strong> Retained for the duration of your account&apos;s active use, and for up to 3 years after account inactivity or deletion request, except where we are required to retain it by law</li>
                <li><strong>Website analytics data:</strong> Retained for 26 months (Google Analytics default retention period)</li>
                <li><strong>Communication records:</strong> Retained for 3 years from the date of last contact for customer service and legal compliance purposes</li>
                <li><strong>Legal/regulatory requirements:</strong> Some information may be retained longer if required by applicable law, court order, or legal process</li>
              </ul>
              <p className="text-gray-700 mb-4">
                When we no longer need your personal information, we will securely delete or anonymize it in accordance with our data retention policies.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country.
              </p>
              <p className="text-gray-700 mb-4">
                Specifically, we use Supabase, a service provider based in the United States, for data storage and processing. When we transfer personal information from the European Economic Area (EEA) or United Kingdom to the United States or other countries outside the EEA/UK, we ensure appropriate safeguards are in place to protect your information, including:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Standard Contractual Clauses approved by the European Commission</li>
                <li>Data processing agreements with our service providers</li>
                <li>Technical and organizational security measures</li>
              </ul>
              <p className="text-gray-700 mb-4">
                By using our services, you consent to the transfer of your information to the United States and other countries where our service providers operate.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Do Not Sell My Personal Information (California Residents)</h2>
              <p className="text-gray-700 mb-4">
                Under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA), California residents have specific rights regarding the sale and sharing of personal information.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>We do not sell your personal information.</strong> We do not sell, rent, or disclose your personal information to third parties for monetary or other valuable consideration.
              </p>
              <p className="text-gray-700 mb-4">
                California residents have the right to:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Know what personal information we collect and how it&apos;s used</li>
                <li>Request deletion of personal information</li>
                <li>Opt-out of the sale or sharing of personal information (though we do not sell your information)</li>
                <li>Non-discrimination for exercising privacy rights</li>
              </ul>
              <p className="text-gray-700 mb-4">
                To exercise these rights, please contact us at <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a>.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children&apos;s Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our service is not intended for individuals under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately at <a href="mailto:contact@sageoutdooradvisory.com" className="text-[#006b5f] hover:underline">contact@sageoutdooradvisory.com</a>. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information promptly.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Breach Notification</h2>
              <p className="text-gray-700 mb-4">
                In the event of a data breach that compromises your personal information, we will notify you and relevant regulatory authorities as required by applicable law. Notifications will be provided without undue delay and, where feasible, within 72 hours of becoming aware of the breach (as required by GDPR) or as otherwise required by applicable law.
              </p>
              <p className="text-gray-700 mb-4">
                Notifications will be sent to the email address associated with your account or through other reasonable means as appropriate under the circumstances.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Cookies</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to track activity on our website and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update our Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the &quot;Last updated&quot; date</li>
                <li>Sending you an email notification (if you have an account and we have your email address)</li>
                <li>Displaying a notice on our website for significant changes</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You are advised to review this Privacy Policy periodically for any changes. Your continued use of our services after any changes to this Privacy Policy constitutes your acceptance of the updated policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy, please contact us:
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
