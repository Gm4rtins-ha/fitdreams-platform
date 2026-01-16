// frontend/src/services/bluetooth/BluetoothManager.js - VERSÃO CORRIGIDA
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { ScaleDetector } from './ScaleDetector';

export class BluetoothManager {
  constructor() {
    this.manager = new BleManager();
    this.scanning = false;
    this.connectedDevice = null;
    this.currentProtocol = null;
    this.scanSubscription = null;
    this.detectedWeight = null;
    
    // ===== NOVO: Timeout automático para scan =====
    this.scanTimeout = null;
    this.MAX_SCAN_TIME = 45000; // 45 segundos máximo
    this.SCAN_AUTO_STOP = true; // Para scan automaticamente após tempo
    
    // ===== SISTEMA DE TEMPO REAL =====
    this.allReadings = [];
    this.realtimeCallback = null;
    this.stabilizationCallback = null;
    this.isStabilizing = false;
    this.userProfile = null;
  }

  // ============================================
  // PERMISSÕES E ESTADO
  // ============================================

  async requestPermissions() {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
        if (apiLevel >= 31) {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          return Object.values(granted).every(
            status => status === PermissionsAndroid.RESULTS.GRANTED
          );
        } else {
          const granted = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          return Object.values(granted).every(
            status => status === PermissionsAndroid.RESULTS.GRANTED
          );
        }
      } catch (error) {
        console.error('❌ Erro ao solicitar permissões:', error);
        return false;
      }
    }
    return true;
  }

  async checkBluetoothState() {
    try {
      const state = await this.manager.state();
      if (state !== 'PoweredOn') {
        throw new Error('Bluetooth está desligado. Por favor, ligue o Bluetooth.');
      }
      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar Bluetooth:', error);
      throw error;
    }
  }

  // ============================================
  // CONVERSÃO DE DADOS
  // ============================================

  base64ToBytes(base64String) {
    try {
      if (!base64String || typeof base64String !== 'string') {
        return null;
      }
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } catch (error) {
      console.error('❌ Erro ao decodificar base64:', error);
      return null;
    }
  }

  parseManufacturerData(base64Data) {
    if (!base64Data) return null;
    try {
      const decoded = this.base64ToBytes(base64Data);
      if (!decoded || decoded.length < 2) {
        return null;
      }
      const companyId = (decoded[1] << 8) | decoded[0];
      const data = new Uint8Array(decoded.slice(2));
      return {
        companyId,
        data,
      };
    } catch (error) {
      console.error('❌ Erro ao parsear manufacturer data:', error);
      return null;
    }
  }

  // ============================================
  // SISTEMA DE ESTABILIZAÇÃO
  // ============================================

  setUserProfile(profile) {
    this.userProfile = profile;
    console.log('✅ Perfil do usuário definido no BluetoothManager:', profile);
  }

  addRealtimeReading(fullMetricData) {
    const now = Date.now();
    const weightValue = typeof fullMetricData.weight === 'number' 
      ? parseFloat(fullMetricData.weight.toFixed(2)) 
      : null;
    
    const reading = {
      ...fullMetricData,
      weight: weightValue,
      timestamp: now,
      id: this.allReadings.length + 1
    };
    
    this.allReadings.push(reading);

    // Notificar callback de tempo real
    if (this.realtimeCallback) {
      this.realtimeCallback({
        type: 'reading',
        reading: reading,
        allReadings: this.allReadings,
        total: this.allReadings.length
      });
    }

    // Sistema de estabilização
    this.checkStabilization();
  }

  checkStabilization() {
    const MIN_READINGS = 10;
    const STABILITY_WINDOW = 4000;
    const MAX_VARIANCE = 0.10;
    const MAX_TREND = 0.05;

    // Pega o último peso lido
    const lastReading = this.allReadings.length > 0 
      ? this.allReadings[this.allReadings.length - 1] 
      : null;
    const currentWeightForCallback = typeof lastReading?.weight === 'number' 
      ? lastReading.weight 
      : null;

    if (this.allReadings.length < MIN_READINGS) {
      if (this.stabilizationCallback) {
        this.stabilizationCallback({
          status: 'collecting',
          message: `Coletando... (${this.allReadings.length}/${MIN_READINGS})`,
          progress: this.allReadings.length / MIN_READINGS,
          currentWeight: currentWeightForCallback
        });
      }
      return false;
    }

    const now = Date.now();
    const recentReadings = this.allReadings.filter(
      r => now - r.timestamp <= STABILITY_WINDOW && typeof r.weight === 'number'
    );

    if (recentReadings.length < MIN_READINGS) {
      if (this.stabilizationCallback) {
        this.stabilizationCallback({
          status: 'stabilizing',
          message: 'Aguardando mais leituras...',
          progress: 0.5,
          currentWeight: currentWeightForCallback
        });
      }
      return false;
    }

    // Calcular estatísticas
    const weights = recentReadings.map(r => r.weight);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const variance = maxWeight - minWeight;

    // Verificar tendência
    const firstHalf = weights.slice(0, Math.floor(weights.length / 2));
    const secondHalf = weights.slice(Math.floor(weights.length / 2));
    const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    const trend = Math.abs(avgSecondHalf - avgFirstHalf);

    console.log(`📊 Estabilização: min=${minWeight.toFixed(2)} max=${maxWeight.toFixed(2)} var=${variance.toFixed(2)} trend=${trend.toFixed(2)} avg=${avgWeight.toFixed(2)}`);

    // Critérios de estabilização
    const isVarianceOk = variance <= MAX_VARIANCE;
    const isTrendOk = trend <= MAX_TREND;

    if (isVarianceOk && isTrendOk) {
      console.log('✅ PESO ESTABILIZADO:', avgWeight.toFixed(2), 'kg');
      console.log(`   Variância: ${variance.toFixed(3)} kg`);
      console.log(`   Tendência: ${trend.toFixed(3)} kg`);

      // Pegar a última leitura completa
      const lastStableReading = this.allReadings[this.allReadings.length - 1];

      // Criar o objeto final
      const finalMetricData = {
        weight: parseFloat(avgWeight.toFixed(2)),
        bmi: lastStableReading?.bmi || null,
        bodyFat: lastStableReading?.bodyFat || null,
        muscleMass: lastStableReading?.muscleMass || null,
        bodyWater: lastStableReading?.bodyWater || null,
        boneMass: lastStableReading?.boneMass || null,
        basalMetabolicRate: lastStableReading?.basalMetabolicRate || null,
        metabolicAge: lastStableReading?.metabolicAge || null,
        visceralFat: lastStableReading?.visceralFat || null,
        protein: lastStableReading?.protein || null,
        obesity: lastStableReading?.obesity || null,
      };

      if (this.stabilizationCallback) {
        this.stabilizationCallback({
          status: 'stable',
          message: 'Peso estabilizado!',
          progress: 1.0,
          ...finalMetricData,
          variance: variance.toFixed(2),
          trend: trend.toFixed(2),
          readingsCount: this.allReadings.length
        });
      }

      this.detectedWeight = {
        ...finalMetricData,
        protocol: this.currentProtocol?.name || 'Original Line',
        readings: this.allReadings.length,
        variance: variance.toFixed(2),
        trend: trend.toFixed(2),
      };

      this.isStabilizing = false;
      return true;
    }

    // Ainda não estabilizou
    let statusMessage = '';
    if (!isVarianceOk) {
      statusMessage = `Variação: ±${variance.toFixed(2)} kg`;
    } else if (!isTrendOk) {
      statusMessage = `Tendência: ${trend > 0 ? '↗' : '↘'} ${trend.toFixed(2)} kg`;
    }

    if (this.stabilizationCallback) {
      this.stabilizationCallback({
        status: 'stabilizing',
        message: `Estabilizando... ${statusMessage}`,
        progress: Math.min(0.9,
          (isVarianceOk ? 0.5 : 0) +
          (isTrendOk ? 0.4 : 0) +
          0.1
        ),
        currentWeight: parseFloat(avgWeight.toFixed(2)),
        variance: variance.toFixed(2),
        trend: trend.toFixed(2)
      });
    }
    return false;
  }

  resetStabilization() {
    this.allReadings = [];
    this.isStabilizing = false;
    this.detectedWeight = null;
  }

  // ============================================
  // CONTROLE DE SCAN - VERSÃO CORRIGIDA
  // ============================================

  async startScan(onDeviceFound, onRealtimeReading = null, onStabilization = null) {
    console.log('🔍 Iniciando scan em TEMPO REAL (RIGOROSO)...');
    
    try {
      // Se já está escaneando, para primeiro
      if (this.scanning) {
        console.log('⚠️ Scan já em andamento - parando primeiro');
        await this.stopScan();
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Permissões de Bluetooth negadas.');
      }
      
      await this.checkBluetoothState();

      this.scanning = true;
      this.realtimeCallback = onRealtimeReading;
      this.stabilizationCallback = onStabilization;
      this.resetStabilization();

      // Configurar timeout automático para o scan
      this.scanTimeout = setTimeout(() => {
        console.log('⏰ TIMEOUT DE SCAN - Parando automaticamente após 45 segundos');
        this.stopScan();
        
        if (onStabilization) {
          onStabilization({
            status: 'timeout',
            message: 'Tempo de busca esgotado'
          });
        }
      }, this.MAX_SCAN_TIME);

      console.log('📡 Scan RIGOROSO ativado (10 leituras, 4s, ±0.10kg)');

      this.scanSubscription = this.manager.startDeviceScan(
        null,
        {
          allowDuplicates: true,
          scanMode: 2,
        },
        (error, device) => {
          if (error) {
            console.error('❌ Erro no scan:', error);
            this.scanning = false;
            if (this.stabilizationCallback) {
              this.stabilizationCallback({ 
                status: 'error', 
                message: `Erro no scan: ${error.message}` 
              });
            }
            this.stopScan();
            return;
          }
          
          if (!device) return;

          const formattedDevice = {
            id: device.id,
            name: device.name || 'N/A',
            rssi: device.rssi,
            manufacturerData: this.parseManufacturerData(device.manufacturerData),
            rawDevice: device,
          };

          const protocol = ScaleDetector.detectProtocol(formattedDevice);

          if (protocol && protocol.usesAdvertising && protocol.parseAdvertisingData) {
            const fullMetricData = protocol.parseAdvertisingData(formattedDevice.manufacturerData);

            console.log('🔍 Dados de métrica completos parseados:', fullMetricData);

            if (fullMetricData && typeof fullMetricData.weight === 'number') {
              this.addRealtimeReading(fullMetricData);
              formattedDevice.detectedWeight = fullMetricData.weight;
              formattedDevice.bioimpedanceData = fullMetricData;
            }
          }

          // Notifica onDeviceFound para todos os dispositivos
          if (onDeviceFound) {
            onDeviceFound(formattedDevice);
          }
        }
      );
      
      console.log('✅ Scan rigoroso iniciado!');
    } catch (error) {
      console.error('❌ Erro ao iniciar scan:', error);
      this.scanning = false;
      this.stopScan();
      throw error;
    }
  }

  stopScan() {
    console.log('⏹️ Parando scan...');
    
    // SEMPRE tenta parar, mesmo se scanning for false
    try {
      // 1. Para o scan do BLE Manager
      this.manager.stopDeviceScan();
      console.log('✅ manager.stopDeviceScan() chamado');
    } catch (error) {
      console.log('⚠️ Erro ao chamar stopDeviceScan:', error.message);
    }
    
    // 2. Limpa a subscription se existir
    if (typeof this.scanSubscription === 'function') {
      try {
        this.scanSubscription();
        console.log('✅ scanSubscription() chamada');
      } catch (error) {
        console.log('⚠️ Erro ao chamar scanSubscription:', error.message);
      }
      this.scanSubscription = null;
    }
    
    // 3. Limpa timeout de scan
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    
    // 4. Atualiza estado
    this.scanning = false;
    
    // 5. Reseta estabilização
    this.resetStabilization();
    
    console.log('✅ Scan completamente parado');
  }

  // ============================================
  // CONEXÃO E MONITORAMENTO
  // ============================================

  async connect(device) {
    console.log('🔗 Selecionando dispositivo:', device.name || device.id);
    this.currentProtocol = ScaleDetector.detectProtocol(device);
    this.connectedDevice = device;

    if (this.currentProtocol) {
      console.log('✅ Protocolo detectado:', this.currentProtocol.name);
      if (this.currentProtocol.usesAdvertising) {
        console.log('📡 Modo advertising - Estabilização RIGOROSA ativa');
        this.isStabilizing = true;
      }
    } else {
      console.warn('⚠️ Nenhum protocolo detectado para o dispositivo:', device.name || device.id);
      throw new Error('Protocolo de balança não detectado para este dispositivo.');
    }
    return true;
  }

  async disconnect() {
    console.log('❌ Desconectando...');
    this.stopScan();
    
    if (this.connectedDevice?.rawDevice) {
      try {
        await this.connectedDevice.rawDevice.cancelConnection();
      } catch (error) {
        console.log('⚠️ Erro ao desconectar:', error);
      }
    }
    
    this.connectedDevice = null;
    this.currentProtocol = null;
    this.resetStabilization();
  }

  async startMonitoring(onDataReceived) {
    if (!this.connectedDevice || !this.currentProtocol) {
      throw new Error('Nenhum dispositivo conectado');
    }
    
    console.log('📊 Monitoramento RIGOROSO ativo!');

    if (this.currentProtocol.usesAdvertising) {
      const maxWaitTime = 20000;
      const startTime = Date.now();
      
      const checkInterval = setInterval(() => {
        if (this.detectedWeight) {
          clearInterval(checkInterval);
          console.log('✅ Peso final:', this.detectedWeight.weight, 'kg');
          console.log('📊 IMC:', this.detectedWeight.bmi);
          console.log('📊 Gordura Corporal:', this.detectedWeight.bodyFat);
          console.log('📊 Massa Muscular:', this.detectedWeight.muscleMass);
          
          onDataReceived(this.detectedWeight);
        } else if (Date.now() - startTime > maxWaitTime) {
          clearInterval(checkInterval);
          console.warn('⚠️ Timeout após 20 segundos');
          onDataReceived({ 
            error: 'Timeout: Nenhuma medição estável recebida.', 
            requiresManualInput: true 
          });
        }
      }, 500);
      
      return { requiresManualInput: false };
    }
    
    return { requiresManualInput: true };
  }

  isConnected() {
    return this.connectedDevice !== null;
  }

  getCurrentProtocol() {
    return this.currentProtocol;
  }

  getAllReadings() {
    return this.allReadings;
  }

  destroy() {
    console.log('🗑️ Destruindo BluetoothManager...');
    this.stopScan();
    this.disconnect();
    
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
    
    this.realtimeCallback = null;
    this.stabilizationCallback = null;
    this.allReadings = [];
  }
}

export default new BluetoothManager();