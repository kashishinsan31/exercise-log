import { collection, doc, setDoc, getDocs, getDoc, query, where, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ClientProfile = {
  name: string;
  trainerEmail: string;
  phone?: string;
  dob?: string;
  height?: string;
  password?: string;
};

export type TrackedTrainer = {
  name: string;
  email: string;
};

export type ExerciseLog = {
  id?: string;
  date: string;
  clientName: string;
  muscleGroup: string;
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
};

export type BodyMeasurement = {
  date: string;
  clientName: string;
  chest: string;
  hips: string;
  arms: string;
  weight: string;
};

export async function initializeDatabase(adminEmail: string): Promise<string> {
  const exSnap = await getDocs(collection(db, "exercises"));
  if (exSnap.empty) {
    const defaultExercises = [
      { name: "Bench Press", group: "Chest" },
      { name: "Incline Dumbbell Press", group: "Chest" },
      { name: "Pull-ups", group: "Back" },
      { name: "Deadlift", group: "Back" },
      { name: "Squat", group: "Legs" },
      { name: "Leg Press", group: "Legs" },
    ];
    for (const ex of defaultExercises) {
      await addDoc(collection(db, "exercises"), ex);
    }
  }

  const trSnap = await getDocs(collection(db, "trainers"));
  if (trSnap.empty) {
    await setDoc(doc(db, "trainers", adminEmail.toLowerCase()), {
      name: "Admin Trainer",
      email: adminEmail.toLowerCase(),
      password: "trainer123",
    });
  }
  return "firestore-connected";
}

export async function appendMeasurement(measurement: BodyMeasurement) {
  await addDoc(collection(db, "measurements"), measurement);
}

export async function fetchClientMeasurements(clientName: string) {
  const q = query(collection(db, "measurements"), where("clientName", "==", clientName));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => d.data() as BodyMeasurement);
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function appendLogRecord(log: ExerciseLog) {
  await addDoc(collection(db, "logs"), log);
}

export async function deleteLogRecord(log: ExerciseLog) {
  if (log.id) {
     await deleteDoc(doc(db, "logs", log.id));
     return;
  }
  // fallback if ID not found but that shouldn't happen newly
}

export async function fetchClientLogs(clientName: string) {
  const q = query(collection(db, "logs"), where("clientName", "==", clientName));
  const snap = await getDocs(q);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExerciseLog));
  return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchAllTrainers() {
  const snap = await getDocs(collection(db, "trainers"));
  return snap.docs.map(d => ({ name: d.data().name as string, email: d.data().email as string }));
}

export async function addTrainer(trainerProfile: { name: string; email: string; password?: string }) {
  await setDoc(doc(db, "trainers", trainerProfile.email.toLowerCase()), {
      name: trainerProfile.name,
      email: trainerProfile.email.toLowerCase(),
      password: trainerProfile.password || "",
  });
}

export async function updateTrainer(email: string, trainerProfile: Partial<{ name: string; password?: string }>) {
  await updateDoc(doc(db, "trainers", email.toLowerCase()), trainerProfile);
}

export async function deleteTrainerRecord(email: string) {
  await deleteDoc(doc(db, "trainers", email.toLowerCase()));
}

export async function fetchAllClients() {
  const snap = await getDocs(collection(db, "clients"));
  return snap.docs.map(d => d.data() as ClientProfile);
}

export async function addClient(client: ClientProfile) {
  const docId = `${client.name}_${client.trainerEmail}`.replace(/[^a-zA-Z0-9]/g, '_');
  await setDoc(doc(db, "clients", docId), client);
}

export async function updateClient(name: string, trainerEmail: string, clientData: Partial<ClientProfile>) {
  const docId = `${name}_${trainerEmail}`.replace(/[^a-zA-Z0-9]/g, '_');
  await updateDoc(doc(db, "clients", docId), clientData);
}

export async function deleteClientRecord(name: string, trainerEmail: string) {
  const docId = `${name}_${trainerEmail}`.replace(/[^a-zA-Z0-9]/g, '_');
  await deleteDoc(doc(db, "clients", docId));
}

export async function fetchExercises() {
   const snap = await getDocs(collection(db, "exercises"));
   return snap.docs.map(d => d.data() as { name: string, group: string });
}

export async function doLogin(email: string, password: string, role: string) {
  if (role === 'client') {
      const q = query(collection(db, "clients"), where("password", "==", password));
      const snap = await getDocs(q);
      const client = snap.docs.find(d => {
         return d.data().name.toLowerCase() === email.toLowerCase();
      });
      if (client) {
         return { success: true, user: { name: client.data().name, trainerEmail: client.data().trainerEmail }};
      }
  } else if (role === 'trainer') {
      const snap = await getDoc(doc(db, "trainers", email.toLowerCase()));
      if (snap.exists() && snap.data().password === password) {
         return { success: true, user: { name: snap.data().name, email: snap.data().email }};
      }
  }
  throw new Error("Invalid credentials");
}
