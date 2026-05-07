<template>
  <q-card>
    <q-card-section>
      <div class="section-title q-mb-lg">Výsledky súťaže</div>

      <div v-for="group in groupsWithResults" :key="group.name" class="q-mb-md">
        <q-card flat bordered class="result-group-card">
          <q-card-section>
            <div class="row items-center q-gutter-sm q-mb-md">
              <q-icon name="emoji_events" size="20px" color="amber-8" />
              <div class="text-weight-medium">{{ group.name }}</div>
            </div>

            <div v-for="result in group.results" :key="result.catName" class="result-row">
              <div>
                <div class="result-cat-name">{{ result.catName }}</div>
                <div class="result-cat-breed">{{ result.breed }}</div>
              </div>
              <div class="row items-center q-gutter-sm">
                <div class="detail-label">{{ result.judge }}</div>
                <q-badge color="dark" text-color="white" class="result-badge">
                  {{ result.grade }}
                </q-badge>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div v-if="groupsWithResults.length === 0" class="text-center text-grey-6 q-pa-xl">
        Zatiaľ žiadne výsledky
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAdminCompetition } from 'src/composables/useAdminCompetition';

const ctx = useAdminCompetition();

const groupsWithResults = computed(() => {
  const evalsByCat = new Map<number, Array<Record<string, unknown>>>();
  for (const e of ctx.evaluations.value) {
    const catId = e.catId as number;
    if (!evalsByCat.has(catId)) evalsByCat.set(catId, []);
    evalsByCat.get(catId)!.push(e);
  }

  return ctx.groupOptions.value
    .map((name) => {
      const groupCats = ctx.cats.value.filter((c) => c.group === name);
      const results = groupCats
        .filter((c) => evalsByCat.has(c.id))
        .map((c) => {
          const catEvals = evalsByCat.get(c.id) || [];
          const latest = catEvals[catEvals.length - 1];
          return {
            catName: c.name,
            breed: c.breed,
            judge: (latest?.judge as { name: string })?.name || '-',
            grade: (latest?.grade as string) || '-',
          };
        });
      if (results.length === 0) return null;
      return { name, results };
    })
    .filter(Boolean) as {
    name: string;
    results: { catName: string; breed: string; judge: string; grade: string }[];
  }[];
});
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
}
.section-subtitle {
  font-size: 12px;
  color: #666;
}
.detail-label {
  font-size: 13px;
  color: #555;
}
.result-group-card {
  border-radius: 8px;
}
.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}
.result-row:last-child {
  border-bottom: none;
}
.result-cat-name {
  font-weight: 500;
  font-size: 13px;
}
.result-cat-breed {
  font-size: 11px;
  color: #999;
}
.result-badge {
  font-weight: 500;
  font-size: 11px;
  padding: 2px 8px;
}
</style>
