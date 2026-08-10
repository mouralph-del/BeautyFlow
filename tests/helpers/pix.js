export function parsePixFields(value) {
  const fields = new Map();
  let cursor = 0;
  while (cursor < value.length) {
    const id = value.slice(cursor, cursor + 2);
    const length = Number(value.slice(cursor + 2, cursor + 4));
    if (!/^\d{2}$/.test(id) || !Number.isInteger(length)) throw new Error("Payload Pix inválido");
    const start = cursor + 4;
    const end = start + length;
    if (end > value.length) throw new Error("Campo Pix incompleto");
    fields.set(id, value.slice(start, end));
    cursor = end;
  }
  return fields;
}

export function maskPixKey(value) {
  const visible = String(value).slice(-4);
  return `${"*".repeat(Math.max(8, String(value).length - 4))}${visible}`;
}
