import { seedChurchInfo } from './church-info';
import { seedAuth } from './auth';
import { seedAdminContent } from './admin-content';
import { seedCmsTaxonomy } from './cms';
import { seedSermonTaxonomy } from './sermons';
import { seedEventTaxonomy } from './events';
import { seedPrayerTaxonomy } from './prayer';
import { seedGalleryTaxonomy } from './gallery';
import { seedGiving } from './giving';
import { seedPastoralCategories } from '../../src/lib/pastoral/seed-categories';
import { seedExpenseCategories } from '../../src/lib/finance/seed-categories';
import { seedVolunteerCatalog } from '../../src/lib/volunteers/seed';
import { seedGovernanceCatalog } from '../../src/lib/governance/seed';
import { seedMembershipTypes } from './membership-types';
import { seedCommunicationTemplates } from './communications';
import { seedCmsCenter } from './cms-center';

async function main() {
  await seedAuth();
  await seedChurchInfo();
  await seedAdminContent();
  await seedCmsTaxonomy();
  await seedSermonTaxonomy();
  await seedEventTaxonomy();
  await seedPrayerTaxonomy();
  await seedGalleryTaxonomy();
  await seedGiving();
  await seedPastoralCategories();
  console.log('[Seed] Pastoral care categories are available.');
  await seedExpenseCategories();
  console.log('[Seed] Finance expense categories are available.');
  await seedVolunteerCatalog();
  console.log('[Seed] Staff departments, positions, and volunteer skills are available.');
  await seedGovernanceCatalog();
  console.log('[Seed] Governance request categories and settings are available.');
  await seedMembershipTypes();
  await seedCommunicationTemplates();
  await seedCmsCenter();
}

main()
  .then(() => {
    console.log('[Seed] Complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Seed] Failed', error);
    process.exit(1);
  });
