-- users 表（MVP 可选，先不做认证）
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- styles 表（预设风格）
CREATE TABLE IF NOT EXISTS styles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_styles_sort_order ON styles(sort_order ASC);
CREATE INDEX IF NOT EXISTS idx_styles_is_active ON styles(is_active);

-- projects 表（生成任务）
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT,

  -- 输入参数
  input_type TEXT NOT NULL CHECK(input_type IN ('text', 'image', 'mixed')),
  input_content TEXT NOT NULL,

  -- 风格参数
  style_id TEXT,
  custom_prompt TEXT,

  -- 生成参数
  seed INTEGER NOT NULL,

  -- 状态
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'completed', 'partial_failed')),

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (style_id) REFERENCES styles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- images 表（生成的图片）
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,

  -- 类型标识
  category TEXT NOT NULL CHECK(category IN ('emotion', 'surprise')),
  emotion_type TEXT,
  surprise_index INTEGER,

  -- 生成参数
  prompt TEXT NOT NULL,
  seed INTEGER NOT NULL,

  -- 存储路径
  file_path TEXT NOT NULL,

  -- 状态
  status TEXT NOT NULL CHECK(status IN ('pending', 'generating', 'success', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- 元数据
  width INTEGER,
  height INTEGER,
  model_metadata TEXT,

  -- 时间戳
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
