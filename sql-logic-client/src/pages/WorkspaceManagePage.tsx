import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Trash2, UserPlus, X, Users, Search,
  Shield, Crown, User, Mail, MoreVertical,
  CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, LogOut, UserCog, Eye, Hash, Edit3, ChevronDown,
  Link2, Copy, Clock,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { workspaceApi } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props { user: any; }

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_META: Record<Role, { label: string; bg: string; text: string; border: string; dot: string }> = {
  OWNER:  { label: 'Owner',  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
  ADMIN:  { label: 'Admin',  bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  MEMBER: { label: 'Member', bg: 'bg-emerald-50',text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  VIEWER: { label: 'Viewer', bg: 'bg-slate-100', text: 'text-slate-600',  border: 'border-slate-200',  dot: 'bg-slate-400' },
};

function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'md' }) {
  const m = ROLE_META[role as Role];
  if (!m) return null;
  const sz = size === 'md' ? 'text-xs px-2.5 py-0.5' : 'text-[10px] px-1.5 py-0.5';
  return (
    <span className={`${sz} rounded font-medium border ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 group hover:border-slate-300 transition-all">
      <div className={`p-2.5 rounded-lg ${accent || 'bg-blue-50'} group-hover:scale-105 transition-transform`}>
        <Icon size={18} className={accent ? 'text-white' : 'text-blue-600'} />
      </div>
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MemberAvatar({ initial, role }: { initial: string; role: string }) {
  const m = ROLE_META[role as Role];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border ${m?.border || 'border-slate-200'} ${m?.bg || 'bg-slate-50'} ${m?.text || 'text-slate-500'}`}>
      {initial.charAt(0).toUpperCase()}
    </div>
  );
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

function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 mb-4">
        <Icon size={40} className="text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-xs text-slate-500 max-w-[220px] mb-4">{desc}</p>
      {action}
    </div>
  );
}

export default function WorkspaceManagePage({ user }: Props) {
  const { workspaces, setWorkspaces } = useWorkspaceStore();
  const [selectedWs, setSelectedWs] = useState<number | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ wsId: number; userId: number; name: string } | null>(null);
  const [showDeleteWs, setShowDeleteWs] = useState<number | null>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showInviteLinks, setShowInviteLinks] = useState(false);
  const [newInviteRole, setNewInviteRole] = useState('MEMBER');
  const [newInviteHours, setNewInviteHours] = useState(72);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'ok' | 'err' } | null>(null);

  const toast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const reload = () => {
    setLoading(true);
    workspaceApi.list().then(res => {
      if (res.code === 200 && Array.isArray(res.data)) setWorkspaces(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  const loadMembers = (wsId: number) => {
    workspaceApi.listMembers(wsId).then(res => {
      if (res.code === 200 && Array.isArray(res.data)) setMembers(res.data);
    }).catch(() => {});
  };

  useEffect(() => { reload(); }, []);
  useEffect(() => {
    if (selectedWs) loadMembers(selectedWs); else setMembers([]);
    if (selectedWs && showInviteLinks) loadInvitations(selectedWs);
  }, [selectedWs, showInviteLinks]);

  const loadInvitations = (wsId: number) => {
    workspaceApi.listInvitations(wsId).then(res => {
      if (res.code === 200 && Array.isArray(res.data)) setInvitations(res.data);
    }).catch(() => {});
  };

  const handleCreateInvitationLink = async () => {
    if (!selectedWs) return;
    setCreatingLink(true);
    const res = await workspaceApi.createInvitation(selectedWs, { role: newInviteRole, expiresInHours: newInviteHours });
    if (res.code === 200) {
      loadInvitations(selectedWs);
      toast('Invitation link created');
    } else {
      toast(res.message || 'Failed to create link', 'err');
    }
    setCreatingLink(false);
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    if (!selectedWs) return;
    const res = await workspaceApi.revokeInvitation(selectedWs, invitationId);
    if (res.code === 200) {
      loadInvitations(selectedWs);
      toast('Invitation revoked');
    } else {
      toast(res.message || 'Failed to revoke', 'err');
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await workspaceApi.create({ name: newName, description: newDesc || undefined });
    if (res.code === 200) { setShowCreate(false); setNewName(''); setNewDesc(''); reload(); toast('Workspace created'); }
    else toast(res.message || 'Failed to create', 'err');
  };

  const handleDelete = async (id: number) => {
    const res = await workspaceApi.delete(id);
    if (res.code === 200) { setSelectedWs(null); setShowDeleteWs(null); reload(); toast('Workspace deleted'); }
    else toast(res.message || 'Failed to delete', 'err');
  };

  const handleAddMember = async () => {
    if (!selectedWs || !inviteUserId.trim()) return;
    const uid = parseInt(inviteUserId, 10);
    if (isNaN(uid)) { toast('Invalid user ID', 'err'); return; }
    const res = await workspaceApi.addMember(selectedWs, { userId: uid, role: inviteRole });
    if (res.code === 200) { setInviting(false); setInviteUserId(''); loadMembers(selectedWs); reload(); toast('Member added'); }
    else toast(res.message || 'Failed to add member', 'err');
  };

  const handleRemoveMember = async (memberUserId: number) => {
    if (!selectedWs || !confirmRemove) return;
    const res = await workspaceApi.removeMember(selectedWs, memberUserId);
    if (res.code === 200) { loadMembers(selectedWs); reload(); toast('Member removed'); }
    else toast(res.message || 'Failed to remove', 'err');
    setConfirmRemove(null);
  };

  const handleRoleChange = async (memberUserId: number, newRole: string) => {
    if (!selectedWs) return;
    const res = await workspaceApi.updateMember(selectedWs, memberUserId, { role: newRole });
    if (res.code === 200) { loadMembers(selectedWs); toast('Role updated'); }
    else toast(res.message || 'Failed to update role', 'err');
  };

  const selected = workspaces.find(w => w.id === selectedWs);
  const canManage = selected?.role === 'OWNER' || selected?.role === 'ADMIN';
  const totalMembers = workspaces.reduce((sum, w) => sum + (w.memberCount || 0), 0);

  return (
    <div className="min-h-full">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Workspace Management</h1>
            <p className="text-xs text-slate-500 mt-0.5">create and manage team workspaces</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          >
            <Plus size={14} /> Create Workspace
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="Total Workspaces" value={workspaces.length} />
          <StatCard icon={Users} label="Total Members" value={totalMembers} />
          <StatCard icon={Shield} label="Your Role" value={selected?.role || '-'} accent="bg-blue-600" />
          <StatCard icon={Hash} label="Active Workspace" value={selected?.name || 'None'} accent="bg-emerald-600" />
        </div>

        {/* Main Grid: Workspace List + Details */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* LEFT: Workspace List */}
          <section className="col-span-12 lg:col-span-5 space-y-3">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-900">Workspaces</h3>
                <span className="text-[10px] text-slate-500">{workspaces.length} total</span>
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : workspaces.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No workspaces yet"
                    desc="Create a workspace to collaborate with your team"
                    action={
                      <button
                        onClick={() => setShowCreate(true)}
                        className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                      >
                        <Plus size={14} /> Create Workspace
                      </button>
                    }
                  />
                ) : workspaces.map(w => {
                  const meta = ROLE_META[w.role as Role];
                  return (
                    <div
                      key={w.id}
                      onClick={() => setSelectedWs(w.id)}
                      className={`p-3 cursor-pointer transition-all hover:bg-slate-50 ${
                        selectedWs === w.id ? 'bg-blue-50 border-l-2 border-l-blue-600' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${meta?.dot || 'bg-slate-300'}`} />
                            <span className="text-sm font-semibold text-slate-900 truncate">{w.name}</span>
                          </div>
                          {w.description && (
                            <p className="text-[11px] text-slate-500 mt-1 truncate ml-4">{w.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 ml-4">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Users size={10} /> {w.memberCount}
                            </span>
                            <RoleBadge role={w.role} />
                          </div>
                        </div>
                        {w.role === 'OWNER' && (
                        <button
                          onClick={e => { e.stopPropagation(); setShowDeleteWs(w.id); }}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* RIGHT: Workspace Detail & Member Management */}
          <section className="col-span-12 lg:col-span-7">
            {selectedWs && selected ? (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Building2 size={16} className="text-blue-600" />
                      {selected.name}
                    </h3>
                    {selected.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{selected.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      ID: {selected.id}
                    </span>
                    <RoleBadge role={selected.role} size="md" />
                  </div>
                </div>

                {/* Members Section */}
                <div className="p-4">
                  {/* Tab Switch */}
                  <div className="flex items-center border-b border-slate-200 mb-4">
                    <button
                      onClick={() => setShowInviteLinks(false)}
                      className={`px-3 py-2 text-[10px] font-semibold border-b-2 transition-colors ${
                        !showInviteLinks
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Users size={12} className="inline mr-1" /> Members ({members.length})
                    </button>
                    {canManage && (
                    <button
                      onClick={() => { setShowInviteLinks(true); if (selectedWs) loadInvitations(selectedWs); }}
                      className={`px-3 py-2 text-[10px] font-semibold border-b-2 transition-colors ${
                        showInviteLinks
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Link2 size={12} className="inline mr-1" /> Invite Links ({invitations.length})
                    </button>
                    )}
                  </div>

                  {!showInviteLinks && (
                  <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                      <Users size={14} className="text-slate-500" />
                      Members ({members.length})
                    </h4>
                    {canManage && (
                    <button
                      onClick={() => setInviting(true)}
                      className="btn-primary flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold"
                    >
                      <UserPlus size={12} /> Invite
                    </button>
                    )}
                  </div>

                  {/* Invite Form — only visible to users with manage permission */}
                  <AnimatePresence>
                    {inviting && canManage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="bg-slate-50 border border-blue-200 rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Invite Member</span>
                            <button onClick={() => { setInviting(false); setInviteUserId(''); }} className="text-slate-400 hover:text-slate-900">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">User ID</label>
                              <input
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                value={inviteUserId}
                                onChange={e => setInviteUserId(e.target.value)}
                                placeholder="Enter user ID..."
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                              <div className="relative">
                                <select
                                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none pr-6"
                                  value={inviteRole}
                                  onChange={e => setInviteRole(e.target.value)}
                                >
                                  <option value="ADMIN">Admin</option>
                                  <option value="MEMBER">Member</option>
                                  <option value="VIEWER">Viewer</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-1.5 top-2.5 pointer-events-none text-slate-400" />
                              </div>
                            </div>
                            <button
                              onClick={handleAddMember}
                              className="btn-primary px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5"
                            >
                              <UserPlus size={13} /> Add
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Member List */}
                  <div className="space-y-1">
                    {members.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No members yet. Invite someone to collaborate.
                      </div>
                    ) : members.map(m => {
                      const mRole = ROLE_META[m.role as Role];
                      const isOwner = m.role === 'OWNER';
                      return (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors rounded border border-slate-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MemberAvatar initial={m.username || m.userId.toString()} role={m.role} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {m.username || `User #${m.userId}`}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                ID: {m.userId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwner ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${mRole?.bg} ${mRole?.text} ${mRole?.border}`}>
                                Owner
                              </span>
                            ) : canManage ? (
                              <div className="relative">
                                <select
                                  className="bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-900 py-0.5 pl-1.5 pr-5 appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 outline-none"
                                  value={m.role}
                                  onChange={e => handleRoleChange(m.userId, e.target.value)}
                                >
                                  <option value="ADMIN">Admin</option>
                                  <option value="MEMBER">Member</option>
                                  <option value="VIEWER">Viewer</option>
                                </select>
                                <ChevronDown size={10} className="absolute right-1 top-1 pointer-events-none text-slate-400" />
                              </div>
                            ) : (
                              <RoleBadge role={m.role} />
                            )}
                            {!isOwner && canManage && (
                              <button
                                onClick={() => setConfirmRemove({ wsId: selectedWs, userId: m.userId, name: m.username || `User #${m.userId}` })}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                  )}

                  {/* Invitation Links Tab */}
                  {showInviteLinks && (
                  <div>
                    {/* Create Invitation Link */}
                    <div className="mb-4 bg-slate-50 border border-blue-200 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Create Invite Link</span>
                      </div>
                      <div className="flex items-end gap-2">
                        <div>
                          <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Role</label>
                          <div className="relative">
                            <select
                              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none pr-6"
                              value={newInviteRole}
                              onChange={e => setNewInviteRole(e.target.value)}
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="MEMBER">Member</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                            <ChevronDown size={12} className="absolute right-1.5 top-2.5 pointer-events-none text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Expires in</label>
                          <select
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none pr-6"
                            value={newInviteHours}
                            onChange={e => setNewInviteHours(parseInt(e.target.value))}
                          >
                            <option value={1}>1 hour</option>
                            <option value={24}>24 hours</option>
                            <option value={72}>3 days</option>
                            <option value={168}>7 days</option>
                            <option value={720}>30 days</option>
                          </select>
                        </div>
                        <button
                          onClick={handleCreateInvitationLink}
                          disabled={creatingLink}
                          className="btn-primary px-3 py-1.5 text-[11px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
                        >
                          {creatingLink ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />}
                          Generate
                        </button>
                      </div>
                    </div>

                    {/* Invitation Links List */}
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {invitations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs">
                          No invitation links yet. Generate one to share with collaborators.
                        </div>
                      ) : invitations.map(inv => {
                        const expired = new Date(inv.expiresAt).getTime() <= Date.now();
                        return (
                          <div
                            key={inv.id}
                            className={`flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors rounded border ${
                              !inv.isActive || expired ? 'border-slate-100 opacity-50' : 'border-slate-100'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold ${inv.isActive && !expired ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {inv.role}
                                </span>
                                {!inv.isActive && (
                                  <span className="text-[9px] text-red-500">Revoked</span>
                                )}
                                {expired && inv.isActive && (
                                  <span className="text-[9px] text-amber-500">Expired</span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[9px] text-slate-400 flex items-center gap-1">
                                  <Clock size={9} />
                                  {formatExpiry(inv.expiresAt)}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  Used: {inv.useCount}{inv.maxUses ? `/${inv.maxUses}` : ''}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {inv.isActive && !expired && (
                                <>
                                  <button
                                    onClick={() => handleCopyLink(inv.token)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                                    title="Copy link"
                                  >
                                    {copiedToken === inv.token ? <CheckCircle2 size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvitation(inv.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Revoke"
                                  >
                                    <X size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  )}
                </div>

                {/* Footer Info */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Created by user #{selected.ownerId}
                  </span>
                  {selected.role === 'OWNER' && (
                    <button
                      onClick={() => setShowDeleteWs(selected.id)}
                      className="btn-danger flex items-center gap-1 px-2 py-1 text-[10px]"
                    >
                      <Trash2 size={10} /> Delete Workspace
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg h-full">
                <EmptyState
                  icon={Building2}
                  title="Select a Workspace"
                  desc="Choose a workspace from the left to view and manage its members"
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-lg w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900">Create Workspace</span>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name <span className="text-red-600">*</span></label>
                  <input
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mt-1"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="My Team Workspace"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Description <span className="text-slate-400">(optional)</span></label>
                  <textarea
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 mt-1 resize-none"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Brief description of this workspace..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
                <button
                  onClick={() => setShowCreate(false)}
                  className="btn-ghost px-4 py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="btn-primary px-4 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Workspace Confirm */}
      {showDeleteWs !== null && (
        <ConfirmDialog
          title="Delete Workspace"
          message={`Are you sure you want to delete "${workspaces.find(w => w.id === showDeleteWs)?.name}"? All members will lose access. This action cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(showDeleteWs)}
          onCancel={() => setShowDeleteWs(null)}
        />
      )}

      {/* Remove Member Confirm */}
      {confirmRemove && (
        <ConfirmDialog
          title="Remove Member"
          message={`Remove ${confirmRemove.name} from this workspace? They will lose access immediately.`}
          confirmLabel="Remove"
          variant="danger"
          onConfirm={() => handleRemoveMember(confirmRemove.userId)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border text-xs font-medium flex items-center gap-2 shadow-lg ${
              toastMsg.type === 'ok'
                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                : 'border-red-200 text-red-700 bg-red-50'
            }`}
          >
            {toastMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
