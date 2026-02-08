<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Edit, Delete, Connection, Star, StarFilled } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

interface AiProvider {
  id: string; name: string; providerType: string; baseUrl: string; apiKey: string; model: string; isDefault: boolean; createdAt: string
}

const providers = ref<AiProvider[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref('')
const form = ref({ name: '', providerType: 'llm', baseUrl: '', apiKey: '', model: '', isDefault: false })
const testingConnection = ref(false)
const testResult = ref<{ success: boolean; message?: string; error?: string } | null>(null)

const providerTypeOptions = [
  { value: 'llm', label: '大语言模型 (LLM)', desc: '用于文本分析、分镜生成等' },
  { value: 'image_gen', label: '图像生成', desc: '用于角色设定图、场景图等' },
  { value: 'video_gen', label: '视频生成', desc: '用于镜头视频生成' },
]

const groupedProviders = computed(() => {
  const groups: Record<string, AiProvider[]> = { llm: [], image_gen: [], video_gen: [] }
  for (const p of providers.value) { if (groups[p.providerType]) groups[p.providerType].push(p) }
  return groups
})

function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` } }

onMounted(() => { fetchProviders() })

async function fetchProviders() {
  loading.value = true
  try { const { data } = await axios.get('/api/ai-providers', { headers: authHeaders() }); providers.value = data }
  catch { ElMessage.error('获取 AI 配置失败') }
  finally { loading.value = false }
}

function openCreateDialog() {
  dialogMode.value = 'create'; editingId.value = ''
  form.value = { name: '', providerType: 'llm', baseUrl: '', apiKey: '', model: '', isDefault: false }
  testResult.value = null; dialogVisible.value = true
}

function openEditDialog(p: AiProvider) {
  dialogMode.value = 'edit'; editingId.value = p.id
  form.value = { name: p.name, providerType: p.providerType, baseUrl: p.baseUrl, apiKey: p.apiKey, model: p.model, isDefault: p.isDefault }
  testResult.value = null; dialogVisible.value = true
}

async function submitForm() {
  if (!form.value.name || !form.value.baseUrl || !form.value.model) { ElMessage.warning('请填写完整信息'); return }
  if (dialogMode.value === 'create' && !form.value.apiKey) { ElMessage.warning('请填写 API Key'); return }
  try {
    if (dialogMode.value === 'create') {
      await axios.post('/api/ai-providers', form.value, { headers: authHeaders() }); ElMessage.success('创建成功')
    } else {
      const d: any = { ...form.value }; if (!d.apiKey) delete d.apiKey; delete d.providerType
      await axios.put(`/api/ai-providers/${editingId.value}`, d, { headers: authHeaders() }); ElMessage.success('更新成功')
    }
    dialogVisible.value = false; fetchProviders()
  } catch (err: any) { ElMessage.error(err.response?.data?.message || '操作失败') }
}

async function deleteProvider(p: AiProvider) {
  try {
    await ElMessageBox.confirm(`确定删除「${p.name}」吗？`, '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    await axios.delete(`/api/ai-providers/${p.id}`, { headers: authHeaders() }); ElMessage.success('已删除'); fetchProviders()
  } catch { /* cancelled */ }
}

async function toggleDefault(p: AiProvider) {
  try { await axios.put(`/api/ai-providers/${p.id}`, { isDefault: !p.isDefault }, { headers: authHeaders() }); fetchProviders() }
  catch { ElMessage.error('操作失败') }
}

async function testConnection() {
  if (!form.value.baseUrl || !form.value.apiKey || !form.value.model) { ElMessage.warning('请先填写完整信息'); return }
  testingConnection.value = true; testResult.value = null
  try {
    const { data } = await axios.post('/api/ai-providers/test', { baseUrl: form.value.baseUrl, apiKey: form.value.apiKey, model: form.value.model, providerType: form.value.providerType }, { headers: authHeaders() })
    testResult.value = data
  } catch { testResult.value = { success: false, error: '请求失败' } }
  finally { testingConnection.value = false }
}
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <button class="btn-back" @click="router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回首页
      </button>
      <h1>AI 服务配置</h1>
      <p class="subtitle">管理你的外部 AI 服务接入，支持大语言模型、图像生成和视频生成</p>
    </header>

    <div class="toolbar">
      <button class="btn-add" @click="openCreateDialog"><el-icon><Plus /></el-icon> 添加 AI 服务</button>
    </div>

    <div class="provider-groups" v-loading="loading">
      <div v-for="typeOpt in providerTypeOptions" :key="typeOpt.value" class="provider-group">
        <div class="group-header">
          <h2>{{ typeOpt.label }}</h2>
          <span class="group-desc">{{ typeOpt.desc }}</span>
        </div>
        <div v-if="groupedProviders[typeOpt.value]?.length" class="provider-cards">
          <div v-for="provider in groupedProviders[typeOpt.value]" :key="provider.id" class="provider-card" :class="{ 'is-default': provider.isDefault }">
            <div class="card-top">
              <div class="card-name">
                <span class="name-text">{{ provider.name }}</span>
                <span v-if="provider.isDefault" class="default-badge">默认</span>
              </div>
              <div class="card-actions">
                <button class="icon-btn" @click="toggleDefault(provider)">
                  <el-icon :class="{ 'is-default-star': provider.isDefault }"><StarFilled v-if="provider.isDefault" /><Star v-else /></el-icon>
                </button>
                <button class="icon-btn" @click="openEditDialog(provider)"><el-icon><Edit /></el-icon></button>
                <button class="icon-btn danger" @click="deleteProvider(provider)"><el-icon><Delete /></el-icon></button>
              </div>
            </div>
            <div class="card-info">
              <div class="info-row"><span class="info-label">接口地址</span><span class="info-value">{{ provider.baseUrl }}</span></div>
              <div class="info-row"><span class="info-label">API Key</span><span class="info-value mono">{{ provider.apiKey }}</span></div>
              <div class="info-row"><span class="info-label">模型</span><span class="info-value highlight">{{ provider.model }}</span></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-group"><p>暂未配置{{ typeOpt.label }}服务</p></div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '添加 AI 服务' : '编辑 AI 服务'"
      width="560px"
      :close-on-click-modal="false"
    >
      <div class="dialog-form">
        <div class="form-group">
          <label>名称</label>
          <input v-model="form.name" placeholder="例如：我的 OpenAI、DeepSeek 等" class="form-input" />
        </div>
        <div class="form-group" v-if="dialogMode === 'create'">
          <label>类型</label>
          <select v-model="form.providerType" class="form-input">
            <option v-for="opt in providerTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>接口地址 (Base URL)</label>
          <input v-model="form.baseUrl" placeholder="例如：https://api.openai.com/v1" class="form-input" />
          <span class="form-hint">OpenAI 兼容格式的 API 地址</span>
        </div>
        <div class="form-group">
          <label>API Key</label>
          <input v-model="form.apiKey" :placeholder="dialogMode === 'edit' ? '留空则不修改' : '输入 API Key'" class="form-input" />
        </div>
        <div class="form-group">
          <label>模型名称</label>
          <input v-model="form.model" placeholder="例如：gpt-4o、deepseek-chat 等" class="form-input" />
        </div>
        <div class="form-group checkbox-group">
          <label><input type="checkbox" v-model="form.isDefault" /> 设为该类型的默认服务</label>
        </div>
        <div class="test-section">
          <button class="btn-test" @click="testConnection" :disabled="testingConnection">
            <el-icon><Connection /></el-icon> {{ testingConnection ? '测试中...' : '测试连接' }}
          </button>
          <div v-if="testResult" class="test-result" :class="testResult.success ? 'success' : 'error'">
            {{ testResult.success ? testResult.message : testResult.error }}
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-cancel" @click="dialogVisible = false">取消</button>
        <button class="btn-confirm" @click="submitForm">{{ dialogMode === 'create' ? '添加' : '保存' }}</button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.settings-page { height: 100vh; overflow-y: auto; padding: 40px; padding-bottom: 80px; }
.settings-page > * { max-width: 960px; margin-left: auto; margin-right: auto; }
.page-header { margin-bottom: 32px; }
.btn-back { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 14px; margin-bottom: 16px; transition: all 0.2s; }
.btn-back:hover { color: var(--primary-light); border-color: var(--primary); }
.page-header h1 { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, var(--primary-light), var(--accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 8px; }
.subtitle { color: var(--text-muted); font-size: 14px; }
.toolbar { margin-bottom: 24px; }
.btn-add { display: inline-flex; align-items: center; gap: 8px; padding: 10px 24px; background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-add:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(108, 92, 231, 0.3); }
.provider-group { margin-bottom: 32px; }
.group-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.group-header h2 { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.group-desc { font-size: 13px; color: var(--text-muted); }
.provider-cards { display: grid; gap: 16px; }
.provider-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; transition: all 0.2s; }
.provider-card:hover { border-color: var(--primary); background: var(--bg-card-hover); }
.provider-card.is-default { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent), 0 0 20px rgba(0, 206, 201, 0.1); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-name { display: flex; align-items: center; gap: 10px; }
.name-text { font-size: 16px; font-weight: 600; color: var(--text-primary); }
.default-badge { padding: 2px 8px; background: rgba(0, 206, 201, 0.15); color: var(--accent); border-radius: 4px; font-size: 12px; font-weight: 600; }
.card-actions { display: flex; gap: 4px; }
.icon-btn { background: transparent; border: 1px solid transparent; color: var(--text-muted); padding: 6px; border-radius: 6px; cursor: pointer; font-size: 16px; display: flex; align-items: center; transition: all 0.2s; }
.icon-btn:hover { color: var(--primary-light); background: var(--bg-surface); }
.icon-btn.danger:hover { color: #e74c3c; }
.is-default-star { color: var(--accent) !important; }
.card-info { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; align-items: center; gap: 12px; }
.info-label { font-size: 13px; color: var(--text-muted); min-width: 70px; flex-shrink: 0; }
.info-value { font-size: 13px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.info-value.mono { font-family: 'Fira Code', monospace; font-size: 12px; }
.info-value.highlight { color: var(--primary-light); font-weight: 500; }
.empty-group { padding: 24px; text-align: center; background: var(--bg-card); border-radius: 12px; border: 1px dashed var(--border); }
.empty-group p { color: var(--text-muted); font-size: 14px; }
.dialog-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 14px; font-weight: 500; color: var(--text-secondary); }
.form-input { padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 14px; outline: none; transition: border-color 0.2s; }
.form-input:focus { border-color: var(--primary); }
.form-hint { font-size: 12px; color: var(--text-muted); }
.checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.test-section { display: flex; align-items: center; gap: 12px; padding-top: 8px; }
.btn-test { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: transparent; border: 1px solid var(--accent); color: var(--accent); border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-test:hover:not(:disabled) { background: rgba(0, 206, 201, 0.1); }
.btn-test:disabled { opacity: 0.5; cursor: not-allowed; }
.test-result { font-size: 13px; font-weight: 500; }
.test-result.success { color: #00b894; }
.test-result.error { color: #e74c3c; }
.btn-cancel, .btn-confirm { padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-cancel { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); margin-right: 12px; }
.btn-cancel:hover { border-color: var(--text-muted); }
.btn-confirm { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); border: none; color: white; }
.btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3); }
:deep(.el-dialog) { background: var(--bg-dark) !important; border: 1px solid var(--border); border-radius: 16px; }
:deep(.el-dialog__header) { padding: 20px 24px 0; }
:deep(.el-dialog__title) { color: var(--text-primary); font-weight: 600; }
:deep(.el-dialog__body) { padding: 20px 24px; }
:deep(.el-dialog__footer) { padding: 0 24px 20px; }
</style>
