'use client';
import { Copy, Check } from 'lucide-react';
import { Post } from '@/interfaces/Post';
import PostDeleteButton from './post-delete-button';
import PostEditButton from './post-edit-button';
import { useState } from 'react';
import PostInteractions from './post-interactions';
import { getFormattedMonth } from '@/lib/date';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import getUser from '@/tanstack/getUser';
import LoadingScreen from './loading-screen';
import editPost from '@/tanstack/editPost';
import deletePost from '@/tanstack/deletePost';
import { getUserIdFromToken } from '@/lib/token-user-id';
import UserAvatar from './user-avatar';
import { useTheme } from '@/context/theme-context';
import { twMerge } from 'tailwind-merge';

// Function props as an interface
interface FunctionProps {
	post: Post;
}

// Individual post component
export default function FeedPost({ post }: FunctionProps) {
	const queryClient = useQueryClient();

	const [editMode, setEditMode] = useState<boolean>(false);
	const [currentTitle, setCurrentTitle] = useState<string>(post?.title);
	const [currentDescription, setCurrentDescription] = useState<string>(
		post?.description,
	);
	const [countMessage, setCountMessage] = useState<string>('');
	 const [copied, setCopied] = useState<boolean>(false);

	const loggedInUserId = getUserIdFromToken();
	const {theme} = useTheme();
	const isDark = theme === 'dark';

	// Delete post using Tanstack Query
	const {
		mutate: deletePostMutate,
		isPending: isDeletePostLoading,
		error: deletePostError,
	} = useMutation({
		mutationFn: async (authorId: string) => deletePost(post?.id, authorId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
	});

	async function onDelete() {
		// Use tanstack query to actually perform the deletion
		deletePostMutate(loggedInUserId as string);
	}

	// Edit post using Tanstack Query
	const {
		mutate: editPostMutate,
		isPending: isEditPostLoading,
		error: editPostError,
	} = useMutation({
		mutationFn: async (updatedPost: { title: string; description: string }) =>
			editPost(post?.id, updatedPost),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['posts'] });
			setEditMode(false);
		},
	});

	// Handle the functionality on submitting content for an updated post
	// Can update 'title' and 'description' attributes
	async function submitEditChanges(e: React.MouseEvent<HTMLButtonElement>) {
		// Ensure the default functionality is disabled; prevents navigating to the post page
		e.stopPropagation();
		e.preventDefault();
		setCountMessage('');

		// Check if there was no update for either title or description
		if (
			currentTitle === post?.title &&
			currentDescription === post?.description
		) {
			setEditMode(false);
			return;
		}

		if (currentTitle.length === 0 || currentDescription.length === 0) {
			setCountMessage('Cannot update post with an empty title or description');
			return;
		}

		// Maximum character count a title can be (do not update)
		const MAX_TITLE_COUNT = 100;

		// Maximum character count a description can be (do not update)
		const MAX_DESCRIPTION_COUNT = 500;

		// The post title and description must adhere the character count, else do not update
		if (
			currentTitle.trim().length > MAX_TITLE_COUNT ||
			currentDescription.trim().length > MAX_DESCRIPTION_COUNT
		) {
			setCountMessage(
				'Please adhere to the character count limits for your title and description. Title: 100; Description: 500',
			);
			return;
		}

		// Create an object with the updated post fields
		const updatedPost = {
			title: currentTitle.trim(),
			description: currentDescription.trim(),
		};

		// Use tanstack query to actually perform the edit
		editPostMutate(updatedPost);
	}

	// Parse share code out of description if present
	// Format: optional message followed by 'Share code: XXXXXXXX'
	const SHARE_CODE_REGEX = /Share code: ([A-Z0-9]{8})/;
	const shareCodeMatch = post?.description?.match(SHARE_CODE_REGEX);
	const shareCode = shareCodeMatch?.[1] ?? null;
	const descriptionText = shareCode
		? post.description.replace(/\n\nShare code: [A-Z0-9]{8}/, '').replace(/Share code: [A-Z0-9]{8}/, '').trim()
		: post?.description;

	const handleCopy = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		navigator.clipboard.writeText(shareCode as string);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	// Using Tanstack Query to fetch user data
	const {
		data: user,
		isLoading: isUserDataLoading,
		error: userError,
	} = useQuery({
		queryKey: [`users:${post.authorId}`],
		queryFn: async () => getUser(post?.authorId),
	});

	// Loading state
	if (isUserDataLoading) return <LoadingScreen />;

	// Error State
	if (userError || !user || editPostError || deletePostError) {
		return (
			<div>
				<h2>There was an error while fetching data from the backend!</h2>
			</div>
		);
	}

	return (
		<div
			className={twMerge(
				"group my-4 rounded-xl border p-5 shadow-sm transition hover:shadow-lg",
				isDark
					? 'border-white/10 bg-[#111827] shadow-black/20'
					: 'border-slate-200 bg-white',
			)}
		>
			<div className="flex justify-between text-sm pb-3">
				<div className="flex items-center justify-start gap-x-1">
					<UserAvatar
						username={user?.username}
						firstName={user?.firstName}
						lastName={user?.lastName}
						className="h-9 w-9 text-sm shadow-none"
					/>
					<h3 className="font-bold ml-2">{user?.username}</h3>
					<h3 className="font-medium">
						&lt;{user?.firstName + ' ' + user?.lastName}&gt;
					</h3>
					<span className={twMerge("ml-1 text-xs", isDark ? "text-gray-400" : "text-gray-500")}>
						{getFormattedMonth(new Date(post.createdAt).getMonth())},{' '}
						{new Date(post.createdAt).getDate() < 10
							? `0${new Date(post.createdAt).getDate()}`
							: new Date(post.createdAt).getDate()}
					</span>
				</div>

				<div className="flex items-start justify-start gap-x-1.5">
					{post.authorId === loggedInUserId && (
						<PostEditButton
							onEdit={() => setEditMode((prev) => !prev)}
							editMode={editMode}
						/>
					)}
					{post.authorId === loggedInUserId && (
						<PostDeleteButton onDelete={onDelete} />
					)}
				</div>
			</div>

			{isEditPostLoading || isDeletePostLoading ? (
				<LoadingScreen />
			) : (
				<>
					<div className={twMerge("border-t pt-2", isDark ? "border-white/10" : "border-black/15")}>
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
								value={currentTitle}
								onInput={(e) => setCurrentTitle(e.currentTarget.value)}
							/>
						) : (
							<h4 className="font-semibold mt-2 group-hover:underline group-hover:underline-offset-2">
								{post?.title}
							</h4>
						)}

						{editMode ? (
							<textarea
								rows={5}
								cols={1}
								value={currentDescription}
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
								onInput={(e) => setCurrentDescription(e.currentTarget.value)}
							></textarea>
						) : (
							<div className="mt-4 text-sm leading-7">
								{descriptionText && <p>{descriptionText}</p>}
								{shareCode && (
									<div
										onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
										className={twMerge(
											"mt-3 flex w-fit items-center gap-3 rounded-lg border px-4 py-2",
											isDark
												? "border-white/10 bg-[#162033]"
												: "border-gray-200 bg-gray-50",
										)}
									>
										<span className={twMerge("text-xs", isDark ? "text-gray-400" : "text-gray-500")}>Workout code</span>
										<code className="text-sm font-mono tracking-widest font-semibold">{shareCode}</code>
										<button
											onClick={handleCopy}
											className={twMerge(
												"transition-colors",
												isDark ? "text-gray-400 hover:text-blue-300" : "text-gray-400 hover:text-blue-900",
											)}
											title="Copy share code"
										>
											{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
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
								onClick={submitEditChanges}
								className={twMerge(
									"mt-1.5 flex items-center justify-center gap-x-2 rounded-md px-4 py-2 text-sm transition hover:cursor-pointer disabled:cursor-not-allowed",
									isDark
										? "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-white/10"
										: "bg-blue-900 text-white hover:bg-blue-950 disabled:bg-slate-200",
								)}
							>
								Save changes
							</button>
						)}

						<PostInteractions post={post} />
					</div>
				</>
			)}
		</div>
	);
}
