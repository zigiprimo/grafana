const possibleNonceChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const possibleNonceCharsLength = possibleNonceChars.length;

export function getNonce(): string {
  let text = '';

  for (let i = 0; i < 32; i++) {
    text += possibleNonceChars.charAt(Math.floor(Math.random() * possibleNonceCharsLength));
  }

  return text;
}
