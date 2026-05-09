<template>
  <q-page class="q-pa-lg">
    <div class="page-wrapper">
      <div v-if="pageLoading" class="text-center q-pa-xl">
        <q-spinner-dots color="primary" size="40px" />
      </div>

      <template v-else>
        <q-banner
          v-if="canStewardImpersonate && impersonateJudgeId != null"
          rounded
          class="bg-deep-orange-1 text-dark q-mb-md"
        >
          <strong>Režim opráv:</strong> vidíte front rozhodcu
          <strong>{{ impersonatedJudgeDisplayName }}</strong>. Stevardské kroky sa uplatnia v jeho mene.
        </q-banner>
        <q-banner v-if="stewardPhase === 'idle'" rounded class="bg-orange-2 text-dark">
          Vyvolávanie sa zobrazí po spustení kola (Nominácia / Ring).
        </q-banner>

        <!-- NOMINÁCIA: rad so „Zavolať ďalšiu“ (čaká → volaná → hodnotí sa → hotovo) -->
        <template v-else-if="stewardPhase === 'nomination'">
          <div class="text-h6 q-mb-md">Nominácia – vyvolávanie</div>
          <div class="text-body2 text-grey-7 q-mb-lg">
            Vyvolávate mačky podľa vybraného rozhodcu. Jedným klikom <strong>Zavolať ďalšiu</strong> sa posunie
            celá fronta.
          </div>

          <q-banner v-if="nominationStewardNeedsJudge" rounded class="bg-grey-3 text-dark q-mb-md">
            Nemáte priradeného žiadneho rozhodcu ako stevarda. Kontaktujte administrátora.
          </q-banner>

          <template v-else>
            <q-select
              v-if="myJudges.length > 1 && judgingOrders.length > 0"
              v-model="selectedJudgeId"
              :options="judgeSelectOptions"
              label="Rozhodca, ktorého vyvolávate"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
              style="max-width: 420px"
            />

            <q-btn-toggle
              v-if="
                stewardGroupTabOptions.length > 1 &&
                judgingOrders.length > 0 &&
                selectedJudgeId != null
              "
              v-model="selectedStewardProtocolGroup"
              :options="stewardGroupToggleOptions"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="grey-4"
              text-color="grey-9"
              class="full-width q-mb-md protocol-group-toggle"
            />

            <q-banner
              v-if="selectedJudgeConfirmed || nominationGroupReadyForResults"
              rounded
              class="bg-green-2 text-dark q-mb-md"
            >
              <template v-if="selectedJudgeConfirmed">
                Rozhodca <strong>{{ selectedJudgeName || '—' }}</strong> už potvrdil odovzdanie nominácie.
              </template>
              <template v-else>
                Skupina <strong>{{ selectedStewardProtocolGroup || '—' }}</strong> je vyhodnotená, výsledky sú pripravené.
              </template>
            </q-banner>

            <q-card
              v-if="
                (selectedJudgeConfirmed || nominationGroupReadyForResults) &&
                selectedJudgeId != null &&
                stewardNominationResultSlots.length > 0
              "
              flat
              bordered
              class="steward-results-card q-mb-lg"
            >
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-sm">
                  Výsledky nominácie – {{ selectedJudgeName || '—' }}
                </div>
                <div class="text-caption text-grey-7 q-mb-md">
                  Hodnotenie tohto rozhodcu pri mačkách z judge protokolu (alebo zo zoznamu súťaže).
                </div>
                <q-markup-table flat dense bordered wrap-cells class="steward-results-table">
                  <thead>
                    <tr>
                      <th>Por.</th>
                      <th class="text-left">Číslo</th>
                      <th class="text-left">Mačka</th>
                      <th class="text-left">Stupeň</th>
                      <th class="text-left">Tituly</th>
                      <th>NomBIS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in stewardNominationResultSlots" :key="row.cat.id">
                      <td>{{ row.orderPosition }}</td>
                      <td class="text-left">{{ row.cat.registrationNumber }}</td>
                      <td class="text-left">{{ row.cat.name }}</td>
                      <td class="text-left">{{ row.ev?.grade && row.ev.grade.length ? row.ev.grade : '—' }}</td>
                      <td class="text-left">
                        <span v-if="row.ev?.titles?.length">{{ row.ev.titles.join(', ') }}</span>
                        <span v-else>—</span>
                      </td>
                      <td>{{ row.ev?.nomBis ? 'Áno' : '—' }}</td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </q-card>

            <div
              v-if="selectedJudgeConfirmed && nominationNotCompletedCount > 0"
              class="row justify-end q-mb-md"
            >
              <q-btn
                color="green"
                icon="done_all"
                label="Všetky mačky označiť hotovo"
                no-caps
                unelevated
                @click="nomMarkAllCompletedForJudge"
              />
            </div>

            <q-banner v-if="nominationQueueEmpty" rounded class="bg-blue-1 text-dark q-mb-md">
              Pre rozhodcu <strong>{{ selectedJudgeName || '—' }}</strong> nie sú v protokole žiadne mačky.
              Kontaktujte administrátora.
            </q-banner>

            <template v-if="!nominationQueueEmpty">
              <div class="row q-col-gutter-md q-mb-lg">
                <div class="col-12 col-sm-6 col-md-3">
                  <q-card class="status-summary-card" flat bordered>
                    <q-card-section class="status-card-section">
                      <div class="row items-start justify-between q-mb-md">
                        <div class="status-label-text">Čaká</div>
                        <q-icon name="schedule" size="20px" color="grey-7" />
                      </div>
                      <div class="status-number-large">{{ ringWaitingCount }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-card class="status-summary-card" flat bordered>
                    <q-card-section class="status-card-section">
                      <div class="row items-start justify-between q-mb-md">
                        <div class="status-label-text">Volaná</div>
                        <q-icon name="phone_in_talk" size="20px" color="grey-7" />
                      </div>
                      <div class="status-number-large">{{ ringCalledCount }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-card class="status-summary-card" flat bordered>
                    <q-card-section class="status-card-section">
                      <div class="row items-start justify-between q-mb-md">
                        <div class="status-label-text">Hodnotí sa</div>
                        <q-icon name="play_circle" size="20px" color="grey-7" />
                      </div>
                      <div class="status-number-large">{{ ringJudgingCount }}</div>
                    </q-card-section>
                  </q-card>
                </div>
                <div class="col-12 col-sm-6 col-md-3">
                  <q-card class="status-summary-card" flat bordered>
                    <q-card-section class="status-card-section">
                      <div class="row items-start justify-between q-mb-md">
                        <div class="status-label-text">Hotovo</div>
                        <q-icon name="check_circle" size="20px" color="grey-7" />
                      </div>
                      <div class="status-number-large">{{ ringCompletedCount }}</div>
                    </q-card-section>
                  </q-card>
                </div>
              </div>

              <div class="row justify-end q-mb-lg">
                <q-btn
                  class="call-next-btn"
                  label="Zavolať ďalšiu"
                  icon="phone_forwarded"
                  unelevated
                  @click="ringCallNext"
                />
              </div>

              <div class="call-queue-container">
                <template v-for="row in activeRingProtocolRows" :key="protocolRowKey(row)">
                  <q-card class="call-queue-card-item" :class="ringCardClass(row.callStatus)">
                    <q-card-section class="call-queue-card-content">
                      <div class="row items-center justify-between q-mb-sm">
                        <q-badge :color="ringBadgeColor(row.callStatus)" text-color="white" class="status-badge">
                          <q-icon :name="ringBadgeIcon(row.callStatus)" size="14px" class="q-mr-xs" />
                          {{ ringStatusLabel(row.callStatus) }}
                        </q-badge>
                        <div class="row q-gutter-xs">
                          <q-btn
                            v-if="row.callStatus === 'waiting'"
                            class="action-btn action-btn-filled"
                            label="Zavolať"
                            icon="phone"
                            size="sm"
                            unelevated
                            @click="ringCallCat(row)"
                          />
                          <q-btn
                            v-else-if="row.callStatus === 'called'"
                            class="action-btn action-btn-outlined"
                            label="Začať hodnotenie"
                            icon="play_arrow"
                            size="sm"
                            flat
                            @click="ringStartJudging(row)"
                          />
                          <q-btn
                            v-else-if="row.callStatus === 'judging'"
                            class="action-btn action-btn-outlined"
                            label="Ukončiť"
                            icon="check"
                            size="sm"
                            flat
                            @click="ringCompleteJudging(row)"
                          />
                        </div>
                      </div>
                      <div class="cat-name">{{ row.cat.name }}</div>
                      <div class="row q-mt-sm text-body2 text-grey-8">
                        <div class="col-6">
                          <span class="text-grey-7">Plemeno:</span> {{ row.cat.breed }}
                        </div>
                        <div class="col-6">
                          <span class="text-grey-7">Číslo:</span> {{ row.cat.registrationNumber }}
                        </div>
                        <div class="col-12 q-mt-xs" v-if="row.cat.exhibitor?.name">
                          <span class="text-grey-7">Vystavovateľ:</span> {{ row.cat.exhibitor.name }}
                        </div>
                      </div>
                    </q-card-section>
                  </q-card>
                </template>

                <div
                  v-if="completedRingProtocolRows.length > 0 && activeRingProtocolRows.length > 0"
                  class="section-separator"
                >
                  <div class="separator-line" />
                  <div class="separator-text">Hotové</div>
                  <div class="separator-line" />
                </div>

                <template v-for="row in completedRingProtocolRows" :key="protocolRowKey(row)">
                  <q-card class="call-queue-card-item ring-card-completed">
                    <q-card-section class="call-queue-card-content">
                      <div class="row items-center justify-between q-mb-sm">
                        <q-badge color="green" text-color="white" class="status-badge">
                          <q-icon name="check" size="14px" class="q-mr-xs" />
                          Hotovo
                        </q-badge>
                        <span class="reset-link" @click="ringResetFromCompleted(row)">Späť do čakania</span>
                      </div>
                      <div class="cat-name">{{ row.cat.name }}</div>
                      <div class="text-caption text-grey-7">{{ row.cat.registrationNumber }} · {{ row.cat.breed }}</div>
                    </q-card-section>
                  </q-card>
                </template>
              </div>
            </template>
          </template>
        </template>

        <!-- RING: judge protokol, osobitne podľa rozhodcu -->
        <template v-else-if="stewardPhase === 'ring'">
          <div class="text-h6 q-mb-md">Ring – vyvolávanie podľa rozhodcu</div>
          <div class="text-body2 text-grey-7 q-mb-md">
            Vyvolávate v poradí pre každého rozhodcu, ktorého máte ako stevarda.
          </div>

          <q-banner v-if="myJudges.length === 0" rounded class="bg-grey-3 text-dark q-mb-md">
            Nemáte priradeného žiadneho rozhodcu ako stevarda. Kontaktujte administrátora.
          </q-banner>

          <template v-else>
            <q-select
              v-if="myJudges.length > 1"
              v-model="selectedJudgeId"
              :options="judgeSelectOptions"
              label="Rozhodca, ktorého vyvolávate"
              outlined
              dense
              emit-value
              map-options
              class="q-mb-md"
              style="max-width: 420px"
            />

            <q-btn-toggle
              v-if="
                stewardGroupTabOptions.length > 1 &&
                judgingOrders.length > 0 &&
                selectedJudgeId != null
              "
              v-model="selectedStewardProtocolGroup"
              :options="stewardGroupToggleOptions"
              spread
              no-caps
              unelevated
              toggle-color="primary"
              color="grey-4"
              text-color="grey-9"
              class="full-width q-mb-md protocol-group-toggle"
            />

            <q-banner
              v-if="currentRound === 'ring1' && selectedJudgeRing1Confirmed"
              rounded
              class="bg-green-2 text-dark q-mb-md"
            >
              Rozhodca <strong>{{ selectedJudgeName || '—' }}</strong> už potvrdil odovzdanie Ring 1.
            </q-banner>

            <q-card
              v-if="stewardRing1ResultSlots.length > 0"
              flat
              bordered
              class="steward-results-card q-mb-lg"
            >
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-sm">
                  Ring 1 – výsledky {{ selectedJudgeName ? `(${selectedJudgeName})` : '' }}
                </div>
                <div class="text-caption text-grey-7 q-mb-md">Prijatie do ringu podľa tohto rozhodcu.</div>
                <q-markup-table flat dense bordered wrap-cells class="steward-results-table">
                  <thead>
                    <tr>
                      <th>Por.</th>
                      <th class="text-left">Číslo</th>
                      <th class="text-left">Mačka</th>
                      <th class="text-left">Rozhodnutie</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in stewardRing1ResultSlots" :key="`r1-${row.cat.id}`">
                      <td>{{ row.orderPosition }}</td>
                      <td class="text-left">{{ row.cat.registrationNumber }}</td>
                      <td class="text-left">{{ row.cat.name }}</td>
                      <td class="text-left">
                        <template v-if="row.ev && row.ev.accepted === true">Prijatá</template>
                        <template v-else-if="row.ev && row.ev.accepted === false">Neprijatá</template>
                        <template v-else>—</template>
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </q-card>

            <q-banner v-if="nominationProtocolEmpty" rounded class="bg-blue-1 text-dark q-mb-md">
              Pre rozhodcu <strong>{{ selectedJudgeName }}</strong> nie sú v protokole žiadne mačky.
              Kontaktujte administrátora.
            </q-banner>

            <q-banner
              v-if="currentRound === 'ring2' && selectedJudgeRing2Confirmed"
              rounded
              class="bg-green-2 text-dark q-mb-md"
            >
              Rozhodca <strong>{{ selectedJudgeName || '—' }}</strong> už potvrdil odovzdanie Ring 2.
            </q-banner>

            <q-card
              v-if="selectedJudgeRing2Confirmed && selectedJudgeId != null && stewardRing2ResultSlots.length > 0"
              flat
              bordered
              class="steward-results-card q-mb-lg"
            >
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-sm">
                  Ring 2 – poradie – {{ selectedJudgeName || '—' }}
                </div>
                <div class="text-caption text-grey-7 q-mb-md">
                  Po potvrdení odovzdania sú zobrazené zapísané pozície.
                </div>
                <q-markup-table flat dense bordered wrap-cells class="steward-results-table">
                  <thead>
                    <tr>
                      <th>Por. (protokol)</th>
                      <th class="text-left">Číslo</th>
                      <th class="text-left">Mačka</th>
                      <th>Miesto v ringu 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in stewardRing2ResultSlots" :key="`r2-${row.cat.id}`">
                      <td>{{ row.orderPosition }}</td>
                      <td class="text-left">{{ row.cat.registrationNumber }}</td>
                      <td class="text-left">{{ row.cat.name }}</td>
                      <td class="text-center">
                        <template v-if="row.ev?.position != null">{{ row.ev.position }}</template>
                        <template v-else>—</template>
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </q-card-section>
            </q-card>

            <div
              v-if="
                currentRound === 'ring2' &&
                selectedJudgeRing2Confirmed &&
                ring2ProtocolNotCompletedCount > 0
              "
              class="row justify-end q-mb-md"
            >
              <q-btn
                color="green"
                icon="done_all"
                label="Všetky mačky označiť hotovo"
                no-caps
                unelevated
                @click="ring2MarkAllCompletedForJudge"
              />
            </div>

            <template v-if="!nominationProtocolEmpty">
              <div class="row q-gutter-sm q-mb-lg">
                <q-badge color="grey" text-color="white" class="q-pa-sm">Čaká: {{ nomWaitingCount }}</q-badge>
                <q-badge color="blue" text-color="white" class="q-pa-sm">Volaná: {{ nomCalledCount }}</q-badge>
                <q-badge color="green" text-color="white" class="q-pa-sm">Hotovo: {{ nomDoneCount }}</q-badge>
              </div>

              <div v-if="nomWaitingList.length > 0" class="q-mb-lg">
                <div class="text-subtitle1 text-weight-medium q-mb-sm">Čakajú</div>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="row in nomWaitingList"
                    :key="row.cat.id"
                    class="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <q-card flat bordered>
                      <q-card-section class="q-pa-sm text-center">
                        <div class="text-caption text-grey-7">
                          Stôl {{ row.tableNumber }} · por. {{ row.orderPosition }}
                        </div>
                        <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ row.cat.registrationNumber }}</div>
                        <div class="text-body2 q-mb-xs">{{ row.cat.name }}</div>
                        <div class="text-caption text-grey-7 q-mb-sm">{{ row.cat.breed }}</div>
                        <q-btn
                          color="primary"
                          icon="phone"
                          label="Zavolať"
                          size="sm"
                          class="full-width"
                          unelevated
                          @click="nomCall(row)"
                        />
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>

              <div v-if="nomActiveList.length > 0" class="q-mb-md">
                <div class="row items-center justify-between q-mb-sm">
                  <div class="text-subtitle1 text-weight-medium">Volaná / pri stole</div>
                  <q-btn
                    v-if="nomActiveList.length > 0"
                    color="green"
                    icon="check"
                    label="Všetky označiť hotové"
                    size="sm"
                    flat
                    dense
                    @click="nomMarkAllDone"
                  />
                </div>
                <div class="row q-col-gutter-sm q-mb-md">
                  <div
                    v-for="row in nomActiveList"
                    :key="row.cat.id"
                    class="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <q-card flat bordered class="bg-blue-1">
                      <q-card-section class="q-pa-sm text-center">
                        <div class="text-caption text-grey-7">
                          Stôl {{ row.tableNumber }} · por. {{ row.orderPosition }}
                        </div>
                        <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ row.cat.registrationNumber }}</div>
                        <div class="text-body2 q-mb-xs">{{ row.cat.name }}</div>
                        <q-btn
                          color="green"
                          icon="check"
                          label="Hotovo"
                          size="sm"
                          class="full-width"
                          unelevated
                          @click="nomDone(row)"
                        />
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>

              <div v-if="nomDoneList.length > 0">
                <div class="text-subtitle1 text-weight-medium q-mb-sm">Hotové</div>
                <div class="row q-col-gutter-sm">
                  <div
                    v-for="row in nomDoneList"
                    :key="row.cat.id"
                    class="col-12 col-sm-6 col-md-4 col-lg-3"
                  >
                    <q-card flat bordered class="bg-green-1">
                      <q-card-section class="q-pa-sm text-center">
                        <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ row.cat.registrationNumber }}</div>
                        <div class="text-body2 q-mb-xs">{{ row.cat.name }}</div>
                        <q-btn
                          flat
                          color="grey-8"
                          icon="refresh"
                          label="Späť do čakania"
                          size="sm"
                          class="full-width"
                          @click="nomReset(row)"
                        />
                      </q-card-section>
                    </q-card>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </template>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';
import { useCompetitionRealtime } from 'src/composables/useCompetitionRealtime';
import {
  compareJudgingOrders,
  normalizedProtocolGroupKey,
  parseJudgingOrderApiRowStrict,
  protocolCallForRound,
  protocolGroupTabsForJudge,
  setOrderProtocolLocal,
  type StewardJudgingRound,
  type JudgingOrderLike,
} from 'src/utils/cat_steward_cycle';

type CatStatus = 'waiting' | 'called' | 'judging' | 'completed';

interface Cat {
  id: string;
  registrationNumber: string;
  name: string;
  breed: string;
  group: string;
  sex: string;
  age: string;
  exhibitorId: string;
  status: CatStatus;
  exhibitor?: { name: string };
}

interface JudgeRow {
  id: number;
  name: string;
  stewardUserId: number | null;
  nominationConfirmed?: boolean;
  ring1RankingConfirmed?: boolean;
  ring2RankingConfirmed?: boolean;
}

interface JudgingOrderRow {
  id: number;
  judgeId: number;
  catId: number;
  orderPosition: number;
  tableNumber: number;
  protocolGroup: string | null;
  protocolCallStatus: CatStatus;
  ring1ProtocolCallStatus: CatStatus;
  ring2ProtocolCallStatus: CatStatus;
}

interface ProtocolRow {
  /** null = nominácia bez judge protokolu (globálny cats.status) */
  orderId: number | null;
  tableNumber: number;
  orderPosition: number;
  cat: Cat;
  callStatus: CatStatus;
}

const route = useRoute();
const authStore = useAuthStore();
const competitionId = computed(() => route.params.competitionId as string);

const competitionNumericId = computed(() => {
  const n = Number(competitionId.value);
  return Number.isFinite(n) && n >= 1 ? n : null;
});

useCompetitionRealtime({
  competitionId: competitionNumericId,
  onInvalidate: () => void loadContext({ silent: true }),
});

const pageLoading = ref(true);
const currentRound = ref<string | null>(null);

const stewardPhase = computed<'idle' | 'nomination' | 'ring'>(() => {
  const r = currentRound.value;
  if (r === 'nomination') return 'nomination';
  if (r === 'ring1' || r === 'ring2') return 'ring';
  return 'idle';
});

const allJudges = ref<JudgeRow[]>([]);
const selectedJudgeId = ref<number | null>(null);
const selectedStewardProtocolGroup = ref('');
const judgingOrders = ref<JudgingOrderRow[]>([]);
const nomCats = ref<Cat[]>([]);

const impersonateJudgeId = computed(() => {
  const raw = route.query.asJudgeId;
  if (raw == null || raw === '') return null;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isFinite(n) ? n : null;
});

/** Superadmin/admin alebo súťažný administrátor môže cez menu „pracovať za“ vybraného stevarda. */
const canStewardImpersonate = computed(() => {
  const cid = competitionNumericId.value;
  if (cid == null) return false;
  return authStore.isAdmin || authStore.hasCompetitionRole(cid, ['administrator']);
});

function judgeIdsEqual(a: number, b: number | string | null | undefined): boolean {
  if (b == null) return false;
  return Number(a) === Number(b);
}

const myJudges = computed(() => {
  if (canStewardImpersonate.value && impersonateJudgeId.value != null) {
    const j = allJudges.value.find((x) => judgeIdsEqual(x.id, impersonateJudgeId.value));
    return j ? [j] : [];
  }
  const uid = authStore.user?.id;
  if (uid == null) return [];
  return allJudges.value.filter(
    (j) => j.stewardUserId != null && judgeIdsEqual(j.stewardUserId, uid),
  );
});

const judgeSelectOptions = computed(() =>
  myJudges.value.map((j) => ({ label: j.name, value: j.id })),
);

const selectedJudge = computed(() =>
  myJudges.value.find((j) => judgeIdsEqual(j.id, selectedJudgeId.value)) ?? null
);

const impersonatedJudgeDisplayName = computed(() => {
  if (impersonateJudgeId.value == null) return '';
  return allJudges.value.find((j) => judgeIdsEqual(j.id, impersonateJudgeId.value))?.name ?? '—';
});

const selectedJudgeConfirmed = computed(() => !!selectedJudge.value?.nominationConfirmed);

const selectedJudgeRing2Confirmed = computed(() => !!selectedJudge.value?.ring2RankingConfirmed);

const selectedJudgeRing1Confirmed = computed(() => !!selectedJudge.value?.ring1RankingConfirmed);

watch(
  myJudges,
  (list) => {
    if (list.length === 0) {
      selectedJudgeId.value = null;
      return;
    }
    if (
      selectedJudgeId.value == null ||
      !list.some((j) => judgeIdsEqual(j.id, selectedJudgeId.value))
    ) {
      selectedJudgeId.value = list[0]!.id;
    }
  },
  { immediate: true },
);

const stewardGroupTabOptions = computed(() =>
  protocolGroupTabsForJudge(judgingOrders.value as JudgingOrderLike[], selectedJudgeId.value),
);

const stewardGroupToggleOptions = computed(() =>
  stewardGroupTabOptions.value.map((o) => ({ label: o.label, value: o.key })),
);

watch(
  [selectedJudgeId, stewardGroupTabOptions],
  () => {
    const opts = stewardGroupTabOptions.value;
    if (opts.length === 0) {
      selectedStewardProtocolGroup.value = '';
      return;
    }
    if (!opts.some((o) => o.key === selectedStewardProtocolGroup.value)) {
      selectedStewardProtocolGroup.value = opts[0]!.key;
    }
  },
  { immediate: true },
);

function stewardOrdersVisibleForJudge(): JudgingOrderRow[] {
  const jid = selectedJudgeId.value;
  if (jid == null) return [];
  let rows = judgingOrders.value.filter((o) => judgeIdsEqual(o.judgeId, jid));
  const tabs = stewardGroupTabOptions.value;
  if (tabs.length > 1) {
    rows = rows.filter(
      (o) => normalizedProtocolGroupKey(o as JudgingOrderLike) === selectedStewardProtocolGroup.value,
    );
  }
  return [...rows].sort(compareJudgingOrders);
}

const catsById = computed(() => {
  const m = new Map<number, Cat>();
  for (const c of nomCats.value) {
    m.set(Number(c.id), c);
  }
  return m;
});

interface ProtocolCatSlot {
  cat: Cat;
  orderPosition: number;
  tableNumber: number;
}

interface StewardEvaluation {
  id: number;
  catId: number;
  judgeId: number | null;
  round: string;
  grade: string | null;
  titles: string[];
  nomBis: boolean;
  accepted: boolean | null;
  position: number | null;
}

/** Tvar riadku z `GET .../evaluations` (Lucid/serializácia). */
type StewardEvalApiRow = {
  id: number;
  catId: number;
  round: string;
  judgeId?: number | null;
  position?: number | null;
  accepted?: boolean | null;
  grade?: string | null;
  titles?: unknown;
  nomBis?: boolean;
};

const stewardEvaluations = ref<StewardEvaluation[]>([]);

function apiRowToStewardEvaluation(ev: StewardEvalApiRow): StewardEvaluation {
  return {
    id: ev.id,
    catId: ev.catId,
    judgeId: ev.judgeId ?? null,
    round: ev.round,
    grade: ev.grade ?? null,
    titles: Array.isArray(ev.titles) ? ev.titles.map((x) => String(x)) : [],
    nomBis: !!ev.nomBis,
    accepted: ev.accepted ?? null,
    position: ev.position ?? null,
  };
}

function findStewardEvaluation(catId: number, judgeId: number, round: string): StewardEvaluation | undefined {
  return stewardEvaluations.value.find(
    (e) =>
      e.catId === catId &&
      e.round === round &&
      e.judgeId != null &&
      judgeIdsEqual(e.judgeId, judgeId),
  );
}

/** Riadky protokolu pre vybraného rozhodcu (rovnaké poradie ako pri vyvolávaní). */
const protocolSlotsForSelectedJudge = computed((): ProtocolCatSlot[] => {
  const jid = selectedJudgeId.value;
  if (jid == null) return [];
  if (judgingOrders.value.length > 0) {
    const rows = stewardOrdersVisibleForJudge();
    const out: ProtocolCatSlot[] = [];
    for (const o of rows) {
      const cat = catsById.value.get(o.catId);
      if (cat) out.push({ cat, orderPosition: o.orderPosition, tableNumber: o.tableNumber });
    }
    return out;
  }
  const sorted = [...nomCats.value].sort((a, b) =>
    a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true }),
  );
  return sorted.map((cat, i) => ({ cat, orderPosition: i + 1, tableNumber: 0 }));
});

const stewardNominationResultSlots = computed(() => {
  if (selectedJudgeId.value == null) return [];
  const jid = selectedJudgeId.value;
  return protocolSlotsForSelectedJudge.value.map((slot) => ({
    ...slot,
    ev: findStewardEvaluation(Number(slot.cat.id), jid, 'nomination'),
  }));
});

const nominationGroupReadyForResults = computed(() => {
  if (selectedJudgeId.value == null) return false;
  const slots = protocolSlotsForSelectedJudge.value;
  if (slots.length === 0) return false;
  const jid = selectedJudgeId.value;
  return slots.every((slot) => {
    const ev = findStewardEvaluation(Number(slot.cat.id), jid, 'nomination');
    return typeof ev?.grade === 'string' && ev.grade.trim().length > 0;
  });
});

const stewardRing1ResultSlots = computed(() => {
  if (stewardPhase.value !== 'ring' || selectedJudgeId.value == null) return [];
  const jid = selectedJudgeId.value;
  return protocolSlotsForSelectedJudge.value.map((slot) => ({
    ...slot,
    ev: findStewardEvaluation(Number(slot.cat.id), jid, 'ring1'),
  }));
});

const stewardRing2ResultSlots = computed(() => {
  if (!selectedJudgeRing2Confirmed.value || selectedJudgeId.value == null) return [];
  const jid = selectedJudgeId.value;
  return protocolSlotsForSelectedJudge.value.map((slot) => ({
    ...slot,
    ev: findStewardEvaluation(Number(slot.cat.id), jid, 'ring2'),
  }));
});

const stewardProtocolRound = computed((): StewardJudgingRound => {
  if (stewardPhase.value === 'nomination') return 'nomination';
  return currentRound.value === 'ring2' ? 'ring2' : 'ring1';
});

const nominationProtocolRows = computed((): ProtocolRow[] => {
  if (selectedJudgeId.value == null) return [];
  const round = stewardProtocolRound.value;
  const rows = stewardOrdersVisibleForJudge();
  const out: ProtocolRow[] = [];
  for (const o of rows) {
    const cat = catsById.value.get(o.catId);
    if (!cat) continue;
    const cs = protocolCallForRound(o as JudgingOrderLike, round) ?? 'waiting';
    out.push({
      orderId: o.id,
      tableNumber: o.tableNumber,
      orderPosition: o.orderPosition,
      cat,
      callStatus: cs,
    });
  }
  return out;
});

const ring2ProtocolNotCompletedCount = computed(() => {
  if (currentRound.value !== 'ring2') return 0;
  return nominationProtocolRows.value.filter((r) => r.callStatus !== 'completed').length;
});

/** Rad pre nomináciu: buď celá súťaž (bez judge protokolu), alebo mačky vybraného rozhodcu. */
const nominationQueueRows = computed((): ProtocolRow[] => {
  if (stewardPhase.value !== 'nomination') return [];
  if (judgingOrders.value.length === 0) {
    return [...nomCats.value]
      .sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber, undefined, { numeric: true }))
      .map((cat, i) => ({
        orderId: null,
        tableNumber: 0,
        orderPosition: i + 1,
        cat,
        callStatus: cat.status,
      }));
  }
  if (myJudges.value.length === 0) return [];
  return nominationProtocolRows.value;
});

const nominationNotCompletedCount = computed(
  () => nominationQueueRows.value.filter((r) => r.callStatus !== 'completed').length,
);

const nominationStewardNeedsJudge = computed(
  () =>
    stewardPhase.value === 'nomination' && judgingOrders.value.length > 0 && myJudges.value.length === 0,
);

const nominationQueueEmpty = computed(
  () =>
    stewardPhase.value === 'nomination' &&
    judgingOrders.value.length > 0 &&
    myJudges.value.length > 0 &&
    nominationQueueRows.value.length === 0,
);

const nominationProtocolEmpty = computed(
  () => stewardPhase.value === 'ring' && myJudges.value.length > 0 && nominationProtocolRows.value.length === 0,
);

const selectedJudgeName = computed(() => {
  const j = myJudges.value.find((x) => judgeIdsEqual(x.id, selectedJudgeId.value));
  return j?.name ?? '';
});

function isWaiting(s: CatStatus): boolean {
  return s === 'waiting';
}

function isActiveCalled(s: CatStatus): boolean {
  return s === 'called' || s === 'judging';
}

function isDone(s: CatStatus): boolean {
  return s === 'completed';
}

function protocolRowKey(row: ProtocolRow): string {
  if (row.orderId != null) return `ord-${row.orderId}`;
  return `cat-${row.cat.id}-${row.orderPosition}`;
}

function stewardOrderFromApi(raw: Record<string, unknown>): JudgingOrderRow {
  const s = parseJudgingOrderApiRowStrict(raw);
  return {
    id: s.id,
    judgeId: s.judgeId,
    catId: s.catId,
    orderPosition: s.orderPosition,
    tableNumber: s.tableNumber,
    protocolGroup: s.protocolGroup ?? null,
    protocolCallStatus: (s.protocolCallStatus ?? 'waiting') as CatStatus,
    ring1ProtocolCallStatus: (s.ring1ProtocolCallStatus ?? 'waiting') as CatStatus,
    ring2ProtocolCallStatus: (s.ring2ProtocolCallStatus ?? 'waiting') as CatStatus,
  };
}
const nomWaitingList = computed(() => nominationProtocolRows.value.filter((r) => isWaiting(r.callStatus)));
const nomActiveList = computed(() => nominationProtocolRows.value.filter((r) => isActiveCalled(r.callStatus)));
const nomDoneList = computed(() => nominationProtocolRows.value.filter((r) => isDone(r.callStatus)));

const nomWaitingCount = computed(() => nomWaitingList.value.length);
const nomCalledCount = computed(() => nomActiveList.value.length);
const nomDoneCount = computed(() => nomDoneList.value.length);

const ringWaitingCount = computed(() => nominationQueueRows.value.filter((r) => r.callStatus === 'waiting').length);
const ringCalledCount = computed(() => nominationQueueRows.value.filter((r) => r.callStatus === 'called').length);
const ringJudgingCount = computed(() => nominationQueueRows.value.filter((r) => r.callStatus === 'judging').length);
const ringCompletedCount = computed(() => nominationQueueRows.value.filter((r) => r.callStatus === 'completed').length);

const activeRingProtocolRows = computed(() => {
  return nominationQueueRows.value
    .filter((r) => r.callStatus !== 'completed')
    .sort((a, b) => {
      const order: Record<CatStatus, number> = { judging: 1, called: 2, waiting: 3, completed: 99 };
      return (order[a.callStatus] ?? 99) - (order[b.callStatus] ?? 99);
    });
});

const completedRingProtocolRows = computed(() =>
  nominationQueueRows.value.filter((r) => r.callStatus === 'completed'),
);

function ringStatusLabel(status: CatStatus): string {
  switch (status) {
    case 'waiting':
      return 'Čaká';
    case 'called':
      return 'Volaná';
    case 'judging':
      return 'Hodnotí sa';
    case 'completed':
      return 'Hotovo';
    default:
      return status;
  }
}

function ringBadgeColor(status: CatStatus): string {
  switch (status) {
    case 'waiting':
      return 'grey';
    case 'called':
      return 'blue';
    case 'judging':
      return 'orange';
    default:
      return 'grey';
  }
}

function ringBadgeIcon(status: CatStatus): string {
  switch (status) {
    case 'waiting':
      return 'schedule';
    case 'called':
      return 'phone_in_talk';
    case 'judging':
      return 'play_arrow';
    default:
      return 'schedule';
  }
}

function ringCardClass(status: CatStatus): string {
  switch (status) {
    case 'waiting':
      return 'ring-card-waiting';
    case 'called':
      return 'ring-card-called';
    case 'judging':
      return 'ring-card-judging';
    default:
      return '';
  }
}

const VALID_CAT_STATUSES: readonly CatStatus[] = ['waiting', 'called', 'judging', 'completed'];

function parseCatStatus(raw: unknown): CatStatus {
  if (typeof raw === 'string' && (VALID_CAT_STATUSES as readonly string[]).includes(raw)) {
    return raw as CatStatus;
  }
  return 'waiting';
}

function asStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return fallback;
}

function normalizeCat(raw: Record<string, unknown>): Cat {
  const ex = raw.exhibitor;
  const cat: Cat = {
    id: asStr(raw.id),
    registrationNumber: asStr(raw.registrationNumber),
    name: asStr(raw.name),
    breed: asStr(raw.breed),
    group: asStr(raw.group),
    sex: asStr(raw.sex),
    age: asStr(raw.age),
    exhibitorId: raw.exhibitorId != null ? asStr(raw.exhibitorId) : '',
    status: parseCatStatus(raw.status),
  };
  if (
    ex &&
    typeof ex === 'object' &&
    ex !== null &&
    'name' in ex &&
    typeof (ex as { name: unknown }).name === 'string'
  ) {
    cat.exhibitor = { name: (ex as { name: string }).name };
  }
  return cat;
}

async function patchCatStatus(catId: string, status: CatStatus) {
  if (!competitionId.value) return;
  await api.put(`/competitions/${competitionId.value}/cats/${catId}`, { status });
}

/** Stevard: pri judge protokole mení riadok protokolu; inak globálny cats.status. */
async function patchQueueCallStatus(row: ProtocolRow, status: CatStatus) {
  if (!competitionId.value) return;
  if (row.orderId != null) {
    await api.put(
      `/competitions/${competitionId.value}/judging-orders/${row.orderId}/call-status`,
      { protocolCallStatus: status },
    );
    const o = judgingOrders.value.find((x) => x.id === row.orderId);
    if (o) setOrderProtocolLocal(o as JudgingOrderLike, stewardProtocolRound.value, status);
  } else {
    await patchCatStatus(row.cat.id, status);
    const c = nomCats.value.find((x) => x.id === row.cat.id);
    if (c) c.status = status;
  }
}

async function nomCall(row: ProtocolRow) {
  if (!isWaiting(row.callStatus)) return;
  try {
    await patchQueueCallStatus(row, 'called');
  } catch (e) {
    console.error(e);
  }
}

async function nomDone(row: ProtocolRow) {
  if (!isActiveCalled(row.callStatus)) return;
  try {
    await patchQueueCallStatus(row, 'completed');
  } catch (e) {
    console.error(e);
  }
}

async function nomReset(row: ProtocolRow) {
  try {
    await patchQueueCallStatus(row, 'waiting');
  } catch (e) {
    console.error(e);
  }
}

async function nomMarkAllDone() {
  for (const row of nomActiveList.value) {
    await nomDone(row);
  }
}

async function nomMarkAllCompletedForJudge() {
  for (const row of nominationQueueRows.value) {
    if (row.callStatus === 'completed') continue;
    try {
      await patchQueueCallStatus(row, 'completed');
    } catch (e) {
      console.error(e);
    }
  }
}

async function ring2MarkAllCompletedForJudge() {
  for (const row of nominationProtocolRows.value) {
    if (row.callStatus === 'completed') continue;
    try {
      await patchQueueCallStatus(row, 'completed');
    } catch (e) {
      console.error(e);
    }
  }
}

/** Jedno stlačenie: ukončiť judging → called→judging → waiting→called */
async function ringCallNext() {
  const queue = nominationQueueRows.value;
  const judging = queue.find((r) => r.callStatus === 'judging');
  if (judging) await patchQueueCallStatus(judging, 'completed');
  const called = queue.find((r) => r.callStatus === 'called');
  if (called) await patchQueueCallStatus(called, 'judging');
  const waiting = queue.find((r) => r.callStatus === 'waiting');
  if (waiting) await patchQueueCallStatus(waiting, 'called');
}

function ringCallCat(row: ProtocolRow) {
  if (row.callStatus === 'waiting') void patchQueueCallStatus(row, 'called');
}

function ringStartJudging(row: ProtocolRow) {
  if (row.callStatus === 'called') void patchQueueCallStatus(row, 'judging');
}

function ringCompleteJudging(row: ProtocolRow) {
  if (row.callStatus === 'judging') void patchQueueCallStatus(row, 'completed');
}

function ringResetFromCompleted(row: ProtocolRow) {
  if (row.callStatus === 'completed') void patchQueueCallStatus(row, 'waiting');
}

async function loadContext(opts: { silent?: boolean } = {}) {
  if (!competitionId.value) return;
  const silent = opts.silent === true;
  if (!silent) pageLoading.value = true;
  try {
    const { data: comp } = await api.get<{ currentRound: string | null }>(
      `/competitions/${competitionId.value}`,
    );
    const round = comp.currentRound ?? null;
    currentRound.value = round;

    if (round === 'nomination') {
      const [jRes, oRes, cRes, eRes] = await Promise.all([
        api.get<JudgeRow[]>(`/competitions/${competitionId.value}/judges`),
        api.get<unknown[]>(`/competitions/${competitionId.value}/judging-orders`),
        api.get<unknown[]>(`/competitions/${competitionId.value}/cats`),
        api.get<StewardEvalApiRow[]>(`/competitions/${competitionId.value}/evaluations`),
      ]);
      allJudges.value = jRes.data ?? [];
      judgingOrders.value = (oRes.data ?? []).map((raw) =>
        stewardOrderFromApi(raw as Record<string, unknown>),
      );
      nomCats.value = (cRes.data ?? []).map((raw) => normalizeCat(raw as Record<string, unknown>));
      stewardEvaluations.value = (eRes.data ?? []).map(apiRowToStewardEvaluation);
    } else if (round === 'ring1' || round === 'ring2') {
      const [jRes, oRes, cRes, eRes] = await Promise.all([
        api.get<JudgeRow[]>(`/competitions/${competitionId.value}/judges`),
        api.get<unknown[]>(`/competitions/${competitionId.value}/judging-orders`),
        api.get<unknown[]>(`/competitions/${competitionId.value}/cats`),
        api.get<StewardEvalApiRow[]>(`/competitions/${competitionId.value}/evaluations`),
      ]);
      allJudges.value = jRes.data ?? [];
      judgingOrders.value = (oRes.data ?? []).map((raw) =>
        stewardOrderFromApi(raw as Record<string, unknown>),
      );
      nomCats.value = (cRes.data ?? []).map((raw) => normalizeCat(raw as Record<string, unknown>));
      stewardEvaluations.value = (eRes.data ?? []).map(apiRowToStewardEvaluation);
    } else {
      allJudges.value = [];
      judgingOrders.value = [];
      nomCats.value = [];
      stewardEvaluations.value = [];
    }
  } catch (err) {
    console.error('Stevard load failed:', err);
  } finally {
    if (!silent) pageLoading.value = false;
  }
}

watch(competitionId, () => {
  void loadContext();
});

watch(
  () => route.query.asJudgeId,
  () => {
    void loadContext({ silent: true });
  },
);

onMounted(() => {
  void loadContext();
});
</script>

<style scoped>
.protocol-group-toggle :deep(.q-btn-group) {
  flex-wrap: wrap;
}

.protocol-group-toggle :deep(.q-btn) {
  flex: 1 1 140px;
  min-width: 140px;
}

.page-wrapper {
  max-width: 960px;
  margin: 0 auto;
}

.status-summary-card {
  min-height: 100px;
}

.status-card-section {
  padding: 1rem 1.25rem;
}

.status-label-text {
  font-size: 0.75rem;
  color: #0a0a0a;
}

.status-number-large {
  font-size: 1.75rem;
  font-weight: 500;
  color: #0a0a0a;
}

.call-next-btn {
  border-radius: 0.5rem;
  background: #030213;
  color: white;
  padding: 0.5rem 1rem;
}

.call-queue-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.call-queue-card-item {
  overflow: hidden;
}

.call-queue-card-content {
  padding: 1rem 1.25rem;
}

.ring-card-waiting {
  background: #fff;
  border: 1px solid #e5e7eb;
}

.ring-card-called {
  background: #eff6ff;
  border: 1px solid #2b7fff;
}

.ring-card-judging {
  background: #fefce8;
  border: 1px solid #f0b100;
}

.ring-card-completed {
  background: #f0fdf4;
  border: 1px solid #00c950;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
  font-size: 0.75rem;
}

.cat-name {
  font-size: 1.05rem;
  font-weight: 500;
  color: #0a0a0a;
}

.action-btn {
  border-radius: 0.25rem;
}

.action-btn-filled {
  background: #0a0a0a !important;
  color: white !important;
}

.action-btn-outlined {
  border: 1px solid rgba(0, 0, 0, 0.2) !important;
}

.reset-link {
  font-size: 0.875rem;
  color: #666;
  cursor: pointer;
}

.reset-link:hover {
  text-decoration: underline;
  color: #0a0a0a;
}

.section-separator {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}

.separator-line {
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.separator-text {
  font-size: 0.875rem;
  color: #666;
  white-space: nowrap;
}
</style>
