export interface Friend {
	userId: string;
	firstName: string;
	lastName: string;
	username: string;
	status: 'accepted' | 'pending' | 'rejected';
}
