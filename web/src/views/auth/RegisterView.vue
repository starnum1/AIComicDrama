<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const form = ref({
  nickname: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)

async function handleRegister() {
  if (!form.value.nickname || !form.value.email || !form.value.password) {
    ElMessage.warning('请填写所有必填字段')
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    ElMessage.warning('两次密码输入不一致')
    return
  }

  loading.value = true
  try {
    await axios.post('/api/auth/register', {
      nickname: form.value.nickname,
      email: form.value.email,
      password: form.value.password,
    })
    ElMessage.success('注册成功，请登录')
    router.push('/login')
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="register-page">
    <!-- 左侧品牌区 -->
    <div class="brand-side">
      <div class="brand-content">
        <div class="brand-icon">
          <el-icon :size="64" color="#fff"><Film /></el-icon>
        </div>
        <h1 class="brand-title">AI Comic Drama</h1>
        <p class="brand-desc">AI 驱动的短剧自动生成平台</p>
        <div class="brand-features">
          <div class="feature-item">
            <el-icon :size="20"><Document /></el-icon>
            <span>上传小说，自动分析角色与场景</span>
          </div>
          <div class="feature-item">
            <el-icon :size="20"><Picture /></el-icon>
            <span>AI 生成角色设定图和分镜</span>
          </div>
          <div class="feature-item">
            <el-icon :size="20"><VideoPlay /></el-icon>
            <span>一键生成完整短剧视频</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-side">
      <div class="form-wrapper">
        <h2 class="form-title">创建账号</h2>
        <p class="form-subtitle">开始创作你的 AI 短剧</p>

        <el-form @submit.prevent="handleRegister" class="register-form" size="large">
          <el-form-item>
            <el-input
              v-model="form.nickname"
              placeholder="用户名"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.email"
              placeholder="邮箱地址"
              :prefix-icon="Message"
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="form.confirmPassword"
              type="password"
              placeholder="确认密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>
          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              style="width: 100%"
              native-type="submit"
            >
              注册
            </el-button>
          </el-form-item>
        </el-form>

        <div class="form-footer">
          已有账号？
          <router-link to="/login">立即登录</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { User, Message, Lock } from '@element-plus/icons-vue'
export default { components: { User, Message, Lock } }
</script>

<style scoped>
.register-page {
  display: flex;
  height: 100vh;
  width: 100vw;
}

/* ===== 左侧品牌区 ===== */
.brand-side {
  width: 45%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
  position: relative;
  overflow: hidden;
}

.brand-side::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.15) 0%, transparent 70%);
  border-radius: 50%;
}

.brand-content {
  position: relative;
  z-index: 1;
  color: #fff;
  max-width: 440px;
}

.brand-icon {
  margin-bottom: 24px;
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-title {
  font-size: 36px;
  font-weight: 800;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.brand-desc {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 48px;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 右侧表单区 ===== */
.form-side {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  padding: 60px;
}

.form-wrapper {
  width: 100%;
  max-width: 400px;
}

.form-title {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}

.form-subtitle {
  font-size: 15px;
  color: #909399;
  margin: 0 0 40px;
}

.register-form :deep(.el-input__wrapper) {
  padding: 8px 12px;
}

.form-footer {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin-top: 24px;
}

.form-footer a {
  color: #409eff;
  font-weight: 500;
}
</style>
