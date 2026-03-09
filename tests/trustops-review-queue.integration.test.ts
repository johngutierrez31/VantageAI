import { describe, expect, it } from 'vitest';
import {
  buildTrustReviewQueueMetrics,
  getTrustReviewTiming,
  type TrustReviewItem
} from '../src/lib/trust/review-queue';

describe('trustops review queue timing', () => {
  it('flags overdue and due-soon items while excluding done work from active metrics', () => {
    const now = new Date('2026-03-07T12:00:00.000Z');
    const items: TrustReviewItem[] = [
      {
        id: 'q1',
        type: 'QUESTIONNAIRE',
        title: 'Buyer questionnaire',
        status: 'NEEDS_REVIEW',
        assignedReviewerUserId: null,
        assignedReviewerLabel: null,
        reviewDueAt: '2026-03-06T12:00:00.000Z',
        href: '/app/questionnaires/q1'
      },
      {
        id: 'map1',
        type: 'EVIDENCE_MAP',
        title: 'Acme Evidence Map',
        status: 'DRAFT',
        assignedReviewerUserId: 'user-1',
        assignedReviewerLabel: 'Alex',
        reviewDueAt: '2026-03-08T10:00:00.000Z',
        href: '/app/trust/evidence-maps/map1'
      },
      {
        id: 'packet1',
        type: 'TRUST_PACKET',
        title: 'Acme Packet',
        status: 'READY_TO_SHARE',
        assignedReviewerUserId: 'user-2',
        assignedReviewerLabel: 'Jordan',
        reviewDueAt: '2026-03-11T12:00:00.000Z',
        href: '/app/trust'
      }
    ];

    expect(getTrustReviewTiming(items[0], now)).toBe('OVERDUE');
    expect(getTrustReviewTiming(items[1], now)).toBe('DUE_SOON');
    expect(getTrustReviewTiming(items[2], now)).toBe('ON_TRACK');

    expect(buildTrustReviewQueueMetrics(items, now)).toEqual({
      total: 3,
      overdue: 1,
      dueSoon: 1,
      unassigned: 1
    });
  });

  it('treats approved, archived, shared, and exported work as done', () => {
    const now = new Date('2026-03-07T12:00:00.000Z');

    expect(
      getTrustReviewTiming(
        {
          id: 'done-1',
          type: 'EVIDENCE_MAP',
          title: 'Approved map',
          status: 'APPROVED',
          assignedReviewerUserId: 'user-1',
          assignedReviewerLabel: 'Alex',
          reviewDueAt: '2026-03-06T12:00:00.000Z',
          href: '/app/trust/evidence-maps/done-1'
        },
        now
      )
    ).toBe('DONE');
  });
});
