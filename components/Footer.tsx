import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Sage Outdoor Advisory</h3>
            <p className="text-gray-400">
              5113 South Harper, Suite 2C – #4001<br />
              Chicago, Illinois 60615
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/glossary" className="hover:text-white">
                  Glossary
                </Link>
              </li>
              <li>
                <Link href="/guides" className="hover:text-white">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/services-overview/" className="hover:text-white">
                  Services
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/shop/" className="hover:text-white">
                  Market Reports
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="https://sageoutdooradvisory.com/contact-us/" className="hover:text-white font-semibold">
                  Schedule Consultation →
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/clients/" className="hover:text-white">
                  Client Testimonials
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/company-overview/" className="hover:text-white">
                  About
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/our-team/" className="hover:text-white">
                  Our Team
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/upcoming-conferences-and-shows/" className="hover:text-white">
                  Events
                </Link>
              </li>
              <li>
                <Link href="https://sageoutdooradvisory.com/blog" className="hover:text-white">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400">
            <p>&copy; {new Date().getFullYear()} Sage Outdoor Advisory. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

