import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const CONFIG_FILE = path.join(process.cwd(), 'system-config.json');

// Get state dynamically from file
function getSystemConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return { masterSpreadsheetId: null, googleAccessToken: null };
}

// --- API ROUTES ---

// 1. Admin configures the Master Sheet and Token
app.post("/api/admin/config", (req, res) => {
  const { spreadsheetId, accessToken } = req.body;
  const currentConfig = getSystemConfig();
  
  if (spreadsheetId) currentConfig.masterSpreadsheetId = spreadsheetId;
  if (accessToken) currentConfig.googleAccessToken = accessToken;
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
  res.json({ success: true, message: "System configured successfully." });
});

// Helper to fetch from Google Sheets securely via the Backend proxy
async function fetchSheetData(range: string) {
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) {
    throw new Error("System is not configured. Admin must connect the Master Database.");
  }
  
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/${range}`,
    {
      headers: { Authorization: `Bearer ${googleAccessToken}` },
    }
  );
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Google access token expired. Admin must re-authenticate.");
    }
    const errorText = await response.text();
    if (response.status === 400 && errorText.includes("Unable to parse range")) {
      return { values: [] };
    }
    throw new Error(`Failed to fetch sheet: ${errorText}`);
  }
  
  return response.json();
}

// 2. Client & Trainer Login (Validates against the 'Clients' or 'Trainers' tab)
app.post("/api/auth/login", async (req, res) => {
  const { email, password, role } = req.body;
  
  try {
    if (role === 'client') {
      const data = await fetchSheetData("Clients!A:F");
      const rows = data.values || [];
      const clientRow = rows.find((row: any) => row[0]?.toLowerCase() === email.toLowerCase() && row[5] === password);
      if (clientRow) {
        return res.json({ success: true, user: { name: clientRow[0], trainerEmail: clientRow[1] } });
      }
    } else if (role === 'trainer') {
       const trainersData = await fetchSheetData("Trainers!A:C");
       const trainerRows = trainersData.values || [];
       const trainerRow = trainerRows.find((row: any) => row[1]?.toLowerCase() === email.toLowerCase() && row[2] === password);
       if (trainerRow) {
          return res.json({ success: true, user: { name: trainerRow[0], email: trainerRow[1] } });
       }
    }
    
    res.status(401).json({ error: "Invalid credentials" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/trainer/clients", async (req, res) => {
  const { trainerEmail } = req.query;
  try {
    const data = await fetchSheetData("Clients!A:F");
    const rows = data.values || [];
    const clients = rows
      .filter((row: any, i: number) => i > 0 && row[1]?.toLowerCase() === (trainerEmail as string).toLowerCase())
      .map((row: any) => ({
        name: row[0],
        trainerEmail: row[1],
        phone: row[2] || "",
        dob: row[3] || "",
        height: row[4] || ""
      }));
      
    res.json(clients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. SECURE DATA FETCHING: Client getting their own data
app.get("/api/client/data", async (req, res) => {
  const { clientName } = req.query;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) {
    return res.status(500).json({ error: "System offline. Pending Admin connection." });
  }

  try {
    // We could fetch Logs and Measurements securely here, filtering ONLY for clientName.
    // To keep it clean, we just proxy the batchGet
    const MUSCLE_GROUPS = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
    const ranges = MUSCLE_GROUPS.map((g) => `ranges=${g}!A:F`).join("&");
    
    // Fetch logs
    const logsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values:batchGet?${ranges}`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }
    );
    const logsData = await logsRes.json();
    
    // Fetch measurements
    const measuresRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/'Body Measurements'!A:F`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }
    );
    const measuresData = await measuresRes.json();
    
    const logs: any[] = [];
    if (logsData.valueRanges) {
      logsData.valueRanges.forEach((range: any, idx: number) => {
        const group = MUSCLE_GROUPS[idx];
        const rows = range.values || [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row[1] && row[1].toLowerCase() === (clientName as string).toLowerCase()) { // FILTER SECURELY
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
    }

    const measurements: any[] = [];
    const measureRows = measuresData.values || [];
    for (let i = 1; i < measureRows.length; i++) {
      const row = measureRows[i];
      if (row[1] && row[1].toLowerCase() === (clientName as string).toLowerCase()) { // FILTER SECURELY
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

    res.json({ logs, measurements });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function ensureTabExists(spreadsheetId: string, accessToken: string, tabName: string) {
  try {
    const cleanTabName = tabName.replace(/'/g, ''); // Fix for 'Body Measurements'
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const exists = meta.sheets?.some((s: any) => s.properties?.title === cleanTabName);
    
    if (!exists) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [ { addSheet: { properties: { title: cleanTabName } } } ]
        })
      });
      console.log(`Created missing tab: ${cleanTabName}`);
    }
  } catch (e) {
    console.warn("Could not ensure tab exists:", e);
  }
}

// 5. SECURE DATA WRITING: Append Exercises
app.delete("/api/trainer/log", async (req, res) => {
  const { date, clientName, muscleGroup, exercise, sets, reps, weight } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
    const listRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/${muscleGroup}!A:F`, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    if (!listRes.ok) throw new Error("Failed to fetch logs");
    const listData = await listRes.json();
    const rows = listData.values || [];
    
    let rowIndexToDelete = -1;
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (
            (row[0] || "") === date &&
            (row[1] || "") === clientName &&
            (row[2] || "") === exercise &&
            (row[3] || "") === sets &&
            (row[4] || "") === reps &&
            (row[5] || "") === weight
        ) {
            rowIndexToDelete = i; 
            break;
        }
    }

    if (rowIndexToDelete === -1) {
        return res.status(404).json({ error: "Log not found" });
    }

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}?fields=sheets(properties(sheetId,title))`, {
       headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const metaData = await metaRes.json();
    const sheetInfo = metaData.sheets?.find((s: any) => s.properties.title === muscleGroup);
    
    if (sheetInfo) {
         const sheetId = sheetInfo.properties.sheetId;
         const delRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndexToDelete, // 0-based index
                            endIndex: rowIndexToDelete + 1
                        }
                    }
                }]
            })
         });
         if (!delRes.ok) throw new Error(await delRes.text());
    } else {
        throw new Error("Sheet not found");
    }
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/trainer/log", async (req, res) => {
  const { date, clientName, muscleGroup, exercise, sets, reps, weight } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
     await ensureTabExists(masterSpreadsheetId, googleAccessToken, muscleGroup);
     const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/${muscleGroup}!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[date, clientName, exercise, sets, reps, weight]],
        }),
      }
    );
    if (!response.ok) throw new Error(await response.text());
    res.json({ success: true });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});

// 6. SECURE DATA WRITING: Append Measurements
app.post("/api/trainer/measurements", async (req, res) => {
  const { date, clientName, weight, chest, hips, arms } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
     await ensureTabExists(masterSpreadsheetId, googleAccessToken, "'Body Measurements'");
     const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/'Body Measurements'!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[date, clientName, weight, chest, hips, arms]],
        }),
      }
    );
    if (!response.ok) throw new Error(await response.text());
    res.json({ success: true });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});

// 7. SECURE DATA WRITING: Add Client
app.post("/api/trainer/addClient", async (req, res) => {
  const { name, trainerEmail, phone, dob, height, password } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
     await ensureTabExists(masterSpreadsheetId, googleAccessToken, "Clients");
     const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/Clients!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[name, trainerEmail, phone || "", dob || "", height || "", password || ""]],
        }),
      }
    );
    if (!response.ok) throw new Error(await response.text());
    res.json({ success: true });
  } catch(err: any) {
     res.status(500).json({ error: err.message });
  }
});

// 8. Fetch global exercises list
app.get("/api/exercises", async (req, res) => {
  try {
    const data = await fetchSheetData("Exercises!A:B");
    const rows = data.values || [];
    const exercises = rows.slice(1).map((row: any) => ({
       name: row[0],
       group: row[1]
    }));
    res.json(exercises);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Admin system data (all clients, all trainers)
app.get("/api/admin/systemData", async (req, res) => {
  try {
    const trainersData = await fetchSheetData("Trainers!A:C");
    let trainers = [];
    if (trainersData.values) {
        trainers = trainersData.values.slice(1).map((row: any) => ({ name: row[0], email: row[1] }));
    }

    const clientsData = await fetchSheetData("Clients!A:F");
    let clients = [];
    if (clientsData.values) {
        clients = clientsData.values.slice(1).filter((r: any) => r[0]).map((row: any) => ({
            name: row[0],
            trainerEmail: row[1] || "",
            phone: row[2] || "",
            dob: row[3] || "",
            height: row[4] || "",
            password: row[5] || ""
        }));
    }

    res.json({ trainers, clients });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Admin adding a trainer
app.post("/api/admin/addTrainer", async (req, res) => {
  const { name, email, password } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
     await ensureTabExists(masterSpreadsheetId, googleAccessToken, "Trainers");
     const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/Trainers!A:C:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [[name, email, password || ""]],
        }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("ADD TRAINER SHEETS API ERROR:", response.status, errorText);
      throw new Error(errorText);
    }
    res.json({ success: true });
  } catch(err: any) {
     console.error("ADD TRAINER EXCEPTION:", err.message);
     res.status(500).json({ error: err.message });
  }
});

// 11. Admin deleting a trainer
app.delete("/api/admin/deleteTrainer", async (req, res) => {
  const { email } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
    const listRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/Trainers!A:C`, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    if (!listRes.ok) throw new Error("Failed to fetch trainers");
    const listData = await listRes.json();
    const rows = listData.values || [];
    
    let rowIndexToDelete = -1;
    for (let i = 1; i < rows.length; i++) {
        if ((rows[i][1] || "") === email) {
            rowIndexToDelete = i; 
            break;
        }
    }

    if (rowIndexToDelete === -1) return res.status(404).json({ error: "Trainer not found" });

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}?fields=sheets(properties(sheetId,title))`, {
       headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const metaData = await metaRes.json();
    const sheetInfo = metaData.sheets?.find((s: any) => s.properties.title === "Trainers");
    
    if (sheetInfo) {
         const sheetId = sheetInfo.properties.sheetId;
         const delRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndexToDelete,
                            endIndex: rowIndexToDelete + 1
                        }
                    }
                }]
            })
         });
         if (!delRes.ok) throw new Error(await delRes.text());
    } else {
        throw new Error("Sheet not found");
    }
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Admin deleting a client
app.delete("/api/admin/deleteClient", async (req, res) => {
  const { name, trainerEmail } = req.body;
  const { masterSpreadsheetId, googleAccessToken } = getSystemConfig();
  if (!masterSpreadsheetId || !googleAccessToken) return res.status(500).json({ error: "System offline." });

  try {
    const listRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}/values/Clients!A:F`, {
      headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    if (!listRes.ok) throw new Error("Failed to fetch clients");
    const listData = await listRes.json();
    const rows = listData.values || [];
    
    let rowIndexToDelete = -1;
    for (let i = 1; i < rows.length; i++) {
        if ((rows[i][0] || "") === name && (rows[i][1] || "") === trainerEmail) {
            rowIndexToDelete = i; 
            break;
        }
    }

    if (rowIndexToDelete === -1) return res.status(404).json({ error: "Client not found" });

    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}?fields=sheets(properties(sheetId,title))`, {
       headers: { Authorization: `Bearer ${googleAccessToken}` }
    });
    const metaData = await metaRes.json();
    const sheetInfo = metaData.sheets?.find((s: any) => s.properties.title === "Clients");
    
    if (sheetInfo) {
         const sheetId = sheetInfo.properties.sheetId;
         const delRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${masterSpreadsheetId}:batchUpdate`, {
            method: "POST",
            headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                requests: [{
                    deleteDimension: {
                        range: {
                            sheetId: sheetId,
                            dimension: "ROWS",
                            startIndex: rowIndexToDelete,
                            endIndex: rowIndexToDelete + 1
                        }
                    }
                }]
            })
         });
         if (!delRes.ok) throw new Error(await delRes.text());
    } else {
        throw new Error("Sheet not found");
    }
    res.json({ success: true });
  } catch(err: any) {
    res.status(500).json({ error: err.message });
  }
});


// Optional Vite Middleware for local development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
