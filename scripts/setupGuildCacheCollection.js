#!/usr/bin/env node
/**
 * Script para crear automáticamente la colección de caché de guilds en Appwrite
 * 
 * Uso:
 *   node scripts/setupGuildCacheCollection.js
 * 
 * Requisitos:
 *   - Tener las variables de entorno de Appwrite configuradas
 *   - Tener node-appwrite instalado
 */
process.loadEnvFile();
const { Client, Databases, Permission, Role } = require('node-appwrite');

const COLLECTION_NAME = 'guild_cache_id';

async function setup() {
  console.log('🚀 Configurando colección de caché de guilds en Appwrite...\n');

  // Validar variables de entorno
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  const databaseId = process.env.APPWRITE_DATABASE_ID;

  if (!endpoint || !projectId || !apiKey || !databaseId) {
    console.error('❌ Error: Faltan variables de entorno de Appwrite');
    console.error('   Asegúrate de tener configurado:');
    console.error('   - APPWRITE_ENDPOINT');
    console.error('   - APPWRITE_PROJECT_ID');
    console.error('   - APPWRITE_API_KEY');
    console.error('   - APPWRITE_DATABASE_ID');
    process.exit(1);
  }

  // Inicializar cliente
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  const databases = new Databases(client);

  try {
    // 1. Crear colección
    console.log('📦 Creando colección...');
    const collection = await databases.createCollection(
      databaseId,
      'unique()', // ID autogenerado
      COLLECTION_NAME,
      [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any())
      ]
    );

    console.log(`✅ Colección creada: ${collection.$id}\n`);
    const collectionId = collection.$id;

    // 2. Crear atributo guildId (string, required, unique)
    console.log('📝 Creando atributo: guildId');
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'guildId',
      32,
      true, // required
      null,
      false,
      false
    );
    console.log('✅ Atributo guildId creado');

    // 3. Crear atributo name (string, required)
    console.log('📝 Creando atributo: name');
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'name',
      100,
      true, // required
      null,
      false,
      false
    );
    console.log('✅ Atributo name creado');

    // 4. Crear atributo prefix (string, optional)
    console.log('📝 Creando atributo: prefix');
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'prefix',
      10,
      false, // not required
      null,
      false,
      false
    );
    console.log('✅ Atributo prefix creado');

    // 5. Crear atributo expiresAt (datetime, required)
    console.log('📝 Creando atributo: expiresAt');
    await databases.createDatetimeAttribute(
      databaseId,
      collectionId,
      'expiresAt',
      true, // required
      null,
      false,
      false
    );
    console.log('✅ Atributo expiresAt creado');

    // Esperar un poco para que Appwrite procese los atributos
    console.log('\n⏳ Esperando 5 segundos para que los atributos se procesen...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 6. Crear índice en guildId (unique)
    console.log('📝 Creando índice único en guildId');
    await databases.createIndex(
      databaseId,
      collectionId,
      'idx_guildId',
      'unique',
      ['guildId'],
      ['ASC']
    );
    console.log('✅ Índice en guildId creado');

    // 7. Crear índice en expiresAt (para queries de limpieza)
    console.log('📝 Creando índice en expiresAt');
    await databases.createIndex(
      databaseId,
      collectionId,
      'idx_expiresAt',
      'key',
      ['expiresAt'],
      ['ASC']
    );
    console.log('✅ Índice en expiresAt creado');

    console.log('\n🎉 ¡Configuración completada exitosamente!');
    console.log('\n📋 Agrega esta variable a tu .env:');
    console.log(`APPWRITE_COLLECTION_GUILD_CACHE_ID=${collectionId}`);
    console.log('\n💡 Recuerda reiniciar tu bot después de agregar la variable.');

  } catch (error) {
    console.error('\n❌ Error durante la configuración:', error.message);
    if (error.response) {
      console.error('Detalles:', error.response);
    }
    process.exit(1);
  }
}

setup();
