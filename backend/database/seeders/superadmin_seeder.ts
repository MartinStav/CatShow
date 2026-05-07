import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

const SEED_PASSWORD = 'admin'

export default class extends BaseSeeder {
  async run() {
    const seedEmail = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase() || 'admin@catshow.sk'
    const forceReset = process.env.SEED_SUPERADMIN_FORCE_RESET === 'true'

    const existingByRole = await User.query().where('role', 'superadmin').first()
    const existingByEmail = await User.query().where('email', seedEmail).first()

    if (existingByEmail && forceReset) {
      existingByEmail.password = SEED_PASSWORD
      existingByEmail.role = 'superadmin'
      existingByEmail.isActive = true
      existingByEmail.mustChangePassword = true
      await existingByEmail.save()
      console.log(
        `[seed] Superadmin (${seedEmail}) – heslo: ${SEED_PASSWORD} (po prihlásení zmeňte heslo)`
      )
      return
    }

    if (existingByRole) return

    await User.create({
      fullName: 'Super Admin',
      email: seedEmail,
      phone: null,
      password: SEED_PASSWORD,
      role: 'superadmin',
      isActive: true,
      mustChangePassword: true,
    })
    console.log(
      `[seed] Superadmin (${seedEmail}) – predvolené heslo: ${SEED_PASSWORD} (po prihlásení zmeňte heslo)`
    )
  }
}
