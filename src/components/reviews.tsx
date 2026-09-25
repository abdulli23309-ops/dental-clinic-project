const reviews = [
  {
    quote:
      "I cracked a molar on a Saturday morning eating toast of all things. Called at 8:40, was in the chair by 10:15. Dr. Marlow walked me through the crown on her screen before she started, told me the exact price, and I paid it. No surprise bill three weeks later. I've been going back ever since.",
    name: "Danielle R.",
    detail: "Patient since 2021 · Lincoln Park",
  },
  {
    quote:
      "I avoided dentists for nine years because of a bad experience in my twenties. Dr. Marlow figured that out in the first five minutes and didn't rush me once. My first visit was literally just a look and a conversation. It took me three appointments to let her do a cleaning. She never once made me feel bad about it.",
    name: "Marcus T.",
    detail: "Patient since 2022 · Logan Square",
  },
  {
    quote:
      "Brought my seven-year-old in after a bad experience at a kids' clinic. Dr. Marlow let him hold the mirror, count her teeth first, and pick a flavor of polish. He asked when we could come back. I nearly cried in the parking lot.",
    name: "Priya S.",
    detail: "Patient since 2023 · Old Town",
  },
];

export default function Reviews() {
  return (
    <section id="reviews" className="border-t border-line bg-cream">
      <div className="container-x py-20 md:py-28">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-5">What patients say</p>
            <h2 className="max-w-xl text-[34px] leading-[1.08] tracking-[-0.02em] sm:text-[44px]">
              Real reviews from
              <br />
              real appointments.
            </h2>
          </div>
          <div className="flex items-center gap-3 text-[13px] text-ink-soft">
            <span className="flex items-center gap-0.5 text-gold">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.9 4.8 17.7l1-5.9L1.5 7.7l5.9-.8L10 1.5z" />
                </svg>
              ))}
            </span>
            <span>
              <span className="font-medium text-ink">4.9</span> · 412 Google reviews
            </span>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-7">
          {reviews.map((r) => (
            <figure
              key={r.name}
              className="flex flex-col justify-between rounded-sm border border-line bg-bone p-7"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-clay/70" fill="currentColor">
                <path d="M9.5 6C6.5 7.5 5 10 5 13c0 2.8 1.6 4.5 3.9 4.5 2 0 3.4-1.4 3.4-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.6 1.5-3 3.4-4L9.5 6zm9 0C15.5 7.5 14 10 14 13c0 2.8 1.6 4.5 3.9 4.5 2 0 3.4-1.4 3.4-3.3 0-1.8-1.3-3.1-3-3.1-.3 0-.6 0-.8.1.3-1.6 1.5-3 3.4-4L18.5 6z" />
              </svg>
              <blockquote className="mt-6 flex-1 text-[15px] leading-[1.7] text-ink/85">
                {r.quote}
              </blockquote>
              <figcaption className="mt-7 border-t border-line pt-4">
                <p className="font-display text-[16px] text-ink">{r.name}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-soft">{r.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}