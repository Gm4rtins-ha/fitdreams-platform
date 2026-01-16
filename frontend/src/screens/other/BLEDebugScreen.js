import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Clipboard,
  Platform,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const bleManager = new BleManager();

// ============================================
// CONSTANTES DOS UUIDs
// ============================================
const SERVICE_FFA0 = '0000ffa0-0000-1000-8000-00805f9b34fb';
const CHAR_FFA1 = '0000ffa1-0000-1000-8000-00805f9b34fb';
const CHAR_FFA2 = '0000ffa2-0000-1000-8000-00805f9b34fb';

const SERVICE_FF90 = '0000ff90-0000-1000-8000-00805f9b34fb';
const CHAR_FF91 = '0000ff91-0000-1000-8000-00805f9b34fb';
const CHAR_FF92 = '0000ff92-0000-1000-8000-00805f9b34fb';
const CHAR_FF93 = '0000ff93-0000-1000-8000-00805f9b34fb';
const CHAR_FF94 = '0000ff94-0000-1000-8000-00805f9b34fb';
const CHAR_FF95 = '0000ff95-0000-1000-8000-00805f9b34fb';
const CHAR_FF96 = '0000ff96-0000-1000-8000-00805f9b34fb';
const CHAR_FF97 = '0000ff97-0000-1000-8000-00805f9b34fb';
const CHAR_FF98 = '0000ff98-0000-1000-8000-00805f9b34fb';
const CHAR_FF99 = '0000ff99-0000-1000-8000-00805f9b34fb';
const CHAR_FF9A = '0000ff9a-0000-1000-8000-00805f9b34fb';

// ============================================
// FUNÇÕES AUXILIARES DE DECODIFICAÇÃO
// ============================================

const decodeValue = (base64Value) => {
  if (!base64Value) return null;

  try {
    const buffer = Buffer.from(base64Value, 'base64');
    const bytes = Array.from(buffer);
    const hex = buffer.toString('hex').toUpperCase();

    let asciiString = null;
    try {
      const str = buffer.toString('utf8');
      if (/^[\x20-\x7E]*$/.test(str)) {
        asciiString = str;
      }
    } catch (e) {
      // Não é string válida
    }

    const interpretations = {};

    if (bytes.length >= 1) {
      interpretations.byte1 = bytes[0];
    }

    if (bytes.length >= 2) {
      interpretations.uint16LE = (bytes[1] << 8) | bytes[0];
      interpretations.uint16LE_div4 = Math.round(interpretations.uint16LE / 4);
    }

    if (bytes.length >= 2) {
      interpretations.uint16BE = (bytes[0] << 8) | bytes[1];
      interpretations.uint16BE_div4 = Math.round(interpretations.uint16BE / 4);
    }

    if (bytes.length >= 4) {
      interpretations.uint32LE = 
        (bytes[3] << 24) | (bytes[2] << 16) | (bytes[1] << 8) | bytes[0];
    }

    return {
      base64: base64Value,
      hex,
      bytes,
      ascii: asciiString,
      interpretations,
    };
  } catch (error) {
    console.error('Erro ao decodificar:', error);
    return null;
  }
};

const findMatches = (decoded, displayValue) => {
  if (!decoded || !displayValue) return [];

  const matches = [];
  const tolerance = 5;
  const { interpretations } = decoded;

  Object.keys(interpretations).forEach((key) => {
    const value = interpretations[key];
    if (typeof value === 'number') {
      const diff = Math.abs(value - displayValue);
      if (diff <= tolerance) {
        matches.push({
          format: key,
          value,
          difference: value - displayValue,
          exact: diff === 0,
        });
      }
    }
  });

  return matches;
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function BLEDebugScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [device, setDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const [capturedData, setCapturedData] = useState({});
  const [displayValue, setDisplayValue] = useState('');
  const [reading, setReading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    return () => {
      if (device) {
        device.cancelConnection();
      }
      bleManager.stopDeviceScan();
    };
  }, [device]);

  useEffect(() => {
    if (scrollViewRef.current && logs.length > 0) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [logs]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const scanForGTech = async () => {
    addLog('🔍 Iniciando busca pelo G-TECH...', 'info');
    setScanning(true);
    setLogs([]);

    try {
      bleManager.startDeviceScan(null, null, (error, scannedDevice) => {
        if (error) {
          addLog(`❌ Erro no scan: ${error.message}`, 'error');
          setScanning(false);
          return;
        }

        if (scannedDevice && scannedDevice.name?.includes('GTECH')) {
          addLog(`✅ G-TECH encontrado!`, 'success');
          addLog(`📱 Nome: ${scannedDevice.name}`, 'info');
          addLog(`📍 MAC: ${scannedDevice.id}`, 'info');
          addLog(`📶 RSSI: ${scannedDevice.rssi} dBm`, 'info');

          bleManager.stopDeviceScan();
          setScanning(false);
          setDevice(scannedDevice);
        }
      });

      setTimeout(() => {
        if (scanning) {
          bleManager.stopDeviceScan();
          setScanning(false);
          addLog('⏱️ Scan finalizado (timeout)', 'warning');
        }
      }, 10000);
    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, 'error');
      setScanning(false);
    }
  };

  const connectAndCapture = async () => {
    if (!device) {
      Alert.alert('Erro', 'Nenhum dispositivo encontrado');
      return;
    }

    addLog('🔗 Conectando ao G-TECH...', 'info');

    try {
      const connectedDevice = await device.connect();
      addLog('✅ Conectado!', 'success');
      setConnected(true);

      addLog('🔍 Descobrindo services e characteristics...', 'info');
      await connectedDevice.discoverAllServicesAndCharacteristics();

      const services = await connectedDevice.services();
      addLog(`📦 ${services.length} services encontrados`, 'success');

      const allData = {};

      for (const service of services) {
        addLog(`\n📋 Service: ${service.uuid}`, 'info');
        const characteristics = await service.characteristics();
        addLog(`   ├─ ${characteristics.length} characteristics`, 'info');

        allData[service.uuid] = {};

        for (const char of characteristics) {
          addLog(`   ├─ Char: ${char.uuid}`, 'info');
          addLog(`   │  ├─ Read: ${char.isReadable}`, 'info');
          addLog(`   │  ├─ Write: ${char.isWritableWithResponse}`, 'info');
          addLog(`   │  ├─ Notify: ${char.isNotifiable}`, 'info');
          addLog(`   │  └─ Indicate: ${char.isIndicatable}`, 'info');

          allData[service.uuid][char.uuid] = {
            readable: char.isReadable,
            writable: char.isWritableWithResponse,
            notifiable: char.isNotifiable,
            indicatable: char.isIndicatable,
            values: [],
          };

          if (char.isReadable) {
            try {
              const readChar = await char.read();
              const value = readChar.value;
              addLog(`   │  📖 Valor lido: ${value}`, 'success');
              allData[service.uuid][char.uuid].initialValue = value;
            } catch (readError) {
              addLog(`   │  ⚠️ Não foi possível ler`, 'warning');
            }
          }

          if (char.isNotifiable || char.isIndicatable) {
            try {
              char.monitor((error, updatedChar) => {
                if (error) {
                  addLog(`❌ Erro na notificação: ${error.message}`, 'error');
                  return;
                }

                if (updatedChar && updatedChar.value) {
                  const timestamp = new Date().toISOString();
                  const value = updatedChar.value;

                  addLog(`\n🔔 NOTIFICAÇÃO RECEBIDA!`, 'success');
                  addLog(`   Service: ${service.uuid}`, 'info');
                  addLog(`   Char: ${char.uuid}`, 'info');
                  addLog(`   Valor (Base64): ${value}`, 'info');

                  try {
                    const buffer = Buffer.from(value, 'base64');
                    const hexString = buffer.toString('hex').toUpperCase();
                    addLog(`   Valor (HEX): ${hexString}`, 'success');

                    const stringValue = buffer.toString('utf8');
                    if (stringValue && /^[\x20-\x7E]*$/.test(stringValue)) {
                      addLog(`   Valor (String): ${stringValue}`, 'info');
                    }
                  } catch (e) {
                    // Ignore
                  }

                  allData[service.uuid][char.uuid].values.push({
                    timestamp,
                    value,
                  });
                  setCapturedData({ ...allData });
                }
              });

              addLog(`   │  ✅ Inscrito em notificações`, 'success');
            } catch (notifyError) {
              addLog(
                `   │  ⚠️ Erro ao se inscrever: ${notifyError.message}`,
                'warning'
              );
            }
          }
        }
      }

      setCapturedData(allData);
      addLog('\n✅ Captura iniciada! Faça uma medição no glicosímetro.', 'success');
      addLog('📊 Aguardando dados...', 'info');
    } catch (error) {
      addLog(`❌ Erro: ${error.message}`, 'error');
      setConnected(false);
    }
  };

  const readAllCharacteristics = async () => {
    if (!device || !connected) {
      Alert.alert('Erro', 'Conecte ao dispositivo primeiro');
      return;
    }

    if (!displayValue || isNaN(displayValue)) {
      Alert.alert('Erro', 'Digite o valor do display (ex: 105)');
      return;
    }

    const targetValue = parseInt(displayValue);
    addLog(`\n🎯 INICIANDO LEITURA COMPLETA`, 'success');
    addLog(`📊 Display Value Informado: ${targetValue} mg/dL`, 'info');
    addLog(`═════════════════════════════════════`, 'info');

    setReading(true);
    setTestResults([]);
    setCandidates([]);

    const results = [];
    const foundCandidates = [];

    try {
      const charsToTest = [
        { service: SERVICE_FF90, char: CHAR_FF91, name: 'FF91' },
        { service: SERVICE_FF90, char: CHAR_FF92, name: 'FF92' },
        { service: SERVICE_FF90, char: CHAR_FF93, name: 'FF93' },
        { service: SERVICE_FF90, char: CHAR_FF95, name: 'FF95' },
        { service: SERVICE_FF90, char: CHAR_FF96, name: 'FF96' },
        { service: SERVICE_FF90, char: CHAR_FF97, name: 'FF97' },
        { service: SERVICE_FF90, char: CHAR_FF98, name: 'FF98' },
        { service: SERVICE_FF90, char: CHAR_FF9A, name: 'FF9A' },
        { service: SERVICE_FFA0, char: CHAR_FFA1, name: 'FFA1' },
        { service: SERVICE_FFA0, char: CHAR_FFA2, name: 'FFA2' },
      ];

      for (const charInfo of charsToTest) {
        addLog(`\n📖 Lendo ${charInfo.name}...`, 'info');

        try {
          const characteristic = await device.readCharacteristicForService(
            charInfo.service,
            charInfo.char
          );

          if (characteristic && characteristic.value) {
            const decoded = decodeValue(characteristic.value);

            if (decoded) {
              addLog(`   Base64: ${decoded.base64}`, 'info');
              addLog(`   HEX: ${decoded.hex}`, 'info');

              if (decoded.ascii) {
                addLog(`   String: ${decoded.ascii}`, 'info');
              }

              if (decoded.interpretations) {
                Object.keys(decoded.interpretations).forEach((key) => {
                  const value = decoded.interpretations[key];
                  addLog(`   ${key}: ${value}`, 'info');
                });
              }

              const matches = findMatches(decoded, targetValue);

              if (matches.length > 0) {
                addLog(`   🎯 MATCHES ENCONTRADOS:`, 'success');
                matches.forEach((match) => {
                  addLog(
                    `      ${match.format}: ${match.value} (diff: ${match.difference})`,
                    match.exact ? 'success' : 'warning'
                  );
                });

                foundCandidates.push({
                  char: charInfo.name,
                  matches,
                  decoded,
                });
              }

              results.push({
                char: charInfo.name,
                decoded,
                matches,
              });
            }
          }
        } catch (error) {
          addLog(`   ⚠️ Erro ao ler: ${error.message}`, 'warning');
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      addLog(`\n═════════════════════════════════════`, 'info');
      addLog(`✅ LEITURA COMPLETA FINALIZADA`, 'success');
      addLog(`📊 Total de characteristics lidas: ${results.length}`, 'info');
      addLog(`🎯 Candidates encontrados: ${foundCandidates.length}`, 'success');

      if (foundCandidates.length > 0) {
        addLog(`\n🏆 RESUMO DOS CANDIDATES:`, 'success');
        foundCandidates.forEach((candidate) => {
          addLog(`\n   📍 ${candidate.char}:`, 'success');
          candidate.matches.forEach((match) => {
            addLog(
              `      ✓ ${match.format} = ${match.value} mg/dL ${
                match.exact ? '(MATCH EXATO!)' : `(diff: ${match.difference})`
              }`,
              match.exact ? 'success' : 'warning'
            );
          });
        });
      }

      setTestResults(results);
      setCandidates(foundCandidates);
      setShowResults(true);
    } catch (error) {
      addLog(`❌ Erro durante leitura: ${error.message}`, 'error');
    } finally {
      setReading(false);
    }
  };

  const testWriteCommands = async () => {
    if (!device || !connected) {
      Alert.alert('Erro', 'Conecte ao dispositivo primeiro');
      return;
    }

    addLog(`\n🧪 TESTANDO COMANDOS WRITE`, 'info');
    addLog(`═════════════════════════════════════`, 'info');

    const commandsToTest = [
      { name: 'Solicitar leitura', bytes: [0x01] },
      { name: 'Solicitar display value', bytes: [0x02] },
      { name: 'Solicitar modo', bytes: [0x03] },
      { name: 'Reset', bytes: [0x00] },
      { name: 'Comando extendido 1', bytes: [0x01, 0x00] },
      { name: 'Comando extendido 2', bytes: [0x02, 0x01] },
    ];

    for (const command of commandsToTest) {
      addLog(`\n📤 Enviando: ${command.name}`, 'info');
      addLog(`   Bytes: [${command.bytes.join(', ')}]`, 'info');

      try {
        const buffer = Buffer.from(command.bytes);
        const base64 = buffer.toString('base64');

        try {
          await device.writeCharacteristicWithResponseForService(
            SERVICE_FF90,
            CHAR_FF94,
            base64
          );
          addLog(`   ✓ Escrito em FF94`, 'success');
        } catch (e) {
          addLog(`   ✗ Não foi possível escrever em FF94`, 'warning');
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const char = await device.readCharacteristicForService(
            SERVICE_FFA0,
            CHAR_FFA1
          );

          if (char && char.value) {
            const decoded = decodeValue(char.value);
            addLog(`   📖 FFA1 após comando: ${decoded.hex}`, 'info');
          }
        } catch (e) {
          addLog(`   ⚠️ Erro ao ler FFA1`, 'warning');
        }
      } catch (error) {
        addLog(`   ❌ Erro: ${error.message}`, 'error');
      }
    }

    addLog(`\n═════════════════════════════════════`, 'info');
    addLog(`✅ TESTE DE COMANDOS FINALIZADO`, 'success');
  };

  // ============================================
  // NOVA FUNÇÃO: TESTE DE PROTOCOLO DE SINCRONIZAÇÃO
  // ============================================
  const testSyncProtocol = async () => {
    if (!device || !connected) {
      Alert.alert('Erro', 'Conecte ao dispositivo primeiro');
      return;
    }

    addLog('\n🔄 ========== TESTANDO PROTOCOLO DE SINCRONIZAÇÃO ==========', 'success');
    addLog('📊 Tentando sincronizar medições armazenadas...', 'info');
    addLog('═══════════════════════════════════════════════════════════\n', 'info');

    try {
      // Passo 1: Verificar FFA1 antes da sincronização
      addLog('📖 Passo 1: Lendo FFA1 ANTES da sincronização...', 'info');
      try {
        const ffa1Before = await device.readCharacteristicForService(
          SERVICE_FFA0,
          CHAR_FFA1
        );
        const decodedBefore = decodeValue(ffa1Before.value);
        addLog(`   FFA1 ANTES: ${ffa1Before.value} → HEX: ${decodedBefore?.hex}`, 'info');
      } catch (e) {
        addLog(`   ⚠️ Erro ao ler FFA1: ${e.message}`, 'warning');
      }

      // 🆕 PASSO 2: CONFIGURAR LISTENER DE NOTIFICAÇÕES
      addLog('\n📡 Passo 2: Configurando listener de notificações na FFA1...', 'info');

      let notificationReceived = false;
      let notificationData = null;

      const subscription = device.monitorCharacteristicForService(
        SERVICE_FFA0,
        CHAR_FFA1,
        (error, characteristic) => {
          if (error) {
            addLog(`   ❌ Erro na notificação: ${error.message}`, 'error');
            return;
          }

          if (characteristic && characteristic.value) {
            notificationReceived = true;
            notificationData = characteristic.value;

            addLog(`\n🔔🔔🔔 NOTIFICAÇÃO RECEBIDA NA FFA1! 🔔🔔🔔`, 'success');
            addLog(`   Base64: ${characteristic.value}`, 'success');

            const decoded = decodeValue(characteristic.value);
            if (decoded) {
              addLog(`   HEX: ${decoded.hex}`, 'success');
              addLog(`   Bytes: ${decoded.bytes.length} byte(s)`, 'success');

              if (decoded.bytes.length === 2) {
                addLog(`   ⭐⭐⭐ FFA1 TEM 2 BYTES! ⭐⭐⭐`, 'success');
                if (decoded.interpretations) {
                  Object.keys(decoded.interpretations).forEach(key => {
                    addLog(`   ${key}: ${decoded.interpretations[key]}`, 'success');
                  });

                  if (decoded.interpretations.uint16LE_div4) {
                    const glucose = decoded.interpretations.uint16LE_div4;
                    if (glucose >= 20 && glucose <= 600) {
                      addLog(`\n   🎯🎯🎯 GLICOSE ENCONTRADA: ${glucose} mg/dL 🎯🎯🎯`, 'success');
                    }
                  }
                }
              }
            }
          }
        }
      );

      addLog('   ✅ Listener configurado e ativo', 'success');

      // Passo 3: Enviar comandos e AGUARDAR notificações
      addLog('\n📤 Passo 3: Enviando comandos e AGUARDANDO notificações...', 'info');

      const syncCommands = [
        { name: 'Sync Command 0x01', bytes: [0x01] },
        { name: 'Sync Command 0x02', bytes: [0x02] },
        { name: 'Sync Command 0x03', bytes: [0x03] },
        { name: 'Sync Command 0x04', bytes: [0x04] },
        { name: 'Sync Command 0x05', bytes: [0x05] },
        { name: 'Sync Command 0x0A', bytes: [0x0A] },
        { name: 'Sync Extended 0x01 0x01', bytes: [0x01, 0x01] },
        { name: 'Sync Extended 0x02 0x02', bytes: [0x02, 0x02] },
      ];

      for (const cmd of syncCommands) {
        addLog(`\n   Testando: ${cmd.name}`, 'info');
        addLog(`   Bytes: [${cmd.bytes.map(b => '0x' + b.toString(16).toUpperCase()).join(', ')}]`, 'info');

        try {
          const buffer = Buffer.from(cmd.bytes);
          const base64Cmd = buffer.toString('base64');

          await device.writeCharacteristicWithResponseForService(
            SERVICE_FF90,
            CHAR_FF94,
            base64Cmd
          );

          addLog(`   ✓ Comando enviado com sucesso`, 'success');

          // 🆕 AGUARDA 3 SEGUNDOS PARA NOTIFICAÇÃO
          addLog(`   ⏳ Aguardando notificação (3s)...`, 'info');

          notificationReceived = false;
          await new Promise(resolve => setTimeout(resolve, 3000));

          if (notificationReceived) {
            addLog(`   ✅ Notificação recebida!`, 'success');
          } else {
            addLog(`   ⚠️ Nenhuma notificação recebida`, 'warning');

            // Tenta ler manualmente
            try {
              const ffa1After = await device.readCharacteristicForService(
                SERVICE_FFA0,
                CHAR_FFA1
              );

              const decodedAfter = decodeValue(ffa1After.value);
              addLog(`   📖 FFA1 lido manualmente: ${ffa1After.value} → HEX: ${decodedAfter?.hex}`, 'info');

              if (decodedAfter?.bytes?.length === 2) {
                addLog(`   ⭐ FFA1 TEM 2 BYTES (leitura manual)!`, 'success');
                if (decodedAfter.interpretations?.uint16LE_div4) {
                  const glucose = decodedAfter.interpretations.uint16LE_div4;
                  if (glucose >= 20 && glucose <= 600) {
                    addLog(`   🎯 Glicose: ${glucose} mg/dL`, 'success');
                  }
                }
              }
            } catch (readError) {
              addLog(`   ⚠️ Erro ao ler FFA1: ${readError.message}`, 'warning');
            }
          }

        } catch (writeError) {
          addLog(`   ❌ Erro ao enviar comando: ${writeError.message}`, 'error');
        }

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Remove subscription
      subscription.remove();

      addLog('\n═══════════════════════════════════════════════════════════', 'info');
      addLog('✅ TESTE DE SINCRONIZAÇÃO CONCLUÍDO', 'success');
      addLog('═══════════════════════════════════════════════════════════\n', 'info');

    } catch (error) {
      addLog(`❌ Erro no teste de sincronização: ${error.message}`, 'error');
    }
  };  


  const exportResults = () => {
    if (testResults.length === 0) {
      Alert.alert('Aviso', 'Nenhum resultado para exportar');
      return;
    }

    let csv = 'Characteristic,Base64,HEX,Byte1,Uint16LE,Uint16LE/4,Uint16BE,Uint16BE/4,ASCII\n';

    testResults.forEach((result) => {
      const { char, decoded } = result;
      if (decoded) {
        csv += `${char},`;
        csv += `${decoded.base64},`;
        csv += `${decoded.hex},`;
        csv += `${decoded.interpretations.byte1 || ''},`;
        csv += `${decoded.interpretations.uint16LE || ''},`;
        csv += `${decoded.interpretations.uint16LE_div4 || ''},`;
        csv += `${decoded.interpretations.uint16BE || ''},`;
        csv += `${decoded.interpretations.uint16BE_div4 || ''},`;
        csv += `${decoded.ascii || ''}\n`;
      }
    });

    Clipboard.setString(csv);
    Alert.alert('Sucesso', 'CSV copiado para a área de transferência!');
  };

  const disconnect = async () => {
    if (device) {
      try {
        await device.cancelConnection();
        addLog('🔌 Desconectado', 'info');
        setConnected(false);
        setDevice(null);
        setShowResults(false);
      } catch (error) {
        addLog(`❌ Erro ao desconectar: ${error.message}`, 'error');
      }
    }
  };

  const copyLogs = () => {
    const logsText = logs
      .map((log) => `[${log.timestamp}] ${log.message}`)
      .join('\n');
    Clipboard.setString(logsText);
    Alert.alert('Sucesso', 'Logs copiados!');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error':
        return '#E74C3C';
      case 'success':
        return '#27AE60';
      case 'warning':
        return '#F39C12';
      default:
        return '#333';
    }
  };

  const renderResultItem = ({ item }) => {
    const hasMatches = item.matches && item.matches.length > 0;

    return (
      <View
        style={[
          styles.resultCard,
          hasMatches && styles.resultCardHighlight,
        ]}
      >
        <Text style={styles.resultChar}>{item.char}</Text>

        {item.decoded && (
          <>
            <Text style={styles.resultLabel}>Base64:</Text>
            <Text style={styles.resultValue}>{item.decoded.base64}</Text>

            <Text style={styles.resultLabel}>HEX:</Text>
            <Text style={styles.resultValue}>{item.decoded.hex}</Text>

            {item.decoded.ascii && (
              <>
                <Text style={styles.resultLabel}>String:</Text>
                <Text style={styles.resultValue}>{item.decoded.ascii}</Text>
              </>
            )}

            <Text style={styles.resultLabel}>Interpretações:</Text>
            {Object.keys(item.decoded.interpretations).map((key) => (
              <Text key={key} style={styles.resultInterpretation}>
                • {key}: {item.decoded.interpretations[key]}
              </Text>
            ))}

            {hasMatches && (
              <View style={styles.matchesContainer}>
                <Text style={styles.matchesTitle}>🎯 MATCHES:</Text>
                {item.matches.map((match, idx) => (
                  <Text
                    key={idx}
                    style={[
                      styles.matchText,
                      match.exact && styles.matchExact,
                    ]}
                  >
                    ✓ {match.format}: {match.value} mg/dL
                    {match.exact
                      ? ' (EXATO!)'
                      : ` (diff: ${match.difference})`}
                  </Text>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>BLE Debug - G-TECH</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.controls}>
          {!device && (
            <TouchableOpacity
              style={[styles.button, styles.scanButton]}
              onPress={scanForGTech}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Buscar G-TECH</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {device && !connected && (
            <TouchableOpacity
              style={[styles.button, styles.connectButton]}
              onPress={connectAndCapture}
            >
              <Ionicons name="bluetooth" size={20} color="#fff" />
              <Text style={styles.buttonText}>Conectar e Capturar</Text>
            </TouchableOpacity>
          )}

          {connected && (
            <View style={styles.displayValueContainer}>
              <Text style={styles.displayValueLabel}>
                Valor do Display (mg/dL):
              </Text>
              <TextInput
                style={styles.displayValueInput}
                placeholder="Ex: 105"
                keyboardType="numeric"
                value={displayValue}
                onChangeText={setDisplayValue}
              />
            </View>
          )}

          {connected && (
            <TouchableOpacity
              style={[styles.button, styles.readAllButton]}
              onPress={readAllCharacteristics}
              disabled={reading}
            >
              {reading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="analytics" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    Ler Todas Characteristics
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {connected && (
            <TouchableOpacity
              style={[styles.button, styles.writeButton]}
              onPress={testWriteCommands}
            >
              <Ionicons name="pencil" size={20} color="#fff" />
              <Text style={styles.buttonText}>Testar Comandos Write</Text>
            </TouchableOpacity>
          )}

          {connected && (
            <TouchableOpacity
              style={[styles.button, styles.syncButton]}
              onPress={testSyncProtocol}
            >
              <Ionicons name="sync" size={20} color="#fff" />
              <Text style={styles.buttonText}>Testar Protocolo de Sincronização</Text>
            </TouchableOpacity>
          )}



          {connected && (
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton]}
              onPress={disconnect}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Desconectar</Text>
            </TouchableOpacity>
          )}

          <View style={styles.exportButtons}>
            <TouchableOpacity
              style={[styles.button, styles.copyButton, { flex: 1 }]}
              onPress={copyLogs}
            >
              <Ionicons name="copy" size={18} color="#fff" />
              <Text style={styles.buttonText}>Copiar Logs</Text>
            </TouchableOpacity>

            {testResults.length > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.exportButton, { flex: 1 }]}
                onPress={exportResults}
              >
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.buttonText}>Exportar CSV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {candidates.length > 0 && (
          <View style={styles.candidatesContainer}>
            <Text style={styles.candidatesTitle}>
              🏆 CANDIDATES ENCONTRADOS
            </Text>
            {candidates.map((candidate, idx) => (
              <View key={idx} style={styles.candidateCard}>
                <Text style={styles.candidateChar}>{candidate.char}</Text>
                {candidate.matches.map((match, midx) => (
                  <Text
                    key={midx}
                    style={[
                      styles.candidateMatch,
                      match.exact && styles.candidateMatchExact,
                    ]}
                  >
                    ✓ {match.format}: {match.value} mg/dL
                    {match.exact ? ' 🎯 EXATO!' : ` (diff: ${match.difference})`}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {showResults && testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>📊 RESULTADOS DETALHADOS</Text>
            <FlatList
              data={testResults}
              renderItem={renderResultItem}
              keyExtractor={(item, index) => index.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        <View style={styles.logContainer}>
          <Text style={styles.logTitle}>📋 Logs em Tempo Real:</Text>
          <ScrollView 
            style={styles.logScroll}
            ref={scrollViewRef}
          >
            {logs.length === 0 && (
              <Text style={styles.emptyLog}>Aguardando ações...</Text>
            )}
            {logs.map((log, index) => (
              <Text
                key={index}
                style={[styles.logText, { color: getLogColor(log.type) }]}
              >
                [{log.timestamp}] {log.message}
              </Text>
            ))}
          </ScrollView>
        </View>

        {connected && (
          <View style={styles.instructions}>
            <Ionicons name="information-circle" size={20} color="#4A90E2" />
            <Text style={styles.instructionText}>
              1. Digite o valor que viu no display{'\n'}
              2. Clique em "Ler Todas Characteristics"{'\n'}
              3. Aguarde a análise completa{'\n'}
              4. Veja os candidates destacados acima
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '#4A90E2',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  controls: {
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  scanButton: {
    backgroundColor: '#4A90E2',
  },
  connectButton: {
    backgroundColor: '#27AE60',
  },
  readAllButton: {
    backgroundColor: '#8E44AD',
  },
  writeButton: {
    backgroundColor: '#E67E22',
  },
  syncButton: {
    backgroundColor: '#16A085',
  },
  disconnectButton: {
    backgroundColor: '#E74C3C',
  },
  copyButton: {
    backgroundColor: '#9B59B6',
  },
  exportButton: {
    backgroundColor: '#16A085',
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  displayValueContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  displayValueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  displayValueInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  candidatesContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#27AE60',
  },
  candidatesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#27AE60',
    marginBottom: 12,
  },
  candidateCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  candidateChar: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  candidateMatch: {
    fontSize: 14,
    color: '#F39C12',
    marginLeft: 8,
    marginBottom: 4,
  },
  candidateMatchExact: {
    color: '#27AE60',
    fontWeight: '700',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultCardHighlight: {
    borderWidth: 2,
    borderColor: '#27AE60',
    backgroundColor: '#F0FFF4',
  },
  resultChar: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  resultValue: {
    fontSize: 14,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  resultInterpretation: {
    fontSize: 12,
    color: '#555',
    marginLeft: 8,
    marginBottom: 2,
  },
  matchesContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F39C12',
  },
  matchesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F39C12',
    marginBottom: 4,
  },
  matchText: {
    fontSize: 13,
    color: '#F39C12',
    marginLeft: 8,
    marginBottom: 2,
  },
  matchExact: {
    color: '#27AE60',
    fontWeight: '700',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 300,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  logScroll: {
    flex: 1,
  },
  emptyLog: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
    lineHeight: 18,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
    lineHeight: 20,
  },
});