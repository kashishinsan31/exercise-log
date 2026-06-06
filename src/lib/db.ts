import { collection, doc, setDoc, getDocs, getDoc, query, where, addDoc, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";

export type ClientProfile = {
  name: string;
  trainerEmail: string;
  phone?: string;
  dob?: string;
  height?: string;
  password?: string;
};

export type BodyMeasurement = {
  date: string;
  clientName: string;
  weight: string;
  chest: string;
  hips: string;
  arms: string;
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

// Instead of setting up a spreadsheet, we just seed Firebase if it's empty
export async function initializeDatabase(adminEmail: string): Promise<string> {
  // Check if exercises collection exists
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

  // Check if any trainers exist, if not create admin
  const trSnap = await getDocs(collection(db, "trainers"));
  if (trSnap.empty) {
    await setDoc(doc(db, "trainers", adminEmail), {
      name: "Admin Trainer",
      email: adminEmail,
      password: "trainer123",
    });
  }

  return "firestore-db";
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
  // Fallback if no ID is provided, query to find exactly matching record
  const q = query(
    collection(db, "logs"), 
    where("clientName", "==", log.clientName),
    where("date", "==", log.date),
    where("exercise", "==", log.exercise)
  );
  
  const snap = await getDocs(q);
  // delete the first match that also matches reps/sets
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.sets === log.sets && data.reps === log.reps && data.weight === log.weight) {
       await deleteDoc(docSnap.ref);
       break;
    }
  }
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

export async function deleteTrainerRecord(email: string) {
  await deleteDoc(doc(db, "trainers", email.toLowerCase()));
}

export async function fetchAllClients() {
  const snap = await getDocs(collection(db, "clients"));
  return snap.docs.map(d => d.data() as ClientProfile);
}

export async function addClient(client: ClientProfile) {
  // Use a unique ID based on name and trainer to ensure simple uniqueness mapping
  const docId = `${client.name}_${client.trainerEmail}`.replace(/[^a-zA-Z0-9]/g, '_');
  await setDoc(doc(db, "clients", docId), client);
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
         const data = d.data();
         // we don't have email for client, we use 'name' as email login field in the UI sometimes?
         // wait, the old UI used email field but matched on row[0] which is 'Client Name'
         return data.name.toLowerCase() === email.toLowerCase();
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
