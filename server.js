const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const ExcelJS = require("exceljs"); // Ajoute en haut si pas déjà fait

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JSON_FILE = "information/membres.json";
const EXCEL_FILE = "excel/membres.xlsx"; // Ajoute en haut si pas déjà fait
const EPARGNE_JSON = "information/epargne.json";
const EPARGNE_FILE = "excel/epargne.xlsx";

// Liste des indicatifs autorisés
const indicatifsAutorises = [
  "+243", // RDC
  "+250", // Rwanda
  "+33", // France
  "+32", // Belgique
  "+1", // USA/Canada
  "+44", // UK
  "+49", // Allemagne
];

// Route POST pour ajouter un membre
app.post("/api/membres", async (req, res) => {
  const data = req.body;

  // 1. Vérifier que le numéro de compte est unique
  let membres = [];
  if (fs.existsSync(JSON_FILE)) {
    membres = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  }
  const existe = membres.find(
    (m) => m["numero-compte"] === data["numero-compte"]
  );
  if (existe) {
    return res
      .status(400)
      .json({ message: "Ce numéro de compte existe déjà." });
  }

  // 2. Vérifier que le nom complet a 3 parties et est unique
  if (
    !data["nom-complet"] ||
    data["nom-complet"].trim().split(" ").length !== 3
  ) {
    return res.status(400).json({
      message: "Le nom complet doit contenir nom, post-nom et prénom.",
    });
  }
  const nomExiste = membres.find(
    (m) => m["nom-complet"].toLowerCase() === data["nom-complet"].toLowerCase()
  );
  if (nomExiste) {
    return res.status(400).json({ message: "Ce nom complet existe déjà." });
  }

  // 3. Vérifier l'indicatif du téléphone
  const tel = data["telephone"].replace(/\s/g, "");
  const indicatifValide = indicatifsAutorises.some((ind) =>
    tel.startsWith(ind)
  );
  if (!indicatifValide) {
    return res
      .status(400)
      .json({ message: "L'indicatif international n'est pas autorisé." });
  }

  // 4. Ajouter le membre
  membres.push(data);
  fs.writeFileSync(JSON_FILE, JSON.stringify(membres, null, 2), "utf8");

  const workbook = new ExcelJS.Workbook();
  let worksheet;
  if (fs.existsSync(EXCEL_FILE)) {
    await workbook.xlsx.readFile(EXCEL_FILE);
    worksheet = workbook.getWorksheet("Membres");
    if (!worksheet) {
      worksheet = workbook.addWorksheet("Membres");
    }
  } else {
    worksheet = workbook.addWorksheet("Membres");
    worksheet.addRow([
      "Numéro de compte",
      "Nom complet",
      "Téléphone",
      "Date d'adhésion",
      "Type de compte",
      "Statut",
    ]);
  }
  worksheet.addRow([
    data["numero-compte"],
    data["nom-complet"],
    data["telephone"],
    data["date-adhesion"],
    data["type-compte"],
    data["statut"],
  ]);
  await workbook.xlsx.writeFile(EXCEL_FILE);

  res.status(201).json({ message: "Membre ajouté avec succès." });
});

// Route POST pour ajouter une épargne
app.post("/api/epargne", async (req, res) => {
  const data = req.body;

  // 1. Vérifier que le numéro de compte existe dans les membres
  let membres = [];
  if (fs.existsSync(JSON_FILE)) {
    membres = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  }
  const membreExiste = membres.find(
    (m) => m["numero-compte"] === data["numero-compte"]
  );
  if (!membreExiste) {
    return res.status(400).json({
      message:
        "Ce numéro de compte n'existe pas. Veuillez d'abord créer le membre.",
    });
  }

  // 2. Ajouter l'épargne dans le JSON
  let epargnes = [];
  if (fs.existsSync(EPARGNE_JSON)) {
    epargnes = JSON.parse(fs.readFileSync(EPARGNE_JSON, "utf8"));
  }
  epargnes.push(data);
  fs.writeFileSync(EPARGNE_JSON, JSON.stringify(epargnes, null, 2), "utf8");

  // 3. Générer ou mettre à jour le fichier Excel
  const workbook = new ExcelJS.Workbook();
  let worksheet;
  if (fs.existsSync(EPARGNE_FILE)) {
    await workbook.xlsx.readFile(EPARGNE_FILE);
    worksheet = workbook.getWorksheet("Epargnes");
    if (!worksheet) {
      worksheet = workbook.addWorksheet("Epargnes");
    }
  } else {
    worksheet = workbook.addWorksheet("Epargnes");
    worksheet.addRow([
      "Numéro de compte",
      "Date dépôt",
      "Montant déposé",
      "Devise dépôt",
      "Cumul dépôts",
      "Devise cumul",
      "Solde actuel",
      "Devise solde",
    ]);
  }
  worksheet.addRow([
    data["numero-compte"],
    data["date-depot"],
    data["montant-depose"],
    data["devise-montant-depose"],
    data["cumul-depots"],
    data["devise-cumul-depots"],
    data["solde-actuel"],
    data["devise-solde-actuel"],
  ]);
  await workbook.xlsx.writeFile(EPARGNE_FILE);

  res.status(201).json({
    message: "Épargne ajoutée avec succès.",
    url: "/excel/epargne.xlsx",
  });
});

// Route GET pour obtenir le cumul et le solde actuel d'un compte épargne
app.get("/api/epargne/cumul/:numeroCompte", (req, res) => {
  const numeroCompte = req.params.numeroCompte;
  let epargnes = [];
  if (fs.existsSync(EPARGNE_JSON)) {
    epargnes = JSON.parse(fs.readFileSync(EPARGNE_JSON, "utf8"));
  }
  // Filtrer les épargnes du membre
  const epargnesMembre = epargnes.filter(
    (e) => e["numero-compte"] === numeroCompte
  );
  // Calculer le cumul et le solde actuel
  const cumul = epargnesMembre.reduce(
    (sum, e) => sum + Number(e["montant-depose"]),
    0
  );
  const solde = cumul; // ou autre logique selon tes règles
  res.json({ cumul, solde });
});

// Fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "Html")));
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/Css", express.static(path.join(__dirname, "Css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/excel", express.static("excel"));
app.use("/membres.xlsx", express.static("excel/membres.xlsx"));

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
