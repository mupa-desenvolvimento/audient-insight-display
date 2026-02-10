
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbnR1bmVzQG11cGEuYXBwIiwiZXhwIjoxNzcwNDA3NzIwfQ.mImchxDu0n7Vm_G09QAPWU5m-N-w6lJLWoQ-uNPQjqA";
const csvPath = path.join(__dirname, 'public', 'dados_recognize.csv');

// Helper to read existing CSV and extract unique profiles
function getProfiles(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Identify indices for demographic columns
    const profileIdx = headers.indexOf('perfil');
    const genderIdx = headers.indexOf('genero');
    const moodIdx = headers.indexOf('humor');
    const minAgeIdx = headers.indexOf('idade_min');
    const maxAgeIdx = headers.indexOf('idade_max');

    const uniqueProfiles = [];
    const seen = new Set();

    // Start from 1 to skip header
    for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < headers.length) continue;

        const key = `${row[profileIdx]}|${row[genderIdx]}|${row[moodIdx]}|${row[minAgeIdx]}|${row[maxAgeIdx]}`;
        
        if (!seen.has(key)) {
            seen.add(key);
            uniqueProfiles.push({
                perfil: row[profileIdx],
                genero: row[genderIdx],
                humor: row[moodIdx],
                idade_min: row[minAgeIdx],
                idade_max: row[maxAgeIdx]
            });
        }
    }
    return uniqueProfiles;
}

async function fetchProducts() {
    console.log("Fetching products...");
    try {
        const response = await fetch("http://srv-mupa.ddns.net:5050/api/products?skip=0&limit=2000", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error fetching products:", error);
        return [];
    }
}

async function updateCSV() {
    try {
        // 1. Read existing CSV to get profiles
        if (!fs.existsSync(csvPath)) {
            console.error("CSV file not found!");
            return;
        }
        const currentCsvContent = fs.readFileSync(csvPath, 'utf-8');
        const profiles = getProfiles(currentCsvContent);
        
        if (profiles.length === 0) {
            console.error("No profiles found in CSV.");
            return;
        }
        console.log(`Found ${profiles.length} unique profiles.`);

        // 2. Fetch products
        const products = await fetchProducts();
        console.log(`Fetched ${products.length} products.`);

        if (products.length === 0) {
            console.log("No products to update.");
            return;
        }

        // 3. Generate new CSV content
        const headers = ['perfil', 'genero', 'humor', 'idade_min', 'idade_max', 'produto', 'categoria', 'imagem_url', 'codigo_de_barras'];
        let newCsvContent = headers.join(',') + '\n';

        products.forEach((product, index) => {
            // Round-robin assignment of profiles
            const profile = profiles[index % profiles.length];
            
            // Clean product name (remove commas to avoid breaking CSV)
            const cleanName = (product.nome || "").replace(/,/g, ' ').trim();
            const gtin = product.gtin || "";
            const imageUrl = `http://srv-mupa.ddns.net:5050/produto-imagem/${gtin}`;
            const category = "Diversos"; // API doesn't provide category

            const row = [
                profile.perfil,
                profile.genero,
                profile.humor,
                profile.idade_min,
                profile.idade_max,
                cleanName,
                category,
                imageUrl,
                gtin
            ];
            
            newCsvContent += row.join(',') + '\n';
        });

        // 4. Write to file
        fs.writeFileSync(csvPath, newCsvContent, 'utf-8');
        console.log(`Successfully updated CSV with ${products.length} products.`);

    } catch (error) {
        console.error("Error updating CSV:", error);
    }
}

updateCSV();
