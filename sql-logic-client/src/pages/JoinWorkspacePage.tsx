import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, UserCheck, Clock, Shield, AlertTriangle, CheckCircle2,
  Loader2, LogIn, UserPlus, Copy, ExternalLink, X,
} from 'lucide-react';
import { workspaceApi } from '../api/client';
import type { Page } from '../types';

interface Props {
  token: string;
  user: any;
  onPageChange: (page: Page) => void;
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function JoinWorkspacePage({ token, user, onPageChange }: Props) {
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    workspaceApi.getInvitationByToken(token)
      .then(res => {
        if (res.code === 200 && res.data) {
          setInvitation(res.data);
        } else {
          setError(res.message || 'Invalid invitation');
        }
      })
      .catch(() => setError('Failed to load invitation'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    const res = await workspaceApi.acceptInvitation(token);
    if (res.code === 200) {
      setAccepted(true);
    } else {
      setError(res.message || 'Failed to accept invitation');
    }
    setAccepting(false);
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen bg-surface">
        <div className="max-w-lg mx-auto p-6 mt-12">
          <div className="border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <div className="p-3 rounded-xl bg-primary/10 inline-flex mb-4">
              <Building2 size={32} className="text-primary" />
            </div>
            <h2 className="text-sm font-mono font-semibold text-on-surface mb-2">Workspace Invitation</h2>
            <p className="text-xs text-on-surface-variant/70 font-mono mb-6 max-w-sm mx-auto">
              You need to sign in or create an account to accept this workspace invitation.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('invite_redirect', token);
                  onPageChange('login');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <LogIn size={14} /> Sign In
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('invite_redirect', token);
                  onPageChange('login');
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors"
              >
                <UserPlus size={14} /> Register
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen bg-surface">
        <div className="max-w-lg mx-auto p-6 mt-12">
          <div className="border border-outline-variant bg-surface-container-lowest p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
            <p className="text-xs font-mono text-on-surface-variant">Loading invitation details...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen bg-surface">
        <div className="max-w-lg mx-auto p-6 mt-12">
          <div className="border border-error/30 bg-error/5 p-6 text-center">
            <AlertTriangle size={28} className="text-error mx-auto mb-3" />
            <h2 className="text-sm font-mono font-semibold text-on-surface mb-1">Invitation Error</h2>
            <p className="text-xs font-mono text-on-surface-variant/70">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (accepted) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen bg-surface">
        <div className="max-w-lg mx-auto p-6 mt-12">
          <div className="border border-success/30 bg-success/5 p-8 text-center">
            <CheckCircle2 size={36} className="text-success mx-auto mb-3" />
            <h2 className="text-sm font-mono font-semibold text-on-surface mb-1">Successfully Joined!</h2>
            <p className="text-xs font-mono text-on-surface-variant/70 mb-6">
              You are now a member of <span className="font-semibold text-on-surface">{invitation?.workspaceName}</span>
            </p>
            <button
              onClick={() => onPageChange('workspace-manage')}
              className="px-4 py-2 text-xs font-mono font-semibold border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              Go to Workspace
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!invitation) return null;

  const isExpired = new Date(invitation.expiresAt).getTime() <= Date.now();

  if (isExpired || !invitation.isActive) {
    return (
      <main className="ml-[200px] pt-12 min-h-screen bg-surface">
        <div className="max-w-lg mx-auto p-6 mt-12">
          <div className="border border-amber-500/30 bg-amber-500/5 p-8 text-center">
            <Clock size={28} className="text-amber-500 mx-auto mb-3" />
            <h2 className="text-sm font-mono font-semibold text-on-surface mb-1">
              {isExpired ? 'Invitation Expired' : 'Invitation Revoked'}
            </h2>
            <p className="text-xs font-mono text-on-surface-variant/70 mb-4">
              {isExpired
                ? 'This invitation link has expired. Please ask the workspace admin for a new one.'
                : 'This invitation has been revoked by the workspace admin.'}
            </p>
            <button
              onClick={() => onPageChange('dashboard')}
              className="px-4 py-2 text-xs font-mono font-semibold border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface">
      <div className="max-w-lg mx-auto p-6 mt-12">
        <div className="border border-outline-variant bg-surface-container-lowest overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 font-mono">Workspace Invitation</p>
                <p className="text-sm font-semibold text-on-surface font-mono">{invitation.workspaceName}</p>
              </div>
            </div>
            <p className="text-xs text-on-surface-variant/70 font-mono leading-relaxed">
              You have been invited to join this workspace. Accept to start collaborating on projects, tasks, and documents.
            </p>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4 bg-surface-container-high/20">
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-outline-variant/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Shield size={12} className="text-on-surface-variant/50" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60 font-mono">Role</span>
                </div>
                <span className="text-sm font-semibold font-mono text-on-surface">{invitation.role}</span>
              </div>
              <div className="border border-outline-variant/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock size={12} className="text-on-surface-variant/50" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60 font-mono">Expires</span>
                </div>
                <span className="text-sm font-semibold font-mono text-on-surface">{formatExpiry(invitation.expiresAt)}</span>
              </div>
            </div>
            {invitation.creatorName && (
              <div className="border border-outline-variant/30 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <UserCheck size={12} className="text-on-surface-variant/50" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/60 font-mono">Invited by</span>
                </div>
                <span className="text-sm font-semibold font-mono text-on-surface">{invitation.creatorName}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-6 border-t border-outline-variant">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="w-full py-2.5 text-xs font-mono font-semibold border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {accepting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
