'use client';
import { TooltipProvider } from '@/components/ui/tooltip';
import ThemeContextProvider from '@/context/theme-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface FunctionProps {
	children: Readonly<React.ReactNode>;
}

// Creating a query client for Tanstack Query
const queryClient = new QueryClient();

export default function GlobalProviders({ children }: FunctionProps) {
	return (
		<>
			<QueryClientProvider client={queryClient}>
				<ReactQueryDevtools initialIsOpen={false} />
				<ThemeContextProvider>
					<TooltipProvider>{children}</TooltipProvider>
				</ThemeContextProvider>
			</QueryClientProvider>
		</>
	);
}
