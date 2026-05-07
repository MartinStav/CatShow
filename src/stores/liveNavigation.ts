import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Aktuálna alebo posledná cesta pred vstupom na live monitoring (pre „Späť do rozhrania“). */
export const useLiveNavigationStore = defineStore('liveNavigation', () => {
  const returnPath = ref<string | null>(null);

  function setLiveReturnPath(path: string | null) {
    returnPath.value = path;
  }

  function clearLiveReturnPath() {
    returnPath.value = null;
  }

  return { returnPath, setLiveReturnPath, clearLiveReturnPath };
});

export function isLiveViewFullPath(path: string): boolean {
  return /\/live-monitoring(?:\/|$)|\/live-scoring|\/live-monitoring-ring/.test(path);
}
