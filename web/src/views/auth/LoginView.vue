<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const form = ref({
  email: '',
  password: '',
})
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
  <div class="login-container">
    <div class="login-card">
      <h1 class="title">AI Comic Drama</h1>
      <p class="subtitle">AI 短剧生成平台</p>

      <el-form @submit.prevent="handleLogin" class="login-form">
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
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            style="width: 100%"
            native-type="submit"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="footer-link">
        还没有账号？
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
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

.login-form {
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
