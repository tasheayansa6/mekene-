import { ensureDefaultHomepageSections } from '../../src/lib/cms/homepage';
import { getOrCreateMenu } from '../../src/lib/cms/menus';
import { db } from '../../src/lib/db';

const SAMPLE_FAQS = [
  {
    question: 'What time are Sunday services?',
    answer:
      'Sunday worship typically begins in the morning. Please check the homepage service times or contact the church office for the current schedule.',
    category: 'services',
    sortOrder: 0,
  },
  {
    question: 'How can I visit or join the church?',
    answer:
      'You are welcome anytime. Visit the Contact page for directions, or explore Join / Membership for next steps.',
    category: 'visit',
    sortOrder: 1,
  },
  {
    question: 'How do I request prayer?',
    answer: 'Use the Prayer Request form on the website. Private requests are handled confidentially by pastoral care.',
    category: 'prayer',
    sortOrder: 2,
  },
] as const;

export async function seedCmsCenter() {
  await ensureDefaultHomepageSections();
  await getOrCreateMenu('main');
  await getOrCreateMenu('footer');
  await getOrCreateMenu('mobile');

  const faqCount = await db.cmsFaq.count();
  if (faqCount === 0) {
    for (const faq of SAMPLE_FAQS) {
      await db.cmsFaq.create({
        data: {
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          sortOrder: faq.sortOrder,
          status: 'published',
          language: 'en',
          publishedAt: new Date(),
        },
      });
    }
    console.log(`[Seed] ${SAMPLE_FAQS.length} sample FAQs published.`);
  }

  console.log('[Seed] CMS homepage sections and menus are available.');
}
