import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Sekundárne indexy na často filtrované FK stĺpce.
 * PG nevytvára implicitný index na FK; pri rastúcich tabuľkách je explicit index nutný.
 */
export default class AddPerformanceIndexes extends BaseSchema {
  async up() {
    this.schema.alterTable('cats', (table) => {
      table.index(['competition_id'], 'cats_competition_id_index')
      table.index(['exhibitor_id'], 'cats_exhibitor_id_index')
      table.index(['status'], 'cats_status_index')
    })

    this.schema.alterTable('evaluations', (table) => {
      table.index(['competition_id'], 'evaluations_competition_id_index')
      table.index(['cat_id'], 'evaluations_cat_id_index')
      table.index(['judge_id'], 'evaluations_judge_id_index')
    })

    this.schema.alterTable('judging_orders', (table) => {
      table.index(['judge_id'], 'judging_orders_judge_id_index')
      table.index(['cat_id'], 'judging_orders_cat_id_index')
    })

    this.schema.alterTable('bis_awards', (table) => {
      table.index(['cat_id'], 'bis_awards_cat_id_index')
      table.index(['judge_id'], 'bis_awards_judge_id_index')
    })

    this.schema.alterTable('judges', (table) => {
      table.index(['competition_id'], 'judges_competition_id_index')
      table.index(['user_id'], 'judges_user_id_index')
      table.index(['steward_user_id'], 'judges_steward_user_id_index')
    })

    this.schema.alterTable('exhibitors', (table) => {
      table.index(['competition_id'], 'exhibitors_competition_id_index')
      table.index(['user_id'], 'exhibitors_user_id_index')
    })

    this.schema.alterTable('competition_roles', (table) => {
      table.index(['competition_id'], 'competition_roles_competition_id_index')
    })

    this.schema.alterTable('groups', (table) => {
      table.index(['competition_id'], 'groups_competition_id_index')
    })

    this.schema.alterTable('auth_access_tokens', (table) => {
      table.index(['tokenable_id'], 'auth_access_tokens_tokenable_id_index')
    })

    this.schema.alterTable('push_subscriptions', (table) => {
      table.index(['user_id'], 'push_subscriptions_user_id_index')
    })
  }

  async down() {
    this.schema.alterTable('push_subscriptions', (table) => {
      table.dropIndex([], 'push_subscriptions_user_id_index')
    })
    this.schema.alterTable('auth_access_tokens', (table) => {
      table.dropIndex([], 'auth_access_tokens_tokenable_id_index')
    })
    this.schema.alterTable('groups', (table) => {
      table.dropIndex([], 'groups_competition_id_index')
    })
    this.schema.alterTable('competition_roles', (table) => {
      table.dropIndex([], 'competition_roles_competition_id_index')
    })
    this.schema.alterTable('exhibitors', (table) => {
      table.dropIndex([], 'exhibitors_competition_id_index')
      table.dropIndex([], 'exhibitors_user_id_index')
    })
    this.schema.alterTable('judges', (table) => {
      table.dropIndex([], 'judges_competition_id_index')
      table.dropIndex([], 'judges_user_id_index')
      table.dropIndex([], 'judges_steward_user_id_index')
    })
    this.schema.alterTable('bis_awards', (table) => {
      table.dropIndex([], 'bis_awards_cat_id_index')
      table.dropIndex([], 'bis_awards_judge_id_index')
    })
    this.schema.alterTable('judging_orders', (table) => {
      table.dropIndex([], 'judging_orders_judge_id_index')
      table.dropIndex([], 'judging_orders_cat_id_index')
    })
    this.schema.alterTable('evaluations', (table) => {
      table.dropIndex([], 'evaluations_competition_id_index')
      table.dropIndex([], 'evaluations_cat_id_index')
      table.dropIndex([], 'evaluations_judge_id_index')
    })
    this.schema.alterTable('cats', (table) => {
      table.dropIndex([], 'cats_competition_id_index')
      table.dropIndex([], 'cats_exhibitor_id_index')
      table.dropIndex([], 'cats_status_index')
    })
  }
}
