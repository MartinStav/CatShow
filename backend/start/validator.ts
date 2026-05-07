/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { VineDate, SimpleMessagesProvider } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/** Slovenská chybová správa pre regex pravidlo na heslo. */
const PASSWORD_REQUIREMENTS_MESSAGE =
  'Heslo musí mať 8 až 64 znakov, obsahovať aspoň jedno písmeno a aspoň jedno číslo.'

vine.messagesProvider = new SimpleMessagesProvider({
  'password.regex': PASSWORD_REQUIREMENTS_MESSAGE,
  'newPassword.regex': PASSWORD_REQUIREMENTS_MESSAGE,
})
