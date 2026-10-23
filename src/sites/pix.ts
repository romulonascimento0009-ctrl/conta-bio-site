/**
 * "Pix copia e cola" estático (BR Code, padrão EMV do Banco Central), sem valor: quem paga
 * digita o valor no app do banco. O mesmo texto vira o QR code.
 */

/** Campo EMV: id + tamanho com 2 dígitos + valor. */
const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(2, "0")}${value}`;

/** Nome e cidade no BR Code: maiúsculas, sem acentos, só o que os bancos aceitam. */
function plain(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max);
}

/**
 * Chave como o Pix espera: CPF/CNPJ só com dígitos, celular como +55DDNNNNNNNNN; e-mail e
 * chave aleatória como vieram.
 */
export function normalizePixKey(key: string): string {
  const k = key.trim();
  if (/^\+[\d\s().-]+$/.test(k)) return "+" + k.replace(/\D/g, "");
  if (/^[\d\s().\-/]+$/.test(k)) return k.replace(/\D/g, "");
  return k;
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixPayload(p: { key: string; name: string; city: string }): string {
  const body =
    field("00", "01") +
    field("26", field("00", "br.gov.bcb.pix") + field("01", normalizePixKey(p.key))) +
    field("52", "0000") +
    field("53", "986") +
    field("58", "BR") +
    field("59", plain(p.name, 25) || "RECEBEDOR") +
    field("60", plain(p.city, 15) || "BRASIL") +
    field("62", field("05", "***")) +
    "6304";
  return body + crc16(body);
}
