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
    note: string;
    note_updated_at: string;
}

export interface List {
    id: number;
    type: string;
    content: string;
}
