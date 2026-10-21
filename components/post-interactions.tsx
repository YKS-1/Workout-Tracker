'use client';
import { Post } from '@/interfaces/Post';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import PostLikesList from './post-likes-list';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import getPostReactions from '@/tanstack/getPostReactions';
import LoadingScreen from './loading-screen';
import getPostComments from '@/tanstack/getPostComments';
import postReaction from '@/tanstack/postReaction';
import Loader from './loader';
import { getUserIdFromToken } from '@/lib/token-user-id';
import { useRouter } from 'next/navigation';

interface FunctionProps {
	post: Post;
	variant?: 'default' | 'compact';
}

export default function PostInteractions({
	post,
	variant = 'default',
}: FunctionProps) {
	const queryClient = useQueryClient();
	const router = useRouter();

	const loggedInUserId = getUserIdFromToken();

	const {
		data: likesData,
		isLoading: isLikesLoading,
		error: likesError,
	} = useQuery({
		queryKey: ['posts', post.id, 'reaction', loggedInUserId as string],
		queryFn: async () => getPostReactions(post?.id, loggedInUserId as string),
	});

	const liked = likesData?.liked;
	const totalLikes = likesData?.totalLikes;
	const likesList = likesData?.list;

	const {
		data: commentsData,
		isLoading: isCommentsLoading,
		error: commentsError,
	} = useQuery({
		queryKey: ['posts', post?.id, 'comments'],
		queryFn: async () => getPostComments(post?.id),
	});

	const totalComments = commentsData?.size;

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

	function onOpenComments(e: React.MouseEvent<HTMLButtonElement>) {
		e.preventDefault();
		e.stopPropagation();
		router.push(`/feed/${post.id}#primary-comment-textarea`);
	}

	if (isLikesLoading || isCommentsLoading) {
		return variant === 'compact' ? (
			<div className="mt-2.5 flex items-center gap-2 text-gray-500">
				<Loader size="small" />
			</div>
		) : (
			<LoadingScreen />
		);
	}

	if (likesError || commentsError) {
		return (
			<div>
				<h2>There was an error while fetching data</h2>
			</div>
		);
	}

	if (variant === 'compact') {
		return (
			<div
				className="mt-2.5 flex items-center justify-between"
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label="Like post"
						className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition hover:cursor-pointer ${
							liked
								? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
								: 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
						}`}
						onClick={onPostReaction}
					>
						<ThumbsUp size={13} className={liked ? 'fill-blue-300' : ''} />
					</button>

					<button
						type="button"
						aria-label="Open comments"
						className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition hover:cursor-pointer hover:bg-white/10 hover:text-white"
						onClick={onOpenComments}
					>
						<MessageCircle size={13} />
					</button>
				</div>

				<div className="flex items-center gap-3 text-[11px] text-gray-500">
					<span className="inline-flex items-center gap-1">
						<ThumbsUp size={10} className="text-gray-500" />
						<span>{totalLikes ?? 0}</span>
					</span>
					<span className="inline-flex items-center gap-1">
						<MessageCircle size={10} className="text-gray-500" />
						<span>{totalComments ?? 0}</span>
					</span>
				</div>
			</div>
		);
	}

	return (
		<div className="mt-5 p-2">
			<div
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				<div className="text-sm font-medium text-gray-500">
					{isReactionLoading ? (
						<Loader size="small" />
					) : (
						<>
							{totalLikes === 0 ? (
								'Be the first to like this post!'
							) : (
								<PostLikesList likes={totalLikes} likesList={likesList} />
							)}
						</>
					)}
				</div>
			</div>

			<div className="mt-3 flex items-start justify-start gap-x-3">
				<button
					type="button"
					className={`flex items-center justify-center text-sm gap-x-1 transition py-2.5 px-2 rounded-sm hover:cursor-pointer hover:bg-gray-200 ${
						liked ? 'text-blue-600 bg-blue-100' : ''
					}`}
					onClick={onPostReaction}
				>
					{}
					<span>
						<ThumbsUp size={20} className={`${liked ? 'fill-blue-300' : ''}`} />
					</span>
					<span>Like</span>
				</button>

				<button
					type="button"
					className="flex items-center justify-center text-sm gap-x-1 transition py-2.5 px-2 rounded-sm hover:cursor-pointer hover:bg-gray-200"
					onClick={onOpenComments}
				>
					<span>
						<MessageCircle size={20} />
					</span>
					<span>Comment</span>
				</button>
			</div>

			<p className="text-sm font-medium text-gray-500 mt-3">
				{totalComments === 0 ? (
					<span className="text-gray-400">No comments on this post</span>
				) : (
					<span className="hover:underline">
						View all {totalComments} comments
					</span>
				)}
			</p>
		</div>
	);
}
