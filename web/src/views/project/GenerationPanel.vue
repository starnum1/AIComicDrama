<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/stores/project'
import { PIPELINE_STEP_ORDER } from '@aicomic/shared'

const projectStore = useProjectStore()

const steps = computed(() =>
  PIPELINE_STEP_ORDER.map((step) => {
    const isCompleted = projectStore.isStepCompleted(step)
    const isCurrent = projectStore.currentStep === step
    const isFailed = projectStore.failedStep?.step === step

    let status: 'wait' | 'process' | 'finish' | 'error' = 'wait'
    if (isCompleted) status = 'finish'
    else if (isFailed) status = 'error'
    else if (isCurrent) status = 'process'

    return { name: step, status }
  }),
)

const stepLabels: Record<string, string> = {
  asset: '视觉资产',
  episode: '分集规划',
  storyboard: '分镜生成',
  anchor: '锚点生成',
  video: '视频生成',
  assembly: '组装输出',
}
</script>

<template>
  <div class="generation-panel">
    <h2>生成监控</h2>

    <!-- 步骤进度条 -->
    <el-card class="progress-card">
      <el-steps :active="steps.findIndex((s) => s.status === 'process')" finish-status="success">
        <el-step
          v-for="step in steps"
          :key="step.name"
          :title="stepLabels[step.name] || step.name"
          :status="step.status"
        />
      </el-steps>
    </el-card>

    <!-- 当前进度详情 -->
    <el-card v-if="projectStore.progress" class="detail-card">
      <template #header>
        <span>当前进度</span>
      </template>

      <div class="progress-detail">
        <p class="progress-message">{{ projectStore.progress.message }}</p>
        <el-progress
          :percentage="
            projectStore.progress.total > 0
              ? Math.round(
                  (projectStore.progress.completed / projectStore.progress.total) * 100,
                )
              : 0
          "
          :stroke-width="12"
          :text-inside="true"
        />
        <p class="progress-count">
          {{ projectStore.progress.completed }} / {{ projectStore.progress.total }}
        </p>
      </div>
    </el-card>

    <!-- 需要审核提示 -->
    <el-alert
      v-if="projectStore.needReviewStep"
      title="资产审核"
      description="视觉资产已生成完毕，请前往「视觉资产」页面查看设定图，裁剪确认后继续流水线。"
      type="warning"
      show-icon
      :closable="false"
      class="review-alert"
    />

    <!-- 失败提示 -->
    <el-alert
      v-if="projectStore.failedStep"
      :title="`步骤「${stepLabels[projectStore.failedStep.step] || projectStore.failedStep.step}」执行失败`"
      :description="projectStore.failedStep.error"
      type="error"
      show-icon
      :closable="false"
      class="fail-alert"
    />

    <!-- 完成提示 -->
    <el-result
      v-if="projectStore.isProjectComplete"
      icon="success"
      title="全部完成"
      sub-title="所有步骤已执行完毕，请前往「成片预览」页面查看结果"
    />

    <!-- 等待中提示 -->
    <div
      v-if="!projectStore.progress && !projectStore.failedStep && !projectStore.isProjectComplete && !projectStore.needReviewStep"
      class="waiting"
    >
      <el-empty description="等待生成任务..." />
    </div>
  </div>
</template>

<style scoped>
.generation-panel h2 {
  margin: 0 0 24px;
  color: #303133;
}

.progress-card {
  margin-bottom: 20px;
}

.detail-card {
  margin-bottom: 20px;
}

.progress-detail {
  text-align: center;
}

.progress-message {
  color: #606266;
  margin: 0 0 16px;
  font-size: 15px;
}

.progress-count {
  color: #909399;
  margin: 12px 0 0;
  font-size: 14px;
}

.review-alert,
.fail-alert {
  margin-bottom: 20px;
}

.waiting {
  margin-top: 40px;
}
</style>
