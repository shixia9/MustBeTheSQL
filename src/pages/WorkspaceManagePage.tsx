import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, UserPlus, X, Users } from 'lucide-react';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { workspaceApi } from '../api/client';

interface Props { user: any; }

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
    if (res.code === 200) { setShowCreate(false); setNewName(''); setNewDesc(''); reload(); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this workspace? All resources remain but lose workspace assignment.')) return;
    const res = await workspaceApi.delete(id);
    if (res.code === 200) { setSelectedWs(null); reload(); }
  };

  const handleAddMember = async () => {
    if (!selectedWs || !inviteUserId.trim()) return;
    const uid = parseInt(inviteUserId, 10);
    if (isNaN(uid)) return;
    const res = await workspaceApi.addMember(selectedWs, { userId: uid, role: inviteRole });
    if (res.code === 200) { setInviting(false); setInviteUserId(''); loadMembers(selectedWs); reload(); }
    else alert(res.message || 'Failed to add member');
  };

  const handleRemoveMember = async (memberUserId: number) => {
    if (!selectedWs || !confirm('Remove this member?')) return;
    const res = await workspaceApi.removeMember(selectedWs, memberUserId);
    if (res.code === 200) loadMembers(selectedWs);
  };

  const handleRoleChange = async (memberUserId: number, newRole: string) => {
    if (!selectedWs) return;
    const res = await workspaceApi.updateMember(selectedWs, memberUserId, { role: newRole });
    if (res.code === 200) loadMembers(selectedWs);
  };

  const roleBadge = (role: string) => {
    const cls: Record<string, string> = {
      OWNER: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
      ADMIN: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
      MEMBER: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      VIEWER: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
    };
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${cls[role] || ''}`}>
        {role}
      </span>
    );
  };

  const selected = workspaces.find(w => w.id === selectedWs);

  return (
    <div className="ml-[200px] pt-12 min-h-screen bg-surface p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-on-surface">Workspace Management</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">Create and manage team workspaces</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium
            bg-primary text-on-primary hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} /> Create Workspace
        </button>
      </div>

      {/* Workspace list */}
      <div className="grid gap-2 mb-6">
        {workspaces.length === 0 && !loading && (
          <div className="text-xs text-on-surface-variant py-8 text-center border border-dashed border-outline-variant/50 rounded">
            No workspaces yet. Create one to get started.
          </div>
        )}
        {workspaces.map(w => (
          <button
            key={w.id}
            onClick={() => setSelectedWs(selectedWs === w.id ? null : w.id)}
            className={`w-full text-left p-3 rounded border transition-colors
              ${selectedWs === w.id ? 'border-primary/50 bg-primary/5' : 'border-outline-variant/30 hover:border-outline-variant/50 hover:bg-surface-container-high'}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 size={18} className="text-primary/70" />
                <div>
                  <span className="text-sm text-on-surface font-medium">{w.name}</span>
                  {w.description && (
                    <span className="text-xs text-on-surface-variant ml-2">{w.description}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                  <Users size={11} /> {w.memberCount}
                </span>
                {roleBadge(w.role)}
              </div>
            </div>
            {selectedWs === w.id && w.role !== 'VIEWER' && (
              <div className="flex gap-1.5 mt-2 ml-9" onClick={e => e.stopPropagation()}>
                {w.role === 'OWNER' && (
                  <button
                    onClick={() => handleDelete(w.id)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
      {/* Member management */}
      {selected && (
        <div className="border border-outline-variant/30 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-on-surface flex items-center gap-2">
              <Users size={14} /> Members of {selected.name}
            </h2>
            {selected.role !== 'VIEWER' && (
              <button
                onClick={() => setInviting(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded text-xs
                  bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <UserPlus size={12} /> Invite
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-3 text-center">No members found.</p>
          ) : (
            <div className="space-y-1">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-surface-container-high transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-on-surface">User #{m.userId}</span>
                    {roleBadge(m.role)}
                  </div>
                  {selected.role !== 'VIEWER' && m.role !== 'OWNER' && (
                    <div className="flex items-center gap-1">
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.userId, e.target.value)}
                        className="text-[10px] bg-surface-container border border-outline-variant/50 rounded px-1 py-0.5 text-on-surface-variant"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="text-red-400 hover:bg-red-400/10 rounded p-1 transition-colors"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant/50 rounded-lg p-5 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-on-surface">Create Workspace</h3>
              <button onClick={() => setShowCreate(false)} className="text-on-surface-variant hover:text-on-surface"><X size={14} /></button>
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Workspace name"
              className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-2 text-xs text-on-surface mb-2 focus:outline-none focus:border-primary"
            />
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-2 text-xs text-on-surface mb-3 focus:outline-none focus:border-primary resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high">Cancel</button>
              <button onClick={handleCreate} className="px-3 py-1.5 rounded text-xs bg-primary text-on-primary hover:bg-primary/90">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite dialog */}
      {inviting && selectedWs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-outline-variant/50 rounded-lg p-5 w-96 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-on-surface">Invite Member</h3>
              <button onClick={() => setInviting(false)} className="text-on-surface-variant hover:text-on-surface"><X size={14} /></button>
            </div>
            <input
              value={inviteUserId}
              onChange={e => setInviteUserId(e.target.value)}
              placeholder="User ID"
              className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-2 text-xs text-on-surface mb-2 focus:outline-none focus:border-primary"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/50 rounded px-2.5 py-2 text-xs text-on-surface mb-3 focus:outline-none focus:border-primary"
            >
              <option value="MEMBER">MEMBER</option>
              <option value="ADMIN">ADMIN</option>
              <option value="VIEWER">VIEWER</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setInviting(false)} className="px-3 py-1.5 rounded text-xs text-on-surface-variant hover:bg-surface-container-high">Cancel</button>
              <button onClick={handleAddMember} className="px-3 py-1.5 rounded text-xs bg-primary text-on-primary hover:bg-primary/90">Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
