import { Friend } from '@/interfaces/Friend';
import { Users } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from './ui/alert-dialog';
import FriendsListItem from './friends-list-item';
import { useTheme } from '@/context/theme-context';

interface FunctionProps {
	friends: Friend[];
	displayName: string;
	isOwnProfile?: boolean;
}

function getFriendsLabel(count: number) {
	if (count === 0) return 'No friends yet';
	if (count === 1) return '1 friend';
	return `${count} friends`;
}

function getFriendsTitle(displayName: string, isOwnProfile: boolean) {
	if (isOwnProfile) return 'Your friends';
	if (displayName.endsWith('s')) return `${displayName}' friends`;
	return `${displayName}'s friends`;
}

export default function FriendsList({
	friends,
	displayName,
	isOwnProfile = false,
}: FunctionProps) {
	const { theme } = useTheme();
	const isDark = theme === 'dark';
	const friendCount = friends?.length ?? 0;
	const friendsLabel = getFriendsLabel(friendCount);
	const dialogTitle = getFriendsTitle(displayName, isOwnProfile);

	return (
		<>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<button
						type="button"
						className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
							isDark
								? 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 hover:text-white'
								: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900'
						}`}
					>
						<Users size={14} className={isDark ? "text-gray-400" : "text-slate-400"} />
						<span>{friendsLabel}</span>
					</button>
				</AlertDialogTrigger>

				<AlertDialogContent className={isDark ? "border-white/10 bg-[#111827] text-white" : "border-slate-200 bg-white text-slate-900"}>
					<AlertDialogHeader>
						<AlertDialogTitle className={`text-left text-lg font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
							{dialogTitle}
						</AlertDialogTitle>
						<p className={`text-left text-sm ${isDark ? "text-gray-400" : "text-slate-500"}`}>
							{friendCount === 0
								? isOwnProfile
									? "You haven't added any friends yet."
									: `${displayName} doesn't have any friends added yet.`
								: `${friendsLabel} in this list.`}
						</p>
						<div className="w-full max-h-[320px] overflow-y-auto pr-1">
							{friendCount === 0 ? (
								<div className={`mt-4 rounded-2xl border px-4 py-6 text-center text-sm ${isDark ? "border-white/10 bg-white/5 text-gray-400" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
									No friends to show yet.
								</div>
							) : (
								<ul className="mt-4 space-y-2">
									{friends?.map(function (friend) {
										return (
											<li key={friend?.userId} className={`rounded-xl border p-2 ${isDark ? "border-white/10 bg-white/5" : "border-slate-200 bg-slate-50"}`}>
												<FriendsListItem friend={friend} />
											</li>
										);
									})}
								</ul>
							)}
						</div>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className={`cursor-pointer ${isDark ? "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900"}`}>
							Close &times;
						</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
