'use client';
import { Comment } from '@/interfaces/Comment';
import { Post } from '@/interfaces/Post';
import { getFormattedHourTime, getFormattedMonth } from '@/lib/date';
import Link from 'next/link';
import PostComment from './post-comment';
import { FormEvent, useState } from 'react';
import { PencilOff, SquarePen, Trash2, Copy, Check } from 'lucide-react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from './ui/alert-dialog';
import { useRouter } from 'next/navigation';
import SinglePostInteractions from './single-post-interactions';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import getPostComments from '@/tanstack/getPostComments';
import LoadingScreen from './loading-screen';
import createComment from '@/tanstack/createComment';
import deletePost from '@/tanstack/deletePost';
import editPost from '@/tanstack/editPost';
import getUser from '@/tanstack/getUser';
import { getUserIdFromToken } from '@/lib/token-user-id';
import UserAvatar from './user-avatar';
import { useTheme } from '@/context/theme-context';
import { twMerge } from 'tailwind-merge';

// Function props for the components
interface FunctionProps {
	post: Post;
}

export default function PagePost({ post }: FunctionProps) {
	const queryClient = useQueryClient();
	const { theme } = useTheme();
	const isDark = theme === 'dark';

	const [newComment, setNewComment] = useState<string>('');
	const [editMode, setEditMode] = useState<boolean>(false);
	const [editTitle, setEditTitle] = useState<string>(post?.title);
	const [editDescription, setEditDescription] = useState<string>(
		post?.description,
	);
	const [countMessage, setCountMessage] = useState<string>('');
	const [copied, setCopied] = useState<boolean>(false);

	const router = useRouter();

	const loggedInUserId = getUserIdFromToken();

	// Select the 'createdAt' attribute from the post which comes in as a string and use it to create a Date object
	const SHARE_CODE_REGEX = /Share code: ([A-Z0-9]{8})/;
	const shareCodeMatch = post?.description?.match(SHARE_CODE_REGEX);
	const shareCode = shareCodeMatch?.[1] ?? null;
	const descriptionText = shareCode
		? post.description
				.replace(/\n\nShare code: [A-Z0-9]{8}/, '')
				.replace(/Share code: [A-Z0-9]{8}/, '')
				.trim()
		: post?.description;

	const handleCopy = () => {
		navigator.clipboard.writeText(shareCode as string);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const createdAt = new Date(post?.createdAt);

	// Compute formatted values from the Date object for display purposes
	const formattedMonth = getFormattedMonth(createdAt.getMonth());
	const formattedDate =
		createdAt.getDate() < 10 ? `0${createdAt.getDate()}` : createdAt.getDate();
	const formattedHourTime = getFormattedHourTime(createdAt);

	const updatedAt = new Date(post?.updatedAt);
	const formattedUpdateDate =
		updatedAt.getDate() < 10 ? `0${updatedAt.getDate()}` : updatedAt.getDate();

	const { data: commentsData, isLoading: isCommentsLoading } = useQuery({
		queryKey: ['posts', post?.id, 'comments'],
		queryFn: async () => getPostComments(post?.id),
	});

	const comments: Comment[] = commentsData?.comments as Comment[];

	// Create new comment
	const { mutate: createCommentMutate, isPending: isCreateCommentLoading } =
		useMutation({
			mutationFn: async () =>
				createComment(post?.id, loggedInUserId as string, newComment.trim()),
			onSuccess: () => {
				setNewComment('');
				queryClient.invalidateQueries({
					queryKey: ['posts', post?.id, 'comments'],
				});
			},
		});

	async function onNewComment(e: FormEvent) {
		e.preventDefault();
		createCommentMutate();
	}

	// Delete post
	const {
		mutate: deletePostMutate,
		isPending: isDeleteLoading,
		error: deleteError,
	} = useMutation({
		mutationFn: async (authorId: string) => deletePost(post?.id, authorId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
			router.push('/feed');
		},
	});
	// Function even handler for deleting a post
	async function onDeletePost() {
		deletePostMutate(loggedInUserId as string);
	}

	// Edit post
	const {
		mutate: editPostMutate,
		isPending: isEditPostLoading,
		error: editPostError,
	} = useMutation({
		mutationFn: async (updatedPost: { title: string; description: string }) =>
			editPost(post?.id, updatedPost),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts', post?.id] });
			setEditMode(false);
		},
	});
	// Function event handler on submitting edit changes to the post
	async function onSubmitEditChanges() {
		setCountMessage('');

		// On the case where nothing was actually edited
		if (editTitle === post?.title && editDescription === post?.description) {
			setEditMode(false);
			return;
		}

		// If the new edit has an empty title or description
		if (editTitle.length === 0 || editDescription.length === 0) {
			setCountMessage('Cannot update post with an empty title or description');
			return;
		}

		// Maximum character count a title can be (do not update)
		const MAX_TITLE_COUNT = 100;

		// Maximum character count a description can be (do not update)
		const MAX_DESCRIPTION_COUNT = 500;

		// If the newly entered title/description is over the character limit
		if (
			editTitle.length > MAX_TITLE_COUNT ||
			editDescription.length > MAX_DESCRIPTION_COUNT
		) {
			setCountMessage(
				'Please adhere to the character count limits for your title and description. Title: 100; Description: 500',
			);
			return;
		}

		const updatedPost = {
			title: editTitle.trim(),
			description: editDescription.trim(),
		};

		editPostMutate(updatedPost);
	}

	// Using Tanstack Query to fetch user data
	const {
		data: user,
		isLoading: isUserDataLoading,
		error: userError,
	} = useQuery({
		queryKey: [`users:${post.authorId}`],
		queryFn: async () => getUser(post?.authorId),
	});

	// Loading State
	if (isDeleteLoading) return <LoadingScreen />;

	// Error state
	if (deleteError || editPostError || userError) {
		return (
			<div>
				<h2>There was an error while fetching data from the backend</h2>
			</div>
		);
	}

	return (
		<div
			className={twMerge(
				"my-4 rounded-xl border p-5 shadow-sm",
				isDark ? "border-white/10 bg-[#111827]" : "border-slate-200 bg-white",
			)}
		>
			{isUserDataLoading ? (
				<LoadingScreen />
			) : (
				<>
					<div className="flex flex-col  gap-y-4 text-sm pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center justify-start">
								<UserAvatar
									username={user?.username}
									firstName={user?.firstName}
									lastName={user?.lastName}
									className="h-9 w-9 text-sm shadow-none"
								/>
								<h3 className="font-bold ml-3">{user?.username}</h3>
							</div>
							{post.authorId === (loggedInUserId as string) && (
								<AlertDialog>
									<div className="flex items-center justify-start gap-x-2">
										<button
											className="flex items-center justify-start text-sm gap-x-1.5 bg-linear-to-b from-blue-400 to-blue-600 text-white py-1.5 px-2.5 rounded-md transition hover:cursor-pointer hover:from-blue-500 hover:to-blue-700"
											onClick={() => setEditMode((prev) => !prev)}
										>
											<span>{editMode ? 'Discard Edit' : 'Edit'}</span>
											<span>
												{editMode ? (
													<PencilOff size={18} />
												) : (
													<SquarePen size={18} />
												)}
											</span>
										</button>
										<AlertDialogTrigger asChild>
											<button className="flex items-center justify-start text-sm gap-x-1.5 bg-linear-to-b from-red-400 to-red-600 text-white py-1.5 px-2.5 rounded-md transition hover:cursor-pointer hover:from-red-500 hover:to-red-700">
												<span>Delete</span>
												<span>
													<Trash2 size={18} />
												</span>
											</button>
										</AlertDialogTrigger>
									</div>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Are you sure you wish to delete post?
											</AlertDialogTitle>
											<AlertDialogDescription>
												Please know that this action cannot be undone and the
												post will be deleted forever
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction onClick={onDeletePost}>
												Continue
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
						</div>
						<div className="flex flex-col items-start justify-center gap-y-2">
							<h3 className="font-medium hover:underline text-lg">
								<Link href="#">{user?.firstName + ' ' + user?.lastName}</Link>
							</h3>
							<span className="text-gray-500 text-xs">
								Posted on {formattedMonth} {formattedDate},{' '}
								{createdAt.getFullYear()} at {formattedHourTime}
							</span>
							{post.createdAt !== post.updatedAt && (
								<span className="text-gray-500 text-xs">
									Last edited on {getFormattedMonth(updatedAt.getMonth())}{' '}
									{formattedUpdateDate}, {updatedAt.getFullYear()} at{' '}
									{getFormattedHourTime(updatedAt)}
								</span>
							)}
						</div>
					</div>
				</>
			)}

			{isEditPostLoading ? (
				<LoadingScreen />
			) : (
				<>
					<div className={twMerge("mt-4 border-t pt-4", isDark ? "border-white/10" : "border-black/15")}>
						{editMode ? (
							<input
								type="text"
								required
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								className={twMerge(
									"mt-1 w-full rounded-md border px-4 py-2 text-sm outline-0 transition",
									isDark
										? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400"
										: "border-black/10 bg-white text-slate-900 focus:border-black/75",
								)}
								autoComplete="off"
								placeholder="Your new post title goes here..."
								value={editTitle}
								onInput={(e) => setEditTitle(e.currentTarget.value)}
							/>
						) : (
							<h3 className="text-2xl font-medium">{post.title}</h3>
						)}

						{editMode ? (
							<textarea
								rows={5}
								cols={1}
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								required
								className={twMerge(
									"mt-1.5 w-full resize-none rounded-md border px-4 py-2 text-sm outline-0 transition",
									isDark
										? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400"
										: "border-black/10 bg-white text-slate-900 focus:border-black/75",
								)}
								autoComplete="off"
								placeholder="Your new post description goes here..."
								value={editDescription}
								onInput={(e) => setEditDescription(e.currentTarget.value)}
							></textarea>
						) : (
							<div className="mt-4 text-base leading-8">
								{descriptionText && <p>{descriptionText}</p>}
								{shareCode && (
									<div className={twMerge(
										"mt-4 flex w-fit items-center gap-3 rounded-lg border px-4 py-2",
										isDark ? "border-white/10 bg-[#162033]" : "border-gray-200 bg-gray-50",
									)}>
										<span className={twMerge("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>Workout code</span>
										<code className="text-sm font-mono tracking-widest font-semibold">
											{shareCode}
										</code>
										<button
											onClick={handleCopy}
											className={twMerge(
												"transition-colors",
												isDark ? "text-gray-400 hover:text-blue-300" : "text-gray-400 hover:text-blue-900",
											)}
											title="Copy share code"
										>
											{copied ? (
												<Check className="w-4 h-4 text-green-500" />
											) : (
												<Copy className="w-4 h-4" />
											)}
										</button>
									</div>
								)}
							</div>
						)}

						{editMode && countMessage.length > 0 && (
							<>
								<p className="text-xs mt-2 text-red-500">{countMessage}</p>
							</>
						)}

						{editMode && (
							<button
								className={twMerge(
									"mt-1.5 flex items-center justify-center gap-x-2 rounded-md px-4 py-2 text-sm transition hover:cursor-pointer disabled:cursor-not-allowed",
									isDark
										? "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-white/10"
										: "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-slate-200",
								)}
								onClick={onSubmitEditChanges}
							>
								Save changes
							</button>
						)}
					</div>
				</>
			)}

			<SinglePostInteractions post={post} />

			<form className="mt-8 border-t pt-6" onSubmit={onNewComment}>
				<textarea
					rows={2}
					cols={1}
					required
					id="primary-comment-textarea"
					value={newComment}
					onInput={(e) => setNewComment(e.currentTarget.value)}
					className={twMerge(
						'w-full border border-black/10 rounded-md outline-0 px-4 py-2 text-sm focus:border-black/75 transition mt-1.5 resize-none bg-transparent',
						isDark ? 'border-white/10 bg-[#0d1117] text-white focus:border-blue-400' : '',
					)}
					placeholder="Write your thoughts for this post..."
					autoComplete="off"
				></textarea>
				<button
					type="submit"
					className={twMerge(
						"mt-1 flex items-center justify-center gap-x-2 rounded-md px-4 py-2 text-sm transition hover:cursor-pointer disabled:cursor-not-allowed",
						isDark
							? "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-white/10"
							: "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-slate-200",
					)}
				>
					Comment
				</button>
			</form>

			<div className="mt-5">
				<h3 className="font-semibold text-gray-400/80">
					See what others have to say
				</h3>
				{isCommentsLoading || isCreateCommentLoading ? (
					<LoadingScreen />
				) : (
					<>
						<div
							className={twMerge(
								'mt-3 rounded-md px-3 py-4 shadow-xs',
								isDark ? 'bg-[#0d1117] text-white' : 'bg-gray-50',
							)}
						>
							{comments?.length == 0 && <>No comments</>}
							{comments?.length > 0 && (
								<ul>
									{comments?.map(function (comment) {
										return <PostComment key={comment.id} comment={comment} />;
									})}
								</ul>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
