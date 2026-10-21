import { Clock3, UserPlus, Users } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import sendFriendRequest from '@/tanstack/sendFriendRequest';

interface FunctionProps {
	status: 'pending' | 'accepted' | 'rejected';
	user: {
		userId: string;
		firstName: string;
		lastName: string;
		username: string;
		dateOfBirth: string;
	};
	currentUser: string;
}

export default function FriendshipStatus({
	user,
	status,
	currentUser,
}: FunctionProps) {
	const queryClient = useQueryClient();

	const { mutate: requestMutate } = useMutation({
		mutationFn: async () => sendFriendRequest(currentUser, user?.username),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['friends', currentUser, user?.userId],
			});
		},
	});

	// If the logged in user is equal to the search user
	// They should not see any friendship status at all
	if (currentUser === user?.userId) return;

	if (status === 'accepted') {
		return (
			<div>
				<Tooltip>
					<TooltipContent>You and {user?.username} are friends!</TooltipContent>
					<TooltipTrigger asChild>
						<button className="text-green-400">
							<Users size={20} />
						</button>
					</TooltipTrigger>
				</Tooltip>
			</div>
		);
	}

	if (status === 'pending') {
		return (
			<div>
				<Tooltip>
					<TooltipContent>Friend request sent!</TooltipContent>
					<TooltipTrigger asChild>
						<button className="text-amber-400">
							<Clock3 size={20} />
						</button>
					</TooltipTrigger>
				</Tooltip>
			</div>
		);
	}

	return (
		<div>
			<Tooltip>
				<TooltipContent>Add friend</TooltipContent>
				<TooltipTrigger asChild>
					<button
						className="bg-black text-white p-1 rounded-md hover:cursor-pointer"
						onClick={() => requestMutate()}
					>
						<UserPlus size={20} />
					</button>
				</TooltipTrigger>
			</Tooltip>
		</div>
	);
}
