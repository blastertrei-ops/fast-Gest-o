import { doc, firestoreDb, setDoc } from './database';

export async function createNotification(companyId: string, type: 'entrega_criada' | 'status_entrega' | 'alerta', title: string, message: string, deliveryId?: string) {
  const id = `not_${crypto.randomUUID()}`;
  await setDoc(doc(firestoreDb, 'notifications', id), { id, companyId, type, title, message, deliveryId, createdAt: new Date().toISOString(), readBy: [] });
}
