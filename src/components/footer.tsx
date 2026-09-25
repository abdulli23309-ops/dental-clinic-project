import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-forest-deep/20 bg-forest-deep text-bone">
      <div className="container-x py-16 md:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-bone text-forest-deep">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 4c-2.5 0-3.2 1.2-4.6 1.2C6 5.2 4.5 6.6 4.5 9.2c0 3.4 1.7 6 2.6 8.6.6 1.7 1 3 2.1 3 1.2 0 1.3-1.6 1.5-3.3.15-1.4.5-2.5 1.3-2.5s1.15 1.1 1.3 2.5c.2 1.7.3 3.3 1.5 3.3 1.1 0 1.5-1.3 2.1-3 .9-2.6 2.6-5.2 2.6-8.6 0-2.6-1.5-4-2.9-4C15.2 5.2 14.5 4 12 4Z" />
                </svg>
              </span>
              <span className="font-display text-[19px] tracking-tight">
                Marlow <span className="text-clay">Dental</span>
              </span>
            </div>

            <p className="mt-6 max-w-sm text-[14.5px] leading-relaxed text-bone/70">
              An independent dental practice in Chicago&rsquo;s Lincoln Park. One
              dentist, start to finish, since 2014.
            </p>

            <div className="mt-7 flex flex-col gap-2 text-[14px]">
              <a href="tel:+13125550147" className="text-bone/90 hover:text-bone">
                (312) 555-0147
              </a>
              <a href="mailto:hello@marlowdental.com" className="text-bone/90 hover:text-bone">
                hello@marlowdental.com
              </a>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7 lg:pl-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-bone/45">
                Practice
              </p>
              <ul className="mt-4 space-y-3 text-[14px] text-bone/85">
                <li><Link href="#services" className="hover:text-bone">Services</Link></li>
                <li><Link href="#about" className="hover:text-bone">About Dr. Marlow</Link></li>
                <li><Link href="#reviews" className="hover:text-bone">Reviews</Link></li>
                <li><Link href="#faq" className="hover:text-bone">FAQ</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-bone/45">
                Patients
              </p>
              <ul className="mt-4 space-y-3 text-[14px] text-bone/85">
                <li><Link href="/book" className="hover:text-bone">Book a visit</Link></li>
                <li><Link href="#insurance" className="hover:text-bone">Insurance</Link></li>
                <li><Link href="#visit" className="hover:text-bone">Directions</Link></li>
                <li><Link href="#visit" className="hover:text-bone">Emergency care</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-bone/45">
                Office
              </p>
              <address className="mt-4 space-y-3 text-[14px] not-italic text-bone/85">
                <p>
                  214 Alder Street<br />
                  Suite 3<br />
                  Chicago, IL 60614
                </p>
              </address>
              <p className="mt-4 text-[13px] leading-relaxed text-bone/60">
                Mon–Thu 8–6<br />
                Fri 8–2 · Sat 9–1
              </p>
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-bone/15 pt-7 text-[12.5px] text-bone/55 sm:flex-row sm:items-center">
          <p>
            © {year} Marlow Dental, P.C. All rights reserved. · Illinois Dental
            License #019.029811
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-bone/80">Privacy</Link>
            <Link href="/hipaa" className="hover:text-bone/80">HIPAA Notice</Link>
            <Link href="/accessibility" className="hover:text-bone/80">Accessibility</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}