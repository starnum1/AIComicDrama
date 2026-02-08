<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const router = useRouter()

interface Project {
  id: string
  name: string
  status: string
  currentStep: string
  createdAt: string
  updatedAt: string
}

const projects = ref<Project[]>([])
const loading = ref(false)
const createDialogVisible = ref(false)
const newProjectName = ref('')
const nickname = ref('')

onMounted(() => {
  fetchProjects()
  fetchProfile()
})

async function fetchProfile() {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
    nickname.value = data.nickname || data.email
  } catch {
    // ignore
  }
}

async function fetchProjects() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/projects', {
      headers: { Authorization: `Bearer ${token}` },
    })
    projects.value = data
  } catch (err: any) {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      router.push('/login')
    }
  } finally {
    loading.value = false
  }
}

async function createProject() {
  if (!newProjectName.value.trim()) {
    ElMessage.warning('请输入项目名称')
    return
  }
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.post(
      '/api/projects',
      { name: newProjectName.value },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    createDialogVisible.value = false
    newProjectName.value = ''
    ElMessage.success('项目创建成功')
    router.push(`/project/${data.id}/overview`)
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  }
}

async function deleteProject(id: string, name: string) {
  try {
    await ElMessageBox.confirm(`确定删除「${name}」？此操作不可恢复`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const token = localStorage.getItem('token')
    await axios.delete(`/api/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    ElMessage.success('删除成功')
    fetchProjects()
  } catch {
    // cancelled
  }
}

function getStatusInfo(status: string) {
  // 处理通用的 _processing 和 _review 状态
  if (status?.endsWith('_processing')) {
    return { color: '#6c5ce7', label: '执行中', icon: 'Loading' }
  }
  if (status?.endsWith('_review')) {
    return { color: '#fdcb6e', label: '待确认', icon: 'View' }
  }
  const map: Record<string, { color: string; label: string; icon: string }> = {
    created: { color: '#a0a0b8', label: '草稿', icon: 'Edit' },
    completed: { color: '#00b894', label: '已完成', icon: 'CircleCheck' },
    failed: { color: '#d63031', label: '失败', icon: 'CircleClose' },
  }
  return map[status] || { color: '#a0a0b8', label: status || '草稿', icon: 'Document' }
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return d.toLocaleDateString('zh-CN')
}

function handleLogout() {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<template>
  <div class="page">
    <!-- 背景装饰 -->
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>
    <div class="bg-orb orb-3"></div>

    <!-- 顶部导航 -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">
          <div class="brand-icon">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
              <rect width="32" height="32" rx="8" fill="url(#g1)" />
              <path d="M8 22V10l8 6-8 6z" fill="#fff" />
              <path d="M16 22V10l8 6-8 6z" fill="#fff" opacity="0.6" />
              <defs><linearGradient id="g1" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6c5ce7"/><stop offset="1" stop-color="#a29bfe"/></linearGradient></defs>
            </svg>
          </div>
          <span class="brand-name">AI Comic Drama</span>
        </div>
      </div>
      <nav class="topbar-nav">
        <a class="nav-item active" @click="router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          工作台
        </a>
        <a class="nav-item" @click="router.push('/billing')">
          <el-icon><Coin /></el-icon>
          费用
        </a>
        <a class="nav-item" @click="router.push('/settings/ai-providers')">
          <el-icon><Setting /></el-icon>
          AI 配置
        </a>
      </nav>
      <div class="topbar-right">
        <el-dropdown trigger="click">
          <div class="user-chip">
            <el-avatar :size="30" class="user-avatar">
              {{ (nickname || 'U')[0].toUpperCase() }}
            </el-avatar>
            <span class="user-name">{{ nickname || '用户' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/billing')">费用管理</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="main">
      <!-- Hero 区域 -->
      <section class="hero">
        <div class="hero-content">
          <h1 class="hero-title">
            用 AI 将小说变成
            <span class="gradient-text">动漫短剧</span>
          </h1>
          <p class="hero-desc">
            上传你的小说文本，AI 自动完成角色设计、分镜编排、视频生成，一站式产出完整短剧
          </p>
          <div class="hero-actions">
            <button class="btn-primary btn-glow" @click="createDialogVisible = true">
              <el-icon><Plus /></el-icon>
              创建新项目
            </button>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-pill">
            <span class="stat-num">{{ projects.length }}</span>
            <span class="stat-label">个项目</span>
          </div>
          <div class="stat-pill">
            <span class="stat-num">{{ projects.filter(p => p.status === 'completed').length }}</span>
            <span class="stat-label">已完成</span>
          </div>
          <div class="stat-pill">
            <span class="stat-num">{{ projects.filter(p => !['created','completed','failed'].includes(p.status)).length }}</span>
            <span class="stat-label">生成中</span>
          </div>
        </div>
      </section>

      <!-- 项目列表 -->
      <section class="projects-section">
        <div class="section-header">
          <h2 class="section-title">我的项目</h2>
          <button class="btn-ghost" @click="fetchProjects" :disabled="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </button>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && projects.length === 0" class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 120 120" width="120" height="120" fill="none">
              <circle cx="60" cy="60" r="50" fill="rgba(108,92,231,0.1)" stroke="rgba(108,92,231,0.2)" stroke-width="2"/>
              <path d="M45 65V50l20 15-20 15V65z" fill="rgba(108,92,231,0.4)"/>
              <path d="M55 65V50l20 15-20 15V65z" fill="rgba(108,92,231,0.25)"/>
            </svg>
          </div>
          <h3 class="empty-title">开始你的创作之旅</h3>
          <p class="empty-desc">创建第一个项目，上传小说文本，让 AI 为你生成动漫短剧</p>
          <button class="btn-primary" @click="createDialogVisible = true">
            <el-icon><Plus /></el-icon>
            创建第一个项目
          </button>
        </div>

        <!-- 项目卡片网格 -->
        <div v-else class="project-grid" v-loading="loading">
          <!-- 新建卡片 -->
          <div class="project-card create-card" @click="createDialogVisible = true">
            <div class="create-icon">
              <el-icon :size="36"><Plus /></el-icon>
            </div>
            <span class="create-text">新建项目</span>
          </div>

          <!-- 项目卡片 -->
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="router.push(`/project/${project.id}/overview`)"
          >
            <!-- 卡片顶部装饰条 -->
            <div
              class="card-accent"
              :style="{ background: `linear-gradient(135deg, ${getStatusInfo(project.status).color}, ${getStatusInfo(project.status).color}88)` }"
            ></div>

            <div class="card-body">
              <div class="card-top">
                <h3 class="card-title">{{ project.name }}</h3>
                <div
                  class="status-badge"
                  :style="{ color: getStatusInfo(project.status).color, borderColor: getStatusInfo(project.status).color + '40', background: getStatusInfo(project.status).color + '15' }"
                >
                  <el-icon :size="12"><component :is="getStatusInfo(project.status).icon" /></el-icon>
                  {{ getStatusInfo(project.status).label }}
                </div>
              </div>

              <div class="card-meta">
                <span class="meta-item">
                  <el-icon :size="14"><Clock /></el-icon>
                  {{ timeAgo(project.updatedAt) }}
                </span>
                <span v-if="project.currentStep && project.currentStep !== 'created'" class="meta-item">
                  <el-icon :size="14"><Operation /></el-icon>
                  {{ project.currentStep }}
                </span>
              </div>
            </div>

            <div class="card-footer" @click.stop>
              <button class="btn-card" @click="router.push(`/project/${project.id}/overview`)">
                打开项目
              </button>
              <button class="btn-card-danger" @click="deleteProject(project.id, project.name)">
                <el-icon><Delete /></el-icon>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 新建对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建新项目"
      width="480px"
      :append-to-body="true"
      class="create-dialog"
    >
      <div class="dialog-hint">为你的短剧项目取一个名字</div>
      <el-input
        v-model="newProjectName"
        placeholder="例如：校园悬疑短剧、都市奇幻冒险..."
        size="large"
        @keyup.enter="createProject"
      />
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createProject">
          <el-icon><Plus /></el-icon>
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  width: 100vw;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-deep);
  position: relative;
}

/* ===== 背景装饰球 ===== */
.bg-orb {
  position: fixed;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: rgba(108, 92, 231, 0.12);
  top: -200px;
  right: -100px;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: rgba(0, 206, 201, 0.08);
  bottom: -100px;
  left: -100px;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: rgba(253, 121, 168, 0.06);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* ===== 顶部导航 ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  background: rgba(10, 10, 26, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}

.topbar-left {
  display: flex;
  align-items: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}

.topbar-nav {
  display: flex;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-item:hover {
  color: var(--text-primary);
  background: var(--bg-glass);
}

.nav-item.active {
  color: var(--primary-light);
  background: rgba(108, 92, 231, 0.12);
}

.topbar-right {
  display: flex;
  align-items: center;
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.2s;
  color: var(--text-secondary);
}

.user-chip:hover {
  background: var(--bg-glass);
}

.user-avatar {
  background: var(--gradient-primary) !important;
  color: #fff !important;
  font-weight: 600;
  font-size: 13px;
}

.user-name {
  font-size: 13px;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 主内容 ===== */
.main {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 32px 60px;
}

/* ===== Hero 区域 ===== */
.hero {
  padding: 60px 0 48px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 40px;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-size: 42px;
  font-weight: 900;
  line-height: 1.2;
  color: var(--text-primary);
  margin: 0 0 16px;
}

.gradient-text {
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0 0 32px;
  max-width: 520px;
}

.hero-actions {
  display: flex;
  gap: 12px;
}

.hero-stats {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  min-width: 90px;
}

.stat-num {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}

/* ===== 按钮 ===== */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: inherit;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow);
}

.btn-glow {
  box-shadow: 0 0 20px rgba(108, 92, 231, 0.25);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-ghost:hover {
  color: var(--text-primary);
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.08);
}

/* ===== 项目列表 ===== */
.projects-section {
  padding-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
}

.empty-icon {
  margin-bottom: 24px;
  opacity: 0.8;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0 0 32px;
}

/* ===== 项目卡片网格 ===== */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.project-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.project-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 8px 30px rgba(108, 92, 231, 0.15);
}

.card-accent {
  height: 4px;
  width: 100%;
}

.card-body {
  padding: 20px 20px 16px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
  flex: 1;
  word-break: break-all;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
  flex-shrink: 0;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
}

.btn-card {
  padding: 6px 16px;
  background: rgba(108, 92, 231, 0.1);
  color: var(--primary-light);
  border: none;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-card:hover {
  background: rgba(108, 92, 231, 0.2);
}

.btn-card-danger {
  padding: 6px 10px;
  background: transparent;
  color: var(--text-muted);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-card-danger:hover {
  color: #d63031;
  background: rgba(214, 48, 49, 0.1);
}

/* ===== 新建卡片 ===== */
.create-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  border-style: dashed;
  border-color: var(--border-light);
  background: transparent;
}

.create-card:hover {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.05);
}

.create-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(108, 92, 231, 0.1);
  color: var(--primary-light);
  margin-bottom: 12px;
}

.create-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* ===== 对话框 ===== */
.dialog-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
</style>
