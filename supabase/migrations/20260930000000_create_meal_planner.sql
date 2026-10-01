create table public.daily_meal_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null default current_date,
  breakfast text not null default '' check (char_length(breakfast) <= 500),
  lunch text not null default '' check (char_length(lunch) <= 500),
  dinner text not null default '' check (char_length(dinner) <= 500),
  snack text not null default '' check (char_length(snack) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, meal_date)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) between 1 and 120),
  is_checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.daily_meal_plans enable row level security;
alter table public.shopping_items enable row level security;

create policy "Meal Planner users manage their own daily meal plans"
  on public.daily_meal_plans for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Meal Planner users manage their own shopping items"
  on public.shopping_items for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
