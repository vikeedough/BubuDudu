export interface Milestone {
    id: number;
    title: string;
    date: string;
}

export interface Quote {
    id: string;
    created_at: string;
    quote: string;
}

export interface User {
    id: number;
    name: string;
    avatar_url: string;
}
