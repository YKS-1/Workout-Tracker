'use client';

import { useTheme } from '@/context/theme-context';
import { Moon, SunMedium } from 'lucide-react';

const ICON_SIZE = 16;

export default function ThemeSwitch() {
	const { theme, lightSwitch, darkSwitch } = useTheme();

	const lightStyles = `bg-white border-slate-200 text-slate-900`;
	const darkStyles = `bg-[#111827] border-white/10 shadow-black/20 text-white`;

	return (
		<div
			className={`fixed top-4 right-2 z-50 flex items-center justify-center gap-x-2 rounded-full border px-2 py-1.5 shadow-md ${theme === 'dark' ? darkStyles : lightStyles}`}
		>
			<button
				className={`rounded-full p-[2px] hover:cursor-pointer ${theme === 'light' && 'bg-slate-200'}`}
				onClick={lightSwitch}
				aria-label="Light Mode"
			>
				<SunMedium size={ICON_SIZE} />
			</button>
			<button
				className={`rounded-full p-[2px] hover:cursor-pointer ${theme === 'dark' && 'bg-blue-100 text-slate-900'}`}
				onClick={darkSwitch}
				aria-label="Dark Mode"
			>
				<Moon size={ICON_SIZE} />
			</button>
		</div>
	);
}
