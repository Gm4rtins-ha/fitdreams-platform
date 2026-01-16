const bcrypt = require('bcryptjs');

async function testHash() {
  const hash = '$2a$10$Fg.On442GaWOWu.1PZ4/1ONZ6KnUga6R08ytNg38uLzi41bjScRKu';
  
  // Testar várias possibilidades
  const senhas = [
    'gui09012007',
    'Gui09012007',
    'GUI09012007',
    ' gui09012007',
    'gui09012007 ',
    '09012007',
    'guilherme',
    '123456',
  ];

  console.log('🔍 Testando senhas contra o hash...\n');

  for (const senha of senhas) {
    const result = await bcrypt.compare(senha, hash);
    if (result) {
      console.log(`✅ ENCONTREI! A senha é: "${senha}"`);
      return;
    } else {
      console.log(`❌ "${senha}" - não é essa`);
    }
  }

  console.log('\n❌ Nenhuma senha testada funcionou');
  console.log('💡 A senha no banco é diferente das testadas');
}

testHash();