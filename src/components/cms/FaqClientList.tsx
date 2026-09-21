'use client';

import { useEffect, useState } from 'react';
import { FaqAccordion } from '@/components/cms/FaqAccordion';
import { apiGet } from '@/lib/api/client';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
};

/** Client-only FAQ loader so `/faq` never touches Prisma during `next build`. */
export function FaqClientList() {
  const [faqs, setFaqs] = useState<FaqItem[] | null>(null);

  useEffect(() => {
    void apiGet<FaqItem[]>('/content/faqs').then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setFaqs(
          result.data.map((row) => ({
            ...row,
            category: row.category ?? 'General',
          }))
        );
      } else {
        setFaqs([]);
      }
    });
  }, []);

  if (faqs === null) {
    return <p className="text-sm text-muted-foreground">Loading questions…</p>;
  }

  if (faqs.length === 0) {
    return <p className="text-sm text-muted-foreground">No published FAQs yet.</p>;
  }

  return (
    <FaqAccordion
      faqs={faqs.map((faq) => ({
        id: faq.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category || 'General',
      }))}
    />
  );
}
