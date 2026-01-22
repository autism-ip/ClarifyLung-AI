-- =====================================================
-- 创建推理历史表 (inference_history)
-- 用于存储用户的肺癌检测历史记录
-- =====================================================

-- 创建推理历史表
CREATE TABLE IF NOT EXISTS inference_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 原始图像（Base64 或 URL）
  original_image TEXT NOT NULL,
  image_name TEXT,
  
  -- 推理结果
  classification TEXT NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  prob_normal DECIMAL(5,4),
  prob_benign DECIMAL(5,4),
  prob_malignant DECIMAL(5,4),
  
  -- 可视化结果（Base64 或 URL）
  gradcam_image TEXT,
  attention_image TEXT,
  
  -- 处理时间（毫秒）
  processing_time INTEGER
);

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_inference_history_user_email ON inference_history(user_email);
CREATE INDEX IF NOT EXISTS idx_inference_history_created_at ON inference_history(created_at DESC);

-- 添加注释
COMMENT ON TABLE inference_history IS '用户肺癌检测推理历史记录';
COMMENT ON COLUMN inference_history.user_email IS '用户邮箱';
COMMENT ON COLUMN inference_history.original_image IS '原始上传图像（Base64编码）';
COMMENT ON COLUMN inference_history.image_name IS '图像文件名';
COMMENT ON COLUMN inference_history.classification IS '分类结果：normal/benign/malignant';
COMMENT ON COLUMN inference_history.confidence IS '置信度（0-1）';
COMMENT ON COLUMN inference_history.prob_normal IS '正常概率';
COMMENT ON COLUMN inference_history.prob_benign IS '良性概率';
COMMENT ON COLUMN inference_history.prob_malignant IS '恶性概率';
COMMENT ON COLUMN inference_history.gradcam_image IS 'Grad-CAM++热力图';
COMMENT ON COLUMN inference_history.attention_image IS '注意力图';
COMMENT ON COLUMN inference_history.processing_time IS '处理时间（毫秒）';

-- =====================================================
-- 可选：启用 Row Level Security (RLS)
-- 如果您的 Supabase 项目需要 RLS，请取消下面的注释
-- =====================================================

-- ALTER TABLE inference_history ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的记录
-- CREATE POLICY "Users can view own history" ON inference_history
--   FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- 创建策略：用户只能插入自己的记录  
-- CREATE POLICY "Users can insert own history" ON inference_history
--   FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- 创建策略：用户只能删除自己的记录
-- CREATE POLICY "Users can delete own history" ON inference_history
--   FOR DELETE USING (auth.jwt() ->> 'email' = user_email);
