// lib/flow.ts

export type FlowStepKey =
  | "touchpoint"
  | "value"
  | "insight"
  | "proof"
  | "decision"

export type FlowStep = {
  key: FlowStepKey
  label: string        // 内部（思考）
  display: string      // UI表示
  day: number
  action_type: string  // DB/API用（day0など）
}

// =========================
// 🎯 統一定義（唯一の真実）
// =========================
export const FLOW_STEPS: FlowStep[] = [
  {
    key: "touchpoint",
    label: "接点",
    display: "お礼",
    day: 0,
    action_type: "day0",
  },
  {
    key: "value",
    label: "価値観共有",
    display: "共感",
    day: 7,
    action_type: "day7",
  },
  {
    key: "insight",
    label: "解釈",
    display: "解釈",
    day: 14,
    action_type: "day14",
  },
  {
    key: "proof",
    label: "再現性",
    display: "事例・方法",
    day: 21,
    action_type: "day21",
  },
  {
    key: "decision",
    label: "意思決定",
    display: "提案",
    day: 30,
    action_type: "day30",
  },
]

/**
 * action_type → FlowStep
 */
export function getStepByActionType(action_type: string): FlowStep | undefined {
  return FLOW_STEPS.find((s) => s.action_type === action_type)
}

/**
 * action_type → UI表示
 */
export function getDisplayByActionType(action_type: string): string {
  return getStepByActionType(action_type)?.display || action_type
}

/**
 * action_type → key（AI用）
 */
export function getKeyByActionType(action_type: string): FlowStepKey {
  return getStepByActionType(action_type)?.key || "touchpoint"
}

/**
 * action_type → day（AI用）
 */
export function mapActionTypeToDay(action_type: string): string {
  return action_type // そのまま day0, day7 を使うならこれでOK
}

/**
 * key → action_type
 */
export function mapKeyToActionType(key: FlowStepKey): string {
  return FLOW_STEPS.find((s) => s.key === key)?.action_type || "day0"
}