const {randomBytes,createHash}=require('crypto');
const token=randomBytes(32).toString('base64url');
console.log('Clave de activación para UN equipo (guárdala y entrégala solo a ese equipo):');
console.log(token);
console.log('\nAñade este hash al arreglo JSON SYNC_API_TOKEN_HASHES de tu servidor:');
console.log(createHash('sha256').update(token).digest('hex'));
