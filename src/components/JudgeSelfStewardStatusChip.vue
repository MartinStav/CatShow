<template>
  <button
    type="button"
    class="judge-steward-chip"
    :class="[`judge-steward-chip--${status}`, { 'judge-steward-chip--disabled': disabled }]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @click.stop.prevent="emit('cycle')"
  >
    <div class="judge-steward-chip__icon-wrap" aria-hidden="true">
      <q-icon :name="icon" size="22px" class="judge-steward-chip__icon" />
    </div>
    <div class="judge-steward-chip__body">
      <span class="judge-steward-chip__label">{{ label }}</span>
      <span class="judge-steward-chip__next">
        <span class="judge-steward-chip__next-prefix">Ďalšie:</span>
        {{ nextLabel }}
      </span>
    </div>
    <q-icon name="chevron_right" size="22px" class="judge-steward-chip__chevron" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CatCallStatus } from 'src/utils/cat_steward_cycle';
import {
  catCallStatusIcon,
  catCallStatusLabel,
  nextCatCallStatus,
} from 'src/utils/cat_steward_cycle';

const props = withDefaults(
  defineProps<{
    status: CatCallStatus;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ cycle: [] }>();

const label = computed(() => catCallStatusLabel(props.status));
const icon = computed(() => catCallStatusIcon(props.status));
const nextLabel = computed(() => catCallStatusLabel(nextCatCallStatus(props.status)));

const ariaLabel = computed(
  () =>
    `Vyvolávanie: ${label.value}. Aktivujte pre Ďalší stav (${nextLabel.value}). Ste vlastný stevard.`,
);
</script>

<style scoped>
.judge-steward-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 3rem;
  padding: 0.5rem 0.6rem 0.5rem 0.65rem;
  border-radius: 0.75rem;
  border: 1.5px solid var(--jss-border, #e5e7eb);
  background: var(--jss-bg, #f9fafb);
  color: var(--jss-fg, #1f2937);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.04);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  font: inherit;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
}

.judge-steward-chip:hover:not(:disabled) {
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.1), 0 4px 14px rgba(15, 23, 42, 0.06);
}

.judge-steward-chip:active:not(:disabled) {
  transform: scale(0.98);
}

.judge-steward-chip:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(43, 127, 255, 0.35),
    0 2px 8px rgba(15, 23, 42, 0.08);
}

.judge-steward-chip--disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.judge-steward-chip--waiting {
  --jss-border: #d1d5db;
  --jss-bg: #f9fafb;
  --jss-fg: #374151;
  --jss-icon-bg: #e5e7eb;
}

.judge-steward-chip--called {
  --jss-border: #60a5fa;
  --jss-bg: #eff6ff;
  --jss-fg: #1e3a8a;
  --jss-icon-bg: #bfdbfe;
}

.judge-steward-chip--judging {
  --jss-border: #f0b100;
  --jss-bg: #fffbeb;
  --jss-fg: #713f12;
  --jss-icon-bg: #fde68a;
}

.judge-steward-chip--completed {
  --jss-border: #34d399;
  --jss-bg: #ecfdf5;
  --jss-fg: #14532d;
  --jss-icon-bg: #a7f3d0;
}

.judge-steward-chip__icon-wrap {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.5rem;
  background: var(--jss-icon-bg, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
}

.judge-steward-chip__icon {
  color: var(--jss-fg, #1f2937);
  opacity: 0.92;
}

.judge-steward-chip__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  line-height: 1.2;
}

.judge-steward-chip__label {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.judge-steward-chip__next {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--jss-fg, #4b5563);
  opacity: 0.88;
  line-height: 1.25;
  word-break: break-word;
}

.judge-steward-chip__next-prefix {
  font-weight: 600;
  opacity: 0.75;
  margin-right: 0.15rem;
}

.judge-steward-chip__chevron {
  flex-shrink: 0;
  color: var(--jss-fg, #6b7280);
  opacity: 0.65;
}
</style>
