import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

class PDFService {
  // ========== GERAR PDF DE MÉTRICAS DE SAÚDE ==========
  async generateHealthMetricsPDF(userData, metrics, history = []) {
    try {
      const html = this.createHealthMetricsHTML(userData, metrics, history);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      return uri;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw error;
    }
  }

  // ========== COMPARTILHAR PDF ==========
  async sharePDF(pdfUri, filename = 'relatorio-saude.pdf') {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert(
          'Erro',
          'Compartilhamento não disponível neste dispositivo'
        );
        return false;
      }

      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartilhar Relatório de Saúde',
        UTI: 'com.adobe.pdf',
      });

      return true;
    } catch (error) {
      console.error('Erro ao compartilhar PDF:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o PDF');
      return false;
    }
  }

  // ========== CRIAR HTML DO PDF ==========
  createHealthMetricsHTML(userData, metrics, history) {
    const currentDate = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const weightStatus = this.getWeightStatus(metrics.bmi);
    const bodyFatStatus = this.getBodyFatStatus(metrics.bodyFat);

    // Gerar dados do histórico (últimas 5 medições)
    const historyRows = history.slice(0, 5).map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${new Date(item.timestamp).toLocaleDateString('pt-BR')}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          ${item.weight} kg
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          ${item.bmi}
        </td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          ${item.bodyFat}%
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Saúde - FitDreams</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            padding: 40px;
            color: #333;
            background: #fff;
          }

          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4A90E2;
          }

          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4A90E2;
            margin-bottom: 10px;
          }

          .subtitle {
            font-size: 14px;
            color: #666;
          }

          .info-section {
            margin-bottom: 30px;
          }

          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #4A90E2;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #E0E0E0;
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
          }

          .info-item {
            padding: 12px;
            background: #F5F7FA;
            border-radius: 8px;
          }

          .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 4px;
          }

          .info-value {
            font-size: 16px;
            font-weight: bold;
            color: #333;
          }

          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }

          .metric-card {
            padding: 15px;
            background: #F5F7FA;
            border-radius: 8px;
            text-align: center;
          }

          .metric-label {
            font-size: 11px;
            color: #666;
            margin-bottom: 8px;
          }

          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 4px;
          }

          .metric-status {
            font-size: 12px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
          }

          .status-healthy {
            background: #E8F5E9;
            color: #4CAF50;
          }

          .status-warning {
            background: #FFF3E0;
            color: #FF9800;
          }

          .status-danger {
            background: #FFEBEE;
            color: #FF5252;
          }

          .status-info {
            background: #E3F2FD;
            color: #2196F3;
          }

          .history-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          .history-table th {
            background: #4A90E2;
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
          }

          .history-table td {
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 12px;
          }

          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E0E0E0;
            text-align: center;
            font-size: 11px;
            color: #999;
          }

          .warning-box {
            background: #FFF3E0;
            border-left: 4px solid #FF9800;
            padding: 15px;
            margin: 20px 0;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div class="logo">🏃 FitDreams</div>
          <div class="subtitle">Relatório de Métricas de Saúde</div>
          <div class="subtitle">${currentDate}</div>
        </div>

        <!-- Informações do Usuário -->
        <div class="info-section">
          <div class="section-title">📋 Informações do Paciente</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Nome</div>
              <div class="info-value">${userData?.fullName || 'Não informado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${userData?.email || 'Não informado'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Idade</div>
              <div class="info-value">${metrics.age || userData?.age || '-'} anos</div>
            </div>
            <div class="info-item">
              <div class="info-label">Altura</div>
              <div class="info-value">${metrics.height} cm</div>
            </div>
          </div>
        </div>

        <!-- Métricas Principais -->
        <div class="info-section">
          <div class="section-title">⚖️ Medições Atuais</div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Peso</div>
              <div class="metric-value">${metrics.weight} kg</div>
              <span class="metric-status status-${weightStatus.class}">
                ${weightStatus.text}
              </span>
            </div>

            <div class="metric-card">
              <div class="metric-label">IMC</div>
              <div class="metric-value">${metrics.bmi}</div>
              <span class="metric-status status-${weightStatus.class}">
                ${weightStatus.text}
              </span>
            </div>

            <div class="metric-card">
              <div class="metric-label">Gordura Corporal</div>
              <div class="metric-value">${metrics.bodyFat}%</div>
              <span class="metric-status status-${bodyFatStatus.class}">
                ${bodyFatStatus.text}
              </span>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">Massa Muscular</div>
              <div class="metric-value">${metrics.muscleMassPercent}%</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Água Corporal</div>
              <div class="metric-value">${metrics.waterPercent}%</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Metabolismo Basal</div>
              <div class="metric-value">${metrics.metabolism}</div>
              <div class="metric-label" style="margin-top: 4px;">kcal/dia</div>
            </div>
          </div>
        </div>

        <!-- Composição Corporal Detalhada -->
        <div class="info-section">
          <div class="section-title">💪 Composição Corporal</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Peso da Gordura</div>
              <div class="info-value">${metrics.bodyFatWeight} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">Peso da Massa Muscular</div>
              <div class="info-value">${metrics.muscleMassWeight} kg</div>
            </div>
            <div class="info-item">
              <div class="info-label">Gordura Visceral</div>
              <div class="info-value">${metrics.visceralFat}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Peso da Água</div>
              <div class="info-value">${metrics.waterWeight} kg</div>
            </div>
          </div>
        </div>

        <!-- Histórico -->
        ${history.length > 0 ? `
          <div class="info-section">
            <div class="section-title">📈 Histórico (Últimas 5 Medições)</div>
            <table class="history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th style="text-align: center;">Peso (kg)</th>
                  <th style="text-align: center;">IMC</th>
                  <th style="text-align: center;">Gordura (%)</th>
                </tr>
              </thead>
              <tbody>
                ${historyRows}
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- Aviso Médico -->
        <div class="warning-box">
          <strong>⚠️ Aviso Importante:</strong><br>
          Este relatório é gerado automaticamente e não substitui a avaliação de um profissional de saúde qualificado. 
          Consulte sempre seu médico ou nutricionista para orientações personalizadas sobre sua saúde.
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>Relatório gerado pelo FitDreams em ${currentDate}</p>
          <p>Este documento é confidencial e destinado exclusivamente ao uso pessoal.</p>
        </div>
      </body>
      </html>
    `;
  }

  // ========== HELPERS ==========
  getWeightStatus(bmi) {
    if (bmi < 18.5) return { text: 'Baixo', class: 'info' };
    if (bmi < 25) return { text: 'Saudável', class: 'healthy' };
    if (bmi < 30) return { text: 'Alto', class: 'warning' };
    return { text: 'Obeso', class: 'danger' };
  }

  getBodyFatStatus(bodyFat) {
    if (bodyFat < 10) return { text: 'Baixo', class: 'info' };
    if (bodyFat <= 20) return { text: 'Saudável', class: 'healthy' };
    if (bodyFat <= 25) return { text: 'Alto', class: 'warning' };
    return { text: 'Muito Alto', class: 'danger' };
  }
}

export default new PDFService();