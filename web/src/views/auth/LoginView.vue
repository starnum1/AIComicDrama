<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const form = ref({ email: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (!form.value.email || !form.value.password) {
    ElMessage.warning('请填写邮箱和密码')
    return
  }
  loading.value = true
  try {
    const { data } = await axios.post('/api/auth/login', form.value)
    localStorage.setItem('token', data.access_token)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- 背景装饰 -->
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-grid"></div>

    <!-- 主体内容 -->
    <div class="auth-container">
      <!-- 左侧品牌 -->
      <div class="brand-panel">
        <div class="brand-content">
          <div class="brand-badge">AI Powered</div>
          <h1 class="brand-title">
            将文字化为
            <span class="gradient-text">动漫短剧</span>
          </h1>
          <p class="brand-desc">
            上传小说文本，AI 自动完成角色设计、场景构建、分镜编排和视频合成，一键生成完整动漫短剧
          </p>

          <div class="feature-list">
            <div class="feature-item">
              <div class="feature-icon">
                <el-icon :size="20"><EditPen /></el-icon>
              </div>
              <div>
                <div class="feature-name">智能分析</div>
                <div class="feature-desc">自动提取角色、场景和剧情结构</div>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon accent">
                <el-icon :size="20"><Picture /></el-icon>
              </div>
              <div>
                <div class="feature-name">视觉资产</div>
                <div class="feature-desc">AI 生成角色设定图和场景锚图</div>
              </div>
            </div>
            <div class="feature-item">
              <div class="feature-icon warm">
                <el-icon :size="20"><VideoPlay /></el-icon>
              </div>
              <div>
                <div class="feature-name">视频合成</div>
                <div class="feature-desc">全自动分镜到成片的流水线</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单 -->
      <div class="form-panel">
        <div class="form-card">
          <h2 class="form-title">欢迎回来</h2>
          <p class="form-subtitle">登录你的账号</p>

          <form @submit.prevent="handleLogin" class="auth-form">
            <div class="form-field">
              <label>邮箱地址</label>
              <el-input v-model="form.email" placeholder="your@email.com" size="large" />
            </div>
            <div class="form-field">
              <label>密码</label>
              <el-input v-model="form.password" type="password" placeholder="输入密码" size="large" show-password />
            </div>
            <button type="submit" class="btn-submit" :disabled="loading">
              <span v-if="loading" class="loading-spinner"></span>
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <div class="form-footer">
            还没有账号？
            <router-link to="/register">立即注册</router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  height: 100vh;
  width: 100vw;
  background: var(--bg-deep);
  position: relative;
  overflow: hidden;
}

/* 背景 */
.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
}

.orb-1 {
  width: 700px;
  height: 700px;
  background: rgba(108, 92, 231, 0.15);
  top: -300px;
  left: -200px;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: rgba(0, 206, 201, 0.08);
  bottom: -200px;
  right: -100px;
}

.bg-grid {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(108, 92, 231, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(108, 92, 231, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}

/* 容器 */
.auth-container {
  position: relative;
  z-index: 1;
  display: flex;
  height: 100%;
}

/* 左侧品牌 */
.brand-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.brand-content {
  max-width: 480px;
}

.brand-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(108, 92, 231, 0.15);
  color: var(--primary-light);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
}

.brand-title {
  font-size: 44px;
  font-weight: 900;
  line-height: 1.15;
  color: var(--text-primary);
  margin: 0 0 20px;
}

.gradient-text {
  background: linear-gradient(135deg, #6c5ce7, #00cec9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-desc {
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-secondary);
  margin: 0 0 48px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.feature-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(108, 92, 231, 0.15);
  color: var(--primary-light);
  flex-shrink: 0;
}

.feature-icon.accent {
  background: rgba(0, 206, 201, 0.15);
  color: var(--accent);
}

.feature-icon.warm {
  background: rgba(253, 121, 168, 0.15);
  color: var(--accent-pink);
}

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.feature-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* 右侧表单 */
.form-panel {
  width: 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.form-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  padding: 40px;
}

.form-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
}

.form-subtitle {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 32px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  margin-top: 4px;
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-submit:hover:not(:disabled) {
  box-shadow: 0 0 25px rgba(108, 92, 231, 0.4);
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-footer {
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  margin-top: 24px;
}

.form-footer a {
  color: var(--primary-light);
  font-weight: 500;
}

.form-footer a:hover {
  color: var(--accent);
}
</style>
