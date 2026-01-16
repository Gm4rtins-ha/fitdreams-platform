const bcrypt = require('bcryptjs');
const db = require('../models');

async function fixUserPassword(email, newPassword) {
  try {
    console.log('🔧 CORRIGINDO SENHA DO USUÁRIO ===============\n');
    
    const user = await db.User.findOne({ where: { email } });
    
    if (!user) {
      console.log(`❌ Usuário ${email} não encontrado`);
      return;
    }
    
    console.log(`👤 Usuário: ${user.fullName} (${user.email})`);
    console.log(`Senha atual (hash): ${user.password.substring(0, 30)}...`);
    console.log(`É bcrypt válido? ${user.password.startsWith('$2')}`);
    
    // Gerar novo hash
    console.log('\n🔐 Gerando novo hash...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`Nova senha: "${newPassword}"`);
    console.log(`Novo hash: ${hashedPassword.substring(0, 30)}...`);
    
    // Atualizar SEM usar o hook (atualização direta)
    await db.sequelize.query(
      'UPDATE Users SET password = ?, updatedAt = NOW() WHERE id = ?',
      {
        replacements: [hashedPassword, user.id],
        type: db.sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('\n✅ Senha atualizada com sucesso!');
    console.log('⏱️  Teste fazer login agora com a nova senha.');
    
    // Verificar se funcionou
    const updatedUser = await db.User.findOne({ where: { email } });
    const passwordMatches = await bcrypt.compare(newPassword, updatedUser.password);
    console.log(`✅ Verificação: ${passwordMatches ? 'SENHA FUNCIONA' : 'SENHA NÃO FUNCIONA'}`);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir senha:', error);
  }
}

// Uso: node fixUserPassword.js email@exemplo.com novaSenha
const args = process.argv.slice(2);
if (args.length >= 2) {
  fixUserPassword(args[0], args[1]);
} else {
  console.log('Uso: node fixUserPassword.js <email> <novaSenha>');
  console.log('Exemplo: node fixUserPassword.js guilherme@unisense.com.br 09012007');
}