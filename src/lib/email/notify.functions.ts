import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KIND = z.enum(["created", "canceled", "reminder"]);
const Schema = z.object({
  appointmentId: z.string().uuid(),
  kind: KIND,
});

// Public server function: triggers appointment-related emails.
// Safe surface: only sends the template matching the appointment's own recipient
// email (fetched server-side). No external control over recipient.
export const notifyAppointmentEvent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Schema.parse(input))
  .handler(async ({ data }) => {
    const notify = await import("./notify.server");
    switch (data.kind) {
      case "created":
        return notify.notifyAppointmentCreated(data.appointmentId);
      case "canceled":
        return notify.notifyAppointmentCanceled(data.appointmentId);
      case "reminder":
        return notify.notifyAppointmentReminder(data.appointmentId);
    }
  });
