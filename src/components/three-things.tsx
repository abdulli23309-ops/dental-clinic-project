const items = [
  {
    n: "01",
    complaint: "“I waited three weeks for a cleaning.”",
    answer:
      "We hold same-week openings for new patients, and true emergencies get seen the same day — usually within a few hours of your call.",
  },
  {
    n: "02",
    complaint: "“I didn’t know what it would cost until the bill came.”",
    answer:
      "You get a written estimate before we start anything. If the number changes mid-treatment, we stop and talk to you first. Always.",
  },
  {
    n: "03",
    complaint: "“I felt like a number the whole time.”",
    answer:
      "One dentist, start to finish. Dr. Marlow does every exam, every cleaning, every filling herself. You will not meet a rotating cast.",
  },
];

export default function ThreeThings() {
  return (
    <section className="border-t border-line bg-cream">
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5">Why patients switch</p>
            <h2 className="text-[34px] leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
              The three things
              <br />
              people tell us
              <br />
              they were tired of.
            </h2>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink-soft">
              We asked 200 new patients why they left their last dentist. These came
              up over and over.
            </p>
          </div>

          <div className="lg:col-span-8">
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.n} className="grid grid-cols-12 gap-6 py-8 first:pt-0 last:pb-0">
                  <span className="col-span-2 font-display text-[22px] text-clay sm:col-span-1">
                    {item.n}
                  </span>
                  <div className="col-span-10 sm:col-span-11">
                    <p className="font-display text-[20px] leading-snug tracking-[-0.01em] text-ink sm:text-[23px]">
                      {item.complaint}
                    </p>
                    <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                      {item.answer}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}