import { getAccessToken } from "./firebase";

const SPREADSHEET_NAME = "Trainer Log Book";
const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];

export async function getOrCreateSpreadsheet(
  trainerEmail: string,
): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const query = encodeURIComponent(
    `name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!searchRes.ok) throw new Error("Failed to search Google Drive");
  const searchData = await searchRes.json();

  let spreadsheetId;

  if (searchData.files && searchData.files.length > 0) {
    spreadsheetId = searchData.files[0].id;
  } else {
    // Create a new Spreadsheet with all tabs
    const createBody = {
      properties: { title: SPREADSHEET_NAME },
      sheets: [
        {
          properties: { title: "Trainers" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Trainer Name" } },
                    { userEnteredValue: { stringValue: "Trainer Email" } },
                    { userEnteredValue: { stringValue: "Password" } },
                  ],
                },
              ],
            },
          ],
        },
        {
          properties: { title: "Clients" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Client Name" } },
                    { userEnteredValue: { stringValue: "Trainer Email" } },
                    { userEnteredValue: { stringValue: "Phone" } },
                    { userEnteredValue: { stringValue: "DOB" } },
                    { userEnteredValue: { stringValue: "Height" } },
                    { userEnteredValue: { stringValue: "Password" } },
                  ],
                },
              ],
            },
          ],
        },
        {
          properties: { title: "Exercises" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Exercise Name" } },
                    { userEnteredValue: { stringValue: "Muscle Group" } },
                  ],
                },
              ],
            },
          ],
        },
        {
          properties: { title: "Body Measurements" },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Date" } },
                    { userEnteredValue: { stringValue: "Client Name" } },
                    { userEnteredValue: { stringValue: "Body Weight" } },
                    { userEnteredValue: { stringValue: "Chest" } },
                    { userEnteredValue: { stringValue: "Hips" } },
                    { userEnteredValue: { stringValue: "Arms" } },
                  ],
                },
              ],
            },
          ],
        },
        ...MUSCLE_GROUPS.map((group) => ({
          properties: { title: group },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: "Date" } },
                    { userEnteredValue: { stringValue: "Client Name" } },
                    { userEnteredValue: { stringValue: "Exercise" } },
                    { userEnteredValue: { stringValue: "Sets" } },
                    { userEnteredValue: { stringValue: "Reps" } },
                    { userEnteredValue: { stringValue: "Weight (lbs/kg)" } },
                  ],
                },
              ],
            },
          ],
        })),
      ],
    };

    const createRes = await fetch(
      "https://sheets.googleapis.com/v4/spreadsheets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      },
    );

    if (!createRes.ok) throw new Error("Failed to create spreadsheet");
    const createData = await createRes.json();
    spreadsheetId = createData.spreadsheetId;

    // Seed initial data for a brand new sheet
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Trainers!A2:C2:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [["Admin Trainer", trainerEmail, "trainer123"]] }),
      },
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clients!A2:F2:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [["Sarah Jenkins", trainerEmail, "", "", "", ""]] }),
      },
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Exercises!A2:B7:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [
            ["Bench Press", "Chest"],
            ["Incline Dumbbell Press", "Chest"],
            ["Pull-ups", "Back"],
            ["Deadlift", "Back"],
            ["Squat", "Legs"],
            ["Leg Press", "Legs"],
          ],
        }),
      },
    );
  }

  // Ensure Clients, Exercises, and Body Measurements exist for older spreadsheets that didn't have them
  if (searchData.files && searchData.files.length > 0) {
    const sheetMetaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const sheetMeta = await sheetMetaRes.json();
    const existingTitles = sheetMeta.sheets.map((s: any) => s.properties.title);

    const requests = [];
    if (!existingTitles.includes("Trainers"))
      requests.push({ addSheet: { properties: { title: "Trainers" } } });
    if (!existingTitles.includes("Clients"))
      requests.push({ addSheet: { properties: { title: "Clients" } } });
    if (!existingTitles.includes("Exercises"))
      requests.push({ addSheet: { properties: { title: "Exercises" } } });
    if (!existingTitles.includes("Body Measurements"))
      requests.push({ addSheet: { properties: { title: "Body Measurements" } } });

    if (requests.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ requests }),
        },
      );
      // Append headers and seed data
      if (!existingTitles.includes("Trainers")) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Trainers!A1:C2:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [
                ["Trainer Name", "Trainer Email", "Password"],
                ["Admin Trainer", trainerEmail, "trainer123"],
              ],
            }),
          },
        );
      }
      if (!existingTitles.includes("Clients")) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clients!A1:F2:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [
                ["Client Name", "Trainer Email", "Phone", "DOB", "Height", "Password"],
                ["Sarah Jenkins", trainerEmail, "", "", "", ""],
              ],
            }),
          },
        );
      }
      if (!existingTitles.includes("Exercises")) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Exercises!A1:B7:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [
                ["Exercise Name", "Muscle Group"],
                ["Bench Press", "Chest"],
                ["Incline Dumbbell Press", "Chest"],
                ["Pull-ups", "Back"],
                ["Deadlift", "Back"],
                ["Squat", "Legs"],
                ["Leg Press", "Legs"],
              ],
            }),
          },
        );
      }
      if (!existingTitles.includes("Body Measurements")) {
        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Body Measurements!A1:F1:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [
                ["Date", "Client Name", "Body Weight", "Chest", "Hips", "Arms"]
              ],
            }),
          },
        );
      }
    }
  }

  return spreadsheetId;
}

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

export async function appendMeasurement(
  spreadsheetId: string,
  measurement: BodyMeasurement,
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const range = `"Body Measurements"!A:F`;

  const body = {
    values: [
      [
        measurement.date,
        measurement.clientName,
        measurement.weight,
        measurement.chest,
        measurement.hips,
        measurement.arms,
      ],
    ],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    console.error("Failed to append measurement:", error);
    throw new Error("Failed to append measurement");
  }

  return res.json();
}

export async function fetchClientMeasurements(
  spreadsheetId: string,
  clientName: string,
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Body Measurements'!A:F`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) return []; // Might not exist yet for old sheets

  const data = await res.json();
  const rows = data.values || [];
  const measurements: BodyMeasurement[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] && row[1].trim() === clientName.trim()) {
      measurements.push({
        date: row[0] || "",
        clientName: row[1] || "",
        weight: row[2] || "",
        chest: row[3] || "",
        hips: row[4] || "",
        arms: row[5] || "",
      });
    }
  }

  measurements.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return measurements;
}

export type ExerciseLog = {
  date: string;
  clientName: string;
  muscleGroup: string;
  exercise: string;
  sets: string;
  reps: string;
  weight: string;
};

export async function appendLogRecord(spreadsheetId: string, log: ExerciseLog) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // The range is specifically the tab name (muscleGroup)
  const range = `${log.muscleGroup}!A:F`;

  const body = {
    values: [
      [log.date, log.clientName, log.exercise, log.sets, log.reps, log.weight],
    ],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    console.error("Failed to append record:", error);
    throw new Error("Failed to append record");
  }

  return res.json();
}

export async function fetchConfigData(
  spreadsheetId: string,
  trainerEmail: string,
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=Clients!A:F&ranges=Exercises!A:B`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 400 && errorText.includes("Unable to parse range")) {
      return { clients: [], exercises: [] };
    }
    throw new Error("Failed to fetch config data");
  }
  const data = await res.json();

  const clientRows = data.valueRanges[0].values || [];
  const exerciseRows = data.valueRanges[1].values || [];

  const clients: ClientProfile[] = [];
  // Skip header
  for (let i = 1; i < clientRows.length; i++) {
    const clientName = clientRows[i][0];
    const email = clientRows[i][1];
    if (
      email &&
      email.toLowerCase().trim() === trainerEmail.toLowerCase().trim() &&
      clientName
    ) {
      clients.push({
        name: clientName,
        trainerEmail: email,
        phone: clientRows[i][2] || "",
        dob: clientRows[i][3] || "",
        height: clientRows[i][4] || "",
        password: clientRows[i][5] || "",
      });
    }
  }

  const exercises: { name: string; group: string }[] = [];
  for (let i = 1; i < exerciseRows.length; i++) {
    const exerciseName = exerciseRows[i][0];
    const muscleGroup = exerciseRows[i][1];
    if (exerciseName && muscleGroup) {
      exercises.push({ name: exerciseName, group: muscleGroup });
    }
  }

  return { clients, exercises };
}

export async function fetchClientLogs(
  spreadsheetId: string,
  clientName: string,
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const ranges = MUSCLE_GROUPS.map((g) => `ranges=${g}!A:F`).join("&");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 400 && errorText.includes("Unable to parse range")) {
      return [];
    }
    throw new Error("Failed to fetch logs");
  }
  const data = await res.json();

  const logs: ExerciseLog[] = [];
  data.valueRanges.forEach((range: any, idx: number) => {
    const group = MUSCLE_GROUPS[idx];
    const rows = range.values || [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[1] && row[1].trim() === clientName.trim()) {
        logs.push({
          date: row[0] || "",
          clientName: row[1] || "",
          muscleGroup: group,
          exercise: row[2] || "",
          sets: row[3] || "",
          reps: row[4] || "",
          weight: row[5] || "",
        });
      }
    }
  });

  // Sort by date descending
  logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return logs;
}

export async function addTrainer(
  spreadsheetId: string,
  trainerProfile: { name: string; email: string; password?: string }
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const body = {
    values: [
      [
        trainerProfile.name,
        trainerProfile.email,
        trainerProfile.password || "",
      ],
    ],
  };

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Trainers!A:C:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new Error("Failed to add trainer");
}

export async function addClient(
  spreadsheetId: string,
  client: ClientProfile,
) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clients!A:F:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[
          client.name, 
          client.trainerEmail,
          client.phone || "",
          client.dob || "",
          client.height || "",
          client.password || ""
        ]],
      }),
    },
  );

  if (!res.ok) throw new Error("Failed to add client");
  return res.json();
}

export async function fetchAllTrainers(spreadsheetId: string): Promise<{name: string, email: string}[]> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Trainers!A:B`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 400 && errorText.includes("Unable to parse range")) {
      return [];
    }
    throw new Error("Failed to fetch trainers");
  }
  const data = await response.json();
  const rows = data.values || [];

  return rows.slice(1).map((row: any[]) => ({
    name: row[0] || "",
    email: row[1] || "",
  }));
}

export async function fetchAllClients(spreadsheetId: string) {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Clients!A:F`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const errorText = await res.text();
    if (res.status === 400 && errorText.includes("Unable to parse range")) {
      return [];
    }
    throw new Error("Failed to fetch clients");
  }
  const data = await res.json();
  const rows = data.values || [];
  const clients: ClientProfile[] = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      clients.push({
        name: rows[i][0],
        trainerEmail: rows[i][1] || "",
        phone: rows[i][2] || "",
        dob: rows[i][3] || "",
        height: rows[i][4] || "",
        password: rows[i][5] || "",
      });
    }
  }
  return clients;
}
