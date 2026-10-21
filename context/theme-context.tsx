'use client';

import { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContext {
	theme: 'dark' | 'light';
	lightSwitch: () => void;
	darkSwitch: () => void;
}

const ThemeContext = createContext<ThemeContext | null>(null);

interface FunctionProps {
	children: Readonly<React.ReactNode>;
}

export default function ThemeContextProvider({ children }: FunctionProps) {
	type ThemeState = 'light' | 'dark';
	const [theme, setTheme] = useState<ThemeState>('dark');

	// Check for system settings as a useEffect side effect
	useEffect(function () {
		const systemSettingsTheme = window.matchMedia(
			'(prefers-color-scheme: dark)',
		).matches
			? 'dark'
			: 'light';

		const storageOption: ThemeState =
			(localStorage.getItem('fithub-theme') as ThemeState) ??
			(systemSettingsTheme as ThemeState);

		// eslint-disable-next-line react-hooks/set-state-in-effect
		setTheme(storageOption);
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle('dark', theme === 'dark');
		root.classList.toggle('light', theme === 'light');
		root.style.colorScheme = theme;
	}, [theme]);

	function lightSwitch() {
		setTheme('light');
		localStorage.setItem('fithub-theme', 'light');
	}

	function darkSwitch() {
		setTheme('dark');
		localStorage.setItem('fithub-theme', 'dark');
	}

	return (
		<ThemeContext.Provider value={{ theme, lightSwitch, darkSwitch }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error(
			'Error: useTheme hook used outside the ThemeContext provider',
		);
	}

	return context;
}
