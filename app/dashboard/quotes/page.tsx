'use client';
import LeadList from '../_components/LeadList';

export default function QuotesPage() {
  return (
    <LeadList
      title="Quotes"
      description="Quote requests needing a proposal"
      filter={l => l.classification === 'quote_request'}
      emptyMessage="No quote requests yet"
      showClassBadge={false}
      storageKey="quotes"
    />
  );
}
