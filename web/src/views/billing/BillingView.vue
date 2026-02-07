<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()

const balance = ref(0)
const records = ref<any[]>([])
const loading = ref(false)
const rechargeDialogVisible = ref(false)
const rechargeAmount = ref(100)

onMounted(() => {
  fetchBalance()
  fetchRecords()
})

async function fetchBalance() {
  try {
    const token = localStorage.getItem('token')
    const { data } = await axios.get('/api/billing/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    balance.value = data.balance
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
</script>

<template>
  <div class="billing-view">
    <!-- 顶部导航 -->
    <el-header class="header">
      <div class="header-left">
        <el-button text @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h1 class="logo-text">费用管理</h1>
      </div>
    </el-header>

    <el-main class="main">
      <!-- 余额卡片 -->
      <el-card class="balance-card">
        <div class="balance-content">
          <div>
            <p class="balance-label">当前余额</p>
            <p class="balance-amount">¥ {{ balance.toFixed(2) }}</p>
          </div>
          <el-button type="primary" size="large" @click="rechargeDialogVisible = true">
            <el-icon><Wallet /></el-icon>
            充值
          </el-button>
        </div>
      </el-card>

      <!-- 消费记录 -->
      <el-card class="records-card">
        <template #header>
          <span>消费记录</span>
        </template>

        <el-table :data="records" v-loading="loading" stripe>
          <el-table-column prop="createdAt" label="时间" width="180">
            <template #default="{ row }">
              {{ new Date(row.createdAt).toLocaleString('zh-CN') }}
            </template>
          </el-table-column>
          <el-table-column prop="type" label="类型" width="120">
            <template #default="{ row }">
              <el-tag :type="row.amount > 0 ? 'success' : 'danger'" size="small">
                {{ row.amount > 0 ? '充值' : '消费' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="{ row }">
              <span :class="row.amount > 0 ? 'amount-positive' : 'amount-negative'">
                {{ row.amount > 0 ? '+' : '' }}{{ row.amount.toFixed(2) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
        </el-table>

        <el-empty v-if="!loading && records.length === 0" description="暂无消费记录" />
      </el-card>
    </el-main>

    <!-- 充值对话框 -->
    <el-dialog v-model="rechargeDialogVisible" title="充值" width="400px">
      <el-form>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeAmount" :min="10" :max="10000" :step="50" size="large" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRecharge">确认充值</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.billing-view {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  display: flex;
  align-items: center;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 0 24px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.main {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.balance-card {
  margin-bottom: 20px;
}

.balance-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.balance-label {
  color: #909399;
  margin: 0 0 8px;
  font-size: 14px;
}

.balance-amount {
  font-size: 36px;
  font-weight: 700;
  color: #303133;
  margin: 0;
}

.records-card {
  margin-bottom: 20px;
}

.amount-positive {
  color: #67c23a;
  font-weight: 600;
}

.amount-negative {
  color: #f56c6c;
  font-weight: 600;
}
</style>
