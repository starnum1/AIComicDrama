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

const stats = computed(() => ({
  total: projects.value.length,
  running: projects.value.filter((p) =>
    ['analyzing', 'assets_generating', 'storyboarding', 'anchoring', 'video_generating', 'assembling'].includes(p.status),
  ).length,
  completed: projects.value.filter((p) => p.status === 'completed').length,
  failed: projects.value.filter((p) => p.status === 'failed').length,
}))

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleLogout() {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<template>
  <el-container class="dashboard-container">
    <!-- 左侧导航 -->
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><Film /></el-icon>
        <span class="logo-title">AI Comic Drama</span>
      </div>
      <el-menu default-active="projects" class="aside-menu">
        <el-menu-item index="projects">
          <el-icon><Grid /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="billing" @click="router.push('/billing')">
          <el-icon><Wallet /></el-icon>
          <span>费用管理</span>
        </el-menu-item>
      </el-menu>
      <div class="aside-footer">
        <el-dropdown trigger="click">
          <div class="user-info">
            <el-avatar :size="32" icon="User" />
            <span class="user-name">{{ nickname || '用户' }}</span>
            <el-icon class="ml-auto"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-aside>

    <!-- 右侧主内容 -->
    <el-container>
      <!-- 顶栏 -->
      <el-header class="header">
        <div class="header-left">
          <h2 class="page-title">项目管理</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" size="default" @click="createDialogVisible = true">
            <el-icon><Plus /></el-icon>
            新建项目
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card shadow="never" class="stat-card">
              <div class="stat-icon" style="background: #ecf5ff; color: #409eff">
                <el-icon :size="24"><Folder /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">全部项目</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="never" class="stat-card">
              <div class="stat-icon" style="background: #fdf6ec; color: #e6a23c">
                <el-icon :size="24"><Loading /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.running }}</div>
                <div class="stat-label">进行中</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="never" class="stat-card">
              <div class="stat-icon" style="background: #f0f9eb; color: #67c23a">
                <el-icon :size="24"><CircleCheck /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.completed }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card shadow="never" class="stat-card">
              <div class="stat-icon" style="background: #fef0f0; color: #f56c6c">
                <el-icon :size="24"><CircleClose /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-value">{{ stats.failed }}</div>
                <div class="stat-label">失败</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 项目表格 -->
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="table-header">
              <span>项目列表</span>
              <el-button text type="primary" @click="fetchProjects" :loading="loading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <el-table
            :data="projects"
            v-loading="loading"
            style="width: 100%"
            :header-cell-style="{ background: '#fafafa', color: '#606266' }"
            @row-click="(row: Project) => router.push(`/project/${row.id}/overview`)"
            row-class-name="clickable-row"
          >
            <el-table-column prop="name" label="项目名称" min-width="200">
              <template #default="{ row }">
                <div class="project-name-cell">
                  <el-icon :size="18" color="#409eff"><Folder /></el-icon>
                  <span class="project-name">{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="140" align="center">
              <template #default="{ row }">
                <el-tag :type="(getStatusTag(row.status).type as any)" size="default" effect="light">
                  {{ getStatusTag(row.status).label }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="currentStep" label="当前步骤" width="160" align="center">
              <template #default="{ row }">
                <span class="step-text">{{ row.currentStep || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
              <template #default="{ row }">
                {{ formatDate(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="updatedAt" label="更新时间" width="180" align="center">
              <template #default="{ row }">
                {{ formatDate(row.updatedAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" align="center" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="primary"
                  link
                  size="default"
                  @click.stop="router.push(`/project/${row.id}/overview`)"
                >
                  查看
                </el-button>
                <el-button
                  type="danger"
                  link
                  size="default"
                  @click.stop="deleteProject(row.id, row.name)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>

            <template #empty>
              <el-empty description="暂无项目" :image-size="120">
                <el-button type="primary" @click="createDialogVisible = true">
                  <el-icon><Plus /></el-icon>
                  新建项目
                </el-button>
              </el-empty>
            </template>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- 新建项目对话框 -->
    <el-dialog v-model="createDialogVisible" title="新建项目" width="480px" :append-to-body="true">
      <el-form label-width="80px">
        <el-form-item label="项目名称">
          <el-input
            v-model="newProjectName"
            placeholder="请输入项目名称，例如：我的第一部短剧"
            size="large"
            @keyup.enter="createProject"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createProject">创建</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<style scoped>
.dashboard-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ===== 左侧导航 ===== */
.aside {
  background: #001529;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
}

.aside-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.aside-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.7);
  height: 48px;
  line-height: 48px;
}

.aside-menu .el-menu-item:hover,
.aside-menu .el-menu-item.is-active {
  background: #409eff !important;
  color: #fff;
}

.aside-footer {
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  transition: background 0.2s;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-name {
  font-size: 13px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 顶栏 ===== */
.header {
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

/* ===== 主内容 ===== */
.main {
  background: #f0f2f5;
  padding: 24px;
  overflow-y: auto;
}

/* ===== 统计卡片 ===== */
.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* ===== 项目表格 ===== */
.table-card {
  border-radius: 8px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.project-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-name {
  font-weight: 500;
  color: #303133;
}

.step-text {
  color: #909399;
  font-size: 13px;
}

:deep(.clickable-row) {
  cursor: pointer;
}

:deep(.clickable-row:hover > td) {
  background: #f5f7fa !important;
}

/* ===== 下拉菜单 fix ===== */
.ml-auto {
  margin-left: auto;
}
</style>
