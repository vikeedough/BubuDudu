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

export interface Profile {
    id: string;
    name: string | null;
    avatar_url: string | null;
    created_at: string;
    note: string | null;
    note_updated_at: string | null;
    date_of_birth: string | null;
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
    space_id: string;
}

export interface Gallery {
    id: string;
    title: string;
    date: string | Date;
    created_at: string;
    color: string;
    location: string;
    cover_image: string;
    cover_image_blur_hash: string;
    space_id: string;
}

export interface DateImage {
    id: number;
    gallery_id: string;
    url: string;
    created_at: string;
    blur_hash: string;
    storage_path: string;
}

export interface Wheel {
    id: string;
    title: string;
    choices: string[];
    created_at: string;
    space_id: string;
}

export interface Choice {
    choice: string;
}

export interface SpaceInvite {
    space_id: string;
    code: string;
    created_by: string;
    created_at: string;
}