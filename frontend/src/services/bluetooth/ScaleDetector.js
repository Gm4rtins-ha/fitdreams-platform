// frontend/src/services/bluetooth/ScaleDetector.js

/**
 * ScaleDetector.js
 * Sistema de detecção e parsing de balanças inteligentes
 * Versão: 2.0 - Precisão de 2 decimais
 */
/**
 * Protocolo Original Line SL0382D
 * MAC: 34:5C:F3:XX:XX:XX (família)
 * Usa advertising packets (não requer conexão)
 * PRECISÃO: 2 casas decimais
 */
export const OriginalLineProtocol = {
  name: 'Original Line Scale',
  serviceUUID: null,
  characteristicUUID: null,
  usesAdvertising: true,
  canHandle: (device) => {
    const mac = device.id?.toLowerCase() || '';
    // ===== CRITÉRIO OBRIGATÓRIO: MAC deve começar com 34:5C:F3 =====
    const isOriginalLineFamily = mac.startsWith('34:5c:f3');
    if (!isOriginalLineFamily) {
      return false;
    }
    // ===== É DA FAMÍLIA 34:5C:F3 - ACEITA! =====
    console.log('\n🎯 ===== ORIGINAL LINE DETECTADA =====');
    console.log('  ✅ Nome:', device.name || 'N/A');
    console.log('  ✅ MAC:', device.id);
    console.log('  ✅ Família: 34:5C:F3');
    // Identificar qual balança
    if (mac.includes('b7:fa:b2')) {
      console.log('  🏷️  Balança #1 (Principal)');
    } else if (mac.includes('b3:38:f3')) {
      console.log('  🏷️  Balança #2 (Secundária)');
    } else {
      console.log('  🏷️  Outra Original Line');
    }
    console.log('=====================================\n');
    return true;
  },
  parseAdvertisingData: (manufacturerData) => {
    try {
      if (!manufacturerData || !manufacturerData.data) {
        console.log('❌ ManufacturerData ou data ausente.');
        return null;
      }
      const bytes = manufacturerData.data;
      const companyId = manufacturerData.companyId;

      // Log dos bytes para depuração
      // console.log('DEBUG: Bytes brutos do ManufacturerData:', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));

      if (bytes.length < 2) { // Mínimo de 2 bytes para o peso
        console.log(`❌ ManufacturerData muito curto (${bytes.length} bytes). Esperado pelo menos 2.`);
        return null;
      }

      let preciseWeight = null;
      let validMethod = null;
      let validPos = null;

      // Peso está nos bytes 0 e 1, big-endian
      const bigEndianWeight = ((bytes[0] << 8) | bytes[1]) / 100;
      if (bigEndianWeight >= 30 && bigEndianWeight <= 200) {
        preciseWeight = parseFloat(bigEndianWeight.toFixed(2));
        validMethod = 'Big-endian';
        validPos = 0;
      }

      if (!preciseWeight) {
        console.log('⚠️ Peso não detectado nos bytes 0 e 1.');
        return null;
      }

      console.log(`⚖️  Peso detectado: ${preciseWeight.toFixed(2)} kg (${validMethod} @ pos ${validPos})`);

      // CONCLUSÃO: Os dados de bioimpedância (gordura, massa muscular, etc.)
      // NÃO estão presentes no ManufacturerData. A balança Original Line SL0382D
      // parece enviar apenas o peso neste pacote de anúncio.
      // As outras métricas precisarão ser calculadas no aplicativo.

      return {
        weight: preciseWeight,
        protocol: 'Original Line',
        timestamp: new Date().toISOString(),
        method: validMethod,
        position: validPos,
        // Não há evidências de outros dados de bioimpedância ou impedância bruta nos bytes.
        // Retornamos apenas o peso.
      };
    } catch (error) {
      console.error('❌ Erro ao parsear Manufacturer Data:', error);
      return null;
    }
  },
  parseData: (base64Data) => {
    console.log('ℹ️ Esta balança usa advertising, não conexão direta');
    return null;
  }
};

// Lista de protocolos (ordem de prioridade na detecção)
const PROTOCOLS = [
  OriginalLineProtocol,  // ✅ ÚNICO HABILITADO
];

export class ScaleDetector {
  /**
   * Detecta o protocolo adequado para o dispositivo
   * @param {Object} device - Dispositivo BLE
   * @returns {Object|null} Protocolo detectado ou null
   */
  static detectProtocol(device) {
    for (const protocol of PROTOCOLS) {
      if (protocol.canHandle(device)) {
        console.log('✅ Protocolo detectado:', protocol.name);
        return protocol;
      }
    }
    console.log('⚠️ Nenhum protocolo compatível encontrado');
    return null;
  }

  /**
   * Retorna todos os protocolos disponíveis
   * @returns {Array} Lista de protocolos
   */
  static getAllProtocols() {
    return PROTOCOLS;
  }

  /**
   * Busca protocolo por nome
   * @param {String} name - Nome do protocolo
   * @returns {Object|null} Protocolo encontrado ou null
   */
  static getProtocolByName(name) {
    return PROTOCOLS.find(p => p.name === name) || null;
  }
}
