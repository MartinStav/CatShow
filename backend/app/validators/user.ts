import vine from '@vinejs/vine'

/** Heslo: 8–64 znakov, aspoň jedno písmeno a jedno číslo. */
const STRONG_PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\d).{8,64}$/u

const passwordRule = vine.string().regex(STRONG_PASSWORD_REGEX)

export const loginValidator = vine.compile(
  vine.object({
    identifier: vine.string().trim(),
    password: vine.string(),
  })
)

export const createUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim(),
    email: vine.string().email().maxLength(254).nullable().optional(),
    phone: vine.string().maxLength(50).nullable().optional(),
    password: passwordRule.clone(),
    role: vine.enum(['superadmin', 'admin', 'user', 'demo']).optional(),
  })
)

export const updateUserValidator = vine.compile(
  vine.object({
    fullName: vine.string().trim().optional(),
    email: vine.string().email().maxLength(254).nullable().optional(),
    phone: vine.string().maxLength(50).nullable().optional(),
    password: passwordRule.clone().optional(),
    role: vine.enum(['superadmin', 'admin', 'user', 'demo']).optional(),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newPassword: passwordRule.clone(),
  })
)
