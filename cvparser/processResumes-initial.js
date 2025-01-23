const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();


const openai = new OpenAI();

const resumesDir = './resumes';
const outputCsv = './resumes.csv';

async function processPdfFile(filePath) {
  const fileData = fs.readFileSync(filePath);
  const pdfText = (await pdfParse(fileData)).text;
  const prompt = `Extract the name, title, years of experience, industry, and main technology from the CV text provided.\nExample of output\n { "name": "John Smith", "title": "Software Engineer", "yearsOfExperience": 10, "industry": "GameDev", "mainTechnology": "Java"}\n Output - json only, Markdown is not allowed.\n\nText of CV:\n${pdfText}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {role: "system", content: prompt},
      ],
      max_tokens: 200,
      temperature: 0,
    });
    console.log(response.choices[0].message.content);
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error(`Ошибка при обработке файла ${filePath}:`, error.message);
    return null;
  }
}

async function processAllResumes() {
  const files = fs.readdirSync(resumesDir).filter((file) => file.endsWith('.pdf'));

  const results = [];
  for (const file of files) {
    const filePath = path.join(resumesDir, file);
    console.log(`Processing ${file}...`);
    const data = await processPdfFile(filePath);
    if (data) {
      results.push({ file, ...data });
    }
  }

  const csvWriter = createObjectCsvWriter({
    path: outputCsv,
    header: [
      { id: 'name', title: 'Name' },
      { id: 'title', title: 'Title' },
      { id: 'yearsOfExperience', title: 'Years of Experience' },
      { id: 'industry', title: 'Industry' },
      { id: 'mainTechnology', title: 'Main Technology' },
    ],
  });

  await csvWriter.writeRecords(results);
  console.log(`Results are stored ${outputCsv}`);
}

// start processing
processAllResumes().catch((error) => {
  console.error('Error:', error.message);
});
