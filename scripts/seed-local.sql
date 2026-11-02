-- 本地开发用的测试数据：只用于本地数据库，不要在线上执行
-- 用法：pnpm db:seed:local（重复执行不会重复写入）；pnpm db:reset:local 会清空本地数据库后自动执行
-- 用户与 web/src/lib/mock-user.ts 中的模拟用户对应，可在页面顶部的下拉框中切换

-- 已完成首次设置的用户：老师 1 人、学生 2 人、管理员 1 人（管理员本身是学生）
INSERT OR IGNORE INTO users
  (line_user_id, line_display_name, name, introduction, role, is_admin, created_at, updated_at)
VALUES
  ('U_mock_teacher', 'hanako', '山田 花子', '日本語を教えて30年になります。よろしくお願いします。', 'teacher', 0, unixepoch() * 1000, unixepoch() * 1000),
  ('U_mock_student', 'xiaoming', '王 小明', '在日本工作，想提高日语会话能力。', 'student', 0, unixepoch() * 1000, unixepoch() * 1000),
  ('U_mock_student2', 'lihua', '李 华', NULL, 'student', 0, unixepoch() * 1000, unixepoch() * 1000),
  ('U_mock_admin', 'admin', '管理员', NULL, 'student', 1, unixepoch() * 1000, unixepoch() * 1000);

-- 师生关系：老师与 3 个学生都已关联
INSERT OR IGNORE INTO teacher_students (teacher_id, student_id, created_at, updated_at)
SELECT t.id, s.id, unixepoch() * 1000, unixepoch() * 1000
FROM users t, users s
WHERE t.line_user_id = 'U_mock_teacher'
  AND s.line_user_id IN ('U_mock_student', 'U_mock_student2', 'U_mock_admin');

-- 已确认的课时：学生 A 有 20 课时、管理员有 10 课时（学生 B 没有，用来测试课时不足）
INSERT INTO credit_requests (teacher_student_id, amount, status, decided_at, created_at, updated_at)
SELECT ts.id, v.amount, 'approved', unixepoch() * 1000, unixepoch() * 1000, unixepoch() * 1000
FROM teacher_students ts
JOIN users s ON s.id = ts.student_id
JOIN (SELECT 'U_mock_student' AS line_user_id, 20 AS amount
      UNION ALL SELECT 'U_mock_admin', 10) v ON v.line_user_id = s.line_user_id
WHERE NOT EXISTS (SELECT 1 FROM credit_requests c WHERE c.teacher_student_id = ts.id);
