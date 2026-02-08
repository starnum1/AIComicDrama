import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useProjectStore } from '@/stores/project'
import type { WsServerEvent, WsClientEvent } from '@aicomic/shared'

const WS_BASE_URL = 'ws://localhost:3000/ws'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function useWebSocket() {
  const connected = ref(false)

  function connect(projectId: string) {
    disconnect()

    const token = localStorage.getItem('token')
    ws = new WebSocket(`${WS_BASE_URL}?token=${token}`)

    ws.onopen = () => {
      connected.value = true
      // 订阅项目频道
      send({ event: 'subscribe', data: { projectId } })
    }

    ws.onmessage = (rawEvent) => {
      const message: WsServerEvent = JSON.parse(rawEvent.data)
      handleMessage(message)
    }

    ws.onclose = () => {
      connected.value = false
      // 自动重连
      reconnectTimer = setTimeout(() => connect(projectId), 3000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function send(message: WsClientEvent) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.onclose = null // 阻止自动重连
      ws.close()
      ws = null
    }
    connected.value = false
  }

  function handleMessage(message: WsServerEvent) {
    const projectStore = useProjectStore()

    switch (message.event) {
      // ===== 步骤级事件 =====
      case 'step:start':
        projectStore.setCurrentStep(message.data.step)
        ElMessage.info(`正在执行: ${message.data.step}`)
        break
      case 'step:complete':
        projectStore.markStepComplete(message.data.step)
        ElMessage.success(`步骤完成: ${message.data.step}`)
        break
      case 'step:need_review':
        projectStore.setNeedReview(message.data.step)
        ElMessage.warning('资产已生成，请审核后继续')
        break
      case 'step:failed':
        projectStore.setStepFailed(message.data.step, message.data.error)
        ElMessage.error({
          message: `步骤「${message.data.step}」失败: ${message.data.error}`,
          duration: 10000,
          showClose: true,
        })
        break

      // ===== 细粒度进度事件 =====
      case 'progress:detail':
        projectStore.updateProgress({
          step: message.data.step,
          message: message.data.message,
          completed: message.data.completed,
          total: message.data.total,
          entityType: message.data.entityType,
          entityId: message.data.entityId,
        })
        break

      // ===== 资产生成事件 =====
      case 'asset:character:sheet':
        projectStore.addCharacterSheet(
          message.data.characterId,
          message.data.sheetUrl,
          message.data.stateName,
        )
        break

      // ===== 分镜生成事件 =====
      case 'storyboard:episode:complete':
        projectStore.markEpisodeStoryboardComplete(
          message.data.episodeId,
          message.data.shotCount,
        )
        break

      // ===== 锚点/视频生成事件 =====
      case 'anchor:shot:complete':
        projectStore.setShotAnchors(
          message.data.shotId,
          message.data.firstFrameUrl,
          message.data.lastFrameUrl,
        )
        break
      case 'video:shot:complete':
        projectStore.setShotVideo(message.data.shotId, message.data.videoUrl)
        break

      // ===== 组装/完成事件 =====
      case 'assembly:episode:complete':
        projectStore.setEpisodeVideo(message.data.episodeId, message.data.videoUrl)
        break
      case 'project:complete':
        projectStore.setProjectComplete()
        break

      // ===== 错误事件 =====
      case 'error':
        projectStore.setError(message.data.message)
        break
    }
  }

  onUnmounted(() => disconnect())

  return { connected, connect, disconnect }
}
