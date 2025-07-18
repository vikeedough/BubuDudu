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
    id: string;
    type: string;
    content: string;
    last_updated_at: string;
}

export interface Gallery {
    id: string;
    title: string;
    date: string;
    created_at: string;
}

export interface DateImage {
    id: number;
    gallery_id: string;
    url: string;
    created_at: string;
}

export interface Choice {
    id: number;
    choice: string;
    created_at: string;
}
