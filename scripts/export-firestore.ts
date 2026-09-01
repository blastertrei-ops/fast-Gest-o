import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { collection, firestoreDb, getDocs } from '../server/firebase';

const collections = ['empresas', 'usuarios', 'drivers', 'vehicles', 'clientes', 'deliveries', 'driver_locations', 'route_histories', 'notifications', 'auditoria', 'master_auditoria', 'custom_roles'] as const;

function outputPath() {
  const argument = process.argv.find((item) => item.startsWith('--output='));
  if (!argument) throw new Error('Informe um destino fora do repositório: --output=C:\\backup\\fast-gestao-firestore.json');
  return resolve(argument.slice('--output='.length));
}

function serialise(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(serialise);
  if ('toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') return (value as { toDate: () => Date }).toDate().toISOString();
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, serialise(item)]));
}

async function main() {
  const destination = outputPath();
  const data: Record<string, unknown[]> = {};
  for (const name of collections) {
    const snapshot = await getDocs(collection(firestoreDb, name));
    data[name] = snapshot.docs.map((item) => serialise({ id: item.id, ...item.data() }) as Record<string, unknown>);
    console.log(`${name}: ${data[name].length} registro(s)`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, JSON.stringify({ exportedAt: new Date().toISOString(), collections: data }, null, 2), { encoding: 'utf8', mode: 0o600 });
  console.log(`Exportação criada em ${destination}. Esse arquivo contém dados sensíveis; não o envie ao GitHub.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
