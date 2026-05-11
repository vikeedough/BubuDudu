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
    avatar_border_color: string | null;
    created_at: string;
    note: string | null;
    note_updated_at: string | null;
    date_of_birth: string | null;
}

export interface List {
    id: string;
    type: string;
    content: string;
    last_updated_at: string;
    space_id: string;
}

export interface Wheel {
    id: string;
    title: string;
    choices: string[];
    created_at: string;
    space_id: string;
}

export type ExpenseConversionStatus = "converted" | "pending" | "failed";

export interface ExpenseCategory {
    id: string;
    space_id: string;
    created_by: string | null;
    name: string;
    color: string;
    sort_order: number;
    is_default: boolean;
    created_at: string;
    updated_at?: string | null;
    deleted_at?: string | null;
}

export interface Expense {
    id: string;
    space_id: string;
    created_by: string;
    paid_by: string;
    category_id: string | null;
    category_name: string;
    category_color: string;
    title: string;
    description: string | null;
    amount: number;
    currency: string;
    base_amount: number | null;
    base_currency: string;
    exchange_rate: number | null;
    exchange_rate_date: string | null;
    conversion_status: ExpenseConversionStatus;
    paid_at: string;
    created_at: string;
    updated_at?: string | null;
    deleted_at?: string | null;
}

export type ExpenseBudgetScope = "space" | "user";

export interface ExpenseBudget {
    id: string;
    space_id: string;
    created_by: string;
    scope: ExpenseBudgetScope;
    owner_user_id: string | null;
    category_id: string;
    category_name: string;
    category_color: string;
    month: string;
    amount: number;
    currency: string;
    created_at: string;
    updated_at?: string | null;
    deleted_at?: string | null;
}

export interface SpaceInvite {
    space_id: string;
    code: string;
    created_by: string;
    created_at: string;
}
