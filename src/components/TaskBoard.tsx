'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Task, PullRequest } from '../types';
import { useSettings } from '../hooks/useSettings';
import { useGitHubPRs } from '../hooks/useGitHubPRs';

export default function TaskBoard() {
  const { settings } = useSettings();
  const { prs } = useGitHubPRs(settings);

  const [boardType, setBoardType] = useState<'all' | 'daily' | 'pr'>('all');
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('nova_tasks');
      if (stored) {
        return JSON.parse(stored);
      }
      // Set sample tasks if empty
      const sampleTasks: Task[] = [
        {
          id: 'sample-1',
          title: 'Welcome to Nova Board! 🚀',
          description: 'This is a sample task. You can move tasks between columns, link them to live PRs, set priorities, and track progress.',
          status: 'todo',
          priority: 'medium',
          category: 'feature',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sample-2',
          title: 'Configure GitHub Integration 🔑',
          description: 'Open Settings, enter your GitHub Personal Access Token, and sync your active pull requests to enable advanced linking.',
          status: 'in_progress',
          priority: 'high',
          category: 'other',
          createdAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('nova_tasks', JSON.stringify(sampleTasks));
      return sampleTasks;
    } catch {
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [category, setCategory] = useState<Task['category']>('feature');
  const [dueDate, setDueDate] = useState('');
  const [prUrl, setPrUrl] = useState('');

  // Sync tasks from local storage on updates
  const syncTasks = () => {
    try {
      const stored = localStorage.getItem('nova_tasks');
      if (stored) {
        setTasks(JSON.parse(stored));
      }
    } catch {
      console.error('Failed to sync tasks from localStorage');
    }
  };

  useEffect(() => {
    const handleSync = () => syncTasks();
    window.addEventListener('nova_tasks_updated', handleSync);
    return () => window.removeEventListener('nova_tasks_updated', handleSync);
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    try {
      localStorage.setItem('nova_tasks', JSON.stringify(newTasks));
      setTasks(newTasks);
    } catch {
      console.error('Failed to save tasks');
    }
  };


  const handleOpenAddModal = (colStatus: Task['status'] = 'todo') => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setStatus(colStatus);
    setPriority('medium');
    setCategory('feature');
    setDueDate('');
    setPrUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setCategory(task.category);
    setDueDate(task.dueDate || '');
    setPrUrl(task.prUrl || '');
    setIsModalOpen(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTask) {
      // Update
      const updated = tasks.map((t) =>
        t.id === editingTask.id
          ? {
              ...t,
              title: title.trim(),
              description: description.trim(),
              status,
              priority,
              category,
              dueDate: dueDate || undefined,
              prUrl: prUrl || undefined,
            }
          : t
      );
      saveTasks(updated);
    } else {
      // Create
      const newTask: Task = {
        id: Math.random().toString(36).substring(2, 11),
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        category,
        dueDate: dueDate || undefined,
        prUrl: prUrl || undefined,
        createdAt: new Date().toISOString(),
      };
      saveTasks([...tasks, newTask]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      saveTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const handleMoveTask = (id: string, newStatus: Task['status']) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t));
    saveTasks(updated);
  };

  // Find linked PR in current fetched PRs list
  const findLinkedPR = (url?: string): PullRequest | null => {
    if (!url) return null;
    return prs.find((pr) => pr.url === url) || null;
  };

  // Render a tiny status bubble for a linked PR
  const renderLinkedPRBadge = (url?: string) => {
    if (!url) return null;
    const pr = findLinkedPR(url);

    // Extract repo and number from URL if not found in cache
    let displayName = 'GitHub PR';
    try {
      const parts = new URL(url).pathname.split('/');
      if (parts.length >= 5) {
        displayName = `${parts[3]}/${parts[4]}#${parts[6]}`;
      }
    } catch {}

    if (!pr) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            textDecoration: 'none',
            marginTop: '0.5rem',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
          </svg>
          {displayName}
        </a>
      );
    }

    // Determine PR color/state
    let prColor = 'var(--text-muted)';
    if (pr.reviewDecision === 'APPROVED' && pr.ciStatus === 'SUCCESS' && pr.mergeable === 'MERGEABLE') {
      prColor = 'var(--success)';
    } else if (pr.reviewDecision === 'CHANGES_REQUESTED' || pr.ciStatus === 'FAILURE') {
      prColor = 'var(--error)';
    } else if (pr.isDraft) {
      prColor = 'var(--text-muted)';
    } else {
      prColor = 'var(--warning)';
    }

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.7rem',
          color: prColor,
          background: `${prColor}0d`,
          border: `1px solid ${prColor}25`,
          padding: '0.2rem 0.5rem',
          borderRadius: '4px',
          textDecoration: 'none',
          marginTop: '0.5rem',
          fontWeight: 600,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M18 15V9a4 4 0 0 0-4-4H9" />
          <line x1="6" y1="9" x2="6" y2="15" />
        </svg>
        {pr.repository.name} #{pr.number}
      </a>
    );
  };

  const columns: { name: string; status: Task['status']; color: string }[] = [
    { name: 'To Do', status: 'todo', color: 'var(--text-secondary)' },
    { name: 'In Progress', status: 'in_progress', color: 'var(--primary)' },
    { name: 'In Review', status: 'review', color: 'var(--warning)' },
    { name: 'Done', status: 'done', color: 'var(--success)' },
  ];

  // Filter tasks based on selected board type
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (boardType === 'pr') return !!t.prUrl;
      if (boardType === 'daily') return !t.prUrl;
      return true;
    });
  }, [tasks, boardType]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: Record<Task['status'], Task[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    };
    filteredTasks.forEach((t) => {
      if (groups[t.status]) groups[t.status].push(t);
    });
    return groups;
  }, [filteredTasks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flexGrow: 1 }}>
      {/* Header */}
      <div className="page-header">
        <div className="page-title">
          <h2>Task Board</h2>
          <p>Organize, schedule, and connect tasks to github progress</p>
        </div>

        <button onClick={() => handleOpenAddModal('todo')} className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.25rem' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Task
        </button>
      </div>

      {/* Board Switcher Tab */}
      <div className="board-switcher">
        <button
          className={`board-switcher-btn ${boardType === 'all' ? 'active' : ''}`}
          onClick={() => setBoardType('all')}
        >
          All Tasks ({tasks.length})
        </button>
        <button
          className={`board-switcher-btn ${boardType === 'daily' ? 'active' : ''}`}
          onClick={() => setBoardType('daily')}
        >
          Daily Tasks ({tasks.filter(t => !t.prUrl).length})
        </button>
        <button
          className={`board-switcher-btn ${boardType === 'pr' ? 'active' : ''}`}
          onClick={() => setBoardType('pr')}
        >
          PR Tasks ({tasks.filter(t => !!t.prUrl).length})
        </button>
      </div>

      {/* Board Layout */}
      <div className="board-columns">
        {columns.map((col) => {
          const colTasks = groupedTasks[col.status] || [];
          return (
            <div
              key={col.status}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                minHeight: '65vh',
                background: 'rgba(10, 7, 22, 0.45)',
                border: '1px solid var(--border-glass)',
              }}
            >
              {/* Column Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{col.name}</h3>
                </div>
                <span className="badge badge-neutral">{colTasks.length}</span>
              </div>

              {/* Task Cards Container */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1, overflowY: 'auto' }}>
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    className="glass-card"
                    style={{
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      borderLeft: `3px solid ${
                        task.priority === 'high'
                          ? 'var(--error)'
                          : task.priority === 'medium'
                          ? 'var(--warning)'
                          : 'var(--secondary)'
                      }`,
                    }}
                  >
                    {/* Header: Category & Priority */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="badge badge-violet" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', textTransform: 'capitalize' }}>
                        {task.category}
                      </span>
                      <span
                        className={`badge ${
                          task.priority === 'high'
                            ? 'badge-error'
                            : task.priority === 'medium'
                            ? 'badge-warning'
                            : 'badge-cyan'
                        }`}
                        style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', textTransform: 'capitalize' }}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4
                        onClick={() => handleOpenEditModal(task)}
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          lineHeight: 1.3,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)')}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Linked PR */}
                    {task.prUrl && renderLinkedPRBadge(task.prUrl)}

                    {/* Footer: Due Date & Move controls */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '0.65rem' }}>
                      {/* Due Date */}
                      {task.dueDate ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: 'var(--error)' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          <span>{task.dueDate}</span>
                        </div>
                      ) : (
                        <span />
                      )}

                      {/* Move Controls */}
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {col.status !== 'todo' && (
                          <button
                            onClick={() => {
                              const prevs: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
                              const curIdx = prevs.indexOf(col.status);
                              handleMoveTask(task.id, prevs[curIdx - 1]);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem', borderRadius: '4px' }}
                            title="Move left"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="15 18 9 12 15 6" />
                            </svg>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem', borderRadius: '4px' }}
                          title="Edit Task"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {col.status !== 'done' && (
                          <button
                            onClick={() => {
                              const nexts: Task['status'][] = ['todo', 'in_progress', 'review', 'done'];
                              const curIdx = nexts.indexOf(col.status);
                              handleMoveTask(task.id, nexts[curIdx + 1]);
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem', borderRadius: '4px' }}
                            title="Move right"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div
                    onClick={() => handleOpenAddModal(col.status)}
                    style={{
                      border: '1.5px dashed var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass-active)';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-glass)';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    + Add task to {col.name}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Creation & Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div
            className="glass-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '500px',
              maxWidth: '90%',
              margin: 'auto',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'rgba(10, 7, 24, 0.95)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              border: '1px solid var(--border-glass)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{editingTask ? 'Edit Task' : 'Create Task'}</h2>
              <button
                className="drawer-close"
                onClick={() => setIsModalOpen(false)}
                style={{ padding: '0.25rem', borderRadius: '4px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="settings-group">
                <label htmlFor="task-title">Title *</label>
                <input
                  id="task-title"
                  type="text"
                  required
                  className="form-input"
                  style={{ paddingLeft: '1rem' }}
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="settings-group">
                <label htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  className="form-input"
                  style={{ paddingLeft: '1rem', height: '100px', resize: 'vertical' }}
                  placeholder="Brief details about the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    className="form-select"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="settings-group">
                  <label htmlFor="task-category">Category</label>
                  <select
                    id="task-category"
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Task['category'])}
                  >
                    <option value="feature">Feature</option>
                    <option value="bug">Bug Fix</option>
                    <option value="docs">Documentation</option>
                    <option value="refactor">Refactor</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="settings-group">
                  <label htmlFor="task-status">Status</label>
                  <select
                    id="task-status"
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Task['status'])}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>

                <div className="settings-group">
                  <label htmlFor="task-due">Due Date</label>
                  <input
                    id="task-due"
                    type="date"
                    className="form-input"
                    style={{ paddingLeft: '1rem' }}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {(!prUrl && boardType === 'daily') ? null : (
              <div className="settings-group">
                <label htmlFor="task-pr">Link Pull Request</label>
                <select
                  id="task-pr"
                  className="form-select"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                >
                  <option value="">-- No Linked PR --</option>
                  {prs.map((pr) => (
                    <option key={pr.id} value={pr.url}>
                      {pr.repository.name} #{pr.number} - {pr.title.substring(0, 30)}...
                    </option>
                  ))}
                </select>
                <p>Connecting a task to a PR pulls live merge, review, and checks statuses onto your card.</p>
              </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                {editingTask && (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTask(editingTask.id);
                      setIsModalOpen(false);
                    }}
                    className="btn btn-danger"
                    style={{ flexShrink: 0 }}
                  >
                    Delete
                  </button>
                )}
                
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flexGrow: 1 }}
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
