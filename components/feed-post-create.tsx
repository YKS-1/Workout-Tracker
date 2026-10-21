'use client';
import createPost from '@/tanstack/createPost';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { FormEvent, useState } from 'react';
import Loader from './loader';
import { getUserIdFromToken } from '@/lib/token-user-id';
import { useTheme } from '@/context/theme-context';
import { twMerge } from 'tailwind-merge';

export default function FeedPostCreate() {
	const queryClient = useQueryClient();

	// 'title' and 'description' state values to hold the actual title and description values that the user is entering
	const [title, setTitle] = useState<string>('');
	const [description, setDescription] = useState<string>('');

	const {theme} = useTheme();
	const isDark = theme === 'dark';

	// The maximum characters a title can be (do not change)
	const MAX_TITLE_COUNT = 100;

	// The maximum characters a description can be (do not change)
	const MAX_DESCRIPTION_COUNT = 500;

	// The submit (create post) option is disabled if the user does not adhere to given conditions
	// Conditions: title (min count: 1, max count: 100); description (min count: 1, max count: 500)
	const submitDisabled =
		title.trim().length > MAX_TITLE_COUNT ||
		description.trim().length > MAX_DESCRIPTION_COUNT;

	const loggedInUserId = getUserIdFromToken();

	const { mutate, isPending, error } = useMutation({
		mutationFn: async (post: {
			title: string;
			description: string;
			authorId: string;
		}) => createPost(post),
		onSuccess: () => {
			setTitle('');
			setDescription('');
			queryClient.invalidateQueries({ queryKey: ['posts'] });
		},
	});

	// Event listener handler function listening to the form tag for an onSubmit event
	async function handlePostFormSubmission(e: FormEvent) {
		e.preventDefault();

		// Create the entire post as an object to send with formatted fields
		const post = {
			title: title.trim(),
			description: description.trim(),
			authorId: loggedInUserId as string,
		};

		mutate(post);
	}

	if (error) {
		<div>
			<h2>There was an error while creating the new post!</h2>
		</div>;
	}

	return (
		<form
			className={twMerge(
				"rounded-xl border p-4 shadow-sm",
				isDark
					? 'border-white/10 bg-[#111827] shadow-black/20'
					: 'border-slate-200 bg-white',
			)}
			onSubmit={handlePostFormSubmission}
		>
			<div>
				<label
					htmlFor="feed-post-title"
					className={twMerge(
						"text-xs uppercase font-bold tracking-wider",
						isDark ? "text-gray-400" : "text-gray-600",
					)}
				>
					Title
				</label>
				<input
					type="text"
					required
					id="feed-post-title"
					className={twMerge(
						"mt-1 w-full rounded-md border px-4 py-2 text-sm outline-0 transition",
						isDark
							? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400"
							: "border-black/10 bg-white text-slate-900 focus:border-black/75",
					)}
					placeholder="Here are my favorite high-protein meals during calorie deficit!"
					autoComplete="off"
					value={title}
					onInput={(e) => setTitle(e.currentTarget.value)}
				/>
				<label
					className={`text-xs mt-0.5 font-medium tracking-wider ${title.length > MAX_TITLE_COUNT && 'text-red-500'}`}
				>
					<span>{title.length}</span>
					<span>/100</span>
				</label>
			</div>

			<div className="mt-4">
				<label
					htmlFor="feed-post-description"
					className={twMerge(
						"text-xs uppercase font-bold tracking-wider",
						isDark ? "text-gray-400" : "text-gray-600",
					)}
				>
					Description
				</label>
				<textarea
					rows={5}
					cols={1}
					value={description}
					required
					onInput={(e) => setDescription(e.currentTarget.value)}
					className={twMerge(
						"mt-1.5 w-full resize-none rounded-md border px-4 py-2 text-sm outline-0 transition",
						isDark
							? "border-white/10 bg-[#0d1117] text-white focus:border-blue-400"
							: "border-black/10 bg-white text-slate-900 focus:border-black/75",
					)}
					placeholder="I focus on meals that keep me full while staying under my calorie target. Some of my favorites include Greek yogurt bowls, chicken stir fry, and egg white omelets…"
					autoComplete="off"
				></textarea>
				<label
					className={`text-xs mt-0.5 font-medium tracking-wider ${description.length > MAX_DESCRIPTION_COUNT && 'text-red-500'}`}
				>
					<span>{description.length}</span>
					<span>/500</span>
				</label>
			</div>

			<div className="mt-4">
				{(title.length > MAX_TITLE_COUNT ||
					description.length > MAX_DESCRIPTION_COUNT) && (
					<span className={twMerge("text-xs font-medium", isDark ? "text-gray-400" : "text-gray-700")}>
						Please adhere to the character limit to make a post
					</span>
				)}
				<button
					type="submit"
					className={twMerge(
						"mt-1.5 flex items-center justify-center gap-x-2 rounded-md px-4 py-2 text-sm transition hover:cursor-pointer disabled:cursor-not-allowed",
						isDark
							? 'bg-blue-900 text-white hover:bg-blue-950 disabled:bg-white/10'
							: 'bg-blue-900 text-white hover:bg-blue-950 disabled:bg-slate-200',
					)}
					disabled={submitDisabled && isPending}
				>
					<span>Create</span>
					<span>
						<ArrowRight size={14} />
					</span>
				</button>
				{isPending && <Loader className="mt-3 inline-block" />}
			</div>
		</form>
	);
}
