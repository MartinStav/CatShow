import vine from '@vinejs/vine'

export const judgeBodyValidator = vine.compile(
  vine.object({
    userId: vine.number(),
    stewardUserId: vine.number().nullable().optional(),
  })
)

/** Úprava len stevarda u sudcu (bez posielania userId zo klienta). */
export const judgeStewardPatchValidator = vine.compile(
  vine.object({
    stewardUserId: vine.number().nullable(),
  })
)

export const exhibitorBodyValidator = vine.compile(
  vine.object({
    userId: vine.number(),
  })
)
