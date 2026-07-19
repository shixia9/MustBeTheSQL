import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Shield, AlertTriangle, Camera, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { api, apiFetch } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';

interface ProfilePageProps {
  user: any;
  onUserUpdate: (userData: any) => void;
}

export default function ProfilePage({ user, onUserUpdate }: ProfilePageProps) {
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [confirmStep, setConfirmStep] = useState<0 | 1 | 2>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const data = await api.post('/user/updateProfile', { userId: user.id, username, email });
      if (data.code === 200) {
        onUserUpdate(data.data);
        showMessage('success', 'Profile updated successfully');
      } else {
        showMessage('error', data.message || 'Failed to update profile');
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Network error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      showMessage('error', 'Please fill in all password fields');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const data = await api.post('/user/updatePassword', { userId: user.id, oldPassword, newPassword });
      if (data.code === 200) {
        // Automatically logged out by backend
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'login' }));
        window.location.reload();
      } else {
        showMessage('error', data.message || 'Failed to update password');
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Network error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('userId', user.id.toString());
    formData.append('file', file);

    try {
      // Use apiFetch with empty headers to let browser set Content-Type with boundary for FormData
      const data = await apiFetch('/user/uploadAvatar', {
        method: 'POST',
        body: formData,
        headers: {} as any,  // Let browser set multipart boundary
      });
      if (data.code === 200) {
        onUserUpdate(data.data);
        showMessage('success', 'Avatar updated successfully');
      } else {
        showMessage('error', data.message || 'Failed to upload avatar');
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Network error');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelAccount = async () => {
    setConfirmStep(0);
    try {
      const data = await api.post(`/user/cancelAccount?userId=${user.id}`);
      if (data.code === 200) {
        window.location.reload();
      } else {
        showMessage('error', data.message || 'Failed to cancel account');
      }
    } catch (err: any) {
      showMessage('error', err.message || 'Network error');
    }
  };

  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-8 py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-sm font-semibold text-slate-900">Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">account settings and security</p>
        </div>

        {/* Global Message */}
        {message && (
          <div className={'mb-6 p-3 border rounded-lg text-xs font-medium flex items-center gap-2 ' + (message.type === 'success' ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-red-200 text-red-700 bg-red-50')}>
            {message.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 pb-24">
          {/* Left Column: Avatar & Status */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col items-center">
              <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group-hover:border-blue-300 transition-colors">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User size={48} className="text-slate-400" />
                  )}
                </div>
                <div className="absolute inset-0 rounded-lg bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingAvatar ? <Loader2 className="animate-spin text-white" /> : <Camera className="text-white" />}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">{user?.username}</h2>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">{user?.email || 'no email'}</p>
              <div className="w-full pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Account Status</span>
                <span className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-md ${
                  user?.status === 1 ? 'bg-blue-50 text-blue-600' :
                  user?.status === 2 ? 'bg-orange-50 text-orange-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {user?.status === 1 ? 'Active' : user?.status === 2 ? 'Frozen' : 'Cancelled'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Forms */}
          <div className="col-span-12 lg:col-span-8 space-y-6">

            {/* Basic Info Form */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <User size={20} />
                </div>
                <h2 className="text-lg font-semibold">Basic Information</h2>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="btn-primary px-6 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdatingProfile && <Loader2 size={16} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Security Form */}
            <div className="bg-white rounded-lg p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Shield size={20} />
                </div>
                <h2 className="text-lg font-semibold">Security Settings</h2>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">Current Password</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-md outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="btn-ghost px-6 py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdatingPassword && <Loader2 size={16} className="animate-spin" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white rounded-lg p-6 border border-red-200 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-lg"></div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-50 p-2 rounded-lg text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
              </div>
              <p className="text-sm font-medium text-slate-500 mb-6 pl-12">
                Once you cancel your account, you will be logged out immediately and your status will be frozen.
                Your historical data will be retained for audit purposes.
              </p>
              <div className="pl-12">
                <button
                  onClick={() => setConfirmStep(1)}
                  className="btn-danger px-4 py-1.5 text-xs"
                >
                  Cancel Account
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {confirmStep === 1 && (
        <ConfirmDialog
          title="Cancel Account"
          message="Are you sure you want to cancel your account? This action will freeze your access."
          confirmLabel="Continue"
          variant="danger"
          onConfirm={() => setConfirmStep(2)}
          onCancel={() => setConfirmStep(0)}
        />
      )}
      {confirmStep === 2 && (
        <ConfirmDialog
          title="Final Warning"
          message="Your account will be marked as cancelled. This cannot be undone. Continue?"
          confirmLabel="Yes, Cancel My Account"
          variant="danger"
          onConfirm={handleCancelAccount}
          onCancel={() => setConfirmStep(0)}
        />
      )}
    </div>
  );
}
