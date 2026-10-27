"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Minus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicFaqs, FaqItem } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";

export function FAQ() {
  const { content, primaryLocation, copy } = usePublicContent();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  useEffect(() => {
    let isMounted = true;
    getPublicFaqs()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setFaqs(data.filter((f) => f.isActive !== false));
          } else {
            setFaqs([]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setFaqs([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Hard content rule: if no data, render nothing
  if (!isLoading && faqs.length === 0) {
    return null;
  }

  const categories = Array.from(
    new Set(faqs.map((f) => f.category).filter(Boolean))
  );

  const filteredFaqs =
    activeCategory === "all"
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  // Structured Data Schema for Technical SEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <section
      id="faq"
      className="border-t border-gray-200 dark:border-gray-800 bg-[#FAF9F5] dark:bg-gray-900/50 py-20 md:py-28"
    >
      {/* Technical SEO: FAQPage Structured Data */}
      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left Column: Heading & Contact Inquiry CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4 space-y-5"
          >
            <SectionHeading eyebrow="Inquiries" title={copy.faqs} />

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Find clear answers regarding treatment protocols, transparent fee structures, and what to expect during your first visit.
            </p>

            {phone ? (
              <div className="pt-2 flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Have a specific question?
                </span>
                <Button
                  href={`tel:${cleanPhone}`}
                  variant="outline"
                  size="sm"
                  className="rounded-full w-fit px-4"
                >
                  <Phone className="h-3.5 w-3.5 text-primary mr-1.5" />
                  <span>
                    {copy.call} {phone}
                  </span>
                </Button>
              </div>
            ) : null}
          </motion.div>

          {/* Right Column: Accessible FAQ Accordion */}
          <div className="lg:col-span-8 space-y-6">
            {/* Category Filter Tabs */}
            {categories.length > 1 && (
              <div
                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
                role="tablist"
              >
                <button
                  role="tab"
                  aria-selected={activeCategory === "all"}
                  onClick={() => setActiveCategory("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === "all"
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  All Questions ({faqs.length})
                </button>
                {categories.map((cat) => {
                  const count = faqs.filter((f) => f.category === cat).length;
                  const isSelected = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setActiveCategory(cat)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition-all capitalize cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white shadow-xs font-semibold"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = openIndex === idx;
                  const contentId = `faq-answer-${idx}`;
                  const buttonId = `faq-btn-${idx}`;

                  return (
                    <div key={faq.id || idx} className="py-4 sm:py-5">
                      <button
                        id={buttonId}
                        onClick={() => toggle(idx)}
                        className="flex w-full items-start justify-between gap-4 text-left transition-colors hover:text-primary cursor-pointer group"
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                      >
                        <span className="font-display text-base sm:text-lg text-gray-950 dark:text-white font-medium leading-snug group-hover:text-primary transition-colors">
                          {faq.question}
                        </span>
                        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:border-primary/50 group-hover:text-primary transition-colors">
                          {isOpen ? (
                            <Minus className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>

                      <div
                        id={contentId}
                        role="region"
                        aria-labelledby={buttonId}
                        className={`grid transition-[grid-template-rows] duration-250 ease-out ${
                          isOpen ? "grid-rows-[1fr] pt-3" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FAQ;
