import Link from "next/link";
import { Phone, Mail, MapPin, Clock, ShieldCheck } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line/60 bg-forest-deep text-[#FAF7F2]">
      <div className="container-x py-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          {/* Clinic Brand & Doctor Continuity */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FAF7F2] text-forest-deep">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
                </svg>
              </span>
              <span className="font-display text-[20px] tracking-tight">
                Marlow <span className="text-clay">Dental</span>
              </span>
            </div>

            <p className="max-w-sm text-[14px] leading-relaxed text-[#FAF7F2]/75">
              An independent dental practice in Lincoln Park, Chicago. Dr. Sarah Marlow personally conducts every examination, cleaning, and restorative procedure.
            </p>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-[13.5px]">
                <Phone className="h-4 w-4 text-clay shrink-0" />
                <a href="tel:+13125550147" className="hover:text-white transition-colors">
                  (312) 555-0147
                </a>
                <CopyButton text="(312) 555-0147" label="Copy" className="border-white/10 bg-white/5 text-white/80 hover:bg-white/15" />
              </div>
              <div className="flex items-center gap-2 text-[13.5px]">
                <Mail className="h-4 w-4 text-clay shrink-0" />
                <a href="mailto:hello@marlowdental.com" className="hover:text-white transition-colors">
                  hello@marlowdental.com
                </a>
                <CopyButton text="hello@marlowdental.com" label="Copy" className="border-white/10 bg-white/5 text-white/80 hover:bg-white/15" />
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#FAF7F2]/45 font-semibold">
              Practice
            </p>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-[#FAF7F2]/80">
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Treatments &amp; Fees
                </Link>
              </li>
              <li>
                <Link href="/#commitments" className="hover:text-white transition-colors">
                  Clinical Standards
                </Link>
              </li>
              <li>
                <Link href="/#about" className="hover:text-white transition-colors">
                  About Dr. Marlow
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-white transition-colors">
                  Insurance &amp; Billing
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-white transition-colors">
                  Schedule a Visit
                </Link>
              </li>
            </ul>
          </div>

          {/* Office Location & Details */}
          <div className="lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#FAF7F2]/45 font-semibold">
              Location
            </p>
            <address className="mt-4 not-italic space-y-2 text-[13.5px] text-[#FAF7F2]/80">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-clay shrink-0 mt-0.5" />
                <div>
                  <p>214 Alder Street, Suite 3</p>
                  <p>Chicago, IL 60614</p>
                  <p className="text-[12px] text-[#FAF7F2]/60 mt-1">
                    Ground floor. Free 4-stall patient lot in rear.
                  </p>
                </div>
              </div>
            </address>
          </div>

          {/* Practice Hours */}
          <div className="lg:col-span-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#FAF7F2]/45 font-semibold">
              Office Hours
            </p>
            <div className="mt-4 space-y-2 text-[13px] text-[#FAF7F2]/80">
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span>Mon to Thu</span>
                <span className="font-mono text-white/90">8:00 AM to 6:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span>Friday</span>
                <span className="font-mono text-white/90">8:00 AM to 2:00 PM</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span>Saturday</span>
                <span className="font-mono text-white/90">9:00 AM to 1:00 PM</span>
              </div>
              <div className="flex justify-between text-[#FAF7F2]/50 pt-0.5">
                <span>Sunday</span>
                <span>Closed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Licensure & Legal Footer Strip (no dead links!) */}
        <div className="mt-14 border-t border-white/15 pt-8 text-[12px] text-[#FAF7F2]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              &copy; {currentYear} Marlow Dental, P.C. All rights reserved. Illinois Dental License #019.029811
            </span>
          </div>

          <div className="flex items-center gap-5 text-center">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/hipaa" className="hover:text-white transition-colors">
              HIPAA Notice
            </Link>
            <Link href="/accessibility" className="hover:text-white transition-colors">
              Accessibility
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
