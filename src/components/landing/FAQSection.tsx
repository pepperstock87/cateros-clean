"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "How does the 14-day trial work?",
    answer:
      "You get full access to all features. No credit card required to start. Cancel anytime.",
  },
  {
    question: "Can I import my existing recipes?",
    answer:
      "Yes! Add recipes manually or let our AI assistant help you build your cost library.",
  },
  {
    question: "How do proposals work?",
    answer:
      "Generate branded PDF proposals from any event. Share via a unique link where clients can accept, decline, or request revisions.",
  },
  {
    question: "What if I need help?",
    answer:
      "Basic plans include email support. Pro plans include priority support and personalized onboarding.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <h2 className="text-center font-display text-3xl font-semibold mb-4">
        Frequently asked questions
      </h2>
      <p className="text-center text-[#9c8876] mb-12">
        Everything you need to know about Cateros
      </p>
      <div className="space-y-3">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className="font-medium text-sm">{faq.question}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#9c8876] shrink-0 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-200 ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-[#9c8876] leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
