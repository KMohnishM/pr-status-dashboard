'use client';

import React, { useState, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useGitHubPRs } from '../hooks/useGitHubPRs';
import PRCard from './PRCard';

type PRStateFilter = 'open' | 'closed' | 'merged' | 'all';
type ViewMode = 'card' | 'list';

export default function PRDashboard() {
  const { settings, isLoaded } = useSettings();
  
  // View and State filters
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [prState, setPrState] = useState<PRStateFilter>('open');

  const { prs, loading, error, refresh } = useGitHubPRs(settings, prState);

  // Filter states
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'mine' | 'reviews' | 'assigned'>('all');
  const [repoFilter, setRepoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Compute stat totals
  const stats = useMemo(() => {
    let mine = 0;
    let needsReview = 0;
    let failing = 0;
    let ready = 0;

    prs.forEach((pr) => {
      if (pr.isMine) mine++;
      if (pr.reviewDecision === 'REVIEW_REQUIRED') needsReview++;
      if (pr.ciStatus === 'FAILURE') failing++;
      if (pr.mergeable === 'MERGEABLE' && !pr.isDraft) ready++;
    });

    return { total: prs.length, mine, needsReview, failing, ready };
  }, [prs]);

  // Extract unique repositories for the filter dropdown
  const repositories = useMemo(() => {
    const reposSet = new Set<string>();
    prs.forEach((pr) => {
      reposSet.add(`${pr.repository.owner.login}/${pr.repository.name}`);
    });
    return Array.from(reposSet).sort();
  }, [prs]);

  // Filter the PR list based on user selections
  const filteredPrs = useMemo(() => {
    return prs.filter((pr) => {
      // 1. Search Query
      const matchSearch =
        pr.title.toLowerCase().includes(search.toLowerCase()) ||
        pr.headRefName.toLowerCase().includes(search.toLowerCase()) ||
        pr.repository.name.toLowerCase().includes(search.toLowerCase());

      // 2. Tab Filter
      let matchTab = true;
      if (tab === 'mine') matchTab = pr.isMine;
      if (tab === 'reviews') matchTab = pr.isReviewRequest;
      if (tab === 'assigned') matchTab = pr.isAssigned;

      // 3. Repo Filter
      let matchRepo = true;
      if (repoFilter !== 'all') {
        matchRepo = `${pr.repository.owner.login}/${pr.repository.name}` === repoFilter;
      }

      // 4. Status Filter
      let matchStatus = true;
      if (statusFilter === 'drafts') matchStatus = pr.isDraft;
      if (statusFilter === 'blocked') matchStatus = pr.mergeable === 'CONFLICTING' || pr.reviewDecision === 'CHANGES_REQUESTED';
      if (statusFilter === 'ready') matchStatus = pr.mergeable === 'MERGEABLE' && !pr.isDraft && pr.reviewDecision !== 'CHANGES_REQUESTED';
      if (statusFilter === 'failing') matchStatus = pr.ciStatus === 'FAILURE';

      return matchSearch && matchTab && matchRepo && matchStatus;
    });
  }, [prs, search, tab, repoFilter, statusFilter]);

  // Helper to format date relatively
  const getRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  // Maps review state to badge classes and labels for compact lists
  const getReviewBadge = (decision: string | null) => {
    switch (decision) {
      case 'APPROVED':
        return <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Approved</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Changes</span>;
      case 'REVIEW_REQUIRED':
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Review</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Pending</span>;
    }
  };

  // Maps CI status to badge classes for compact lists
  const getCIBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>✓ Passed</span>;
      case 'FAILURE':
        return <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>✗ Failed</span>;
      case 'PENDING':
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>● Running</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>No Checks</span>;
    }
  };

  // Maps mergeability and state to badge classes for compact lists
  const getMergeBadge = (mergeable: string, state: string, isDraft: boolean) => {
    if (state === 'MERGED') {
      return <span className="badge badge-violet" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Merged</span>;
    }
    if (state === 'CLOSED') {
      return <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem', opacity: 0.8 }}>Closed</span>;
    }
    if (isDraft) {
      return <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Draft</span>;
    }
    switch (mergeable) {
      case 'MERGEABLE':
        return <span className="badge badge-cyan" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Ready</span>;
      case 'CONFLICTING':
        return <span className="badge badge-error" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Conflicts</span>;
      default:
        return <span className="badge badge-warning" style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}>Checking</span>;
    }
  };

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  // Token missing state
  if (settings && !settings.token) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem', textAlign: 'center', margin: '4rem auto', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', color: 'var(--primary)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        </div>
        <h2>Connect GitHub to Begin</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
          Nova automatically aggregates pull requests across your active repositories. To sync your workflow, you need to connect your GitHub account using a Personal Access Token.
        </p>
        <button
          onClick={() => {
            const btn = document.querySelector('.sidebar-footer button') as HTMLButtonElement;
            if (btn) btn.click();
          }}
          className="btn btn-primary"
          style={{ padding: '0.85rem 2rem' }}
        >
          Open Settings & Connect
        </button>
      </div>
    );
  }

  const stateLabels = {
    open: 'Open',
    closed: 'Closed',
    merged: 'Merged',
    all: 'All',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header section */}
      <div className="page-header">
        <div className="page-title">
          <h2>Pull Request Dashboard</h2>
          <p>Real-time review cycles, CI checks, and {prState === 'open' ? 'merge health' : 'archive history'}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Card / List Layout Switcher */}
          <div className="view-switcher">
            <button
              type="button"
              className={`view-switcher-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" />
                <rect x="14" y="3" width="7" height="5" />
                <rect x="14" y="12" width="7" height="9" />
                <rect x="3" y="16" width="7" height="5" />
              </svg>
            </button>
            <button
              type="button"
              className={`view-switcher-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {loading && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
          
          <button onClick={refresh} disabled={loading} className="btn btn-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Analytics Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stateLabels[prState]} Pull Requests</h4>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem' }}>{stats.total}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Needs Review</h4>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--warning)' }}>{stats.needsReview}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--error)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failing Checks</h4>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--error)' }}>{stats.failing}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--success)' }}>
          <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready to Merge</h4>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--success)' }}>{stats.ready}</p>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Category Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', gap: '0.5rem', overflowX: 'auto' }}>
          <button
            onClick={() => setTab('all')}
            className="btn"
            style={{
              background: tab === 'all' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: tab === 'all' ? '#fff' : 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              border: tab === 'all' ? '1px solid var(--border-glass-active)' : '1px solid transparent',
            }}
          >
            All {stateLabels[prState]} ({stats.total})
          </button>
          <button
            onClick={() => setTab('mine')}
            className="btn"
            style={{
              background: tab === 'mine' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: tab === 'mine' ? '#fff' : 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              border: tab === 'mine' ? '1px solid var(--border-glass-active)' : '1px solid transparent',
            }}
          >
            Created by Me ({stats.mine})
          </button>
          <button
            onClick={() => setTab('reviews')}
            className="btn"
            style={{
              background: tab === 'reviews' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: tab === 'reviews' ? '#fff' : 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              border: tab === 'reviews' ? '1px solid var(--border-glass-active)' : '1px solid transparent',
            }}
          >
            Review Requests ({stats.needsReview})
          </button>
          <button
            onClick={() => setTab('assigned')}
            className="btn"
            style={{
              background: tab === 'assigned' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: tab === 'assigned' ? '#fff' : 'var(--text-secondary)',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              border: tab === 'assigned' ? '1px solid var(--border-glass-active)' : '1px solid transparent',
            }}
          >
            Assigned to Me
          </button>
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ gridColumn: 'span 1' }}>
            <span className="input-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="form-input"
              placeholder="Search by title, branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* GitHub PR State Dropdown */}
          <select
            className="form-select"
            value={prState}
            onChange={(e) => setPrState(e.target.value as PRStateFilter)}
          >
            <option value="open">Open PRs</option>
            <option value="merged">Merged PRs</option>
            <option value="closed">Closed PRs</option>
            <option value="all">All PRs</option>
          </select>

          <select
            className="form-select"
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
          >
            <option value="all">All Repositories</option>
            {repositories.map((repo) => (
              <option key={repo} value={repo}>
                {repo}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All States</option>
            <option value="ready">Ready to Merge</option>
            <option value="failing">CI Check Failing</option>
            <option value="blocked">Blocked / Changes Requested</option>
            <option value="drafts">Drafts Only</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="badge badge-error" style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem', flexShrink: 0 }}>
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>API Fetch Error:</strong> {error}. Ensure your Personal Access Token is valid.
          </div>
        </div>
      )}

      {/* PR Grid / List Display */}
      {filteredPrs.length > 0 ? (
        viewMode === 'card' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {filteredPrs.map((pr) => (
              <PRCard key={pr.id} pr={pr} />
            ))}
          </div>
        ) : (
          <div className="pr-list-container">
            {filteredPrs.map((pr) => (
              <div className="pr-list-row animate-fade-in" key={pr.id}>
                {/* Repo & Title */}
                <div className="pr-row-title-col">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--secondary)' }}>
                      {pr.repository.owner.login}/{pr.repository.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{pr.number}</span>
                  </div>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                  >
                    {pr.title}
                  </a>
                </div>

                {/* Status Badges */}
                <div className="pr-row-status-col">
                  {getReviewBadge(pr.reviewDecision)}
                  {getCIBadge(pr.ciStatus)}
                  {getMergeBadge(pr.mergeable, pr.state, pr.isDraft)}
                </div>

                {/* Author & Branches */}
                <div className="pr-row-meta-col">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pr.author.avatarUrl}
                    alt={pr.author.login}
                    style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {pr.author.login}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({pr.headRefName})</span>
                </div>

                {/* Relative Time */}
                <div className="pr-row-time-col">
                  {getRelativeTime(pr.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="glass-panel" style={{ padding: '5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <h3>No Pull Requests Found</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
            No pull requests matched your filter criteria or search queries. Try clearing search filters or checking repositories.
          </p>
        </div>
      )}
    </div>
  );
}
