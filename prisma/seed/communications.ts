import { db } from '../../src/lib/db';

const TEMPLATES = [
  {
    name: 'Welcome new member',
    slug: 'welcome-new-member',
    category: 'membership',
    subject: 'Welcome to {{church_name}}',
    body: 'Hello {{member_name}}, welcome to {{church_name}}. We are glad you joined us.',
    channels: 'in_app,email',
  },
  {
    name: 'Event reminder',
    slug: 'event-reminder',
    category: 'events',
    subject: 'Reminder: {{event_name}}',
    body: '{{member_name}}, {{event_name}} is on {{event_date}} at {{event_time}} ({{venue}}).',
    channels: 'in_app,email,telegram',
  },
  {
    name: 'Registration confirmation',
    slug: 'registration-confirmation',
    category: 'events',
    subject: 'Registered for {{event_name}}',
    body: 'You are registered for {{event_name}} on {{event_date}} at {{venue}}.',
    channels: 'in_app,email',
  },
  {
    name: 'Volunteer reminder',
    slug: 'volunteer-reminder',
    category: 'volunteers',
    subject: 'Volunteer reminder',
    body: 'Hello {{member_name}}, this is a reminder for your volunteer assignment with {{ministry_name}}.',
    channels: 'in_app,email',
  },
  {
    name: 'Church announcement',
    slug: 'church-announcement',
    category: 'church-wide',
    subject: 'Announcement from {{church_name}}',
    body: 'Dear {{member_name}}, please see this church announcement.',
    channels: 'in_app,email,telegram',
  },
  {
    name: 'Service reminder',
    slug: 'service-reminder',
    category: 'events',
    subject: 'Service reminder — {{event_name}}',
    body: 'Join us for {{event_name}} on {{event_date}} at {{event_time}}, {{venue}}.',
    channels: 'in_app,email',
  },
  {
    name: 'Membership approval',
    slug: 'membership-approval',
    category: 'membership',
    subject: 'Membership update',
    body: 'Hello {{member_name}}, your membership application with {{church_name}} has been updated.',
    channels: 'in_app,email',
  },
] as const;

export async function seedCommunicationTemplates() {
  for (const row of TEMPLATES) {
    const variables = JSON.stringify(
      [...row.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1])
    );
    await db.communicationTemplate.upsert({
      where: { slug: row.slug },
      create: {
        name: row.name,
        slug: row.slug,
        category: row.category,
        subject: row.subject,
        body: row.body,
        variables,
        channels: row.channels,
        isActive: true,
      },
      update: {
        name: row.name,
        category: row.category,
        subject: row.subject,
        body: row.body,
        variables,
        channels: row.channels,
        isActive: true,
      },
    });
  }
  console.log(`[Seed] ${TEMPLATES.length} communication templates upserted.`);
}
