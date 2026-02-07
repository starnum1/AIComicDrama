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
  } catch { /* ignore */ }
}

async function fetchBalance() {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/billing/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    balance.value = Number(data.balance)
  } catch { /* ignore */ }
}

async function fetchRecords() {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/billing/records', {
      headers: { Authorization: `Bearer ${token}` },
    })
    records.value = data
  } catch { /* ignore */ }
  finally { loading.value = false }
}

async function handleRecharge() {
  try {
    const token = localStorage.getItem('token')
    await axios.post('/api/billing/recharge', { amount: rechargeAmount.value }, {
      headers: { Authorization: `Bearer ${token}` },
    })
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
  <div class="page">
    <div class="bg-orb orb-1"></div>
    <div class="bg-orb orb-2"></div>

    <!-- 顶部导航 (与 Dashboard 一致) -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand">
          <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
            <rect width="32" height="32" rx="8" fill="url(#g1)" />
            <path d="M8 22V10l8 6-8 6z" fill="#fff" />
            <path d="M16 22V10l8 6-8 6z" fill="#fff" opacity="0.6" />
            <defs><linearGradient id="g1" x1="0" y1="0" x2="32" y2="32"><stop stop-color="#6c5ce7"/><stop offset="1" stop-color="#a29bfe"/></linearGradient></defs>
          </svg>
          <span class="brand-name">AI Comic Drama</span>
        </div>
      </div>
      <nav class="topbar-nav">
        <a class="nav-item" @click="router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          工作台
        </a>
        <a class="nav-item active" @click="router.push('/billing')">
          <el-icon><Coin /></el-icon>
          费用
        </a>
      </nav>
      <div class="topbar-right">
        <el-dropdown trigger="click">
          <div class="user-chip">
            <el-avatar :size="30" class="user-avatar">{{ (nickname || 'U')[0].toUpperCase() }}</el-avatar>
            <span class="user-name-text">{{ nickname || '用户' }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="router.push('/')">工作台</el-dropdown-item>
              <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <main class="main">
      <!-- 标题 -->
      <div class="page-header">
        <h1 class="page-title">费用管理</h1>
        <button class="btn-primary" @click="rechargeDialogVisible = true">
          <el-icon><Coin /></el-icon>
          充值
        </button>
      </div>

      <!-- 余额卡片 -->
      <div class="balance-grid">
        <div class="balance-card glow-purple">
          <div class="bc-icon"><el-icon :size="28"><Coin /></el-icon></div>
          <div class="bc-info">
            <div class="bc-label">当前余额</div>
            <div class="bc-value">¥ {{ balance.toFixed(2) }}</div>
          </div>
        </div>
        <div class="balance-card glow-green">
          <div class="bc-icon green"><el-icon :size="28"><TrendCharts /></el-icon></div>
          <div class="bc-info">
            <div class="bc-label">累计充值</div>
            <div class="bc-value">
              ¥ {{ records.filter((r: any) => r.type === 'recharge').reduce((s: number, r: any) => s + Number(r.amount), 0).toFixed(2) }}
            </div>
          </div>
        </div>
        <div class="balance-card glow-pink">
          <div class="bc-icon pink"><el-icon :size="28"><Tickets /></el-icon></div>
          <div class="bc-info">
            <div class="bc-label">交易记录</div>
            <div class="bc-value">{{ records.length }} 条</div>
          </div>
        </div>
      </div>

      <!-- 交易记录 -->
      <div class="records-card">
        <div class="records-header">
          <h3>交易记录</h3>
          <button class="btn-ghost" @click="fetchRecords">
            <el-icon><Refresh /></el-icon>
            刷新
          </button>
        </div>

        <el-table :data="records" v-loading="loading" style="width: 100%">
          <el-table-column prop="createdAt" label="时间" width="200">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="120" align="center">
            <template #default="{ row }">
              <span class="type-badge" :class="row.type === 'recharge' ? 'badge-green' : 'badge-red'">
                {{ row.type === 'recharge' ? '充值' : '消费' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="160" align="right">
            <template #default="{ row }">
              <span :class="row.type === 'recharge' ? 'text-green' : 'text-red'">
                {{ row.type === 'recharge' ? '+' : '-' }}¥{{ Math.abs(Number(row.amount)).toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="200" />
          <template #empty>
            <div style="padding: 40px 0; color: var(--text-muted)">暂无记录</div>
          </template>
        </el-table>
      </div>
    </main>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="充值" width="460px" :append-to-body="true">
      <div class="dialog-hint">选择或输入充值金额</div>
      <div class="quick-amounts">
        <button
          v-for="amt in [50, 100, 200, 500, 1000]"
          :key="amt"
          class="amount-chip"
          :class="{ selected: rechargeAmount === amt }"
          @click="rechargeAmount = amt"
        >
          ¥{{ amt }}
        </button>
      </div>
      <el-input-number v-model="rechargeAmount" :min="10" :max="10000" :step="50" size="large" style="width: 100%; margin-top: 16px" />
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRecharge">确认充值 ¥{{ rechargeAmount }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  height: 100vh;
  width: 100vw;
  overflow-y: auto;
  background: var(--bg-deep);
  position: relative;
}

.bg-orb { position: fixed; border-radius: 50%; filter: blur(80px); pointer-events: none; z-index: 0; }
.orb-1 { width: 600px; height: 600px; background: rgba(108,92,231,0.1); top: -200px; right: -100px; }
.orb-2 { width: 400px; height: 400px; background: rgba(0,206,201,0.07); bottom: -100px; left: -100px; }

/* 顶栏 */
.topbar {
  position: sticky; top: 0; z-index: 100;
  height: 64px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 32px;
  background: rgba(10,10,26,0.8); backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
}
.topbar-left { display: flex; align-items: center; }
.brand { display: flex; align-items: center; gap: 10px; }
.brand-name { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.topbar-nav { display: flex; gap: 4px; }
.nav-item {
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  border-radius: var(--radius-sm); font-size: 14px; color: var(--text-secondary);
  cursor: pointer; transition: all 0.2s;
}
.nav-item:hover { color: var(--text-primary); background: var(--bg-glass); }
.nav-item.active { color: var(--primary-light); background: rgba(108,92,231,0.12); }
.topbar-right { display: flex; align-items: center; }
.user-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 12px 4px 4px; border-radius: 20px;
  cursor: pointer; color: var(--text-secondary); transition: background 0.2s;
}
.user-chip:hover { background: var(--bg-glass); }
.user-avatar { background: var(--gradient-primary) !important; color: #fff !important; font-weight: 600; font-size: 13px; }
.user-name-text { font-size: 13px; }

/* 主内容 */
.main {
  position: relative; z-index: 1;
  max-width: 1000px; margin: 0 auto; padding: 40px 32px 60px;
}

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 32px;
}

.page-title { font-size: 28px; font-weight: 800; color: var(--text-primary); margin: 0; }

.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 24px; background: var(--gradient-primary);
  color: #fff; border: none; border-radius: var(--radius-sm);
  font-size: 14px; font-weight: 600; cursor: pointer;
  transition: all 0.3s; font-family: inherit;
}
.btn-primary:hover { box-shadow: var(--shadow-glow); transform: translateY(-1px); }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: transparent;
  color: var(--text-secondary); border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); font-size: 13px; cursor: pointer;
  transition: all 0.2s; font-family: inherit;
}
.btn-ghost:hover { color: var(--text-primary); border-color: var(--primary); }

/* 余额卡片 */
.balance-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
  margin-bottom: 32px;
}

.balance-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 24px;
  display: flex; align-items: center; gap: 16px;
  transition: all 0.3s;
}

.balance-card:hover { border-color: var(--border-light); transform: translateY(-2px); }
.balance-card.glow-purple:hover { box-shadow: 0 4px 20px rgba(108,92,231,0.15); }
.balance-card.glow-green:hover { box-shadow: 0 4px 20px rgba(0,184,148,0.15); }
.balance-card.glow-pink:hover { box-shadow: 0 4px 20px rgba(253,121,168,0.15); }

.bc-icon {
  width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(108,92,231,0.12); color: var(--primary-light); flex-shrink: 0;
}
.bc-icon.green { background: rgba(0,184,148,0.12); color: #00b894; }
.bc-icon.pink { background: rgba(253,121,168,0.12); color: #fd79a8; }

.bc-label { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
.bc-value { font-size: 24px; font-weight: 800; color: var(--text-primary); }

/* 交易记录 */
.records-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); overflow: hidden;
}

.records-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid var(--border);
}
.records-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }

.type-badge {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 12px; font-weight: 500;
}
.badge-green { background: rgba(0,184,148,0.12); color: #00b894; }
.badge-red { background: rgba(214,48,49,0.12); color: #d63031; }

.text-green { color: #00b894; font-weight: 700; }
.text-red { color: #d63031; font-weight: 700; }

/* 充值 */
.dialog-hint { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; }

.quick-amounts { display: flex; gap: 10px; flex-wrap: wrap; }

.amount-chip {
  padding: 8px 20px; border-radius: var(--radius-sm);
  background: var(--bg-surface); border: 1px solid var(--border-light);
  color: var(--text-secondary); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.amount-chip:hover { border-color: var(--primary); color: var(--primary-light); }
.amount-chip.selected {
  background: rgba(108,92,231,0.15); border-color: var(--primary);
  color: var(--primary-light);
}
</style>
