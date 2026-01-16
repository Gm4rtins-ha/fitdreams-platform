import { BleManager } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert } from 'react-native';

class BluetoothService {
  constructor() {
    this.manager = new BleManager();
    this.connectedDevice = null;
    this.isScanning = false;
  }

  /**
   * Solicita permissões de Bluetooth (Android 12+)
   */
  async requestPermissions() {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
          granted['android.permission.BLUETOOTH_CONNECT'] === 'granted' &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === 'granted'
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === 'granted';
      }
    }
    return true;
  }

  /**
   * Verifica se o Bluetooth está ligado
   */
  async checkBluetoothState() {
    const state = await this.manager.state();
    if (state !== 'PoweredOn') {
      Alert.alert(
        'Bluetooth Desligado',
        'Por favor, ligue o Bluetooth do seu celular.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  }

  /**
   * Escaneia dispositivos Bluetooth próximos
   */
  async scanForDevices(onDeviceFound, duration = 10000) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Erro', 'Permissões de Bluetooth negadas');
      return;
    }

    const isOn = await this.checkBluetoothState();
    if (!isOn) return;

    console.log('🔍 Iniciando escaneamento BLE...');
    this.isScanning = true;

    const foundDevices = new Set();

    this.manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('❌ Erro no scan:', error);
          this.stopScan();
          return;
        }

        if (device) {
          if (!foundDevices.has(device.id)) {
            foundDevices.add(device.id);
            
            const deviceName = device.name || `Sem nome (${device.id.substring(0, 8)})`;
            
            console.log('📱 Dispositivo BLE:', deviceName);
            console.log('   ID:', device.id);
            console.log('   RSSI:', device.rssi);
            console.log('   ManufacturerData:', device.manufacturerData);
            
            onDeviceFound({
              id: device.id,
              name: deviceName,
              rssi: device.rssi,
              manufacturerData: device.manufacturerData,
              serviceData: device.serviceData,
              serviceUUIDs: device.serviceUUIDs,
            });
          }
        }
      }
    );

    setTimeout(() => {
      console.log('⏰ Timeout de scan atingido');
      this.stopScan();
    }, duration);
  }

  /**
   * Para o escaneamento
   */
  stopScan() {
    if (this.isScanning) {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      console.log('⏹️ Escaneamento parado');
    }
  }

  /**
   * Conecta a um dispositivo específico
   */
  async connectToDevice(device) {
    try {
      console.log('🔗 Conectando a:', device.name);

      this.connectedDevice = await this.manager.connectToDevice(device.id, {
        autoConnect: false,
        requestMTU: 512,
      });

      console.log('✅ Conectado a:', device.name);

      await this.connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('🔍 Serviços descobertos');

      return this.connectedDevice;
    } catch (error) {
      console.error('❌ Erro ao conectar:', error);
      throw error;
    }
  }

  /**
   * Lê dados da balança (conexão direta - para outras balanças)
   */
  async readScaleData(device) {
    try {
      console.log('📊 Lendo dados da balança...');

      const SCALE_SERVICE_UUIDS = [
        '0000181D-0000-1000-8000-00805F9B34FB',
        '0000181B-0000-1000-8000-00805F9B34FB',
        'FFF0',
        'FFE0',
      ];

      const services = await device.services();
      
      for (const service of services) {
        console.log('🔧 Serviço:', service.uuid);
        
        const characteristics = await service.characteristics();
        
        for (const char of characteristics) {
          console.log('  📝 Característica:', char.uuid, '- Notify:', char.isNotifiable);
          
          if (char.isNotifiable) {
            return new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Timeout ao ler dados da balança'));
              }, 30000);

              char.monitor((error, characteristic) => {
                if (error) {
                  clearTimeout(timeout);
                  console.error('❌ Erro ao monitorar:', error);
                  reject(error);
                  return;
                }

                if (characteristic && characteristic.value) {
                  clearTimeout(timeout);
                  
                  const rawData = atob(characteristic.value);
                  const bytes = new Uint8Array(rawData.length);
                  for (let i = 0; i < rawData.length; i++) {
                    bytes[i] = rawData.charCodeAt(i);
                  }
                  
                  console.log('📦 Dados recebidos:', Array.from(bytes));

                  const weightRaw = (bytes[1] << 8) | bytes[0];
                  const weight = weightRaw / 100;

                  console.log('⚖️ Peso lido:', weight, 'kg');

                  resolve({
                    weight: weight,
                    timestamp: new Date().toISOString(),
                    rawData: Array.from(bytes),
                  });
                }
              });
            });
          }
        }
      }

      throw new Error('Nenhuma característica de leitura encontrada');
    } catch (error) {
      console.error('❌ Erro ao ler dados:', error);
      throw error;
    }
  }

  /**
   * Decodifica dados da balança Original Line SL0382D
   * Funciona com QUALQUER balança Original Line de QUALQUER usuário
   * Formato: BIG-ENDIAN nos primeiros 2 bytes
   * Exemplo: 0x1AEA = (0x1A << 8) | 0xEA = 6890 / 100 = 68.90 kg
   */
  decodeOriginalLineScale(manufacturerData) {
    try {
      if (!manufacturerData) return null;

      const binaryString = atob(manufacturerData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Formato correto: BIG-ENDIAN (bytes[0] é MSB, bytes[1] é LSB)
      const weightRaw = (bytes[0] << 8) | bytes[1];
      const weight = weightRaw / 100;

      console.log('⚖️ PESO LIDO:', weight.toFixed(2), 'kg');
      console.log('🔢 Dados (hex):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
      console.log('🔢 Raw value (0x' + weightRaw.toString(16).toUpperCase() + '):', weightRaw);

      return weight;
    } catch (error) {
      console.error('❌ Erro ao decodificar:', error);
      return null;
    }
  }

  /**
   * Monitora continuamente balanças Original Line
   * Funciona com QUALQUER balança Original Line SL0382D de qualquer usuário
   */
  async monitorOriginalLineScale(onWeightReceived, duration = 60000) {
    console.log('🔍 Monitorando balanças Original Line...');
    
    let lastWeight = null;
    let readingsCount = 0;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⏰ Timeout atingido após', duration / 1000, 'segundos');
        console.log('📊 Total de leituras:', readingsCount);
        this.stopScan();
        if (lastWeight) {
          console.log('✅ Última leitura válida:', lastWeight, 'kg');
          resolve(lastWeight);
        } else {
          reject(new Error('Timeout: Nenhum dado de peso recebido'));
        }
      }, duration);

      this.manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        (error, device) => {
          if (error) {
            console.error('❌ Erro no scan:', error);
            clearTimeout(timeout);
            this.stopScan();
            reject(error);
            return;
          }

          // Detecta balanças Original Line pelo:
          // 1. Nome "N/A" + manufacturer data (PRINCIPAL)
          // 2. Nome contém "original" ou "sl0382"
          // 3. Padrão de dados válido
          // IMPORTANTE: NÃO usa Company ID (ele muda a cada leitura!)
          const isOriginalLine = (
            (device.name?.toLowerCase() === 'n/a' && device.manufacturerData?.data) ||
            (device.name?.toLowerCase().includes('original')) ||
            (device.name?.toLowerCase().includes('sl0382'))
          );

          if (device && isOriginalLine && device.manufacturerData) {
            readingsCount++;
            console.log('⚖️ Leitura #' + readingsCount, 'de balança Original Line');
            console.log('   Dispositivo:', device.name || 'N/A', '(' + device.id + ')');
            
            const weight = this.decodeOriginalLineScale(device.manufacturerData);
            console.log('📏 Peso decodificado:', weight, 'kg');
            
            if (weight && weight > 0 && weight < 300) {
              console.log('✅ Peso VÁLIDO:', weight, 'kg');
              onWeightReceived(weight, device.manufacturerData);
              lastWeight = weight;
            } else {
              console.log('⚠️ Peso INVÁLIDO ignorado:', weight);
            }
          }
        }
      );
    });
  }

  /**
   * Desconecta do dispositivo atual
   */
  async disconnect() {
    if (this.connectedDevice) {
      try {
        await this.manager.cancelDeviceConnection(this.connectedDevice.id);
        console.log('🔌 Desconectado');
        this.connectedDevice = null;
      } catch (error) {
        console.error('❌ Erro ao desconectar:', error);
      }
    }
  }

  /**
   * Destrói o manager (cleanup)
   */
  destroy() {
    this.stopScan();
    this.disconnect();
    this.manager.destroy();
  }
}

export default new BluetoothService();