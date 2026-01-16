// frontend/src/services/weightService.js
import api from '../api/axios';

class WeightService {
  // Salvar medição de peso
  static async saveMeasurement(weightData) {
    try {
      console.log('💾 Enviando medição para o backend:', weightData);
      
      const response = await api.post('/weight/save', weightData);
      
      if (response.data.success) {
        console.log('✅ Medição salva com sucesso!');
        return response.data;
      } else {
        console.error('❌ Falha ao salvar medição:', response.data.message);
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar medição:', error.message);
      throw error;
    }
  }

  // Buscar histórico
  static async getHistory(limit = 50, offset = 0) {
    try {
      const response = await api.get('/weight/history', {
        params: { limit, offset }
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      throw error;
    }
  }

  // Buscar estatísticas
  static async getStats() {
    try {
      const response = await api.get('/weight/stats');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  // Calcular progresso
  static calculateProgress(currentWeight, targetWeight, initialWeight) {
    if (!targetWeight || !initialWeight) return null;
    
    const totalChangeNeeded = initialWeight - targetWeight;
    const currentChange = initialWeight - currentWeight;
    
    if (totalChangeNeeded === 0) return 100;
    
    const progress = (currentChange / totalChangeNeeded) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  // Classificar IMC
  static classifyBMI(bmi) {
    if (!bmi) return { category: 'Desconhecido', color: '#666' };
    
    if (bmi < 18.5) return { category: 'Abaixo do peso', color: '#3498db' };
    if (bmi < 25) return { category: 'Peso normal', color: '#27ae60' };
    if (bmi < 30) return { category: 'Sobrepeso', color: '#f39c12' };
    if (bmi < 35) return { category: 'Obesidade Grau I', color: '#e74c3c' };
    if (bmi < 40) return { category: 'Obesidade Grau II', color: '#c0392b' };
    return { category: 'Obesidade Grau III', color: '#7d3c98' };
  }
}

export default WeightService;