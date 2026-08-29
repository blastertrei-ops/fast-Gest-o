import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : undefined;
const app = getApps().length ? getApps()[0] : initializeApp({ credential: serviceAccount ? cert(serviceAccount) : applicationDefault() });
export const firestoreDb = getFirestore(app);
export const collection = (db: FirebaseFirestore.Firestore, name: string) => db.collection(name);
export const doc = (db: FirebaseFirestore.Firestore, name: string, id: string) => db.collection(name).doc(id);
export const getDoc = async (ref: FirebaseFirestore.DocumentReference): Promise<any> => { const snapshot = await ref.get(); return { ref: snapshot.ref, exists: () => snapshot.exists, data: () => snapshot.data() }; };
export const setDoc = (ref: FirebaseFirestore.DocumentReference, data: any, options?: FirebaseFirestore.SetOptions) => ref.set(data, options);
export const updateDoc = (ref: FirebaseFirestore.DocumentReference, data: any) => ref.update(data);
export const deleteDoc = (ref: FirebaseFirestore.DocumentReference) => ref.delete();
export const getDocs = (ref: FirebaseFirestore.Query) => ref.get();
export const where = (field: string, operator: FirebaseFirestore.WhereFilterOp, value: unknown) => ({ field, operator, value });
export const query = (ref: FirebaseFirestore.Query, ...filters: ReturnType<typeof where>[]) => filters.reduce((current, filter) => current.where(filter.field, filter.operator, filter.value), ref);
