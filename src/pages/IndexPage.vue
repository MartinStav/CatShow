<template>
  <q-page>
    <div class="row justify-center q-pa-lg">
      <div class="col-12 col-md-10 col-lg-8">
        <q-card class="q-mb-lg shadow-2">
          <q-card-section class="text-center q-pa-xl">
            <div class="text-h4 text-weight-bold q-mb-sm">Vitajte</div>
            <div class="text-body1 text-grey-7">Systém pre správu výstav mačiek</div>
          </q-card-section>
        </q-card>

        <div v-if="loading" class="text-center q-pa-xl">
          <q-spinner-dots size="40px" color="primary" />
          <div class="text-body2 text-grey-7 q-mt-md">Načítavam súťaže...</div>
        </div>

        <template v-else>
          <!-- Upcoming (not yet started) -->
          <div v-if="upcomingCompetitions.length" class="q-mb-lg">
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="schedule" size="28px" color="light-blue-7" />
              <div class="text-h6 text-weight-bold">Súťaže, ktoré ešte nezačali</div>
            </div>
            <div class="row q-col-gutter-md items-stretch">
              <div
                v-for="comp in upcomingCompetitions"
                :key="comp.id"
                class="col-12 col-md-6"
              >
                <competition-card :competition="comp" @navigate="goToCompetition" />
              </div>
            </div>
          </div>

          <!-- Active competitions -->
          <div v-if="activeCompetitions.length" class="q-mb-lg">
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="event" size="28px" color="green" />
              <div class="text-h6 text-weight-bold">Aktívne súťaže</div>
            </div>
            <div class="row q-col-gutter-md items-stretch">
              <div
                v-for="comp in activeCompetitions"
                :key="comp.id"
                class="col-12 col-md-6"
              >
                <competition-card :competition="comp" @navigate="goToCompetition" />
              </div>
            </div>
          </div>

          <!-- Paused competitions -->
          <div v-if="pausedCompetitions.length" class="q-mb-lg">
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="pause_circle_outline" size="28px" color="orange" />
              <div class="text-h6 text-weight-bold">Pozastavené súťaže</div>
            </div>
            <div class="row q-col-gutter-md items-stretch">
              <div
                v-for="comp in pausedCompetitions"
                :key="comp.id"
                class="col-12 col-md-6"
              >
                <competition-card :competition="comp" @navigate="goToCompetition" />
              </div>
            </div>
          </div>

          <!-- Finished competitions -->
          <div v-if="finishedCompetitions.length" class="q-mb-lg">
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="flag" size="28px" color="grey-7" />
              <div class="text-h6 text-weight-bold">Ukončené súťaže</div>
            </div>
            <div class="row q-col-gutter-md items-stretch">
              <div
                v-for="comp in finishedCompetitions"
                :key="comp.id"
                class="col-12 col-md-6"
              >
                <competition-card
                  :competition="comp"
                  badge-color="grey-7"
                  badge-label="Ukončené"
                  @navigate="goToCompetition"
                />
              </div>
            </div>
          </div>

          <!-- Draft competitions (admin only) -->
          <div v-if="draftCompetitions.length && authStore.isAdmin" class="q-mb-lg">
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="edit_note" size="28px" color="grey" />
              <div class="text-h6 text-weight-bold">Koncepty (nepublikované)</div>
            </div>
            <div class="row q-col-gutter-md items-stretch">
              <div
                v-for="comp in draftCompetitions"
                :key="comp.id"
                class="col-12 col-md-6"
              >
                <competition-card :competition="comp" badge-color="grey" badge-label="Koncept" @navigate="goToCompetition" />
              </div>
            </div>
          </div>

          <!-- No competitions message -->
                   <q-card
            v-if="
              !upcomingCompetitions.length &&
              !activeCompetitions.length &&
              !pausedCompetitions.length &&
              !finishedCompetitions.length &&
              !(draftCompetitions.length && authStore.isAdmin)
            "
            class="q-mb-lg shadow-1"
          >
            <q-card-section class="text-center q-pa-xl">
              <q-icon name="event_busy" size="48px" color="grey-5" class="q-mb-md" />
              <div class="text-h6 text-grey-7">Žiadne súťaže</div>
              <div class="text-body2 text-grey-5 q-mb-md">Momentálne nie sú k dispozícii žiadne súťaže</div>
            </q-card-section>
          </q-card>

        </template>
      </div>
    </div>

    <q-dialog v-model="showCompetitionMenu" transition-show="scale" transition-hide="scale" @hide="onCompetitionMenuHide">
      <q-card class="competition-menu-card">
        <q-card-section class="competition-menu-header row items-start no-wrap q-pb-sm">
          <div class="col">
            <div class="text-h6 text-weight-bold">{{ selectedCompetition?.name }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">Vyberte sekciu</div>
          </div>
          <q-btn flat round dense icon="close" aria-label="Zavrieť" @click="closeCompetitionMenu" />
        </q-card-section>

        <q-separator />

        <q-card-section class="q-pt-md q-pb-md competition-menu-body">
              <q-banner
                v-if="selectedCompetition?.status === 'finished'"
                class="bg-grey-2 text-grey-9 q-mb-md"
                rounded
                dense
              >
                Táto súťaž je ukončená. V prehľade a v live náhľade uvidíte výsledky hodnotení.
              </q-banner>

              <q-banner
                v-if="selectedCompetition?.status === 'scheduled'"
                class="bg-light-blue-1 text-dark q-mb-md"
                rounded
                dense
              >
                Súťaž ešte nezačala. Po jej spustení sa tu zobrazí hodnotenie a vyvolávanie.
              </q-banner>

              <template
                v-if="
                  (hasRole('administrator') || authStore.isAdmin) &&
                  selectedCompetition?.status !== 'scheduled'
                "
              >
                <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                  <q-icon name="table_chart" size="20px" color="indigo-7" />
                  <span>Správa stolov</span>
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12 col-sm-6">
                    <q-card flat bordered class="cursor-pointer menu-action-card" @click="goToPage('table-management')">
                      <q-card-section class="q-pa-md">
                        <div class="row items-center q-gutter-md no-wrap">
                          <q-icon name="table_chart" size="36px" color="indigo-7" />
                          <div class="col">
                            <div class="text-subtitle2 text-weight-medium">Hodnotiace stoly</div>
                            <div class="text-body2 text-grey-7">Vyvolávanie mačiek na ring (čaká / volaná / hotovo)</div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </template>

              <template
                v-if="
                  (hasRole('judge') || authStore.isAdmin || hasRole('administrator')) &&
                  selectedCompetition?.status !== 'finished' &&
                  selectedCompetition?.status !== 'scheduled'
                "
              >
                <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                  <q-icon name="gavel" size="20px" color="teal-7" />
                  <span>Pre posudzovateľov</span>
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div v-if="judgeCurrentRoundPage" class="col-12 col-sm-6">
                    <q-card flat bordered class="cursor-pointer menu-action-card" @click="onJudgeEntryClick">
                      <q-card-section class="q-pa-md">
                        <div class="row items-center q-gutter-md no-wrap">
                          <q-icon :name="judgeCurrentRoundPage.icon" size="36px" color="teal-7" />
                          <div class="col">
                            <div class="text-subtitle2 text-weight-medium">
                              {{ judgeCurrentRoundPage.title }}
                            </div>
                            <div class="text-body2 text-grey-7">{{ judgeCurrentRoundPage.description }}</div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                  <div v-else class="col-12">
                    <q-banner rounded class="bg-orange-2 text-dark">
                      Posudzovanie sa zobrazí po spustení kola (Nominácia / Ring 1 / Ring 2).
                    </q-banner>
                  </div>
                </div>
              </template>

              <template
                v-if="
                  (hasRole('steward') || hasRole('administrator') || authStore.isAdmin) &&
                  selectedCompetition?.status !== 'finished' &&
                  selectedCompetition?.status !== 'scheduled'
                "
              >
                <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                  <q-icon name="support_agent" size="20px" color="cyan-7" />
                  <span>Vyvolávanie mačiek</span>
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12 col-sm-6">
                    <q-card flat bordered class="cursor-pointer menu-action-card" @click="onStewardEntryClick">
                      <q-card-section class="q-pa-md">
                        <div class="row items-center q-gutter-md no-wrap">
                          <q-icon name="phone_in_talk" size="36px" color="cyan-7" />
                          <div class="col">
                            <div class="text-subtitle2 text-weight-medium">Vyvolávanie mačiek</div>
                            <div class="text-body2 text-grey-7">
                              Vyvolávajte mačky podľa aktuálneho kola.
                            </div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </template>

              <template v-if="hasRole('exhibitor') && !authStore.isAdmin">
                <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                  <q-icon name="person" size="20px" color="light-blue-7" />
                  <span>Pre vystavovateľov</span>
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12 col-sm-6">
                    <q-card flat bordered class="cursor-pointer menu-action-card" @click="goToPage('my-overview')">
                      <q-card-section class="q-pa-md">
                        <div class="row items-center q-gutter-md no-wrap">
                          <q-icon name="dashboard" size="36px" color="light-blue-7" />
                          <div class="col">
                            <div class="text-subtitle2 text-weight-medium">Môj prehľad</div>
                            <div class="text-body2 text-grey-7">Stav vašich mačiek a priebeh súťaže</div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </template>

              <template v-if="authStore.isAdmin || hasRole('administrator')">
                <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                  <q-icon name="admin_panel_settings" size="20px" color="blue-grey-8" />
                  <span>Pre administrátorov</span>
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div class="col-12 col-sm-6">
                    <q-card flat bordered class="cursor-pointer menu-action-card" @click="goToPage('admin')">
                      <q-card-section class="q-pa-md">
                        <div class="row items-center q-gutter-md no-wrap">
                          <q-icon name="admin_panel_settings" size="36px" color="blue-grey-8" />
                          <div class="col">
                            <div class="text-subtitle2 text-weight-medium">Admin panel</div>
                            <div class="text-body2 text-grey-7">Správa nastavení, mačiek, výsledkov a import/export</div>
                          </div>
                        </div>
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </template>

              <div class="text-subtitle2 text-weight-medium q-mb-sm row items-center q-gutter-xs">
                <q-icon name="visibility" size="20px" color="red-6" />
                <span>Live monitoring</span>
              </div>
              <div class="row q-col-gutter-sm">
                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="cursor-pointer menu-action-card" @click="goToPage('live-monitoring')">
                    <q-card-section class="q-pa-md">
                      <div class="row items-center q-gutter-md no-wrap">
                        <q-icon name="live_tv" size="36px" color="red-6" />
                        <div class="col">
                          <div class="text-subtitle2 text-weight-medium">Live priebeh súťaže</div>
                          <div class="text-body2 text-grey-7">
                            Sledujte priebeh hodnotenia v reálnom čase.
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-6">
                  <q-card flat bordered class="cursor-pointer menu-action-card" @click="goToPage('results')">
                    <q-card-section class="q-pa-md">
                      <div class="row items-center q-gutter-md no-wrap">
                        <q-icon name="fact_check" size="36px" color="positive" />
                        <div class="col">
                          <div class="text-subtitle2 text-weight-medium">Výsledky</div>
                          <div class="text-body2 text-grey-7">
                            Verejné výsledky hodnotení vrátane NomBIS, BIV a BIS.
                          </div>
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showJudgingJudgePicker" persistent>
      <q-card style="min-width: 320px; max-width: 420px">
        <q-card-section>
          <div class="text-h6">Posudzovanie – výber rozhodcu</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            Zapisujete hodnotenia v mene vybraného rozhodcu.
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-select
            v-model="pickerSelectedJudgeId"
            :options="pickerJudges"
            :option-label="judgePickerLabel"
            option-value="id"
            emit-value
            map-options
            outlined
            dense
            label="Rozhodca"
            :loading="pickerLoading"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Otvoriť"
            :disable="pickerSelectedJudgeId == null"
            @click="confirmJudgingJudgePicker"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showStewardJudgePicker" persistent>
      <q-card style="min-width: 320px; max-width: 420px">
        <q-card-section>
          <div class="text-h6">Vyvolávanie – výber rozhodcu</div>
          <div class="text-body2 text-grey-7 q-mt-xs">
            Vyvolávate v mene vybraného rozhodcu.
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-select
            v-model="pickerSelectedJudgeId"
            :options="pickerJudges"
            :option-label="judgePickerLabel"
            option-value="id"
            emit-value
            map-options
            outlined
            dense
            label="Rozhodca"
            :loading="pickerLoading"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Zrušiť" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Otvoriť"
            :disable="pickerSelectedJudgeId == null"
            @click="confirmStewardJudgePicker"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionStore } from 'src/stores/competition';
import { useLiveNavigationStore } from 'src/stores/liveNavigation';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';
import { api } from 'src/boot/axios';
import CompetitionCard from 'src/components/CompetitionCard.vue';

const router = useRouter();
const authStore = useAuthStore();
const compStore = useCompetitionStore();

type PickerJudgeRow = {
  id: number;
  name: string;
  stewardUserId?: number | null;
  stewardUser?: { fullName?: string | null };
};

const loading = ref(true);
const selectedCompetition = ref<{
  id: number;
  name: string;
  currentRound: string | null;
  status: string;
} | null>(null);
const showCompetitionMenu = ref(false);
const showJudgingJudgePicker = ref(false);
const showStewardJudgePicker = ref(false);
const pickerJudges = ref<PickerJudgeRow[]>([]);
const pickerLoading = ref(false);
const pickerSelectedJudgeId = ref<number | null>(null);

const competitions = computed(() => compStore.competitions);

const upcomingCompetitions = computed(() =>
  competitions.value.filter((c) => c.status === 'scheduled' && c.published)
);

const activeCompetitions = computed(() =>
  competitions.value.filter((c) => c.status === 'active' && c.published)
);

const pausedCompetitions = computed(() =>
  competitions.value.filter((c) => c.status === 'paused' && c.published)
);

const finishedCompetitions = computed(() =>
  competitions.value.filter((c) => c.status === 'finished' && c.published)
);

const draftCompetitions = computed(() =>
  competitions.value.filter((c) => !c.published)
);

type JudgeRoundPage = {
  route: 'nomination-evaluation' | 'ring-phase-1' | 'ring-phase-2' | 'bis-finals';
  title: string;
  description: string;
  icon: string;
};

const judgeCurrentRoundPage = computed<JudgeRoundPage | null>(() => {
  const round = selectedCompetition.value?.currentRound;
  if (round === 'nomination') {
    return {
      route: 'nomination-evaluation',
      title: 'Nominácia',
      description: 'Hodnotenie mačiek v nominačnom kole',
      icon: 'assessment',
    };
  }
  if (round === 'ring1') {
    return {
      route: 'ring-phase-1',
      title: 'Ring fáza 1',
      description: 'Prijatie alebo zamietnutie mačiek',
      icon: 'toll',
    };
  }
  if (round === 'ring2') {
    return {
      route: 'ring-phase-2',
      title: 'Ring fáza 2',
      description: 'Priradenie pozícií a zoradenie mačiek',
      icon: 'emoji_events',
    };
  }
  if (round === 'bis') {
    return {
      route: 'bis-finals',
      title: 'BIS / Finále',
      description: 'NomBIS, BIV a finálne BIS udelenie',
      icon: 'workspace_premium',
    };
  }
  return null;
});

function hasRole(role: string): boolean {
  if (!selectedCompetition.value) return false;
  return authStore.hasCompetitionRole(selectedCompetition.value.id, [role]);
}

const canUseCompetitionOverride = computed(() => {
  if (!selectedCompetition.value) return false;
  return authStore.isAdmin || hasRole('administrator');
});

function judgePickerLabel(j: PickerJudgeRow): string {
  const st = j.stewardUser?.fullName?.trim();
  return st ? `${j.name} · stevard: ${st}` : `${j.name} · bez stevarda`;
}

async function loadPickerJudges(): Promise<void> {
  if (!selectedCompetition.value) return;
  pickerLoading.value = true;
  try {
    const { data } = await api.get<PickerJudgeRow[]>(`/competitions/${selectedCompetition.value.id}/judges`);
    pickerJudges.value = data ?? [];
    pickerSelectedJudgeId.value =
      pickerJudges.value.length === 1 ? pickerJudges.value[0]!.id : null;
  } finally {
    pickerLoading.value = false;
  }
}

async function openJudgingJudgePicker(): Promise<void> {
  pickerSelectedJudgeId.value = null;
  pickerJudges.value = [];
  showJudgingJudgePicker.value = true;
  await loadPickerJudges();
}

async function openStewardJudgePicker(): Promise<void> {
  pickerSelectedJudgeId.value = null;
  pickerJudges.value = [];
  showStewardJudgePicker.value = true;
  await loadPickerJudges();
}

function onJudgeEntryClick(): void {
  if (!judgeCurrentRoundPage.value) return;
  if (canUseCompetitionOverride.value) {
    void openJudgingJudgePicker();
    return;
  }
  goToPage(judgeCurrentRoundPage.value.route);
}

function confirmJudgingJudgePicker(): void {
  if (!selectedCompetition.value || !judgeCurrentRoundPage.value || pickerSelectedJudgeId.value == null) return;
  const cid = selectedCompetition.value.id;
  const r = judgeCurrentRoundPage.value.route;
  showJudgingJudgePicker.value = false;
  showCompetitionMenu.value = false;
  void router.push({
    path: `/competition/${cid}/${r}`,
    query: { asJudgeId: String(pickerSelectedJudgeId.value) },
  });
}

function confirmStewardJudgePicker(): void {
  if (!selectedCompetition.value || pickerSelectedJudgeId.value == null) return;
  const cid = selectedCompetition.value.id;
  showStewardJudgePicker.value = false;
  showCompetitionMenu.value = false;
  void router.push({
    path: `/competition/${cid}/steward-interface`,
    query: { asJudgeId: String(pickerSelectedJudgeId.value) },
  });
}

function onStewardEntryClick(): void {
  if (canUseCompetitionOverride.value) {
    void openStewardJudgePicker();
    return;
  }
  goToPage('steward-interface');
}

async function refreshCompetitions() {
  if (authStore.isLoggedIn) {
    await compStore.fetchAll();
  } else {
    await compStore.fetchPublic();
  }
  if (selectedCompetition.value) {
    const latest = competitions.value.find((c) => c.id === selectedCompetition.value?.id);
    if (latest) {
      selectedCompetition.value = {
        id: latest.id,
        name: latest.name,
        currentRound: latest.currentRound,
        status: latest.status,
      };
    }
  }
}

const realtimeCatalog = computed(() => authStore.isLoggedIn);

useCompetitionRealtime({
  catalog: realtimeCatalog,
  onInvalidate: () => void refreshCompetitions(),
});

let guestRefreshInterval: ReturnType<typeof setInterval> | null = null;

function applyGuestPolling() {
  if (guestRefreshInterval) {
    clearInterval(guestRefreshInterval);
    guestRefreshInterval = null;
  }
  if (!authStore.isLoggedIn) {
    guestRefreshInterval = setInterval(() => void refreshCompetitions(), 5000);
  }
}

onMounted(async () => {
  try {
    if (authStore.isLoggedIn) {
      await compStore.fetchAll();
    } else {
      await compStore.fetchPublic();
    }
  } catch {
    // silently handle
  } finally {
    loading.value = false;
  }
  applyGuestPolling();
});

watch(() => authStore.isLoggedIn, () => applyGuestPolling());

onUnmounted(() => {
  if (guestRefreshInterval) {
    clearInterval(guestRefreshInterval);
    guestRefreshInterval = null;
  }
});

function closeCompetitionMenu() {
  showCompetitionMenu.value = false;
}

function onCompetitionMenuHide() {
  selectedCompetition.value = null;
}

const goToCompetition = (id: number) => {
  const comp = competitions.value.find((c) => c.id === id);
  if (!comp) return;

  if (!authStore.isLoggedIn) {
    useLiveNavigationStore().setLiveReturnPath('/');
    void router.push(
      comp.status === 'finished'
        ? `/competition/${comp.id}/results`
        : `/competition/${comp.id}/live-monitoring`,
    );
    return;
  }

  // Prihlásený používateľ s jednou rolou → auto-redirect.
  const roles =
    authStore.user?.competitionRoles.filter((cr) => Number(cr.competitionId) === Number(id)) || [];

  if (comp.status === 'finished') {
    if (roles.length === 1 && !authStore.isAdmin) {
      const sole = roles[0]!.role;
      if (sole === 'exhibitor') {
        void router.push(`/competition/${comp.id}/my-overview`);
        return;
      }
      if (sole === 'telka') {
        useLiveNavigationStore().setLiveReturnPath('/');
        void router.push(`/competition/${comp.id}/live-monitoring`);
        return;
      }
    }
    selectedCompetition.value = {
      id: comp.id,
      name: comp.name,
      currentRound: comp.currentRound,
      status: comp.status,
    };
    showCompetitionMenu.value = true;
    return;
  }

  if (roles.length === 1 && !authStore.isAdmin) {
    const role = roles[0]!.role;
    const round = comp.currentRound;

    switch (role) {
      case 'judge':
        if (round === 'bis') {
          void router.push(`/competition/${comp.id}/bis-finals`);
        } else if (round === 'ring2') {
          void router.push(`/competition/${comp.id}/ring-phase-2`);
        } else if (round === 'ring1') {
          void router.push(`/competition/${comp.id}/ring-phase-1`);
        } else if (round === 'nomination') {
          void router.push(`/competition/${comp.id}/nomination-evaluation`);
        } else {
          selectedCompetition.value = {
            id: comp.id,
            name: comp.name,
            currentRound: comp.currentRound,
            status: comp.status,
          };
          showCompetitionMenu.value = true;
        }
        return;
      case 'exhibitor':
        void router.push(`/competition/${comp.id}/my-overview`);
        return;
      case 'telka':
        useLiveNavigationStore().setLiveReturnPath('/');
        void router.push(`/competition/${comp.id}/live-monitoring`);
        return;
      case 'steward':
        void router.push(`/competition/${comp.id}/steward-interface`);
        return;
    }
  }

  selectedCompetition.value = {
    id: comp.id,
    name: comp.name,
    currentRound: comp.currentRound,
    status: comp.status,
  };
  showCompetitionMenu.value = true;
};

const goToPage = (page: string) => {
  if (!selectedCompetition.value) return;
  const cid = selectedCompetition.value.id;
  showCompetitionMenu.value = false;
  if (page === 'live-monitoring') {
    useLiveNavigationStore().setLiveReturnPath('/');
  }
  void router.push(`/competition/${cid}/${page}`);
};

</script>

<style scoped>
.cursor-pointer:hover {
  transform: translateY(-2px);
  transition: transform 0.2s;
}

.competition-card:hover {
  transform: translateY(-4px);
  transition: transform 0.2s;
}

.competition-menu-card {
  display: flex;
  flex-direction: column;
  width: min(98vw, 1600px);
  max-height: min(90vh, 920px);
  overflow: hidden;
}

.competition-menu-header {
  flex-shrink: 0;
}

.competition-menu-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.menu-action-card:hover {
  background: rgba(0, 0, 0, 0.04);
}
</style>
