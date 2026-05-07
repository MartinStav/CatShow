import User from '#models/user'
import { createUserValidator, updateUserValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class UsersController {
  async index({ auth, response }: HttpContext) {
    const currentUser = auth.getUserOrFail()

    let query = User.query().orderBy('fullName', 'asc')
    if (currentUser.role === 'admin') {
      query = query.whereIn('role', ['user', 'demo'])
    }

    const users = await query
    return response.ok(
      users.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
      }))
    )
  }

  async store({ auth, request, response }: HttpContext) {
    const currentUser = auth.getUserOrFail()
    const data = await request.validateUsing(createUserValidator)

    if (!data.email && !data.phone) {
      return response.badRequest({
        message: 'Vyplňte aspoň e-mail alebo telefón (slúži na prihlásenie).',
      })
    }

    if (currentUser.role === 'admin' && (data.role === 'admin' || data.role === 'superadmin')) {
      return response.forbidden({
        message: 'Účty s rolou admin alebo superadmin môže vytvoriť iba superadmin.',
      })
    }

    let newRole: User['role']
    if (currentUser.role === 'superadmin') {
      newRole = data.role ?? 'user'
    } else {
      newRole = data.role === 'demo' ? 'demo' : 'user'
    }

    let user: User
    try {
      user = await User.create({
        fullName: data.fullName,
        email: data.email || null,
        phone: data.phone || null,
        password: data.password,
        role: newRole,
        createdById: currentUser.id,
        mustChangePassword: true,
      })
    } catch (error) {
      const code = (error as { code?: string })?.code
      if (code === '23505') {
        return response.conflict({
          message: 'Používateľ s týmto e-mailom alebo telefónnym číslom už existuje.',
        })
      }
      throw error
    }

    return response.created({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const currentUser = auth.getUserOrFail()
    const user = await User.findOrFail(params.id)

    if (
      currentUser.role === 'admin' &&
      user.id !== currentUser.id &&
      (user.role === 'superadmin' || user.role === 'admin')
    ) {
      return response.forbidden({
        message: 'Účty admin a superadmin môže upravovať iba superadmin.',
      })
    }

    const data = await request.validateUsing(updateUserValidator)

    if (currentUser.role === 'admin' && (data.role === 'admin' || data.role === 'superadmin')) {
      return response.forbidden({
        message: 'Účty s rolou admin alebo superadmin môže meniť iba superadmin.',
      })
    }

    user.merge({
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.password !== undefined && { password: data.password }),
      ...(data.role !== undefined && currentUser.role === 'superadmin' && { role: data.role }),
      ...(data.role !== undefined &&
        currentUser.role === 'admin' &&
        (data.role === 'user' || data.role === 'demo') && { role: data.role }),
    })
    if (data.password !== undefined) {
      user.mustChangePassword = user.id === currentUser.id ? false : true
    }
    await user.save()

    return response.ok({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    })
  }

  async destroy({ auth, params, response }: HttpContext) {
    const currentUser = auth.getUserOrFail()
    const user = await User.findOrFail(params.id)

    if (user.id === currentUser.id) {
      return response.forbidden({ message: 'Nemôžete vymazať vlastný účet.' })
    }

    if (currentUser.role === 'admin' && (user.role === 'superadmin' || user.role === 'admin')) {
      return response.forbidden({
        message: 'Účty admin a superadmin môže mazať iba superadmin.',
      })
    }

    if (user.role === 'superadmin') {
      return response.forbidden({
        message: 'Superadmin účet nie je možné vymazať.',
      })
    }

    try {
      try {
        await User.accessTokens.deleteAll(user)
      } catch {
        // pokračovať – pri DELETE používateľa sa tokeny môžu zmazať aj cez CASCADE
      }
      await user.delete()
      return response.noContent()
    } catch (error) {
      const code = (error as { code?: string })?.code
      if (code === '23503') {
        return response.conflict({
          message:
            'Používateľa nie je možné vymazať – je ešte viazaný v databáze (napr. súvisiace záznamy).',
        })
      }
      throw error
    }
  }
}
