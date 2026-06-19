'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

type Lead = {
  id: string;
  classification: string;
  urgency: string;
  status: string;
  pipeline_stage: string | null;
  deal_value: number | null;
  ai_summary: string;
  source_page: string;
  created_at: string;
  contacts: { name: string; email: string } | null;
};

const stages = [
  { key: 'new',         label: 'New',           color: 'border-t-emerald-400', dot: 'bg-emerald-400',  text: 'text-emerald-400', description: 'Just came in' },
  { key: 'in_progress', label: 'In Progress',   color: 'border-t-blue-400',   dot: 'bg-blue-400',     text: 'text-blue-400',    description: 'Actively working on it' },
  { key: 'pending',     label: 'Pending',       color: 'border-t-amber-400',  dot: 'bg-amber-400',    text: 'text-amber-400',   description: 'Waiting on client' },
  { key: 'sent',        label: 'Proposal Sent', color: 'border-t-purple-400', dot: 'bg-purple-400',   text: 'text-purple-400',  description: 'Awaiting decision' },
  { key: 'booked',      label: 'Booked',        color: 'border-t-sky-400',    dot: 'bg-sky-400',      text: 'text-sky-400',     description: 'Booking confirmed' },
  { key: 'resolved',    label: 'Resolved',      color: 'border-t-teal-400',   dot: 'bg-teal-400',     text: 'text-teal-400',    description: 'Complaint / enquiry closed' },
  { key: 'won',         label: 'Won',           color: 'border-t-cyan-400',   dot: 'bg-cyan-400',     text: 'text-cyan-400',    description: 'Deal closed' },
  { key: 'rejected',    label: 'Lost',          color: 'border-t-slate-500',  dot: 'bg-slate-500',    text: 'text-slate-400',   description: 'No longer proceeding' },
];

const stageMap = Object.fromEntries(stages.map(s => [s.key, s]));

function getStage(lead: Lead) {
  return lead.pipeline_stage || lead.status || 'new';
}

function avatarColor(name: string) {
  const colors = ['bg-cyan-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

type LeadCardProps = {
  lead: Lead;
  draggable?: boolean;
  dragging: string | null;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  moveToStage: (id: string, stage: string) => void;
};

function LeadCard({ lead, draggable: isDraggable, dragging, onDragStart, onDragEnd, moveToStage }: LeadCardProps) {
  const name = lead.contacts?.name || 'Unknown';
  return (
    <div
      draggable={isDraggable}
      onDragStart={isDraggable ? e => onDragStart(e, lead.id) : undefined}
      onDragEnd={isDraggable ? onDragEnd : undefined}
      className={`bg-[#080c14] border border-white/8 hover:border-white/20 rounded-xl p-4 transition-all ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging === lead.id ? 'opacity-40 scale-95' : ''}`}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded-full ${avatarColor(name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
          {initials(name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold truncate">{name}</p>
          <p className="text-slate-600 text-xs truncate">{lead.contacts?.email}</p>
        </div>
        {lead.urgency === 'urgent' && (
          <span className="text-red-400 text-xs font-bold shrink-0">⚡</span>
        )}
      </div>
      <p className="text-slate-500 text-xs line-clamp-2 mb-3">{lead.ai_summary}</p>
      <div className="flex items-center justify-between gap-2">
        {lead.deal_value ? (
          <span className="text-emerald-400 text-xs font-semibold">${lead.deal_value.toLocaleString()}</span>
        ) : (
          <span className="text-slate-700 text-xs">—</span>
        )}
        <div className="flex items-center gap-2">
          <select
            value={getStage(lead)}
            onChange={e => moveToStage(lead.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            className="text-xs bg-white/5 border border-white/8 rounded-lg px-2 py-1 text-slate-400 focus:outline-none focus:border-cyan-400/50 lg:hidden"
          >
            {stages.map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <Link
            href={`/dashboard/${lead.id}`}
            className="text-slate-600 hover:text-cyan-400 text-xs transition-colors shrink-0"
            onClick={e => e.stopPropagation()}
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['new', 'in_progress', 'pending']));
  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => { fetchLeads(); }, []);

  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*, contacts(name, email)')
      .order('created_at', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }

  async function moveToStage(leadId: string, newStage: string) {
    // Snapshot previous state for rollback
    const previous = leads.find(l => l.id === leadId);
    if (!previous) return;

    const statusUpdate: Record<string, string> = { pipeline_stage: newStage };
    if (newStage === 'won' || newStage === 'rejected') statusUpdate.status = newStage;

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...statusUpdate } : l));

    const { error } = await supabase.from('leads').update(statusUpdate).eq('id', leadId);

    if (error) {
      // Rollback
      setLeads(prev => prev.map(l => l.id === leadId ? previous : l));
      if (error.message.includes('column') || error.code === '42703') {
        setErrorMsg('The pipeline_stage column is missing. Please run supabase-crm-upgrade.sql in Supabase SQL Editor first.');
      } else {
        setErrorMsg(`Failed to save: ${error.message}`);
      }
      setTimeout(() => setErrorMsg(''), 6000);
    }
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  function onDragOver(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(stageKey);
  }

  function onDrop(e: React.DragEvent, stageKey: string) {
    e.preventDefault();
    if (dragging) moveToStage(dragging, stageKey);
    setDragging(null);
    setDragOver(null);
  }

  function scrollToStage(key: string) {
    const col = columnRefs.current[key];
    if (col && boardRef.current) {
      boardRef.current.scrollTo({ left: col.offsetLeft - 24, behavior: 'smooth' });
    }
  }

  // ── Mobile accordion toggle ────────────────────────────────────────────────
  function toggleStage(key: string) {
    setExpandedStages(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const totalValue = leads
    .filter(l => getStage(l) === 'won' && l.deal_value)
    .reduce((s, l) => s + (l.deal_value || 0), 0);


  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Sub-header */}
      <div className="border-b border-white/8 px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 gap-4">
        <div>
          <h1 className="text-white font-semibold">Pipeline</h1>
          <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">
            {leads.length} leads · Drag cards to move stages
          </p>
          <p className="text-slate-500 text-xs mt-0.5 sm:hidden">
            {leads.length} leads · Use dropdown to move stages
          </p>
        </div>
        <div className="flex items-center gap-3">
          {totalValue > 0 && (
            <div className="bg-cyan-400/10 border border-cyan-400/20 rounded-xl px-3 py-1.5 text-right">
              <div className="text-cyan-400 font-bold">${totalValue.toLocaleString()}</div>
              <div className="text-slate-500 text-xs">Won</div>
            </div>
          )}
          <button onClick={fetchLeads} className="text-slate-500 hover:text-white transition-colors" title="Refresh">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl px-4 py-3 shrink-0">
          {errorMsg}
        </div>
      )}

      {/* ── Stage navigator (desktop) ──────────────────────────────────────── */}
      {!loading && (
        <div className="hidden lg:flex items-center gap-1.5 px-6 py-2 border-b border-white/5 shrink-0 overflow-x-auto">
          {stages.map(stage => {
            const count = leads.filter(l => getStage(l) === stage.key).length;
            return (
              <button
                key={stage.key}
                onClick={() => scrollToStage(stage.key)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/4 hover:bg-white/8 transition-colors shrink-0"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                <span className="text-slate-400 text-xs">{stage.label}</span>
                {count > 0 && <span className={`text-xs font-bold ${stage.text}`}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-600">Loading pipeline...</div>
      ) : (
        <>
          {/* ── DESKTOP: horizontal Kanban (lg+) ───────────────────────────── */}
          <div className="hidden lg:flex flex-1 relative">
            {/* Right fade hint */}
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#080c14] to-transparent z-10" />
            <div ref={boardRef} className="flex-1 overflow-x-auto p-5 scroll-smooth">
            <div className="flex gap-2.5 h-full" style={{ minWidth: 'max-content' }}>
              {stages.map(stage => {
                const stageLeads = leads.filter(l => getStage(l) === stage.key);
                const isOver = dragOver === stage.key;
                return (
                  <div
                    key={stage.key}
                    ref={el => { columnRefs.current[stage.key] = el; }}
                    className="w-56 flex flex-col"
                    onDragOver={e => onDragOver(e, stage.key)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => onDrop(e, stage.key)}
                  >
                    {/* Column header */}
                    <div className={`bg-[#0d1420] border border-t-2 ${stage.color} ${isOver ? 'border-white/20' : 'border-white/8'} rounded-xl p-3 mb-2 transition-colors`}>
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                          <span className="text-white text-xs font-semibold">{stage.label}</span>
                        </div>
                        <span className="text-slate-600 text-xs bg-white/5 px-1.5 py-0.5 rounded-full">{stageLeads.length}</span>
                      </div>
                      <p className="text-slate-700 text-xs pl-3.5">{stage.description}</p>
                    </div>

                    {/* Drop zone + cards */}
                    <div className={`flex-1 space-y-2 overflow-y-auto pr-0.5 rounded-xl transition-colors ${isOver ? 'bg-white/3' : ''}`}>
                      {stageLeads.length === 0 && (
                        <div className={`border-2 border-dashed rounded-xl p-5 text-center text-xs transition-colors ${isOver ? 'border-cyan-400/30 text-cyan-700' : 'border-white/5 text-slate-700'}`}>
                          {isOver ? 'Drop here' : 'Empty'}
                        </div>
                      )}
                      {stageLeads.map(lead => (
                        <LeadCard key={lead.id} lead={lead} draggable dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} moveToStage={moveToStage} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          </div>

          {/* ── MOBILE / TABLET: vertical accordion (< lg) ─────────────────── */}
          <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-2">
            {stages.map(stage => {
              const stageLeads = leads.filter(l => getStage(l) === stage.key);
              const isOpen = expandedStages.has(stage.key);
              return (
                <div key={stage.key} className={`bg-[#0d1420] border border-white/8 rounded-2xl overflow-hidden`}>
                  {/* Accordion header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => toggleStage(stage.key)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                      <span className="text-white text-sm font-semibold">{stage.label}</span>
                      <span className="text-slate-600 text-xs">{stage.description}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {stageLeads.length > 0 && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 ${stage.text}`}>
                          {stageLeads.length}
                        </span>
                      )}
                      <svg
                        className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Cards */}
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      {stageLeads.length === 0 ? (
                        <p className="text-slate-700 text-xs text-center py-4">No leads in this stage</p>
                      ) : (
                        stageLeads.map(lead => (
                          <LeadCard key={lead.id} lead={lead} dragging={dragging} onDragStart={onDragStart} onDragEnd={onDragEnd} moveToStage={moveToStage} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
