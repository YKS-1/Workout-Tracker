'use client';
import BackButton from '@/components/back-button';
import LoadingScreen from '@/components/loading-screen';
import PagePost from '@/components/page-post';
import { useTheme } from '@/context/theme-context';
import { Post } from '@/interfaces/Post';
import { getUserIdFromToken } from '@/lib/token-user-id';
import getSinglePost from '@/tanstack/getSinglePost';
import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { twMerge } from 'tailwind-merge';

export default function Page() {
	const params = useParams();
	const postId = params?.postId as string;

	const loggedInUserId = getUserIdFromToken();
	const router = useRouter();
	const { theme } = useTheme();

	const {
		data: post,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['posts', postId],
		queryFn: async () => getSinglePost(postId),
	});

	if (!loggedInUserId) return router.push('/login');

	// Error state
	if (error) {
		return (
			<div>
				<h2>There was an error while fetching data</h2>
			</div>
		);
	}

	// Loading state
	if (isLoading) return <LoadingScreen />;

	return (
		<div
			className={twMerge(
				'relative w-full min-h-screen flex justify-center items-start transition',
				theme === 'dark'
					? 'bg-[#0d1117] text-white'
					: 'bg-white text-slate-900',
			)}
		>
			<BackButton />
			<div className="mt-10 w-1/2">
				<PagePost post={post as Post} />
			</div>
		</div>
	);
}
