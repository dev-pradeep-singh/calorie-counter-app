// Health calculations, ported from the old index.html unchanged. They stay in the
// browser so the setup and profile screens update instantly as the user types.
import type { Profile } from './api'

export type Sex = 'male' | 'female'
export type GoalType = 'lose' | 'maintain' | 'gain'
export type Macros = { protein: number; carbs: number; fat: number; fiber: number }

export function calcBMR(weight: number | null, height: number | null, age: number | null, sex: Sex): number | null {
  if (!weight || !height || !age) return null
  return sex === 'female'
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5
}

export function calcCalorieGoal(weight: number | null, height: number | null, age: number | null, sex: Sex, goalType: GoalType): number {
  const bmr = calcBMR(weight, height, age, sex)
  if (!bmr) return 2000
  const tdee = Math.round(bmr * 1.55) // moderate activity
  if (goalType === 'lose') return Math.max(tdee - 500, 1200)
  if (goalType === 'gain') return tdee + 500
  return tdee
}

export function calcIdealWeightRange(height: number | null) {
  if (!height) return null
  const h = height / 100
  return { min: Math.round(18.5 * h * h), max: Math.round(24.9 * h * h), ideal: Math.round(23 * h * h) }
}

export function calcMacroGoals(weight: number, calories: number, sex: Sex, goalType: GoalType): Macros {
  // Protein: 1.8g/kg for lose/gain (preserve muscle), 1.6g/kg for maintain
  const protein = Math.round(weight * (goalType === 'maintain' ? 1.6 : 1.8))
  // Fat: 28% of total calories
  const fat = Math.round((calories * 0.28) / 9)
  // Carbs: remaining calories after protein and fat
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4)
  // Fiber: 38g men, 25g women (dietary guidelines)
  const fiber = sex === 'female' ? 25 : 38
  return { protein, carbs: Math.max(carbs, 0), fat, fiber }
}

/** Goal implied by current vs target weight, with a 1 kg dead band. */
export function effectiveGoal(weight: number, target: number | null): GoalType {
  if (target && weight > target + 1) return 'lose'
  if (target && weight < target - 1) return 'gain'
  return 'maintain'
}

/** Stored macro goals, or estimates when the user hasn't set them (same fallback as before). */
export function macroTargets(p: Profile): Macros {
  const goal = p.goal_calories || 2000
  const sex: Sex = p.sex === 'female' ? 'female' : 'male'
  const goalType = (p.goal_type as GoalType) || 'maintain'
  const fallback = p.weight_kg
    ? calcMacroGoals(p.weight_kg, goal, sex, goalType)
    : { protein: Math.round((goal * 0.3) / 4), carbs: Math.round((goal * 0.45) / 4), fat: Math.round((goal * 0.25) / 9), fiber: 30 }
  return {
    protein: p.goal_protein || fallback.protein,
    carbs: p.goal_carbs || fallback.carbs,
    fat: p.goal_fat || fallback.fat,
    fiber: p.goal_fiber || fallback.fiber,
  }
}

/** Form helpers matching the old parseInt/parseFloat `|| null` behaviour. */
export const intOrNull = (v: string) => parseInt(v) || null
export const floatOrNull = (v: string) => parseFloat(v) || null
