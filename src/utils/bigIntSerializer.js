export const bigIntSerializer = {
  serialize: (state) => {
    return JSON.stringify(state, (key, value) =>
      typeof value === 'bigint'
        ? value.toString() + 'n'
        : value
    );
  },
  deserialize: (state) => {
    return JSON.parse(state, (key, value) => {
      if (typeof value === 'string' && /^\d+n$/.test(value)) {
        return BigInt(value.slice(0, -1));
      }
      return value;
    });
  },
  replacer: (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  },
  reviver: (key, value) => {
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  },
  safeStringify: (obj, replacer = null, space = 2) => {
    let cache = [];
    const ret = JSON.stringify(
      obj,
      (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.includes(value)) return '[Circular]';
          cache.push(value);
        }
        if (typeof value === 'bigint') {
          return value.toString() + 'n';
        }
        return value;
      },
      space
    );
    cache = null;
    return ret;
  },
  convertBigIntsToStrings: (obj) => {
    const seen = new WeakSet();
    const convert = (item) => {
      if (typeof item !== 'object' || item === null) {
        return typeof item === 'bigint' ? item.toString() + 'n' : item;
      }
      if (seen.has(item)) {
        return '[Circular]';
      }
      seen.add(item);
      if (Array.isArray(item)) {
        return item.map(convert);
      }
      return Object.fromEntries(
        Object.entries(item).map(([key, value]) => [key, convert(value)])
      );
    };
    return convert(obj);
  }
};
