'use client';

import FeedPost from '@/components/feed-post';
import FeedPostCreate from '@/components/feed-post-create';
import LoadingScreen from '@/components/loading-screen';
import { useTheme } from '@/context/theme-context';
import { Post } from '@/interfaces/Post';
import { getUserIdFromToken } from '@/lib/token-user-id';
import getPosts from '@/tanstack/getPosts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

export default function Page() {
	const router = useRouter();
	const loggedInUserId = getUserIdFromToken();
	const { theme } = useTheme();

	//Handle authentication check on the client side only
	useEffect(() => {
		if (!loggedInUserId) {
			router.push('/login');
		}
	}, [loggedInUserId, router]);

	// Making request
	const {
		data: posts,
		isLoading,
		error,
	} = useQuery({
		queryKey: ['posts'],
		queryFn: getPosts,
		enabled: !!loggedInUserId,
	});

	//Show loading while checking token OR fetching data
	if (!loggedInUserId || isLoading) {
		return <LoadingScreen />;
	}

	// Error case
	if (error || !posts) {
		return (
			<div>
				<h2>There was an error while fetching data from the backend!</h2>
			</div>
		);
	}

	return (
		<section
			className={twMerge(
				'flex justify-center items-start min-h-screen transition',
				theme === 'dark'
					? 'bg-[#0d1117] text-white'
					: 'bg-white text-slate-900',
			)}
		>
			<div className="mt-15 w-[40%]">
				<FeedPostCreate />

				<div className="mt-8">
					<ul>
						{posts.map(function (post: Post) {
							return (
								<li key={post.id}>
									<Link href={`/feed/${post.id}`} title="View post">
										<FeedPost post={post} />
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			</div>
		</section>
	);
}
