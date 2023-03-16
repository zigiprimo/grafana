export type ValueType = string | boolean | null | undefined;
export type LogfmtValuesMap = Record<string, ValueType>;

export function logfmt(line: string): LogfmtValuesMap {
  const obj: LogfmtValuesMap = {};
  let key: keyof LogfmtValuesMap = '';
  let value: string | boolean | null | undefined = '';
  let inKey = false;
  let inValue = false;
  let inQuote = false;
  let hadQuote = false;

  if (line[line.length - 1] === '\n') {
    line = line.slice(0, line.length - 1);
  }

  for (let i = 0; i <= line.length; i++) {
    if ((line[i] === ' ' && !inQuote) || i === line.length) {
      if (inKey && key.length > 0) {
        obj[key] = true;
      } else if (inValue) {
        if (value === 'true') {
          value = true;
        } else if (value === 'false') {
          value = false;
        } else if (value === '' && !hadQuote) {
          value = null;
        }

        obj[key] = value;
        value = '';
      }

      if (i === line.length) {
        break;
      } else {
        inKey = false;
        inValue = false;
        inQuote = false;
        hadQuote = false;
      }
    }

    if (line[i] === '=' && !inQuote) {
      inKey = false;
      inValue = true;
    } else if (line[i] === '\\') {
      i++;
      value += line[i];
    } else if (line[i] === '"') {
      hadQuote = true;
      inQuote = !inQuote;
    } else if (line[i] !== ' ' && !inValue && !inKey) {
      inKey = true;
      key = line[i];
    } else if (inKey) {
      key += line[i];
    } else if (inValue) {
      value += line[i];
    }
  }

  return obj;
}
