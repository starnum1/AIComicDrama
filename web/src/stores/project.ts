import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PipelineStep } from '@aicomic/shared'

export interface ProgressInfo {
  step: string
  message: string
  completed: number
  total: number
  entityType?: string
  entityId?: string
}

export interface CharacterSheetInfo {
  characterId: string
  sheetUrl: string
  stateName: string | null
}

export const useProjectStore = defineStore('project', () => {
  // ===== 项目基础信息 =====
  const projectId = ref<string>('')
  const projectName = ref<string>('')
  const projectStatus = ref<string>('')
  const currentStep = ref<string>('')
  const error = ref<string | null>(null)

  // ===== 步骤状态 =====
  const completedSteps = ref<Set<string>>(new Set())
  const needReviewStep = ref<string | null>(null)
  const failedStep = ref<{ step: string; error: string } | null>(null)

  // ===== 进度信息 =====
  const progress = ref<ProgressInfo | null>(null)

  // ===== 资产信息 =====
  const characterSheets = ref<CharacterSheetInfo[]>([])

  // ===== 分镜信息 =====
  const episodeStoryboards = ref<Map<string, { shotCount: number }>>(new Map())

  // ===== 锚点/视频信息 =====
  const shotAnchors = ref<Map<string, { firstFrameUrl: string; lastFrameUrl: string }>>(
    new Map(),
  )
  const shotVideos = ref<Map<string, string>>(new Map())

  // ===== 成片信息 =====
  const episodeVideos = ref<Map<string, string>>(new Map())

  // ===== 计算属性 =====
  const isStepCompleted = computed(() => (step: string) => completedSteps.value.has(step))
  const isProjectComplete = computed(() => projectStatus.value === 'completed')

  // ===== 方法 =====
  function setProject(id: string, name: string, status: string, step: string) {
    projectId.value = id
    projectName.value = name
    projectStatus.value = status
    currentStep.value = step
    error.value = null
  }

  function setCurrentStep(step: string) {
    currentStep.value = step
    projectStatus.value = `${step}_processing`
    error.value = null
    failedStep.value = null
  }

  function markStepComplete(step: string) {
    completedSteps.value.add(step)
  }

  function setNeedReview(step: string) {
    needReviewStep.value = step
    projectStatus.value = 'asset_review'
  }

  function setStepFailed(step: string, errorMsg: string) {
    failedStep.value = { step, error: errorMsg }
    projectStatus.value = 'failed'
  }

  function updateProgress(info: ProgressInfo) {
    progress.value = info
  }

  function addCharacterSheet(characterId: string, sheetUrl: string, stateName: string | null) {
    characterSheets.value.push({ characterId, sheetUrl, stateName })
  }

  function markEpisodeStoryboardComplete(episodeId: string, shotCount: number) {
    episodeStoryboards.value.set(episodeId, { shotCount })
  }

  function setShotAnchors(shotId: string, firstFrameUrl: string, lastFrameUrl: string) {
    shotAnchors.value.set(shotId, { firstFrameUrl, lastFrameUrl })
  }

  function setShotVideo(shotId: string, videoUrl: string) {
    shotVideos.value.set(shotId, videoUrl)
  }

  function setEpisodeVideo(episodeId: string, videoUrl: string) {
    episodeVideos.value.set(episodeId, videoUrl)
  }

  function setProjectComplete() {
    projectStatus.value = 'completed'
  }

  function setError(message: string) {
    error.value = message
  }

  function $reset() {
    projectId.value = ''
    projectName.value = ''
    projectStatus.value = ''
    currentStep.value = ''
    error.value = null
    completedSteps.value = new Set()
    needReviewStep.value = null
    failedStep.value = null
    progress.value = null
    characterSheets.value = []
    episodeStoryboards.value = new Map()
    shotAnchors.value = new Map()
    shotVideos.value = new Map()
    episodeVideos.value = new Map()
  }

  return {
    // state
    projectId,
    projectName,
    projectStatus,
    currentStep,
    error,
    completedSteps,
    needReviewStep,
    failedStep,
    progress,
    characterSheets,
    episodeStoryboards,
    shotAnchors,
    shotVideos,
    episodeVideos,
    // computed
    isStepCompleted,
    isProjectComplete,
    // actions
    setProject,
    setCurrentStep,
    markStepComplete,
    setNeedReview,
    setStepFailed,
    updateProgress,
    addCharacterSheet,
    markEpisodeStoryboardComplete,
    setShotAnchors,
    setShotVideo,
    setEpisodeVideo,
    setProjectComplete,
    setError,
    $reset,
  }
})
