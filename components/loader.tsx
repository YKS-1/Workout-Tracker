type LoaderSize = 'small' | 'medium' | 'large';

interface FunctionProps {
	size?: LoaderSize;
	className?: string;
}

const sizeClasses: Record<LoaderSize, string> = {
	small: 'h-4 w-4 border-2',
	medium: 'h-8 w-8 border-4',
	large: 'h-12 w-12 border-4',
};

export default function Loader({
	size = 'medium',
	className = '',
}: FunctionProps) {
	return (
		<div
			className={`
        animate-spin rounded-full
        border-gray-300 border-t-blue-500
        ${sizeClasses[size]}
        ${className}
      `}
		></div>
	);
}
