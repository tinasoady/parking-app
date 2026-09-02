import type { BonusRule, PriceComputation, PricingRules } from '../types';

/** Whole minutes elapsed between entry and exit, always rounded up so partial minutes are billed. */
export function computeDurationMinutes(entryTime: Date, exitTime: Date): number {
  const ms = exitTime.getTime() - entryTime.getTime();
  return Math.max(0, Math.ceil(ms / 60000));
}

function roundBlocks(blocks: number, mode: PricingRules['roundingMode']): number {
  switch (mode) {
    case 'up':
      return Math.ceil(blocks);
    case 'down':
      return Math.floor(blocks);
    case 'nearest':
      return Math.round(blocks);
  }
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Computes the price for a stay of `durationMinutes`, applying the grace period, billing
 * increment/rounding, an optional bonus rule and the optional daily cap, in that order.
 */
export function computePrice(durationMinutes: number, rules: PricingRules, bonus?: BonusRule | null): PriceComputation {
  const extraFreeMinutes = bonus?.kind === 'freeMinutes' ? bonus.value : 0;
  const effectiveFreeMinutes = rules.graceMinutes + extraFreeMinutes;
  const billableRaw = Math.max(0, durationMinutes - effectiveFreeMinutes);

  let baseAmount = 0;
  let billableMinutes = 0;

  if (billableRaw > 0) {
    const increment = Math.max(1, rules.billingIncrementMinutes);
    const blocks = billableRaw / increment;
    const billableBlocks = Math.max(1, roundBlocks(blocks, rules.roundingMode));
    billableMinutes = billableBlocks * increment;
    baseAmount = (billableMinutes / 60) * rules.hourlyRate;
  }

  let bonusDeduction = 0;
  let bonusLabel: string | null = null;
  if (bonus) {
    bonusLabel = bonus.label;
    if (bonus.kind === 'percent') {
      bonusDeduction = baseAmount * (bonus.value / 100);
    } else if (bonus.kind === 'flat') {
      bonusDeduction = bonus.value;
    }
    // 'freeMinutes' bonuses are already reflected via effectiveFreeMinutes above, no extra deduction.
  }
  bonusDeduction = Math.min(bonusDeduction, baseAmount);

  let finalAmount = roundMoney(baseAmount - bonusDeduction);
  let cappedAtDailyMax = false;
  if (rules.dailyCapAmount != null && finalAmount > rules.dailyCapAmount) {
    finalAmount = roundMoney(rules.dailyCapAmount);
    cappedAtDailyMax = true;
  }

  return {
    durationMinutes,
    billableMinutes,
    baseAmount: roundMoney(baseAmount),
    bonusLabel,
    bonusDeduction: roundMoney(bonusDeduction),
    finalAmount,
    cappedAtDailyMax,
  };
}
