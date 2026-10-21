import { useTheme } from '@/context/theme-context';
import { ArrowBigLeft } from 'lucide-react';
import Link from 'next/link';
import { twMerge } from 'tailwind-merge';

export default function BackButton() {
	const { theme } = useTheme();
	return (
		<Link href="/feed" className="hover:cursor-pointer inline-block">
			<button
				className={twMerge(
					'rounded-full absolute left-6 top-6 border p-2 hover:cursor-pointer transition',
					theme === 'dark'
						? 'border-white/10 bg-[#111827] text-white hover:bg-[#162033]'
						: 'border-slate-200 bg-white text-blue-950 hover:bg-slate-50'
				)}
			>
				<ArrowBigLeft fill={theme === 'dark' ? 'white' : '#10213d'} />
			</button>
		</Link>
	);
}
