'use client';
import LeadList from '../_components/LeadList';

export default function EnquiriesPage() {
  return (
    <LeadList
      title="Enquiries"
      description="General questions and information requests"
      filter={l => l.classification === 'general_enquiry'}
      emptyMessage="No enquiries yet"
      showClassBadge={false}
      storageKey="enquiries"
    />
  );
}
