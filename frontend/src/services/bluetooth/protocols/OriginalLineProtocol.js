export const OriginalLineProtocol = {
  name: 'Original Line Scale',
  serviceUUID: null,
  characteristicUUID: null,
  usesAdvertising: true,

  canHandle: (device) => {
    const name = device.name?.toLowerCase() || '';
    const mac = device.id?.toLowerCase() || '';
    
    // ===== CRITÉRIO OBRIGATÓRIO: MAC deve começar com 34:5C:F3 =====
    const isOriginalLineFamily = mac.startsWith('34:5c:f3');
    
    // REJEITAR dispositivos que NÃO sejam da família Original Line
    if (!isOriginalLineFamily) {
      // Log apenas se tiver nome N/A (para debug)
      if (name === 'n/a') {
        console.log(`⚠️ Dispositivo N/A ignorado (MAC ${device.id} não é 34:5C:F3)`);
      }
      return false;
    }
    
    // Se chegou aqui, é da família 34:5C:F3
    console.log('\n🎯 ===== ORIGINAL LINE DETECTADA =====');
    console.log('  ✅ Nome:', device.name);
    console.log('  ✅ MAC:', device.id);
    console.log('  ✅ Família 34:5C:F3: SIM');
    
    // Identificar qual balança é
    if (mac.includes('b7:fa:b2')) {
      console.log('  🏷️ Balança: #1 (Principal - B7:FA:B2)');
    } else if (mac.includes('b3:38:f3')) {
      console.log('  🏷️ Balança: #2 (Secundária - B3:38:F3)');
    } else {
      console.log('  🏷️ Balança: Outra Original Line (34:5C:F3)');
    }
    
    // Verificar se tem dados válidos
    const hasValidData = device.manufacturerData && 
                         device.manufacturerData.data && 
                         device.manufacturerData.data.length >= 2;
    
    console.log('  ✅ Manufacturer Data:', hasValidData ? 'SIM' : 'NÃO');
    console.log('=====================================\n');
    
    // Aceitar apenas se for da família 34:5C:F3
    return true;
  },

  parseAdvertisingData: (manufacturerData) => {
    try {
      if (!manufacturerData || !manufacturerData.data) {
        console.log('⚠️ Sem manufacturer data');
        return null;
      }

      const bytes = manufacturerData.data;
      const companyId = manufacturerData.companyId;
      
      console.log('\n📊 ===== PARSING WEIGHT DATA =====');
      console.log('🏢 Company ID: 0x' + companyId.toString(16).padStart(4, '0').toUpperCase());
      console.log('📦 Data Length:', bytes.length, 'bytes');
      console.log('📦 Bytes (HEX):', 
        Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ')
      );
      console.log('📦 Bytes (DEC):', Array.from(bytes).join(' '));

      if (bytes.length < 2) {
        console.warn('⚠️ Dados insuficientes (precisa de pelo menos 2 bytes)');
        console.log('==================================\n');
        return null;
      }

      // ===== TESTAR MÚLTIPLOS FORMATOS =====
      console.log('\n🔬 TESTANDO POSIÇÕES (range válido: 30-200 kg):');
      
      let validWeight = null;
      let validMethod = null;
      let validPosition = null;
      
      // Testar cada posição possível
      for (let i = 0; i <= bytes.length - 2; i++) {
        // Big-endian (formato correto descoberto)
        const bigEndian = ((bytes[i] << 8) | bytes[i + 1]) / 100;
        
        // Little-endian (padrão BLE)
        const littleEndian = ((bytes[i + 1] << 8) | bytes[i]) / 100;
        
        const b0 = bytes[i].toString(16).padStart(2, '0').toUpperCase();
        const b1 = bytes[i + 1].toString(16).padStart(2, '0').toUpperCase();
        
        console.log(`  [${i},${i+1}] 0x${b0} 0x${b1}:`);
        console.log(`    Big-endian:    ${bigEndian.toFixed(2)} kg ${bigEndian >= 30 && bigEndian <= 200 ? '✅' : '❌'}`);
        console.log(`    Little-endian: ${littleEndian.toFixed(2)} kg ${littleEndian >= 30 && littleEndian <= 200 ? '✅' : '❌'}`);
        
        // Encontrar o primeiro peso válido (entre 30-200 kg para adultos)
        if (!validWeight) {
          if (bigEndian >= 30 && bigEndian <= 200) {
            validWeight = bigEndian;
            validMethod = 'Big-endian';
            validPosition = i;
          } else if (littleEndian >= 30 && littleEndian <= 200) {
            validWeight = littleEndian;
            validMethod = 'Little-endian';
            validPosition = i;
          }
        }
      }
      
      if (validWeight) {
        console.log('\n✅ ===== PESO DETECTADO =====');
        console.log(`  📍 Posição: bytes[${validPosition}, ${validPosition + 1}]`);
        console.log(`  🔧 Método: ${validMethod}`);
        console.log(`  ⚖️  Peso: ${validWeight.toFixed(1)} kg`);
        console.log('===============================\n');
        
        return {
          weight: parseFloat(validWeight.toFixed(1)),
          protocol: 'Original Line',
          timestamp: new Date().toISOString(),
          rawData: {
            companyId: '0x' + companyId.toString(16).padStart(4, '0').toUpperCase(),
            bytes: Array.from(bytes),
            method: validMethod,
            position: validPosition,
          }
        };
      } else {
        console.warn('\n⚠️ ===== NENHUM PESO VÁLIDO =====');
        console.log('  Nenhum valor entre 30-200 kg encontrado');
        console.log('  Possíveis causas:');
        console.log('  • Balança vazia (sem peso)');
        console.log('  • Ainda estabilizando medição');
        console.log('  • Formato de dados diferente');
        console.log('====================================\n');
        return null;
      }

    } catch (error) {
      console.error('❌ Erro ao parsear:', error);
      return null;
    }
  },

  parseData: (base64Data) => {
    console.log('ℹ️ Original Line usa advertising, não conexão GATT');
    return null;
  }
};