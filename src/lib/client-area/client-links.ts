/**
 * Helpers de integração externa da Área do Cliente:
 * Google Calendar, Apple Calendar (.ics), mapas, WhatsApp e comprovante.
 * Puro (sem dependência de React) para permitir reuso e testes.
 */

export type ClientAppointmentLike = {
  id: string;
  scheduled_at: string;
  duration_minutes?: number | null;
  service_name?: string | null;
  professional_name?: string | null;
  company_name?: string | null;
  company_endereco?: unknown;
  company_whatsapp?: string | null;
  company_telefone?: string | null;
  price?: number | string | null;
  pagamento_tipo?: string | null;
  status?: string | null;
};

/** Converte o endereço (jsonb livre) da barbearia em uma linha legível. */
export function formatEndereco(endereco: unknown): string {
  if (!endereco) return "";
  if (typeof endereco === "string") return endereco;
  if (typeof endereco !== "object") return "";
  const e = endereco as Record<string, unknown>;
  const parts = [
    [e["logradouro"] ?? e["rua"] ?? e["endereco"], e["numero"]].filter(Boolean).join(", "),
    e["complemento"],
    e["bairro"],
    [e["cidade"], e["estado"] ?? e["uf"]].filter(Boolean).join(" - "),
    e["cep"],
  ];
  return parts
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(" • ");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Formato UTC compacto exigido por iCalendar/Google (YYYYMMDDTHHMMSSZ). */
function toICalUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function appointmentRange(a: ClientAppointmentLike): { start: Date; end: Date } {
  const start = new Date(a.scheduled_at);
  const end = new Date(start.getTime() + (a.duration_minutes ?? 30) * 60_000);
  return { start, end };
}

export function appointmentTitle(a: ClientAppointmentLike): string {
  return `${a.service_name ?? "Atendimento"}${a.company_name ? ` — ${a.company_name}` : ""}`;
}

function appointmentDetails(a: ClientAppointmentLike): string {
  return [
    a.professional_name ? `Profissional: ${a.professional_name}` : "",
    a.pagamento_tipo === "clube" ? "Pagamento: benefício do Clube" : "",
    "Agendado pelo BarbeiroPro",
  ]
    .filter(Boolean)
    .join("\n");
}

export function googleCalendarUrl(a: ClientAppointmentLike): string {
  const { start, end } = appointmentRange(a);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: appointmentTitle(a),
    dates: `${toICalUTC(start)}/${toICalUTC(end)}`,
    details: appointmentDetails(a),
    location: formatEndereco(a.company_endereco) || (a.company_name ?? ""),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICal(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(a: ClientAppointmentLike): string {
  const { start, end } = appointmentRange(a);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarbeiroPro//Area do Cliente//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@barbeiropro.app`,
    `DTSTAMP:${toICalUTC(new Date())}`,
    `DTSTART:${toICalUTC(start)}`,
    `DTEND:${toICalUTC(end)}`,
    `SUMMARY:${escapeICal(appointmentTitle(a))}`,
    `DESCRIPTION:${escapeICal(appointmentDetails(a))}`,
    `LOCATION:${escapeICal(formatEndereco(a.company_endereco) || (a.company_name ?? ""))}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Lembrete do seu horário",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Dispara download de um arquivo texto no browser. */
export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadIcs(a: ClientAppointmentLike) {
  downloadTextFile(`agendamento-${a.id.slice(0, 8)}.ics`, buildIcs(a), "text/calendar");
}

export function mapsUrl(a: ClientAppointmentLike): string | null {
  const endereco = formatEndereco(a.company_endereco);
  const query = endereco || a.company_name;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function onlyDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function whatsappUrl(a: ClientAppointmentLike, message?: string): string | null {
  const raw = onlyDigits(a.company_whatsapp || a.company_telefone);
  if (raw.length < 10) return null;
  const phone = raw.length <= 11 ? `55${raw}` : raw;
  const text = message ?? `Olá! Falo sobre meu agendamento de ${a.service_name ?? "atendimento"}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Comprovante simples em texto — evita dependências de PDF no bundle. */
export function buildReceipt(a: ClientAppointmentLike, clientName: string): string {
  const { start } = appointmentRange(a);
  const valor =
    a.pagamento_tipo === "clube"
      ? "Benefício do Clube (sem cobrança)"
      : a.price != null
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(a.price))
        : "—";
  return [
    "COMPROVANTE DE AGENDAMENTO",
    "BarbeiroPro",
    "----------------------------------------",
    `Código:        ${a.id}`,
    `Cliente:       ${clientName}`,
    `Barbearia:     ${a.company_name ?? "—"}`,
    `Endereço:      ${formatEndereco(a.company_endereco) || "—"}`,
    `Serviço:       ${a.service_name ?? "—"}`,
    `Profissional:  ${a.professional_name ?? "—"}`,
    `Data/hora:     ${start.toLocaleString("pt-BR")}`,
    `Origem:        ${a.pagamento_tipo === "clube" ? "Clube de Assinatura" : "Agendamento normal"}`,
    `Valor:         ${valor}`,
    `Status:        ${a.status ?? "—"}`,
    "----------------------------------------",
    `Emitido em ${new Date().toLocaleString("pt-BR")}`,
  ].join("\n");
}

export function downloadReceipt(a: ClientAppointmentLike, clientName: string) {
  downloadTextFile(`comprovante-${a.id.slice(0, 8)}.txt`, buildReceipt(a, clientName), "text/plain");
}
