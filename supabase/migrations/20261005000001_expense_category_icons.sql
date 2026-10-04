-- Nullable for older clients and existing rows. The app resolves name-based
-- defaults for NULL/unknown keys and writes stable MaterialCommunityIcons keys.
alter table public.expense_categories
    add column if not exists icon text;

comment on column public.expense_categories.icon is
    'MaterialCommunityIcons key; NULL uses the app category-name default.';
