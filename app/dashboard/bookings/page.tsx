'use client';
import LeadList from '../_components/LeadList';

export default function BookingsPage() {
  return (
    <LeadList
      title="Bookings"
      description="Consultation and call booking requests"
      filter={l => l.classification === 'booking_request'}
      emptyMessage="No booking requests yet"
      showClassBadge={false}
      storageKey="bookings"
    />
  );
}
