'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  if (faqs.length === 0) {
    return (
      <p className="text-center text-muted-foreground">
        No published FAQs yet. Check back soon.
      </p>
    );
  }

  return (
    <Accordion type="single" collapsible className="mx-auto max-w-3xl">
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>
            <p className="whitespace-pre-wrap text-muted-foreground">{faq.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
