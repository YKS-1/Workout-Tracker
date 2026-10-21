import SearchBar from '@/components/search-bar';

interface FunctionProps {
	children: Readonly<React.ReactNode>;
}

export default function Layout({ children }: FunctionProps) {
	return (
		<>
			<SearchBar />
			{children}
		</>
	);
}
