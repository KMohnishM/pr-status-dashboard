// Core Types for Nova Dashboard

export interface GitHubUser {
  login: string;
  avatarUrl: string;
  name?: string;
}

export interface PRLabel {
  name: string;
  color: string;
}

export interface PullRequest {
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
  };
  createdAt: string;
  updatedAt: string;
  state: 'OPEN' | 'MERGED' | 'CLOSED';
  isDraft: boolean;
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  reviewDecision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null;
  headRefName: string;
  baseRefName: string;
  labels: PRLabel[];
  ciStatus: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  category: 'feature' | 'bug' | 'docs' | 'refactor' | 'other';
  dueDate?: string;
  prUrl?: string; // Link to a PR tracked in the dashboard
  createdAt: string;
}

export interface SettingsState {
  token: string;
  username: string;
  avatarUrl: string;
  name: string;
  pollInterval: number; // in milliseconds
  customRepos: string; // Comma separated list of repositories
}
