"use client";

import { useState } from "react";

const faqs = [
  {
    q: "Do you take my insurance?",
    a: "We're in-network with Delta Dental PPO, Cigna PPO, MetLife, Guardian, and Aetna. For everything else, we file as an out-of-network provider and you usually get 50–70% reimbursed. We'll run your benefits before your first visit and tell you exactly what's covered.",
  },
  {
    q: "What if I don't have insurance?",
    a: "We have a cash rate that's roughly 25% below our standard fee schedule — it's the number listed on our services. No membership plan required, no upsell. Cleaning and full X-rays are $140 cash.",
  },
  {
    q: "I haven't been to a dentist in years. Will you judge me?",
    a: "No. Roughly a third of our new patients say this on the phone. We start with a look and a conversation, not a lecture. If you want to take it slow, we'll take it slow.",
  },
  {
    q: "Do you see children?",
    a: "Yes, from age 3 up. Dr. Marlow does pediatric-friendly first visits — no tools until the kid is comfortable, and the parent stays in the room the entire time.",
  },
  {
    q: "How quickly can I get an appointment?",
    a: "New patients typically get in within the same week. If you're in pain, call before 11am and we'll almost always see you the same day. Emergencies are held in the schedule daily.",
  },
  {
    q: "Do you offer payment plans?",
    a: "Yes. For anything over $500 we offer 6-month interest-free financing through CareCredit, plus a 5% discount if you pay the full balance the day of treatment.",
  },
  {
    q: "Will I see the same dentist every time?",
    a: "Yes. Dr. Marlow does every exam, cleaning, and procedure herself. She's the only dentist in the practice.",
  },
  {
    q: "What if I need a specialist?",
    a: "We refer to a small network of endodontists, oral surgeons, and periodontists we've worked with for years. Dr. Marlow calls them directly to explain your case — you're not just handed a business card.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-line bg-cream">
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-5">Questions</p>
            <h2 className="text-[34px] leading-[1.08] tracking-[-0.02em] sm:text-[42px]">
              Things people
              <br />
              actually ask us.
            </h2>
            <p className="mt-6 max-w-xs text-[14.5px] leading-relaxed text-ink-soft">
              Still not sure? Call the office — you&rsquo;ll talk to a real person,
              usually within two rings.
            </p>
          </div>

          <div className="lg:col-span-8">
            <ul className="divide-y divide-line border-y border-line">
              {faqs.map((f, i) => {
                const isOpen = open === i;
                return (
                  <li key={f.q}>
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-start justify-between gap-6 py-5 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="font-display text-[18px] leading-snug tracking-[-0.01em] text-ink sm:text-[19px]">
                        {f.q}
                      </span>
                      <span
                        className={`mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-ink-soft transition-transform ${
                          isOpen ? "rotate-45 bg-forest text-bone border-forest" : ""
                        }`}
                      >
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M6 1v10M1 6h10" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-6 pr-10">
                        <p className="max-w-2xl text-[15px] leading-[1.7] text-ink-soft">
                          {f.a}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}