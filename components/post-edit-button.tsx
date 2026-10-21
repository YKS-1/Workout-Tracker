'use client';
import { PencilOff, SquarePen } from 'lucide-react';

interface FunctionProps {
	onEdit: () => void;
	editMode: boolean;
}

export default function PostEditButton({ onEdit, editMode }: FunctionProps) {
	async function handleOnEditClick(e: React.MouseEvent<HTMLButtonElement>) {
		e.stopPropagation();
		e.preventDefault();

		await onEdit();
	}

	return (
		<button
			onClick={handleOnEditClick}
			className="bg-linear-to-br from-sky-300 to-sky-600 p-1 text-white rounded-md transition hover:from-sky-500 hover:to-sky-700 hover:cursor-pointer shadow-xs"
		>
			{editMode ? <PencilOff size={20} /> : <SquarePen size={20} />}
		</button>
	);
}
