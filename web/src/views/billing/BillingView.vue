<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const balance = ref(0)
const nickname = ref('')
const records = ref<any[]>([])
const loading = ref(false)
const rechargeDialogVisible = ref(false)
const rechargeAmount = ref(100)

onMounted(() => {
  fetchBalance()
  fetchRecords()
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

async function fetchBalance() {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/billing/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    balance.value = Number(data.balance)
  } catch {
    // ignore
  }
}

async function fetchRecords() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/billing/records', {
      headers: { Authorization: `Bearer ${token}` },
    })
    records.value = data
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

async function handleRecharge() {
  try {
    const token = localStorage.getItem('token')
    await axios.post(
      '/api/billing/recharge',
      { amount: rechargeAmount.value },
      { headers: { Authorization: `Bearer ${token}` } },
    )
    ElMessage.success('充值成功')
    rechargeDialogVisible.value = false
    fetchBalance()
    fetchRecords()
  } catch (err: any) {
    ElMessage.error(err.response?.data?.message || '充值失败')
  }
}

function handleLogout() {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<template>
  <el-container class="billing-container">
    <!-- 左侧导航 -->
    <el-aside width="220px" class="aside">
      <div class="logo">
        <el-icon :size="28" color="#409eff"><Film /></el-icon>
        <span class="logo-title">AI Comic Drama</span>
      </div>
      <el-menu default-active="billing" class="aside-menu">
        <el-menu-item index="projects" @click="router.push('/')">
          <el-icon><Grid /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
        <el-menu-item index="billing">
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
      <el-header class="header">
        <div class="header-left">
          <h2 class="page-title">费用管理</h2>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="rechargeDialogVisible = true">
            <el-icon><Wallet /></el-icon>
            充值
          </el-button>
        </div>
      </el-header>

      <el-main class="main">
        <!-- 余额卡片 -->
        <el-row :gutter="20" class="balance-row">
          <el-col :span="8">
            <el-card shadow="never" class="balance-card">
              <div class="balance-icon" style="background: #ecf5ff; color: #409eff">
                <el-icon :size="28"><Coin /></el-icon>
              </div>
              <div class="balance-info">
                <div class="balance-label">当前余额</div>
                <div class="balance-amount">¥ {{ balance.toFixed(2) }}</div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" class="balance-card">
              <div class="balance-icon" style="background: #f0f9eb; color: #67c23a">
                <el-icon :size="28"><TrendCharts /></el-icon>
              </div>
              <div class="balance-info">
                <div class="balance-label">累计充值</div>
                <div class="balance-amount">
                  ¥ {{ records.filter(r => r.type === 'recharge').reduce((s: number, r: any) => s + Number(r.amount), 0).toFixed(2) }}
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card shadow="never" class="balance-card">
              <div class="balance-icon" style="background: #fef0f0; color: #f56c6c">
                <el-icon :size="28"><Tickets /></el-icon>
              </div>
              <div class="balance-info">
                <div class="balance-label">交易记录</div>
                <div class="balance-amount">{{ records.length }} 条</div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 消费记录表格 -->
        <el-card shadow="never" class="table-card">
          <template #header>
            <div class="table-header">
              <span>交易记录</span>
              <el-button text type="primary" @click="fetchRecords" :loading="loading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <el-table
            :data="records"
            v-loading="loading"
            style="width: 100%"
            :header-cell-style="{ background: '#fafafa', color: '#606266' }"
          >
            <el-table-column prop="createdAt" label="时间" width="200">
              <template #default="{ row }">
                {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
              </template>
            </el-table-column>
            <el-table-column prop="type" label="类型" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="row.type === 'recharge' ? 'success' : 'danger'" size="default" effect="light">
                  {{ row.type === 'recharge' ? '充值' : '消费' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="160" align="right">
              <template #default="{ row }">
                <span :class="row.type === 'recharge' ? 'amount-positive' : 'amount-negative'">
                  {{ row.type === 'recharge' ? '+' : '-' }}¥{{ Math.abs(Number(row.amount)).toFixed(2) }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="200" />

            <template #empty>
              <el-empty description="暂无交易记录" :image-size="100" />
            </template>
          </el-table>
        </el-card>
      </el-main>
    </el-container>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="充值" width="480px" :append-to-body="true">
      <el-form label-width="80px">
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeAmount" :min="10" :max="10000" :step="50" size="large" />
          <span style="margin-left: 8px; color: #909399">元</span>
        </el-form-item>
        <el-form-item label="">
          <div class="quick-amounts">
            <el-button v-for="amt in [50, 100, 200, 500, 1000]" :key="amt"
              :type="rechargeAmount === amt ? 'primary' : 'default'"
              @click="rechargeAmount = amt"
            >
              ¥{{ amt }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRecharge">确认充值 ¥{{ rechargeAmount }}</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<style scoped>
.billing-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* ===== 左侧导航（与 Dashboard 一致） ===== */
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

.ml-auto {
  margin-left: auto;
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

.balance-row {
  margin-bottom: 24px;
}

.balance-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.balance-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.balance-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 6px;
}

.balance-amount {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.table-card {
  border-radius: 8px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.amount-positive {
  color: #67c23a;
  font-weight: 600;
  font-size: 15px;
}

.amount-negative {
  color: #f56c6c;
  font-weight: 600;
  font-size: 15px;
}

.quick-amounts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
