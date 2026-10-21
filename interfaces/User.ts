export interface User {
	firstName: string;
	lastName: string;
	username: string;
	email: string;
	dateOfBirth: string;
	height: number;
	heightUnit: 'cm' | 'ft';
	weight: number;
	weightUnit: 'kg' | 'lbs';
}
