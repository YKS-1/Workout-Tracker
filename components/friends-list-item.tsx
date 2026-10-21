import { Friend } from '@/interfaces/Friend';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FunctionProps {
	friend: Friend;
}

export default function FriendsListItem({ friend }: FunctionProps) {
	return (
		<div className="flex items-center justify-between text-xs">
			<div>
				<h2 className="font-semibold">{friend?.username}</h2>
				<h3 className="mt-1 font-medium">
					{friend?.firstName} {friend?.lastName}
				</h3>
			</div>
			<div>
				<Link
					href={`/profile/${friend?.username}`}
					className="flex items-center justify-center gap-x-1 text-blue-600"
				>
					<span>View profile</span>
					<span>
						<ArrowRight size={15} />
					</span>
				</Link>
			</div>
		</div>
	);
}
