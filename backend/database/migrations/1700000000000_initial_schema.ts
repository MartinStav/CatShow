import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Iniciálna schéma CatShow aplikácie.
 * Squashnutá history vývoja do jediného čistého stavu pre nasadenie / odovzdanie.
 * Všetky následné zmeny pridávaj ako samostatné migrácie nad túto.
 */
export default class InitialSchema extends BaseSchema {
  async up() {
    this.schema.createTable('users', (table) => {
      table.increments('id').notNullable()
      table.string('full_name').notNullable()
      table.string('email', 254).nullable().unique()
      table.string('phone', 50).nullable().unique()
      table.string('password').notNullable()
      table.text('role').notNullable().defaultTo('user')
      table
        .integer('created_by_id')
        .unsigned()
        .nullable()
        .references('users.id')
        .onDelete('SET NULL')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.boolean('must_change_password').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('superadmin', 'admin', 'user', 'demo'))`
    )

    this.schema.createTable('auth_access_tokens', (table) => {
      table.increments('id')
      table
        .integer('tokenable_id')
        .unsigned()
        .notNullable()
        .references('users.id')
        .onDelete('CASCADE')
      table.string('type').notNullable()
      table.string('name').nullable()
      table.string('hash').notNullable()
      table.text('abilities').notNullable()
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
      table.timestamp('last_used_at').nullable()
      table.timestamp('expires_at').nullable()
    })

    this.schema.createTable('competitions', (table) => {
      table.increments('id').notNullable()
      table.string('name').notNullable()
      table.date('date').notNullable()
      table.text('description').nullable()
      table.string('location').nullable()
      table.text('status').notNullable().defaultTo('scheduled')
      table.boolean('published').notNullable().defaultTo(false)
      table.text('current_round').nullable()
      table.specificType('rounds_enabled', 'text[]').defaultTo('{}')
      table.integer('accumulated_active_ms').unsigned().notNullable().defaultTo(0)
      table.timestamp('active_segment_started_at', { useTz: true }).nullable()
      table
        .integer('created_by_id')
        .unsigned()
        .nullable()
        .references('users.id')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `ALTER TABLE competitions ADD CONSTRAINT competitions_status_check CHECK (status IN ('active', 'paused', 'finished', 'scheduled'))`
    )
    this.schema.raw(
      `ALTER TABLE competitions ADD CONSTRAINT competitions_current_round_check CHECK (current_round IS NULL OR current_round IN ('nomination', 'ring1', 'ring2', 'bis'))`
    )

    this.schema.createTable('groups', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('competition_classes', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('code').notNullable()
      table.string('name').notNullable()
      table.text('description').nullable()
      table.integer('min_age_months').nullable()
      table.integer('max_age_months').nullable()
      table.boolean('is_neuter').notNullable().defaultTo(false)
      table.boolean('is_kitten_or_junior').notNullable().defaultTo(false)
      table.boolean('is_separate_bis_category').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'code'])
    })

    this.schema.createTable('competition_grades', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('code').notNullable()
      table.string('name').nullable()
      table.boolean('counts_as_accepted').notNullable().defaultTo(false)
      table.boolean('eligible_for_nom_bis').notNullable().defaultTo(false)
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'code'])
    })

    this.schema.createTable('competition_titles', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('code').notNullable()
      table.string('name').nullable()
      table.text('description').nullable()
      table.specificType('class_codes', 'text[]').notNullable().defaultTo('{}')
      table.integer('sort_order').notNullable().defaultTo(0)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'code'])
    })

    this.schema.createTable('exhibitors', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.string('email').nullable()
      table.string('phone').nullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('judges', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('name').notNullable()
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table
        .integer('steward_user_id')
        .unsigned()
        .nullable()
        .references('users.id')
        .onDelete('SET NULL')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })

    this.schema.createTable('cats', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.string('registration_number').notNullable()
      table.string('name').notNullable()
      table.string('breed').notNullable()
      table.string('group').notNullable()
      table.specificType('groups', 'text[]').notNullable().defaultTo('{}')
      table.string('class').nullable()
      table.string('sex').nullable()
      table.string('age').nullable()
      table
        .integer('exhibitor_id')
        .unsigned()
        .nullable()
        .references('exhibitors.id')
        .onDelete('SET NULL')
      table.text('status').notNullable().defaultTo('waiting')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `ALTER TABLE cats ADD CONSTRAINT cats_status_check CHECK (status IN ('waiting', 'called', 'judging', 'completed'))`
    )

    this.schema.createTable('competition_roles', (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.text('role').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['user_id', 'competition_id', 'role'])
    })
    this.schema.raw(
      `ALTER TABLE competition_roles ADD CONSTRAINT competition_roles_role_check CHECK (role IN ('steward', 'judge', 'exhibitor', 'administrator', 'telka'))`
    )

    this.schema.createTable('evaluations', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('cat_id').unsigned().notNullable().references('cats.id').onDelete('CASCADE')
      table.integer('judge_id').unsigned().nullable().references('judges.id').onDelete('SET NULL')
      table.text('round').notNullable()
      table.string('grade').nullable()
      table.specificType('titles', 'text[]').defaultTo('{}')
      table.integer('position').nullable()
      table.boolean('accepted').nullable()
      table.boolean('nom_bis').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `ALTER TABLE evaluations ADD CONSTRAINT evaluations_round_check CHECK (round IN ('nomination', 'ring1', 'ring2'))`
    )
    this.schema.raw(
      `CREATE UNIQUE INDEX evaluations_unique_round_judge_cat_idx ON evaluations (competition_id, cat_id, round, COALESCE(judge_id, -1))`
    )

    this.schema.createTable('judging_orders', (table) => {
      table.increments('id')
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('judge_id').unsigned().notNullable().references('judges.id').onDelete('CASCADE')
      table.integer('cat_id').unsigned().notNullable().references('cats.id').onDelete('CASCADE')
      table.integer('order_position').notNullable().defaultTo(0)
      table.integer('table_number').notNullable().defaultTo(1)
      table.string('protocol_group', 120).nullable()
      table.string('protocol_call_status', 20).notNullable().defaultTo('waiting')
      table.string('ring1_protocol_call_status', 20).notNullable().defaultTo('waiting')
      table.string('ring2_protocol_call_status', 20).notNullable().defaultTo('waiting')
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
    this.schema.raw(
      `CREATE UNIQUE INDEX judging_orders_unique_competition_judge_cat_idx ON judging_orders (competition_id, judge_id, cat_id)`
    )

    this.schema.createTable('bis_awards', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('cat_id').unsigned().notNullable().references('cats.id').onDelete('CASCADE')
      table.integer('judge_id').unsigned().nullable().references('judges.id').onDelete('SET NULL')
      table.string('level').notNullable()
      table.string('category').nullable()
      table.string('sex').nullable()
      table.string('class_code').nullable()
      table.integer('position').notNullable().defaultTo(1)
      table.text('notes').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(
        ['competition_id', 'level', 'category', 'sex', 'class_code', 'position'],
        'bis_awards_lookup_idx'
      )
    })
    this.schema.raw(
      `ALTER TABLE bis_awards ADD CONSTRAINT bis_awards_level_check CHECK (level IN ('BIV', 'NOM_BIS', 'BIS'))`
    )

    this.schema.createTable('nomination_phase_completions', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('judge_id').unsigned().notNullable().references('judges.id').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'judge_id'])
    })

    this.schema.createTable('ring1_ranking_completions', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('judge_id').unsigned().notNullable().references('judges.id').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'judge_id'])
    })

    this.schema.createTable('ring2_ranking_completions', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .notNullable()
        .references('competitions.id')
        .onDelete('CASCADE')
      table.integer('judge_id').unsigned().notNullable().references('judges.id').onDelete('CASCADE')
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.unique(['competition_id', 'judge_id'])
    })

    this.schema.createTable('event_audit_logs', (table) => {
      table.increments('id').notNullable()
      table
        .integer('competition_id')
        .unsigned()
        .nullable()
        .references('competitions.id')
        .onDelete('SET NULL')
      table.integer('user_id').unsigned().nullable().references('users.id').onDelete('SET NULL')
      table.string('action').notNullable()
      table.string('entity_type').nullable()
      table.integer('entity_id').unsigned().nullable()
      table.jsonb('payload').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
      table.index(['competition_id', 'created_at'])
      table.index(['user_id', 'created_at'])
      table.index(['action'])
    })

    this.schema.createTable('push_subscriptions', (table) => {
      table.increments('id').notNullable()
      table.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE')
      table.text('endpoint').notNullable().unique()
      table.text('p256dh').notNullable()
      table.text('auth').notNullable()
      table.text('user_agent').nullable()
      table.timestamp('last_seen_at').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTableIfExists('push_subscriptions')
    this.schema.dropTableIfExists('event_audit_logs')
    this.schema.dropTableIfExists('ring2_ranking_completions')
    this.schema.dropTableIfExists('ring1_ranking_completions')
    this.schema.dropTableIfExists('nomination_phase_completions')
    this.schema.dropTableIfExists('bis_awards')
    this.schema.dropTableIfExists('judging_orders')
    this.schema.dropTableIfExists('evaluations')
    this.schema.dropTableIfExists('competition_roles')
    this.schema.dropTableIfExists('cats')
    this.schema.dropTableIfExists('judges')
    this.schema.dropTableIfExists('exhibitors')
    this.schema.dropTableIfExists('competition_titles')
    this.schema.dropTableIfExists('competition_grades')
    this.schema.dropTableIfExists('competition_classes')
    this.schema.dropTableIfExists('groups')
    this.schema.dropTableIfExists('competitions')
    this.schema.dropTableIfExists('auth_access_tokens')
    this.schema.dropTableIfExists('users')
  }
}
