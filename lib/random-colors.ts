export default function randomColor(id: string) {
	const COLORS_LIST = [
		'#E76F2E',
		'#406093',
		'#9B0F06',
		'#A0D585',
		'#6367FF',
		'#FF3E9B',
		'#C00707',
		'#B500B2',
		'#685AFF',
		'#FF9644',
		'#562F00',
		'#982598',
		'#30364F',
		'#656D3F',
		'#A5C89E',
		'#0C7779',
		'#4B9DA9',
		'#26CCC2',
		'#FF6D1F',
		'#F875AA',
		'#C1785A',
	];

	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = id.charCodeAt(i) + ((hash << 5) - hash);
	}

	return COLORS_LIST[Math.abs(hash) % COLORS_LIST.length];
}
