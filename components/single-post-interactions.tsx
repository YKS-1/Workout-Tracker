'use client';
import { LikesList } from '@/interfaces/LikesList';
import { Post } from '@/interfaces/Post';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import PostLikesList from './post-likes-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import getPostReactions from '@/tanstack/getPostReactions';
import LoadingScreen from './loading-screen';
import postReaction from '@/tanstack/postReaction';
import { getUserIdFromToken } from '@/lib/token-user-id';

interface FunctionProps {
	post: Post;
}

export default function SinglePostInteractions({ post }: FunctionProps) {
	const queryClient = useQueryClient();

	const loggedInUserId = getUserIdFromToken();

	// Fetch initial like status + total likes
	const {
		data: interactionsData,
		isLoading: isLikesLoading,
		error: likeError,
	} = useQuery({
		queryKey: ['posts', post.id, 'reaction', loggedInUserId as string],
		queryFn: async () => getPostReactions(post?.id, loggedInUserId as string),
	});

	const liked = interactionsData?.liked;
	const totalLikes = interactionsData?.totalLikes;
	const likesList = interactionsData?.list;

	// Perform reaction to the post
	const { mutate: reactionMutate, isPending: isReactionLoading } = useMutation({
		mutationFn: async () => postReaction(post?.id, loggedInUserId as string),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['posts', post.id, 'reaction', loggedInUserId as string],
			});
		},
	});

	async function onPostReaction(e: React.MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		reactionMutate();
	}

	if (isLikesLoading || isReactionLoading) return <LoadingScreen />;

	if (likeError) {
		return (
			<div>
				<h2>There was an error while fetching data from the backend</h2>
			</div>
		);
	}

	return (
		<div className="mt-5">
			<p className="text-sm font-medium text-gray-500">
				{totalLikes === 0 ? (
					'Be the first to like this post!'
				) : (
					<PostLikesList
						likes={totalLikes}
						likesList={likesList as LikesList[]}
					/>
				)}
			</p>

			<div className="mt-3 flex items-center justify-start gap-x-3">
				<button
					className={`flex items-center justify-center text-sm gap-x-1 transition py-2.5 px-2 rounded-sm hover:cursor-pointer hover:bg-gray-200 ${
						liked ? 'text-blue-600 bg-blue-100' : ''
					}`}
					onClick={onPostReaction}
				>
					<span>
						<ThumbsUp size={20} className={`${liked ? 'fill-blue-300' : ''}`} />
					</span>
					<span>Like</span>
				</button>

				<button
					className="flex items-center justify-center text-sm gap-x-1 transition py-2.5 px-2 rounded-sm hover:cursor-pointer hover:bg-gray-200"
					onClick={function () {
						const commentTab = document.getElementById(
							'primary-comment-textarea',
						)! as HTMLTextAreaElement;
						commentTab.scrollIntoView({ behavior: 'smooth' });
						commentTab.focus();
					}}
				>
					<span>
						<MessageCircle size={20} />
					</span>
					<span>Comment</span>
				</button>
			</div>
		</div>
	);
}
