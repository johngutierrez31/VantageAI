import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { getPublicTrustRoom } from '@/lib/trust/public-trust-room';
import { PublicTrustRoomRequestForm, PublicTrustRoomViewer } from '@/components/trust/public-trust-room';

function buildSearch(searchParams: { access?: string; grant?: string; ack?: string }) {
  const params = new URLSearchParams();
  if (searchParams.access) params.set('access', searchParams.access);
  if (searchParams.grant) params.set('grant', searchParams.grant);
  if (searchParams.ack) params.set('ack', searchParams.ack);
  const value = params.toString();
  return value ? `?${value}` : '';
}

export default async function TrustRoomPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: {
    access?: string;
    grant?: string;
    ack?: string;
  };
}) {
  const roomView = await getPublicTrustRoom({
    slug: params.slug,
    accessToken: searchParams.access,
    grantToken: searchParams.grant
  });

  if (!roomView) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <p className="text-sm text-slate-500">Trust room unavailable</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">This trust room could not be found.</h1>
        </div>
      </div>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: roomView.room.tenantId },
    select: { workspaceMode: true }
  });
  const demoMode = tenant?.workspaceMode === 'DEMO';

  const queryString = buildSearch(searchParams);
  const acknowledged = searchParams.ack === '1' || !roomView.room.termsRequired;

  if (roomView.canView && acknowledged) {
    await prisma.trustRoomEngagementEvent.create({
      data: {
        tenantId: roomView.room.tenantId,
        trustRoomId: roomView.room.id,
        trustPacketId: roomView.room.trustPacketId,
        accessRequestId: roomView.approvedRequest?.id ?? null,
        eventType: 'ROOM_VIEWED',
        actorEmail: roomView.approvedRequest?.requesterEmail ?? null,
        actorLabel: roomView.approvedRequest?.requesterName ?? null
      }
    });

    if (roomView.approvedRequest) {
      await prisma.trustRoomAccessRequest.update({
        where: { id: roomView.approvedRequest.id },
        data: {
          lastViewedAt: new Date(),
          viewCount: {
            increment: 1
          },
          status: roomView.approvedRequest.status === 'APPROVED' ? 'FULFILLED' : roomView.approvedRequest.status
        }
      });
    }
  }

  const coverSection = roomView.roomManifest.sections.find((section) => section.id === 'cover-summary');
  const teaserSections = roomView.roomManifest.sections.filter((section) =>
    ['cover-summary', 'executive-posture-summary', 'approved-contact-details'].includes(section.id)
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef4ff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        {!roomView.canView ? (
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">VantageCISO Trust Room</p>
              {demoMode ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                  Demo-safe sample deliverable
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{roomView.room.name}</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              {roomView.room.summaryText?.trim() ||
                'Buyer-safe trust materials are available through a review-gated external sharing workflow.'}
            </p>
            {demoMode ? (
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                This trust room belongs to a synthetic demo tenant and contains example data only.
              </p>
            ) : null}
            {coverSection?.items[0] ? (
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {Object.entries(coverSection.items[0])
                  .filter(([, value]) => value !== undefined && value !== null && value !== '')
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="mt-2 text-sm text-slate-900">{String(value)}</p>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {roomView.canView && !acknowledged ? (
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Acknowledgement Required</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">{roomView.room.name}</h1>
            <p className="mt-3 text-sm text-slate-600">
              Review of this trust room requires acknowledgement that these materials remain external-safe, limited to
              buyer diligence, and may not be redistributed outside the evaluation workflow.
            </p>
            {roomView.room.ndaRequired ? (
              <p className="mt-3 text-sm text-slate-600">
                This room is also marked as NDA-gated. Continue only if the seller confirms your NDA is already in place.
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/trust-room/${params.slug}${buildSearch({
                  access: searchParams.access,
                  grant: searchParams.grant,
                  ack: '1'
                })}`}
                className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
              >
                I Acknowledge And Continue
              </Link>
            </div>
          </div>
        ) : null}

        {roomView.canView && acknowledged ? (
          <PublicTrustRoomViewer
            roomName={roomView.room.name}
            organizationName={roomView.roomManifest.organizationName}
            sections={roomView.roomManifest.sections}
            demoMode={demoMode}
            viewerLabel={roomView.approvedRequest?.requesterName ?? roomView.approvedRequest?.requesterEmail ?? null}
            eventEndpoint={`/trust-room/${params.slug}/event${queryString}`}
            downloadLinks={{
              html: `/trust-room/${params.slug}/download${queryString ? `${queryString}&format=html` : '?format=html'}`,
              markdown: `/trust-room/${params.slug}/download${queryString ? `${queryString}&format=markdown` : '?format=markdown'}`,
              json: `/trust-room/${params.slug}/download${queryString ? `${queryString}&format=json` : '?format=json'}`
            }}
          />
        ) : null}

        {!roomView.canView && roomView.room.accessMode === 'PROTECTED_LINK' ? (
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Enter Your Protected Link</h2>
            <p className="mt-2 text-sm text-slate-600">
              This room is available through a protected buyer link. Use the access token provided by the seller or
              security team.
            </p>
            <form className="mt-6 grid gap-3" action={`/trust-room/${params.slug}`} method="get">
              <input
                type="text"
                name="access"
                placeholder="Paste access token"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white">
                Open Trust Room
              </button>
            </form>
          </div>
        ) : null}

        {!roomView.canView && roomView.room.accessMode === 'REQUEST_ACCESS' ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              {teaserSections.map((section) => (
                <div key={section.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {section.id === 'cover-summary' ? 'Overview' : section.title}
                  </h2>
                  <div className="mt-4 space-y-3">
                    {section.items.map((item, index) => (
                      <div key={`${section.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        {Object.entries(item)
                          .filter(([, value]) => value !== undefined && value !== null && value !== '')
                          .map(([key, value]) => (
                            <div key={key} className="mb-2 last:mb-0">
                              <p className="text-xs uppercase tracking-wide text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
                              <p className="mt-1 text-sm text-slate-900">{String(value)}</p>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <PublicTrustRoomRequestForm
                requestEndpoint={`/trust-room/${params.slug}/request`}
                roomName={roomView.room.name}
                demoMode={demoMode}
              />
            </div>
          </div>
        ) : null}

        {!roomView.canView && roomView.room.accessMode === 'INTERNAL_REVIEW' ? (
          <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">Internal Review Only</h2>
            <p className="mt-2 text-sm text-slate-600">
              This trust room is currently staged for internal review. Ask the seller or security contact to publish an
              external buyer link when review is complete.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
