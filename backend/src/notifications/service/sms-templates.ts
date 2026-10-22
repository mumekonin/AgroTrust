import {
  NotificationEvent,
  NotificationLanguage,
  SECRET_EVENTS,
  type NotificationLanguage as Language,
} from '../schema/notification.schema.js';

export const MAX_SMS_ATTEMPTS = 5;
const BACKOFF_MS = [60_000, 300_000, 900_000, 3_600_000, 21_600_000];

const TEMPLATES: Record<NotificationEvent, Record<Language, string>> = {
  [NotificationEvent.ACCOUNT_VERIFIED]: {
    en: 'AgroTrust: your account is verified.',
    am: 'መለያዎ ተረጋግጧል።',
    om: 'Akkaawuntii keessan mirkanaa\'e.',
  },
  [NotificationEvent.ACTIVATION_CODE]: {
    en: 'AgroTrust code {{code}}. Expires {{expiry}}.',
    am: 'ኮድ {{code}} እስከ {{expiry}}።',
    om: 'Koodii {{code}}. Hanga {{expiry}}.',
  },
  [NotificationEvent.REQUEST_RECEIVED]: {
    en: 'Request {{requestNo}} received.',
    am: 'ጥያቄ {{requestNo}} ደርሷል።',
    om: 'Gaaffii {{requestNo}} gahe.',
  },
  [NotificationEvent.REQUEST_APPROVED]: {
    en: 'Request {{requestNo}} approved.',
    am: 'ጥያቄ {{requestNo}} ጸድቋል።',
    om: 'Gaaffii {{requestNo}} fudhatame.',
  },
  [NotificationEvent.REQUEST_REJECTED]: {
    en: 'Request {{requestNo}} rejected. {{reason}}',
    am: 'ጥያቄ {{requestNo}} ተቋርጧል።',
    om: 'Gaaffii {{requestNo}} hin fudhatamne.',
  },
  [NotificationEvent.REQUEST_ACCEPTED]: {
    en: 'Request {{requestNo}}: {{quantityKg}} kg accepted.',
    am: 'ጥያቄ {{requestNo}}፡ {{quantityKg}} ኪግ።',
    om: 'Gaaffii {{requestNo}}: kg {{quantityKg}}.',
  },
  [NotificationEvent.REQUEST_DECLINED]: {
    en: 'Request {{requestNo}} declined. {{reason}}',
    am: 'ጥያቄ {{requestNo}} አልተቀበለም።',
    om: 'Gaaffii {{requestNo}} dide.',
  },
  [NotificationEvent.REQUEST_WAITLISTED]: {
    en: 'Request {{requestNo}} is waitlisted.',
    am: 'ጥያቄ {{requestNo}} በተጠባባቂ ነው።',
    om: 'Gaaffii {{requestNo}} eegaa jira.',
  },
  [NotificationEvent.PAYMENT_REQUIRED]: {
    en: 'Pay {{amount}} by {{deadline}}. Ref {{reference}}.',
    am: 'ይክፈሉ {{amount}} እስከ {{deadline}}።',
    om: 'Kaffalaa {{amount}} hanga {{deadline}}.',
  },
  [NotificationEvent.PAYMENT_REMINDER]: {
    en: 'Payment {{amount}} is due {{deadline}}.',
    am: 'ክፍያ {{amount}} እስከ {{deadline}}።',
    om: 'Kaffaltii {{amount}} hanga {{deadline}}.',
  },
  [NotificationEvent.PAYMENT_CONFIRMED]: {
    en: 'Payment {{amount}} received.',
    am: 'ክፍያ {{amount}} ደርሷል።',
    om: 'Kaffaltii {{amount}} gahe.',
  },
  [NotificationEvent.REQUEST_EXPIRED_UNPAID]: {
    en: 'Request {{requestNo}} expired. Unpaid.',
    am: 'ጥያቄ {{requestNo}} ጊዜው አልፏል።',
    om: 'Gaaffii {{requestNo}} yeroon darbe.',
  },
  [NotificationEvent.SHIPMENT_DISPATCHED]: {
    en: 'On the way to {{center}}. ETA {{eta}}.',
    am: 'ወደ {{center}} በ{{eta}}።',
    om: 'Gara {{center}}. Yeroo {{eta}}.',
  },
  [NotificationEvent.GOODS_ARRIVED]: {
    en: 'Collect at {{center}} by {{deadline}}. Code {{code}}.',
    am: 'በ{{center}} እስከ {{deadline}}። ኮድ {{code}}።',
    om: '{{center}} hanga {{deadline}}. Koodii {{code}}.',
  },
  [NotificationEvent.PICKUP_REMINDER]: {
    en: 'Collect by {{deadline}}.',
    am: 'እስከ {{deadline}} ይውሰዱ።',
    om: 'Hanga {{deadline}} fudhadhaa.',
  },
  [NotificationEvent.PICKUP_COMPLETED]: {
    en: 'You collected {{quantityKg}} kg.',
    am: '{{quantityKg}} ኪግ ተረክበዋል።',
    om: 'Kg {{quantityKg}} fudhattan.',
  },
  [NotificationEvent.REQUEST_EXPIRED]: {
    en: 'Request {{requestNo}} expired.',
    am: 'ጥያቄ {{requestNo}} ጊዜው አልፏል።',
    om: 'Gaaffii {{requestNo}} yeroon darbe.',
  },
  [NotificationEvent.REQUEST_REFUNDED]: {
    en: 'Request {{requestNo}} will be refunded.',
    am: 'ጥያቄ {{requestNo}} ተመላሽ ይሆናል።',
    om: 'Gaaffii {{requestNo}} deebi\'a.',
  },
  [NotificationEvent.ASSISTED_REQUEST_OTP]: {
    en: 'AgroTrust code {{code}}.',
    am: 'ኮድ {{code}}።',
    om: 'Koodii {{code}}.',
  },
  [NotificationEvent.LOGIN_OTP]: {
    en: 'AgroTrust code {{code}}.',
    am: 'ኮድ {{code}}።',
    om: 'Koodii {{code}}.',
  },
  [NotificationEvent.PIN_RESET_OTP]: {
    en: 'AgroTrust code {{code}}.',
    am: 'ኮድ {{code}}።',
    om: 'Koodii {{code}}.',
  },
};

export function templateFor(event: NotificationEvent, language: Language): string {
  return TEMPLATES[event][language] ?? TEMPLATES[event][NotificationLanguage.EN];
}

export function renderTemplate(
  event: NotificationEvent,
  language: Language,
  params: Record<string, string>,
): string {
  return templateFor(event, language).replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return params[key] ?? '';
  });
}

export function redactSecrets(
  body: string,
  params: Record<string, string> | undefined,
  event: NotificationEvent,
): string {
  if (!SECRET_EVENTS.has(event)) return body;
  let redacted = body;
  for (const key of ['code', 'otp', 'pickupCode']) {
    const value = params?.[key];
    if (value && value.length >= 2) redacted = redacted.split(value).join('******');
  }
  return redacted;
}

export function nextRetryAt(attempts: number, now: Date): Date | null {
  if (attempts >= MAX_SMS_ATTEMPTS) return null;
  const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)] ?? BACKOFF_MS[0];
  return new Date(now.getTime() + delay);
}
