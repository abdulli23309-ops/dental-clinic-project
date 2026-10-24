"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Plus, Minus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPublicFaqs } from "@/lib/api";
import { usePublicContent } from "@/components/providers/public-content-provider";
import { getUiCopy } from "@/content/ui-copy";

export function FAQ() {
  const { content, primaryLocation } = usePublicContent();
  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const copy = getUiCopy("en");

  const phone = content.general?.phone || primaryLocation?.phone || "";
  const cleanPhone = phone.replace(/[^0-9+]/g, "");

  useEffect(() => {
    let isMounted = true;
    getPublicFaqs()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setFaqList(data.map((f) => ({ q: f.question, a: f.answer })));
          } else {
            setFaqList([]);
          }
        }
      })
      .catch(() => {
        if (isMounted) setFaqList([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Sections with no data render nothing
  if (!isLoading && faqList.length === 0) {
    return null;
  }

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-20 md:py-28"
    >
      <div className="container-x">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-4 space-y-4"
          >
            <SectionHeading eyebrow="Inquiries" title={copy.faqs} />

            {phone ? (
              <div className="pt-2">
                <Button href={`tel:${cleanPhone}`} variant="secondary" size="sm">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>
                    {copy.call} {phone}
                  </span>
                </Button>
              </div>
            ) : null}
          </motion.div>

          <div className="lg:col-span-8">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800 border-y border-gray-200 dark:border-gray-800">
                {faqList.map((faq, idx) => {
                  const isOpen = openIndex === idx;
                  return (
                    <div key={idx} className="py-4 sm:py-5">
                      <button
                        onClick={() => toggle(idx)}
                        className="flex w-full items-start justify-between gap-4 text-left transition-colors hover:text-primary cursor-pointer"
                        aria-expanded={isOpen}
                      >
                        <span className="font-display text-[16px] sm:text-[17px] text-gray-900 dark:text-white font-normal leading-snug">
                          {faq.q}
                        </span>
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {isOpen ? (
                            <Minus className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>

                      <div
                        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                          isOpen ? "grid-rows-[1fr] pt-3" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <p className="text-xs sm:text-[14px] leading-relaxed text-gray-600 dark:text-gray-400">
                            {faq.a}
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
