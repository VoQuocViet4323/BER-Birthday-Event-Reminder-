-- ==============================================================================
-- SEED DATA: DỮ LIỆU MẪU ĐỂ TEST & DEMO ỨNG DỤNG NHẮC SINH NHẬT & SỰ KIỆN
-- Chú ý: Script này tạo dữ liệu demo liên kết với một user_id mẫu
-- ==============================================================================

DO $$
DECLARE
    demo_user_id UUID;
BEGIN
    -- Tìm xem có user nào trong hệ thống chưa, nếu chưa có tạo một UUID demo
    SELECT id INTO demo_user_id FROM auth.users LIMIT 1;

    IF demo_user_id IS NULL THEN
        demo_user_id := '00000000-0000-0000-0000-000000000001'::uuid;
        
        -- Tạo profile demo nếu chưa có auth.users
        INSERT INTO public.profiles (id, display_name, avatar_url, timezone, onboarded)
        VALUES (
            demo_user_id,
            'Nguyễn Văn Demo',
            'https://api.dicebear.com/7.x/avataaars/svg?seed=DemoUser',
            'Asia/Ho_Chi_Minh',
            true
        ) ON CONFLICT (id) DO NOTHING;

        -- Tạo user settings
        INSERT INTO public.user_settings (user_id, email_enabled, default_remind_days, remind_time)
        VALUES (
            demo_user_id,
            true,
            ARRAY[7, 3, 1, 0],
            '08:00'::time
        ) ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Xóa các sự kiện seed cũ của user này nếu có
    DELETE FROM public.events WHERE user_id = demo_user_id;

    -- Thêm các sự kiện mẫu đa dạng
    INSERT INTO public.events (
        user_id, name, event_type, event_day, event_month, event_year,
        is_lunar, group_name, note, gift_idea, avatar_url, repeat_yearly, remind_days, enabled
    ) VALUES
    -- 1. Sinh nhật Mẹ yêu (Gia đình)
    (
        demo_user_id,
        'Mẹ yêu',
        'birthday',
        25, 10, 1968,
        false,
        'Gia đình',
        'Mẹ thích hoa lan hồ điệp tím và áo dài truyền thống. Cả nhà tập trung ăn tối.',
        'Khăn lụa tơ tằm, máy massage cổ vai gáy',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=Mommy',
        true,
        ARRAY[14, 7, 3, 1, 0],
        true
    ),
    -- 2. Sinh nhật Bạn thân Tuấn Anh (Bạn bè) - Sắp diễn ra
    (
        demo_user_id,
        'Tuấn Anh (Cạ cứng)',
        'birthday',
        28, 10, 1996,
        false,
        'Bạn bè',
        'Hẹn kèo lẩu ếch với nhóm bạn đại học.',
        'Tai nghe bluetooth chống ồn, chuột không dây công thái học',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=TuanAnh',
        true,
        ARRAY[3, 1, 0],
        true
    ),
    -- 3. Kỷ niệm ngày cưới ba mẹ (Kỷ niệm)
    (
        demo_user_id,
        'Kỷ niệm ngày cưới Ba Mẹ',
        'anniversary',
        15, 11, 1992,
        false,
        'Gia đình',
        'Kỷ niệm 34 năm ngày cưới. Đặt bàn nhà hàng ven sông.',
        'Chuyến du lịch nghỉ dưỡng Đà Lạt 3 ngày 2 đêm',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=WeddingAnniversary',
        true,
        ARRAY[7, 1, 0],
        true
    ),
    -- 4. Giỗ Ông Nội (Âm lịch)
    (
        demo_user_id,
        'Giỗ Ông Nội (Âm lịch)',
        'memorial',
        10, 12, NULL,
        true,
        'Gia đình',
        'Làm mâm cỗ cúng gia tiên lúc 10h sáng ở quê. Cần về từ chiều hôm trước.',
        'Hoa quả tươi, bánh chưng, giò lụa',
        NULL,
        true,
        ARRAY[7, 3, 1, 0],
        true
    ),
    -- 5. Sinh nhật Sếp Minh (Đồng nghiệp)
    (
        demo_user_id,
        'Anh Minh (Trưởng phòng)',
        'birthday',
        5, 11, 1985,
        false,
        'Đồng nghiệp',
        'Team mua bánh kem và góp quà chung tặng sếp vào giờ nghỉ trưa.',
        'Bút ký cao cấp Parker, sổ tay da thật',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=BossMinh',
        true,
        ARRAY[7, 1, 0],
        true
    ),
    -- 6. Họp lớp cấp 3 niên khóa 2011-2014 (Khác)
    (
        demo_user_id,
        'Họp lớp cấp 3 Chuyên Lam Sơn',
        'other',
        20, 11, 2014,
        false,
        'Khác',
        'Gặp mặt tại cổng trường cũ, tri ân thầy cô nhân ngày 20/11.',
        'Hoa tươi tặng thầy cô chủ nhiệm',
        NULL,
        true,
        ARRAY[14, 7, 1, 0],
        true
    ),
    -- 7. Sinh nhật ngày 29/02 (Năm nhuận) của em gái họ
    (
        demo_user_id,
        'Thảo Linh (Sinh 29/2)',
        'birthday',
        29, 2, 2004,
        false,
        'Gia đình',
        '4 năm mới có 1 lần sinh nhật đúng ngày! Năm không nhuận chúc ngày 28/2.',
        'Gấu bông capybara, son dưỡng môi',
        'https://api.dicebear.com/7.x/avataaars/svg?seed=ThaoLinh',
        true,
        ARRAY[3, 1, 0],
        true
    );

END $$;
