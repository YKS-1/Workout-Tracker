'use client';
import LoadingScreen from '@/components/loading-screen';
import SearchUser from '@/components/search-user';
import { getUserIdFromToken } from '@/lib/token-user-id';
import searchUsers from '@/tanstack/searchUsers';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Page() {
	const searchParams = useSearchParams();
	const username = searchParams?.get('username');

	// Get the users info using the partial or full username
	const { data, isLoading, error } = useQuery({
		queryKey: ['search', username],
		queryFn: async () => searchUsers(username! as string),
		enabled: !!username && username?.length >= 3,
	});

	const loggedInUserId = getUserIdFromToken();
	const router = useRouter();

	if(!loggedInUserId) return router.push('/login');

	// Loading state
	if (isLoading) {
		return <LoadingScreen />;
	}

	// Error state (not enough username characters)
	if (!username || username?.length < 3) {
		return (
			<div className="text-center">
				<h2 className="mt-8 text-lg text-red-500">
					Please ensure the search query is at least three characters long
				</h2>
			</div>
		);
	}

	// Error state
	if (error || !data) {
		return (
			<div className="text-center">
				<h2 className="mt-8 text-lg text-red-500">
					There was an error while making this request
				</h2>
			</div>
		);
	}

	return (
		<div className="flex items-start justify-center min-h-screen w-full">
			<div className="mt-10">
				<p className="text-gray-600 font-semibold">
					Found{' '}
					{data?.size < 10 && data?.size !== 0 ? `0${data?.size}` : data?.size}{' '}
					results based on your search
				</p>
				<ul>
					{data?.users?.map(function (user) {
						return (
							<li key={user?.userId} className="mt-4">
								<SearchUser user={user} />
							</li>
						);
					})}
				</ul>
			</div>
		</div>
	);
}
