import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const CompetitionsController = () => import('#controllers/competitions_controller')
const CatsController = () => import('#controllers/cats_controller')
const JudgesController = () => import('#controllers/judges_controller')
const ExhibitorsController = () => import('#controllers/exhibitors_controller')
const EvaluationsController = () => import('#controllers/evaluations_controller')
const CompetitionRolesController = () => import('#controllers/competition_roles_controller')
const ImportExportController = () => import('#controllers/import_export_controller')
const LiveController = () => import('#controllers/live_controller')
const JudgingOrdersController = () => import('#controllers/judging_orders_controller')
const SystemController = () => import('#controllers/system_controller')
const PushNotificationsController = () => import('#controllers/push_notifications_controller')
const CompetitionTaxonomyController = () => import('#controllers/competition_taxonomy_controller')
const BisAwardsController = () => import('#controllers/bis_awards_controller')
const GroupsController = () => import('#controllers/groups_controller')

router.get('/', () => ({ status: 'ok' }))
router.get('/health', [SystemController, 'health'])

router
  .group(() => {
    // --- Public ---
    router.post('auth/login', [AuthController, 'login'])
    router.get('competitions/public', [CompetitionsController, 'publicIndex'])

    // --- Live endpoints (public for TV monitors) ---
    router.get('live/:id/scoring', [LiveController, 'scoring'])
    router.get('live/:id/results', [LiveController, 'results'])
    router.get('live/:id/full-results', [LiveController, 'fullResults'])
    router.get('live/:id/monitoring-ring', [LiveController, 'monitoringRing'])

    // --- Authenticated ---
    router
      .group(() => {
        router.post('auth/logout', [AuthController, 'logout'])
        router.get('auth/me', [AuthController, 'me'])
        router.put('auth/change-password', [AuthController, 'changePassword'])
        router.get('notifications/push/public-key', [PushNotificationsController, 'publicKey'])
        router.post('notifications/push/subscriptions', [PushNotificationsController, 'subscribe'])
        router.delete('notifications/push/subscriptions', [
          PushNotificationsController,
          'unsubscribe',
        ])

        // --- Global user management (admin/superadmin) ---
        router.get('users', [UsersController, 'index'])
        router.post('users', [UsersController, 'store'])
        router.put('users/:id', [UsersController, 'update'])
        router.delete('users/:id', [UsersController, 'destroy'])

        // --- Competitions ---
        router.get('competitions', [CompetitionsController, 'index'])
        router.post('competitions', [CompetitionsController, 'store'])
        router.get('competitions/:id', [CompetitionsController, 'show'])
        router.put('competitions/:id', [CompetitionsController, 'update'])
        router.delete('competitions/:id', [CompetitionsController, 'destroy'])
        router.get('competitions/:id/dashboard', [CompetitionsController, 'dashboard'])
        router.post('competitions/:id/nomination/complete', [
          CompetitionsController,
          'completeNomination',
        ])
        router.post('competitions/:id/ring1/complete', [
          CompetitionsController,
          'completeRing1Ranking',
        ])
        router.post('competitions/:id/ring2/complete', [
          CompetitionsController,
          'completeRing2Ranking',
        ])

        // --- Competition roles ---
        router.get('competitions/:id/roles', [CompetitionRolesController, 'index'])
        router.post('competitions/:id/roles', [CompetitionRolesController, 'store'])
        router.delete('competitions/:id/roles/:roleId', [CompetitionRolesController, 'destroy'])

        // --- Breed groups (competition.groups — Admin „Skupiny“) ---
        router.get('competitions/:competition_id/groups', [GroupsController, 'index'])
        router.post('competitions/:competition_id/groups', [GroupsController, 'store'])
        router.put('competitions/:competition_id/groups/:id', [GroupsController, 'update'])
        router.delete('competitions/:competition_id/groups/:id', [GroupsController, 'destroy'])

        // --- Cats (nested under competition) ---
        router.get('competitions/:competition_id/cats', [CatsController, 'index'])
        router.post('competitions/:competition_id/cats', [CatsController, 'store'])
        router.get('competitions/:competition_id/cats/:id', [CatsController, 'show'])
        router.put('competitions/:competition_id/cats/:id', [CatsController, 'update'])
        router.delete('competitions/:competition_id/cats/:id', [CatsController, 'destroy'])

        // --- Judges ---
        router.get('competitions/:competition_id/judges', [JudgesController, 'index'])
        router.post('competitions/:competition_id/judges', [JudgesController, 'store'])
        router.put('competitions/:competition_id/judges/:id', [JudgesController, 'update'])
        router.patch('competitions/:competition_id/judges/:id/steward', [
          JudgesController,
          'patchSteward',
        ])
        router.patch('competitions/:competition_id/judges/:id/unlock-nomination', [
          JudgesController,
          'unlockNomination',
        ])
        router.patch('competitions/:competition_id/judges/:id/unlock-ring1', [
          JudgesController,
          'unlockRing1',
        ])
        router.patch('competitions/:competition_id/judges/:id/unlock-ring2', [
          JudgesController,
          'unlockRing2',
        ])
        router.delete('competitions/:competition_id/judges/:id', [JudgesController, 'destroy'])

        // --- Competition taxonomy (WCF) — grades / titles / classes ---
        router.get('competitions/:competition_id/grades', [
          CompetitionTaxonomyController,
          'listGrades',
        ])
        router.post('competitions/:competition_id/grades', [
          CompetitionTaxonomyController,
          'storeGrade',
        ])
        router.put('competitions/:competition_id/grades/:id', [
          CompetitionTaxonomyController,
          'updateGrade',
        ])
        router.delete('competitions/:competition_id/grades/:id', [
          CompetitionTaxonomyController,
          'destroyGrade',
        ])

        router.get('competitions/:competition_id/titles', [
          CompetitionTaxonomyController,
          'listTitles',
        ])
        router.post('competitions/:competition_id/titles', [
          CompetitionTaxonomyController,
          'storeTitle',
        ])
        router.put('competitions/:competition_id/titles/:id', [
          CompetitionTaxonomyController,
          'updateTitle',
        ])
        router.delete('competitions/:competition_id/titles/:id', [
          CompetitionTaxonomyController,
          'destroyTitle',
        ])

        router.get('competitions/:competition_id/classes', [
          CompetitionTaxonomyController,
          'listClasses',
        ])
        router.post('competitions/:competition_id/classes', [
          CompetitionTaxonomyController,
          'storeClass',
        ])
        router.put('competitions/:competition_id/classes/:id', [
          CompetitionTaxonomyController,
          'updateClass',
        ])
        router.delete('competitions/:competition_id/classes/:id', [
          CompetitionTaxonomyController,
          'destroyClass',
        ])

        // --- BIS Awards (BIV / NomBIS / BIS) ---
        router.get('competitions/:competition_id/bis-awards', [BisAwardsController, 'index'])
        router.post('competitions/:competition_id/bis-awards', [BisAwardsController, 'store'])
        router.put('competitions/:competition_id/bis-awards/:id', [BisAwardsController, 'update'])
        router.delete('competitions/:competition_id/bis-awards/:id', [
          BisAwardsController,
          'destroy',
        ])
        router.post('competitions/:competition_id/bis-awards/recompute-biv', [
          BisAwardsController,
          'recomputeBiv',
        ])
        router.post('competitions/:competition_id/bis-awards/sync-nombis', [
          BisAwardsController,
          'syncNomBis',
        ])

        // --- Exhibitors ---
        router.get('competitions/:competition_id/exhibitors', [ExhibitorsController, 'index'])
        router.post('competitions/:competition_id/exhibitors', [ExhibitorsController, 'store'])
        router.get('competitions/:competition_id/exhibitors/:id', [ExhibitorsController, 'show'])
        router.put('competitions/:competition_id/exhibitors/:id', [ExhibitorsController, 'update'])
        router.delete('competitions/:competition_id/exhibitors/:id', [
          ExhibitorsController,
          'destroy',
        ])

        // --- Evaluations ---
        router.get('competitions/:competition_id/evaluations', [EvaluationsController, 'index'])
        router.post('competitions/:competition_id/evaluations', [EvaluationsController, 'store'])
        router.put('competitions/:competition_id/evaluations/:id', [
          EvaluationsController,
          'update',
        ])
        router.delete('competitions/:competition_id/evaluations/:id', [
          EvaluationsController,
          'destroy',
        ])
        router.post('competitions/:competition_id/evaluations/clear-round', [
          EvaluationsController,
          'clearRound',
        ])

        // --- Judging Orders (protocol) ---
        router.get('competitions/:competition_id/judging-orders', [
          JudgingOrdersController,
          'index',
        ])
        router.post('competitions/:competition_id/judging-orders', [
          JudgingOrdersController,
          'store',
        ])
        router.put('competitions/:competition_id/judging-orders/:id', [
          JudgingOrdersController,
          'update',
        ])
        router.delete('competitions/:competition_id/judging-orders/:id', [
          JudgingOrdersController,
          'destroy',
        ])
        router.put('competitions/:competition_id/judging-orders/:id/call-status', [
          JudgingOrdersController,
          'updateCallStatus',
        ])

        // --- Import / Export ---
        router.get('competitions/:id/export', [ImportExportController, 'export'])
        router.post('competitions/:id/import', [ImportExportController, 'import'])

        // --- Ops / Preflight ---
        router.get('competitions/:id/preflight', [SystemController, 'preflight'])
      })
      .use([middleware.auth(), middleware.mustChangePassword()])
  })
  .prefix('/api/v1')
