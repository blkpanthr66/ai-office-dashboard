'use client';
import LeadList from '../_components/LeadList';

export default function ComplaintsPage() {
  return (
    <LeadList
      title="Complaints"
      description="Existing client issues — respond promptly"
      filter={l => l.classification === 'existing_customer'}
      emptyMessage="No complaints — all clients are happy!"
      showClassBadge={false}
      storageKey="complaints"
    />
  );
}
