"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
	Edit3,
	Trash2,
	X,
	Check,
	AlertTriangle,
	Calendar,
	Ruler,
	Weight,
	Mail,
	User,
	AtSign,
	ChevronRight,
} from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import FriendsList from '@/components/friends-list';
import UserAvatar from '@/components/user-avatar';
import { notifyAuthStoreChanged, useAuthSnapshot } from '@/lib/auth-store';
import getFriendsList from '@/tanstack/getFriendsList';
import Loader from '@/components/loader';
import { Friend } from '@/interfaces/Friend';
import { useTheme } from '@/context/theme-context';

//Types
interface UserProfile {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	dateOfBirth: string;
	height: number;
	heightUnit: 'cm' | 'ft';
	weight: number;
	weightUnit: 'kg' | 'lbs';
	createdAt: string;
}
// Date setup
function formatDate(iso?: string | null) {
	if (!iso) return 'Not provided';
	const [year, month, day] = iso.split('T')[0].split('-').map(Number);
	return new Date(year, month - 1, day).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function toInputDate(iso?: string | null) {
	if (!iso) return '';
	// Always returns YYYY-MM-DD for the date input
	return iso.split('T')[0];
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UserProfile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { userId: userIdFromToken, username: signedInUsername } = useAuthSnapshot();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const {
    data: friendsData,
    isLoading: isFriendsLoading,
    error: friendsError,
  } = useQuery({
    queryKey: ['profile'],
    enabled: !!userIdFromToken,
    queryFn: async () => getFriendsList(userIdFromToken!),
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // username = from the URL → whose profile we're viewing
        // signedInUsername = from auth snapshot → who is logged in
        setIsOwnProfile(signedInUsername === username);

        // Fetch by URL username, not by localStorage userId
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/by-username/${username}`
        );

        if (!response.ok) {
          router.push("/404");
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setEditData(data.user);

        if (signedInUsername === username) {
          const storedFirstName = localStorage.getItem("firstName");
          const storedLastName = localStorage.getItem("lastName");

          if (storedFirstName !== data.user.firstName || storedLastName !== data.user.lastName) {
            localStorage.setItem("firstName", data.user.firstName);
            localStorage.setItem("lastName", data.user.lastName);
            notifyAuthStoreChanged();
          }
        }
      } catch {
        router.push("/404");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [username, signedInUsername, router]);

  // --- Handler functions ---

  function handleEdit() {
    setEditData(user);
    setIsEditing(true);
  }

  function handleCancel() {
    setEditData(user); // discard unsaved changes
    setIsEditing(false);
  }

  function handleChange<K extends keyof UserProfile>(field: K, value: UserProfile[K]) {
    setEditData((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSave() {
    if (!editData || !user) return;

    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      }
    );

    if (response.ok) {
      const data = await response.json();
      setUser(data.user);
      setEditData(data.user);
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);
      localStorage.setItem("firstName", data.user.firstName);
      localStorage.setItem("lastName", data.user.lastName);
      notifyAuthStoreChanged();
      setIsEditing(false);

      if (data.user.username !== username) {
        router.push(`/profile/${data.user.username}`);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      const data = await response.json();
      alert(data.error || "Failed to save changes. Please try again.");
    }
  }

  async function handleDeleteConfirm() {
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token");

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DEV_BASE_URL}/api/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
    	localStorage.clear();
    	notifyAuthStoreChanged();
    	router.push("/");
    } else {
		const data = await response.json();
  		alert(data.error || "Failed to delete account. Please try again.");
    }
  }

  // Styling constants used in the edit form
  const labelClass = `mb-1.5 block text-xs font-medium ${isDark ? "text-gray-500" : "text-slate-500"}`;
  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
    isDark
      ? "border-white/10 bg-[#0d1117] text-white placeholder-gray-600 focus:border-blue-500"
      : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-blue-900"
  }`;
  const pageShell = isDark ? "min-h-screen bg-[#0d1117] text-white relative" : "min-h-screen bg-white text-slate-900 relative";
  const surface = isDark
    ? "border-white/8 bg-[#111827]"
    : "border-slate-200 bg-white shadow-sm";
  const mutedText = isDark ? "text-gray-400" : "text-slate-500";
  const labelText = isDark ? "text-gray-500" : "text-slate-400";

  // canConfirmDelete controls whether the delete button is enabled
  // The user must type their exact username to confirm
  const canConfirmDelete = deleteInput === user?.username;

  // Early returns go AFTER all hooks and handlers
  if (isLoading) {
    return (
      <div className={`${pageShell} flex items-center justify-center`}>
        <p className={mutedText}>Loading...</p>
      </div>
    );
  }

  if (friendsError) {
    return (
      <div className={`${pageShell} flex items-center justify-center`}>
        <p className={mutedText}>There was an error fetching data.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`${pageShell} flex items-center justify-center`}>
        <p className={mutedText}>User not found.</p>
      </div>
    );
  }

	return (
		<div className={pageShell}>
			{/* Profile header*/}
			<div className={`border-b ${surface}`}>
				<div className="max-w-3xl mx-auto px-6 py-8">
					<div className="flex items-start gap-6">
						<UserAvatar
							username={user.username}
							firstName={user.firstName}
							lastName={user.lastName}
							className="h-24 w-24 flex-shrink-0 text-3xl"
						/>
						<div className="flex-1 pt-1">
							<div className="flex items-start justify-between flex-wrap gap-3">
								<div>
									<h1 className="text-2xl font-bold">
										{user.firstName} {user.lastName}
									</h1>
									<p className={`text-sm mt-0.5 ${mutedText}`}>
										@{user.username}
									</p>
									<p className={`text-xs mt-1 ${labelText}`}>
										Member since {formatDate(user.createdAt)}
									</p>
									{isFriendsLoading ? (
										<Loader className="mt-3" size="small" />
									) : (
										<FriendsList
											friends={friendsData?.friends ?? ([] as Friend[])}
											displayName={user.firstName}
											isOwnProfile={isOwnProfile}
										/>
									)}
								</div>
								<div className="flex items-center gap-2">
									{saveSuccess && (
										<span className="flex items-center gap-1.5 text-green-400 text-xs font-semibold bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
											<Check size={12} /> Saved
										</span>
									)}
									{isOwnProfile && !isEditing && (
										<button
											onClick={handleEdit}
											className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
												isDark
													? "border-white/10 bg-white/8 text-white hover:bg-white/15"
													: "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
											}`}
										>
											<Edit3 size={14} /> Edit Profile
										</button>
									)}
								</div>
							</div>
							<div className={`mt-5 flex gap-8 border-t pt-5 ${isDark ? "border-white/8" : "border-slate-200"}`}>
								{[
									{
										label: 'Height',
										value: `${user.height} ${user.heightUnit}`,
									},
									{
										label: 'Weight',
										value: `${user.weight} ${user.weightUnit}`,
									},
									{
										label: 'Date of Birth',
										value: formatDate(user.dateOfBirth),
									},
								].map((s) => (
									<div key={s.label}>
										<p className={`text-base font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{s.value}</p>
										<p className={`mt-0.5 text-xs ${labelText}`}>{s.label}</p>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Main body*/}
			<div className="max-w-3xl mx-auto px-6 py-8">
				{!isEditing && (
					<>
						<p className={`mb-4 text-xs font-bold uppercase tracking-widest ${labelText}`}>
							Account Info
						</p>
						<div className="space-y-2 mb-10">
							{[
								{
									icon: <User size={15} />,
									label: 'First Name',
									value: user.firstName,
								},
								{
									icon: <User size={15} />,
									label: 'Last Name',
									value: user.lastName,
								},
								{
									icon: <AtSign size={15} />,
									label: 'Username',
									value: `@${user.username}`,
								},
								{
									icon: <Mail size={15} />,
									label: 'Email',
									value: user.email,
								},
								{
									icon: <Calendar size={15} />,
									label: 'Date of Birth',
									value: formatDate(user.dateOfBirth),
								},
								{
									icon: <Ruler size={15} />,
									label: 'Height',
									value: `${user.height} ${user.heightUnit}`,
								},
								{
									icon: <Weight size={15} />,
									label: 'Weight',
									value: `${user.weight} ${user.weightUnit}`,
								},
								{
									icon: <Calendar size={15} />,
									label: 'Member Since',
									value: formatDate(user.createdAt),
									locked: true,
								},
							].map((row) => (
								<div
									key={row.label}
									className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${surface}`}
								>
									<div className="flex items-center gap-3">
										<span className={labelText}>{row.icon}</span>
										<div>
											<p className={`mb-0.5 text-xs ${labelText}`}>
												{row.label}
											</p>
											<p className={`text-sm font-medium ${isDark ? "text-white" : "text-slate-900"}`}>
												{row.value}
											</p>
										</div>
									</div>
									{row.locked && (
										<span className="text-[10px] text-yellow-400/60 bg-yellow-400/8 border border-yellow-400/15 px-2 py-1 rounded-full">
											Locked
										</span>
									)}
								</div>
							))}
						</div>

				{/* Danger zone — only visible on your own profile */}
				{isOwnProfile && (
					<>
						<p className="text-xs font-bold tracking-widest text-red-500/60 uppercase mb-4">
							Danger Zone
						</p>
						<button
							onClick={() => {
								setShowDeleteConfirm(true);
								setDeleteInput('');
							}}
							className="w-full flex items-center justify-between bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 px-5 py-4 rounded-2xl transition group"
						>
							<div className="flex items-center gap-3">
								<Trash2 size={16} />
								<div className="text-left">
									<p className="text-sm font-semibold">Delete Account</p>
									<p className="text-xs text-red-400/50 mt-0.5">
										Permanently remove your account and all data
									</p>
								</div>
							</div>
							<ChevronRight
								size={16}
								className="text-red-400/30 group-hover:text-red-400/70 transition"
							/>
						</button>
					</>
				)}
				</>
			)}

			{isEditing && isOwnProfile && editData && (
					<>
						<p className={`mb-6 text-xs font-bold uppercase tracking-widest ${labelText}`}>
							Edit Profile
						</p>
						<div className="space-y-4">
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className={labelClass}>First Name</label>
									<input
										className={inputClass}
										value={editData.firstName}
										onChange={(e) => handleChange('firstName', e.target.value)}
									/>
								</div>
								<div>
									<label className={labelClass}>Last Name</label>
									<input
										className={inputClass}
										value={editData.lastName}
										onChange={(e) => handleChange('lastName', e.target.value)}
									/>
								</div>
							</div>
							<div>
								<label className={labelClass}>Username</label>
								<div className="relative">
									<span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${labelText}`}>
										@
									</span>
									<input
										className={`${inputClass} pl-8`}
										value={editData.username}
										onChange={(e) => handleChange('username', e.target.value)}
									/>
								</div>
							</div>
							<div>
								<label className={labelClass}>Email</label>
								<input
									type="email"
									className={inputClass}
									value={editData.email}
									onChange={(e) => handleChange('email', e.target.value)}
								/>
							</div>
							<div>
								<label className={labelClass}>Date of Birth</label>
								<input
									type="date"
									className={inputClass}
									value={toInputDate(editData.dateOfBirth)}
									onChange={(e) => handleChange('dateOfBirth', e.target.value)}
								/>
							</div>
							<div>
								<label className={labelClass}>Height</label>
								<div className="flex gap-2">
									<input
										type="number"
										className={`${inputClass} flex-1`}
										value={editData.height}
										onChange={(e) =>
											handleChange('height', Number(e.target.value))
										}
									/>
									<div className={`flex overflow-hidden rounded-xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
										{(['cm', 'ft'] as const).map((u) => (
											<button
												key={u}
												onClick={() => handleChange('heightUnit', u)}
												className={`px-5 text-sm font-semibold transition ${
													editData.heightUnit === u
														? 'bg-blue-600 text-white'
														: isDark
															? 'bg-[#0d1117] text-gray-400 hover:text-white'
															: 'bg-white text-slate-500 hover:text-slate-900'
												}`}
											>
												{u}
											</button>
										))}
									</div>
								</div>
							</div>
							<div>
								<label className={labelClass}>Weight</label>
								<div className="flex gap-2">
									<input
										type="number"
										className={`${inputClass} flex-1`}
										value={editData.weight}
										onChange={(e) =>
											handleChange('weight', Number(e.target.value))
										}
									/>
									<div className={`flex overflow-hidden rounded-xl border ${isDark ? "border-white/10" : "border-slate-200"}`}>
										{(['kg', 'lbs'] as const).map((u) => (
											<button
												key={u}
												onClick={() => handleChange('weightUnit', u)}
												className={`px-5 text-sm font-semibold transition ${
													editData.weightUnit === u
														? 'bg-blue-600 text-white'
														: isDark
															? 'bg-[#0d1117] text-gray-400 hover:text-white'
															: 'bg-white text-slate-500 hover:text-slate-900'
												}`}
											>
												{u}
											</button>
										))}
									</div>
								</div>
							</div>
							<div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${isDark ? "border-white/8 bg-white/3" : "border-slate-200 bg-slate-50"}`}>
								<div className="flex items-center gap-3">
									<Calendar size={15} className={labelText} />
									<div>
										<p className={`mb-0.5 text-xs ${labelText}`}>Member Since</p>
										<p className={`text-sm ${mutedText}`}>
											{formatDate(user.createdAt)}
										</p>
									</div>
								</div>
								<span className="text-[10px] text-yellow-400/50 bg-yellow-400/8 border border-yellow-400/15 px-2 py-1 rounded-full">
									Locked
								</span>
							</div>
						</div>
						<div className="flex gap-3 mt-8">
							<button
								onClick={handleSave}
								className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-2xl transition"
							>
								<Check size={16} /> Save Changes
							</button>
							<button
								onClick={handleCancel}
								className={`flex-1 flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition ${
									isDark
										? "bg-white/8 text-gray-300 hover:bg-white/15"
										: "bg-slate-100 text-slate-700 hover:bg-slate-200"
								}`}
							>
								<X size={16} /> Cancel
							</button>
						</div>
					</>
				)}
			</div>

			{/*DELETE MODAL */}
			{showDeleteConfirm && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
					<div className={`w-full max-w-md rounded-3xl border p-8 shadow-2xl ${isDark ? "border-white/10 bg-[#111827]" : "border-slate-200 bg-white"}`}>
						<div className="flex items-center gap-3 mb-5">
							<div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
								<AlertTriangle size={18} className="text-red-400" />
							</div>
							<div>
								<h2 className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Delete Account</h2>
								<p className={`text-xs ${labelText}`}>
									This action is permanent and cannot be undone
								</p>
							</div>
						</div>
						<p className={`mb-5 text-sm leading-relaxed ${mutedText}`}>
							All your workouts, progress, and data will be{' '}
							<span className="text-red-400 font-semibold">
								permanently deleted
							</span>
							. To confirm, type your username{' '}
							<span className={`rounded px-1.5 py-0.5 text-xs font-mono ${isDark ? "bg-white/8 text-white" : "bg-slate-100 text-slate-900"}`}>
								@{user.username}
							</span>{' '}
							below.
						</p>
						<input
							className={`mb-5 w-full rounded-xl border px-4 py-3 text-sm transition focus:outline-none ${
								isDark
									? "border-white/10 bg-[#0d1117] text-white placeholder-gray-600 focus:border-red-500"
									: "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-red-500"
							}`}
							placeholder={`@${user.username}`}
							value={deleteInput}
							onChange={(e) => setDeleteInput(e.target.value)}
						/>
						<div className="flex gap-3">
							<button
								onClick={handleDeleteConfirm}
								disabled={!canConfirmDelete}
								className={`flex-1 py-3 rounded-xl font-semibold text-sm transition ${canConfirmDelete ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-red-600/15 text-red-400/30 cursor-not-allowed'}`}
							>
								Delete Account
							</button>
							<button
								onClick={() => setShowDeleteConfirm(false)}
								className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
									isDark
										? "bg-white/8 text-gray-300 hover:bg-white/15"
										: "bg-slate-100 text-slate-700 hover:bg-slate-200"
								}`}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
