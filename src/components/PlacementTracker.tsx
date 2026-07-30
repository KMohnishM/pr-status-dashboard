'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlacementEvent } from '../types/placements';

export default function PlacementTracker() {
  const [placements, setPlacements] = useState<PlacementEvent[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlacementEvent | null>(null);
  
  // View states: 'timeline' | 'pipeline'
  const [viewMode, setViewMode] = useState<'timeline' | 'pipeline'>('timeline');
  const [search, setSearch] = useState('');

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('');
  const [ctc, setCtc] = useState('');
  const [status, setStatus] = useState<PlacementEvent['status']>('wishlist');
  const [eventType, setEventType] = useState<PlacementEvent['eventType']>('application_deadline');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');

  // Load placements from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nova_placements');
      if (stored) {
        setPlacements(JSON.parse(stored));
      } else {
        // Sample data for Placement Season
        const samplePlacements: PlacementEvent[] = [
          {
            id: 'sample-p1',
            companyName: 'Google',
            role: 'Software Engineer Intern',
            ctc: '1.2L / month',
            status: 'test',
            eventType: 'online_test',
            eventDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days later
            eventTime: '18:00',
            notes: 'Syllabus: Data structures, Algorithms, and System concepts. 2 Coding questions.',
            link: 'https://careers.google.com',
          },
          {
            id: 'sample-p2',
            companyName: 'Microsoft',
            role: 'Software Engineer',
            ctc: '51 LPA',
            status: 'interview',
            eventType: 'interview',
            eventDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], // 5 days later
            eventTime: '10:00',
            notes: 'Round 1: DSA & OOP concepts. Review resume projects.',
            link: 'https://careers.microsoft.com',
          },
          {
            id: 'sample-p3',
            companyName: 'Uber',
            role: 'SDE-1',
            ctc: '35 LPA',
            status: 'applied',
            eventType: 'application_deadline',
            eventDate: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0], // 1 day later
            eventTime: '23:59',
            notes: 'Submit resume before deadline. Referred by senior.',
          },
        ];
        localStorage.setItem('nova_placements', JSON.stringify(samplePlacements));
        setPlacements(samplePlacements);
      }
    } catch {
      setPlacements([]);
    }
  }, []);

  const saveEvents = (newEvents: PlacementEvent[]) => {
    try {
      localStorage.setItem('nova_placements', JSON.stringify(newEvents));
      setPlacements(newEvents);
    } catch {
      console.error('Failed to save placements');
    }
  };

  const handleOpenAddModal = () => {
    setEditingEvent(null);
    setCompanyName('');
    setRole('');
    setCtc('');
    setStatus('wishlist');
    setEventType('application_deadline');
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventTime('');
    setNotes('');
    setLink('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (event: PlacementEvent) => {
    setEditingEvent(event);
    setCompanyName(event.companyName);
    setRole(event.role);
    setCtc(event.ctc || '');
    setStatus(event.status);
    setEventType(event.eventType);
    setEventDate(event.eventDate);
    setEventTime(event.eventTime || '');
    setNotes(event.notes || '');
    setLink(event.link || '');
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    const updated = placements.filter((e) => e.id !== id);
    saveEvents(updated);
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !role.trim() || !eventDate) return;

    if (editingEvent) {
      const updated = placements.map((item) =>
        item.id === editingEvent.id
          ? { ...item, companyName, role, ctc, status, eventType, eventDate, eventTime, notes, link }
          : item
      );
      saveEvents(updated);
    } else {
      const newEvent: PlacementEvent = {
        id: `p-${Date.now()}`,
        companyName,
        role,
        ctc,
        status,
        eventType,
        eventDate,
        eventTime,
        notes,
        link,
      };
      saveEvents([...placements, newEvent]);
    }
    setIsModalOpen(false);
  };

  // Helper stats
  const stats = useMemo(() => {
    const counts = {
      total: placements.length,
      tests: placements.filter((p) => p.status === 'test').length,
      interviews: placements.filter((p) => p.status === 'interview').length,
      offers: placements.filter((p) => p.status === 'offered').length,
    };
    return counts;
  }, [placements]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    return placements
      .filter(
        (p) =>
          p.companyName.toLowerCase().includes(search.toLowerCase()) ||
          p.role.toLowerCase().includes(search.toLowerCase()) ||
          (p.notes && p.notes.toLowerCase().includes(search.toLowerCase()))
      )
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [placements, search]);

  const pipelineColumns: { label: string; status: PlacementEvent['status']; color: string }[] = [
    { label: 'Wishlist', status: 'wishlist', color: 'var(--text-muted)' },
    { label: 'Applied', status: 'applied', color: 'var(--primary)' },
    { label: 'Online Test', status: 'test', color: 'var(--warning)' },
    { label: 'Interviewing', status: 'interview', color: 'var(--secondary)' },
    { label: 'Offered 🎉', status: 'offered', color: 'var(--success)' },
    { label: 'Rejected', status: 'rejected', color: 'var(--error)' },
  ];

  // Days left badge
  const getDaysLeftBadge = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return <span className="badge badge-error">Today</span>;
    } else if (diffDays === 1) {
      return <span className="badge badge-warning">Tomorrow</span>;
    } else if (diffDays < 0) {
      return <span className="badge badge-neutral">Ended</span>;
    } else {
      return <span className="badge badge-violet">{diffDays} days left</span>;
    }
  };

  const getEventIcon = (type: PlacementEvent['eventType']) => {
    switch (type) {
      case 'application_deadline':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'online_test':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
      case 'interview':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
    }
  };

  const getStatusBadge = (s: PlacementEvent['status']) => {
    switch (s) {
      case 'wishlist':
        return <span className="badge badge-neutral">Wishlist</span>;
      case 'applied':
        return <span className="badge badge-violet">Applied</span>;
      case 'test':
        return <span className="badge badge-warning">Test scheduled</span>;
      case 'interview':
        return <span className="badge badge-cyan">Interview</span>;
      case 'offered':
        return <span className="badge badge-success">Offered</span>;
      default:
        return <span className="badge badge-error">Rejected</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1 }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h2>Placement Season Timeline</h2>
          <p>Track deadlines, online test timings, and company interview schedules</p>
        </div>

        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Event
        </button>
      </div>

      {/* Placement Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Applications</h4>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{stats.total}</p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Online Tests</h4>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--warning)' }}>{stats.tests}</p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--secondary)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Interviews</h4>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--secondary)' }}>{stats.interviews}</p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Offers Received</h4>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--success)' }}>{stats.offers}</p>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="board-switcher">
          <button
            className={`board-switcher-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            Chronological Timeline
          </button>
          <button
            className={`board-switcher-btn ${viewMode === 'pipeline' ? 'active' : ''}`}
            onClick={() => setViewMode('pipeline')}
          >
            Application Pipeline
          </button>
        </div>

        <div className="input-group" style={{ maxWidth: '300px' }}>
          <span className="input-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="form-input"
            placeholder="Search company or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Render Mode: Timeline */}
      {viewMode === 'timeline' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredEvents.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No company events found. Click &quot;Add Event&quot; to populate your timeline!
            </div>
          ) : (
            filteredEvents.map((item) => (
              <div
                key={item.id}
                className="pr-list-row"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 120px',
                  cursor: 'pointer',
                  padding: '1.25rem 1.75rem',
                }}
                onClick={() => handleOpenEditModal(item)}
              >
                {/* Title & Role */}
                <div className="pr-row-title-col">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>
                      {item.companyName}
                    </span>
                    {item.ctc && <span className="badge badge-violet">{item.ctc}</span>}
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.role}</span>
                </div>

                {/* Event Type & Time */}
                <div className="pr-row-status-col">
                  <span
                    className={`badge ${
                      item.eventType === 'online_test'
                        ? 'badge-warning'
                        : item.eventType === 'interview'
                        ? 'badge-cyan'
                        : 'badge-neutral'
                    }`}
                  >
                    {getEventIcon(item.eventType)}
                    {item.eventType.replace('_', ' ')}
                  </span>
                  {item.eventTime && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      🕒 {item.eventTime}
                    </span>
                  )}
                </div>

                {/* Status and Job link */}
                <div className="pr-row-meta-col">
                  {getStatusBadge(item.status)}
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ color: 'var(--primary)', textDecoration: 'none', display: 'inline-flex' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Days remaining count */}
                <div className="pr-row-time-col">
                  {getDaysLeftBadge(item.eventDate)}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {item.eventDate}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Render Mode: Application Pipeline Kanban */
        <div className="board-columns" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {pipelineColumns.map((col) => {
            const colEvents = placements.filter((p) => p.status === col.status);
            return (
              <div
                key={col.status}
                className="glass-panel"
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: '50vh',
                  background: 'rgba(10, 7, 22, 0.45)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{col.label}</h3>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {colEvents.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', flexGrow: 1 }}>
                  {colEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="glass-card animate-fade-in"
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                      onClick={() => handleOpenEditModal(evt)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                          {evt.companyName}
                        </span>
                        {evt.ctc && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700 }}>
                            {evt.ctc}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {evt.role}
                      </span>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center' }}>
                          📅 {evt.eventDate}
                        </span>
                        {getDaysLeftBadge(evt.eventDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="settings-drawer" onClick={(e) => e.stopPropagation()} style={{ width: '440px' }}>
            <div className="drawer-header">
              <h2 style={{ fontSize: '1.25rem' }}>
                {editingEvent ? 'Edit Placement Event' : 'Add Placement Event'}
              </h2>
              <button className="drawer-close" onClick={() => setIsModalOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="settings-section" style={{ borderBottom: 'none' }}>
              <div className="settings-group">
                <label htmlFor="comp-name">Company Name</label>
                <input
                  id="comp-name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. Amazon"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="settings-group">
                <label htmlFor="comp-role">Role</label>
                <input
                  id="comp-role"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="e.g. Systems Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label htmlFor="comp-ctc">CTC / Package (Optional)</label>
                  <input
                    id="comp-ctc"
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    placeholder="e.g. 24 LPA"
                    value={ctc}
                    onChange={(e) => setCtc(e.target.value)}
                  />
                </div>

                <div className="settings-group">
                  <label htmlFor="comp-status">Pipeline Status</label>
                  <select
                    id="comp-status"
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PlacementEvent['status'])}
                  >
                    <option value="wishlist">Wishlist</option>
                    <option value="applied">Applied</option>
                    <option value="test">Online Test</option>
                    <option value="interview">Interviewing</option>
                    <option value="offered">Offered 🎉</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label htmlFor="event-type">Event Type</label>
                  <select
                    id="event-type"
                    className="form-select"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as PlacementEvent['eventType'])}
                  >
                    <option value="application_deadline">Deadline</option>
                    <option value="online_test">Online Test</option>
                    <option value="interview">Interview</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="settings-group">
                  <label htmlFor="event-time">Event Time (Optional)</label>
                  <input
                    id="event-time"
                    type="time"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="settings-group">
                <label htmlFor="event-date">Event Date</label>
                <input
                  id="event-date"
                  type="date"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>

              <div className="settings-group">
                <label htmlFor="comp-link">Application Link (Optional)</label>
                <input
                  id="comp-link"
                  type="url"
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="https://..."
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>

              <div className="settings-group">
                <label htmlFor="comp-notes">Notes / Syllabus</label>
                <textarea
                  id="comp-notes"
                  className="form-input"
                  style={{ paddingLeft: '1rem', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Insert event syllabus, project questions, or meeting links..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="btn btn-danger"
                    style={{ flexShrink: 0 }}
                  >
                    Delete
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                  {editingEvent ? 'Save Changes' : 'Add Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
