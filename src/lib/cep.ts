export interface ViaCepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge?: string;
  gia?: string;
  ddd?: string;
  siafi?: string;
  erro?: boolean;
}

export interface CepLookupResult {
  success: boolean;
  rua?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  message?: string;
  status: 'idle' | 'loading' | 'success' | 'error';
}

/**
 * Clean mask and format CEP to 00000-000
 */
export function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

/**
 * Query ViaCEP API for 8-digit CEP
 */
export async function searchViaCep(cep: string): Promise<CepLookupResult> {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    return {
      success: false,
      status: 'error',
      message: 'CEP deve conter 8 dígitos.'
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000); // 7 seconds timeout

    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        status: 'error',
        message: 'Não foi possível consultar o CEP. Tente novamente.'
      };
    }

    const data: ViaCepData = await response.json();

    if (data.erro) {
      return {
        success: false,
        status: 'error',
        message: 'CEP não localizado.'
      };
    }

    return {
      success: true,
      status: 'success',
      rua: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      complemento: data.complemento || '',
      message: 'Endereço localizado com sucesso'
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'error',
      message: 'Não foi possível consultar o CEP. Tente novamente.'
    };
  }
}
