'use client';
import { Comment } from '@/interfaces/Comment';
import { getFormattedHourTime, getFormattedMonth } from '@/lib/date';
import { Save, SquarePen, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import getUser from '@/tanstack/getUser';
import LoadingScreen from './loading-screen';
import deleteComment from '@/tanstack/deleteComment';
import editComment from '@/tanstack/editComment';
import { getUserIdFromToken } from '@/lib/token-user-id';
import UserAvatar from './user-avatar';
import { useTheme } from '@/context/theme-context';
import { twMerge } from 'tailwind-merge';

interface FunctionProps {
	comment: Comment;
}

export default function PostComment({ comment }: FunctionProps) {
	const queryClient = useQueryClient();
	const { theme } = useTheme();
	const isDark = theme === 'dark';

	const loggedInUserId = getUserIdFromToken();
	const [newComment, setNewComment] = useState<string>(comment.content);
	const [newCommentError, setNewCommentError] = useState<string>('');

	const createdAt = new Date(comment.createdAt);

	// Compute formatted values from the createdAt Date object
	const formattedMonth = getFormattedMonth(createdAt.getMonth());
	const formattedDate =
		createdAt.getDate() < 10 ? `0${createdAt.getDate()}` : createdAt.getDate();
	const formattedHourTime = getFormattedHourTime(createdAt);

	const [editMode, setEditMode] = useState<boolean>(false);

	// Delete comment
	const { mutate: deleteMutate, isPending: isDeleteCommentLoading } =
		useMutation({
			mutationFn: async () => deleteComment(comment?.postId, comment?.id),
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: ['posts', comment?.postId, 'comments'],
				});
			},
		});
	// Function event handler on delete comment button press
	async function onDeleteComment() {
		deleteMutate();
	}

	const { mutate: editMutate, isPending: isEditCommentLoading } = useMutation({
		mutationFn: async (newComment: string) =>
			editComment(comment?.postId, comment?.id, newComment.trim()),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['posts', comment?.postId, 'comments'],
			});
			setEditMode(false);
		},
	});
	// Function event handler on edit comment button press
	async function onEditComment() {
		setNewCommentError('');
		if (newComment === comment.content) {
			setEditMode(false);
			return;
		}

		// Check if the new comment is empty
		if (newComment.length === 0) {
			setNewCommentError('Comment cannot be an empty value');
			return;
		}

		// Check if the new comment is over the character size limit
		const MAX_COMMENT_LENGTH = 250;
		if (newComment.length > MAX_COMMENT_LENGTH) {
			setNewCommentError('Comment must be at most 250 characters in size');
			return;
		}

		editMutate(newComment.trim());
	}

	const {
		data: user,
		isLoading: isUserDataLoading,
		error: userError,
	} = useQuery({
		queryKey: [`users:${comment?.authorId}`],
		queryFn: async () => getUser(comment?.authorId),
	});

	// Loading state
	if (isUserDataLoading) return <LoadingScreen />;

	// Error state
	if (userError) {
		return (
			<div>
				<h2>There was an error while fetching the data from the backend</h2>
			</div>
		);
	}

	return (
		<li className={twMerge(
			"first-of-type:mt-0 mt-2 border-b pb-4 pt-2 last-of-type:border-0",
			isDark ? "border-white/10" : "border-black/5",
		)}>
			{isDeleteCommentLoading ? (
				<LoadingScreen />
			) : (
				<>
					<div className="flex items-center justify-between text-xs">
						<div className="flex items-center justify-start">
							<UserAvatar
								username={user?.username}
								firstName={user?.firstName}
								lastName={user?.lastName}
								className="h-7 w-7 text-[11px] shadow-none"
							/>
							<h3 className="font-semibold ml-2">
								{user?.username}&nbsp;&lt;{user?.firstName} {user?.lastName}&gt;
							</h3>
						</div>

						{comment.authorId === (loggedInUserId as string) && (
							<div>
								<Tooltip>
									<TooltipContent>Edit Comment</TooltipContent>
									<TooltipTrigger asChild>
										<button
											className="bg-linear-to-b from-blue-500 to-blue-600 text-white p-1 rounded-md hover:cursor-pointer hover:shadow-md"
											onClick={() => setEditMode((prev) => !prev)}
										>
											<SquarePen size={16} />
										</button>
									</TooltipTrigger>
								</Tooltip>

								<Tooltip>
									<TooltipContent>Delete Comment</TooltipContent>
									<TooltipTrigger asChild>
										<button
											className="bg-linear-to-b from-red-500 to-red-600 text-white p-1 rounded-md hover:cursor-pointer hover:shadow-md ml-1.5"
											onClick={onDeleteComment}
										>
											<Trash2 size={16} />
										</button>
									</TooltipTrigger>
								</Tooltip>
							</div>
						)}
					</div>

					{isEditCommentLoading ? (
						<LoadingScreen />
					) : (
						<>
							<div className="mt-2 ml-1">
								{editMode && newCommentError.length > 0 && (
									<p className="mt-3 text-xs text-red-500">{newCommentError}</p>
								)}
								{editMode ? (
									<div className="flex gap-x-1 justify-start items-center">
										<input
											type="text"
											required
											onClick={(e) => {
												e.stopPropagation();
												e.preventDefault();
											}}
											className={twMerge(
												"mt-1 w-[75%] rounded-md border px-4 py-2 text-sm outline-0 transition",
												isDark
													? "border-white/10 bg-[#111827] text-white focus:border-blue-400"
													: "border-black/10 bg-white text-slate-900 focus:border-black/75",
											)}
											autoComplete="off"
											placeholder="Your new post title goes here..."
											value={newComment}
											onInput={(e) => setNewComment(e.currentTarget.value)}
										/>
										<Tooltip>
											<TooltipContent>Save changes</TooltipContent>
											<TooltipTrigger asChild>
												<button
													className={twMerge(
														"rounded-md p-2 transition hover:cursor-pointer",
														isDark
															? "bg-blue-900 text-white hover:bg-blue-950"
															: "bg-blue-900 text-white hover:bg-blue-950",
													)}
													onClick={onEditComment}
												>
													<Save size={20} />
												</button>
											</TooltipTrigger>
										</Tooltip>
									</div>
								) : (
									<p>{comment.content}</p>
								)}

								<span className={twMerge("mt-2 text-xs", isDark ? 'text-gray-300' : 'text-black/50')}>
									{formattedMonth} {formattedDate}, {createdAt.getFullYear()} at{' '}
									{formattedHourTime}
								</span>
								{comment.createdAt !== comment.updatedAt && (
									<span className={twMerge(
										"ml-1 border-l pl-1 text-xs",
										isDark ? "border-white/20 text-gray-400" : "border-black/30 text-black/50",
									)}>
										Edited
									</span>
								)}
							</div>
						</>
					)}
				</>
			)}
		</li>
	);
}
