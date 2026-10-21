'use client';
import { Trash2 } from 'lucide-react';

interface FunctionProps {
	onDelete: () => void;
}

export default function PostDeleteButton({ onDelete }: FunctionProps) {
	async function handleOnDeleteClick(e: React.MouseEvent<HTMLButtonElement>) {
		// Ensures that the link is not directed on clicking the delete button
		e.stopPropagation();
		e.preventDefault();

		// Performs the actual functionality of deleting the post
		await onDelete();
	}

	return (
		<button
			onClick={handleOnDeleteClick}
			className="bg-linear-to-br from-red-300 to-red-600 p-1 text-white rounded-md transition hover:from-red-500 hover:to-red-700 hover:cursor-pointer shadow-xs"
		>
			<Trash2 size={20} />
		</button>
	);
}
