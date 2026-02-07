<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

onMounted(() => {
  fetchProjects()
})

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
    ElMessage.error('获取项目列表失败')
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
    await ElMessageBox.confirm(`确定要删除项目「${name}」吗？此操作不可恢复。`, '删除确认', {
      type: 'warning',
    })
    const token = localStorage.getItem('token')
    await axios.delete(`/api/projects/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    ElMessage.success('删除成功')
    fetchProjects()
  } catch {
    // 用户取消
  }
}

function getStatusTag(status: string) {
  const map: Record<string, { type: string; label: string }> = {
    created: { type: 'info', label: '已创建' },
    analyzing: { type: '', label: '分析中' },
    assets_generating: { type: '', label: '资产生成中' },
    asset_review: { type: 'warning', label: '待审核' },
    storyboarding: { type: '', label: '分镜中' },
    anchoring: { type: '', label: '锚点生成中' },
    video_generating: { type: '', label: '视频生成中' },
    assembling: { type: '', label: '组装中' },
    completed: { type: 'success', label: '已完成' },
    failed: { type: 'danger', label: '失败' },
  }
  return map[status] || { type: 'info', label: status }
}

function handleLogout() {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<template>
  <div class="dashboard">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-left">
        <h1 class="logo-text">AI Comic Drama</h1>
      </div>
      <div class="header-right">
        <el-button text @click="router.push('/billing')">
          <el-icon><Wallet /></el-icon>
          费用
        </el-button>
        <el-button text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出
        </el-button>
      </div>
    </el-header>

    <!-- 主内容区 -->
    <el-main class="main">
      <div class="main-header">
        <h2>我的项目</h2>
        <el-button type="primary" @click="createDialogVisible = true">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
      </div>

      <div v-loading="loading" class="project-grid">
        <el-empty v-if="!loading && projects.length === 0" description="暂无项目，点击上方按钮创建">
        </el-empty>

        <el-card
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          shadow="hover"
          @click="router.push(`/project/${project.id}/overview`)"
        >
          <template #header>
            <div class="card-header">
              <span class="project-name">{{ project.name }}</span>
              <el-tag :type="(getStatusTag(project.status).type as any)" size="small">
                {{ getStatusTag(project.status).label }}
              </el-tag>
            </div>
          </template>
          <div class="card-body">
            <p class="card-info">
              <el-icon><Clock /></el-icon>
              {{ new Date(project.createdAt).toLocaleDateString('zh-CN') }}
            </p>
            <p class="card-info" v-if="project.currentStep">
              <el-icon><VideoPlay /></el-icon>
              当前步骤: {{ project.currentStep }}
            </p>
          </div>
          <div class="card-actions" @click.stop>
            <el-button text type="danger" size="small" @click="deleteProject(project.id, project.name)">
              删除
            </el-button>
          </div>
        </el-card>
      </div>
    </el-main>

    <!-- 新建项目对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建项目" width="420px">
      <el-input
        v-model="newProjectName"
        placeholder="请输入项目名称"
        size="large"
        @keyup.enter="createProject"
      />
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createProject">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dashboard {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  height: 60px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 8px;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.main-header h2 {
  margin: 0;
  color: #303133;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  min-height: 200px;
}

.project-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.card-body {
  padding: 0;
}

.card-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  margin: 8px 0;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
