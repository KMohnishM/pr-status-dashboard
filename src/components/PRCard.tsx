import React from 'react';
import { PullRequestExtended } from '../hooks/useGitHubPRs';

interface PRCardProps {
  pr: PullRequestExtended;
}

export default function PRCard({ pr }: PRCardProps) {
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

  // Maps review state to badge classes and labels
  const getReviewBadge = (decision: PullRequestExtended['reviewDecision']) => {
    switch (decision) {
      case 'APPROVED':
        return <span className="badge badge-success">Approved</span>;
      case 'CHANGES_REQUESTED':
        return <span className="badge badge-error">Changes Requested</span>;
      case 'REVIEW_REQUIRED':
        return <span className="badge badge-warning">Review Required</span>;
      default:
        return <span className="badge badge-neutral">No Review Status</span>;
    }
  };

  // Maps CI status to badge classes and icons
  const getCIBadge = (status: PullRequestExtended['ciStatus']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Checks Passed
          </span>
        );
      case 'FAILURE':
        return (
          <span className="badge badge-error" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Checks Failed
          </span>
        );
      case 'PENDING':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <div className="spinner" style={{ width: '10px', height: '10px', borderWidth: '1.5px', borderTopColor: 'var(--warning)' }} />
            Checks Running
          </span>
        );
      default:
        return <span className="badge badge-neutral">No Checks</span>;
    }
  };

  // Maps mergeability and state to badge classes
  const getMergeBadge = (
    mergeable: PullRequestExtended['mergeable'],
    state: PullRequestExtended['state'],
    isDraft: boolean
  ) => {
    if (state === 'MERGED') {
      return <span className="badge badge-violet">Merged</span>;
    }
    if (state === 'CLOSED') {
      return <span className="badge badge-error" style={{ opacity: 0.8 }}>Closed</span>;
    }
    if (isDraft) {
      return <span className="badge badge-neutral">Draft</span>;
    }
    switch (mergeable) {
      case 'MERGEABLE':
        return <span className="badge badge-cyan">Ready to Merge</span>;
      case 'CONFLICTING':
        return <span className="badge badge-error">Merge Conflicts</span>;
      default:
        return <span className="badge badge-warning">Checking Merge...</span>;
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '220px' }}>
      {/* Repo Name & PR Number */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--secondary)' }}>
          {pr.repository.owner.login} / {pr.repository.name}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
          #{pr.number}
        </span>
      </div>

      {/* PR Title */}
      <div style={{ flexGrow: 1 }}>
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            textDecoration: 'none',
            lineHeight: 1.4,
            transition: 'color var(--transition-fast)',
          }}
          className="pr-title-link"
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        >
          {pr.title}
        </a>

        {/* Source -> Target Branch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
            {pr.headRefName}
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)' }}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span style={{ fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.05)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>
            {pr.baseRefName}
          </span>
        </div>
      </div>

      {/* Status Badges Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-glass)', borderBottom: '1px solid var(--border-glass)' }}>
        {getReviewBadge(pr.reviewDecision)}
        {getCIBadge(pr.ciStatus)}
        {getMergeBadge(pr.mergeable, pr.state, pr.isDraft)}
      </div>

      {/* Author, Labels, and Timestamp */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pr.author.avatarUrl}
            alt={pr.author.login}
            style={{ width: '22px', height: '22px', borderRadius: '50%' }}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {pr.author.login}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Display first 2 labels to keep cards clean */}
          {pr.labels.slice(0, 2).map((label) => (
            <span
              key={label.name}
              className="badge"
              style={{
                background: `#${label.color}1c`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}35`,
                fontSize: '0.7rem',
                padding: '0.15rem 0.45rem',
              }}
            >
              {label.name}
            </span>
          ))}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {getRelativeTime(pr.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
