const bcrypt = require('bcryptjs');
const db = require('../models');

async function diagnoseUser(email) {
  try {
    console.log('🔍 DIAGNÓSTICO DO USUÁRIO ====================\n');
    
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`❌ Usuário ${email} não encontrado`);
      return;
    }
    
    console.log(`👤 Usuário: ${user.fullName} (${user.email})`);
    console.log(`ID: ${user.id}`);
    console.log(`Criado em: ${user.createdAt}`);
    console.log(`Atualizado em: ${user.updatedAt}`);
    
    console.log('\n🔐 INFORMAÇÕES DA SENHA:');
    console.log(`Senha no banco: ${user.password ? 'PRESENTE' : 'AUSENTE'}`);
    
    if (user.password) {
      console.log(`Length do hash: ${user.password.length}`);
      console.log(`Hash (primeiros 30 chars): ${user.password.substring(0, 30)}...`);
      console.log(`É hash bcrypt? ${user.password.startsWith('$2')}`);
      console.log(`Versão bcrypt: ${user.password.split('$')[2]}`);
      
      // Testar senhas comuns
      const commonPasswords = ['09012007', '123456', 'password', 'senha123'];
      console.log('\n🧪 TESTANDO SENHAS COMUNS:');
      
      for (const testPwd of commonPasswords) {
        const isValid = await bcrypt.compare(testPwd, user.password);
        console.log(`  "${testPwd}": ${isValid ? '✅ CORRETA' : '❌ INCORRETA'}`);
      }
    }
    
    console.log('\n📊 VERIFICAÇÕES:');
    console.log(`Email verificado: ${user.isEmailVerified ? '✅' : '❌'}`);
    console.log(`Telefone verificado: ${user.isPhoneVerified ? '✅' : '❌'}`);
    console.log(`Altura: ${user.height || 'Não definida'}`);
    console.log(`Peso: ${user.weight || 'Não definido'}`);
    
    // Verificar métricas associadas
    const metrics = await db.Metric.findAll({
      where: { userId: user.id },
      order: [['timestamp', 'DESC']],
      limit: 3
    });
    
    console.log(`\n📈 Métricas (${metrics.length}):`);
    metrics.forEach((metric, idx) => {
      console.log(`  ${idx + 1}. ${metric.timestamp}: ${metric.weight}kg, IMC: ${metric.bmi}`);
    });
    
    console.log('\n===========================================');
    
  } catch (error) {
    console.error('Erro no diagnóstico:', error);
  }
}

// Uso: node diagnoseUser.js email@exemplo.com
const args = process.argv.slice(2);
if (args.length >= 1) {
  diagnoseUser(args[0]);
} else {
  console.log('Uso: node diagnoseUser.js <email>');
  console.log('Exemplo: node diagnoseUser.js guilherme@unisense.com.br');
}