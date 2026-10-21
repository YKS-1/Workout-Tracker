import { LikesList } from '@/interfaces/LikesList';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface FunctionProps {
	likes: number;
	likesList: LikesList[];
}

export default function PostLikesList({ likes, likesList }: FunctionProps) {
	return (
		<>
			<Tooltip>
				<TooltipTrigger>
					<span>{likes} likes</span>
				</TooltipTrigger>
				<TooltipContent>
					<ul>
						{likesList?.map(function (user) {
							return <li key={user.userId}>{user.username}</li>;
						})}
					</ul>
				</TooltipContent>
			</Tooltip>
		</>
	);
}
