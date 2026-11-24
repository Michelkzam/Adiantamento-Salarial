export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatBRLCompact(value: number): string {
  return value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function numberToWords(value: number): string {
  if (value === 0) return 'zero reais';

  const units = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco',
    'seis', 'sete', 'oito', 'nove',
  ];
  const teens = [
    'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze',
    'dezesseis', 'dezessete', 'dezoito', 'dezenove',
  ];
  const tens = [
    '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta',
    'sessenta', 'setenta', 'oitenta', 'noventa',
  ];
  const hundreds = [
    '', 'cento', 'duzentos', 'trezentos', 'quatrocentos',
    'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos',
  ];

  const convertGroup = (n: number): string => {
    if (n === 0) return '';
    if (n === 100) return 'cem';

    let result = '';
    const h = Math.floor(n / 100);
    const r = n % 100;

    if (h > 0) result += hundreds[h];
    if (r === 0) return result;

    if (result) result += ' e ';

    if (r < 10) {
      result += units[r];
    } else if (r < 20) {
      result += teens[r - 10];
    } else {
      const t = Math.floor(r / 10);
      const u = r % 10;
      result += tens[t];
      if (u > 0) result += ` e ${units[u]}`;
    }

    return result;
  };

  const integerPart = Math.floor(value);
  const cents = Math.round((value - integerPart) * 100);

  if (integerPart === 0) {
    return `${cents} centavo${cents !== 1 ? 's' : ''}`;
  }

  let result = '';

  const millions = Math.floor(integerPart / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const remainder = integerPart % 1_000;

  if (millions > 0) {
    if (millions === 1) {
      result += 'um milhão';
    } else {
      result += `${convertGroup(millions)} milhões`;
    }
  }

  if (thousands > 0) {
    if (result) result += ', ';
    if (thousands === 1) {
      result += 'mil';
    } else {
      result += `${convertGroup(thousands)} mil`;
    }
  }

  if (remainder > 0) {
    if (result) result += ' e ';
    result += convertGroup(remainder);
  }

  result += integerPart === 1 ? ' real' : ' reais';

  if (cents > 0) {
    result += ` e ${convertGroup(cents)} centavo${cents !== 1 ? 's' : ''}`;
  }

  return result;
}
