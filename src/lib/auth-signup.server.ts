// Helpers server-only para validação e normalização do signup com trial
export function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "");
}

export function normalizePhone(raw: string): string {
  const d = onlyDigits(raw);
  if (d.length < 10 || d.length > 13) return "";
  return d;
}

export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(cpf[i], 10) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
}
