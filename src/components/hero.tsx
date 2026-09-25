import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-x grid grid-cols-1 gap-14 py-16 md:py-24 lg:grid-cols-12 lg:gap-10 lg:py-28">
        {/* Copy — 7 cols */}
        <div className="lg:col-span-7 lg:pr-8">
          <p className="eyebrow mb-6">Lincoln Park, Chicago · Est. 2014</p>

          <h1 className="text-[42px] leading-[1.02] tracking-[-0.03em] sm:text-[56px] lg:text-[68px]">
            Dentistry
            <br />
            without
            <br />
            <span className="relative inline-block">
              the dread.
              <svg
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-3 w-full text-clay"
                fill="none"
              >
                <path
                  d="M2 8c60-5 140-7 296-3"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-[16.5px] leading-[1.65] text-ink-soft">
            Marlow Dental is a one-dentist practice on Alder Street. We run on time,
            walk you through every X-ray before we touch a tooth, and never sell you
            treatment you don&rsquo;t need. Same-week openings for new patients.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/book"
              className="group inline-flex items-center gap-2.5 rounded-full bg-forest px-7 py-3.5 text-[14px] font-medium tracking-wide text-bone transition-all hover:bg-forest-deep"
            >
              Book an appointment
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="tel:+13125550147"
              className="inline-flex items-center gap-2 px-2 py-3 text-[14px] text-ink-soft underline decoration-line decoration-1 underline-offset-4 hover:text-forest"
            >
              Or call (312) 555-0147
            </a>
          </div>

          {/* Micro trust row */}
          <div className="mt-12 flex flex-wrap items-center gap-x-7 gap-y-3 text-[12.5px] text-ink-soft/90">
            <span className="flex items-center gap-1.5">
              <Stars />
              <span className="ml-1 font-medium text-ink">4.9</span>
              <span>· 412 reviews</span>
            </span>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span>Most PPO insurance accepted</span>
            <span className="hidden h-3 w-px bg-line sm:block" />
            <span>Emergencies seen same day</span>
          </div>
        </div>

        {/* Image — 5 cols */}
        <div className="relative lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-cream">
            {/* Replace this img with a real photo: a warm, natural-light portrait of a
                dentist with a patient, or the treatment room. Not stock-smiling. */}
            <img
              src="https://images.unsplash.com/photo-1606811971618-4486d14f3f99?q=80&w=1200&auto=format&fit=crop"
              alt="Dr. Sarah Marlow in the treatment room at Marlow Dental"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/30 via-transparent to-transparent" />
          </div>

          {/* Floating credential card */}
          <div className="absolute -bottom-5 -left-4 max-w-[220px] rounded-sm border border-line bg-bone p-4 shadow-[0_20px_40px_-24px_rgba(20,20,15,0.28)] sm:-left-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">
              Your dentist
            </p>
            <p className="mt-1.5 font-display text-[17px] leading-tight">
              Dr. Sarah Marlow, DDS
            </p>
            <p className="mt-1 text-[12px] leading-snug text-ink-soft">
              U-M School of Dentistry · 12 years in practice
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stars() {
  return (
    <span className="flex items-center gap-0.5 text-gold">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}