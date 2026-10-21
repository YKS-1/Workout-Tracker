import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import getFriendshipStatus from '@/tanstack/getFriends';
import FriendshipStatus from './friendship-status';
import Loader from './loader';
import UserAvatar from './user-avatar';

interface FunctionProps {
	user: {
		userId: string;
		firstName: string;
		lastName: string;
		username: string;
		dateOfBirth: string;
	};
}

export default function SearchUser({ user }: FunctionProps) {
	const token = localStorage.getItem('token') as string;

	const loggedInUserId =
		(JSON.parse(atob(token?.split('.')[1]))?.userId as string) ?? '';

	const { data, isLoading: friendshipStatusLoading } = useQuery({
		queryKey: ['friends', loggedInUserId, user?.userId],
		queryFn: async () => getFriendshipStatus(loggedInUserId, user?.userId),
	});

	const friendshipStatus = data?.friends?.at(0)?.status;

	return (
		<div className="py-3 px-5 border rounded-sm shadow-sm flex item-center justify-between">
			<div className="flex items-center gap-x-2">
				<div>
					<UserAvatar
						username={user?.username}
						firstName={user?.firstName}
						lastName={user?.lastName}
						className="h-9 w-9 text-sm shadow-none"
					/>
				</div>
				<div className="text-sm">
					<h2 className="text-xs font-medium">@{user?.username}</h2>
					<h3 className="font-semibold mt-1">
						{user?.firstName} {user?.lastName}
					</h3>
					<Link
						href={`/profile/${user?.username}`}
						className="text-xs text-blue-500 hover:text-blue-700 font-medium inline-block mt-1.5"
					>
						View profile &rarr;
					</Link>
				</div>
			</div>

			{friendshipStatusLoading ? (
				<Loader size="small" />
			) : (
				<FriendshipStatus
					status={friendshipStatus ?? 'rejected'}
					user={user}
					currentUser={loggedInUserId}
				/>
			)}
		</div>
	);
}
