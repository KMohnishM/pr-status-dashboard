import { useState, useEffect, useCallback, useRef } from 'react';
import { PullRequest, SettingsState } from '../types';

export interface PullRequestExtended extends PullRequest {
  isMine: boolean;
  isReviewRequest: boolean;
  isAssigned: boolean;
}

interface GraphQLPRLabel {
  name: string;
  color: string;
}

interface GraphQLCommitNode {
  commit?: {
    statusCheckRollup?: {
      state: 'SUCCESS' | 'FAILURE' | 'ERROR' | 'PENDING' | 'EXPECTED';
    };
  };
}

interface GraphQLPRNode {
  id: string;
  title: string;
  url: string;
  number: number;
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
  author: {
    login: string;
    avatarUrl: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  isDraft: boolean;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  headRefName: string;
  baseRefName: string;
  labels?: {
    nodes?: GraphQLPRLabel[];
  };
  commits?: {
    nodes?: GraphQLCommitNode[];
  };
}

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

const PR_DETAILS_FRAGMENT = `
  fragment PRDetails on PullRequest {
    id
    title
    url
    number
    repository {
      name
      owner {
        login
      }
    }
    author {
      login
      avatarUrl
    }
    createdAt
    updatedAt
    state
    isDraft
    mergeable
    reviewDecision
    headRefName
    baseRefName
    labels(first: 5) {
      nodes {
        name
        color
      }
    }
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup {
            state
          }
        }
      }
    }
  }
`;

const FETCH_PRS_QUERY = `
  query ($authorQuery: String!, $reviewQuery: String!, $assigneeQuery: String!) {
    created: search(query: $authorQuery, type: ISSUE, first: 40) {
      nodes {
        ...PRDetails
      }
    }
    reviewRequested: search(query: $reviewQuery, type: ISSUE, first: 40) {
      nodes {
        ...PRDetails
      }
    }
    assigned: search(query: $assigneeQuery, type: ISSUE, first: 40) {
      nodes {
        ...PRDetails
      }
    }
  }
  ${PR_DETAILS_FRAGMENT}
`;

export function useGitHubPRs(
  settings: SettingsState | null,
  prState: 'open' | 'closed' | 'merged' | 'all' = 'open'
) {
  const [prs, setPrs] = useState<PullRequestExtended[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPRs = useCallback(async () => {
    if (!settings || !settings.token || !settings.username) {
      setPrs([]);
      setError('GitHub authentication token or username is missing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build queries. Support custom repos constraint if specified
      const repoConstraint = settings.customRepos
        ? settings.customRepos
            .split(',')
            .map((r) => `repo:${r.trim()}`)
            .join(' ')
        : '';

      let stateQuery = 'state:open';
      if (prState === 'closed') stateQuery = 'state:closed is:unmerged';
      else if (prState === 'merged') stateQuery = 'is:merged';
      else if (prState === 'all') stateQuery = '';

      const authorQuery = `type:pr ${stateQuery} author:${settings.username} ${repoConstraint}`.replace(/\s+/g, ' ').trim();
      const reviewQuery = `type:pr ${stateQuery} review-requested:${settings.username} ${repoConstraint}`.replace(/\s+/g, ' ').trim();
      const assigneeQuery = `type:pr ${stateQuery} assignee:${settings.username} ${repoConstraint}`.replace(/\s+/g, ' ').trim();

      const response = await fetch(GITHUB_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          Authorization: `bearer ${settings.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: FETCH_PRS_QUERY,
          variables: {
            authorQuery,
            reviewQuery,
            assigneeQuery,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const resBody = await response.json();

      if (resBody.errors && resBody.errors.length > 0) {
        throw new Error(resBody.errors[0].message);
      }

      const data = resBody.data;
      if (!data) {
        throw new Error('No data received from GitHub GraphQL API');
      }

      // Map raw GraphQL elements to our PR structure
      const mapPR = (node: GraphQLPRNode): PullRequest => {
        const ciStatusRaw = node.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state;
        let ciStatus: PullRequest['ciStatus'] = 'UNKNOWN';
        if (ciStatusRaw === 'SUCCESS') ciStatus = 'SUCCESS';
        else if (ciStatusRaw === 'FAILURE' || ciStatusRaw === 'ERROR') ciStatus = 'FAILURE';
        else if (ciStatusRaw === 'PENDING') ciStatus = 'PENDING';

        return {
          id: node.id,
          title: node.title,
          url: node.url,
          number: node.number,
          repository: {
            name: node.repository.name,
            owner: {
              login: node.repository.owner.login,
            },
          },
          author: {
            login: node.author?.login || 'ghost',
            avatarUrl: node.author?.avatarUrl || 'https://github.com/identicons/ghost.png',
          },
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          state: node.state,
          isDraft: node.isDraft,
          mergeable: node.mergeable,
          reviewDecision: node.reviewDecision,
          headRefName: node.headRefName,
          baseRefName: node.baseRefName,
          labels: (node.labels?.nodes || []).map((l) => ({
            name: l.name,
            color: l.color,
          })),
          ciStatus,
        };
      };

      // Extract lists
      const createdNodes = (data.created?.nodes || []) as GraphQLPRNode[];
      const reviewNodes = (data.reviewRequested?.nodes || []) as GraphQLPRNode[];
      const assignedNodes = (data.assigned?.nodes || []) as GraphQLPRNode[];

      // Deduplicate into a single map and tag them
      const prsMap = new Map<string, PullRequestExtended>();

      createdNodes.forEach((node) => {
        if (!node) return;
        const pr = mapPR(node);
        prsMap.set(pr.id, {
          ...pr,
          isMine: true,
          isReviewRequest: false,
          isAssigned: false,
        });
      });

      reviewNodes.forEach((node) => {
        if (!node) return;
        const pr = mapPR(node);
        const existing = prsMap.get(pr.id);
        if (existing) {
          existing.isReviewRequest = true;
        } else {
          prsMap.set(pr.id, {
            ...pr,
            isMine: false,
            isReviewRequest: true,
            isAssigned: false,
          });
        }
      });

      assignedNodes.forEach((node) => {
        if (!node) return;
        const pr = mapPR(node);
        const existing = prsMap.get(pr.id);
        if (existing) {
          existing.isAssigned = true;
        } else {
          prsMap.set(pr.id, {
            ...pr,
            isMine: false,
            isReviewRequest: false,
            isAssigned: true,
          });
        }
      });

      // Sort by updatedAt descending
      const sortedPrs = Array.from(prsMap.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setPrs(sortedPrs);
    } catch (err: unknown) {
      console.error('Error fetching PRs:', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch pull requests from GitHub';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [settings, prState]);

  // Set up polling and initial fetch
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    if (settings?.token && settings?.username) {
      // Defer state update to avoid calling it synchronously inside the effect run
      const initialFetchTimer = setTimeout(() => {
        fetchPRs();
      }, 0);

      // Poll at the configured interval (or fallback to 5 minutes)
      const interval = settings.pollInterval || 300000;
      pollTimerRef.current = setInterval(() => {
        fetchPRs();
      }, interval);

      return () => {
        clearTimeout(initialFetchTimer);
        if (pollTimerRef.current) {
          clearInterval(pollTimerRef.current);
        }
      };
    } else {
      const resetTimer = setTimeout(() => {
        setPrs([]);
        setError('GitHub authentication token or username is missing');
      }, 0);
      return () => clearTimeout(resetTimer);
    }
  }, [settings?.token, settings?.username, settings?.pollInterval, settings?.customRepos, prState, fetchPRs]);

  return { prs, loading, error, refresh: fetchPRs };
}

