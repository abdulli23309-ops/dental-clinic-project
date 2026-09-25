const services = [
  {
    n: "01",
    title: "Cleanings & exams",
    body: "A full checkup with X-rays, a scaling, a polish, and a sit-down conversation about what we saw. Typically 45 minutes. Usually $120–$180 before insurance.",
    meta: "45 min · from $120",
  },
  {
    n: "02",
    title: "Fillings & crowns",
    body: "Composite fillings matched to your tooth color. Same-day crowns milled in-office for most cases — you walk out with the permanent one, not a temp.",
    meta: "60–90 min · from $210",
  },
  {
    n: "03",
    title: "Root canals",
    body: "Done in-house by Dr. Marlow. Most are completed in a single visit. We use a rotary system and a lot of local anesthetic so you feel pressure, not pain.",
    meta: "90 min · from $650",
  },
  {
    n: "04",
    title: "Invisalign & aligners",
    body: "Full clear-aligner treatment, scans, and retainers. We only recommend it when it will actually improve your bite or hygiene — not because it looks good on Instagram.",
    meta: "6–18 months · from $3,400",
  },
  {
    n: "05",
    title: "Whitening",
    body: "Custom-tray take-home kits, or a single in-office session before a wedding or interview. We'll tell you honestly if your staining won't respond.",
    meta: "1 visit or 2 weeks · from $280",
  },
  {
    n: "06",
    title: "Emergency care",
    body: "Chipped tooth, lost crown, swelling, or pain that woke you up. Call before 11am and we will almost always see you the same day.",
    meta: "Same day · from $95",
  },
];

export default function Services() {
  return (
    <section id="services" className="border-t border-line bg-bone">
      <div className="container-x py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-5">What we do</p>
            <h2 className="max-w-2xl text-[34px] leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
              A short list of things
              <br />
              we do well.
            </h2>
          </div>
          <p className="max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
            Prices below are our cash rate. If you have PPO insurance, your cost is
            usually a fraction of this. We&rsquo;ll give you a written estimate first.
          </p>
        </div>

        <ul className="mt-14 divide-y divide-line border-y border-line">
          {services.map((s) => (
            <li
              key={s.n}
              className="group grid grid-cols-12 items-start gap-4 py-7 transition-colors hover:bg-cream/60 sm:gap-6"
            >
              <span className="col-span-2 pt-1 font-display text-[15px] text-clay sm:col-span-1">
                {s.n}
              </span>
              <h3 className="col-span-10 font-display text-[24px] leading-tight tracking-[-0.015em] sm:col-span-4 sm:text-[26px]">
                {s.title}
              </h3>
              <p className="col-span-12 text-[15px] leading-relaxed text-ink-soft sm:col-span-5">
                {s.body}
              </p>
              <span className="col-span-12 text-[12.5px] uppercase tracking-[0.14em] text-ink-soft/80 sm:col-span-2 sm:text-right">
                {s.meta}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}