<template>
  <q-page class="login-page">
    <div class="login-container">
      <q-card class="login-card">
        <q-card-section class="text-center q-pa-lg">
          <div class="text-h5 q-mb-xs">Cat Show Judging System</div>
          <div class="text-body2 text-grey-7">Prihláste sa do svojho účtu</div>
        </q-card-section>

        <q-card-section class="q-px-lg q-pb-lg">
          <q-form @submit="onSubmit" class="q-gutter-md">
            <q-input
              v-model="identifier"
              label="Email alebo telefón"
              outlined
              :rules="[val => !!val || 'Povinné pole']"
              lazy-rules
            >
              <template v-slot:prepend>
                <q-icon name="person" />
              </template>
            </q-input>

            <q-input
              v-model="password"
              label="Heslo"
              :type="showPassword ? 'text' : 'password'"
              outlined
              :rules="[val => !!val || 'Heslo je povinné']"
              lazy-rules
            >
              <template v-slot:prepend>
                <q-icon name="lock" />
              </template>
              <template v-slot:append>
                <q-icon
                  :name="showPassword ? 'visibility' : 'visibility_off'"
                  class="cursor-pointer"
                  @click="showPassword = !showPassword"
                />
              </template>
            </q-input>

            <div v-if="errorMsg" class="text-negative text-body2 q-mt-sm">
              {{ errorMsg }}
            </div>

            <div class="row justify-center q-mt-md">
              <q-btn
                unelevated
                type="submit"
                color="primary"
                size="lg"
                class="full-width"
                label="Prihlásiť sa"
                :loading="loading"
              />
            </div>
          </q-form>
        </q-card-section>

        <q-separator />

        <q-card-section class="text-center q-pa-md">
          <q-btn
            flat
            no-caps
            label="Späť na hlavnú stránku"
            color="grey-7"
            icon="arrow_back"
            size="sm"
            @click="goToHome"
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth';

const $q = useQuasar();
const router = useRouter();
const authStore = useAuthStore();

const identifier = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const errorMsg = ref('');

const onSubmit = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const loggedUser = await authStore.login(identifier.value, password.value);
    $q.notify({
      type: 'positive',
      message: 'Prihlásenie úspešné!',
      position: 'top',
    });
    if (loggedUser.mustChangePassword) {
      $q.notify({
        type: 'warning',
        message: 'Pri prvom prihlásení je potrebné zmeniť heslo.',
        position: 'top',
      });
      void router.replace('/');
      return;
    }
    void router.push('/');
  } catch (err: unknown) {
    const msg =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      'Neplatné prihlasovacie údaje';
    errorMsg.value = msg;
  } finally {
    loading.value = false;
  }
};

const goToHome = () => {
  void router.push('/');
};
</script>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.login-container {
  width: 100%;
  max-width: 400px;
  padding: 1rem;
}

.login-card {
  width: 100%;
}

:deep(.q-field--outlined .q-field__control) {
  border-radius: 0.5rem;
}

:deep(.q-btn) {
  border-radius: 0.5rem;
}
</style>
