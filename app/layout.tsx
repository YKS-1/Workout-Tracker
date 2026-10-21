import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import GlobalProviders from '@/lib/GlobalProviders';
import Navbar from '@/components/navbar';
import ThemeOption from '@/components/theme-option';

const inter = Inter({
	subsets: ['latin'],
	variable: '--font-inter',
});

export const metadata: Metadata = {
	title: 'FitHub | Workout Planner and Tracker',
	description:
		'FitHub is a feature-filled and easy-to-use workout application to track workouts, manage calories and connect with friends and influencers; designed and developed as a project for CMPT370W2026',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning={true}>
			<body className={`${inter.className} antialiased relative`}>
				<GlobalProviders>
					<Navbar />
					<ThemeOption />
					{children}
				</GlobalProviders>
			</body>
		</html>
	);
}
