/**
 * Sentinel used by Radix `<Select>` items to represent the "no
 * preference" / "no value" option. Radix Select forbids
 * `<SelectItem value="">` so any nullable Select field needs a
 * non-empty token that the form layer translates back to `""` (or
 * `undefined`) on submit.
 *
 * Centralised here so a future Radix upgrade or library change only
 * requires editing one location. Consumed by `contact-edit-dialog`,
 * `promote-inquiry-dialog`, `inquiry-create-dialog`, and
 * `deal-create-dialog`.
 */
export const NONE_SENTINEL = "__none__"
