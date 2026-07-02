import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, Plus, Trash2, UserPlus, X, Users, Search,
  Shield, Crown, User, Mail, MoreVertical,
  CheckCircle2, AlertTriangle, RefreshCw,
  Loader2, LogOut, UserCog, Eye, Hash, Edit3, ChevronDown,
} from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { workspaceApi } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

interface Props { user: any; }

type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_META: Record<Role, { label: string; bg: string; text: string; border: string; dot: string }> = {
  OWNER:  { label: 'Owner',  bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  ADMIN:  { label: 'Admin',  bg: 'bg-blue-500/15',  text: 'text-blue-400',  border: 'border-blue-500/30',  dot: 'bg-blue-400' },
  MEMBER: { label: 'Member', bg: 'bg-emerald-500/15',text: 'text-emerald-400',border: 'border-emerald-500/30',dot: 'bg-emerald-400' },
  VIEWER: { label: 'Viewer', bg: 'bg-gray-500/15',  text: 'text-gray-400',  border: 'border-gray-500/30',  dot: 'bg-gray-400' },
};

function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'sm' | 'md' }) {
  const m = ROLE_META[role as Role];
  if (!m) return null;
  const sz = size === 'md' ? 'text-xs px-2.5 py-0.5' : 'text-[10px] px-1.5 py-0.5';
  return (
    <span className={`${sz} rounded font-bold border font-mono ${m.bg} ${m.text} ${m.border}`}>
      {m.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 p-4 flex items-center gap-4 group hover:border-outline-variant/60 transition-all">
      <div className={`p-2.5 rounded-lg ${accent || 'bg-primary/10'} group-hover:scale-105 transition-transform`}>
        <Icon size={18} className={accent ? 'text-white' : 'text-primary'} />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70 font-mono">{label}</p>
        <p className="text-lg font-bold font-mono text-on-surface mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function MemberAvatar({ initial, role }: { initial: string; role: string }) {
  const m = ROLE_META[role as Role];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${m?.border || 'border-outline-variant/50'} ${m?.bg || 'bg-surface-container-high'} ${m?.text || 'text-on-surface-variant'}`}>
      {initial.charAt(0).toUpperCase()}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: { icon: any; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/20 mb-4">
        <Icon size={40} className="text-on-surface-variant/40" />
      </div>
      <p className="text-sm font-semibold text-on-surface mb-1">{title}</p>
      <p className="text-xs text-on-surface-variant/70 max-w-[220px] mb-4">{desc}</p>
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
  }, [selectedWs]);

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
  const totalMembers = workspaces.reduce((sum, w) => sum + (w.memberCount || 0), 0);

  return (
    <main className="ml-[200px] pt-12 min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-sm font-mono font-semibold text-on-surface">Workspace Management</h1>
            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">create and manage team workspaces</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold
              border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors active:bg-primary/15"
          >
            <Plus size={14} /> Create Workspace
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard icon={Building2} label="Total Workspaces" value={workspaces.length} />
          <StatCard icon={Users} label="Total Members" value={totalMembers} />
          <StatCard icon={Shield} label="Your Role" value={selected?.role || '-'} accent="bg-blue-500/20" />
          <StatCard icon={Hash} label="Active Workspace" value={selected?.name || 'None'} accent="bg-emerald-500/20" />
        </div>

        {/* Main Grid: Workspace List + Details */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* LEFT: Workspace List */}
          <section className="col-span-12 lg:col-span-5 space-y-3">
            <div className="border border-outline-variant bg-surface-container-lowest">
              <div className="p-3 border-b border-outline-variant flex items-center justify-between">
                <h3 className="text-xs font-mono font-semibold text-on-surface">Workspaces</h3>
                <span className="text-[10px] text-on-surface-variant font-mono">{workspaces.length} total</span>
              </div>

              <div className="max-h-[520px] overflow-y-auto divide-y divide-outline-variant/50">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-on-surface-variant/60" />
                  </div>
                ) : workspaces.length === 0 ? (
                  <EmptyState
                    icon={Building2}
                    title="No workspaces yet"
                    desc="Create a workspace to collaborate with your team"
                    action={
                      <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold
                          border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors active:bg-primary/15"
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
                      className={`p-3 cursor-pointer transition-all hover:bg-surface-container-high/50 ${
                        selectedWs === w.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${meta?.dot || 'bg-outline-variant'}`} />
                            <span className="text-sm font-semibold text-on-surface truncate">{w.name}</span>
                          </div>
                          {w.description && (
                            <p className="text-[11px] text-on-surface-variant/70 mt-1 truncate ml-4">{w.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 ml-4">
                            <span className="text-[10px] text-on-surface-variant/50 font-mono flex items-center gap-1">
                              <Users size={10} /> {w.memberCount}
                            </span>
                            <RoleBadge role={w.role} />
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setShowDeleteWs(w.id); }}
                          className="p-1.5 text-on-surface-variant/40 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
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
              <div className="border border-outline-variant bg-surface-container-lowest">
                <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-mono font-semibold text-on-surface flex items-center gap-2">
                      <Building2 size={16} className="text-primary" />
                      {selected.name}
                    </h3>
                    {selected.description && (
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{selected.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant/50 font-mono">
                      ID: {selected.id}
                    </span>
                    <RoleBadge role={selected.role} size="md" />
                  </div>
                </div>

                {/* Members Section */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-mono font-semibold text-on-surface flex items-center gap-1.5">
                      <Users size={14} className="text-on-surface-variant/70" />
                      Members ({members.length})
                    </h4>
                    <button
                      onClick={() => setInviting(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-mono font-semibold
                        border border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-colors active:bg-primary/15"
                    >
                      <UserPlus size={12} /> Invite
                    </button>
                  </div>

                  {/* Invite Form */}
                  <AnimatePresence>
                    {inviting && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="bg-surface-container-high border border-primary/20 p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider font-mono">Invite Member</span>
                            <button onClick={() => { setInviting(false); setInviteUserId(''); }} className="text-on-surface-variant hover:text-on-surface">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider font-mono">User ID</label>
                              <input
                                className="w-full bg-surface-container-low border-none px-2.5 py-1.5 text-xs text-on-surface focus:ring-2 focus:ring-primary/30 font-mono"
                                value={inviteUserId}
                                onChange={e => setInviteUserId(e.target.value)}
                                placeholder="Enter user ID..."
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-wider font-mono">Role</label>
                              <div className="relative">
                                <select
                                  className="bg-surface-container-low border-none px-2.5 py-1.5 text-xs text-on-surface focus:ring-2 focus:ring-primary/30 appearance-none pr-6"
                                  value={inviteRole}
                                  onChange={e => setInviteRole(e.target.value)}
                                >
                                  <option value="ADMIN">Admin</option>
                                  <option value="MEMBER">Member</option>
                                  <option value="VIEWER">Viewer</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-1.5 top-2 pointer-events-none text-on-surface-variant" />
                              </div>
                            </div>
                            <button
                              onClick={handleAddMember}
                              className="px-3 py-1.5 text-[11px] font-mono font-semibold flex items-center gap-1.5
                                border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors active:bg-primary/15"
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
                      <div className="text-center py-8 text-on-surface-variant/50 text-xs font-mono">
                        No members yet. Invite someone to collaborate.
                      </div>
                    ) : members.map(m => {
                      const mRole = ROLE_META[m.role as Role];
                      const isOwner = m.role === 'OWNER';
                      return (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between px-3 py-2 bg-surface-container-high/30 hover:bg-surface-container-high/50 transition-colors border border-outline-variant/10"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <MemberAvatar initial={m.username || m.userId.toString()} role={m.role} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-on-surface truncate">
                                {m.username || `User #${m.userId}`}
                              </p>
                              <p className="text-[10px] text-on-surface-variant/50 font-mono truncate">
                                ID: {m.userId}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOwner ? (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border font-mono ${mRole?.bg} ${mRole?.text} ${mRole?.border}`}>
                                Owner
                              </span>
                            ) : (
                              <div className="relative">
                                <select
                                  className="bg-surface-container-low border border-outline-variant/30 text-[10px] text-on-surface py-0.5 pl-1.5 pr-5 appearance-none cursor-pointer focus:ring-1 focus:ring-primary/30 font-mono"
                                  value={m.role}
                                  onChange={e => handleRoleChange(m.userId, e.target.value)}
                                >
                                  <option value="ADMIN">Admin</option>
                                  <option value="MEMBER">Member</option>
                                  <option value="VIEWER">Viewer</option>
                                </select>
                                <ChevronDown size={10} className="absolute right-1 top-1 pointer-events-none text-on-surface-variant/60" />
                              </div>
                            )}
                            {!isOwner && (
                              <button
                                onClick={() => setConfirmRemove({ wsId: selectedWs, userId: m.userId, name: m.username || `User #${m.userId}` })}
                                className="p-1 text-on-surface-variant/40 hover:text-error transition-colors"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Info */}
                <div className="px-4 py-3 border-t border-outline-variant bg-surface-container-high/20 flex items-center justify-between">
                  <span className="text-[10px] text-on-surface-variant/50 font-mono">
                    Created by user #{selected.ownerId}
                  </span>
                  {selected.role === 'OWNER' && (
                    <button
                      onClick={() => setShowDeleteWs(selected.id)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-error/70 hover:text-error border border-error/20 hover:border-error/50 transition-all"
                    >
                      <Trash2 size={10} /> Delete Workspace
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-outline-variant bg-surface-container-lowest h-full">
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
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-high border border-outline-variant w-full max-w-md"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-primary" />
                  <span className="text-sm font-mono font-semibold text-on-surface">Create Workspace</span>
                </div>
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-on-surface-variant/60 hover:text-on-surface transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider font-mono">Name <span className="text-error">*</span></label>
                  <input
                    className="w-full bg-surface-container-low border-none px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 mt-1"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="My Team Workspace"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider font-mono">Description <span className="text-on-surface-variant/40">(optional)</span></label>
                  <textarea
                    className="w-full bg-surface-container-low border-none px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/30 mt-1 resize-none font-mono"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Brief description of this workspace..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-outline-variant">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-1.5 text-xs font-mono text-on-surface-variant border border-outline-variant hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className="px-4 py-1.5 text-xs font-mono font-semibold border border-primary text-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
            className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 border text-xs font-mono flex items-center gap-2 shadow-lg ${
              toastMsg.type === 'ok'
                ? 'border-success/40 text-success bg-success/5'
                : 'border-error/40 text-error bg-error/5'
            }`}
          >
            {toastMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
