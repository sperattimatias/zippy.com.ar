export type ClassValue = string | number | null | false | undefined | ClassDictionary | ClassArray;
type ClassDictionary = Record<string, boolean | undefined | null>;
type ClassArray = ClassValue[];

function toClassName(value: ClassValue): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return `${value}`;
  if (Array.isArray(value)) return value.map(toClassName).filter(Boolean).join(' ');
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name)
    .join(' ');
}

export function cn(...inputs: ClassValue[]) {
  return inputs.map(toClassName).filter(Boolean).join(' ').trim();
}
