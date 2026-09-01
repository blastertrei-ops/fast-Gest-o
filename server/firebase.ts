import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return undefined;
  try {
    const credentials = JSON.parse(raw);
    if (!credentials.project_id || !credentials.client_email || !credentials.private_key) throw new Error('campos obrigatórios ausentes');
    return credentials;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON deve conter o JSON completo e válido da conta de serviço.');
  }
}

const serviceAccount = loadServiceAccount();
if (process.env.NODE_ENV === 'production' && !serviceAccount && process.env.DATA_BACKEND !== 'supabase') {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON é obrigatório em produção.');
}
const app = getApps().length ? getApps()[0] : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });
// Some Firebase projects use a named Firestore database instead of `(default)`.
// Leave the variable empty only when the application intentionally uses `(default)`.
const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim();
export const firestoreDb = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
export const collection = (db: FirebaseFirestore.Firestore, name: string) => db.collection(name);
export const doc = (db: FirebaseFirestore.Firestore, name: string, id: string) => db.collection(name).doc(id);
export const getDoc = async (ref: FirebaseFirestore.DocumentReference): Promise<any> => { const snapshot = await ref.get(); return { ref: snapshot.ref, exists: () => snapshot.exists, data: () => snapshot.data() }; };
export const setDoc = (ref: FirebaseFirestore.DocumentReference, data: any, options?: FirebaseFirestore.SetOptions) => ref.set(data, options);
export const updateDoc = (ref: FirebaseFirestore.DocumentReference, data: any) => ref.update(data);
export const deleteDoc = (ref: FirebaseFirestore.DocumentReference) => ref.delete();
export const getDocs = (ref: FirebaseFirestore.Query) => ref.get();
export const where = (field: string, operator: FirebaseFirestore.WhereFilterOp, value: unknown) => ({ field, operator, value });
export const query = (ref: FirebaseFirestore.Query, ...filters: ReturnType<typeof where>[]) => filters.reduce((current, filter) => current.where(filter.field, filter.operator, filter.value), ref);
