'use client';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useTheme } from '@/context/theme-context';
import { twMerge } from 'tailwind-merge';

export default function SearchBar() {
	const router = useRouter();
	const { theme } = useTheme();
	const isDark = theme === 'dark';

	const [searchQuery, setSearchQuery] = useState<string>('');
	const [searchButtonDisabled, setSearchButtonDisabled] = useState(true);
	const [errorMessage, setErrorMessage] = useState('');

	function onSearchSubmit(e: FormEvent) {
		setErrorMessage('');
		e.preventDefault();
		if (searchQuery?.length < 3) {
			setErrorMessage('Your query must be at least three characters long');
			return;
		}

		router.push(`/search?username=${searchQuery?.trim()?.toLowerCase()}`);
	}

	function onSearchInput(e: React.InputEvent<HTMLInputElement>) {
		setSearchButtonDisabled(true);
		const newSearchQuery = e?.currentTarget?.value?.trim();

		setSearchQuery(newSearchQuery);

		if (newSearchQuery?.length >= 3) {
			setSearchButtonDisabled(false);
		}
	}

	return (
		<form
			className={twMerge(
				"flex flex-col items-center justify-center border-b py-4 pb-6",
				isDark ? "border-white/10" : "border-gray-200",
			)}
			onSubmit={onSearchSubmit}
		>
			<div
				className={twMerge(
					"flex w-[30%] items-center justify-center rounded-lg border px-4 py-3 shadow-sm transition focus-within:shadow-md",
					isDark
						? "border-white/10 bg-[#162033] focus-within:border-blue-500/60"
						: "border-gray-200 bg-white focus-within:border-black/30",
				)}
			>
				<input
					type="text"
					placeholder="Search for users by username..."
					className={twMerge(
						"w-full border-none bg-transparent outline-none",
						isDark ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-400",
					)}
					value={searchQuery}
					onInput={onSearchInput}
				/>
				<button
					className={twMerge(
						"rounded-md p-1 text-white transition hover:cursor-pointer disabled:pointer-events-none disabled:opacity-40",
						isDark ? "bg-blue-900 hover:bg-blue-950" : "bg-black hover:bg-gray-600",
					)}
					type="submit"
					disabled={searchButtonDisabled}
				>
					<Search size={20} className="pointer-events-none" />
				</button>
			</div>
			{errorMessage?.length > 0 && (
				<p className={twMerge("mt-2 text-xs", isDark ? "text-gray-400" : "text-gray-600")}>{errorMessage}</p>
			)}
		</form>
	);
}
