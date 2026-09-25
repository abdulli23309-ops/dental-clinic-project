const hours = [
  { day: "Monday", time: "8:00 – 6:00" },
  { day: "Tuesday", time: "8:00 – 6:00" },
  { day: "Wednesday", time: "8:00 – 6:00" },
  { day: "Thursday", time: "8:00 – 6:00" },
  { day: "Friday", time: "8:00 – 2:00" },
  { day: "Saturday", time: "9:00 – 1:00" },
  { day: "Sunday", time: "Closed" },
];

export default function Visit() {
  return (
    <section id="visit" className="border-t border-line bg-bone">
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-5">Visit us</p>
            <h2 className="text-[34px] leading-[1.08] tracking-[-0.02em] sm:text-[42px]">
              Easy to find,
              <br />
              easy to park,
              <br />
              easy to leave.
            </h2>

            <div className="mt-10 space-y-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                  Address
                </p>
                <p className="mt-2 font-display text-[20px] leading-snug">
                  214 Alder Street, Suite 3<br />
                  Chicago, IL 60614
                </p>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                  Second building past the corner of Alder &amp; Halsted. Look for the
                  green awning. Our suite is on the ground floor — no stairs.
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                  Parking
                </p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink/85">
                  Free lot behind the building (4 spots, first-come). Street parking on
                  Alder is $2/hr via ParkChicago app. Two accessible spots out front.
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                  Transit
                </p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink/85">
                  CTA Brown Line → Armitage (5 min walk).<br />
                  Buses: 8 Halsted, 73 Armitage, 74 Fullerton.
                </p>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                  Contact
                </p>
                <p className="mt-2 text-[14.5px] leading-relaxed">
                  <a href="tel:+13125550147" className="text-forest underline decoration-line underline-offset-4">
                    (312) 555-0147
                  </a>
                  <br />
                  <a href="mailto:hello@marlowdental.com" className="text-forest underline decoration-line underline-offset-4">
                    hello@marlowdental.com
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {/* Map — replace with real Google Maps embed for the actual address */}
            <div className="aspect-[4/3] w-full overflow-hidden rounded-sm border border-line bg-cream">
              <iframe
                title="Marlow Dental on the map"
                src="https://www.google.com/maps?q=Halsted+and+Armitage+Chicago&output=embed"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="mt-8 rounded-sm border border-line bg-cream p-7">
              <p className="text-[11px] uppercase tracking-[0.16em] text-ink-soft/70">
                Office hours
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2.5">
                {hours.map((h) => (
                  <div
                    key={h.day}
                    className="flex items-center justify-between border-b border-line/70 py-1.5 last:border-0"
                  >
                    <dt className="text-[14px] text-ink-soft">{h.day}</dt>
                    <dd
                      className={`text-[14px] tabular-nums ${
                        h.time === "Closed" ? "text-ink-soft/60" : "text-ink"
                      }`}
                    >
                      {h.time}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}