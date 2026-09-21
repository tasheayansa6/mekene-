import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Decimal } from '@prisma/client/runtime/library';
import {
  moneyEquals,
  moneyToString,
  netContributionAmount,
  parseMoney,
} from './money';
import {
  campaignAcceptsContributions,
  countsTowardTotals,
} from './status';
import {
  canCreateGiving,
  canExportGiving,
  canManageRefunds,
  canViewGiving,
} from './access';
import { permissionsForRole } from '../auth/rbac-matrix';
import type { AuthUser } from '../auth/permissions';
import { createHmac } from 'crypto';
import { signedDevProvider } from './providers';
import {
  formatCurrencyList,
  givingYearBounds,
  isSupportedCurrency,
  parseCurrencyList,
  parsePresetAmounts,
} from './currency';
import { buildGivePath } from './qr';

function user(slug: string): AuthUser {
  return {
    id: `${slug}-1`,
    email: `${slug}@example.com`,
    firstName: 'Test',
    lastName: 'User',
    phone: null,
    profileImage: null,
    status: 'active',
    isVerified: true,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      id: slug,
      slug,
      name: slug,
      hierarchy: 1,
      isPrivileged: slug === 'admin' || slug === 'finance',
    },
    permissions: permissionsForRole(slug).map((key) => {
      const [resource, action] = key.split(':');
      return { resource, action };
    }),
  };
}

describe('giving money', () => {
  it('parses decimal amounts without float money storage', () => {
    assert.equal(moneyToString(parseMoney('100.50')!), '100.50');
    assert.equal(parseMoney('100.999'), null);
    assert.equal(parseMoney('-1'), null);
    assert.equal(moneyEquals(new Decimal('10.00'), '10.00'), true);
    assert.equal(moneyToString(netContributionAmount('100.00', '25.50')), '74.50');
  });

  it('only successful and partially refunded count toward totals', () => {
    assert.equal(countsTowardTotals('successful'), true);
    assert.equal(countsTowardTotals('partially_refunded'), true);
    assert.equal(countsTowardTotals('pending'), false);
    assert.equal(countsTowardTotals('refunded'), false);
    assert.equal(campaignAcceptsContributions('active'), true);
    assert.equal(campaignAcceptsContributions('draft'), false);
  });
});

describe('giving permissions', () => {
  it('blocks website members from finance admin APIs', () => {
    const member = user('member');
    assert.equal(canViewGiving(member), false);
    assert.equal(canCreateGiving(member), false);
    assert.equal(canManageRefunds(member), false);
    assert.equal(canExportGiving(member), false);
  });

  it('grants finance role giving access including refunds and export', () => {
    const finance = user('finance');
    assert.equal(canViewGiving(finance), true);
    assert.equal(canCreateGiving(finance), true);
    assert.equal(canManageRefunds(finance), true);
    assert.equal(canExportGiving(finance), true);
  });
});

describe('signed_dev webhook verification', () => {
  it('rejects invalid signatures and accepts valid HMAC payloads', async () => {
    process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
    const body = JSON.stringify({
      event_id: 'evt_1',
      provider_reference: 'prv_1',
      contribution_reference: 'BME-GIV-1',
      amount: '50.00',
      currency: 'ETB',
      status: 'successful',
    });
    const bad = await signedDevProvider.verifyWebhook(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-bme-signature': 'nope' },
        body,
      }),
      body
    );
    assert.equal(bad, null);

    const signature = createHmac('sha256', 'test-secret').update(body).digest('hex');
    const good = await signedDevProvider.verifyWebhook(
      new Request('http://localhost', {
        method: 'POST',
        headers: { 'x-bme-signature': signature },
        body,
      }),
      body
    );
    assert.equal(good?.eventKey, 'evt_1');
    assert.equal(good?.amount, '50.00');
  });
});

describe('giving currency helpers', () => {
  it('parses currency lists and rejects unsupported codes', () => {
    assert.deepEqual(parseCurrencyList('ETB, usd ,ETB'), ['ETB', 'USD']);
    assert.equal(isSupportedCurrency('etb', 'ETB,USD'), true);
    assert.equal(isSupportedCurrency('EUR', 'ETB'), false);
    assert.equal(formatCurrencyList(['usd', 'ETB', 'usd']), 'USD,ETB');
  });

  it('parses preset amounts safely', () => {
    assert.deepEqual(parsePresetAmounts('["100","250.50"]'), ['100', '250.50']);
    assert.deepEqual(parsePresetAmounts('100,250,bad'), ['100', '250']);
  });

  it('computes giving year bounds from start month', () => {
    const jan = givingYearBounds(1, new Date(Date.UTC(2026, 5, 15)));
    assert.equal(jan.label, '2026');
    assert.equal(jan.start.toISOString().startsWith('2026-01-01'), true);

    const july = givingYearBounds(7, new Date(Date.UTC(2026, 2, 1)));
    assert.equal(july.label, '2025/2026');
  });
});

describe('giving QR path builder', () => {
  it('builds give/now query paths without payment secrets', () => {
    assert.equal(buildGivePath({}), '/give/now');
    assert.equal(
      buildGivePath({ categorySlug: 'tithe', amount: '100', currency: 'ETB' }),
      '/give/now?fund=tithe&amount=100&currency=ETB'
    );
  });
});
