<template>
  <q-page>
    <div class="row justify-center q-pa-lg">
      <div class="col-12 col-md-10 col-lg-8">
        <div class="row items-center q-mb-lg">
          <q-icon name="manage_accounts" size="32px" color="primary" class="q-mr-sm" />
          <div class="text-h5 text-weight-bold">Správa používateľov</div>
          <q-space />
          <q-btn
            unelevated
            color="primary"
            icon="add"
            label="Nový používateľ"
            @click="openDialog(null)"
          />
        </div>

        <q-card class="shadow-1">
          <q-table
            :rows="users"
            :columns="columns"
            row-key="id"
            :loading="loading"
            flat
            :pagination="{ rowsPerPage: 20 }"
          >
            <template v-slot:body-cell-role="props">
              <q-td :props="props">
                <q-badge
                  :color="getRoleColor(props.row.role)"
                  text-color="white"
                >
                  {{ getRoleName(props.row.role) }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn flat round dense icon="edit" color="primary" @click="openDialog(props.row)" />
                <q-btn
                  v-if="
                    props.row.role !== 'superadmin' &&
                    Number(props.row.id) !== Number(authStore.user?.id ?? 0)
                  "
                  flat
                  round
                  dense
                  icon="delete"
                  color="negative"
                  @click="confirmDeleteUser(props.row)"
                />
              </q-td>
            </template>
          </q-table>
        </q-card>

        <!-- User dialog -->
        <q-dialog v-model="showDialog">
          <q-card style="min-width: 400px">
            <q-card-section>
              <div class="text-h6">
                {{ editingUser ? 'Upraviť používateľa' : 'Nový používateľ' }}
              </div>
            </q-card-section>

            <q-card-section>
              <q-form @submit="saveUser" class="q-gutter-md">
                <q-input
                  v-model="form.fullName"
                  label="Meno a priezvisko"
                  outlined
                  dense
                  :rules="[val => !!val || 'Povinné']"
                />
                <q-input
                  v-model="form.email"
                  label="Email"
                  type="email"
                  outlined
                  dense
                />
                <q-input
                  v-model="form.phone"
                  label="Telefón"
                  outlined
                  dense
                />
                <q-input
                  v-model="form.password"
                  :label="editingUser ? 'Nové heslo' : 'Heslo'"
                  type="password"
                  outlined
                  dense
                  :rules="editingUser ? [] : [val => !!val || 'Povinné']"
                />
                <q-select
                  v-if="authStore.isSuperadmin"
                  v-model="form.role"
                  label="Globálna rola"
                  :options="roleOptionsSuperadmin"
                  outlined
                  dense
                  emit-value
                  map-options
                />
                <q-select
                  v-else-if="authStore.isAdmin"
                  v-model="form.role"
                  label="Globálna rola"
                  :options="roleOptionsAdmin"
                  outlined
                  dense
                  emit-value
                  map-options
                />

                <div v-if="formError" class="text-negative text-body2">{{ formError }}</div>

                <div class="row justify-end q-gutter-sm q-mt-sm">
                  <q-btn flat label="Zrušiť" v-close-popup />
                  <q-btn type="submit" color="primary" :label="editingUser ? 'Uložiť' : 'Vytvoriť'" :loading="saving" />
                </div>
              </q-form>
            </q-card-section>
          </q-card>
        </q-dialog>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar, type QTableColumn } from 'quasar';
import axios from 'axios';
import { api } from 'src/boot/axios';
import { useAuthStore } from 'src/stores/auth';

function formatApiError(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return 'Chyba pri ukladaní';
  }
  const data = err.response?.data as
    | { message?: string; errors?: Array<{ message: string; field?: string }> }
    | undefined;
  if (data?.message) {
    return data.message;
  }
  if (data?.errors?.length) {
    return data.errors.map((e) => e.message).join(' ');
  }
  return 'Chyba pri ukladaní';
}

const $q = useQuasar();
const authStore = useAuthStore();

interface UserRow {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
}

const users = ref<UserRow[]>([]);
const loading = ref(true);
const showDialog = ref(false);
const editingUser = ref<UserRow | null>(null);
const saving = ref(false);
const formError = ref('');

const form = ref({
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'user',
});

/** Pri vytváraní/úprave (len superadmin): globálny typ účtu. Súťažné roly sa prideľujú osobitne. */
const roleOptionsSuperadmin = [
  { label: 'Super admin', value: 'superadmin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Používateľ', value: 'user' },
  { label: 'Demo', value: 'demo' },
];

const roleOptionsAdmin = [
  { label: 'Používateľ', value: 'user' },
  { label: 'Demo', value: 'demo' },
];

const roleMap: Record<string, string> = {
  superadmin: 'Super admin',
  admin: 'Admin',
  user: 'Používateľ',
  demo: 'Demo',
};

const getRoleName = (role: string) => roleMap[role] || role;

const getRoleColor = (role: string) => {
  switch (role) {
    case 'superadmin': return 'deep-purple';
    case 'admin': return 'primary';
    case 'user': return 'teal';
    case 'demo': return 'amber-9';
    default: return 'grey';
  }
};

const columns: QTableColumn[] = [
  { name: 'fullName', label: 'Meno', field: 'fullName', align: 'left', sortable: true },
  { name: 'email', label: 'Email', field: 'email', align: 'left' },
  { name: 'phone', label: 'Telefón', field: 'phone', align: 'left' },
  { name: 'role', label: 'Rola', field: 'role', align: 'center' },
  { name: 'actions', label: 'Akcie', field: 'id', align: 'center' },
];

async function fetchUsers() {
  loading.value = true;
  try {
    const { data } = await api.get('/users');
    users.value = data;
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    if (code !== 'MUST_CHANGE_PASSWORD') {
      $q.notify({ type: 'negative', message: 'Chyba pri načítaní používateľov', position: 'top' });
    }
  } finally {
    loading.value = false;
  }
}

function openDialog(user: UserRow | null) {
  editingUser.value = user;
  formError.value = '';
  if (user) {
    form.value = {
      fullName: user.fullName,
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role,
    };
  } else {
    form.value = { fullName: '', email: '', phone: '', password: '', role: 'user' };
  }
  showDialog.value = true;
}

async function saveUser() {
  saving.value = true;
  formError.value = '';
  try {
    const emailTrim = form.value.email.trim() || null;
    const phoneTrim = form.value.phone.trim() || null;

    if (editingUser.value) {
      if (form.value.password && form.value.password.length < 6) {
        formError.value = 'Nové heslo musí mať aspoň 6 znakov';
        return;
      }
    } else {
      if (!form.value.password) {
        formError.value = 'Heslo je povinné pre nového používateľa';
        return;
      }
      if (form.value.password.length < 6) {
        formError.value = 'Heslo musí mať aspoň 6 znakov';
        return;
      }
      if (!emailTrim && !phoneTrim) {
        formError.value = 'Vyplňte aspoň e-mail alebo telefón (prihlasovacie meno).';
        return;
      }
    }

    const payload: Record<string, unknown> = {
      fullName: form.value.fullName.trim(),
      email: emailTrim,
      phone: phoneTrim,
    };

    if (authStore.isSuperadmin) {
      payload.role = form.value.role;
    } else if (authStore.isAdmin) {
      payload.role = form.value.role;
    }

    if (form.value.password) {
      payload.password = form.value.password;
    }

    if (editingUser.value) {
      await api.put(`/users/${editingUser.value.id}`, payload);
    } else {
      payload.password = form.value.password;
      await api.post('/users', payload);
    }

    showDialog.value = false;
    await fetchUsers();
    $q.notify({ type: 'positive', message: 'Uložené', position: 'top' });
  } catch (err: unknown) {
    formError.value = formatApiError(err);
  } finally {
    saving.value = false;
  }
}

function confirmDeleteUser(user: UserRow) {
  $q.dialog({
    title: 'Vymazať používateľa',
    message: `Naozaj chcete natrvalo odstrániť „${user.fullName}“? Túto akciu nie je možné vrátiť späť.`,
    persistent: true,
    ok: {
      label: 'Vymazať',
      color: 'negative',
    },
    cancel: {
      label: 'Zrušiť',
      flat: true,
    },
  }).onOk(() => {
    void (async () => {
      const id = Number(user.id);
      try {
        await api.delete(`/users/${id}`);
        await fetchUsers();
        $q.notify({ type: 'positive', message: 'Používateľ bol odstránený', position: 'top' });
      } catch (err: unknown) {
        $q.notify({
          type: 'negative',
          message: formatApiError(err),
          position: 'top',
        });
      }
    })();
  });
}

onMounted(() => void fetchUsers());
</script>
