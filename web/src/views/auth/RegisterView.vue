<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const form = ref({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)

async function handleRegister() {
  if (!form.value.name || !form.value.email || !form.value.password) {
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
      name: form.value.name,
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
  <div class="register-container">
    <div class="register-card">
      <h1 class="title">创建账号</h1>
      <p class="subtitle">开始创作你的 AI 短剧</p>

      <el-form @submit.prevent="handleRegister" class="register-form">
        <el-form-item>
          <el-input
            v-model="form.name"
            placeholder="用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.email"
            placeholder="邮箱"
            prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            native-type="submit"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer-link">
        已有账号？
        <router-link to="/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.register-card {
  width: 400px;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.title {
  text-align: center;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin: 0 0 8px;
}

.subtitle {
  text-align: center;
  color: #909399;
  margin: 0 0 32px;
}

.register-form {
  margin-top: 20px;
}

.footer-link {
  text-align: center;
  color: #909399;
  font-size: 14px;
  margin-top: 16px;
}

.footer-link a {
  color: #409eff;
  text-decoration: none;
}
</style>
