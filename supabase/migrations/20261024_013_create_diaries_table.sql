-- ==============================================================================
-- MIGRATION 013: TẠO BẢNG DIARIES (NHẬT KÝ THEO NGÀY TRÊN LỊCH)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.diaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    mood TEXT CHECK (mood IN ('happy', 'calm', 'excited', 'sad', 'grateful')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_diaries_user_date ON public.diaries(user_id, entry_date);

ALTER TABLE public.diaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own diaries" ON public.diaries;
CREATE POLICY "Users can view their own diaries"
    ON public.diaries FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own diaries" ON public.diaries;
CREATE POLICY "Users can insert their own diaries"
    ON public.diaries FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own diaries" ON public.diaries;
CREATE POLICY "Users can update their own diaries"
    ON public.diaries FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own diaries" ON public.diaries;
CREATE POLICY "Users can delete their own diaries"
    ON public.diaries FOR DELETE
    USING (auth.uid() = user_id);
